// The illustration sets (design#220): an axis of its own, beside the theme pack. A set is a family
// of motifs drawn in one style that covers at least the eight state motifs, in one folder of src/
// ("" for the package root). This module is data only, no React and no imports, so a gallery
// view, a build script or a Node test can list the sets without loading a single motif; the
// components are in ./state (StateIllustration) and, one import path each, in the motif files.
// A theme pack names its default set in pack.json ("illustrations"); see themes/README.md.

/** The eight state motifs every set draws, in the order the gallery shows them. */
export const STATE_MOTIFS = [
  "empty",
  "no-results",
  "error",
  "404",
  "offline",
  "no-permission",
  "success",
  "maintenance",
] as const;

export type StateMotif = (typeof STATE_MOTIFS)[number];

export interface IllustrationSet {
  /** The set's id, the value of pack.json's "illustrations" and the gallery's ?illustrations=. */
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** The folder below src/ (and dist/, and the import path): "" for the package root. */
  readonly folder: string;
  /** Every motif of the set, id → exported component: the eight states, then any spots. */
  readonly motifs: Readonly<Record<StateMotif, string>> & Readonly<Record<string, string>>;
}

/**
 * The registry: one entry per set, the default first. Adding a set is its folder of motifs plus
 * one entry here (and its row in ./state, which the type checker asks for).
 */
export const SETS = [
  {
    id: "estate",
    label: "Estate",
    description:
      "The hansenexus geometric set (design#17): flat filled shapes in tones of currentColor, one token accent, a ground shadow. The default for the estate tools and lexilink.",
    folder: "",
    motifs: {
      empty: "EmptyIllustration",
      "no-results": "NoResultsIllustration",
      error: "ErrorIllustration",
      "404": "NotFoundIllustration",
      offline: "OfflineIllustration",
      "no-permission": "NoPermissionIllustration",
      success: "SuccessIllustration",
      maintenance: "MaintenanceIllustration",
    },
  },
  {
    id: "school",
    label: "School (Fachwerk)",
    description:
      "fachwerk's set (design#132, design#134): timber framing taken literally, straight beams, 45° braces and plaster Gefache on a sill beam, drawn by the recipe engine of school/variants. The eight states and eight domain spots.",
    folder: "school",
    motifs: {
      empty: "SchoolEmptyIllustration",
      "no-results": "SchoolNoResultsIllustration",
      error: "SchoolErrorIllustration",
      "404": "SchoolNotFoundIllustration",
      offline: "SchoolOfflineIllustration",
      "no-permission": "SchoolNoPermissionIllustration",
      success: "SchoolSuccessIllustration",
      maintenance: "SchoolMaintenanceIllustration",
      class: "ClassIllustration",
      "seating-plan": "SeatingPlanIllustration",
      quiz: "QuizIllustration",
      timetable: "TimetableIllustration",
      vocabulary: "VocabularyIllustration",
      test: "TestIllustration",
      "study-group": "StudyGroupIllustration",
      school: "SchoolIllustration",
    },
  },
] as const satisfies readonly IllustrationSet[];

export type SetId = (typeof SETS)[number]["id"];

/** Every set id, the default first. */
export const SET_IDS: readonly SetId[] = SETS.map((s) => s.id);

/** The set an app gets when its pack names none: the estate set. */
export const DEFAULT_SET: SetId = "estate";

export function isSetId(value: unknown): value is SetId {
  return typeof value === "string" && (SET_IDS as readonly string[]).includes(value);
}

/** The set `id` names, or the default set for anything else. */
export function setFor(id?: string | null): (typeof SETS)[number] {
  return SETS.find((s) => s.id === id) ?? SETS[0];
}

/** The import path of a set's motif below the package name: "empty", "school/empty". */
export function motifPath(set: Pick<IllustrationSet, "folder">, motif: string): string {
  return set.folder ? `${set.folder}/${motif}` : motif;
}
