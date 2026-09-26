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
