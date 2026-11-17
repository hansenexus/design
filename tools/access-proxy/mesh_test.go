package main

import (
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
)

func newMeshProxy(t *testing.T) (*httptest.Server, *atomic.Value) {
	t.Helper()
	g, describe, err := newGate()
	if err != nil {
		t.Fatalf("newGate in mesh mode: %v", err)
	}
	if !strings.Contains(describe, "mesh") {
		t.Fatalf("describe %q does not name mesh mode", describe)
	}
	var lastAuth atomic.Value
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		lastAuth.Store(r.Header.Get("Authorization"))
		_, _ = io.WriteString(w, "upstream "+r.Method+" "+r.URL.Path)
	}))
	t.Cleanup(backend.Close)
	target, err := url.Parse(backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	proxy := httptest.NewServer(NewHandler(g, target))
	t.Cleanup(proxy.Close)
	return proxy, &lastAuth
}

func TestMeshForwardsWithoutCredentials(t *testing.T) {
	t.Setenv("ACCESS_MODE", "mesh")
	// No Cloudflare or licence config: mesh mode needs none.
	t.Setenv("CF_ACCESS_TEAM_DOMAIN", "")
	t.Setenv("CF_ACCESS_AUD", "")
	t.Setenv("LICENCE_KEYS_FILE", "")
	proxy, _ := newMeshProxy(t)
	for _, c := range []struct{ method, path string }{
		{http.MethodGet, "/"},
		{http.MethodGet, "/r/registry.json"},
		{http.MethodGet, "/pr/12/"},
		{http.MethodHead, "/r/button.json"},
		{http.MethodGet, "/health"},
	} {
		req, err := http.NewRequest(c.method, proxy.URL+c.path, nil)
		if err != nil {
			t.Fatal(err)
		}
		resp, err := proxy.Client().Do(req)
		if err != nil {
			t.Fatal(err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s %s: status %d, want 200", c.method, c.path, resp.StatusCode)
		}
		if c.method == http.MethodGet && string(body) != "upstream GET "+c.path {
			t.Fatalf("%s %s: body %q", c.method, c.path, body)
		}
	}
}

func TestMeshStillStripsAuthorization(t *testing.T) {
	t.Setenv("ACCESS_MODE", "mesh")
	proxy, lastAuth := newMeshProxy(t)
	req, err := http.NewRequest(http.MethodGet, proxy.URL+"/r/registry.json", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer lotse_should-not-leak")
	resp, err := proxy.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status %d, want 200", resp.StatusCode)
	}
	if got := lastAuth.Load(); got != "" {
		t.Fatalf("upstream saw Authorization %q", got)
	}
}

func TestMeshModeIsExact(t *testing.T) {
	// Only the exact word (blanks trimmed) selects mesh; near misses refuse to start.
	t.Setenv("ACCESS_MODE", " mesh ")
	if _, _, err := newGate(); err != nil {
		t.Fatalf("trimmed mesh: %v", err)
	}
	for _, mode := range []string{"Mesh", "MESH", "mesh-only", "open", "none", "off"} {
		t.Setenv("ACCESS_MODE", mode)
		if err := run([]string{"--", "/bin/true"}); err == nil || !strings.Contains(err.Error(), "ACCESS_MODE") {
			t.Fatalf("mode %q: %v", mode, err)
		}
	}
}

func TestMeshModeStartup(t *testing.T) {
	t.Setenv("ACCESS_MODE", "mesh")
	// The gate is accepted, so run gets as far as starting the child, which then fails.
	err := run([]string{"--", "/nonexistent/static-web-server"})
	if err == nil || !strings.Contains(err.Error(), "start /nonexistent/static-web-server") {
		t.Fatalf("run in mesh mode: %v", err)
	}
}
