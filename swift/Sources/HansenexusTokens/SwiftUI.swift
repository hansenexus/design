// SwiftUI adapters: colours that follow the system appearance, fonts from the family
// stacks. Content stays flat: no Material, glass, glow or gradient here. Glass on the
// Apple client is only the system material of window chrome, which the OS draws.
#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import SwiftUI

#if os(iOS)
import UIKit
#else
import AppKit
#endif

extension Color {
  /// A colour fixed to one mode, e.g. for a chart that renders both.
  public init(hn value: HNRGBA) {
    let c = value.components
    self.init(.sRGB, red: c.red, green: c.green, blue: c.blue, opacity: c.opacity)
  }

  /// The semantic colours of `theme`, following the system appearance:
  /// `Color.hn(.kommandant).surface.page`, `Color.hn().status.crit`.
  public static func hn(_ theme: HNTheme = .default) -> HNColorPalette {
    HNColorPalette(theme: theme)
  }
}

/// Entry point of `Color.hn(theme)`: pick a group, then a token.
@dynamicMemberLookup
public struct HNColorPalette: Sendable {
  public let theme: HNTheme

  public subscript<Group>(dynamicMember group: KeyPath<HNColors, Group>) -> HNColorGroup<Group> {
    HNColorGroup(theme: theme, group: group)
  }
}

/// One colour group of `Color.hn(theme)`; each token reads as an adaptive `Color`.
@dynamicMemberLookup
public struct HNColorGroup<Group> {
  let theme: HNTheme
  let group: KeyPath<HNColors, Group>

  public subscript(dynamicMember token: KeyPath<Group, HNRGBA>) -> Color {
    Color.hnAdaptive(group.appending(path: token), theme: theme)
  }
}

extension Color {
  /// The token at `path` in `theme`: the light value under a light appearance, the dark
  /// value otherwise (dark is the default mode, as on the web).
  public static func hnAdaptive(_ path: KeyPath<HNColors, HNRGBA>, theme: HNTheme = .default)
    -> Color
  {
    let dark = HNColors.of(theme, .dark)[keyPath: path].components
    let light = HNColors.of(theme, .light)[keyPath: path].components
    #if os(iOS)
    return Color(uiColor: UIColor { traits in
      let c = traits.userInterfaceStyle == .light ? light : dark
      return UIColor(red: c.red, green: c.green, blue: c.blue, alpha: c.opacity)
    })
    #else
    return Color(nsColor: NSColor(name: nil) { appearance in
      let isLight = appearance.bestMatch(from: [.darkAqua, .aqua]) == .aqua
      let c = isLight ? light : dark
      return NSColor(srgbRed: c.red, green: c.green, blue: c.blue, alpha: c.opacity)
    })
    #endif
  }
}

extension Font {
  /// Display face (Fraunces): page titles and big numbers.
  public static func hnDisplay(size: CGFloat, relativeTo style: Font.TextStyle = .largeTitle)
    -> Font
  {
    hn(HNFontFamily.display, size: size, relativeTo: style)
  }

  /// UI face (Instrument Sans).
  public static func hnSans(size: CGFloat, relativeTo style: Font.TextStyle = .body) -> Font {
    hn(HNFontFamily.sans, size: size, relativeTo: style)
  }

  /// Mono face (JetBrains Mono): hostnames, IPs, tickets, SHAs.
  public static func hnMono(size: CGFloat, relativeTo style: Font.TextStyle = .body) -> Font {
    hn(HNFontFamily.mono, size: size, relativeTo: style)
  }

  /// The first installed family of `stack` at `size`, scaling with Dynamic Type relative to
  /// `style`. The package bundles no font files: the app registers them. When none is
  /// installed, the stack's generic family picks the system design (serif, monospaced,
  /// default).
  public static func hn(_ stack: [String], size: CGFloat, relativeTo style: Font.TextStyle = .body)
    -> Font
  {
    let installed = HNFontStack.installedFamilies()
    if let family = stack.first(where: { installed.contains($0) }) {
      return .custom(family, size: size, relativeTo: style)
    }
    return .system(size: size, design: HNFontStack.design(for: stack))
  }

  /// A role of the type scale, the twin of `text-hn-<role>` on the web: `Font.hn(.body)`,
  /// `Font.hn(.meta, theme: .kommandant, family: HNFontFamily.mono)`. Size and weight come from
  /// `HNTypeScale.of(theme)`; `weight` overrides the role's. The size scales with Dynamic Type
  /// relative to the role's `textStyle`. Line height is not part of a SwiftUI `Font`: apply
  /// `.lineSpacing(style.lineSpacing)` where running text needs it.
  public static func hn(
    _ role: HNTextRole, theme: HNTheme = .default, family: [String] = HNFontFamily.sans,
    weight: Font.Weight? = nil
  ) -> Font {
    let style = HNTypeScale.of(theme)[role]
    return hn(family, size: style.size, relativeTo: role.textStyle)
      .weight(weight ?? Font.Weight(hnCSS: style.weight))
  }
}

extension HNTextRole {
  /// The system text style a role scales with under Dynamic Type.
  public var textStyle: Font.TextStyle {
    switch self {
    case .caption: .caption2
    case .meta: .caption
    case .bodySm: .footnote
    case .body: .body
    case .title: .headline
    case .heading: .title3
    case .display: .largeTitle
    }
  }
}

extension Font.Weight {
  /// The SwiftUI weight of a CSS font-weight number, rounded to the nearest hundred.
  public init(hnCSS weight: Int) {
    switch (weight + 50) / 100 {
    case ...1: self = .ultraLight
    case 2: self = .thin
    case 3: self = .light
    case 4: self = .regular
    case 5: self = .medium
    case 6: self = .semibold
    case 7: self = .bold
    case 8: self = .heavy
    default: self = .black
    }
  }
}

enum HNFontStack {
  static func installedFamilies() -> Set<String> {
    #if os(iOS)
    return Set(UIFont.familyNames)
    #else
    return Set(NSFontManager.shared.availableFontFamilies)
    #endif
  }

  static func design(for stack: [String]) -> Font.Design {
    if stack.contains(where: { $0 == "monospace" || $0 == "ui-monospace" }) { return .monospaced }
    if stack.contains("serif") { return .serif }
    return .default
  }
}
#endif
