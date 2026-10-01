# design

hansenexus design system: DTCG tokens, UI primitives, state illustrations, the state-check and the Swift package. Open core (MIT).

| Package | What |
| --- | --- |
| [`@hansenexus/tokens`](packages/tokens) | DTCG source, CSS variables, Tailwind v4 `@theme`, TS constants, contrast CI |
| [`HansenexusTokens`](swift) | SwiftPM package: generated colours, fonts and spacing for SwiftUI |
| [`@hansenexus/ui`](packages/ui) | 16 primitives on Radix, the form set, DatePicker, Combobox and DataTable, Skeleton, Spinner, `useDelayedVisibility`, EmptyState, ErrorState, Progress, QueryState (DE/EN copy), semantic tokens only, shadcn registry, screenshot baselines; `HansenexusMark`, `HansenexusWordmark` |
| [`@hansenexus/illustrations`](packages/illustrations) | Eight geometric state motifs (empty, no-results, error, 404, offline, no-permission, success, maintenance) as React SVG, one import path each, colour only through `currentColor` and `--hn-*`, ≤ 3 KB gzip each |
| [`@hansenexus/shell`](packages/shell) | The app shell from the shell-layout vote: floating panels with the slots nav, header, main and an optional context pane, container-query layout (tab bar below 768 px), capability-based nav visibility, and a ⌘K container that takes external command sets or a whole palette (the Lotse ops preset mounts there) |
| [`@hansenexus/state-check`](packages/state-check) | The frontend state contract as a CI ratchet: dynamic Next.js routes need `loading.tsx` or `<Suspense>`; opt-in client-router route (wouter, React Router), Convex `useQuery` loading-branch and pending-action rules; CLI, config, per-app baseline |
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

`bun run ratchet` also runs `scripts/levels.ts`: every `@hansenexus/ui` registry item carries
`meta.level` (`atom|molecule|organism|template`) in `packages/ui/registry.json`, and a file may import
only items of the same or a lower level. Folders stay flat; the level lives in that metadata. The
gallery lists the items by level and shows each preview card's level. An item that installs an npm
package instead of copying files (`shell`, level `template`) names the items it draws in
`meta.uses`, and the same rule applies to them.

Each item has a gallery page, `?item=<name>`, with its blast radius: every item that uses it,
directly or transitively, through `registryDependencies`, a source import or `meta.uses`, each as a replayable
preview card in the current toolbar view ("Replay all" replays every card at once). The graph is
built with the gallery (`packages/ui/scripts/graph.ts`, also written to
`packages/ui/gallery/dist/graph.json`); the gallery parses nothing at runtime.

## Releases

Each package publishes to npm with provenance over OIDC trusted publishing, from its own
workflow on its own tag. The tag must match the package's `package.json` version.

| Package | Tag | Workflow |
| --- | --- | --- |
| `@hansenexus/tokens` | `tokens-v<version>` | `.github/workflows/release.yml` |
| `@hansenexus/ui` | `ui-v<version>` | `.github/workflows/release-ui.yml` |
| `@hansenexus/state-check` | `state-check-v<version>` | `.github/workflows/release-state-check.yml` |
| `@hansenexus/illustrations` | `illustrations-v<version>` | `.github/workflows/release-illustrations.yml` |
| `@hansenexus/shell` | `shell-v<version>` | `.github/workflows/release-shell.yml` |

Run a workflow by hand (`gh workflow run <file> -f dry_run=true`) to pack and validate without
publishing.

```sh
bun add @hansenexus/tokens @hansenexus/ui
bun add @hansenexus/shell   # the app shell, on top of both
```

## Hosted gallery

Every push to main builds the `@hansenexus/ui` kit gallery into a static-server image,
`registry.hansenexus.dev/design/kit-gallery:<sha>` (`.github/workflows/kit-gallery.yml`,
`Dockerfile`). hn-infra `infrastructure/design` pins the sha and serves it at
`design.hansenexus.dev/` behind Cloudflare Access; the private Lotse kit at `/lotse/` comes
from design-ops. Pull requests that touch the image inputs build and smoke-test it without
pushing.

The image is [static-web-server](https://static-web-server.net) (pinned by digest, about 4 MB)
serving the output of `bun scripts/gallery.ts --out <dir>`: `index.html` plus `dist/` with the
bundle, CSS, brand files and self-hosted fonts, every URL relative. It listens on 8080 as uid 101
and writes nothing, so it runs with a read-only root. Cache-Control comes from
`kit-gallery.sws.toml`: `no-cache` for `index.html`, a day for the content-hashed JS and CSS, an
hour for fonts and brand files. Build and check it locally:

```sh
docker build --target kit-gallery -t kit-gallery .
docker run --rm --read-only --user 101:101 -p 8080:8080 kit-gallery   # http://127.0.0.1:8080/?scene=kit
```

The push is gated on the repository variable `HARBOR_PUSH_ENABLED=true` plus the
`HARBOR_USERNAME` / `HARBOR_PASSWORD` secrets (a push robot of the private Harbor project
`design`). Until those exist, main builds the image and warns that it did not push it.

## Licence and trademarks

The code is MIT ([LICENSE](LICENSE)). The hansenexus name, mark and wordmark are trademarks and
are not covered by the MIT licence: see [TRADEMARK.md](TRADEMARK.md).
