import HansenexusTokens
import XCTest

@testable import HansenexusBrand

final class BrandTests: XCTestCase {
  func testMarkIsTheCanonicalGeometry() {
    XCTAssertEqual(HNBrandGeometry.markSize, HNPoint(422.64, 321.81))
    XCTAssertEqual(HNBrandGeometry.markPolygons.map(\.count), [6, 7])
    XCTAssertEqual(HNBrandGeometry.markPolygons.first?.first, HNPoint(309.72, 0))
  }

  func testWordmarkOutlineIsClosedAndInsideItsBox() {
    let text = HNBrandGeometry.wordmarkText
    XCTAssertEqual(text.first.map { if case .move = $0 { return true } else { return false } }, true)
    XCTAssertEqual(text.last, .close)
    let size = HNBrandGeometry.wordmarkSize
    for seg in text {
      switch seg {
      case .move(let p), .line(let p), .quad(_, let p), .curve(_, _, let p):
        XCTAssert(p.x >= HNBrandGeometry.wordmarkTextX - 1 && p.x <= size.x + 1, "\(p)")
        XCTAssert(p.y >= -1 && p.y <= size.y + 1, "\(p)")
      case .close: break
      }
    }
  }

  func testVariantsUseTheBrandTokens() {
    let brand = HNColors.of(.default, .light).brand
    XCTAssertEqual(HNBrandVariant.lime.color, brand.lime)
    XCTAssertEqual(HNBrandVariant.limeDeep.color, brand.limeDeep)
    XCTAssertEqual(HNBrandVariant.ink.color, brand.ink)
    XCTAssertEqual(HNBrandVariant.paper.color, brand.paper)
    XCTAssertNil(HNBrandVariant.mono.color)
    XCTAssertEqual(HNBrandVariant.lime.wordmarkText, .paper)
    XCTAssertEqual(HNBrandVariant.limeDeep.wordmarkText, .ink)
  }

  func testAssetsAreBundled() throws {
    var files = [HNBrandAsset.appIcon, HNBrandAsset.trayTemplate, HNBrandAsset.trayTemplate2x]
    for v in HNBrandVariant.allCases {
      files += [HNBrandAsset.mark(v), HNBrandAsset.wordmark(v)]
    }
    for file in files {
      let url = try XCTUnwrap(HNBrandAsset.url(file), file)
      XCTAssertGreaterThan(try Data(contentsOf: url).count, 100, file)
    }
  }
}
