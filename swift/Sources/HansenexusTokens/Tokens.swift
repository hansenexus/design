// @hansenexus/tokens: generated from packages/tokens/tokens/*.json by
// packages/tokens/scripts/swift.ts. Do not edit; run `bun run swift` after a token change.
// Semantic tier only: the raw palette never reaches Swift.

/// Themes, the values of data-theme on the web.
public enum HNTheme: String, CaseIterable, Sendable {
  case hansenexus
  case kommandant
  case portal
  case lexilink

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

  public struct Skeleton: Sendable, Equatable {
    /// The resting placeholder fill
    public let base: HNRGBA
    /// The pulse's far end
    public let highlight: HNRGBA
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

  public struct Terminal: Sendable, Equatable {
    /// The lowest grey that stays 4.5:1
    public let black: HNRGBA
    public let blue: HNRGBA
    public let brightBlack: HNRGBA
    public let brightBlue: HNRGBA
    public let brightCyan: HNRGBA
    public let brightGreen: HNRGBA
    public let brightMagenta: HNRGBA
    public let brightRed: HNRGBA
    public let brightWhite: HNRGBA
    public let brightYellow: HNRGBA
    public let cyan: HNRGBA
    public let green: HNRGBA
    public let magenta: HNRGBA
    public let red: HNRGBA
    public let white: HNRGBA
    public let yellow: HNRGBA
  }

  public let action: Action
  public let brand: Brand
  public let focus: Focus
  public let ink: Ink
  public let line: Line
  public let skeleton: Skeleton
  public let status: Status
  public let surface: Surface
  public let terminal: Terminal

