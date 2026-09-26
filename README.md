# design

hansenexus design system: DTCG tokens, UI primitives and the Swift package. Open core (MIT).

| Package | What |
| --- | --- |
| [`@hansenexus/tokens`](packages/tokens) | DTCG source, CSS variables, Tailwind v4 `@theme`, TS constants, contrast CI |
| [`HansenexusTokens`](swift) | SwiftPM package: generated colours, fonts and spacing for SwiftUI |

```sh
bun install
bun run build && bun run contrast && bun run test
swift test   # the Swift package; bun run swift regenerates it after a token change
```
