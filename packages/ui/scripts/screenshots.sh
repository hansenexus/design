#!/usr/bin/env bash
# Screenshot baselines (390 and 1280 px, dark and light) of the kit gallery.
# Pixels depend on the OS and browser build, so outside CI this runs Playwright inside the
# same pinned image the CI job uses. Pass --update-snapshots to rewrite the baselines.
# Usage: scripts/screenshots.sh [playwright test args]   (from packages/ui)
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(bun -e 'console.log(require("@playwright/test/package.json").version)')
image="mcr.microsoft.com/playwright:v${version}-noble"

if [ -n "${CI:-}" ] || [ -n "${HN_IN_PLAYWRIGHT_IMAGE:-}" ]; then
  exec bunx playwright test "$@"
fi

repo=$(git rev-parse --show-toplevel)
# node_modules holds this Mac's native binaries (tailwind's oxide, lightningcss), so the gallery
# is built here and only served in the container, which installs its own Linux bun of the host's
# version through the image's npm (into /tmp, since the image's /usr/local is root-owned). The
# platform is pinned to amd64, the one CI's ubuntu runner renders the baselines on.
bun scripts/gallery.ts
exec docker run --rm --platform linux/amd64 --userns=host --shm-size=1g --init \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e HN_IN_PLAYWRIGHT_IMAGE=1 -e HN_GALLERY_PREBUILT=1 \
  -e npm_config_cache=/tmp/npm-cache -e npm_config_prefix=/tmp/npm -e BUN_VERSION="$(bun --version)" \
  -v "$repo:$repo" -w "$PWD" "$image" \
  bash -c 'npm install -g --silent "bun@$BUN_VERSION" >/dev/null && PATH="/tmp/npm/bin:$PATH" exec bunx playwright test "$@"' _ "$@"
