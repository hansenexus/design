#!/usr/bin/env bash
# Publishes the package in the current directory to npm, idempotently. Used by every
# .github/workflows/release*.yml (#113).
#
#   scripts/npm-publish.sh            real publish, with provenance
#   scripts/npm-publish.sh --dry-run  pack and validate against the registry
#
# Real publish: when <name>@<version> is already on npm, compare it with this checkout.
# Same gitHead (a re-run of the same tag) or same tarball integrity: skip with a notice,
# so re-running a release is green. Different contents: fail, because the version on npm
# is not what this commit would publish and npm never lets it be replaced.
#
# Dry run: same handling as hansenexus/nextup's release.yml. A dry run against an unbumped
# version always collides, because the registry is reached and answers honestly. That
# answer proves the OIDC exchange authenticated, so a collision counts as success here.
set -euo pipefail

mode=publish
case "${1:-}" in
  "") ;;
  --dry-run) mode=dry-run ;;
  *)
    echo "usage: $0 [--dry-run]" >&2
    exit 2
    ;;
esac

name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
spec="$name@$version"
tmp="${RUNNER_TEMP:-$(mktemp -d)}"

if [ "$mode" = dry-run ]; then
  if npm publish --access public --dry-run 2>&1 | tee "$tmp/publish.log"; then
    echo "dry run clean: $spec is publishable"
    exit 0
  fi
  if grep -q "cannot publish over the previously published versions" "$tmp/publish.log"; then
    echo "::notice::Authenticated to npm and the tarball is well-formed."
    echo "::notice::$spec is already published. Bump before releasing."
    exit 0
  fi
  echo "::error::dry run of $spec failed for a reason other than a version collision"
  exit 1
fi

# An unknown version prints nothing; an unknown package exits non-zero with E404.
published=$(npm view "$spec" version 2>/dev/null || true)
if [ -z "$published" ]; then
  npm publish --access public --provenance
  exit 0
fi

head=$(npm view "$spec" gitHead 2>/dev/null || true)
sha="${GITHUB_SHA:-$(git rev-parse HEAD)}"
if [ -n "$head" ] && [ "$head" = "$sha" ]; then
  echo "::notice::$spec is already published from $sha. Skipping publish."
  exit 0
fi

remote=$(npm view "$spec" dist.integrity)
# Hash the tarball itself instead of parsing `npm pack --json`, whose shape changed in
# npm 12 (#101) and whose stdout lifecycle scripts can pollute.
packdir="$tmp/npm-publish-pack"
rm -rf "$packdir" && mkdir -p "$packdir"
npm pack --pack-destination "$packdir" >/dev/null
tgz=$(find "$packdir" -name '*.tgz' | head -n 1)
local_integrity=$(node -e '
  const data = require("fs").readFileSync(process.argv[1]);
  process.stdout.write("sha512-" + require("crypto").createHash("sha512").update(data).digest("base64"));
' "$tgz")
if [ -n "$local_integrity" ] && [ "$local_integrity" = "$remote" ]; then
  echo "::notice::$spec is already published with identical contents (gitHead ${head:-unknown}). Skipping publish."
  exit 0
fi

echo "::error::$spec is already published with different contents (gitHead ${head:-unknown}, integrity $remote; this checkout packs ${local_integrity:-nothing}). Bump the version."
exit 1
