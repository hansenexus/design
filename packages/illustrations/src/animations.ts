// Animated motifs (design#223): how each state motif moves, as data, and the one stylesheet that
// plays it. Data only, no React, like ./sets, so a build script or a Node test can read the
// recipes. The component is in ./animated.
//
// Timing comes from the motion tokens of @hansenexus/tokens, never from a number here: every
// duration and easing is a var(--hn-*) of the choreography (enter, stagger, emphasis) or the
// loop tokens (pulse, spin). tokens.css redeclares those per motion set under [data-motion], so
// the active motion set (design#221) drives every motif without a rebuild, and the gallery's
// speed control, which rescales the same variables, reaches them too. Reduced motion stops all
// of it: the rules sit inside @media (prefers-reduced-motion: no-preference) and skip any
// subtree under [data-reduced-motion], and the component draws the still motif instead.
//
// A part is addressed by its place among the motif's top-level SVG children, 1-based as
// :nth-child counts them; child 1 is the ground shadow of the estate frame. Moves use the
// individual transform properties (translate, rotate, scale), which compose with a part's own
// transform attribute instead of replacing it, and a keyframe that leaves a property out ends on
// the part's own value, so a part drawn at opacity .32 enters to .32, not to 1.
import { STATE_MOTIFS, type StateMotif } from "./sets";

/** The moves a part can make. */
export const MOVES = [
  "bob",
  "drift",
  "spin",
  "spin-back",
  "blink",
  "shake",
  "pop",
  "breathe",
] as const;

export type Move = (typeof MOVES)[number];

/** One part of a motif and its move. `step` staggers it: that many stagger steps later. */
export interface Part {
  readonly child: number;
  readonly move: Move;
  readonly step?: number;
}

/**
 * A motif's animation. Every motif enters first: its parts rise in one stagger step apart (the
 * enter and stagger tokens). "loop" then repeats `parts` for as long as it shows, "once" plays
 * them a single time and holds the end, which is the still motif.
 */
export interface Recipe {
  readonly play: "loop" | "once";
  readonly parts: readonly Part[];
}

/**
 * The bespoke recipes, by set id and state. The estate set animates all eight states; a set
 * without an entry gets the entrance alone (GENERIC), so every set animates from day one and a
 * set's own recipes are one entry here.
 */
export const RECIPES: Readonly<Record<string, Readonly<Record<StateMotif, Recipe>>>> = {
  estate: {
    // The three shapes float over the open box, one after another.
    empty: {
      play: "loop",
      parts: [
        { child: 5, move: "bob" },
        { child: 6, move: "bob", step: 2 },
        { child: 7, move: "bob", step: 4 },
      ],
    },
    // The lens and its handle sweep across the list, together.
    "no-results": {
      play: "loop",
      parts: [
        { child: 6, move: "drift" },
        { child: 7, move: "drift" },
      ],
    },
    // The crit diamond shakes, then rests.
    error: { play: "loop", parts: [{ child: 4, move: "shake" }] },
    // The pin hovers over the empty spot, which breathes with it.
    "404": {
      play: "loop",
      parts: [
        { child: 6, move: "bob" },
        { child: 5, move: "breathe" },
      ],
    },
    // The warn bar flickers over the cloud.
    offline: { play: "loop", parts: [{ child: 4, move: "blink" }] },
    // The shackle rattles, the no-entry badge pulses.
    "no-permission": {
      play: "loop",
      parts: [
        { child: 3, move: "shake" },
        { child: 5, move: "breathe", step: 2 },
      ],
    },
    // One-shot: the check pops, the confetti lands one after another (the tilted square, drawn
    // with a transform of its own, enters without a pop).
    success: {
      play: "once",
      parts: [
        { child: 3, move: "pop" },
        { child: 4, move: "pop", step: 2 },
        { child: 5, move: "pop", step: 3 },
        { child: 7, move: "pop", step: 5 },
      ],
    },
    // The gears turn against each other, the hubs glow busy.
    maintenance: {
      play: "loop",
      parts: [
        { child: 2, move: "spin" },
        { child: 3, move: "spin-back" },
        { child: 4, move: "blink" },
        { child: 5, move: "blink", step: 3 },
      ],
    },
  },
};

/** What a set without recipes plays: the entrance, then the still motif. */
export const GENERIC: Recipe = { play: "once", parts: [] };

/** The recipe of `state` in set `set`: its own, or the entrance alone. */
export function recipeFor(set: string, state: StateMotif): Recipe {
  return RECIPES[set]?.[state] ?? GENERIC;
}

/** The sets with recipes of their own, every state covered. */
export const ANIMATED_SETS: readonly string[] = Object.keys(RECIPES);

/** The value of data-hn-motion on an animated motif's <svg>: "<set>/<state>". */
export const animationKey = (set: string, state: StateMotif) => `${set}/${state}`;

// The token variables, with the default set's values as fallbacks so a motif still moves on a
// page that has not loaded tokens.css.
const ENTER = "var(--hn-enter-duration, 200ms)";
const ENTER_EASE = "var(--hn-enter-easing, cubic-bezier(0, 0, 0.2, 1))";
const STEP = "var(--hn-stagger-step, 40ms)";
const EMPHASIS = "var(--hn-emphasis-duration, 320ms)";
const EMPHASIS_EASE = "var(--hn-emphasis-easing, cubic-bezier(0.2, 0, 0, 1))";
const PULSE = "var(--hn-pulse-duration, 1600ms)";
const PULSE_EASE = "var(--hn-pulse-easing, cubic-bezier(0.4, 0, 0.6, 1))";
const SPIN = "var(--hn-spin-duration, 800ms)";

