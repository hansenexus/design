// bargsten: motif and traced mark approved by the owner on 2026-11-05 (design#128).
// The client has raster logos only. The mark here is a potrace tracing of
// hn-monorepo apps/bargsten/public/logo-mark.png kept outside the repository
// (~/data/wallpaper-sources/bargsten/), repainted in the brand colours; it is a stand-in until
// a vector original exists. Colours: apps/bargsten/src/app/globals.css.
import { type BrandConfig, ELBE, PLACEMENT, SIZES } from "../schema";

const CREAM = "#f8f3ef"; // --cream
const TEAL_DEEP = "#4f7174"; // --teal-deep
const TEAL_INK = "#39565a"; // --teal-ink
const TEAL = "#80a5a9"; // --teal

const traced = { root: "sources", path: "bargsten/logo-mark.traced.svg" } as const;

export const config: BrandConfig = {
  brand: "bargsten",
  status: "approved",
  commit: false,
  motif: ELBE,
  mark: {
    variants: {
      "teal-deep": { file: traced, fills: [TEAL_DEEP], repaint: true },
      cream: { file: traced, fills: [CREAM], repaint: true },
    },
    placement: PLACEMENT,
  },
  grounds: [
    {
      name: "creme",
      focus: null,
      background: CREAM,
      line: { mix: [CREAM, TEAL, 0.12] },
      major: { mix: [CREAM, TEAL, 0.22] },
      mark: "teal-deep",
    },
    {
      name: "teal",
      focus: "Arbeiten",
      background: TEAL_INK,
      line: { mix: [TEAL_INK, TEAL, 0.14] },
      major: { mix: [TEAL_INK, TEAL, 0.24] },
      mark: "cream",
    },
  ],
  sizes: SIZES,
};
