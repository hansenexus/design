// SwiftUI views of the mark and the wordmark, drawn from the geometry (no image decoding,
// sharp at every size). Flat fills only.
#if canImport(SwiftUI) && (os(iOS) || os(macOS))
import HansenexusTokens
import SwiftUI

/// One part of the brand geometry as a Shape, scaled uniformly into its rect.
public struct HNBrandShape: Shape {
  public enum Part: Sendable {
    /// The mark alone, in its own box.
    case mark
    /// The mark inside the wordmark's box.
    case lockupMark
    /// The wordmark text inside the wordmark's box.
    case lockupText
  }

  public let part: Part

  public init(_ part: Part) {
    self.part = part
  }

  public func path(in rect: CGRect) -> Path {
    let box = part == .mark ? HNBrandGeometry.markSize : HNBrandGeometry.wordmarkSize
    let s = min(rect.width / box.x, rect.height / box.y)
    let ox = rect.minX + (rect.width - box.x * s) / 2
    let oy = rect.minY + (rect.height - box.y * s) / 2
    func p(_ q: HNPoint) -> CGPoint { CGPoint(x: ox + q.x * s, y: oy + q.y * s) }
    var path = Path()
    if part == .lockupText {
      for seg in HNBrandGeometry.wordmarkText {
        switch seg {
        case .move(let a): path.move(to: p(a))
        case .line(let a): path.addLine(to: p(a))
        case .quad(let c, let a): path.addQuadCurve(to: p(a), control: p(c))
        case .curve(let c1, let c2, let a): path.addCurve(to: p(a), control1: p(c1), control2: p(c2))
        case .close: path.closeSubpath()
        }
      }
    } else {
      for polygon in HNBrandGeometry.markPolygons {
        path.addLines(polygon.map(p))
        path.closeSubpath()
      }
    }
    return path
  }
}

extension HNBrandVariant {
  fileprivate var style: AnyShapeStyle {
    color.map { AnyShapeStyle(Color(hn: $0)) } ?? AnyShapeStyle(.foreground)
  }
}

/// The hansenexus mark. Set the height with `.frame(height:)`; minimum 12 pt high.
public struct HansenexusMark: View {
  public let variant: HNBrandVariant

  public init(variant: HNBrandVariant = .mono) {
    self.variant = variant
  }

  public var body: some View {
    let size = HNBrandGeometry.markSize
    HNBrandShape(.mark)
      .fill(variant.style)
      .aspectRatio(size.x / size.y, contentMode: .fit)
      .accessibilityElement()
      .accessibilityLabel("hansenexus")
      .accessibilityAddTraits(.isImage)
  }
}

/// The lockup: the mark and `hansenexus` in Fraunces, outlined. Minimum 16 pt high.
public struct HansenexusWordmark: View {
  public let variant: HNBrandVariant

  public init(variant: HNBrandVariant = .mono) {
    self.variant = variant
  }

  public var body: some View {
    let size = HNBrandGeometry.wordmarkSize
    ZStack {
      HNBrandShape(.lockupMark).fill(variant.style)
      HNBrandShape(.lockupText).fill(variant.wordmarkText.style)
    }
    .aspectRatio(size.x / size.y, contentMode: .fit)
    .accessibilityElement()
    .accessibilityLabel("hansenexus")
    .accessibilityAddTraits(.isImage)
  }
}
#endif
