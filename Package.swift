// swift-tools-version:5.9
// hansenexus design tokens for Swift and SwiftUI. Tokens.swift is generated from
// packages/tokens/tokens/*.json; see swift/README.md.
import PackageDescription

let package = Package(
  name: "HansenexusDesign",
  platforms: [.iOS(.v16), .macOS(.v13)],
  products: [
    .library(name: "HansenexusTokens", targets: ["HansenexusTokens"])
  ],
  targets: [
    .target(name: "HansenexusTokens", path: "swift/Sources/HansenexusTokens"),
    .testTarget(
      name: "HansenexusTokensTests",
      dependencies: ["HansenexusTokens"],
      path: "swift/Tests/HansenexusTokensTests"
    ),
  ]
)
