# Theme packs

An app's whole design, structure included, swaps by changing its theme pack, never by editing
components (design#143, ruling `dec_2026-11-15_global-design-theme-packs-gallery-workbench`).
The core stays in `packages/`: `@hansenexus/tokens`, `@hansenexus/ui`, `@hansenexus/shell`.

```
themes/<app>/                @hansenexus/theme-<app>
  pack.json                 { "app": "<app>", "default": "<direction>", "illustrations"?: "<set>", "motion"?: "<set>" }
  package.json              the npm package, built by scripts/theme-build.ts
  index.ts                  one ThemePackDefinition per direction, and `directions`
  <direction>/
    palette.json            the direction's primitives: never emitted, only referenced
    tokens.json             any core token it overrides, recipes included
    tokens.dark.json        per-mode overrides (optional)
    tokens.light.json
    skins/                  structure the recipes cannot express (optional)
      <item>.tsx            one file per skinned item, `<item>.<part>.tsx` for a part
      _<helper>.tsx         shared pieces, at atom level
      index.ts              the direction's `skins` map for its ThemePackDefinition
```

- **Tokens.** A direction overrides the names the core defines (`packages/tokens/tokens/semantic`)
  and adds none; `packages/tokens/tests/packs.test.ts` holds every direction to exactly the core's
  names in both modes. The palette may be any colour: the ratchet exempts a direction's
  `palette.json` and `tokens*.json`, and nothing else in a pack.
- **Recipes** are tokens too: `border.width`/`style`/`frame`, `elevation.*`, `control.*` (control
  shape as radii per family: box, dot, bar, chip, button, item, field, card, overlay, dialog),
  `motif.*`, plus the existing `radius.*`, density (`size.*`, control heights and paddings
  included) and the control type roles `text.control-*` (design#243). Together they are the
  pack's mask: a direction can change shape, size and type without a skin
  (`themes/fachwerk/rund`). The table is in
  [packages/tokens/README.md](../packages/tokens/README.md#recipes). The atoms of
  `@hansenexus/ui` read them, so a pack never forks an atom.
- **Skins.** What recipes cannot say, a skin says: a component for one slot of
  `@hansenexus/ui`'s `SkinSlots` (molecules, organisms and the `shell` template; atoms have
  none), mounted with `<ThemePack pack={…}>`. A slot the pack leaves out renders the default.
  A skin sits at the level of the item it skins and imports only that level or lower: named
  imports from `@hansenexus/ui` count as the item that exports them, `@hansenexus/shell` as a
  template, `./<file>` as that sibling skin (`bun run ratchet`, `scripts/levels.ts`). Skins are
  not exempt from the raw-colour ratchet.
- **Motion.** `pack.json` may name the app's default motion set (design#221), an id of
  `packages/tokens/tokens/motion-sets/sets.json` such as `calm` or `snappy`; without one the
  pack uses `default`. A set is not part of `theme.css`: the app sets `data-motion="<set>"` on
  `<html>` next to `data-theme` and passes the same id to `<MotionProvider set>` for its timers.
  The build refuses a set that does not exist. The gallery follows the pack's default until its
  Animation set picker (`?motionSet=`) names another. A pack never overrides the motion tokens
  themselves: a set is how motion changes.
- **Illustrations.** Illustration sets are an axis of their own (design#220): a pack names its
  default set in `pack.json`'s optional `"illustrations"`, an id of
  `@hansenexus/illustrations/sets`; without one the app gets the `estate` set. The app hands it to
  `<IllustrationSetProvider set={…}>` and draws `<StateIllustration state="empty" />` from
  `@hansenexus/illustrations/state`. Any set renders under any pack: the gallery follows the
  pack's default until `?illustrations=<set>` overrides it. `packages/illustrations/tests`
  holds every named set to the registry.
- **Theme ids.** The default direction's `data-theme` is the app's name; another direction's is
  `<app>-<direction>`, so a candidate can render beside the live one in the gallery.
- **Checks.** `bun run contrast` resolves every direction in both modes against the same WCAG
  rules as the core themes. `packages/ui/tests/packs.test.tsx` renders every atom's demo under
  each pack, holds its skins to registered slots above the atoms, and checks that a demo
  reaching none of its skins renders byte for byte the default. The gallery offers every
  direction in its theme picker (`packages/ui/gallery/packs.ts`), and
  `packages/ui/screenshots/kit.spec.ts` keeps baselines of the fachwerk pack.

## The package

Each app's pack is one npm package, `@hansenexus/theme-<app>`, versioned on its own and
released by `.github/workflows/release-theme.yml` on a `theme-<app>-v<version>` tag. `bun run
build` writes its `dist/`: `theme.css` (every direction as `[data-theme]` blocks over the core
variables), `index.js` with the `ThemePackDefinition`s and their skins, and the declarations.
`@hansenexus/tokens`, `@hansenexus/ui` and `react` are peer dependencies.

```css
@import "tailwindcss";
@import "@hansenexus/tokens/tailwind.css";
@import "@hansenexus/theme-fachwerk/theme.css";
@source "../node_modules/@hansenexus/ui/dist";
@source "../node_modules/@hansenexus/theme-fachwerk/dist";
```

```tsx
import { fachwerk } from "@hansenexus/theme-fachwerk";
import { ThemePack } from "@hansenexus/ui";

// <html data-theme="fachwerk" data-mode="light">
<ThemePack pack={fachwerk}>
  <App />
</ThemePack>;
```

A new pack: copy `themes/fachwerk/`'s `package.json`, `tsconfig.build.json` and `LICENSE`, name
the package `@hansenexus/theme-<app>` (the build refuses any other name), add the app to
`packages/ui/gallery/packs.ts`, and run `bun install`. Its first npm publish and its Trusted
Publisher setting are the owner's.

| Pack | Directions | Illustrations | Ships in |
| --- | --- | --- | --- |
| `lexilink` | `ledger` (B2 Ledger, default) | `estate` | `@hansenexus/tokens` (`data-theme="lexilink"`), until lexilink adopts `@hansenexus/theme-lexilink` |
| `fachwerk` | `fachwerk` (direction B "Fachwerk", default): 2 px beams, square controls, no shadows, brace and hatch motifs, Bricolage Grotesque and IBM Plex Mono; skins `card.header`, `empty-state` | `school` | `@hansenexus/theme-fachwerk` |
