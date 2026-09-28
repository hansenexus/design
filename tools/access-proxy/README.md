# access-proxy

Origin-side Cloudflare Access check for the design gallery images (#47): the kit gallery here and
the Lotse gallery in hansenexus/design-ops. Cloudflare Access fronts `design.hansenexus.dev`, but
the cluster load balancer is reachable directly, so each image verifies the Access JWT itself.

- Listens on `:8080` and forwards to static-web-server on `127.0.0.1:8081`.
- Every request needs a `Cf-Access-Jwt-Assertion` header with an RS256 token that verifies against
  `https://$CF_ACCESS_TEAM_DOMAIN/cdn-cgi/access/certs`, whose `aud` contains `$CF_ACCESS_AUD`,
  whose `iss` is `https://$CF_ACCESS_TEAM_DOMAIN`, and whose `exp`/`nbf` hold (30 s leeway).
  Anything else gets a bare 403; the reason goes to the log only.
- Only `GET`/`HEAD /health` (static-web-server's health endpoint, used by the Deployment probes)
  passes without a token.
- The JWKS is cached, refetched hourly and when a token names an unknown kid (at most once per
  10 s). If a refresh fails the cached keys stay usable for up to 24 h; with no keys every request
  is refused (fails closed).
- Refuses to start if `CF_ACCESS_TEAM_DOMAIN` or `CF_ACCESS_AUD` is empty.
- Starts static-web-server as its child (`access-proxy -- /static-web-server`), setting
  `SERVER_HOST=127.0.0.1`, `SERVER_PORT=8081` and `SERVER_HEALTH=true` for it. If either process
  exits, the container exits. SIGTERM, SIGINT and SIGQUIT (the static-web-server image's
  `STOPSIGNAL`) shut both down cleanly.

Go standard library only, no third-party modules.

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

The Deployment must probe `/health`, not `/`: `/` needs a token.

## Develop

```sh
go vet ./... && go test -race ./...
```
