package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Licences is the licence-key gate (ACCESS_MODE=licence, #92): the shadcn registry of
// hansenexus/design-ops is fetched by the shadcn CLI, which cannot pass Cloudflare Access but
// sends `Authorization: Bearer <key>` from the buyer's components.json.
//
// The keys file holds one licence per line, `<customer-id> <sha256-hex-of-key>`; blank lines and
// `#` comments are skipped. Only hashes are stored, so reading the file (or the Secret behind it)
// yields no usable key. A customer may have several lines (a rotation overlap). The file is
// re-read when its modification time or size changes, checked at most every CheckEvery, so a
// Secret update takes effect without a restart. A file that no longer parses is logged and the
// previous licences stay in force.
type Licences struct {
	Path       string
	CheckEvery time.Duration
	Now        func() time.Time

	mu        sync.RWMutex
	byHash    map[[sha256.Size]byte]string
	modTime   time.Time
	size      int64
	reloadMu  sync.Mutex
	lastCheck time.Time
}

var customerID = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)

// LoadLicences reads path once and fails if it is missing or malformed: the proxy refuses to
// start rather than run with no idea who may pass. An empty file is valid and admits nobody.
func LoadLicences(path string) (*Licences, error) {
	l := &Licences{Path: path, CheckEvery: 10 * time.Second, Now: time.Now}
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	byHash, err := parseLicences(path)
	if err != nil {
		return nil, err
	}
	l.byHash, l.modTime, l.size, l.lastCheck = byHash, info.ModTime(), info.Size(), l.Now()
	return l, nil
}

// Count is the number of keys in force.
func (l *Licences) Count() int {
	l.mu.RLock()
	defer l.mu.RUnlock()
	return len(l.byHash)
}

func parseLicences(path string) (map[[sha256.Size]byte]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	byHash := map[[sha256.Size]byte]string{}
	scanner := bufio.NewScanner(f)
	for n := 1; scanner.Scan(); n++ {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) != 2 {
			return nil, fmt.Errorf("%s:%d: want `<customer-id> <sha256-hex>`", path, n)
		}
		if !customerID.MatchString(fields[0]) {
			return nil, fmt.Errorf("%s:%d: bad customer id %q", path, n, fields[0])
		}
		raw, err := hex.DecodeString(fields[1])
		if err != nil || len(raw) != sha256.Size {
			return nil, fmt.Errorf("%s:%d: not a sha256 hex digest", path, n)
		}
		sum := [sha256.Size]byte(raw)
		if other, dup := byHash[sum]; dup {
			return nil, fmt.Errorf("%s:%d: same key hash as %s", path, n, other)
		}
		byHash[sum] = fields[0]
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return byHash, nil
}

// reload re-reads the file when it changed, at most every CheckEvery.
func (l *Licences) reload() {
	l.reloadMu.Lock()
	defer l.reloadMu.Unlock()
	now := l.Now()
	if now.Sub(l.lastCheck) < l.CheckEvery {
		return
	}
	l.lastCheck = now
	info, err := os.Stat(l.Path)
	if err != nil {
		log.Printf("licences: %v, keeping %d", err, l.Count())
		return
	}
	if info.ModTime().Equal(l.modTime) && info.Size() == l.size {
		return
	}
	byHash, err := parseLicences(l.Path)
	if err != nil {
		log.Printf("licences: %v, keeping %d", err, l.Count())
		return
	}
	l.mu.Lock()
	l.byHash, l.modTime, l.size = byHash, info.ModTime(), info.Size()
	l.mu.Unlock()
	log.Printf("licences: reloaded, %d keys", len(byHash))
}

var errNoLicence = errors.New("no licence")

// allow admits a request whose bearer key hashes to a listed licence and returns its customer id.
// The lookup is by SHA-256 of the key, so its timing says nothing useful about any stored key.
func (l *Licences) allow(r *http.Request) (string, error) {
	l.reload()
	key, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	key = strings.TrimSpace(key)
	if !ok || key == "" {
		return "", fmt.Errorf("%w: no bearer key", errNoLicence)
	}
	l.mu.RLock()
	customer, ok := l.byHash[sha256.Sum256([]byte(key))]
	l.mu.RUnlock()
	if !ok {
		return "", fmt.Errorf("%w: unknown key", errNoLicence)
	}
	return customer, nil
}

// refuse answers 401 with a Bearer challenge, which the shadcn CLI reports as an auth failure.
func (l *Licences) refuse(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Bearer realm="licence"`)
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusUnauthorized)
}
