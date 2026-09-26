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
exec docker run --rm --userns=host --shm-size=1g --init \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e HN_IN_PLAYWRIGHT_IMAGE=1 \
  -v "$repo:$repo" -v "$(readlink -f "$(command -v bun)"):/usr/local/bin/bun:ro" \
  -w "$PWD" "$image" bash -c 'ln -sf /usr/local/bin/bun /tmp/bunx 2>/dev/null; PATH="/tmp:$PATH" exec bunx playwright test "$@"' _ "$@"
