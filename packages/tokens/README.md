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
| `data-theme` | `hansenexus`, `kommandant`, `portal`, `lexilink` (a bundled theme pack) | `hansenexus` |
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
`min-h-hn-target`, `p-hn-4`, `shadow-hn-lift`, `shadow-hn-overlay`, `rounded-hn-control-dot`, `ease-hn-pulse`.

Type roles are `text-hn-<role>`: each sets size, line height and weight, e.g. `text-hn-body`,
`text-hn-meta font-hn-mono`. The family stays separate (`font-hn-*`).

`rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-xl` read the radius token of the same name
(`--hn-radius-lg` is 14 px, like Swift's `HNRadius.lg`), replacing Tailwind's defaults for those
four steps; `rounded-hn-*` stays. An app that remapped them (kommandant's shadcn layer pointed
`rounded-lg` at `--hn-radius-md`) drops its aliases and writes the step it means.

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

tokens.kommandant.dark.status.crit; // "#ff6b5e", for charts and canvas
vars.surface.page; // "var(--hn-surface-page)", follows the active mode
density.touch.target; // "44px"
ms.delay.pending; // 200, every duration in milliseconds for timers
tokens.kommandant.dark.text.meta; // { size: "11px", lineHeight: "16px", weight: "400" }
vars.text.body.size; // "var(--hn-text-body)"
```

## Type scale

`semantic/type.json` names seven roles, each a size, line height and weight, no family:

| Role | Default (sites) | kommandant (dense) | Weight | For |
| --- | --- | --- | --- | --- |
| `caption` | 12 / 16 | 10 / 14 | 500 | chips, badges, tiny labels |
| `meta` | 13 / 18 | 11 / 16 | 400 | secondary lines, timestamps, section headers |
| `body-sm` | 14 / 20 | 12 / 16 | 400 | dense rows, small buttons |
| `body` | 16 / 24 | 13 / 20 | 400 | running text, row titles |
| `title` | 20 / 28 | 15 / 20 | 600 | card and panel titles |
| `heading` | 24 / 32 | 18 / 24 | 600 | page headings |
| `display` | 36 / 44 | 28 / 34 | 600 | hero titles, big numbers |

CSS: `--hn-text-<role>` (size), `--hn-text-<role>--line-height`, `--hn-text-<role>--font-weight`,
following the theme. Tailwind: `text-hn-<role>`. Swift: `Font.hn(.body)`, `HNTypeScale.of(theme)`.
Weight variants of a role (a semibold `meta` header) add `font-semibold`; a size outside the scale
is a gap to raise here, not an arbitrary `text-[Npx]`.

## Tiers

- `tokens/primitives/`: the raw palette and the density scales. Never emitted: components only
  see semantics.
- `tokens/semantic/`: what a value means. `color.dark.json` and `color.light.json` carry the
  same names; `scale.json` holds space, radius, fonts, durations, focus and the one lift shadow; `type.json`
  the type scale;
  `motion.json` holds the loading timings: `delay.pending` (200 ms before a spinner or pending
  indicator shows), `min-visible.pending` (400 ms it then stays), and duration plus easing for
  `pulse`, `shimmer` and `spin`.
- `tokens/semantic/recipe.json`: the recipes, how a theme draws rather than which colour
  (below).
- `tokens/themes/`: the core themes (hansenexus, kommandant, portal), per product, the density
  and any semantic that differs from the shared set. `themes/<theme>.<mode>.json` holds per-mode
  overrides.
- `themes/<app>/<direction>/` at the repo root: theme packs (design#143), an app's own brand on
  the same names. A direction holds `palette.json` (its primitives, never emitted),
  `tokens.json` and `tokens.<mode>.json`; `themes/<app>/pack.json` names the default direction,
  whose `data-theme` is the app's name (another direction's is `<app>-<direction>`). A pack may
  override any core token and add none: every direction resolves exactly the core's names.
  Packs ship as `@hansenexus/theme-<app>`; lexilink is still bundled here too (`BUNDLED_PACKS`
  in `scripts/resolve.ts`) until it adopts its pack.

## Recipes

`semantic/recipe.json` holds what a theme changes about structure, so a new direction is a token
change, never a component edit. The defaults are the hansenexus look; every theme can override
them.

| Token | Default | Read by |
| --- | --- | --- |
| `border.width` | `1px` | Tailwind's bare `border`, `border-t`, `divide-x` and the rest (`--default-border-width`) |
| `border.style` | `solid` | the same utilities (`--tw-border-style`, set in the base layer; `border-dashed` still wins) |
| `elevation.raised` | `shadow.lift` | `shadow-hn-raised`: the slider thumb |
| `elevation.overlay` | `shadow.lift` | `shadow-hn-overlay`: menus, popovers, selects, tooltips, toasts, dialogs, sheets, ⌘K |
| `elevation.panel` | `shadow.lift` | `shadow-hn-panel`: the shell's floating panels |
| `control.box` | `radius.sm` | `rounded-hn-control-box`: checkbox |
| `control.dot` | `radius.pill` | `rounded-hn-control-dot`: radio, switch, slider, scroll thumb, usage bar, menu radio dot, sheet grabber |
| `control.bar` | `3px` | `rounded-hn-control-bar`: progress and meter tracks |
| `control.chip` | `radius.pill` | `rounded-hn-control-chip`: badge, status badge |
| `motif.hatch` | `none` | `bg-(image:--hn-motif-hatch)`: progress and meter tracks |
| `motif.brace`, `motif.cross` | `none` | pack skins |
| `radius.*`, `size.*` (density) | | as before: the corner scale and the theme's density |

Control shape is a radius, so a square pack sets the `control.*` radii to its sawn edge and a
round one keeps the pills; `control.box` and `control.dot` follow `radius.sm` and `radius.pill`
unless a theme sets them. A motif is a CSS `background-image` value and may read a colour
variable (`var(--hn-line-strong)`): it resolves on the element that carries `data-theme` and
`data-mode`. A flat pack sets each `elevation.*` to a transparent zero shadow. Swift gets
`HNBorder`, `HNElevation` and `HNControl`; `border.style` and `motif.*` are web only.

## lexilink

`data-theme="lexilink"` is lexilink's B2 Ledger on the same semantic names: pure paper and ink,
1 px ink lines, no grey fills, square corners (`radius.sm` to `lg` are 0, `xl` 4 px, `pill` stays
round), Archivo for display and UI, Geist Mono for numbers. Orange (`action.primary`) is a solid
block with ink text, never text and never a tint; `action.text` is ink. The source is hn-monorepo
`apps/lexilink-next/src/styles/theme.css`; it lives as the pack direction
`themes/lexilink/ledger/`. The hex values in `palette.ledger` are its oklch values
converted to sRGB. Two values differ from that file because the contrast rules here are stricter:
the focus ring on light is ink (orange on paper is 2.6:1), and `line.strong` on dark is the grey
(the 38 % dividing line, `line.subtle`, is 1.8:1). lexilink's type recipes (weight, width,
tracking per role) are component styling and stay in the app.

## kommandant

`data-theme="kommandant"` is the Leitstand (PRD hansenexus/kommandant#472, variant A). Dark mode
swaps the warm grounds for an ink set (`palette.leitstand`: page `#121109`, card `#1b1912`,
raised `#262218`, band `#1f1c14`) with its own ink, lines and status colours; light mode keeps the
shared paper set. `font.display` is the sans stack: the theme references no serif. `text.*` is the
dense type scale (body 13 px; 11, 12 and 13 carry most of the UI). The rail
(`surface.rail` with `rail.ink`, `rail.muted`, `rail.line` and `rail.status-*`) is the same in
both modes, so it stays ink on paper; its status shapes are the dark status set. Every other theme
carries the rail tokens too, as the warm dark band and status set, because the Swift output needs
the same colour names in every theme.

