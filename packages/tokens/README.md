# @hansenexus/tokens

The hansenexus design tokens: one DTCG source for hansenexus.dev, the portal and kommandant.
Dark and light both ship, and every semantic text and UI pair meets WCAG 2.2 AA in both.

```sh
bun add @hansenexus/tokens
```

## CSS variables

```css
@import "@hansenexus/tokens/tokens.css";
```

Every token is a `--hn-*` variable: `--hn-surface-page`, `--hn-ink-muted`, `--hn-status-crit`,
`--hn-size-row`. Switch with attributes, usually on `<html>`:

| Attribute | Values | Default |
| --- | --- | --- |
| `data-mode` | `dark`, `light` | `dark` |
| `data-theme` | `hansenexus`, `kommandant`, `portal` | `hansenexus` |
| `data-density` | `compact` (36 px rows, 24 px targets), `comfortable` (48 px), `touch` (56 px, 44 px targets) | the theme's |

`data-mode` also works on a subtree. A theme's per-mode overrides expect `data-theme` and
`data-mode` on the same element.

## Tailwind v4

```css
@import "tailwindcss";
@import "@hansenexus/tokens/tailwind.css";
```

Utilities carry an `hn-` prefix so they never shadow Tailwind's own: `bg-hn-surface-card`,
`text-hn-ink-body`, `border-hn-line-strong`, `rounded-hn-md`, `font-hn-mono`, `h-hn-row`,
`min-h-hn-target`, `p-hn-4`, `shadow-hn-lift`.

## TypeScript

```ts
import { tokens, vars, density } from "@hansenexus/tokens";

tokens.kommandant.dark.status.crit; // "#ff7a66", for charts and canvas
vars.surface.page; // "var(--hn-surface-page)", follows the active mode
density.touch.target; // "44px"
```

## Tiers

- `tokens/primitives/`: the raw palette and the density scales. Never emitted: components only
  see semantics.
- `tokens/semantic/`: what a value means. `color.dark.json` and `color.light.json` carry the
  same names; `scale.json` holds space, radius, fonts, durations, focus and the one lift shadow.
- `tokens/themes/`: per product, the density and any semantic that differs from the shared set.
  `themes/<theme>.<mode>.json` holds per-mode overrides.

## Rules the tokens cannot enforce

- Lime `#42c501` is the only accent: a flat fill with `action.primary-ink` on it, or text on dark.
  On light, lime text is `action.text` (`#2b7300`). No glow, gradients, coloured shadows or sheen.
- Status is never colour alone: ok dot, busy ring, warn triangle, crit diamond, off hollow circle,
  unknown dashed circle. `status.off` is a shape colour; its label uses `ink.muted`.
- `line.subtle` is decoration only; a control's boundary uses `line.strong`.

## Checks

`bun run contrast` resolves every theme in both modes and checks each pair in
`scripts/contrast.ts` (text 4.5:1, UI 3:1). It fails on a pair below AA and on a colour token
that no rule covers and that is not explicitly exempt.

## Versioning

Semver. Renaming or removing a token is a major; a new token is a minor; a changed value is a
patch unless it changes meaning. Releases come from CI on a `tokens-v<version>` tag.

## Licence

MIT
