// hansenexus: the Elbe family, one ground per Focus mode (owner, 2026-11-05, design#122).
// Colours are token paths only; the mark is the generated brand/assets file of each variant.
import { type BrandConfig, ELBE, type MarkVariant, PLACEMENT, SIZES } from "../schema";

const variant = (v: "lime" | "lime-deep" | "ink" | "paper"): MarkVariant => ({
  file: { root: "repo", path: `brand/assets/mark/hansenexus-mark-${v}.svg` },
  fills: [`brand.${v}`],
});

export const config: BrandConfig = {
  brand: "hansenexus",
  status: "approved",
  commit: true,
  motif: ELBE,
  mark: {
    variants: {
      lime: variant("lime"),
      "lime-deep": variant("lime-deep"),
      ink: variant("ink"),
    },
    placement: PLACEMENT,
  },
  grounds: [
    {
      // "Fahrrinne": one lime line, something is running.
      name: "device-hub",
      focus: "Device Hub",
      background: "brand.ink",
      line: "palette.warm.800",
      major: "palette.warm.750",
      highlight: { at: 0.62, colour: "brand.lime", weight: 1.6 },
      mark: "lime",
    },
    {
      name: "arbeiten",
      focus: "Arbeiten",
      background: "brand.ink",
      line: "palette.warm.800",
      major: "palette.warm.750",
      mark: "lime",
    },
    {
      name: "buchhaltung",
      focus: "Buchhaltung",
      background: "brand.paper",
      line: { mix: ["palette.warm.100", "palette.warm.200", 0.4] },
      major: "palette.warm.200",
      mark: "lime-deep",
    },
    {
      // "Karton": still light, clearly more serious than Buchhaltung.
      name: "steuern",
      focus: "Steuern",
      background: "palette.warm.200",
      line: { mix: ["palette.warm.200", "palette.warm.400", 0.25] },
      major: { mix: ["palette.warm.200", "palette.warm.400", 0.5] },
      mark: "ink",
    },
    {
      // No Focus: a third of the lines, barely there.
      name: "alltag",
      focus: null,
      background: "brand.ink",
      line: "palette.warm.850",
      major: "palette.warm.800",
      density: 0.4,
      mark: "lime",
    },
  ],
  sizes: SIZES,
};
