# design

hansenexus design system: DTCG tokens, UI primitives, state illustrations, the state-check and the Swift package. Open core (MIT).

| Package | What |
| --- | --- |
| [`@hansenexus/tokens`](packages/tokens) | DTCG source, CSS variables, Tailwind v4 `@theme`, TS constants, contrast CI |
| [`HansenexusTokens`](swift) | SwiftPM package: generated colours, fonts and spacing for SwiftUI |
| [`@hansenexus/ui`](packages/ui) | 16 primitives on Radix, Skeleton, Spinner, `useDelayedVisibility`, EmptyState, ErrorState, Progress, QueryState (DE/EN copy), semantic tokens only, shadcn registry, screenshot baselines; `HansenexusMark`, `HansenexusWordmark` |
| [`@hansenexus/illustrations`](packages/illustrations) | Eight geometric state motifs (empty, no-results, error, 404, offline, no-permission, success, maintenance) as React SVG, one import path each, colour only through `currentColor` and `--hn-*`, ≤ 3 KB gzip each |
| [`@hansenexus/state-check`](packages/state-check) | The frontend state contract as a CI ratchet: dynamic Next.js routes need `loading.tsx` or `<Suspense>`; opt-in Convex `useQuery` loading-branch and pending-action rules; CLI, config, per-app baseline |
| [`brand/`](brand) | The mark and wordmark in every variant, favicons, app icon, menu bar template; usage rules |

```sh
bun install
bun run build && bun run contrast && bun run ratchet && bun run test
bun run screenshots   # needs Docker, see packages/ui
swift test   # the Swift package; bun run swift regenerates it after a token change
bun run brand   # regenerates brand/assets and the Swift brand files after a geometry or token change
```

`bun run ratchet` fails on a raw colour value (hex, colour functions, Tailwind palette utilities) anywhere
outside `packages/tokens`. `ratchet.baseline.json` holds allowed counts per file; it is empty and
may only shrink (`bun scripts/ratchet.ts --update`).

## Releases

Each package publishes to npm with provenance over OIDC trusted publishing, from its own
workflow on its own tag. The tag must match the package's `package.json` version.

| Package | Tag | Workflow |
| --- | --- | --- |
| `@hansenexus/tokens` | `tokens-v<version>` | `.github/workflows/release.yml` |
| `@hansenexus/ui` | `ui-v<version>` | `.github/workflows/release-ui.yml` |
| `@hansenexus/state-check` | `state-check-v<version>` | `.github/workflows/release-state-check.yml` |
| `@hansenexus/illustrations` | `illustrations-v<version>` | `.github/workflows/release-illustrations.yml` |

Run a workflow by hand (`gh workflow run <file> -f dry_run=true`) to pack and validate without
publishing.

```sh
bun add @hansenexus/tokens @hansenexus/ui
```

## Licence and trademarks

The code is MIT ([LICENSE](LICENSE)). The hansenexus name, mark and wordmark are trademarks and
are not covered by the MIT licence: see [TRADEMARK.md](TRADEMARK.md).
