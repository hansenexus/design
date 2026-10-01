// The one per-app colour of the popover components. Foundation-free, so the default and
// the plumbing are tested on Linux too; the SwiftUI side reads it from the environment.
import HansenexusTokens

/// A colour with a dark-mode and a light-mode value.
public struct HNModePair: Sendable, Hashable {
  public var dark: HNRGBA
  public var light: HNRGBA

  public init(dark: HNRGBA, light: HNRGBA) {
    self.dark = dark
    self.light = light
  }

  /// The same value in both modes.
  public init(_ both: HNRGBA) {
    self.init(dark: both, light: both)
  }

  public subscript(mode: HNMode) -> HNRGBA {
    mode == .light ? light : dark
  }
}

/// The accent of the popover components: the primary pill, the emblem, the selected tab,
/// accent chips. Everything else (danger, ok, cards, hairlines) is the same in every app.
///
/// With no `.hnAccent(_:)` set the components use `HNAccent.brand`, built from the
/// `action.*` and `surface.tint` tokens of the hansenexus theme.
public struct HNAccent: Sendable, Hashable {
  /// Solid fills: the primary pill and the emblem.
  public var fill: HNModePair
  /// Text and symbols on `fill`. Pick it for at least 4.5:1 against `fill`.
  public var onFill: HNModePair
  /// The readable accent for text and symbols on the popover background.
  public var text: HNModePair
  /// The selection tint behind the selected tab and accent chips.
  public var soft: HNModePair

  public init(fill: HNModePair, onFill: HNModePair, text: HNModePair, soft: HNModePair) {
    self.fill = fill
    self.onFill = onFill
    self.text = text
    self.soft = soft
  }

  /// The brand look: lime fill with ink on it, `action.text` for text, `surface.tint` for
  /// selection.
  public static let brand = HNAccent.of(.hansenexus)

  /// The accent a theme's tokens give: `action.primary`, `action.primaryInk`, `action.text`
  /// and `surface.tint`.
  public static func of(_ theme: HNTheme) -> HNAccent {
    let dark = HNColors.of(theme, .dark)
    let light = HNColors.of(theme, .light)
    return HNAccent(
      fill: HNModePair(dark: dark.action.primary, light: light.action.primary),
      onFill: HNModePair(dark: dark.action.primaryInk, light: light.action.primaryInk),
      text: HNModePair(dark: dark.action.text, light: light.action.text),
      soft: HNModePair(dark: dark.surface.tint, light: light.surface.tint)
    )
  }
}
