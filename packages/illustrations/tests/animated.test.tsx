// The animated motifs (design#223): the recipes reach real parts of the motifs, the stylesheet
// reads every timing from the motion tokens (so the motion set drives it) and never runs under
// reduced motion, and the component draws the still motif when motion is reduced.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnimatedIllustration, prefersReducedMotion } from "../src/animated";
import {
  ANIMATED_SETS,
  ANIMATION_CSS,
  animationKey,
  CENTRED,
  GENERIC,
  MOVES,
  RECIPES,
  recipeFor,
} from "../src/animations";
import { SET_IDS, STATE_MOTIFS } from "../src/sets";
import { IllustrationSetProvider, STATE_ILLUSTRATIONS } from "../src/state";

const TOKENS = resolve(import.meta.dir, "../../tokens/tokens");
const html = (node: ReactNode) => renderToStaticMarkup(node as never);

/** The opening tags of the motif's top-level elements, in :nth-child order. */
function topLevelChildren(markup: string): string[] {
  const inner = markup.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
  let depth = 0;
  const tags: string[] = [];
  for (const [tag] of inner.matchAll(/<\/?[a-z][^>]*>/g)) {
    if (tag.startsWith("</")) depth--;
    else {
      if (depth === 0) tags.push(tag);
      if (!tag.endsWith("/>")) depth++;
    }
  }
  return tags;
}

describe("the recipes", () => {
  test("the estate set animates all eight state motifs", () => {
    expect(ANIMATED_SETS).toContain("estate");
    for (const state of STATE_MOTIFS) {
      const recipe = RECIPES.estate?.[state];
      expect(recipe?.parts.length).toBeGreaterThan(0);
    }
  });

  test("every recipe is of a known set and moves parts the motif draws", () => {
    for (const [set, recipes] of Object.entries(RECIPES)) {
      expect(SET_IDS as readonly string[]).toContain(set);
      for (const state of STATE_MOTIFS) {
        const Motif = STATE_ILLUSTRATIONS[set as (typeof SET_IDS)[number]][state];
        const parts = topLevelChildren(html(createElement(Motif)));
        for (const part of recipes[state].parts) {
          expect(MOVES).toContain(part.move);
          expect(part.child).toBeGreaterThanOrEqual(1);
          expect(part.child).toBeLessThanOrEqual(parts.length);
          // A turn or scale about the part's centre would shift its own transform attribute.
          if (CENTRED.has(part.move)) expect(parts[part.child - 1]).not.toContain(" transform=");
        }
      }
    }
  });

  test("a set without recipes gets the entrance alone", () => {
    for (const set of SET_IDS.filter((s) => !ANIMATED_SETS.includes(s))) {
      for (const state of STATE_MOTIFS) expect(recipeFor(set, state)).toBe(GENERIC);
    }
    expect(GENERIC).toEqual({ play: "once", parts: [] });
  });
});

