package main

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

const (
	testAud  = "test-aud-tag"
	testAud2 = "test-aud-tag-r"
	testIss  = "https://team.example.cloudflareaccess.com"
)

var now = time.Unix(1_800_000_000, 0)

type signer struct {
	kid string
	key *rsa.PrivateKey
}

func newSigner(t *testing.T, kid string) signer {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	return signer{kid: kid, key: key}
}

func (s signer) jwk() map[string]string {
	e := big.NewInt(int64(s.key.E)).Bytes()
	return map[string]string{
		"kid": s.kid, "kty": "RSA", "alg": "RS256", "use": "sig",
		"n": base64.RawURLEncoding.EncodeToString(s.key.N.Bytes()),
		"e": base64.RawURLEncoding.EncodeToString(e),
	}
}

func (s signer) token(t *testing.T, claims map[string]any) string {
	t.Helper()
	seg := func(v any) string {
		b, err := json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
		return base64.RawURLEncoding.EncodeToString(b)
	}
	input := seg(map[string]string{"alg": "RS256", "kid": s.kid, "typ": "JWT"}) + "." + seg(claims)
	digest := sha256.Sum256([]byte(input))
	sig, err := rsa.SignPKCS1v15(rand.Reader, s.key, crypto.SHA256, digest[:])
	if err != nil {
		t.Fatal(err)
	}
	return input + "." + base64.RawURLEncoding.EncodeToString(sig)
}

func goodClaims() map[string]any {
	return map[string]any{
		"aud": []string{testAud},
		"iss": testIss,
		"exp": now.Add(5 * time.Minute).Unix(),
		"nbf": now.Add(-time.Minute).Unix(),
		"iat": now.Add(-time.Minute).Unix(),
	}
}

// jwksServer serves whichever signers are current and counts fetches.
type jwksServer struct {
	*httptest.Server
	mu      sync.Mutex
	signers []signer
	fetches atomic.Int32
	down    atomic.Bool
}

func newJWKSServer(t *testing.T, signers ...signer) *jwksServer {
	t.Helper()
	js := &jwksServer{signers: signers}
	js.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		js.fetches.Add(1)
		if js.down.Load() {
			http.Error(w, "down", http.StatusServiceUnavailable)
			return
		}
		js.mu.Lock()
		keys := make([]map[string]string, 0, len(js.signers))
		for _, s := range js.signers {
			keys = append(keys, s.jwk())
		}
		js.mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]any{"keys": keys})
	}))
	t.Cleanup(js.Close)
	return js
}

func (js *jwksServer) set(signers ...signer) {
	js.mu.Lock()
	js.signers = signers
	js.mu.Unlock()
}

type fixture struct {
	jwks     *jwksServer
	verifier *Verifier
	proxy    *httptest.Server
	upstream atomic.Int32
	clock    atomic.Int64
}

func newFixture(t *testing.T, signers ...signer) *fixture {
	t.Helper()
	f := &fixture{jwks: newJWKSServer(t, signers...)}
	f.clock.Store(now.Unix())
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.upstream.Add(1)
		_, _ = io.WriteString(w, "upstream "+r.URL.Path)
	}))
	t.Cleanup(backend.Close)
	target, err := url.Parse(backend.URL)
	if err != nil {
		t.Fatal(err)
	}
	f.verifier = &Verifier{
		JWKSURL:       f.jwks.URL,
		Issuer:        testIss,
		Audiences:     []string{testAud},
		Client:        f.jwks.Client(),
		Leeway:        30 * time.Second,
		RefreshAfter:  time.Hour,
		MaxStale:      24 * time.Hour,
		MinRefreshGap: 10 * time.Second,
		Now:           func() time.Time { return time.Unix(f.clock.Load(), 0) },
	}
	f.proxy = httptest.NewServer(NewHandler(f.verifier, target))
	t.Cleanup(f.proxy.Close)
	return f
}

func (f *fixture) advance(d time.Duration) { f.clock.Add(int64(d / time.Second)) }

func (f *fixture) get(t *testing.T, method, path, token string) (int, string) {
	t.Helper()
	req, err := http.NewRequest(method, f.proxy.URL+path, nil)
	if err != nil {
		t.Fatal(err)
	}
	if token != "" {
		req.Header.Set("Cf-Access-Jwt-Assertion", token)
	}
	resp, err := f.proxy.Client().Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(body)
}

