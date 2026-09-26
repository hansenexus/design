import type { ReactNode } from "react";
import type { Decision } from "../../scripts/variants";

/** One alternative on the board. A category extends it with what its fixtures need. */
export type Variant = {
  /** Short name in the column header. */
  label: string;
  /** One or two sentences: what this alternative does and what it costs. */
  summary: string;
  /**
   * Plain CSS the variant needs, injected while the vote shows it. It lives in the variant file,
   * so deleting a losing variant deletes its styles too. Semantic tokens only (the ratchet).
   */
  css?: string;
};

/** A situation every variant is drawn in, so the columns compare like with like. */
export type Fixture<V extends Variant> = {
  id: string;
  label: string;
  /** What stays the same across variants, if anything does. */
  note?: string;
  render(variant: V): ReactNode;
};

/** gallery/variants/<category>/category.tsx exports `category` of this shape. */
export type CategorySpec<V extends Variant> = {
  title: string;
  /** The question the owner answers. */
  question: string;
  fixtures: Fixture<V>[];
};

/** One entry of `virtual:variants`, assembled by scripts/variants.ts at gallery build time. */
export type RegisteredCategory = {
  id: string;
  spec: CategorySpec<Variant>;
  decision: Decision | null;
  variants: (Variant & { id: string })[];
};
