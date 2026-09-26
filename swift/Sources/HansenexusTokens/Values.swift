// Value types the generated Tokens.swift is built from. Foundation-free, so the
// package also builds and tests on Linux.

/// An sRGB colour with 8-bit channels, as authored in the DTCG source.
public struct HNRGBA: Sendable, Hashable, CustomStringConvertible {
  public let red: UInt8
  public let green: UInt8
  public let blue: UInt8
  public let alpha: UInt8

  /// `HNRGBA(0x16140F)`, optionally with an alpha channel: `HNRGBA(0x000000, alpha: 0xB3)`.
  public init(_ rgb: UInt32, alpha: UInt8 = 0xFF) {
    red = UInt8((rgb >> 16) & 0xFF)
    green = UInt8((rgb >> 8) & 0xFF)
    blue = UInt8(rgb & 0xFF)
    self.alpha = alpha
  }

  /// Channels in 0...1, for SwiftUI, UIKit and AppKit initialisers.
  public var components: (red: Double, green: Double, blue: Double, opacity: Double) {
    (Double(red) / 255, Double(green) / 255, Double(blue) / 255, Double(alpha) / 255)
  }

  /// `#16140f`, or `#000000b3` when not opaque; the same spelling as the CSS output.
  public var hex: String {
    let channels = alpha == 0xFF ? [red, green, blue] : [red, green, blue, alpha]
    return "#" + channels.map { $0 < 16 ? "0" + String($0, radix: 16) : String($0, radix: 16) }.joined()
  }

  public var description: String { hex }
}

/// A single drop shadow in points. `spread` has no SwiftUI equivalent; `radius` is the
/// SwiftUI `.shadow(radius:)` that approximates the CSS blur.
public struct HNShadowValue: Sendable, Equatable {
  public let color: HNRGBA
  public let x: Double
  public let y: Double
  public let blur: Double
  public let spread: Double

  public var radius: Double { blur / 2 }
}
