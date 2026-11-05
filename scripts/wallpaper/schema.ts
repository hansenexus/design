// The wallpaper config schema. One BrandConfig per brand (scripts/wallpaper/brands/), rendered by
// scripts/wallpaper.ts. Documented in brand/wallpapers/README.md.

/**
 * A colour: a token path of @hansenexus/tokens ("palette.warm.800", "brand.lime"), or "#rrggbb"
 * for a client's own colours (client configs only; the ratchet exempts them), or a mix of two
 * in sRGB: `{ mix: [a, b, t] }` is a at t = 0 and b at t = 1.
 */
export type Colour = string | { mix: readonly [Colour, Colour, number] };

/**
 * Where a source file lives. `repo`: this repository. `hn-monorepo`: $HN_MONOREPO or
 * ~/repos/hn-monorepo. `sources`: $HN_WALLPAPER_SOURCES or ~/data/wallpaper-sources (files
 * that exist nowhere else yet, such as a traced draft mark).
 */
export type Source = { root: "repo" | "hn-monorepo" | "sources"; path: string };

/** One allowed colour variant of the mark. */
export type MarkVariant = {
  file: Source;
  /**
   * Every fill colour the variant shows. The renderer refuses a file whose fills differ, so a
   * changed logo cannot slip through. With `repaint`, the single colour here paints every part
   * of the file instead (for a one-colour mark kept as black artwork).
   */
  fills: readonly Colour[];
  repaint?: boolean;
};

export type Layout = "portrait" | "landscape";
export type PerLayout<T> = Readonly<Record<Layout, T>>;

/** Mark size and position: width as a fraction of the image width, centre as fractions. */
export type Placement = { width: number; cx: number; cy: number };

export type Size = {
  /** File name part: `<ground>-<name>.png`. */
  name: string;
  width: number;
  height: number;
  layout: Layout;
};

/**
 * Sea-chart contour lines (the "Elbe" motif): horizontal lines from `top` over `span` of the
 * height, each a smooth curve through `segments` + 1 points. Lengths are fractions of the image
 * height, so every size shows the same picture.
 */
export type Contours = {
  kind: "contours";
  lines: PerLayout<number>;
  amplitude: PerLayout<number>;
  stroke: PerLayout<number>;
  top: number;
  span: number;
  segments: number;
  /** Every `majorEvery`-th line (from the first) draws in the ground's `major` colour. */
  majorEvery: number;
};

export type Ground = {
  /** File name part: `<name>-<size>.png`. */
  name: string;
  /** The Focus mode that shows it; null for the device without a Focus. */
  focus: string | null;
  background: Colour;
  line: Colour;
  major: Colour;
  /** Fraction of the motif's lines (1 = all). */
  density?: number;
  /** One line drawn in an accent: `at` is its index as a fraction of the line count. */
  highlight?: { at: number; colour: Colour; weight: number };
  /** A key of `mark.variants`. */
  mark: string;
};

export type BrandConfig = {
  brand: string;
  /** draft: not approved by the owner yet; files carry a -draft suffix. */
  status: "approved" | "draft";
  /** Whether the PNGs are committed (clients are not: this repository is public). */
  commit: boolean;
  motif: Contours;
  mark: { variants: Readonly<Record<string, MarkVariant>>; placement: PerLayout<Placement> };
  grounds: readonly Ground[];
  sizes: readonly Size[];
};

/** The device sizes every brand renders by default. */
export const SIZES: readonly Size[] = [
  { name: "iphone", width: 1320, height: 2868, layout: "portrait" },
  { name: "ipad", width: 2752, height: 2064, layout: "landscape" },
  { name: "mac-6k", width: 6016, height: 3384, layout: "landscape" },
  { name: "mac-5k", width: 5120, height: 2880, layout: "landscape" },
];

/** The Elbe contour field, ported from the approved round-3 preview (2026-11-05). */
export const ELBE: Contours = {
  kind: "contours",
  lines: { portrait: 28, landscape: 22 },
  amplitude: { portrait: 0.012, landscape: 0.018 },
  stroke: { portrait: 0.00107, landscape: 0.0014 },
  top: 0.06,
  span: 0.9,
  segments: 8,
  majorEvery: 5,
};

/**
 * Mark centred on a phone at 0.75 height: above the Home Screen search pill (~0.81) and Dock
 * (~0.86), clear of the lock screen buttons. Right side elsewhere at 0.76: the iPad Dock reaches
 * x ~0.96 and its top sits at ~0.875 in landscape (design#125).
 */
export const PLACEMENT: PerLayout<Placement> = {
  portrait: { width: 0.093, cx: 0.5, cy: 0.75 },
  landscape: { width: 0.042, cx: 0.92, cy: 0.76 },
};
