# access-proxy

Origin-side access check for the design images. Two modes, picked by `ACCESS_MODE`:

- `cf-access` (default, #47): the Cloudflare Access JWT, for the kit gallery here and the Lotse
  gallery in hansenexus/design-ops. Cloudflare Access fronts `design.hansenexus.dev`, but the
  cluster load balancer is reachable directly, so each image verifies the Access JWT itself.
- `licence` (#92): a per-customer licence key, for the Lotse shadcn registry in
  hansenexus/design-ops (design-ops#5). The shadcn CLI cannot pass Cloudflare Access; it sends
  `Authorization: Bearer ${LOTSE_LICENCE_KEY}` from the buyer's `components.json`.

Common to both:

- Listens on `:8080` and forwards to static-web-server on `127.0.0.1:8081`.
- Only `GET`/`HEAD /health` (static-web-server's health endpoint, used by the Deployment probes)
  passes unchecked.
- A refused request gets an empty body; the reason goes to the log only. The `Authorization`
  header is never forwarded, so a key cannot reach the upstream's logs.
- Starts static-web-server as its child (`access-proxy -- /static-web-server`), setting
  `SERVER_HOST=127.0.0.1`, `SERVER_PORT=8081` and `SERVER_HEALTH=true` for it. If either process
  exits, the container exits. SIGTERM, SIGINT and SIGQUIT (the static-web-server image's
  `STOPSIGNAL`) shut both down cleanly.

Go standard library only, no third-party modules.

## `cf-access`

- Every request needs a `Cf-Access-Jwt-Assertion` header with an RS256 token that verifies against
  `https://$CF_ACCESS_TEAM_DOMAIN/cdn-cgi/access/certs`, whose `aud` contains `$CF_ACCESS_AUD`,
  whose `iss` is `https://$CF_ACCESS_TEAM_DOMAIN`, and whose `exp`/`nbf` hold (30 s leeway).
  Anything else gets a bare 403.
- The JWKS is cached, refetched hourly and when a token names an unknown kid (at most once per
  10 s). If a refresh fails the cached keys stay usable for up to 24 h; with no keys every request
  is refused (fails closed).
- Refuses to start if `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` is empty.

## `licence`

- `LICENCE_KEYS_FILE` names a file (in the cluster: a Secret mounted read-only) with one licence
  per line, `<customer-id> <sha256-hex-of-key>`; blank lines and `#` comments are skipped. Only
  hashes are stored, so the file holds no usable key. A customer may have several lines, for a
  rotation overlap; revoking is deleting the line.
- Every request needs `Authorization: Bearer <key>` whose SHA-256 is in the file. Anything else
  gets a bare 401 with `WWW-Authenticate: Bearer`. An admitted request is logged with its customer
  id, never the key.
- The file is re-read when its modification time or size changes (checked at most every 10 s), so
  a Secret update takes effect without a restart. A file that no longer parses or has gone is
  logged and the licences already loaded stay in force.
- Refuses to start if `LICENCE_KEYS_FILE` is unset, missing or malformed. An empty file starts and
  admits nobody.
- Needs no outbound network.

```sh
key="lotse_$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '=')"
printf '%s %s\n' "<customer-id>" "$(printf '%s' "$key" | shasum -a 256 | cut -d' ' -f1)"
```

## Use in an image

`registry.hansenexus.dev/design/access-proxy:<sha>` (`.github/workflows/access-proxy.yml`, every
main sha) holds only `/usr/local/bin/access-proxy` and `/etc/ssl/certs/ca-certificates.crt`:

```dockerfile
FROM joseluisq/static-web-server:2.44.0@sha256:… AS gallery
ENV SERVER_ROOT=/public
COPY --from=registry.hansenexus.dev/design/access-proxy:<sha> / /
COPY --from=build /site /public
USER 101:101
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/access-proxy", "--", "/static-web-server"]
```

The Deployment must probe `/health`, not `/`: `/` needs a token. For licence mode add
`ENV ACCESS_MODE=licence LICENCE_KEYS_FILE=/etc/licences/keys` and mount the keys Secret there.

## Develop

```sh
go vet ./... && go test -race ./...
```
