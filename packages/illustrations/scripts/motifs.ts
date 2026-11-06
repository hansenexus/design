// The motif registry: every motif is `src/<path>.tsx`, built to `dist/<path>.js` and exported as
// `./<path>`. Two families: the hansenexus state motifs at the root (design#17) and the `school`
// family for fachwerk (design#132), eight states redrawn for school plus eight domain spots.

/** The eight hansenexus state motifs at the package root. */
export const MOTIFS = {
  empty: "EmptyIllustration",
  "no-results": "NoResultsIllustration",
  error: "ErrorIllustration",
  "404": "NotFoundIllustration",
  offline: "OfflineIllustration",
  "no-permission": "NoPermissionIllustration",
  success: "SuccessIllustration",
  maintenance: "MaintenanceIllustration",
} as const;

export type MotifId = keyof typeof MOTIFS;

/** The school family: the same eight states, drawn for school, and eight domain spots. */
export const SCHOOL = {
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
} as const;

export type SchoolId = keyof typeof SCHOOL;

/** The school states, in the order of MOTIFS; the rest of SCHOOL are the domain spots. */
export const SCHOOL_STATES = Object.keys(MOTIFS) as SchoolId[];

/** The families by folder: "" is the package root, "school" is src/school/. */
export const FAMILIES: Record<string, Readonly<Record<string, string>>> = {
  "": MOTIFS,
  school: SCHOOL,
};

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

/** Every motif of every family, as one flat list. */
export const ENTRIES: Entry[] = Object.entries(FAMILIES).flatMap(([family, motifs]) =>
  Object.entries(motifs).map(([id, component]) => ({
    family,
    id,
    path: family ? `${family}/${id}` : id,
    component,
  }))
);