describe("the stylesheet", () => {
  test("runs only without a reduced-motion preference, and skips [data-reduced-motion]", () => {
    expect(ANIMATION_CSS.startsWith("@media (prefers-reduced-motion: no-preference){")).toBe(true);
    expect(ANIMATION_CSS.endsWith("}")).toBe(true);
    const selectors = [...ANIMATION_CSS.matchAll(/(svg\[data-hn-motion[^{]*)\{/g)].map((m) => m[1]);
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) {
      expect(s).toContain(":not(:where([data-reduced-motion], [data-reduced-motion] *))");
    }
  });

  test("times everything by the motion tokens: no duration outside a var() fallback", () => {
    const outside = ANIMATION_CSS.replace(/var\(--hn-[a-z-]+, [^)]*\)+/g, "VAR");
    expect(outside).not.toMatch(/\d+m?s\b/);
    for (const v of ["enter-duration", "enter-easing", "stagger-step", "emphasis-duration"]) {
      expect(ANIMATION_CSS).toContain(`var(--hn-${v}`);
    }
  });

  test("the fallbacks are the default motion set's values", () => {
    const motion = JSON.parse(readFileSync(resolve(TOKENS, "semantic/motion.json"), "utf8"));
    const fallback = (name: string) =>
      ANIMATION_CSS.match(
        new RegExp(`var\\(--hn-${name}, (cubic-bezier\\([^)]*\\)|[^),]+)\\)`)
      )?.[1];
    expect(fallback("enter-duration")).toBe(motion.enter.duration.$value);
    expect(fallback("stagger-step")).toBe(motion.stagger.step.$value);
    expect(fallback("emphasis-duration")).toBe(motion.emphasis.duration.$value);
    expect(fallback("pulse-duration")).toBe(motion.pulse.duration.$value);
    expect(fallback("spin-duration")).toBe(motion.spin.duration.$value);
    expect(fallback("enter-easing")).toBe(`cubic-bezier(${motion.enter.easing.$value.join(", ")})`);
  });

  test("defines every move's keyframes and a rule per estate motif", () => {
    for (const move of [...MOVES, "enter"]) {
      expect(ANIMATION_CSS).toContain(`@keyframes hn-motif-${move}{`);
    }
    for (const state of STATE_MOTIFS) {
      expect(ANIMATION_CSS).toContain(`svg[data-hn-motion="${animationKey("estate", state)}"]`);
    }
  });

  test("loops repeat, one-shots play once and hold the end", () => {
    expect(ANIMATION_CSS).toMatch(
      /svg\[data-hn-motion="estate\/maintenance"\][^{]*\{[^}]*animation:[^}]*hn-motif-spin [^}]*infinite none/
    );
    expect(ANIMATION_CSS).toMatch(
      /svg\[data-hn-motion="estate\/success"\][^{]*\{[^}]*animation:hn-motif-pop [^}]* 1 both/
    );
  });
});

describe("AnimatedIllustration", () => {
  test("marks the motif for the stylesheet and ships it once per page", () => {
    const out = html(
      createElement(
        Fragment,
        null,
        createElement(AnimatedIllustration, { state: "empty" }),
        createElement(AnimatedIllustration, { state: "maintenance" })
      )
    );
    expect(out.match(/<style/g)).toHaveLength(1);
    expect(out).toContain('data-hn-motion="estate/empty"');
    expect(out).toContain('data-hn-motion="estate/maintenance"');
    expect(out).toContain('data-hn-play="loop"');
  });

  test("draws the active set, and a set without recipes plays the entrance once", () => {
    const out = html(
      createElement(
        IllustrationSetProvider,
        { set: "school" },
        createElement(AnimatedIllustration, { state: "success" })
      )
    );
    expect(out).toContain('data-hn-motion="school/success"');
    expect(out).toContain('data-hn-play="once"');
  });

  test("reduced motion renders the still motif, exactly", () => {
    for (const state of STATE_MOTIFS) {
      const Still = STATE_ILLUSTRATIONS.estate[state];
      expect(html(createElement(AnimatedIllustration, { state, reducedMotion: true }))).toBe(
        html(createElement(Still))
      );
    }
  });

  test("a motion set pins its timing as data-motion; attributes pass through", () => {
    const sets = JSON.parse(readFileSync(resolve(TOKENS, "motion-sets/sets.json"), "utf8")).sets;
    expect(sets).toContain("calm");
    const out = html(
      createElement(AnimatedIllustration, {
        state: "offline",
        motionSet: "calm",
        width: 48,
        "aria-label": "Offline",
      })
    );
    expect(out).toContain('data-motion="calm"');
    expect(out).toContain('width="48"');
    expect(out).toContain('role="img"');
  });
});

describe("prefersReducedMotion", () => {
  const win = (matches: boolean) => ({ matchMedia: () => ({ matches }) });
  test("follows the window's media query, false without one", () => {
    expect(prefersReducedMotion(win(true))).toBe(true);
    expect(prefersReducedMotion(win(false))).toBe(false);
    expect(prefersReducedMotion({})).toBe(false);
    expect(prefersReducedMotion(undefined)).toBe(false);
  });
});
