// The hansenexus mark and wordmark for Swift: geometry (BrandGeometry.swift, generated),
// the variants in the brand.* token colours, and the asset files as bundle resources.
// The name, mark and wordmark are trademarks, not covered by the MIT licence (TRADEMARK.md).
import Foundation
import HansenexusTokens

/// A point in the geometry's own units.
public struct HNPoint: Sendable, Equatable {
  public let x: Double
  public let y: Double

  public init(_ x: Double, _ y: Double) {
    self.x = x
    self.y = y
  }
}

/// One segment of an outline, absolute coordinates.
public enum HNPathSegment: Sendable, Equatable {
  case move(HNPoint)
  case line(HNPoint)
  case quad(HNPoint, HNPoint)
  case curve(HNPoint, HNPoint, HNPoint)
  case close
}

/// The mark polygons and the outlined wordmark text; see BrandGeometry.swift.
public enum HNBrandGeometry {}

/// Flat colours only. `lime` on ink, `limeDeep` on light surfaces where lime falls below
/// 3:1, `ink`, `paper`, and `mono` (the foreground style). Never a gradient, glow or outline.
public enum HNBrandVariant: String, CaseIterable, Sendable {
  case lime
  case limeDeep = "lime-deep"
  case ink
  case paper
  case mono

  /// The brand.* token colour; nil for `mono`. The same in both modes.
  public var color: HNRGBA? {
    let brand = HNColors.of(.default, .dark).brand
    switch self {
    case .lime: return brand.lime
    case .limeDeep: return brand.limeDeep
    case .ink: return brand.ink
    case .paper: return brand.paper
    case .mono: return nil
    }
  }

  /// The wordmark's text variant: the lime mark stands on ink with paper text.
  public var wordmarkText: HNBrandVariant {
    switch self {
    case .lime: return .paper
    case .limeDeep: return .ink
    default: return self
    }
  }
}

/// The files of `brand/assets` bundled with the package.
public enum HNBrandAsset {
  /// The 1024 px app icon master: the lime mark on the ink tile.
  public static let appIcon = "app-icon-1024.png"
  /// macOS menu bar template images (black plus alpha; the system tints them).
  public static let trayTemplate = "trayTemplate.png"
  public static let trayTemplate2x = "trayTemplate@2x.png"

  public static func mark(_ variant: HNBrandVariant) -> String {
    "hansenexus-mark-\(variant.rawValue).svg"
  }

  public static func wordmark(_ variant: HNBrandVariant) -> String {
    "hansenexus-wordmark-\(variant.rawValue).svg"
  }

  /// The bundled file, e.g. `HNBrandAsset.url(HNBrandAsset.appIcon)`.
  public static func url(_ file: String) -> URL? {
    let name = (file as NSString).deletingPathExtension
    let ext = (file as NSString).pathExtension
    return Bundle.module.url(forResource: name, withExtension: ext, subdirectory: "Resources")
  }
}
