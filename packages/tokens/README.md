# @hansenexus/tokens

The hansenexus design tokens: one DTCG source for hansenexus.dev, the portal, kommandant and lexilink.
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
| `data-theme` | `hansenexus`, `kommandant`, `portal`, `lexilink` | `hansenexus` |
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
`min-h-hn-target`, `p-hn-4`, `shadow-hn-lift`, `ease-hn-pulse`.

Two loading animations come with their keyframes: `animate-hn-pulse` (a skeleton fill from
`skeleton.base` to `skeleton.highlight` and back) and `animate-hn-spin`. Pair each with
`motion-reduce:animate-none`.

`motion-reduce:` and `motion-safe:` follow the OS setting as Tailwind's own do, and also a
`data-reduced-motion` attribute on the element or any ancestor. Set it (on `<html>`, say) to force
reduced motion whatever the OS says; without it nothing changes. The gallery's motion switch uses
it.

## TypeScript

```ts
import { tokens, vars, density, ms } from "@hansenexus/tokens";

tokens.kommandant.dark.status.crit; // "#ff7a66", for charts and canvas
vars.surface.page; // "var(--hn-surface-page)", follows the active mode
density.touch.target; // "44px"
ms.delay.pending; // 200, every duration in milliseconds for timers
```

## Tiers

- `tokens/primitives/`: the raw palette and the density scales. Never emitted: components only
  see semantics.
- `tokens/semantic/`: what a value means. `color.dark.json` and `color.light.json` carry the
  same names; `scale.json` holds space, radius, fonts, durations, focus and the one lift shadow;
  `motion.json` holds the loading timings: `delay.pending` (200 ms before a spinner or pending
  indicator shows), `min-visible.pending` (400 ms it then stays), and duration plus easing for
  `pulse`, `shimmer` and `spin`.
- `tokens/themes/`: per product, the density and any semantic that differs from the shared set.
  `themes/<theme>.<mode>.json` holds per-mode overrides.

## lexilink

`data-theme="lexilink"` is lexilink's B2 Ledger on the same semantic names: pure paper and ink,
1 px ink lines, no grey fills, square corners (`radius.sm` to `lg` are 0, `xl` 4 px, `pill` stays
round), Archivo for display and UI, Geist Mono for numbers. Orange (`action.primary`) is a solid
block with ink text, never text and never a tint; `action.text` is ink. The source is hn-monorepo
`apps/lexilink-next/src/styles/theme.css`; the hex values in `palette.ledger` are its oklch values
converted to sRGB. Two values differ from that file because the contrast rules here are stricter:
the focus ring on light is ink (orange on paper is 2.6:1), and `line.strong` on dark is the grey
(the 38 % dividing line, `line.subtle`, is 1.8:1). lexilink's type recipes (weight, width,
tracking per role) are component styling and stay in the app.

## Rules the tokens cannot enforce

- Lime `#42c501` is the only accent (lexilink excepted, see above): a flat fill with `action.primary-ink` on it, or text on dark.
  On light, lime text is `action.text` (`#2b7300`). No glow, gradients, coloured shadows or sheen.
- Status is never colour alone: ok dot, busy ring, warn triangle, crit diamond, off hollow circle,
  unknown dashed circle. `status.off` is a shape colour; its label uses `ink.muted`.
- A destructive action is the flat `action.danger` fill with `action.danger-ink` on it.
- `line.subtle` is decoration only; a control's boundary uses `line.strong`.
- `brand.*` (lime, lime-deep, ink, paper) is for the mark and wordmark only, the same in both
  modes. Usage in [brand/README.md](../../brand/README.md).
- `terminal.*` (`black` … `white`, `bright-black` … `bright-white`) is the 16-colour ANSI palette of
  a terminal drawn on `surface.page` or `surface.card`, and only that. Green is lime; magenta and cyan are muted so
  lime stays the one accent. On light, `bright-*` is one step deeper, not lighter, so every colour
  keeps 4.5:1. Outside a terminal, use `status.*` for meaning.

## Checks

`bun run contrast` resolves every theme in both modes and checks each pair in
`scripts/contrast.ts` (text 4.5:1, UI 3:1, and a 1.2:1 floor for `skeleton.*` on every surface:
not a WCAG minimum, since a placeholder carries no information, but it must read as a shape; and
4.5:1 for all 16 `terminal.*` colours on `surface.page` and `surface.card`). It fails on a pair below AA and on a colour token
that no rule covers and that is not explicitly exempt.

## Versioning

Semver. Renaming or removing a token is a major; a new token is a minor; a changed value is a
patch unless it changes meaning. Releases come from CI on a `tokens-v<version>` tag.

## Licence

MIT
