// @hansenexus/tokens: generated from packages/tokens/tokens/*.json by
// packages/tokens/scripts/swift.ts. Do not edit; run `bun run swift` after a token change.
// Semantic tier only: the raw palette never reaches Swift.

/// Themes, the values of data-theme on the web.
public enum HNTheme: String, CaseIterable, Sendable {
  case hansenexus
  case kommandant
  case portal

  public static let `default`: HNTheme = .hansenexus
}

/// Modes, the values of data-mode on the web.
public enum HNMode: String, CaseIterable, Sendable {
  case dark
  case light

  public static let `default`: HNMode = .dark
}

/// Densities, the values of data-density on the web.
public enum HNDensity: String, CaseIterable, Sendable {
  case compact
  case comfortable
  case touch
}

/// Semantic colours of one theme in one mode. Every theme and mode carries the same names.
/// In SwiftUI, `Color.hn(theme)` follows the system appearance instead of a fixed mode.
public struct HNColors: Sendable, Equatable {
  public struct Action: Sendable, Equatable {
    /// Destructive fill (Scale to 2)
    public let danger: HNRGBA
    /// Text on the danger fill
    public let dangerInk: HNRGBA
    /// Primary fill
    public let primary: HNRGBA
    public let primaryHover: HNRGBA
    /// Text on the lime fill
    public let primaryInk: HNRGBA
    /// Links, text actions
    public let text: HNRGBA
    public let textHover: HNRGBA
  }

  public struct Brand: Sendable, Equatable {
    /// Flat ink mark; the app icon ground
    public let ink: HNRGBA
    /// The mark, flat lime
    public let lime: HNRGBA
    /// The mark on light surfaces where lime would fall below 3:1
    public let limeDeep: HNRGBA
    /// Flat paper mark on ink
    public let paper: HNRGBA
  }

  public struct Focus: Sendable, Equatable {
    public let ring: HNRGBA
  }

  public struct Ink: Sendable, Equatable {
    /// gedämpft: running text
    public let body: HNRGBA
    /// leise: labels, meta
    public let muted: HNRGBA
    /// Text: headings
    public let primary: HNRGBA
  }

  public struct Line: Sendable, Equatable {
    /// Rand stark: secondary borders. warm.600 fails 3:1 on band, card and raised.
    public let strong: HNRGBA
    /// Linie: dividers, decoration only
    public let subtle: HNRGBA
  }

  public struct Status: Sendable, Equatable {
    /// open ring
    public let busy: HNRGBA
    /// diamond
    public let crit: HNRGBA
    /// hollow circle. A shape colour only; label text uses ink.muted.
    public let off: HNRGBA
    /// filled dot
    public let ok: HNRGBA
    /// dashed circle
    public let unknown: HNRGBA
    /// triangle
    public let warn: HNRGBA
  }

  public struct Surface: Sendable, Equatable {
    /// Band: rail, alternate sections
    public let band: HNRGBA
    /// Fläche
    public let card: HNRGBA
    /// Grund
    public let page: HNRGBA
    /// Erhöht: chips, active nav
    public let raised: HNRGBA
    /// Tönung: icon ground
    public let tint: HNRGBA
  }

  public let action: Action
  public let brand: Brand
  public let focus: Focus
  public let ink: Ink
  public let line: Line
  public let status: Status
  public let surface: Surface

  /// The colours of `theme` in `mode`.
  public static func of(_ theme: HNTheme, _ mode: HNMode) -> HNColors {
    switch (theme, mode) {
    case (.hansenexus, .dark): return hansenexusDark
    case (.hansenexus, .light): return hansenexusLight
    case (.kommandant, .dark): return kommandantDark
    case (.kommandant, .light): return kommandantLight
    case (.portal, .dark): return portalDark
    case (.portal, .light): return portalLight
    }
  }

