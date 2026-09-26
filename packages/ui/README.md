# @hansenexus/ui

The open hansenexus primitives: React components on [Radix](https://www.radix-ui.com/), styled only
through the semantic tokens of [`@hansenexus/tokens`](../tokens). Dark and light both ship; every
colour follows `data-mode`, `data-theme` and `data-density` on an ancestor.

Button, Badge, StatusBadge, Switch, Dialog, Menu, Tabs, Table, Meter, Sparkline, Kbd, Toast,
Tooltip, Input, Select, RailItem. Plus the brand: `HansenexusMark` and `HansenexusWordmark`
(`variant` lime, lime-deep, ink, paper or mono, which is `currentColor` and the default; `size` is
the height; named "hansenexus" unless `aria-label` or `aria-hidden` says otherwise). Usage rules in
[brand/README.md](../../brand/README.md).

```sh
bun add @hansenexus/ui @hansenexus/tokens react react-dom
```

## Styles

With Tailwind v4, let Tailwind see the package's classes:

```css
@import "tailwindcss";
@import "@hansenexus/tokens/tailwind.css";
@source "../node_modules/@hansenexus/ui/dist";
```

Without Tailwind, import the prebuilt utilities (they include the token variables):

```css
@import "@hansenexus/ui/styles.css";
```

## Use

```tsx
import { Button, StatusBadge, Meter } from "@hansenexus/ui";

<Button variant="danger">Scale to 2</Button>
<StatusBadge status="crit">Refused</StatusBadge>
<Meter label="Memory" value={88} tone="warn" />
```

`className` is appended, not merged: to change a look, prefer a variant or wrap the component.

## shadcn registry

The same sources ship as a shadcn registry (`registry.json`; built items in `dist/r/`, also in the
npm package under `@hansenexus/ui/registry/*`). Each item depends on `@hansenexus/tokens`, which adds
the token import to your CSS. Point a namespace at wherever `dist/r` is hosted:

```json
{ "registries": { "@hansenexus": "https://<host>/r/{name}.json" } }
```

```sh
bunx shadcn@latest add @hansenexus/button @hansenexus/status-badge
```

## Rules the components keep

- Colour only through semantic tokens. Tailwind's own palette is removed from the build
  (`src/no-palette.css`), and the repo ratchet fails CI on a raw colour outside `packages/tokens`.
- Lime is a flat fill with dark text (`action.primary`) or text (`action.text`). No glow, gradient,
  coloured shadow or sheen; overlays use the one `shadow.lift`.
- Status is never colour alone: StatusGlyph draws ok dot, busy ring, warn triangle, crit diamond,
  off hollow circle, unknown dashed circle. Off and unknown labels use `ink.muted`.
- Targets follow the density: 24 px minimum on desktop, 44 px under `data-density="touch"`.
  Table rows use the density's row height (36 px compact).
- Transitions use the token durations and switch off under `prefers-reduced-motion`.

## Screenshot baselines

`screenshots/baselines/` holds the kit gallery (`gallery/`, every primitive in its states) and each
overlay at 390 and 1280 px, dark and light. Pixels depend on the OS and browser build, so
`scripts/screenshots.sh` runs Playwright inside the pinned `mcr.microsoft.com/playwright` image,
the same one CI uses. It needs Docker.

```sh
bun run build                 # tokens dist is needed by the gallery
bun run screenshots           # compare (from packages/ui)
bun run screenshots:update    # rewrite after an intended change; review the PNG diff
bun run gallery -- --serve    # look at it: http://127.0.0.1:4410/gallery/?scene=kit&mode=light
```

## Licence

MIT, except the hansenexus name, mark and wordmark (`brand-geometry`, `HansenexusMark`,
`HansenexusWordmark`): trademarks, not covered by the MIT licence. See
[TRADEMARK.md](../../TRADEMARK.md).
