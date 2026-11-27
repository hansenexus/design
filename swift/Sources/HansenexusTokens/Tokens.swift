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

  public struct Chart: Sendable, Equatable {
    public let series1: HNRGBA
    public let series2: HNRGBA
    public let series3: HNRGBA
    public let series4: HNRGBA
    public let series5: HNRGBA
    public let series6: HNRGBA
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

  public struct Nav: Sendable, Equatable {
    /// Fill of the active rail row
    public let active: HNRGBA
    /// Icon of the active rail row
    public let activeIcon: HNRGBA
    /// Text of the active rail row
    public let activeInk: HNRGBA
    /// Trailing meta (a count, a Kbd) of the active rail row
    public let activeMeta: HNRGBA
    /// Fill of the active phone tab
    public let tab: HNRGBA
    /// Text of the active phone tab
    public let tabInk: HNRGBA
  }

  public struct Panel: Sendable, Equatable {
    /// The main panel's fill
    public let main: HNRGBA
  }

  public struct Rail: Sendable, Equatable {
    /// Rail labels, active item
    public let ink: HNRGBA
    /// Rail dividers, decoration only
    public let line: HNRGBA
    /// Rail meta, inactive item
    public let muted: HNRGBA
    public let statusBusy: HNRGBA
    public let statusCrit: HNRGBA
    /// Status shapes on the rail
    public let statusOk: HNRGBA
    public let statusWarn: HNRGBA
  }

  public struct Scrollbar: Sendable, Equatable {
    /// The resting thumb; 3:1 on every surface
    public let thumb: HNRGBA
    /// The thumb under the pointer or while dragged
    public let thumbHover: HNRGBA
    /// Clear, so the bar sits on its container's own surface
    public let track: HNRGBA
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
    /// The rail: ink in both modes
    public let rail: HNRGBA
    /// Erhöht: chips, active nav
    public let raised: HNRGBA
    /// Tönung: icon ground
    public let tint: HNRGBA
  }

  public struct Terminal: Sendable, Equatable {
    /// The lowest grey that stays 4.5:1 on surface.card
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
  public let chart: Chart
  public let focus: Focus
  public let ink: Ink
  public let line: Line
  public let nav: Nav
  public let panel: Panel
  public let rail: Rail
  public let scrollbar: Scrollbar
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
    chart: Chart(
      series1: HNRGBA(0x42C501),
      series2: HNRGBA(0x8FB8FF),
      series3: HNRGBA(0xF0A53A),
      series4: HNRGBA(0xD59CC8),
      series5: HNRGBA(0x7ABFC3),
      series6: HNRGBA(0xFF7A66)
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
    nav: Nav(
      active: HNRGBA(0x2A2620),
      activeIcon: HNRGBA(0x42C501),
      activeInk: HNRGBA(0xF4F0E6),
      activeMeta: HNRGBA(0xA39C8C),
      tab: HNRGBA(0x201D18),
      tabInk: HNRGBA(0x42C501)
    ),
    panel: Panel(
      main: HNRGBA(0x201D18)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8A8273),
      thumbHover: HNRGBA(0xA39C8C),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
      raised: HNRGBA(0x2A2620),
      tint: HNRGBA(0x253515)
    ),
    terminal: Terminal(
      black: HNRGBA(0x8F8778),
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
    chart: Chart(
      series1: HNRGBA(0x2B7300),
      series2: HNRGBA(0x1F5FBF),
      series3: HNRGBA(0x8A5200),
      series4: HNRGBA(0x834F78),
      series5: HNRGBA(0x356E71),
      series6: HNRGBA(0xB3261E)
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
    nav: Nav(
      active: HNRGBA(0xECE7DC),
      activeIcon: HNRGBA(0x2B7300),
      activeInk: HNRGBA(0x16140F),
      activeMeta: HNRGBA(0x6B6456),
      tab: HNRGBA(0xFBF8F1),
      tabInk: HNRGBA(0x2B7300)
    ),
    panel: Panel(
      main: HNRGBA(0xFBF8F1)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8A8273),
      thumbHover: HNRGBA(0x6B6456),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
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
      text: HNRGBA(0x8BE45F),
      textHover: HNRGBA(0xB0ED92)
    ),
    brand: Brand(
      ink: HNRGBA(0x16140F),
      lime: HNRGBA(0x42C501),
      limeDeep: HNRGBA(0x2B7300),
      paper: HNRGBA(0xF4F0E6)
    ),
    chart: Chart(
      series1: HNRGBA(0x42C501),
      series2: HNRGBA(0x8FB8FF),
      series3: HNRGBA(0xF0A53A),
      series4: HNRGBA(0xD59CC8),
      series5: HNRGBA(0x7ABFC3),
      series6: HNRGBA(0xFF7A66)
    ),
    focus: Focus(
      ring: HNRGBA(0x42C501)
    ),
    ink: Ink(
      body: HNRGBA(0xD8D2C4),
      muted: HNRGBA(0x9A927F),
      primary: HNRGBA(0xF4F0E6)
    ),
    line: Line(
      strong: HNRGBA(0x746B56),
      subtle: HNRGBA(0x353125)
    ),
    nav: Nav(
      active: HNRGBA(0x262218),
      activeIcon: HNRGBA(0x8BE45F),
      activeInk: HNRGBA(0xF4F0E6),
      activeMeta: HNRGBA(0x9A927F),
      tab: HNRGBA(0x1B1912),
      tabInk: HNRGBA(0x8BE45F)
    ),
    panel: Panel(
      main: HNRGBA(0x1B1912)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x353125),
      muted: HNRGBA(0x9A927F),
      statusBusy: HNRGBA(0x6EA0FF),
      statusCrit: HNRGBA(0xFF6B5E),
      statusOk: HNRGBA(0x8BE45F),
      statusWarn: HNRGBA(0xE0A04A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x746B56),
      thumbHover: HNRGBA(0x9A927F),
      track: HNRGBA(0x000000, alpha: 0x00)
    ),
    skeleton: Skeleton(
      base: HNRGBA(0x3A352C),
      highlight: HNRGBA(0x4A4439)
    ),
    status: Status(
      busy: HNRGBA(0x6EA0FF),
      crit: HNRGBA(0xFF6B5E),
      off: HNRGBA(0x7A7262),
      ok: HNRGBA(0x8BE45F),
      unknown: HNRGBA(0xA39C8C),
      warn: HNRGBA(0xE0A04A)
    ),
    surface: Surface(
      band: HNRGBA(0x1F1C14),
      card: HNRGBA(0x1B1912),
      page: HNRGBA(0x121109),
      rail: HNRGBA(0x1F1C14),
      raised: HNRGBA(0x262218),
      tint: HNRGBA(0x1F2A12)
    ),
    terminal: Terminal(
      black: HNRGBA(0x8F8778),
      blue: HNRGBA(0x6EA0FF),
      brightBlack: HNRGBA(0xA39C8C),
      brightBlue: HNRGBA(0xBED5FD),
      brightCyan: HNRGBA(0xA3DDE0),
      brightGreen: HNRGBA(0x8BE45F),
      brightMagenta: HNRGBA(0xEFC0E3),
      brightRed: HNRGBA(0xFCB2A5),
      brightWhite: HNRGBA(0xF4F0E6),
      brightYellow: HNRGBA(0xFEC98A),
      cyan: HNRGBA(0x7ABFC3),
      green: HNRGBA(0x8BE45F),
      magenta: HNRGBA(0xD59CC8),
      red: HNRGBA(0xFF6B5E),
      white: HNRGBA(0xCDC6B6),
      yellow: HNRGBA(0xE0A04A)
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
    chart: Chart(
      series1: HNRGBA(0x2B7300),
      series2: HNRGBA(0x1F5FBF),
      series3: HNRGBA(0x8A5200),
      series4: HNRGBA(0x834F78),
      series5: HNRGBA(0x356E71),
      series6: HNRGBA(0xB3261E)
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
    nav: Nav(
      active: HNRGBA(0xECE7DC),
      activeIcon: HNRGBA(0x2B7300),
      activeInk: HNRGBA(0x16140F),
      activeMeta: HNRGBA(0x6B6456),
      tab: HNRGBA(0xFBF8F1),
      tabInk: HNRGBA(0x2B7300)
    ),
    panel: Panel(
      main: HNRGBA(0xFBF8F1)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x353125),
      muted: HNRGBA(0x9A927F),
      statusBusy: HNRGBA(0x6EA0FF),
      statusCrit: HNRGBA(0xFF6B5E),
      statusOk: HNRGBA(0x8BE45F),
      statusWarn: HNRGBA(0xE0A04A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8A8273),
      thumbHover: HNRGBA(0x6B6456),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1F1C14),
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
    chart: Chart(
      series1: HNRGBA(0x42C501),
      series2: HNRGBA(0x8FB8FF),
      series3: HNRGBA(0xF0A53A),
      series4: HNRGBA(0xD59CC8),
      series5: HNRGBA(0x7ABFC3),
      series6: HNRGBA(0xFF7A66)
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
    nav: Nav(
      active: HNRGBA(0x2A2620),
      activeIcon: HNRGBA(0x42C501),
      activeInk: HNRGBA(0xF4F0E6),
      activeMeta: HNRGBA(0xA39C8C),
      tab: HNRGBA(0x201D18),
      tabInk: HNRGBA(0x42C501)
    ),
    panel: Panel(
      main: HNRGBA(0x201D18)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8A8273),
      thumbHover: HNRGBA(0xA39C8C),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
      raised: HNRGBA(0x2A2620),
      tint: HNRGBA(0x253515)
    ),
    terminal: Terminal(
      black: HNRGBA(0x8F8778),
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
    chart: Chart(
      series1: HNRGBA(0x2B7300),
      series2: HNRGBA(0x1F5FBF),
      series3: HNRGBA(0x8A5200),
      series4: HNRGBA(0x834F78),
      series5: HNRGBA(0x356E71),
      series6: HNRGBA(0xB3261E)
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
    nav: Nav(
      active: HNRGBA(0xECE7DC),
      activeIcon: HNRGBA(0x2B7300),
      activeInk: HNRGBA(0x16140F),
      activeMeta: HNRGBA(0x6B6456),
      tab: HNRGBA(0xFBF8F1),
      tabInk: HNRGBA(0x2B7300)
    ),
    panel: Panel(
      main: HNRGBA(0xFBF8F1)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8A8273),
      thumbHover: HNRGBA(0x6B6456),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
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
    chart: Chart(
      series1: HNRGBA(0x42C501),
      series2: HNRGBA(0x8FB8FF),
      series3: HNRGBA(0xF0A53A),
      series4: HNRGBA(0xD59CC8),
      series5: HNRGBA(0x7ABFC3),
      series6: HNRGBA(0xFF7A66)
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
    nav: Nav(
      active: HNRGBA(0x1C1712),
      activeIcon: HNRGBA(0xEFEBE2),
      activeInk: HNRGBA(0xEFEBE2),
      activeMeta: HNRGBA(0x8F8C85),
      tab: HNRGBA(0x1C1712),
      tabInk: HNRGBA(0xEFEBE2)
    ),
    panel: Panel(
      main: HNRGBA(0x1C1712)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x8F8C85),
      thumbHover: HNRGBA(0xEFEBE2),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
      raised: HNRGBA(0x1C1712),
      tint: HNRGBA(0x1C1712)
    ),
    terminal: Terminal(
      black: HNRGBA(0x8F8778),
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
    chart: Chart(
      series1: HNRGBA(0x2B7300),
      series2: HNRGBA(0x1F5FBF),
      series3: HNRGBA(0x8A5200),
      series4: HNRGBA(0x834F78),
      series5: HNRGBA(0x356E71),
      series6: HNRGBA(0xB3261E)
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
    nav: Nav(
      active: HNRGBA(0xFFFFFF),
      activeIcon: HNRGBA(0x070707),
      activeInk: HNRGBA(0x070707),
      activeMeta: HNRGBA(0x717171),
      tab: HNRGBA(0xFFFFFF),
      tabInk: HNRGBA(0x070707)
    ),
    panel: Panel(
      main: HNRGBA(0xFFFFFF)
    ),
    rail: Rail(
      ink: HNRGBA(0xF4F0E6),
      line: HNRGBA(0x3A352C),
      muted: HNRGBA(0xA39C8C),
      statusBusy: HNRGBA(0x8FB8FF),
      statusCrit: HNRGBA(0xFF7A66),
      statusOk: HNRGBA(0x42C501),
      statusWarn: HNRGBA(0xF0A53A)
    ),
    scrollbar: Scrollbar(
      thumb: HNRGBA(0x070707),
      thumbHover: HNRGBA(0x717171),
      track: HNRGBA(0x000000, alpha: 0x00)
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
      rail: HNRGBA(0x1C1A15),
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

/// Line width in points, the border.width recipe.
public enum HNBorder {
  /// Outline of a card, accordion, table, popover, menu, select list, toast, dialog and the command palette
  public static let frame: Double = 1

  public static let width: Double = 1
}

/// Control shape as corner radii in points, the control recipe.
public struct HNControl: Sendable, Equatable {
  public let bar: Double
  public let box: Double
  public let button: Double
  public let card: Double
  public let chip: Double
  public let dialog: Double
  public let dot: Double
  public let field: Double
  public let item: Double
  public let overlay: Double

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  /// Progress and meter tracks
  public static let bar: Double = 3

  /// Checkbox
  public static let box: Double = 6

  /// Button sm to lg and its icon sizes, Toggle, ToggleGroup ends, Pagination
  public static let button: Double = 10

  /// Card, Accordion, Table frame, KpiCard
  public static let card: Double = 14

  /// Badge and status badge
  public static let chip: Double = 999

  /// Dialog, AlertDialog, the command palette, the sheet's free edge
  public static let dialog: Double = 18

  /// Radio, switch track and thumb, slider track and thumb, menu radio dot, scroll thumb, sheet grabber, usage bar
  public static let dot: Double = 999

  /// Input, Textarea, Select trigger, Combobox input, DatePicker trigger
  public static let field: Double = 10

  /// Button xs, rows in menus, selects, comboboxes and the command palette, small close buttons
  public static let item: Double = 6

  /// Popover, menu, select list, toast
  public static let overlay: Double = 14

  /// The theme's own values.
  public static func of(_ theme: HNTheme) -> HNControl {
    switch theme {
    case .hansenexus: return HNControl(bar: 3, box: 6, button: 10, card: 14, chip: 999, dialog: 18, dot: 999, field: 10, item: 6, overlay: 14)
    case .kommandant: return HNControl(bar: 3, box: 6, button: 10, card: 14, chip: 999, dialog: 18, dot: 999, field: 10, item: 6, overlay: 14)
    case .portal: return HNControl(bar: 3, box: 6, button: 10, card: 14, chip: 999, dialog: 18, dot: 999, field: 10, item: 6, overlay: 14)
    case .lexilink: return HNControl(bar: 3, box: 0, button: 0, card: 0, chip: 999, dialog: 4, dot: 999, field: 0, item: 0, overlay: 0)
    }
  }
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

/// What lifts off the page, the elevation recipe: thumb, overlays, shell panels.
public enum HNElevation {
  /// Menus, popovers, selects, tooltips, toasts, dialogs, sheets, the command palette
  public static let overlay: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)

  /// The shell's floating panels
  public static let panel: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)

  /// A control that sits on its track: the slider thumb
  public static let raised: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)
}

/// Choreography: one element draws the eye. Off under Reduce Motion.
public enum HNEmphasis {
  /// Choreography: one element draws the eye, a changed value, a fresh row
  public static let duration: Double = 0.32

  /// Out to the peak and back
  public static let easing: HNCubicBezier = HNCubicBezier(0.2, 0, 0, 1)
}

/// Choreography: something arrives. Off under Reduce Motion.
public enum HNEnter {
  /// Choreography: something arrives, a panel, a sheet, a row
  public static let duration: Double = 0.2

  /// Decelerate: arrives fast, settles
  public static let easing: HNCubicBezier = HNCubicBezier(0, 0, 0.2, 1)
}

/// Choreography: something leaves, shorter than enter. Off under Reduce Motion.
public enum HNExit {
  /// Choreography: something leaves; shorter than enter
  public static let duration: Double = 0.15

  /// Accelerate: eases off, then goes
  public static let easing: HNCubicBezier = HNCubicBezier(0.4, 0, 1, 1)
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
    case .kommandant: return HNFontFamily(display: ["Instrument Sans", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "ui-monospace", "monospace"], sans: ["Instrument Sans", "system-ui", "sans-serif"])
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

/// Scrollbar thickness in points, the scrollbar recipe. The colours are `HNColors.scrollbar`.
public enum HNScrollbar {
  /// Bar thickness where a browser lacks scrollbar-width and draws ::-webkit-scrollbar
  public static let size: Double = 8
}

public enum HNShadow {
  /// The one neutral lift. No coloured shadows, no glow.
  public static let lift: HNShadowValue = HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30, blur: 60, spread: -30)
}

/// The shell layout in points, the shell recipe: insets, gaps, column widths, rail rows.
public struct HNShell: Sendable, Equatable {
  public let brandRow: Double
  public let context: Double
  public let gap: Double
  public let inset: Double
  public let navDivider: Double
  public let navGap: Double
  public let navInset: Double
  public let navPad: Double
  public let navRadius: Double
  public let navRow: Double
  public let radius: Double
  public let rail: Double
  public let seam: Double

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  /// Height of the brand row at the head of the rail
  public static let brandRow: Double = 32

  /// Width of the context pane from 1024 px of shell width
  public static let context: Double = 288

  /// Space between panels
  public static let gap: Double = 12

  /// Space between the shell's edge and its panels
  public static let inset: Double = 12

  /// Line under the brand, each rail row and each phone tab, in line.subtle; 0 draws none
  public static let navDivider: Double = 0

  /// Space between rail rows
  public static let navGap: Double = 4

  /// Padding of the nav column, and the space under the brand
  public static let navInset: Double = 12

  /// Inline padding of a rail row
  public static let navPad: Double = 12

  /// Corner of a rail row
  public static let navRadius: Double = 6

  /// Height of a rail row (RailItem); never below size.target
  public static let navRow: Double = 32

  /// Corner of a panel
  public static let radius: Double = 14

  /// Width of the nav column from 768 px of shell width
  public static let rail: Double = 208

  /// How far neighbouring panels overlap: their border width for one shared line when gap is 0
  public static let seam: Double = 0

  /// The theme's own values.
  public static func of(_ theme: HNTheme) -> HNShell {
    switch theme {
    case .hansenexus: return HNShell(brandRow: 32, context: 288, gap: 12, inset: 12, navDivider: 0, navGap: 4, navInset: 12, navPad: 12, navRadius: 6, navRow: 32, radius: 14, rail: 208, seam: 0)
    case .kommandant: return HNShell(brandRow: 32, context: 288, gap: 12, inset: 12, navDivider: 0, navGap: 4, navInset: 12, navPad: 12, navRadius: 6, navRow: 32, radius: 14, rail: 208, seam: 0)
    case .portal: return HNShell(brandRow: 32, context: 288, gap: 12, inset: 12, navDivider: 0, navGap: 4, navInset: 12, navPad: 12, navRadius: 6, navRow: 32, radius: 14, rail: 208, seam: 0)
    case .lexilink: return HNShell(brandRow: 32, context: 288, gap: 12, inset: 12, navDivider: 0, navGap: 4, navInset: 12, navPad: 12, navRadius: 0, navRow: 32, radius: 0, rail: 208, seam: 0)
    }
  }
}

/// The shimmer sweep. Off under Reduce Motion.
public enum HNShimmer {
  /// One shimmer sweep across a skeleton
  public static let duration: Double = 1.8

  public static let easing: HNCubicBezier = HNCubicBezier(0.4, 0, 0.2, 1)
}

/// Row height and minimum target in points, per theme or per density.
public struct HNSize: Sendable, Equatable {
  public let controlLg: Double
  public let controlMd: Double
  public let controlPadLg: Double
  public let controlPadMd: Double
  public let controlPadSm: Double
  public let controlPadXs: Double
  public let controlSm: Double
  public let controlXs: Double
  public let field: Double
  public let fieldPad: Double
  public let row: Double
  public let target: Double

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  /// Height of a large control: Button lg and icon-lg
  public static let controlLg: Double = 48

  /// Height of a control: Button md and icon, Select trigger, Toggle
  public static let controlMd: Double = 36

  /// Inline padding of a large control
  public static let controlPadLg: Double = 16

  /// Inline padding of a control
  public static let controlPadMd: Double = 14

  /// Inline padding of a small control
  public static let controlPadSm: Double = 12

  /// Inline padding of an xs control
  public static let controlPadXs: Double = 8

  /// Height of a small control: Button sm and icon-sm
  public static let controlSm: Double = 32

  /// Height of an xs control: Button xs and icon-xs
  public static let controlXs: Double = 24

  /// Height of a text field: Input, Combobox, DatePicker trigger
  public static let field: Double = 40

  /// Inline padding of a text field, Textarea and Select trigger
  public static let fieldPad: Double = 12

  public static let row: Double = 48

  public static let target: Double = 24

  /// The theme's own density.
  public static func of(_ theme: HNTheme) -> HNSize {
    switch theme {
    case .hansenexus: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 48, target: 24)
    case .kommandant: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 36, target: 24)
    case .portal: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 48, target: 24)
    case .lexilink: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 48, target: 24)
    }
  }

  /// A density chosen over the theme's, like data-density on the web.
  public static func of(_ density: HNDensity) -> HNSize {
    switch density {
    case .compact: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 36, target: 24)
    case .comfortable: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 48, target: 24)
    case .touch: return HNSize(controlLg: 48, controlMd: 36, controlPadLg: 16, controlPadMd: 14, controlPadSm: 12, controlPadXs: 8, controlSm: 32, controlXs: 24, field: 40, fieldPad: 12, row: 56, target: 44)
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

/// Choreography: the step in seconds between siblings that enter one after another.
public enum HNStagger {
  /// Choreography: between siblings that enter one after another
  public static let step: Double = 0.04
}

/// Type scale per theme: size, line height (points) and weight per role. `Font.hn(.body)` in SwiftUI reads it.
public struct HNTypeScale: Sendable, Equatable {
  public let body: HNTextStyle
  public let bodySm: HNTextStyle
  public let caption: HNTextStyle
  public let controlLg: HNTextStyle
  public let controlMd: HNTextStyle
  public let controlSm: HNTextStyle
  public let controlXs: HNTextStyle
  public let display: HNTextStyle
  public let heading: HNTextStyle
  public let meta: HNTextStyle
  public let title: HNTextStyle

  /// The hansenexus theme's values; `of(_:)` picks another theme's.
  /// Running text, row titles
  public static let body: HNTextStyle = HNTextStyle(size: 16, lineHeight: 24, weight: 400)

  /// Dense rows, small buttons
  public static let bodySm: HNTextStyle = HNTextStyle(size: 14, lineHeight: 20, weight: 400)

  /// Chips, badges, tiny labels
  public static let caption: HNTextStyle = HNTextStyle(size: 12, lineHeight: 16, weight: 500)

  /// Text in a large control (design#243). Weight 400: a Button sets its own semibold; a pack changes size and leading here
  public static let controlLg: HNTextStyle = HNTextStyle(size: 15, lineHeight: 22, weight: 400)

  /// Text in a control and a text field (design#243). Weight 400: a Button sets its own semibold; a pack changes size and leading here
  public static let controlMd: HNTextStyle = HNTextStyle(size: 14, lineHeight: 20, weight: 400)

  /// Text in a small control (design#243). Weight 400: a Button sets its own semibold; a pack changes size and leading here
  public static let controlSm: HNTextStyle = HNTextStyle(size: 13, lineHeight: 18, weight: 400)

  /// Text in an xs control (design#243). Weight 400: a Button sets its own semibold; a pack changes size and leading here
  public static let controlXs: HNTextStyle = HNTextStyle(size: 12, lineHeight: 16, weight: 400)

  /// Hero titles and big numbers
  public static let display: HNTextStyle = HNTextStyle(size: 36, lineHeight: 44, weight: 600)

  /// Page headings
  public static let heading: HNTextStyle = HNTextStyle(size: 24, lineHeight: 32, weight: 600)

  /// Secondary lines, timestamps, section headers
  public static let meta: HNTextStyle = HNTextStyle(size: 13, lineHeight: 18, weight: 400)

  /// Card and panel titles
  public static let title: HNTextStyle = HNTextStyle(size: 20, lineHeight: 28, weight: 600)

  /// The theme's own values.
  public static func of(_ theme: HNTheme) -> HNTypeScale {
    switch theme {
    case .hansenexus: return HNTypeScale(body: HNTextStyle(size: 16, lineHeight: 24, weight: 400), bodySm: HNTextStyle(size: 14, lineHeight: 20, weight: 400), caption: HNTextStyle(size: 12, lineHeight: 16, weight: 500), controlLg: HNTextStyle(size: 15, lineHeight: 22, weight: 400), controlMd: HNTextStyle(size: 14, lineHeight: 20, weight: 400), controlSm: HNTextStyle(size: 13, lineHeight: 18, weight: 400), controlXs: HNTextStyle(size: 12, lineHeight: 16, weight: 400), display: HNTextStyle(size: 36, lineHeight: 44, weight: 600), heading: HNTextStyle(size: 24, lineHeight: 32, weight: 600), meta: HNTextStyle(size: 13, lineHeight: 18, weight: 400), title: HNTextStyle(size: 20, lineHeight: 28, weight: 600))
    case .kommandant: return HNTypeScale(body: HNTextStyle(size: 13, lineHeight: 20, weight: 400), bodySm: HNTextStyle(size: 12, lineHeight: 16, weight: 400), caption: HNTextStyle(size: 10, lineHeight: 14, weight: 500), controlLg: HNTextStyle(size: 15, lineHeight: 22, weight: 400), controlMd: HNTextStyle(size: 14, lineHeight: 20, weight: 400), controlSm: HNTextStyle(size: 13, lineHeight: 18, weight: 400), controlXs: HNTextStyle(size: 12, lineHeight: 16, weight: 400), display: HNTextStyle(size: 28, lineHeight: 34, weight: 600), heading: HNTextStyle(size: 18, lineHeight: 24, weight: 600), meta: HNTextStyle(size: 11, lineHeight: 16, weight: 400), title: HNTextStyle(size: 15, lineHeight: 20, weight: 600))
    case .portal: return HNTypeScale(body: HNTextStyle(size: 16, lineHeight: 24, weight: 400), bodySm: HNTextStyle(size: 14, lineHeight: 20, weight: 400), caption: HNTextStyle(size: 12, lineHeight: 16, weight: 500), controlLg: HNTextStyle(size: 15, lineHeight: 22, weight: 400), controlMd: HNTextStyle(size: 14, lineHeight: 20, weight: 400), controlSm: HNTextStyle(size: 13, lineHeight: 18, weight: 400), controlXs: HNTextStyle(size: 12, lineHeight: 16, weight: 400), display: HNTextStyle(size: 36, lineHeight: 44, weight: 600), heading: HNTextStyle(size: 24, lineHeight: 32, weight: 600), meta: HNTextStyle(size: 13, lineHeight: 18, weight: 400), title: HNTextStyle(size: 20, lineHeight: 28, weight: 600))
    case .lexilink: return HNTypeScale(body: HNTextStyle(size: 16, lineHeight: 24, weight: 400), bodySm: HNTextStyle(size: 14, lineHeight: 20, weight: 400), caption: HNTextStyle(size: 12, lineHeight: 16, weight: 500), controlLg: HNTextStyle(size: 15, lineHeight: 22, weight: 400), controlMd: HNTextStyle(size: 14, lineHeight: 20, weight: 400), controlSm: HNTextStyle(size: 13, lineHeight: 18, weight: 400), controlXs: HNTextStyle(size: 12, lineHeight: 16, weight: 400), display: HNTextStyle(size: 36, lineHeight: 44, weight: 600), heading: HNTextStyle(size: 24, lineHeight: 32, weight: 600), meta: HNTextStyle(size: 13, lineHeight: 18, weight: 400), title: HNTextStyle(size: 20, lineHeight: 28, weight: 600))
    }
  }
}

/// The roles of `HNTypeScale`, the names of `--hn-text-*` on the web.
public enum HNTextRole: String, CaseIterable, Sendable {
  case body
  case bodySm = "body-sm"
  case caption
  case controlLg = "control-lg"
  case controlMd = "control-md"
  case controlSm = "control-sm"
  case controlXs = "control-xs"
  case display
  case heading
  case meta
  case title
}

extension HNTypeScale {
  /// The style of `role` in this scale.
  public subscript(_ role: HNTextRole) -> HNTextStyle {
    switch role {
    case .body: body
    case .bodySm: bodySm
    case .caption: caption
    case .controlLg: controlLg
    case .controlMd: controlMd
    case .controlSm: controlSm
    case .controlXs: controlXs
    case .display: display
    case .heading: heading
    case .meta: meta
    case .title: title
    }
  }
}
