// swift-tools-version:5.9
// hansenexus design tokens and brand assets for Swift and SwiftUI. Tokens.swift and
// BrandGeometry.swift are generated; see swift/README.md.
import PackageDescription

let package = Package(
  name: "HansenexusDesign",
  platforms: [.iOS(.v16), .macOS(.v13)],
  products: [
    .library(name: "HansenexusTokens", targets: ["HansenexusTokens"]),
    .library(name: "HansenexusBrand", targets: ["HansenexusBrand"]),
  ],
  targets: [
    .target(name: "HansenexusTokens", path: "swift/Sources/HansenexusTokens"),
    .target(
      name: "HansenexusBrand",
      dependencies: ["HansenexusTokens"],
      path: "swift/Sources/HansenexusBrand",
      resources: [.copy("Resources")]
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
  ]
)
