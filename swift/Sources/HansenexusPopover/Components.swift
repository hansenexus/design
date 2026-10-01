// The look of the menu bar popover shared by hn-tools and meeting-recorder (design#81): an
// emblem header, an icon tab strip, cards under small-caps section headers, pill buttons and
// bottom tiles. The accent comes from `.hnAccent(_:)`; light and dark follow the system.
#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import HansenexusBrand
import HansenexusTokens
import SwiftUI

// MARK: - Emblem

/// The hansenexus emblem as a `Shape`: the mark of `HansenexusBrand`, centred in its rect.
/// Fill it (`Emblem().fill(...)`), or take its path for a menu bar template image.
public struct Emblem: Shape {
  public init() {}

  public func path(in rect: CGRect) -> Path {
    HNBrandShape(.mark).path(in: rect)
  }
}

/// The one brand row every surface starts with: the emblem in the accent, the tool's name,
/// "hansenexus" as caption.
public struct BrandHeader<Trailing: View>: View {
  public var title: String
  public var trailing: Trailing

  @Environment(\.hnAccent) private var accent
  @Environment(\.colorScheme) private var scheme

  public init(title: String, @ViewBuilder trailing: () -> Trailing) {
    self.title = title
    self.trailing = trailing()
  }

  public var body: some View {
    HStack(spacing: 10) {
      Emblem()
        .fill(accent.fill.color(scheme))
        .frame(width: 26, height: 20)
        .accessibilityHidden(true)
      VStack(alignment: .leading, spacing: 0) {
        Text(title).font(.system(size: 13, weight: .semibold))
        Text("hansenexus")
          .font(.system(size: 10, weight: .medium))
          .tracking(0.3)
          .foregroundStyle(.secondary)
      }
      .accessibilityElement(children: .combine)
      Spacer(minLength: 8)
      trailing
    }
  }
}

extension BrandHeader where Trailing == EmptyView {
  public init(title: String) {
    self.init(title: title) { EmptyView() }
  }
}

// MARK: - Vocabulary

/// "DISPLAYS": small, uppercase, tracked, secondary.
public struct SectionHeader: View {
  public var title: String

  public init(title: String) {
    self.title = title
  }

  public var body: some View {
    Text(title.uppercased())
      .font(.system(size: 11, weight: .semibold))
      .tracking(0.7)
      .foregroundStyle(.secondary)
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(.horizontal, 4)
      .accessibilityAddTraits(.isHeader)
  }
}

/// A rounded, lifted group of rows separated by hairlines, like a grouped form. Flat: no glass.
/// The hairlines between rows need macOS 15 / iOS 18; earlier systems stack the rows without.
public struct Card<Content: View>: View {
  public var padding: CGFloat
  public var content: Content

  @Environment(\.colorScheme) private var scheme

  public init(padding: CGFloat = 14, @ViewBuilder content: () -> Content) {
    self.padding = padding
    self.content = content()
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      if #available(macOS 15, iOS 18, *) {
        Group(subviews: content) { subviews in
          ForEach(Array(subviews.enumerated()), id: \.offset) { index, subview in
            if index > 0 {
              Divider().opacity(0.5)
            }
            subview.padding(.vertical, 10)
          }
        }
      } else {
        content.padding(.vertical, 10)
      }
    }
    .padding(.horizontal, padding)
    .padding(.vertical, 2)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(PopoverPalette.card(scheme), in: RoundedRectangle(cornerRadius: HNRadius.lg, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: HNRadius.lg, style: .continuous)
        .stroke(PopoverPalette.hairline(scheme), lineWidth: 1))
  }
}

/// One row of a card: a title, an optional grey explanation under it, whatever control belongs
/// on the right.
public struct SettingRow<Trailing: View>: View {
  public var title: String
  public var detail: String?
  public var systemImage: String?
  public var trailing: Trailing

  public init(
    title: String, detail: String? = nil, systemImage: String? = nil,
    @ViewBuilder trailing: () -> Trailing
  ) {
    self.title = title
    self.detail = detail
    self.systemImage = systemImage
    self.trailing = trailing()
  }

