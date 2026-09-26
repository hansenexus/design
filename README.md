# design

hansenexus design system: DTCG tokens, UI primitives and the Swift package. Open core (MIT).

| Package | What |
| --- | --- |
| [`@hansenexus/tokens`](packages/tokens) | DTCG source, CSS variables, Tailwind v4 `@theme`, TS constants, contrast CI |
| [`@hansenexus/ui`](packages/ui) | 16 primitives on Radix, semantic tokens only, shadcn registry, screenshot baselines |

```sh
bun install
bun run build && bun run contrast && bun run ratchet && bun run test
bun run screenshots   # needs Docker, see packages/ui
```

`bun run ratchet` fails on a raw colour value (hex, colour functions, Tailwind palette utilities) anywhere
outside `packages/tokens`. `ratchet.baseline.json` holds allowed counts per file; it is empty and
may only shrink (`bun scripts/ratchet.ts --update`).
