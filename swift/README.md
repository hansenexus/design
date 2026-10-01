# HansenexusTokens and HansenexusBrand (Swift)

The hansenexus design tokens for Swift and SwiftUI, generated from the same DTCG source as
`@hansenexus/tokens`. Semantic tier only: the raw palette never reaches Swift.

## Add the package

```swift
.package(url: "https://github.com/hansenexus/design.git", from: "0.5.0"),
// target dependency:
.product(name: "HansenexusTokens", package: "design"),
```

SwiftPM resolves plain semver git tags (`0.5.0`), not the npm release tags (`tokens-v0.5.0`).
Every `@hansenexus/tokens` release (`.github/workflows/release.yml`) also pushes the plain tag of
its version on the same commit, so the Swift package version is the tokens version. A Swift change
that touches only the brand files ships with the next tokens release. The first plain tag comes with
the release after `tokens-v0.4.0`; until then pin `revision:`.

iOS 16 and macOS 13 or later.

## Colour

```swift
import HansenexusTokens
import SwiftUI

Color.hn(.kommandant).surface.page   // follows the system appearance, dark by default
Color.hn().status.crit               // theme hansenexus
Color(hn: HNColors.of(.kommandant, .light).action.text)  // fixed to one mode
HNColors.of(.kommandant, .dark).status.crit.hex          // the CSS spelling, for logs and tests
HNColors.of(.kommandant, .light).terminal.brightMagenta  // ANSI palette on surface.page
```

## Type

```swift
Text("Estate").font(.hnDisplay(size: 34))
Text("web-01").font(.hnMono(size: 13))
```

`Font.hn` picks the first installed family of the stack and scales with Dynamic Type. The package
bundles no font files: register Fraunces, Instrument Sans and JetBrains Mono in the app. Without
them it falls back to the system serif, default or monospaced design.

## Spacing and size

```swift
.padding(HNSpace.s4)                          // 16 pt, --hn-space-4
.clipShape(RoundedRectangle(cornerRadius: HNRadius.md))
.frame(minHeight: HNSize.of(.touch).target)   // 44 pt; HNSize.of(.kommandant).row is 36
```

Also `HNDuration` (seconds), `HNFocus` (ring width and offset), `HNShadow.lift` and
`HNFontFamily`.

`HNRadius` and `HNFontFamily` differ per theme since lexilink (square corners, Archivo and Geist
Mono): `HNRadius.of(.lexilink).md` is 0, `HNFontFamily.of(.lexilink).sans` starts with Archivo. The
static names (`HNRadius.md`, `HNFontFamily.sans`) stay the default theme's values.

## Rules the package cannot enforce

- No glass in content. Cards, sheets and every content surface are flat; glass exists only as the
  system material of window chrome (sidebar, toolbar), which the OS draws. No glow, gradient,
  coloured shadow or sheen; `HNShadow.lift` is the one neutral lift.
- Lime is the only accent: a flat fill with `action.primaryInk` on it; on light, lime text is
  `action.text`.
- Status is never colour alone: ok dot, busy ring, warn triangle, crit diamond, off hollow circle,
  unknown dashed circle.

## Brand

The `HansenexusBrand` product draws the mark and the wordmark from their geometry and bundles the
files of `brand/assets` (mark and wordmark SVGs, the 1024 px app icon master, the menu bar
template PNGs).

```swift
.product(name: "HansenexusBrand", package: "design"),

import HansenexusBrand

HansenexusMark(variant: .lime).frame(height: 24)        // flat lime; .mono follows the foreground
HansenexusWordmark(variant: .limeDeep).frame(height: 20) // on light surfaces
HNBrandAsset.url(HNBrandAsset.appIcon)                   // app-icon-1024.png
HNBrandAsset.url(HNBrandAsset.trayTemplate)              // NSImage: set isTemplate = true
```

The name, mark and wordmark are trademarks, not covered by the MIT licence
([TRADEMARK.md](../TRADEMARK.md)); usage rules in [brand/README.md](../brand/README.md).

## Regenerate

`Sources/HansenexusTokens/Tokens.swift`, `Sources/HansenexusBrand/BrandGeometry.swift` and
`Sources/HansenexusBrand/Resources/` are generated. After a token or geometry change:

```sh
bun run swift    # rewrites Tokens.swift; commit it
bun run brand    # rewrites the brand assets and the Swift brand files; commit them
```

`bun run test` fails while the committed file is stale, and CI builds and tests the package on
Linux, macOS and for iOS.