/** Each move: its keyframes, and its duration and easing in a loop and once. */
const MOVE_STYLE: Record<Move, { keyframes: string; duration: string; easing: string }> = {
  bob: {
    keyframes: "0%,100%{translate:0 0}50%{translate:0 -4px}",
    duration: `calc(${PULSE} * 1.5)`,
    easing: PULSE_EASE,
  },
  drift: {
    keyframes: "0%,100%{translate:0 0}50%{translate:-10px -3px}",
    duration: `calc(${PULSE} * 2)`,
    easing: PULSE_EASE,
  },
  spin: { keyframes: "to{rotate:45deg}", duration: `calc(${SPIN} * 3)`, easing: "linear" },
  "spin-back": { keyframes: "to{rotate:-90deg}", duration: `calc(${SPIN} * 3)`, easing: "linear" },
  blink: {
    keyframes: "50%{opacity:.35}",
    duration: PULSE,
    easing: PULSE_EASE,
  },
  // The shake fills the first quarter, then holds still: a beat of emphasis, then a rest.
  shake: {
    keyframes:
      "0%,25%,100%{translate:0 0}5%{translate:-3px 0}10%{translate:3px 0}15%{translate:-2px 0}20%{translate:2px 0}",
    duration: `calc(${EMPHASIS} * 6)`,
    easing: EMPHASIS_EASE,
  },
  pop: {
    keyframes: "0%{scale:.4;opacity:0}60%{scale:1.12}",
    duration: EMPHASIS,
    easing: EMPHASIS_EASE,
  },
  breathe: {
    keyframes: "0%,100%{scale:1}50%{scale:1.08}",
    duration: `calc(${PULSE} * 1.5)`,
    easing: PULSE_EASE,
  },
};

/**
 * The moves that turn or scale, so they need the part's centre as their origin. That origin
 * would also move a transform attribute's rotation, so a part drawn with one only takes the
 * other moves (tests/animated.test.tsx checks every recipe).
 */
export const CENTRED: ReadonlySet<Move> = new Set<Move>(["spin", "spin-back", "pop", "breathe"]);

/** How many top-level parts the entrance staggers; later ones enter with the last. */
const ENTER_PARTS = 12;

/** The animation name of a move, prefixed so it never meets an app's own keyframes. */
const name = (move: Move | "enter") => `hn-motif-${move}`;

const ACTIVE = ":not(:where([data-reduced-motion], [data-reduced-motion] *))";

function css(): string {
  const root = `svg[data-hn-motion]${ACTIVE}`;
  const rules: string[] = [
    `@keyframes ${name("enter")}{from{opacity:0;translate:0 6px}}`,
    ...MOVES.map((m) => `@keyframes ${name(m)}{${MOVE_STYLE[m].keyframes}}`),
    // The entrance only translates, so the origin stays the SVG's own and a part's transform
    // attribute (a rotated square, a slanted bar) keeps its place.
    `${root}>*{animation:${name("enter")} ${ENTER} ${ENTER_EASE} both}`,
  ];
  for (let i = 2; i <= ENTER_PARTS; i++) {
    rules.push(`${root}>:nth-child(${i}){animation-delay:calc(${i - 1} * ${STEP})}`);
  }
  for (const [set, recipes] of Object.entries(RECIPES)) {
    for (const state of STATE_MOTIFS) {
      const recipe = recipes[state];
      const sel = `svg[data-hn-motion="${animationKey(set, state)}"]${ACTIVE}`;
      for (const part of recipe.parts) {
        const style = MOVE_STYLE[part.move];
        const count = recipe.play === "loop" ? "infinite" : "1";
        const fill = recipe.play === "loop" ? "none" : "both";
        // The entrance plays first; the move starts once this part has entered.
        const enterDelay = `calc(${Math.min(part.child, ENTER_PARTS) - 1} * ${STEP})`;
        const delay = `calc(${ENTER} + ${enterDelay} + ${part.step ?? 0} * ${STEP})`;
        // A one-shot pop replaces the entrance of its part, so it starts with the others.
        const own =
          part.move === "pop" ? `calc(${enterDelay} + ${part.step ?? 0} * ${STEP})` : delay;
        const move = `${name(part.move)} ${style.duration} ${style.easing} ${own} ${count} ${fill}`;
        const animation =
          part.move === "pop"
            ? move
            : `${name("enter")} ${ENTER} ${ENTER_EASE} ${enterDelay} both,${move}`;
        // A turn or a scale goes about the part's own centre, the way the motif reads it.
        const origin = CENTRED.has(part.move)
          ? "transform-box:fill-box;transform-origin:center;"
          : "";
        rules.push(`${sel}>:nth-child(${part.child}){${origin}animation:${animation}}`);
      }
    }
  }
  return `@media (prefers-reduced-motion: no-preference){${rules.join("")}}`;
}

/**
 * The stylesheet every animated motif plays from, one copy for the page. AnimatedIllustration
 * renders it as a hoisted, deduplicated <style>; an app that serves its CSS as a file can write
 * this string into it instead.
 */
export const ANIMATION_CSS: string = css();