  static let hansenexusDark = HNColors(
    action: Action(
      danger: HNRGBA(0xFF7A66),
      dangerInk: HNRGBA(0x16140F),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x42C501),
      textHover: HNRGBA(0x8BE45F)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x42C501)
    ),
    ink: Ink(
      body: HNRGBA(0xCDC6B6),
      muted: HNRGBA(0xA39C8C),
      primary: HNRGBA(0xF4F0E6)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0x3A352C)
    ),
    status: Status(
      busy: HNRGBA(0x8FB8FF),
      crit: HNRGBA(0xFF7A66),
      off: HNRGBA(0x8A8273),
      ok: HNRGBA(0x42C501),
      unknown: HNRGBA(0xA39C8C),
      warn: HNRGBA(0xF0A53A)
    ),
    surface: Surface(
      band: HNRGBA(0x1C1A15),
      card: HNRGBA(0x201D18),
      page: HNRGBA(0x16140F),
      raised: HNRGBA(0x2A2620),
      tint: HNRGBA(0x253515)
    )
  )

  static let hansenexusLight = HNColors(
    action: Action(
      danger: HNRGBA(0xB3261E),
      dangerInk: HNRGBA(0xFBF8F1),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x2B7300),
      textHover: HNRGBA(0x1F5500)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x2B7300)
    ),
    ink: Ink(
      body: HNRGBA(0x3A352C),
      muted: HNRGBA(0x6B6456),
      primary: HNRGBA(0x16140F)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0xD8CFBD)
    ),
    status: Status(
      busy: HNRGBA(0x1F5FBF),
      crit: HNRGBA(0xB3261E),
      off: HNRGBA(0x6B6456),
      ok: HNRGBA(0x2B7300),
      unknown: HNRGBA(0x6B6456),
      warn: HNRGBA(0x8A5200)
    ),
    surface: Surface(
      band: HNRGBA(0xEDE8DC),
      card: HNRGBA(0xFBF8F1),
      page: HNRGBA(0xF4F0E6),
      raised: HNRGBA(0xECE7DC),
      tint: HNRGBA(0xE1ECD0)
    )
  )

  static let kommandantDark = HNColors(
    action: Action(
      danger: HNRGBA(0xFF7A66),
      dangerInk: HNRGBA(0x16140F),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x42C501),
      textHover: HNRGBA(0x8BE45F)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x42C501)
    ),
    ink: Ink(
      body: HNRGBA(0xCDC6B6),
      muted: HNRGBA(0xA39C8C),
      primary: HNRGBA(0xF4F0E6)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0x3A352C)
    ),
    status: Status(
      busy: HNRGBA(0x8FB8FF),
      crit: HNRGBA(0xFF7A66),
      off: HNRGBA(0x8A8273),
      ok: HNRGBA(0x42C501),
      unknown: HNRGBA(0xA39C8C),
      warn: HNRGBA(0xF0A53A)
    ),
    surface: Surface(
      band: HNRGBA(0x1C1A15),
      card: HNRGBA(0x201D18),
      page: HNRGBA(0x16140F),
      raised: HNRGBA(0x2A2620),
      tint: HNRGBA(0x253515)
    )
  )

  static let kommandantLight = HNColors(
    action: Action(
      danger: HNRGBA(0xB3261E),
      dangerInk: HNRGBA(0xFBF8F1),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x2B7300),
      textHover: HNRGBA(0x1F5500)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x2B7300)
    ),
    ink: Ink(
      body: HNRGBA(0x3A352C),
      muted: HNRGBA(0x6B6456),
      primary: HNRGBA(0x16140F)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0xD8CFBD)
    ),
    status: Status(
      busy: HNRGBA(0x1F5FBF),
      crit: HNRGBA(0xB3261E),
      off: HNRGBA(0x6B6456),
      ok: HNRGBA(0x2B7300),
      unknown: HNRGBA(0x6B6456),
      warn: HNRGBA(0x8A5200)
    ),
    surface: Surface(
      band: HNRGBA(0xEDE8DC),
      card: HNRGBA(0xFBF8F1),
      page: HNRGBA(0xF4F0E6),
      raised: HNRGBA(0xECE7DC),
      tint: HNRGBA(0xE1ECD0)
    )
  )

  static let portalDark = HNColors(
    action: Action(
      danger: HNRGBA(0xFF7A66),
      dangerInk: HNRGBA(0x16140F),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x42C501),
      textHover: HNRGBA(0x8BE45F)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x42C501)
    ),
    ink: Ink(
      body: HNRGBA(0xCDC6B6),
      muted: HNRGBA(0xA39C8C),
      primary: HNRGBA(0xF4F0E6)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0x3A352C)
    ),
    status: Status(
      busy: HNRGBA(0x8FB8FF),
      crit: HNRGBA(0xFF7A66),
      off: HNRGBA(0x8A8273),
      ok: HNRGBA(0x42C501),
      unknown: HNRGBA(0xA39C8C),
      warn: HNRGBA(0xF0A53A)
    ),
    surface: Surface(
      band: HNRGBA(0x1C1A15),
      card: HNRGBA(0x201D18),
      page: HNRGBA(0x16140F),
      raised: HNRGBA(0x2A2620),
      tint: HNRGBA(0x253515)
    )
  )

  static let portalLight = HNColors(
    action: Action(
      danger: HNRGBA(0xB3261E),
      dangerInk: HNRGBA(0xFBF8F1),
      primary: HNRGBA(0x42C501),
      primaryHover: HNRGBA(0x8BE45F),
      primaryInk: HNRGBA(0x16140F),
      text: HNRGBA(0x2B7300),
      textHover: HNRGBA(0x1F5500)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x2B7300)
    ),
    ink: Ink(
      body: HNRGBA(0x3A352C),
      muted: HNRGBA(0x6B6456),
      primary: HNRGBA(0x16140F)
    ),
    line: Line(
      strong: HNRGBA(0x8A8273),
      subtle: HNRGBA(0xD8CFBD)
    ),
    status: Status(
      busy: HNRGBA(0x1F5FBF),
      crit: HNRGBA(0xB3261E),
      off: HNRGBA(0x6B6456),
      ok: HNRGBA(0x2B7300),
      unknown: HNRGBA(0x6B6456),
      warn: HNRGBA(0x8A5200)
    ),
    surface: Surface(
      band: HNRGBA(0xEDE8DC),
      card: HNRGBA(0xFBF8F1),
      page: HNRGBA(0xF4F0E6),
      raised: HNRGBA(0xECE7DC),
      tint: HNRGBA(0xE1ECD0)
    )
  )
}

