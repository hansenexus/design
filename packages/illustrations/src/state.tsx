// "The state motif X of the active set" without importing by path (design#220). A provider names
// the active set (an app sets it from its theme pack's default, pack.json "illustrations"), and
// StateIllustration draws the asked state in it. This module bundles the eight states of every
// set; an app that wants to ship only the motifs it draws keeps importing them by path.
import { type ComponentType, createContext, type ReactNode, useContext } from "react";
import { NotFoundIllustration } from "./404";
import { EmptyIllustration } from "./empty";
import { ErrorIllustration } from "./error";
import type { IllustrationProps } from "./frame";
import { MaintenanceIllustration } from "./maintenance";
import { NoPermissionIllustration } from "./no-permission";
import { NoResultsIllustration } from "./no-results";
import { OfflineIllustration } from "./offline";
import { SchoolNotFoundIllustration } from "./school/404";
import { SchoolEmptyIllustration } from "./school/empty";
import { SchoolErrorIllustration } from "./school/error";
import { SchoolMaintenanceIllustration } from "./school/maintenance";
import { SchoolNoPermissionIllustration } from "./school/no-permission";
import { SchoolNoResultsIllustration } from "./school/no-results";
import { SchoolOfflineIllustration } from "./school/offline";
import { SchoolSuccessIllustration } from "./school/success";
import { DEFAULT_SET, isSetId, type SetId, type StateMotif } from "./sets";
import { SuccessIllustration } from "./success";

export type { IllustrationProps };

type Motif = ComponentType<IllustrationProps>;

/** The state motifs of every set of ./sets, by set and state. */
export const STATE_ILLUSTRATIONS: Readonly<Record<SetId, Readonly<Record<StateMotif, Motif>>>> = {
  estate: {
    empty: EmptyIllustration,
    "no-results": NoResultsIllustration,
    error: ErrorIllustration,
    "404": NotFoundIllustration,
    offline: OfflineIllustration,
    "no-permission": NoPermissionIllustration,
    success: SuccessIllustration,
    maintenance: MaintenanceIllustration,
  },
  school: {
    empty: SchoolEmptyIllustration,
    "no-results": SchoolNoResultsIllustration,
    error: SchoolErrorIllustration,
    "404": SchoolNotFoundIllustration,
    offline: SchoolOfflineIllustration,
    "no-permission": SchoolNoPermissionIllustration,
    success: SchoolSuccessIllustration,
    maintenance: SchoolMaintenanceIllustration,
  },
};

const SetContext = createContext<SetId>(DEFAULT_SET);

/**
 * Names the active set for everything below it. `set` is a set id, typically the theme pack's
 * pack.json "illustrations"; an unknown or missing id falls back to the default set.
 */
export function IllustrationSetProvider({
  set,
  children,
}: {
  set?: string | null;
  children: ReactNode;
}) {
  return (
    <SetContext.Provider value={isSetId(set) ? set : DEFAULT_SET}>{children}</SetContext.Provider>
  );
}

/** The active set's id: the nearest IllustrationSetProvider's, or the default set. */
export function useIllustrationSet(): SetId {
  return useContext(SetContext);
}

export type StateIllustrationProps = IllustrationProps & {
  /** Which of the eight states to draw. */
  state: StateMotif;
  /** A set to draw it in instead of the active one. */
  set?: SetId;
};

/** The state motif `state` of the active set (or of `set`). Any SVG attribute passes through. */
export function StateIllustration({ state, set, ...props }: StateIllustrationProps) {
  const active = useIllustrationSet();
  const Motif = STATE_ILLUSTRATIONS[set ?? active][state];
  return <Motif {...props} />;
}