  /// The colours of `theme` in `mode`.
  public static func of(_ theme: HNTheme, _ mode: HNMode) -> HNColors {
    switch (theme, mode) {
    case (.hansenexus, .dark): return hansenexusDark
    case (.hansenexus, .light): return hansenexusLight
    case (.kommandant, .dark): return kommandantDark
    case (.kommandant, .light): return kommandantLight
    case (.portal, .dark): return portalDark
    case (.portal, .light): return portalLight
    case (.lexilink, .dark): return lexilinkDark
    case (.lexilink, .light): return lexilinkLight
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
    skeleton: Skeleton(
      base: HNRGBA(0x3A352C),
      highlight: HNRGBA(0x4A4439)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x8A8273),
      blue: HNRGBA(0x8FB8FF),
      brightBlack: HNRGBA(0xA39C8C),
      brightBlue: HNRGBA(0xBED5FD),
      brightCyan: HNRGBA(0xA3DDE0),
      brightGreen: HNRGBA(0x8BE45F),
      brightMagenta: HNRGBA(0xEFC0E3),
      brightRed: HNRGBA(0xFCB2A5),
      brightWhite: HNRGBA(0xF4F0E6),
      brightYellow: HNRGBA(0xFEC98A),
      cyan: HNRGBA(0x7ABFC3),
      green: HNRGBA(0x42C501),
      magenta: HNRGBA(0xD59CC8),
      red: HNRGBA(0xFF7A66),
      white: HNRGBA(0xCDC6B6),
      yellow: HNRGBA(0xF0A53A)
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
    skeleton: Skeleton(
      base: HNRGBA(0xD8CFBD),
      highlight: HNRGBA(0xCDC6B6)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x16140F),
      blue: HNRGBA(0x1F5FBF),
      brightBlack: HNRGBA(0x4A4439),
      brightBlue: HNRGBA(0x15448C),
      brightCyan: HNRGBA(0x225052),
      brightGreen: HNRGBA(0x1F5500),
      brightMagenta: HNRGBA(0x623659),
      brightRed: HNRGBA(0x86130D),
      brightWhite: HNRGBA(0x716A5C),
      brightYellow: HNRGBA(0x663D07),
      cyan: HNRGBA(0x356E71),
      green: HNRGBA(0x2B7300),
      magenta: HNRGBA(0x834F78),
      red: HNRGBA(0xB3261E),
      white: HNRGBA(0x6B6456),
      yellow: HNRGBA(0x8A5200)
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
    skeleton: Skeleton(
      base: HNRGBA(0x3A352C),
      highlight: HNRGBA(0x4A4439)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x8A8273),
      blue: HNRGBA(0x8FB8FF),
      brightBlack: HNRGBA(0xA39C8C),
      brightBlue: HNRGBA(0xBED5FD),
      brightCyan: HNRGBA(0xA3DDE0),
      brightGreen: HNRGBA(0x8BE45F),
      brightMagenta: HNRGBA(0xEFC0E3),
      brightRed: HNRGBA(0xFCB2A5),
      brightWhite: HNRGBA(0xF4F0E6),
      brightYellow: HNRGBA(0xFEC98A),
      cyan: HNRGBA(0x7ABFC3),
      green: HNRGBA(0x42C501),
      magenta: HNRGBA(0xD59CC8),
      red: HNRGBA(0xFF7A66),
      white: HNRGBA(0xCDC6B6),
      yellow: HNRGBA(0xF0A53A)
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
    skeleton: Skeleton(
      base: HNRGBA(0xD8CFBD),
      highlight: HNRGBA(0xCDC6B6)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x16140F),
      blue: HNRGBA(0x1F5FBF),
      brightBlack: HNRGBA(0x4A4439),
      brightBlue: HNRGBA(0x15448C),
      brightCyan: HNRGBA(0x225052),
      brightGreen: HNRGBA(0x1F5500),
      brightMagenta: HNRGBA(0x623659),
      brightRed: HNRGBA(0x86130D),
      brightWhite: HNRGBA(0x716A5C),
      brightYellow: HNRGBA(0x663D07),
      cyan: HNRGBA(0x356E71),
      green: HNRGBA(0x2B7300),
      magenta: HNRGBA(0x834F78),
      red: HNRGBA(0xB3261E),
      white: HNRGBA(0x6B6456),
      yellow: HNRGBA(0x8A5200)
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
    skeleton: Skeleton(
      base: HNRGBA(0x3A352C),
      highlight: HNRGBA(0x4A4439)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x8A8273),
      blue: HNRGBA(0x8FB8FF),
      brightBlack: HNRGBA(0xA39C8C),
      brightBlue: HNRGBA(0xBED5FD),
      brightCyan: HNRGBA(0xA3DDE0),
      brightGreen: HNRGBA(0x8BE45F),
      brightMagenta: HNRGBA(0xEFC0E3),
      brightRed: HNRGBA(0xFCB2A5),
      brightWhite: HNRGBA(0xF4F0E6),
      brightYellow: HNRGBA(0xFEC98A),
      cyan: HNRGBA(0x7ABFC3),
      green: HNRGBA(0x42C501),
      magenta: HNRGBA(0xD59CC8),
      red: HNRGBA(0xFF7A66),
      white: HNRGBA(0xCDC6B6),
      yellow: HNRGBA(0xF0A53A)
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
    skeleton: Skeleton(
      base: HNRGBA(0xD8CFBD),
      highlight: HNRGBA(0xCDC6B6)
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
    ),
    terminal: Terminal(
      black: HNRGBA(0x16140F),
      blue: HNRGBA(0x1F5FBF),
      brightBlack: HNRGBA(0x4A4439),
      brightBlue: HNRGBA(0x15448C),
      brightCyan: HNRGBA(0x225052),
      brightGreen: HNRGBA(0x1F5500),
      brightMagenta: HNRGBA(0x623659),
      brightRed: HNRGBA(0x86130D),
      brightWhite: HNRGBA(0x716A5C),
      brightYellow: HNRGBA(0x663D07),
      cyan: HNRGBA(0x356E71),
      green: HNRGBA(0x2B7300),
      magenta: HNRGBA(0x834F78),
      red: HNRGBA(0xB3261E),
      white: HNRGBA(0x6B6456),
      yellow: HNRGBA(0x8A5200)
    )
  )

  static let lexilinkDark = HNColors(
    action: Action(
      danger: HNRGBA(0xFF655A),
      dangerInk: HNRGBA(0x070707),
      primary: HNRGBA(0xF3821D),
      primaryHover: HNRGBA(0xF3821D),
      primaryInk: HNRGBA(0x070707),
      text: HNRGBA(0xEFEBE2),
      textHover: HNRGBA(0xEFEBE2)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0xF3821D)
    ),
    ink: Ink(
      body: HNRGBA(0xEFEBE2),
      muted: HNRGBA(0x8F8C85),
      primary: HNRGBA(0xEFEBE2)
    ),
    line: Line(
      strong: HNRGBA(0x8F8C85),
      subtle: HNRGBA(0x47413C)
    ),
    skeleton: Skeleton(
      base: HNRGBA(0x3F3A34),
      highlight: HNRGBA(0x47413C)
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
      band: HNRGBA(0x130F0A),
      card: HNRGBA(0x1C1712),
      page: HNRGBA(0x1C1712),
      raised: HNRGBA(0x1C1712),
      tint: HNRGBA(0x1C1712)
    ),
    terminal: Terminal(
      black: HNRGBA(0x8A8273),
      blue: HNRGBA(0x8FB8FF),
      brightBlack: HNRGBA(0xA39C8C),
      brightBlue: HNRGBA(0xBED5FD),
      brightCyan: HNRGBA(0xA3DDE0),
      brightGreen: HNRGBA(0x8BE45F),
      brightMagenta: HNRGBA(0xEFC0E3),
      brightRed: HNRGBA(0xFCB2A5),
      brightWhite: HNRGBA(0xF4F0E6),
      brightYellow: HNRGBA(0xFEC98A),
      cyan: HNRGBA(0x7ABFC3),
      green: HNRGBA(0x42C501),
      magenta: HNRGBA(0xD59CC8),
      red: HNRGBA(0xFF7A66),
      white: HNRGBA(0xCDC6B6),
      yellow: HNRGBA(0xF0A53A)
    )
  )

