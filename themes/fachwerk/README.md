# @hansenexus/theme-fachwerk

fachwerk's theme pack for the hansenexus design system (design#143): direction B "Fachwerk", the
winner of fachwerk's design vote, on the core token names of `@hansenexus/tokens` and the
components of `@hansenexus/ui`. Changing the pack changes the app's design; no component is
forked.

- **Tokens** (`fachwerk/`): limewash paper, ink beams, terracotta action, ochre warnings; night
  variants for dark mode. Contrast CI holds both modes to WCAG 2.2 AA.
- **Recipes**: 2 px borders, 2 px radii, square controls (bars flat), no shadows, comfortable
  density, hatch, brace and cross motifs from `--hn-line-subtle`. The shell is flush: no inset
  or gap, panels share a 2 px beam, a 232 px rail of 48 px cells with beams between them, the
  active row and phone tab a terracotta cell, pages on the limewash (`panel.main`).
- **Skins** (`fachwerk/skins/`): `card.header` sets a braced beam bay before the title,
  `empty-state` stands in a hatched frame.
- **Direction `rund`** (`data-theme="fachwerk-rund"`, export `fachwerkRund`, design#243): the
  same colours and fonts on a round, roomier mask, set by tokens alone and without skins: pill
  buttons, softer corners, 1 px rules in a 2 px frame, taller controls with wider padding and
  one step larger control type. The proof that a pack changes the component mask, not only its
  colour; its colour files are copies of the default direction's.
- **Fonts**: Bricolage Grotesque (display, sans) and IBM Plex Mono. The app loads them, e.g.
  `@fontsource-variable/bricolage-grotesque` and `@fontsource/ibm-plex-mono`.

```sh
bun add @hansenexus/tokens @hansenexus/ui @hansenexus/theme-fachwerk
```

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

`data-theme="fachwerk"` switches the tokens, `<ThemePack>` the skins; use both. The pack's
layout, rules and release are in
[themes/README.md](https://github.com/hansenexus/design/blob/main/themes/README.md). Released
on a `theme-fachwerk-v<version>` tag by `.github/workflows/release-theme.yml`.

MIT.
