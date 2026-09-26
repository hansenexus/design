# design

hansenexus design system: DTCG tokens, UI primitives and the Swift package. Open core (MIT).

| Package | What |
| --- | --- |
| [`@hansenexus/tokens`](packages/tokens) | DTCG source, CSS variables, Tailwind v4 `@theme`, TS constants, contrast CI |
| [`HansenexusTokens`](swift) | SwiftPM package: generated colours, fonts and spacing for SwiftUI |
| [`@hansenexus/ui`](packages/ui) | 16 primitives on Radix, semantic tokens only, shadcn registry, screenshot baselines; `HansenexusMark`, `HansenexusWordmark` |
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

## Licence and trademarks

The code is MIT ([LICENSE](LICENSE)). The hansenexus name, mark and wordmark are trademarks and
are not covered by the MIT licence: see [TRADEMARK.md](TRADEMARK.md).
