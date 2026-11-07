// The school family's variant recipes (design#134). A motif is a composition drawn into a bay;
// the recipe decides how the bay is built around it: how heavy the beams are, whether a frame
// encloses it and what carries the one accent. Every motif takes `variant` and the kit's vote
// board (packages/ui, gallery/variants/school-illustration) shows the recipes side by side, so a
// design direction picks one without redrawing the sixteen motifs. The same pattern as the
// fachwerk mark's VARIANT_RECIPES (hansenexus/fachwerk packages/ui/src/fachwerk-mark.tsx).

/** Beam width in box units (160 × 120): 4 is a pencil line at 96 px, 8 a timber. */
export type SchoolWeight = 4 | 6 | 8;

/**
 * What stands around the composition: `frei` nothing but the sill, `gefach` one closed cell of
 * posts and rails to the edge of the box, `haus` walls under a 45° gable.
 */
export type SchoolFraming = "frei" | "gefach" | "haus";

/**
 * Which part carries the motif's one token colour: the lit `gefach`, the `strebe` (the accent
 * brace), or `none` for an ink-only motif where the lit Gefach is a darker plaster.
 */
export type SchoolAccent = "gefach" | "strebe" | "none";

export type SchoolRecipe = {
  weight: SchoolWeight;
  framing: SchoolFraming;
  accent: SchoolAccent;
};

export const SCHOOL_RECIPES = {
  gefach: { weight: 6, framing: "gefach", accent: "gefach" },
  "gefach-leicht": { weight: 4, framing: "gefach", accent: "gefach" },
  "gefach-schwer": { weight: 8, framing: "gefach", accent: "gefach" },
  "gefach-strebe": { weight: 6, framing: "gefach", accent: "strebe" },
  "gefach-mono": { weight: 6, framing: "gefach", accent: "none" },
  frei: { weight: 6, framing: "frei", accent: "gefach" },
  haus: { weight: 6, framing: "haus", accent: "gefach" },
  "haus-strebe": { weight: 6, framing: "haus", accent: "strebe" },
} as const satisfies Record<string, SchoolRecipe>;

export type SchoolVariant = keyof typeof SCHOOL_RECIPES;

export const SCHOOL_VARIANTS = Object.keys(SCHOOL_RECIPES) as SchoolVariant[];

/**
 * What a motif draws when `variant` is not given. The kit's vote decided it on 2026-11-07
 * (packages/ui/decisions/school-illustration.json, design#136): the closed cell at the middle
 * weight with the accent on the brace, the lit Gefach a darker plaster.
 */
export const DEFAULT_SCHOOL_VARIANT: SchoolVariant = "gefach-strebe";

export function isSchoolVariant(value: unknown): value is SchoolVariant {
  return typeof value === "string" && value in SCHOOL_RECIPES;
}

export function schoolRecipe(variant: SchoolVariant = DEFAULT_SCHOOL_VARIANT): SchoolRecipe {
  return SCHOOL_RECIPES[variant];
}
