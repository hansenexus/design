// The motif registry: every motif is `src/<path>.tsx`, built to `dist/<path>.js` and exported as
// `./<path>`. Two families: the hansenexus state motifs at the root (design#17) and the `school`
// family for fachwerk (design#132; design#134 rebuilt it on the variant engine of
// src/school/frame.tsx), eight states redrawn for school plus eight domain spots. Since design#220
// the families are the illustration sets of src/sets.ts, and this module reads them from there.
import { SETS } from "../src/sets";

const [estate, school] = SETS;

/** The eight hansenexus state motifs at the package root: the estate set of src/sets.ts. */
export const MOTIFS = estate.motifs;

export type MotifId = keyof typeof MOTIFS;

/** The school family: the same eight states, drawn for school, and eight domain spots. */
export const SCHOOL = school.motifs;

export type SchoolId = keyof typeof SCHOOL;

/** The school states, in the order of MOTIFS; the rest of SCHOOL are the domain spots. */
export const SCHOOL_STATES = Object.keys(MOTIFS) as SchoolId[];

/**
 * The families by folder, one per set of src/sets.ts (design#220): "" is the package root,
 * "school" is src/school/. A new set's folder reaches the build and the tests through its
 * registry entry alone.
 */
export const FAMILIES: Record<string, Readonly<Record<string, string>>> = Object.fromEntries(
  SETS.map((s) => [s.folder, s.motifs])
);

export type Entry = {
  /** The folder, "" for the root. */
  family: string;
  /** The motif's id in its family. */
  id: string;
  /** The import path below the package name, the source below src/ and the module below dist/. */
  path: string;
  /** The exported component name. */
  component: string;
};

/**
 * Modules that are not motifs but ship as import paths of their own: the school family's
 * variant recipes, so an app can list and type the variants without importing a motif; the set
 * registry (design#220), data only; StateIllustration, the state motifs of the active set; and
 * the animated motifs (design#223): their recipes and stylesheet as data in `animations`, the
 * component in `animated`.
 */
export const MODULES = ["school/variants", "sets", "state", "animations", "animated"] as const;

/** The modules that render, sourced from `.tsx`. */
const RENDERING = new Set<string>(["state", "animated"]);

/** A module's source below src/: `.tsx` for the ones that render, `.ts` for the rest. */
export const moduleSource = (m: string) => (RENDERING.has(m) ? `${m}.tsx` : `${m}.ts`);

/** Every motif of every family, as one flat list. */
export const ENTRIES: Entry[] = Object.entries(FAMILIES).flatMap(([family, motifs]) =>
  Object.entries(motifs).map(([id, component]) => ({
    family,
    id,
    path: family ? `${family}/${id}` : id,
    component,
  }))
);
