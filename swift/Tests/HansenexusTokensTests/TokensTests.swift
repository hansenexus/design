import XCTest

@testable import HansenexusTokens

final class TokensTests: XCTestCase {
  func testKommandantWarmDark() {
    let dark = HNColors.of(.kommandant, .dark)
    XCTAssertEqual(dark.surface.page.hex, "#16140f")
    XCTAssertEqual(dark.surface.card.hex, "#201d18")
    XCTAssertEqual(dark.ink.primary.hex, "#f4f0e6")
    XCTAssertEqual(dark.status.crit.hex, "#ff7a66")
    XCTAssertEqual(dark.status.busy.hex, "#8fb8ff")
    XCTAssertEqual(dark.status.off.hex, "#8a8273")
  }

  func testLimeIsTheOnlyAccent() {
    for theme in HNTheme.allCases {
      XCTAssertEqual(HNColors.of(theme, .dark).action.primary.hex, "#42c501")
      XCTAssertEqual(HNColors.of(theme, .light).action.primary.hex, "#42c501")
      // On light, lime as text is #2b7300; the fill keeps dark text.
      XCTAssertEqual(HNColors.of(theme, .light).action.text.hex, "#2b7300")
      XCTAssertEqual(HNColors.of(theme, .light).action.primaryInk.hex, "#16140f")
    }
  }

  func testEveryThemeShipsBothModes() {
    for theme in HNTheme.allCases {
      XCTAssertNotEqual(HNColors.of(theme, .dark), HNColors.of(theme, .light), "\(theme)")
    }
    XCTAssertEqual(HNTheme.default, .hansenexus)
    XCTAssertEqual(HNMode.default, .dark)
  }

  func testDensity() {
    XCTAssertEqual(HNSize.of(.kommandant), HNSize(row: 36, target: 24))
    XCTAssertEqual(HNSize.of(HNTheme.hansenexus).row, 48)
    XCTAssertEqual(HNSize.of(.touch).target, 44)
    XCTAssertEqual(HNSize.of(.compact), HNSize.of(.kommandant))
  }

  func testScales() {
    XCTAssertEqual(HNSpace.s4, 16)
    XCTAssertEqual(HNSpace.s12, 48)
    XCTAssertEqual(HNRadius.md, 10)
    XCTAssertEqual(HNFocus.width, 2)
    XCTAssertEqual(HNDuration.fast, 0.12, accuracy: 1e-9)
    XCTAssertEqual(HNDelay.pending, 0.2, accuracy: 1e-9)
    XCTAssertEqual(HNMinVisible.pending, 0.4, accuracy: 1e-9)
    XCTAssertEqual(HNPulse.easing, HNCubicBezier(0.4, 0, 0.6, 1))
    XCTAssertEqual(HNFontFamily.mono.first, "JetBrains Mono")
    XCTAssertEqual(HNShadow.lift.color, HNRGBA(0x000000, alpha: 0xB3))
    XCTAssertEqual(HNShadow.lift.color.hex, "#000000b3")
    XCTAssertEqual(HNShadow.lift.radius, 30)
  }

  func testRGBA() {
    let c = HNRGBA(0x42C501)
    XCTAssertEqual([c.red, c.green, c.blue, c.alpha], [0x42, 0xC5, 0x01, 0xFF])
    XCTAssertEqual(c.components.opacity, 1)
    XCTAssertEqual(HNRGBA(0x0A0B0C).hex, "#0a0b0c")
  }
}
