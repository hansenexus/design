#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import SwiftUI
import XCTest

@testable import HansenexusTokens

final class SwiftUITests: XCTestCase {
  func testPaletteReadsEveryGroup() {
    let hn = Color.hn(.kommandant)
    _ = [hn.surface.page, hn.ink.body, hn.line.strong, hn.action.primary, hn.status.crit, hn.focus.ring]
  }

  #if os(macOS)
  func testAdaptiveColorFollowsAppearance() throws {
    let color = NSColor(Color.hnAdaptive(\.surface.page, theme: .kommandant))
    func resolved(_ name: NSAppearance.Name) throws -> String {
      let appearance = try XCTUnwrap(NSAppearance(named: name))
      var hex = ""
      appearance.performAsCurrentDrawingAppearance {
        let c = color.usingColorSpace(.sRGB)!
        let parts = [c.redComponent, c.greenComponent, c.blueComponent]
        hex = "#" + parts.map { String(format: "%02x", Int(($0 * 255).rounded())) }.joined()
      }
      return hex
    }
    XCTAssertEqual(try resolved(.darkAqua), "#121109")
    XCTAssertEqual(try resolved(.aqua), "#f4f0e6")
  }
  #endif

  func testFontFallsBackToSystemDesign() {
    XCTAssertEqual(HNFontStack.design(for: HNFontFamily.mono), .monospaced)
    XCTAssertEqual(HNFontStack.design(for: HNFontFamily.display), .serif)
    XCTAssertEqual(HNFontStack.design(for: HNFontFamily.sans), .default)
    _ = Font.hnDisplay(size: 34)
    _ = Font.hnSans(size: 14)
    _ = Font.hnMono(size: 13)
  }

  func testTypeRoles() {
    for role in HNTextRole.allCases {
      _ = Font.hn(role)
      _ = Font.hn(role, theme: .kommandant, family: HNFontFamily.mono, weight: .semibold)
    }
    XCTAssertEqual(HNTextRole.body.textStyle, .body)
    XCTAssertEqual(HNTextRole.display.textStyle, .largeTitle)
    XCTAssertEqual(Font.Weight(hnCSS: 400), .regular)
    XCTAssertEqual(Font.Weight(hnCSS: 500), .medium)
    XCTAssertEqual(Font.Weight(hnCSS: 600), .semibold)
    XCTAssertEqual(Font.Weight(hnCSS: 700), .bold)
    XCTAssertEqual(HNTextStyle(size: 13, lineHeight: 20, weight: 400).lineSpacing, 20 - 13 * 1.2, accuracy: 0.0001)
  }
}
#endif
