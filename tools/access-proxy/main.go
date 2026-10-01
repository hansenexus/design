// access-proxy is the origin-side access check for the design images. It listens on :8080,
// checks every request and forwards the good ones to static-web-server on 127.0.0.1:8081, which
// it starts and supervises as its child: if either one exits, the container exits.
//
//	access-proxy -- /static-web-server [args...]
//
// ACCESS_MODE picks the check:
//
//   - cf-access (the default; the galleries, #47): a Cloudflare Access JWT in
//     Cf-Access-Jwt-Assertion. Env CF_ACCESS_TEAM_DOMAIN (e.g. hansenexus.cloudflareaccess.com)
//     and CF_ACCESS_AUD (the Access applications' AUD tags, comma-separated, #96); it refuses to
//     start if the domain is empty or CF_ACCESS_AUD holds no tag.
//   - licence (the Lotse shadcn registry, #92): `Authorization: Bearer <key>` whose SHA-256 is
//     listed in LICENCE_KEYS_FILE (licence.go); it refuses to start if the file cannot be read.
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

const (
	listenAddr = ":8080"
	upstream   = "127.0.0.1:8081"
	// static-web-server's health endpoint (SERVER_HEALTH=true), which the Deployment probes use.
	healthPath = "/health"
)

func main() {
	log.SetFlags(0)
	log.SetPrefix("access-proxy: ")
	if err := run(os.Args[1:]); err != nil {
		log.Fatal(err)
	}
}

// newGate builds the check ACCESS_MODE names from the environment.
func newGate() (gate, string, error) {
	switch mode := strings.TrimSpace(os.Getenv("ACCESS_MODE")); mode {
	case "", "cf-access":
		teamDomain := strings.TrimSpace(os.Getenv("CF_ACCESS_TEAM_DOMAIN"))
		auds := ParseAudiences(os.Getenv("CF_ACCESS_AUD"))
		if teamDomain == "" || len(auds) == 0 {
			return nil, "", errors.New("CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD must both be set")
		}
		if strings.ContainsAny(teamDomain, "/:@?# ") {
			return nil, "", fmt.Errorf("CF_ACCESS_TEAM_DOMAIN must be a bare host name, got %q", teamDomain)
		}
		verifier := NewVerifier(teamDomain, auds)
		// Warm the cache. A failure is not fatal: requests are refused until a later fetch succeeds.
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := verifier.Refresh(ctx); err != nil {
			log.Printf("initial JWKS fetch failed, refusing every request until it succeeds: %v", err)
		}
		return verifier, fmt.Sprintf("team %s, %d audiences", teamDomain, len(auds)), nil
	case "licence":
		path := strings.TrimSpace(os.Getenv("LICENCE_KEYS_FILE"))
		if path == "" {
			return nil, "", errors.New("ACCESS_MODE=licence needs LICENCE_KEYS_FILE")
		}
		licences, err := LoadLicences(path)
		if err != nil {
			return nil, "", fmt.Errorf("licence keys: %w", err)
		}
		return licences, fmt.Sprintf("licence mode, %d keys", licences.Count()), nil
	default:
		return nil, "", fmt.Errorf("ACCESS_MODE must be cf-access or licence, got %q", mode)
	}
}

func run(args []string) error {
	g, describe, err := newGate()
	if err != nil {
		return err
	}
	if len(args) > 0 && args[0] == "--" {
		args = args[1:]
	}
	if len(args) == 0 {
		return errors.New("usage: access-proxy -- <static-web-server> [args...]")
	}

	child := exec.Command(args[0], args[1:]...)
	// The proxy owns the address contract, so a consumer image cannot expose the server directly.
	child.Env = append(os.Environ(),
		"SERVER_HOST=127.0.0.1", "SERVER_PORT=8081", "SERVER_HEALTH=true")
	child.Stdout, child.Stderr = os.Stdout, os.Stderr
	if err := child.Start(); err != nil {
		return fmt.Errorf("start %s: %w", args[0], err)
	}
	childDone := make(chan error, 1)
	go func() { childDone <- child.Wait() }()

	target := &url.URL{Scheme: "http", Host: upstream}
	server := &http.Server{
		Addr:              listenAddr,
		Handler:           NewHandler(g, target),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	serveDone := make(chan error, 1)
	go func() { serveDone <- server.ListenAndServe() }()
	log.Printf("listening on %s, forwarding to %s, %s", listenAddr, upstream, describe)

	// SIGQUIT too: the static-web-server base image declares it as STOPSIGNAL, and an uncaught
	// SIGQUIT makes a Go program dump every goroutine and exit 2.
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT, syscall.SIGQUIT)

	select {
	case err := <-childDone:
		shutdown(server)
		return fmt.Errorf("%s exited: %v", args[0], err)
	case err := <-serveDone:
		_ = child.Process.Kill()
		<-childDone
		return fmt.Errorf("server: %w", err)
	case sig := <-signals:
		log.Printf("%s, shutting down", sig)
		shutdown(server)
		_ = child.Process.Signal(syscall.SIGTERM)
		select {
		case <-childDone:
		case <-time.After(10 * time.Second):
			_ = child.Process.Kill()
			<-childDone
		}
		return nil
	}
}

func shutdown(server *http.Server) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

// gate is one access check. allow returns who the request is for (logged when not empty) or why
// it is refused (logged only); refuse writes the refusal, which tells the client nothing more.
type gate interface {
	allow(r *http.Request) (who string, err error)
	refuse(w http.ResponseWriter)
}

// NewHandler forwards the requests g allows to target and lets g refuse everything else. Only GET
// and HEAD of the health path pass unchecked. The Authorization header never reaches the
// upstream, so a licence key cannot end up in its logs.
func NewHandler(g gate, target *url.URL) http.Handler {
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.Out.Host = r.In.Host
			r.Out.Header.Del("Authorization")
		},
		ErrorLog: log.Default(),
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == healthPath && (r.Method == http.MethodGet || r.Method == http.MethodHead) {
			proxy.ServeHTTP(w, r)
			return
		}
		who, err := g.allow(r)
		if err != nil {
			log.Printf("refused %s %s: %v", r.Method, r.URL.Path, err)
			g.refuse(w)
			return
		}
		if who != "" {
			log.Printf("%s %s %s", who, r.Method, r.URL.Path)
		}
		proxy.ServeHTTP(w, r)
	})
}

// allow admits a request with a valid Cf-Access-Jwt-Assertion.
func (v *Verifier) allow(r *http.Request) (string, error) {
	token := r.Header.Get("Cf-Access-Jwt-Assertion")
	if token == "" {
		return "", errors.New("no Cf-Access-Jwt-Assertion header")
	}
	return "", v.Verify(r.Context(), token)
}

// refuse answers a bare 403.
func (v *Verifier) refuse(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusForbidden)
}
