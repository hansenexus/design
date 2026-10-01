package main

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

const (
	keyAcme  = "lotse_acme-key-0123456789"
	keyBeta  = "lotse_beta-key-9876543210"
	keyAcme2 = "lotse_acme-rotated-key"
)

func hashLine(customer, key string) string {
	sum := sha256.Sum256([]byte(key))
	return customer + " " + hex.EncodeToString(sum[:])
}

type licenceFixture struct {
	path     string
	licences *Licences
	proxy    *httptest.Server
	upstream atomic.Int32
	lastAuth atomic.Value
	clock    atomic.Int64
}

func writeKeys(t *testing.T, path string, lines ...string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o600); err != nil {
		t.Fatal(err)
	}
}

func newLicenceFixture(t *testing.T, lines ...string) *licenceFixture {
	t.Helper()
	f := &licenceFixture{path: filepath.Join(t.TempDir(), "licences")}
	f.clock.Store(now.Unix())
	writeKeys(t, f.path, lines...)
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.upstream.Add(1)
		f.lastAuth.Store(r.Header.Get("Authorization"))
		_, _ = io.WriteString(w, "upstream "+r.URL.Path)
	}))
	t.Cleanup(backend.Close)
	target, err := url.Parse(backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	f.licences, err = LoadLicences(f.path)
	if err != nil {
		t.Fatal(err)
	}
	f.licences.Now = func() time.Time { return time.Unix(f.clock.Load(), 0) }
	f.proxy = httptest.NewServer(NewHandler(f.licences, target))
	t.Cleanup(f.proxy.Close)
	return f
}

func (f *licenceFixture) get(t *testing.T, method, path, auth string) (*http.Response, string) {
	t.Helper()
	req, err := http.NewRequest(method, f.proxy.URL+path, nil)
	if err != nil {
		t.Fatal(err)
	}
	if auth != "" {
		req.Header.Set("Authorization", auth)
	}
	resp, err := f.proxy.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp, string(body)
}

func expectUnauthorized(t *testing.T, f *licenceFixture, path, auth string) {
	t.Helper()
	before := f.upstream.Load()
	resp, body := f.get(t, http.MethodGet, path, auth)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("auth %q: status %d, want 401", auth, resp.StatusCode)
	}
	if body != "" {
		t.Fatalf("401 body %q, want empty", body)
	}
	if got := resp.Header.Get("WWW-Authenticate"); !strings.HasPrefix(got, "Bearer ") {
		t.Fatalf("WWW-Authenticate %q, want a Bearer challenge", got)
	}
	if f.upstream.Load() != before {
		t.Fatal("request reached the upstream")
	}
}

func expectOK(t *testing.T, f *licenceFixture, path, auth string) {
	t.Helper()
	resp, body := f.get(t, http.MethodGet, path, auth)
	if resp.StatusCode != http.StatusOK || body != "upstream "+path {
		t.Fatalf("auth %q: got %d %q", auth, resp.StatusCode, body)
	}
}

func TestLicenceKeyIsForwarded(t *testing.T) {
	f := newLicenceFixture(t, "# Lotse buyers", "", hashLine("acme", keyAcme), hashLine("beta", keyBeta))
	expectOK(t, f, "/r/confirm-act.json", "Bearer "+keyAcme)
	expectOK(t, f, "/r/registry.json", "Bearer "+keyBeta)
}

func TestLicenceKeyNeverReachesUpstream(t *testing.T) {
	f := newLicenceFixture(t, hashLine("acme", keyAcme))
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme)
	if got := f.lastAuth.Load(); got != "" {
		t.Fatalf("upstream saw Authorization %q", got)
	}
}

func TestLicenceRefusals(t *testing.T) {
	f := newLicenceFixture(t, hashLine("acme", keyAcme))
	for _, auth := range []string{
		"",
		"Bearer ",
		"Bearer lotse_wrong",
		"Bearer " + keyAcme + "x",
		"Basic " + keyAcme,
		"bearer " + keyAcme,
		keyAcme,
		// The stored hash itself is not a key.
		"Bearer " + strings.Fields(hashLine("acme", keyAcme))[1],
	} {
		expectUnauthorized(t, f, "/r/confirm-act.json", auth)
	}
}

