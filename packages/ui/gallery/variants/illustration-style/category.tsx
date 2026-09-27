// The illustration-style vote: which drawing style @hansenexus/illustrations uses for its eight
// state motifs. Two motifs decide it, empty and error, each drawn in the slot of the primitive
// it will fill, so the columns compare the style in place and not on a blank canvas.
import type { ReactNode } from "react";
import { Button, EmptyState, ErrorState } from "../../../src";
import type { CategorySpec, Variant } from "../types";

/** An illustration-style variant: the two vote motifs, as SVG in that style. */
export type IllustrationStyle = Variant & {
  Empty: () => ReactNode;
  Error: () => ReactNode;
};

/** Every motif shares this box; `width` and `height` are the default size in the slot. */
export const MOTIF_BOX = { viewBox: "0 0 160 120", width: 160, height: 120 } as const;

const panel = "rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card";

export const category: CategorySpec<IllustrationStyle> = {
  title: "Illustration style",
  question:
    "Which style do the state illustrations take? The winner is drawn for all eight motifs (empty, no-results, error, 404, offline, no-permission, success, maintenance) in @hansenexus/illustrations.",
  fixtures: [
    {
      id: "empty",
      label: "Empty",
      note: "EmptyState with its default copy and an action; only the illustration differs.",
      render: (v) => (
        <EmptyState
          className={panel}
          illustration={<v.Empty />}
          action={<Button>Add a machine</Button>}
        />
      ),
    },
    {
      id: "error",
      label: "Error",
      note: "ErrorState in the production view, with a reference and retry.",
      render: (v) => (
        <ErrorState
          className={panel}
          illustration={<v.Error />}
          digest="3071684953"
          onRetry={() => {}}
          dev={false}
        />
      ),
    },
  ],
};