  static let lexilinkLight = HNColors(
    action: Action(
      danger: HNRGBA(0xD40C1A),
      dangerInk: HNRGBA(0xFFFFFF),
      primary: HNRGBA(0xF3821D),
      primaryHover: HNRGBA(0xF3821D),
      primaryInk: HNRGBA(0x070707),
      text: HNRGBA(0x070707),
      textHover: HNRGBA(0x070707)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    focus: Focus(
      ring: HNRGBA(0x070707)
    ),
    ink: Ink(
      body: HNRGBA(0x070707),
      muted: HNRGBA(0x717171),
      primary: HNRGBA(0x070707)
    ),
    line: Line(
      strong: HNRGBA(0x070707),
      subtle: HNRGBA(0x070707)
    ),
    skeleton: Skeleton(
      base: HNRGBA(0xDEDEDE),
      highlight: HNRGBA(0xBEBEBE)
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
      band: HNRGBA(0xFFFFFF),
      card: HNRGBA(0xFFFFFF),
      page: HNRGBA(0xFFFFFF),
      raised: HNRGBA(0xFFFFFF),
      tint: HNRGBA(0xFFFFFF)
    ),
    terminal: Terminal(
      black: HNRGBA(0x16140F),
      blue: HNRGBA(0x1F5FBF),
      brightBlack: HNRGBA(0x4A4439),
      brightBlue: HNRGBA(0x15448C),
      brightCyan: HNRGBA(0x225052),
      brightGreen: HNRGBA(0x1F5500),
      brightMagenta: HNRGBA(0x623659),
      brightRed: HNRGBA(0x86130D),
      brightWhite: HNRGBA(0x716A5C),
      brightYellow: HNRGBA(0x663D07),
      cyan: HNRGBA(0x356E71),
      green: HNRGBA(0x2B7300),
      magenta: HNRGBA(0x834F78),
      red: HNRGBA(0xB3261E),
      white: HNRGBA(0x6B6456),
      yellow: HNRGBA(0x8A5200)
    )
  )
}

/// Waits in seconds before a pending indicator shows; faster work shows nothing.
public enum HNDelay {
  /// Wait before a spinner or pending indicator shows; faster work shows nothing
  public static let pending: Double = 0.2
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
public struct HNFontFamily: Sendable, Equatable {
  public let display: [String]
  public let mono: [String]
  public let sans: [String]

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  /// Page titles and big numbers
  public static let display: [String] = ["Fraunces", "Georgia", "serif"]

