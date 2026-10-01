import HansenexusTokens
import XCTest

@testable import HansenexusPopover

final class AccentTests: XCTestCase {
  func testBrandIsTheHansenexusActionTokens() {
    let dark = HNColors.of(.hansenexus, .dark)
    let light = HNColors.of(.hansenexus, .light)
    let brand = HNAccent.brand
    XCTAssertEqual(brand.fill, HNModePair(dark: dark.action.primary, light: light.action.primary))
    XCTAssertEqual(brand.onFill, HNModePair(dark: dark.action.primaryInk, light: light.action.primaryInk))
    XCTAssertEqual(brand.text, HNModePair(dark: dark.action.text, light: light.action.text))
    XCTAssertEqual(brand.soft, HNModePair(dark: dark.surface.tint, light: light.surface.tint))
    XCTAssertEqual(brand, HNAccent.of(.default))
  }

  func testBrandFillIsLimeWithInkOnIt() {
    XCTAssertEqual(HNAccent.brand.fill[.dark].hex, "#42c501")
    XCTAssertEqual(HNAccent.brand.onFill[.light].hex, "#16140f")
    XCTAssertEqual(HNAccent.brand.text[.light].hex, "#2b7300")
  }

  func testModePairPicksByMode() {
    let pair = HNModePair(dark: HNRGBA(0xA7A2F2), light: HNRGBA(0x3E37B3))
    XCTAssertEqual(pair[.dark].hex, "#a7a2f2")
    XCTAssertEqual(pair[.light].hex, "#3e37b3")
    XCTAssertEqual(HNModePair(HNRGBA(0x4F46E5))[.light], HNModePair(HNRGBA(0x4F46E5))[.dark])
  }

  func testCustomAccentKeepsItsValues() {
    let indigo = HNAccent.indigoFixture
    XCTAssertNotEqual(indigo, .brand)
    XCTAssertEqual(indigo.fill[.dark].hex, "#4f46e5")
    XCTAssertEqual(indigo.onFill[.dark].hex, "#ffffff")
    XCTAssertEqual(indigo.soft[.light].hex, "#e8e7fc")
  }
}

extension HNAccent {
  /// hn-tools' accent as the README spells it, for the override tests.
  static let indigoFixture = HNAccent(
    fill: HNModePair(HNRGBA(0x4F46E5)),
    onFill: HNModePair(HNRGBA(0xFFFFFF)),
    text: HNModePair(dark: HNRGBA(0xA7A2F2), light: HNRGBA(0x3E37B3)),
    soft: HNModePair(dark: HNRGBA(0x4F46E5, alpha: 0x38), light: HNRGBA(0xE8E7FC))
  )
}