## Rules the tokens cannot enforce

- Lime `#42c501` is the only accent (lexilink excepted, see above): a flat fill with `action.primary-ink` on it, or text on dark.
  On light, lime text is `action.text` (`#2b7300`). No glow, gradients, coloured shadows or sheen.
- Status is never colour alone: ok dot, busy ring, warn triangle, crit diamond, off hollow circle,
  unknown dashed circle. `status.off` is a shape colour; its label uses `ink.muted`.
- A destructive action is the flat `action.danger` fill with `action.danger-ink` on it.
- `line.subtle` is decoration only; a control's boundary uses `line.strong`.
- `rail.*` is for text, lines and status shapes on `surface.rail` only; the rail stays ink in
  both modes. On the rail, status shapes use `rail.status-ok`, `-busy`, `-warn` and `-crit`
  (3:1 on `surface.rail`), never `status.*`, whose light set fails on ink.
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
4.5:1 for all 16 `terminal.*` colours on `surface.page` and `surface.card`; a 1.3:1 floor for
`line.subtle` on `surface.card` and `rail.line` on `surface.rail`, again not a WCAG minimum, so a
divider still divides; `rail.ink` and `rail.muted` are text and `rail.status-*` UI on
`surface.rail`). It fails on a pair below AA and on a colour token
that no rule covers and that is not explicitly exempt.

## Versioning

Semver. Renaming or removing a token is a major; a new token is a minor; a changed value is a
patch unless it changes meaning. Releases come from CI on a `tokens-v<version>` tag.

## Licence

MIT
