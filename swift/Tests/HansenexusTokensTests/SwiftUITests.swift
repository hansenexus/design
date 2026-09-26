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
    XCTAssertEqual(try resolved(.darkAqua), "#16140f")
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
}
#endif