/// Animation durations in seconds. Motion only on real events.
public enum HNDuration {
  /// panels, inspector, palette
  public static let base: Double = 0.2

  /// hover, press, toggles
  public static let fast: Double = 0.12

  /// route change, confirm sheet
  public static let slow: Double = 0.32
}

/// Focus ring geometry in points. The ring colour is `HNColors.focus.ring`.
public enum HNFocus {
  public static let offset: Double = 2

  public static let width: Double = 2
}

/// Font family stacks, first choice first. `Font.hn` in SwiftUI resolves them.
public enum HNFontFamily {
  /// Page titles and big numbers
  public static let display: [String] = ["Fraunces", "Georgia", "serif"]

  /// Hostnames, IPs, tickets, SHAs
  public static let mono: [String] = ["JetBrains Mono", "ui-monospace", "monospace"]

  /// The UI
  public static let sans: [String] = ["Instrument Sans", "system-ui", "sans-serif"]
}

/// Corner radii in points.
public enum HNRadius {
  public static let lg: Double = 14

  public static let md: Double = 10

  public static let pill: Double = 999

  public static let sm: Double = 6

  public static let xl: Double = 18
}

public enum HNShadow {
  /// The one neutral lift. No coloured shadows, no glow.
  public static let lift: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)
}

/// Row height and minimum target in points, per theme or per density.
public struct HNSize: Sendable, Equatable {
  public let row: Double
  public let target: Double

  /// The theme's own density.
  public static func of(_ theme: HNTheme) -> HNSize {
    switch theme {
    case .hansenexus: return HNSize(row: 48, target: 24)
    case .kommandant: return HNSize(row: 36, target: 24)
    case .portal: return HNSize(row: 48, target: 24)
    }
  }

  /// A density chosen over the theme's, like data-density on the web.
  public static func of(_ density: HNDensity) -> HNSize {
    switch density {
    case .compact: return HNSize(row: 36, target: 24)
    case .comfortable: return HNSize(row: 48, target: 24)
    case .touch: return HNSize(row: 56, target: 44)
    }
  }
}

/// Spacing scale in points (1 CSS px is 1 pt). `s4` is `--hn-space-4`.
public enum HNSpace {
  public static let s1: Double = 4

  public static let s2: Double = 8

  public static let s3: Double = 12

  public static let s4: Double = 16

  public static let s6: Double = 24

  public static let s8: Double = 32

  public static let s12: Double = 48
}
