#!/usr/bin/env bash
# Packs @hansenexus/tokens, installs the tarball into a scratch consumer with
# `bun add`, compiles Tailwind v4 against tailwind.css and imports the TS
# constants. Catches what the unit tests cannot: a file missing from `files`
# or `exports`, or an @theme Tailwind refuses.
# Usage: scripts/smoke.sh [workdir]   (run from packages/tokens after a build)
set -euo pipefail
work="${1:-$(mktemp -d)}"
mkdir -p "$work/consumer"
bun pm pack --destination "$work" >/dev/null
tgz=$(ls "$work"/hansenexus-tokens-*.tgz)
cd "$work/consumer"
echo '{"name":"consumer","private":true,"type":"module"}' >package.json
bun add "$tgz" tailwindcss@4 @tailwindcss/cli@4 >/dev/null
printf '@import "tailwindcss";\n@import "@hansenexus/tokens/tailwind.css";\n' >in.css
echo '<div class="bg-hn-surface-page text-hn-ink-muted h-hn-row rounded-hn-md"></div>' >index.html
bunx @tailwindcss/cli -i in.css -o out.css
for needle in '.bg-hn-surface-page' '.h-hn-row' '[data-mode="light"]' '--hn-status-crit: #ff7a66'; do
  grep -qF -- "$needle" out.css || { echo "smoke: '$needle' missing from compiled CSS"; exit 1; }
done
cat >check.ts <<'TS'
import { density, tokens } from "@hansenexus/tokens";
if (tokens.kommandant.light.status.crit !== "#b3261e") throw new Error("TS constants: wrong crit");
if (density.touch.target !== "44px") throw new Error("TS constants: wrong touch target");
TS
bun check.ts
echo "smoke: @hansenexus/tokens installs, compiles with Tailwind v4 and imports"
