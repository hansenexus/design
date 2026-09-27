# syntax=docker/dockerfile:1

# The kit gallery image, `registry.hansenexus.dev/design/kit-gallery:<sha>` (built by
# .github/workflows/kit-gallery.yml, deployed at design.hansenexus.dev by hn-infra
# infrastructure/design/kit.yaml).
#
# Build: the workspace packages, then `scripts/gallery.ts --out` writes the static site
# (index.html plus dist/ with fonts, brand files, CSS and JS, every URL relative).
# Run: static-web-server, the files only. The contract in hn-infra infrastructure/design/README.md:
# port 8080, uid 101, read-only root filesystem (nothing here writes), gallery at /.

ARG BUN_VERSION=1.4.2

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
# Cache-control off: the gallery's file names carry no content hash, so the default one-year
# max-age on .js and .css would pin a stale gallery in browsers after a deploy.
ENV SERVER_HOST=0.0.0.0 \
    SERVER_PORT=8080 \
    SERVER_ROOT=/public \
    SERVER_CACHE_CONTROL_HEADERS=false \
    SERVER_HEALTH=true \
    SERVER_LOG_LEVEL=info
COPY --from=build /site /public
USER 101:101
EXPOSE 8080