  /// Hostnames, IPs, tickets, SHAs
  public static let mono: [String] = ["JetBrains Mono", "ui-monospace", "monospace"]

  /// The UI
  public static let sans: [String] = ["Instrument Sans", "system-ui", "sans-serif"]

  /// The theme's own values.
  public static func of(_ theme: HNTheme) -> HNFontFamily {
    switch theme {
    case .hansenexus: return HNFontFamily(display: ["Fraunces", "Georgia", "serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"], sans: ["Instrument Sans", "system-ui", "sans-serif"])
    case .kommandant: return HNFontFamily(display: ["Fraunces", "Georgia", "serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"], sans: ["Instrument Sans", "system-ui", "sans-serif"])
    case .portal: return HNFontFamily(display: ["Fraunces", "Georgia", "serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"], sans: ["Instrument Sans", "system-ui", "sans-serif"])
    case .lexilink: return HNFontFamily(display: ["Archivo", "system-ui", "sans-serif"], mono: ["Geist Mono", "ui-monospace", "monospace"], sans: ["Archivo", "system-ui", "sans-serif"])
    }
  }
}

/// Minimum time in seconds a pending indicator stays once shown.
public enum HNMinVisible {
  /// Once shown, a spinner or pending indicator stays at least this long
  public static let pending: Double = 0.4
}

/// The skeleton pulse, base to highlight and back. Off under Reduce Motion.
public enum HNPulse {
  /// One skeleton pulse, base to highlight and back
  public static let duration: Double = 1.6

  public static let easing: HNCubicBezier = HNCubicBezier(0.4, 0, 0.6, 1)
}

/// Corner radii in points.
public struct HNRadius: Sendable, Equatable {
  public let lg: Double
  public let md: Double
  public let pill: Double
  public let sm: Double
  public let xl: Double

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  public static let lg: Double = 14

  public static let md: Double = 10

  public static let pill: Double = 999

  public static let sm: Double = 6

  public static let xl: Double = 18

  /// The theme's own values.
  public static func of(_ theme: HNTheme) -> HNRadius {
    switch theme {
    case .hansenexus: return HNRadius(lg: 14, md: 10, pill: 999, sm: 6, xl: 18)
    case .kommandant: return HNRadius(lg: 14, md: 10, pill: 999, sm: 6, xl: 18)
    case .portal: return HNRadius(lg: 14, md: 10, pill: 999, sm: 6, xl: 18)
    case .lexilink: return HNRadius(lg: 0, md: 0, pill: 999, sm: 0, xl: 4)
    }
  }
}

public enum HNShadow {
  /// The one neutral lift. No coloured shadows, no glow.
  public static let lift: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)
}

/// The shimmer sweep. Off under Reduce Motion.
public enum HNShimmer {
  /// One shimmer sweep across a skeleton
  public static let duration: Double = 1.8

  public static let easing: HNCubicBezier = HNCubicBezier(0.4, 0, 0.2, 1)
}

/// Row height and minimum target in points, per theme or per density.
public struct HNSize: Sendable, Equatable {
  public let row: Double
  public let target: Double

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  public static let row: Double = 48

  public static let target: Double = 24

  /// The theme's own density.
  public static func of(_ theme: HNTheme) -> HNSize {
    switch theme {
    case .hansenexus: return HNSize(row: 48, target: 24)
    case .kommandant: return HNSize(row: 36, target: 24)
    case .portal: return HNSize(row: 48, target: 24)
    case .lexilink: return HNSize(row: 48, target: 24)
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

/// One spinner turn. Off under Reduce Motion.
public enum HNSpin {
  /// One spinner turn
  public static let duration: Double = 0.8

  /// Linear
  public static let easing: HNCubicBezier = HNCubicBezier(0, 0, 1, 1)
}
