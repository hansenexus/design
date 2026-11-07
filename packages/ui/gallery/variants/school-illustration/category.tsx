// The school-illustration vote: which recipe the school family of @hansenexus/illustrations is
// built with (design#134). Every motif is one composition drawn into a bay; the recipe decides
// the beam weight, whether a closed cell or a gabled house frames it, and whether the lit Gefach
// or the accent brace carries the one token colour. The columns show the recipes in the places
// the motifs will live: an empty state, an error state, a list row at 24 px, a hero, and the
// whole family at 96 px. The package draws DEFAULT_SCHOOL_VARIANT until the decision file
// (decisions/school-illustration.json) names a winner; tests hold the two together.
import { SchoolNotFoundIllustration } from "@hansenexus/illustrations/school/404";
import { ClassIllustration } from "@hansenexus/illustrations/school/class";
import { SchoolEmptyIllustration } from "@hansenexus/illustrations/school/empty";
import { SchoolErrorIllustration } from "@hansenexus/illustrations/school/error";
import { SchoolMaintenanceIllustration } from "@hansenexus/illustrations/school/maintenance";
import { SchoolNoPermissionIllustration } from "@hansenexus/illustrations/school/no-permission";
import { SchoolNoResultsIllustration } from "@hansenexus/illustrations/school/no-results";
import { SchoolOfflineIllustration } from "@hansenexus/illustrations/school/offline";
import { QuizIllustration } from "@hansenexus/illustrations/school/quiz";
import { SchoolIllustration } from "@hansenexus/illustrations/school/school";
import { SeatingPlanIllustration } from "@hansenexus/illustrations/school/seating-plan";
import { StudyGroupIllustration } from "@hansenexus/illustrations/school/study-group";
import { SchoolSuccessIllustration } from "@hansenexus/illustrations/school/success";
import { TestIllustration } from "@hansenexus/illustrations/school/test";
import { TimetableIllustration } from "@hansenexus/illustrations/school/timetable";
import type { SchoolVariant } from "@hansenexus/illustrations/school/variants";
import { VocabularyIllustration } from "@hansenexus/illustrations/school/vocabulary";
import type { ComponentType } from "react";
import { Button, EmptyState, ErrorState } from "../../../src";
import type { CategorySpec, Variant } from "../types";

/** A school-illustration variant: the recipe name the motifs take as `variant`. */
export type SchoolStyle = Variant & { variant: SchoolVariant };

type Motif = ComponentType<{ variant?: SchoolVariant; width?: number; height?: number }>;

const FAMILY: Motif[] = [
  SchoolEmptyIllustration,
  SchoolNoResultsIllustration,
  SchoolErrorIllustration,
  SchoolNotFoundIllustration,
  SchoolOfflineIllustration,
  SchoolNoPermissionIllustration,
  SchoolSuccessIllustration,
  SchoolMaintenanceIllustration,
  ClassIllustration,
  SeatingPlanIllustration,
  QuizIllustration,
  TimetableIllustration,
  VocabularyIllustration,
  TestIllustration,
  StudyGroupIllustration,
  SchoolIllustration,
];

const ROWS: [string, Motif][] = [
  ["Timetable", TimetableIllustration],
  ["Seating plan", SeatingPlanIllustration],
  ["Study group", StudyGroupIllustration],
];

const panel = "rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card";

export const category: CategorySpec<SchoolStyle> = {
  title: "School illustration",
  question:
    "Which recipe builds the school family? The winner becomes the package default, so fachwerk's empty states, error pages and landing take it without naming a variant.",
  level: "atom",
  fixtures: [
    {
      id: "empty",
      label: "Empty state",
      note: "EmptyState with the school empty motif at 96 px and an action; only the recipe differs.",
      render: (v) => (
        <EmptyState
          className={panel}
          title="No vocabulary yet"
          description="Add the first word pair and the class can start practising."
          illustration={<SchoolEmptyIllustration variant={v.variant} width={96} height={72} />}
          action={<Button>Add words</Button>}
        />
      ),
    },
    {
      id: "error",
      label: "Error state",
      note: "ErrorState in the production view with the school error motif.",
      render: (v) => (
        <ErrorState
          className={panel}
          illustration={<SchoolErrorIllustration variant={v.variant} width={96} height={72} />}
          digest="3071684953"
          onRetry={() => {}}
          dev={false}
        />
      ),
    },
    {
      id: "row",
      label: "List row at 24 px",
      note: "The smallest size a motif is used at: a row of a list, the lit Gefach doing the work.",
      render: (v) => (
        <ul className="m-0 grid list-none gap-1 p-0 text-sm text-hn-ink-body">
          {ROWS.map(([label, Motif]) => (
            <li key={label} className={`flex items-center gap-2 px-3 py-1.5 ${panel}`}>
              <Motif variant={v.variant} width={24} height={18} />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "hero",
      label: "Hero at 240 px",
      note: "The school motif as the landing hero: the recipe at the size that shows its joinery.",
      columns: 4,
      render: (v) => (
        <div className={`flex justify-center p-4 text-hn-ink-primary ${panel}`}>
          <SchoolIllustration variant={v.variant} width={240} height={180} />
        </div>
      ),
    },
    {
      id: "family",
      label: "All sixteen at 96 px",
      note: "The eight states and the eight spots side by side: is the family one hand, and is each motif its own?",
      columns: 2,
      render: (v) => (
        <div className={`flex flex-wrap gap-2 p-3 text-hn-ink-primary ${panel}`}>
          {FAMILY.map((Motif, i) => (
            <Motif key={String(i)} variant={v.variant} width={96} height={72} />
          ))}
        </div>
      ),
    },
  ],
};
