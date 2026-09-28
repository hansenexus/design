package main

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"
)

// Verifier checks a Cloudflare Access JWT (the Cf-Access-Jwt-Assertion header): RS256 against the
// team's JWKS, aud contains Audience, iss equals Issuer, exp and nbf within Leeway.
//
// The JWKS is cached. It is refetched when a token names an unknown kid and when the cached copy
// is older than RefreshAfter. A cache older than MaxStale is dropped, and with no keys every token
// fails: the proxy fails closed when the JWKS cannot be fetched.
type Verifier struct {
	JWKSURL  string
	Issuer   string
	Audience string
	Client   *http.Client

	Leeway       time.Duration
	RefreshAfter time.Duration
	MaxStale     time.Duration
	// MinRefreshGap rate-limits fetches, so tokens with made-up kids cannot hammer the JWKS URL.
	MinRefreshGap time.Duration
	Now           func() time.Time

	mu          sync.RWMutex
	keys        map[string]*rsa.PublicKey
	fetchedAt   time.Time
	refreshMu   sync.Mutex
	lastAttempt time.Time
}

// NewVerifier returns a Verifier for a Cloudflare Access team domain such as
// hansenexus.cloudflareaccess.com.
func NewVerifier(teamDomain, audience string) *Verifier {
	return &Verifier{
		JWKSURL:       "https://" + teamDomain + "/cdn-cgi/access/certs",
		Issuer:        "https://" + teamDomain,
		Audience:      audience,
		Client:        &http.Client{Timeout: 5 * time.Second},
		Leeway:        30 * time.Second,
		RefreshAfter:  time.Hour,
		MaxStale:      24 * time.Hour,
		MinRefreshGap: 10 * time.Second,
		Now:           time.Now,
	}
}

var errInvalid = errors.New("invalid token")

func invalid(format string, args ...any) error {
	return fmt.Errorf("%w: %s", errInvalid, fmt.Sprintf(format, args...))
}

type jwtHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
}

type jwtClaims struct {
	Aud audience     `json:"aud"`
	Iss string       `json:"iss"`
	Exp *json.Number `json:"exp"`
	Nbf *json.Number `json:"nbf"`
}

// audience accepts both JWT forms of aud: a single string or an array of strings.
type audience []string

func (a *audience) UnmarshalJSON(b []byte) error {
	var one string
	if err := json.Unmarshal(b, &one); err == nil {
		*a = audience{one}
		return nil
	}
	var many []string
	if err := json.Unmarshal(b, &many); err != nil {
		return err
	}
	*a = many
	return nil
}

// Verify returns nil only for a token that passes every check. Errors are for the log, never for
// the client.
func (v *Verifier) Verify(ctx context.Context, token string) error {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return invalid("not a compact JWS")
	}
	var header jwtHeader
	if err := decodeSegment(parts[0], &header); err != nil {
		return invalid("header: %v", err)
	}
	// Only RS256: an attacker must not pick the algorithm (none, HS256 keyed with the public key).
	if header.Alg != "RS256" {
		return invalid("alg %q", header.Alg)
	}
	if header.Kid == "" {
		return invalid("no kid")
	}
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return invalid("signature encoding")
	}
	key, err := v.key(ctx, header.Kid)
	if err != nil {
		return err
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], sig); err != nil {
		return invalid("bad signature")
	}

	var claims jwtClaims
	if err := decodeSegment(parts[1], &claims); err != nil {
		return invalid("claims: %v", err)
	}
	if !slices.Contains(claims.Aud, v.Audience) {
		return invalid("aud")
	}
	if claims.Iss != v.Issuer {
		return invalid("iss %q", claims.Iss)
	}
	now := v.Now()
	if claims.Exp == nil {
		return invalid("no exp")
	}
	exp, err := numericDate(*claims.Exp)
	if err != nil {
		return invalid("exp: %v", err)
	}
	if !now.Before(exp.Add(v.Leeway)) {
		return invalid("expired")
	}
	if claims.Nbf != nil {
		nbf, err := numericDate(*claims.Nbf)
		if err != nil {
			return invalid("nbf: %v", err)
		}
		if now.Add(v.Leeway).Before(nbf) {
			return invalid("not yet valid")
		}
	}
	return nil
}

func decodeSegment(seg string, into any) error {
	raw, err := base64.RawURLEncoding.DecodeString(seg)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, into)
}

func numericDate(n json.Number) (time.Time, error) {
	f, err := n.Float64()
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(int64(f), 0), nil
}

// key returns the public key for kid, refreshing the JWKS when the cache is old or lacks kid.
func (v *Verifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	key, fetchedAt := v.cached(kid)
	age := v.Now().Sub(fetchedAt)
	if key != nil && age < v.RefreshAfter {
		return key, nil
	}
	if err := v.refresh(ctx); err != nil && key == nil {
		return nil, fmt.Errorf("jwks: %w", err)
	}
	// After a failed hourly refresh the old key stays usable until MaxStale.
	if key, _ = v.cached(kid); key == nil {
		return nil, invalid("unknown kid %q", kid)
	}
	return key, nil
}

func (v *Verifier) cached(kid string) (*rsa.PublicKey, time.Time) {
	v.mu.RLock()
	defer v.mu.RUnlock()
	if v.keys == nil || v.Now().Sub(v.fetchedAt) >= v.MaxStale {
		return nil, time.Time{}
	}
	return v.keys[kid], v.fetchedAt
}

// Refresh fetches the JWKS now, subject to MinRefreshGap. main calls it once at startup.
func (v *Verifier) Refresh(ctx context.Context) error { return v.refresh(ctx) }

func (v *Verifier) refresh(ctx context.Context) error {
	v.refreshMu.Lock()
	defer v.refreshMu.Unlock()
	now := v.Now()
	if !v.lastAttempt.IsZero() && now.Sub(v.lastAttempt) < v.MinRefreshGap {
		return errors.New("refresh rate-limited")
	}
	v.lastAttempt = now
	keys, err := v.fetch(ctx)
	if err != nil {
		return err
	}
	v.mu.Lock()
	v.keys, v.fetchedAt = keys, now
	v.mu.Unlock()
	return nil
}

type jwks struct {
	Keys []struct {
		Kid string `json:"kid"`
		Kty string `json:"kty"`
		Alg string `json:"alg"`
		N   string `json:"n"`
		E   string `json:"e"`
	} `json:"keys"`
}

func (v *Verifier) fetch(ctx context.Context) (map[string]*rsa.PublicKey, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.JWKSURL, nil)
	if err != nil {
		return nil, err
	}
	resp, err := v.Client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: %s", v.JWKSURL, resp.Status)
	}
	var set jwks
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&set); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	keys := make(map[string]*rsa.PublicKey)
	for _, k := range set.Keys {
		if k.Kty != "RSA" || k.Kid == "" || (k.Alg != "" && k.Alg != "RS256") {
			continue
		}
		n, errN := base64.RawURLEncoding.DecodeString(k.N)
		e, errE := base64.RawURLEncoding.DecodeString(k.E)
		if errN != nil || errE != nil || len(e) == 0 || len(e) > 4 {
			continue
		}
		pub := &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
		if pub.N.BitLen() < 2048 {
			continue
		}
		keys[k.Kid] = pub
	}
	if len(keys) == 0 {
		return nil, errors.New("no usable RS256 keys")
	}
	return keys, nil
}
