# syntax=docker/dockerfile:1

# The kit gallery image, `registry.hansenexus.dev/design/kit-gallery:<sha>` (built by
# .github/workflows/kit-gallery.yml, deployed at design.hansenexus.dev by hn-infra
# infrastructure/design/kit.yaml).
#
# Build: the workspace packages, then `scripts/gallery.ts --out` writes the static site
# (index.html plus dist/ with fonts, brand files, CSS and JS, every URL relative; the JS and CSS
# names carry a content hash, which index.html references).
# Run: tools/access-proxy on 8080 verifies the Cloudflare Access JWT and forwards to
# static-web-server on 127.0.0.1:8081, its supervised child (#47). The contract in hn-infra
# infrastructure/design/README.md: port 8080, uid 101, read-only root filesystem (nothing here
# writes), gallery at /.

ARG BUN_VERSION=1.4.2

# The shared access proxy, `registry.hansenexus.dev/design/access-proxy:<sha>` (built by
# .github/workflows/access-proxy.yml). A static binary plus the CA bundle it needs to fetch the
# Access JWKS over TLS, and nothing else, so a consumer takes it whole: `COPY --from=<image> / /`.
# Cross-compiled on the build platform: pure Go, no emulation needed for the amd64 image.
FROM --platform=$BUILDPLATFORM golang:1.26.4-alpine@sha256:3ad57304ad93bbec8548a0437ad9e06a455660655d9af011d58b993f6f615648 AS access-proxy-build
WORKDIR /src
COPY tools/access-proxy/ ./
ARG TARGETOS TARGETARCH
RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -trimpath -ldflags="-s -w" -o /out/usr/local/bin/access-proxy . \
 && mkdir -p /out/etc/ssl/certs \
 && cp /etc/ssl/certs/ca-certificates.crt /out/etc/ssl/certs/

FROM scratch AS access-proxy
COPY --from=access-proxy-build /out/ /
USER 101:101
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/access-proxy"]

FROM oven/bun:${BUN_VERSION} AS build
WORKDIR /repo
COPY . .
# chmod: world-readable whatever the build host's umask was, or uid 101 cannot read the files.
RUN bun install --frozen-lockfile \
 && bun run build \
 && cd packages/ui \
 && bun scripts/gallery.ts --out /site \
 && chmod -R a+rX /site

# Scratch-based static-web-server image: one static binary, no shell. Pinned by digest.
FROM joseluisq/static-web-server:2.44.0@sha256:2c1a7c3e0feaea5859307403b74e1c575f3ec1499094fc077344173d11abaae2 AS kit-gallery
# SERVER_HOST, SERVER_PORT (127.0.0.1:8081) and SERVER_HEALTH are set by the proxy for its child.
# Cache-control off: the JS and CSS carry a content hash (dist/main.<hash>.js, #50), but
# index.html, the fonts and the brand files do not, and static-web-server's default long max-age
# would pin those in browsers after a deploy.
ENV SERVER_ROOT=/public \
    SERVER_CACHE_CONTROL_HEADERS=false \
    SERVER_LOG_LEVEL=info
COPY --from=access-proxy / /
COPY --from=build /site /public
USER 101:101
EXPOSE 8080
# The proxy exits when static-web-server does (and the other way round), so the pod restarts.
ENTRYPOINT ["/usr/local/bin/access-proxy", "--", "/static-web-server"]
