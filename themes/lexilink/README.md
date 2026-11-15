# @hansenexus/theme-lexilink

lexilink's theme pack for the hansenexus design system (design#143): direction B2 "Ledger",
pure paper and ink, 1 px ink lines, square corners, one orange block, on the core token names
of `@hansenexus/tokens`. Recipes only, no skins.

`@hansenexus/tokens` still bundles these tokens (`data-theme="lexilink"` in its `tokens.css`)
until lexilink adopts this package; then the bundled copy goes.

```sh
bun add @hansenexus/tokens @hansenexus/ui @hansenexus/theme-lexilink
```

```css
@import "tailwindcss";
@import "@hansenexus/tokens/tailwind.css";
@import "@hansenexus/theme-lexilink/theme.css";
@source "../node_modules/@hansenexus/ui/dist";
```

```tsx
import { lexilink } from "@hansenexus/theme-lexilink";
import { ThemePack } from "@hansenexus/ui";

// <html data-theme="lexilink" data-mode="light">
<ThemePack pack={lexilink}>
  <App />
</ThemePack>;
```

The pack's layout, rules and release are in
[themes/README.md](https://github.com/hansenexus/design/blob/main/themes/README.md). Released
on a `theme-lexilink-v<version>` tag by `.github/workflows/release-theme.yml`.

MIT.
