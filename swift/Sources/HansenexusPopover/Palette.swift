// The accent environment value and the neutral colours of the popover. Content stays flat:
// no Material, glass, glow or gradient here; the popover background is the system's.
#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import HansenexusTokens
import SwiftUI

private struct HNAccentKey: EnvironmentKey {
  static let defaultValue = HNAccent.brand
}

extension EnvironmentValues {
  /// The accent the popover components draw with; `HNAccent.brand` unless set.
  public var hnAccent: HNAccent {
    get { self[HNAccentKey.self] }
    set { self[HNAccentKey.self] = newValue }
  }
}

extension View {
  /// Sets the accent of every popover component inside this view.
  public func hnAccent(_ accent: HNAccent) -> some View {
    environment(\.hnAccent, accent)
  }
}

extension HNMode {
  /// The token mode of a SwiftUI colour scheme.
  public init(_ scheme: ColorScheme) {
    self = scheme == .light ? .light : .dark
  }
}

extension HNModePair {
  /// The value for `scheme`, as a SwiftUI colour.
  public func color(_ scheme: ColorScheme) -> Color {
    Color(hn: self[HNMode(scheme)])
  }
}

/// The colours of the popover that do not change per app. The accent is `HNAccent`.
public enum PopoverPalette {
  /// Stop, Disconnect and errors: `action.danger`.
  public static let danger = Color.hn().action.danger
  /// Text and symbols on `danger`: `action.dangerInk`.
  public static let onDanger = Color.hn().action.dangerInk
  /// `status.ok`.
  public static let ok = Color.hn().status.ok

  /// The recessed tint behind pop-up buttons, quiet pills and neutral chips.
  public static func well(_ scheme: ColorScheme) -> Color {
    scheme == .dark ? Color.white.opacity(0.07) : Color(hn: ink(scheme)).opacity(0.05)
  }

  /// The lifted card: a touch lighter than the popover behind it in dark mode, whiter in light.
  public static func card(_ scheme: ColorScheme) -> Color {
    scheme == .dark ? Color.white.opacity(0.055) : Color.white.opacity(0.55)
  }

  /// The edge of cards and tiles.
  public static func hairline(_ scheme: ColorScheme) -> Color {
    scheme == .dark ? Color.white.opacity(0.08) : Color(hn: ink(scheme)).opacity(0.10)
  }

  private static func ink(_ scheme: ColorScheme) -> HNRGBA {
    HNColors.of(.default, HNMode(scheme)).ink.primary
  }
}
#endif
