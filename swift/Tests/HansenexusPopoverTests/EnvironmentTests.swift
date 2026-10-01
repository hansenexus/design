#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import HansenexusTokens
import SwiftUI
import XCTest

@testable import HansenexusPopover

final class EnvironmentTests: XCTestCase {
  func testDefaultEnvironmentIsTheBrand() {
    XCTAssertEqual(EnvironmentValues().hnAccent, .brand)
  }

  func testEnvironmentTakesAnOverride() {
    var env = EnvironmentValues()
    env.hnAccent = .indigoFixture
    XCTAssertEqual(env.hnAccent, .indigoFixture)
  }

  func testModeFollowsTheColorScheme() {
    XCTAssertEqual(HNMode(ColorScheme.light), .light)
    XCTAssertEqual(HNMode(ColorScheme.dark), .dark)
  }

  @MainActor
  func testComponentsBuild() {
    enum Tab: String, Identifiable, CaseIterable {
      case one, two
      var id: String { rawValue }
    }
    _ = VStack {
      BrandHeader(title: "hn-tools")
      BrandHeader(title: "hn-tools") { Chip(text: "Ready", tone: .accent) }
      SectionHeader(title: "Displays")
      Card {
        SettingRow(title: "Share", detail: "This Mac", systemImage: "display")
        SettingRow(title: "Keep awake") { Chip(text: "on", tone: .ok) }
      }
      IconTabBar(tabs: Tab.allCases, selection: .constant(.one), symbol: { _ in "star" }, label: \.rawValue)
      Button("Start") {}.buttonStyle(PillButtonStyle())
      Button("Stop") {}.buttonStyle(PillButtonStyle(kind: .danger, small: true, busy: true))
      Button("Quit") {}.buttonStyle(TileButtonStyle())
      Emblem().fill(Color.hn().action.primary)
    }
    .hnAccent(.indigoFixture)
  }

  #if os(macOS)
  @MainActor
  func testViewsReadTheBrandWithoutAModifier() {
    XCTAssertEqual(accent(seenBy: { $0 }), .brand)
  }

  @MainActor
  func testModifierOverridesTheAccentBelowIt() {
    XCTAssertEqual(accent(seenBy: { AnyView($0.hnAccent(.indigoFixture)) }), .indigoFixture)
  }

  /// Hosts a probe, wrapped by `wrap`, and returns the accent its environment held.
  @MainActor
  private func accent<V: View>(seenBy wrap: (AccentProbe) -> V) -> HNAccent? {
    let box = AccentBox()
    let host = NSHostingView(rootView: wrap(AccentProbe(box: box)))
    host.frame = CGRect(x: 0, y: 0, width: 40, height: 40)
    host.layoutSubtreeIfNeeded()
    return box.seen
  }
  #endif
}

final class AccentBox {
  var seen: HNAccent?
}

struct AccentProbe: View {
  let box: AccentBox
  @Environment(\.hnAccent) private var accent

  var body: some View {
    box.seen = accent
    return Color.clear
  }
}
#endif
