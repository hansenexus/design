import { describe, expect, test } from "bun:test";
import {
  DEFAULT_SCHOOL_VARIANT,
  isSchoolVariant,
  SCHOOL_VARIANTS,
} from "@hansenexus/illustrations/school/variants";
import { listCategories } from "../scripts/variants";

// The school-illustration vote (design#134) and the package it decides for stay in step: the
// board shows exactly the package's recipes, and once the owner decides, the winner is what the
// motifs draw by default.
describe("school-illustration vote", () => {
  const category = listCategories().find((c) => c.id === "school-illustration");

  test("is on the board", () => {
    expect(category).toBeDefined();
  });

  test("shows exactly the package's variants, or only the decided winner", () => {
    if (!category) return;
    if (category.decision) {
      expect(category.variants).toEqual([category.decision.winner]);
      expect(isSchoolVariant(category.decision.winner)).toBe(true);
    } else {
      expect(category.variants).toEqual([...SCHOOL_VARIANTS].sort());
    }
  });

  test("the package default follows the decision", () => {
    if (!category?.decision) {
      expect(SCHOOL_VARIANTS).toContain(DEFAULT_SCHOOL_VARIANT);
      return;
    }
    expect<string>(DEFAULT_SCHOOL_VARIANT).toBe(category.decision.winner);
  });
});
