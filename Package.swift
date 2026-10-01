// swift-tools-version:5.9
// hansenexus design tokens, brand assets and menu bar popover components for Swift and
// SwiftUI. Tokens.swift and BrandGeometry.swift are generated; see swift/README.md.
import PackageDescription

let package = Package(
  name: "HansenexusDesign",
  platforms: [.iOS(.v16), .macOS(.v13)],
  products: [
    .library(name: "HansenexusTokens", targets: ["HansenexusTokens"]),
    .library(name: "HansenexusBrand", targets: ["HansenexusBrand"]),
    .library(name: "HansenexusPopover", targets: ["HansenexusPopover"]),
  ],
  targets: [
    .target(name: "HansenexusTokens", path: "swift/Sources/HansenexusTokens"),
    .target(
      name: "HansenexusBrand",
      dependencies: ["HansenexusTokens"],
      path: "swift/Sources/HansenexusBrand",
      resources: [.copy("Resources")]
    ),
    .target(
      name: "HansenexusPopover",
      dependencies: ["HansenexusTokens", "HansenexusBrand"],
      path: "swift/Sources/HansenexusPopover"
    ),
    .testTarget(
      name: "HansenexusTokensTests",
      dependencies: ["HansenexusTokens"],
      path: "swift/Tests/HansenexusTokensTests"
    ),
    .testTarget(
      name: "HansenexusBrandTests",
      dependencies: ["HansenexusBrand", "HansenexusTokens"],
      path: "swift/Tests/HansenexusBrandTests"
    ),
    .testTarget(
      name: "HansenexusPopoverTests",
      dependencies: ["HansenexusPopover", "HansenexusTokens"],
      path: "swift/Tests/HansenexusPopoverTests"
    ),
  ]
)
