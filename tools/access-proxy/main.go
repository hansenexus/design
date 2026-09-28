// access-proxy is the origin-side Cloudflare Access check for the design gallery images
// (hansenexus/design#47). It listens on :8080, verifies the Cf-Access-Jwt-Assertion header on
// every request and forwards the good ones to static-web-server on 127.0.0.1:8081, which it starts
// and supervises as its child: if either one exits, the container exits.
//
//	access-proxy -- /static-web-server [args...]
//
// Env: CF_ACCESS_TEAM_DOMAIN (e.g. hansenexus.cloudflareaccess.com) and CF_ACCESS_AUD (the Access
// application's AUD tag). It refuses to start if either is empty.
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

func run(args []string) error {
	teamDomain := strings.TrimSpace(os.Getenv("CF_ACCESS_TEAM_DOMAIN"))
	aud := strings.TrimSpace(os.Getenv("CF_ACCESS_AUD"))
	if teamDomain == "" || aud == "" {
		return errors.New("CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD must both be set")
	}
	if strings.ContainsAny(teamDomain, "/:@?# ") {
		return fmt.Errorf("CF_ACCESS_TEAM_DOMAIN must be a bare host name, got %q", teamDomain)
	}
	if len(args) > 0 && args[0] == "--" {
		args = args[1:]
	}
	if len(args) == 0 {
		return errors.New("usage: access-proxy -- <static-web-server> [args...]")
	}

	verifier := NewVerifier(teamDomain, aud)
	// Warm the cache. A failure is not fatal: requests are refused until a later fetch succeeds.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	if err := verifier.Refresh(ctx); err != nil {
		log.Printf("initial JWKS fetch failed, refusing every request until it succeeds: %v", err)
	}
	cancel()

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
		Handler:           NewHandler(verifier, target),
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	serveDone := make(chan error, 1)
	go func() { serveDone <- server.ListenAndServe() }()
	log.Printf("listening on %s, forwarding to %s, team %s", listenAddr, upstream, teamDomain)

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

// NewHandler forwards requests with a valid Access token to target and answers everything else
// with a bare 403. Only GET and HEAD of the health path pass without a token.
func NewHandler(verifier *Verifier, target *url.URL) http.Handler {
	proxy := &httputil.ReverseProxy{
		Rewrite: func(r *httputil.ProxyRequest) {
			r.SetURL(target)
			r.Out.Host = r.In.Host
		},
		ErrorLog: log.Default(),
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == healthPath && (r.Method == http.MethodGet || r.Method == http.MethodHead) {
			proxy.ServeHTTP(w, r)
			return
		}
		token := r.Header.Get("Cf-Access-Jwt-Assertion")
		if token == "" {
			forbid(w, r, errors.New("no Cf-Access-Jwt-Assertion header"))
			return
		}
		if err := verifier.Verify(r.Context(), token); err != nil {
			forbid(w, r, err)
			return
		}
		proxy.ServeHTTP(w, r)
	})
}

// forbid logs why and tells the client nothing beyond the status.
func forbid(w http.ResponseWriter, r *http.Request, reason error) {
	log.Printf("403 %s %s: %v", r.Method, r.URL.Path, reason)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusForbidden)
}