func expectForbidden(t *testing.T, f *fixture, path, token string) {
	t.Helper()
	before := f.upstream.Load()
	code, body := f.get(t, http.MethodGet, path, token)
	if code != http.StatusForbidden {
		t.Fatalf("status %d, want 403", code)
	}
	if body != "" {
		t.Fatalf("403 body %q, want empty (no detail for the client)", body)
	}
	if f.upstream.Load() != before {
		t.Fatal("request reached the upstream")
	}
}

func TestValidTokenIsForwarded(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	code, body := f.get(t, http.MethodGet, "/dist/main.js", s.token(t, goodClaims()))
	if code != http.StatusOK || body != "upstream /dist/main.js" {
		t.Fatalf("got %d %q", code, body)
	}
}

func TestStringAudIsAccepted(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["aud"] = testAud
	if code, _ := f.get(t, http.MethodGet, "/", s.token(t, claims)); code != http.StatusOK {
		t.Fatalf("status %d, want 200", code)
	}
}

func TestMissingHeader(t *testing.T) {
	f := newFixture(t, newSigner(t, "k1"))
	expectForbidden(t, f, "/", "")
}

func TestWrongAud(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["aud"] = []string{"some-other-app"}
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestSeveralAuds(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	f.verifier.Audiences = ParseAudiences(" " + testAud + " ,, " + testAud2 + ", ")
	for _, aud := range []any{testAud, testAud2, []string{"some-other-app", testAud2}} {
		claims := goodClaims()
		claims["aud"] = aud
		if code, _ := f.get(t, http.MethodGet, "/", s.token(t, claims)); code != http.StatusOK {
			t.Fatalf("aud %v: status %d, want 200", aud, code)
		}
	}
	claims := goodClaims()
	claims["aud"] = []string{"some-other-app"}
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestParseAudiences(t *testing.T) {
	for raw, want := range map[string][]string{
		testAud:                                  {testAud},
		" " + testAud + " ":                      {testAud},
		testAud + "," + testAud2:                 {testAud, testAud2},
		" ," + testAud + " , ," + testAud2 + ",": {testAud, testAud2},
		"":                                       nil,
		" , ,":                                   nil,
	} {
		if got := ParseAudiences(raw); !slices.Equal(got, want) {
			t.Fatalf("ParseAudiences(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestWrongIss(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["iss"] = "https://evil.cloudflareaccess.com"
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestExpired(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["exp"] = now.Add(-time.Minute).Unix()
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestExpiryLeeway(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["exp"] = now.Add(-10 * time.Second).Unix() // inside the 30 s leeway
	if code, _ := f.get(t, http.MethodGet, "/", s.token(t, claims)); code != http.StatusOK {
		t.Fatalf("status %d, want 200 within leeway", code)
	}
}

func TestMissingExp(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	delete(claims, "exp")
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestNotYetValid(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	claims := goodClaims()
	claims["nbf"] = now.Add(5 * time.Minute).Unix()
	expectForbidden(t, f, "/", s.token(t, claims))
}

func TestBadSignature(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	// Same kid, different key: the JWKS key does not match the signature.
	forged := signer{kid: "k1", key: newSigner(t, "k1").key}
	expectForbidden(t, f, "/", forged.token(t, goodClaims()))

	// A valid token whose claims were edited after signing.
	good := s.token(t, goodClaims())
	claims := goodClaims()
	claims["aud"] = []string{testAud, "extra"}
	tampered := s.token(t, claims)
	g, m := strings.Split(good, "."), strings.Split(tampered, ".")
	expectForbidden(t, f, "/", g[0]+"."+m[1]+"."+g[2])
}

func TestAlgNoneRejected(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none","kid":"k1"}`))
	claims, _ := json.Marshal(goodClaims())
	expectForbidden(t, f, "/", header+"."+base64.RawURLEncoding.EncodeToString(claims)+".")
}

func TestUnknownKidRefreshesJWKS(t *testing.T) {
	old, rotated := newSigner(t, "old"), newSigner(t, "new")
	f := newFixture(t, old)
	if code, _ := f.get(t, http.MethodGet, "/", old.token(t, goodClaims())); code != http.StatusOK {
		t.Fatalf("status %d with the first key", code)
	}
	f.jwks.set(old, rotated)
	f.advance(15 * time.Second) // past MinRefreshGap
	before := f.jwks.fetches.Load()
	if code, _ := f.get(t, http.MethodGet, "/", rotated.token(t, goodClaims())); code != http.StatusOK {
		t.Fatalf("status %d, want 200 after refresh on unknown kid", code)
	}
	if f.jwks.fetches.Load() != before+1 {
		t.Fatalf("fetches %d, want %d", f.jwks.fetches.Load(), before+1)
	}
}

func TestUnknownKidRefreshIsRateLimited(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	if code, _ := f.get(t, http.MethodGet, "/", s.token(t, goodClaims())); code != http.StatusOK {
		t.Fatal("warm-up failed")
	}
	stranger := newSigner(t, "made-up")
	before := f.jwks.fetches.Load()
	for range 5 {
		expectForbidden(t, f, "/", stranger.token(t, goodClaims()))
	}
	if got := f.jwks.fetches.Load() - before; got != 0 {
		t.Fatalf("%d fetches within MinRefreshGap, want 0", got)
	}
}

func TestHourlyRefresh(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	tok := func() string { return s.token(t, goodClaimsAt(time.Unix(f.clock.Load(), 0))) }
	f.get(t, http.MethodGet, "/", tok())
	before := f.jwks.fetches.Load()
	f.advance(30 * time.Minute)
	f.get(t, http.MethodGet, "/", tok())
	if f.jwks.fetches.Load() != before {
		t.Fatal("refetched inside the hour")
	}
	f.advance(31 * time.Minute)
	if code, _ := f.get(t, http.MethodGet, "/", tok()); code != http.StatusOK {
		t.Fatalf("status %d after hourly refresh", code)
	}
	if f.jwks.fetches.Load() != before+1 {
		t.Fatal("no refetch after an hour")
	}
}

func goodClaimsAt(at time.Time) map[string]any {
	c := goodClaims()
	c["exp"] = at.Add(5 * time.Minute).Unix()
	c["nbf"] = at.Add(-time.Minute).Unix()
	return c
}

func TestFailsClosedWithoutJWKS(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	f.jwks.down.Store(true)
	expectForbidden(t, f, "/", s.token(t, goodClaims()))
}

func TestStaleJWKSIsDropped(t *testing.T) {
	s := newSigner(t, "k1")
	f := newFixture(t, s)
	f.get(t, http.MethodGet, "/", s.token(t, goodClaims()))
	f.jwks.down.Store(true)
	// Past RefreshAfter but inside MaxStale: the refresh fails, the cached key still works.
	f.advance(2 * time.Hour)
	if code, _ := f.get(t, http.MethodGet, "/", s.token(t, goodClaimsAt(time.Unix(f.clock.Load(), 0)))); code != http.StatusOK {
		t.Fatalf("status %d, want 200 on a cached key while the JWKS is briefly down", code)
	}
	f.advance(24 * time.Hour)
	expectForbidden(t, f, "/", s.token(t, goodClaimsAt(time.Unix(f.clock.Load(), 0))))
}

func TestHealthIsExempt(t *testing.T) {
	f := newFixture(t, newSigner(t, "k1"))
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		code, _ := f.get(t, method, healthPath, "")
		if code != http.StatusOK {
			t.Fatalf("%s %s: status %d, want 200 without a token", method, healthPath, code)
		}
	}
}

func TestOnlyHealthIsExempt(t *testing.T) {
	f := newFixture(t, newSigner(t, "k1"))
	for _, path := range []string{"/", "/health/", "/healthz", "/health/x", "/index.html"} {
		expectForbidden(t, f, path, "")
	}
	before := f.upstream.Load()
	code, _ := f.get(t, http.MethodPost, healthPath, "")
	if code != http.StatusForbidden || f.upstream.Load() != before {
		t.Fatalf("POST %s: status %d, want 403", healthPath, code)
	}
}

func TestGarbageTokens(t *testing.T) {
	f := newFixture(t, newSigner(t, "k1"))
	for _, tok := range []string{"x", "a.b", "a.b.c", "....", "eyJ.eyJ.sig"} {
		expectForbidden(t, f, "/", tok)
	}
}

func TestRefusesToStartWithoutConfig(t *testing.T) {
	cases := []struct{ domain, aud string }{
		{"", ""},
		{"team.example.cloudflareaccess.com", ""},
		{"team.example.cloudflareaccess.com", ","},
		{"team.example.cloudflareaccess.com", " , ,"},
		{"", testAud},
		{"https://team.example.cloudflareaccess.com", testAud},
	}
	for _, c := range cases {
		t.Setenv("CF_ACCESS_TEAM_DOMAIN", c.domain)
		t.Setenv("CF_ACCESS_AUD", c.aud)
		if err := run([]string{"--", "/bin/true"}); err == nil {
			t.Fatalf("run started with domain %q aud %q", c.domain, c.aud)
		}
	}
}
