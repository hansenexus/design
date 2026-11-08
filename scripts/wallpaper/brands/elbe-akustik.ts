// elbe-akustik: approved by the owner on 2026-11-05 (design#128). Never committed (commit: false).
// The mark is the client's own logo, read from hansenexus/hn-monorepo (this repository is
// public, so client files are not copied here). Colours: the site's theme
// (apps/elbe-akustik/src/app/globals.css), as hex because they are not hansenexus tokens.
import { type BrandConfig, ELBE, PLACEMENT, SIZES } from "../schema";

const NAVY = "#17274b"; // --brand-strong
const GOLD = "#c19f25"; // --brand-accent-deep

export const config: BrandConfig = {
  brand: "elbe-akustik",
  status: "approved",
  commit: false,
  motif: ELBE,
  mark: {
    variants: {
      dark: {
        file: { root: "hn-monorepo", path: "apps/elbe-akustik/public/logo-2025-dark-mark.svg" },
        fills: ["#ffffff", GOLD],
      },
    },
    // The file is the lockup (emblem and name), wider than a mark: placed larger.
    placement: {
      portrait: { ...PLACEMENT.portrait, width: 0.32 },
      landscape: { ...PLACEMENT.landscape, width: 0.13, cx: 0.86 },
    },
  },
  grounds: [
    {
      name: "nacht",
      focus: "Arbeiten",
      background: NAVY,
      line: { mix: [NAVY, "#88aaf1", 0.08] },
      major: { mix: [NAVY, "#88aaf1", 0.14] },
      mark: "dark",
    },
    {
      // No Focus: a third of the lines. No light ground: the gold emblem falls below 3:1 on
      // every light surface of the theme.
      name: "still",
      focus: null,
      background: NAVY,
      line: { mix: [NAVY, "#88aaf1", 0.05] },
      major: { mix: [NAVY, "#88aaf1", 0.09] },
      density: 0.4,
      mark: "dark",
    },
  ],
  sizes: SIZES,
};