func TestLicenceHealthIsExempt(t *testing.T) {
	f := newLicenceFixture(t)
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		if resp, _ := f.get(t, method, healthPath, ""); resp.StatusCode != http.StatusOK {
			t.Fatalf("%s %s: status %d, want 200", method, healthPath, resp.StatusCode)
		}
	}
	expectUnauthorized(t, f, "/health/", "")
	expectUnauthorized(t, f, "/", "")
}

func TestLicenceEmptyFileAdmitsNobody(t *testing.T) {
	f := newLicenceFixture(t, "# no buyers yet")
	expectUnauthorized(t, f, "/r/registry.json", "Bearer "+keyAcme)
}

func TestLicenceFileReload(t *testing.T) {
	f := newLicenceFixture(t, hashLine("acme", keyAcme))
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme)

	// Rotate acme, add beta. Inside CheckEvery the old set is still in force.
	writeKeys(t, f.path, hashLine("acme", keyAcme2), hashLine("beta", keyBeta))
	future := time.Now().Add(time.Minute)
	if err := os.Chtimes(f.path, future, future); err != nil {
		t.Fatal(err)
	}
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme)

	f.clock.Add(int64(f.licences.CheckEvery/time.Second) + 1)
	expectUnauthorized(t, f, "/r/text.json", "Bearer "+keyAcme)
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme2)
	expectOK(t, f, "/r/text.json", "Bearer "+keyBeta)
}

func TestLicenceBrokenReloadKeepsKeys(t *testing.T) {
	f := newLicenceFixture(t, hashLine("acme", keyAcme))
	writeKeys(t, f.path, "acme not-a-hash")
	f.clock.Add(int64(f.licences.CheckEvery/time.Second) + 1)
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme)

	if err := os.Remove(f.path); err != nil {
		t.Fatal(err)
	}
	f.clock.Add(int64(f.licences.CheckEvery/time.Second) + 1)
	expectOK(t, f, "/r/text.json", "Bearer "+keyAcme)
}

func TestLoadLicencesRejectsMalformedFiles(t *testing.T) {
	dup := hashLine("acme", keyAcme)
	for name, lines := range map[string][]string{
		"one field":        {"acme"},
		"three fields":     {dup + " extra"},
		"short hash":       {"acme abcdef"},
		"non-hex hash":     {"acme " + strings.Repeat("z", 64)},
		"bad customer id":  {"acme/evil " + strings.Fields(dup)[1]},
		"duplicate hashes": {dup, "other " + strings.Fields(dup)[1]},
	} {
		path := filepath.Join(t.TempDir(), "licences")
		writeKeys(t, path, lines...)
		if _, err := LoadLicences(path); err == nil {
			t.Fatalf("%s: loaded", name)
		}
	}
	if _, err := LoadLicences(filepath.Join(t.TempDir(), "missing")); err == nil {
		t.Fatal("loaded a missing file")
	}
}

func TestLicenceModeStartup(t *testing.T) {
	t.Setenv("ACCESS_MODE", "licence")
	t.Setenv("LICENCE_KEYS_FILE", "")
	if err := run([]string{"--", "/bin/true"}); err == nil || !strings.Contains(err.Error(), "LICENCE_KEYS_FILE") {
		t.Fatalf("run without LICENCE_KEYS_FILE: %v", err)
	}
	t.Setenv("LICENCE_KEYS_FILE", filepath.Join(t.TempDir(), "missing"))
	if err := run([]string{"--", "/bin/true"}); err == nil {
		t.Fatal("run started with a missing keys file")
	}
	t.Setenv("ACCESS_MODE", "open")
	if err := run([]string{"--", "/bin/true"}); err == nil || !strings.Contains(err.Error(), "ACCESS_MODE") {
		t.Fatalf("run with an unknown mode: %v", err)
	}
}