  public var body: some View {
    HStack(alignment: .center, spacing: 12) {
      if let systemImage {
        Image(systemName: systemImage)
          .font(.system(size: 14))
          .foregroundStyle(.secondary)
          .frame(width: 20)
          .accessibilityHidden(true)
      }
      VStack(alignment: .leading, spacing: 2) {
        Text(title).font(.system(size: 13))
        if let detail {
          Text(detail)
            .font(.system(size: 11))
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      trailing
    }
  }
}

extension SettingRow where Trailing == EmptyView {
  public init(title: String, detail: String? = nil, systemImage: String? = nil) {
    self.init(title: title, detail: detail, systemImage: systemImage) { EmptyView() }
  }
}

/// A small rounded label: "Main", "Ready", "Setup 2 left".
public struct Chip: View {
  public enum Tone: Sendable { case neutral, accent, ok }

  public var text: String
  public var tone: Tone

  @Environment(\.hnAccent) private var accent
  @Environment(\.colorScheme) private var scheme

  public init(text: String, tone: Tone = .neutral) {
    self.text = text
    self.tone = tone
  }

  public var body: some View {
    Text(text)
      .font(.system(size: 10, weight: .medium))
      .padding(.horizontal, 7)
      .padding(.vertical, 2)
      .foregroundStyle(foreground)
      .background(background, in: Capsule(style: .continuous))
  }

  private var foreground: Color {
    switch tone {
    case .neutral: .secondary
    case .accent: accent.text.color(scheme)
    case .ok: PopoverPalette.ok
    }
  }

  private var background: Color {
    switch tone {
    case .neutral: PopoverPalette.well(scheme)
    case .accent: accent.soft.color(scheme)
    case .ok: PopoverPalette.ok.opacity(0.16)
    }
  }
}

// MARK: - Tab strip

/// The icon row of the popover: a flat pill of symbols, the selected one on an accent-tinted
/// tile with its label next to the symbol.
public struct IconTabBar<Tab: Hashable & Identifiable>: View {
  public var tabs: [Tab]
  @Binding public var selection: Tab
  public var symbol: (Tab) -> String
  public var label: (Tab) -> String

  @Environment(\.hnAccent) private var accent
  @Environment(\.colorScheme) private var scheme
  @Namespace private var namespace

  public init(
    tabs: [Tab], selection: Binding<Tab>, symbol: @escaping (Tab) -> String,
    label: @escaping (Tab) -> String
  ) {
    self.tabs = tabs
    _selection = selection
    self.symbol = symbol
    self.label = label
  }

  public var body: some View {
    HStack(spacing: 4) {
      ForEach(tabs) { tab in
        Button {
          withAnimation(.spring(response: 0.22, dampingFraction: 0.85)) { selection = tab }
        } label: {
          HStack(spacing: 6) {
            Image(systemName: symbol(tab)).font(.system(size: 15, weight: .medium))
            if tab == selection {
              Text(label(tab)).font(.system(size: 12, weight: .medium))
            }
          }
          .foregroundStyle(tab == selection ? accent.text.color(scheme) : .secondary)
          .frame(maxWidth: .infinity)
          .frame(height: 34)
          .background {
            if tab == selection {
              RoundedRectangle(cornerRadius: HNRadius.md, style: .continuous)
                .fill(accent.soft.color(scheme))
                .matchedGeometryEffect(id: "tab", in: namespace)
            }
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .help(label(tab))
        .accessibilityLabel(label(tab))
        .accessibilityAddTraits(tab == selection ? .isSelected : [])
      }
    }
    .padding(4)
    .background(PopoverPalette.card(scheme), in: RoundedRectangle(cornerRadius: HNRadius.lg, style: .continuous))
    .overlay(
      RoundedRectangle(cornerRadius: HNRadius.lg, style: .continuous)
        .stroke(PopoverPalette.hairline(scheme), lineWidth: 1))
  }
}

// MARK: - Buttons

/// The pill: primary (accent), danger (stop), quiet (recessed). `small` is the row-sized one.
public struct PillButtonStyle: ButtonStyle {
  public enum Kind: Sendable { case primary, quiet, danger }

  public var kind: Kind
  public var small: Bool
  /// Waiting for what the press started: a spinner in the button, full strength (disable it too).
  public var busy: Bool
  /// The spinner's accessibility label while `busy`.
  public var busyLabel: String

  @Environment(\.hnAccent) private var accent
  @Environment(\.colorScheme) private var scheme
  @Environment(\.isEnabled) private var isEnabled

  public init(kind: Kind = .primary, small: Bool = false, busy: Bool = false, busyLabel: String = "Working") {
    self.kind = kind
    self.small = small
    self.busy = busy
    self.busyLabel = busyLabel
  }

  public func makeBody(configuration: Configuration) -> some View {
    HStack(spacing: 7) {
      if busy {
        ProgressView().controlSize(.small).tint(foreground).accessibilityLabel(busyLabel)
      }
      configuration.label
    }
    .font(.system(size: small ? 12 : 14, weight: .semibold))
    .frame(maxWidth: small ? nil : .infinity)
    .padding(.vertical, small ? 4 : 9)
    .padding(.horizontal, small ? 11 : 16)
    .foregroundStyle(foreground)
    .background(background, in: Capsule(style: .continuous))
    .opacity(configuration.isPressed ? 0.8 : (isEnabled || busy ? 1 : 0.45))
    .contentShape(Capsule(style: .continuous))
  }

  private var foreground: Color {
    switch kind {
    case .primary: accent.onFill.color(scheme)
    case .danger: PopoverPalette.onDanger
    case .quiet: .primary
    }
  }

  private var background: Color {
    switch kind {
    case .primary: accent.fill.color(scheme)
    case .danger: PopoverPalette.danger
    case .quiet: PopoverPalette.well(scheme)
    }
  }
}

/// The wide buttons at the bottom of the popover ("Settings", "Quit").
public struct TileButtonStyle: ButtonStyle {
  public init() {}

  public func makeBody(configuration: Configuration) -> some View {
    TileButton(configuration: configuration)
  }

  private struct TileButton: View {
    let configuration: ButtonStyleConfiguration

    @Environment(\.colorScheme) private var scheme
    @State private var hovering = false

    var body: some View {
      let shape = RoundedRectangle(cornerRadius: 12, style: .continuous)
      configuration.label
        .font(.system(size: 13, weight: .medium))
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(shape.fill(hovering || configuration.isPressed ? PopoverPalette.well(scheme) : PopoverPalette.card(scheme)))
        .overlay(shape.stroke(PopoverPalette.hairline(scheme), lineWidth: 1))
        .opacity(configuration.isPressed ? 0.75 : 1)
        .contentShape(shape)
        .onHover { hovering = $0 }
    }
  }
}
#endif
