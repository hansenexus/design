// The motion scene's model (hansenexus/design#61): the motion tokens read straight from their DTCG
// source, so the scene cannot miss one, and the scripted-flow timeline. Pure functions, so
// tests/gallery-motion.test.ts covers them without a DOM.
//
// Flow format, decided for #61: a hand-written step list, each step a label, a hold in ms and the
// whole state the stage renders at that step. The stage is a function of the step, so scrubbing
// is a lookup and replay is t = 0. Recording from Playwright was rejected: it needs a recorder and
// a mapping from DOM events back to component props, and a recording breaks when a label changes.

import motion from "@hansenexus/tokens/tokens/semantic/motion.json";
import scale from "@hansenexus/tokens/tokens/semantic/scale.json";
import { motionMs } from "../src/motion";
import type { View } from "./view";

export type Bezier = readonly [number, number, number, number];

export type DurationToken = {
  /** Dotted token path, e.g. delay.pending. */
  path: string;
  cssVar: string;
  ms: number;
  description?: string;
};

/** One token group: its durations, and its easing when the group has one. */
export type MotionGroup = {
  name: string;
  /** The source file under packages/tokens/tokens. */
  source: string;
  durations: DurationToken[];
  easing?: { path: string; cssVar: string; value: Bezier; description?: string };
};

type Node = { $type?: string; $value?: unknown; $description?: string; [key: string]: unknown };

const cssVar = (path: string[]) => `--hn-${path.join("-")}`;

/** "200ms" or "0.2s" in milliseconds, as the tokens build reads them. */
function durationMs(value: unknown): number {
  const m = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(String(value));
  if (!m?.[1]) throw new Error(`motion: ${String(value)} is not a ms or s duration`);
  return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
}

/** Every token of one DTCG tree as [path, $type, node], with $type inherited from the group. */
function leaves(node: Node, path: string[] = [], type?: string): [string[], string, Node][] {
  const own = node.$type ?? type;
  if ("$value" in node) return [[path, own ?? "", node]];
  return Object.entries(node)
    .filter(([key]) => !key.startsWith("$"))
    .flatMap(([key, child]) => leaves(child as Node, [...path, key], own));
}

/** The groups of one token file, in source order: one per top-level key. */
export function motionGroups(tree: Node, source: string): MotionGroup[] {
  return Object.entries(tree)
    .filter(([key]) => !key.startsWith("$"))
    .map(([name, node]) => {
      const group: MotionGroup = { name, source, durations: [] };
      for (const [path, type, leaf] of leaves(node as Node, [name], (node as Node).$type)) {
        if (type === "duration")
          group.durations.push({
            path: path.join("."),
            cssVar: cssVar(path),
            ms: durationMs(leaf.$value),
            description: leaf.$description,
          });
        else if (type === "cubicBezier")
          group.easing = {
            path: path.join("."),
            cssVar: cssVar(path),
            value: leaf.$value as unknown as Bezier,
            description: leaf.$description,
          };
      }
      return group;
    });
}

/**
 * What the scene shows: every group of semantic/motion.json, then the transition durations of
 * semantic/scale.json that the primitives and the scripted flow use.
 */
export function motionScene(): MotionGroup[] {
  return [
    ...motionGroups(motion as Node, "semantic/motion.json"),
    ...motionGroups({ duration: scale.duration } as Node, "semantic/scale.json"),
  ];
}

/** The CSS form of a cubicBezier token. */
export function bezierCss([x1, y1, x2, y2]: Bezier): string {
  return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
}

/** A group without an easing token is drawn and played linear. */
export const LINEAR: Bezier = [0, 0, 1, 1];

/**
 * An SVG path for the curve in a size × size box: time runs right, progress up, so the path starts
 * bottom-left and ends top-right.
 */
export function bezierPath([x1, y1, x2, y2]: Bezier, size: number): string {
  const x = (v: number) => +(v * size).toFixed(2);
  const y = (v: number) => +((1 - v) * size).toFixed(2);
  return `M0,${size} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${size},0`;
}

// The scripted-flow timeline.

export type FlowStep<S> = {
  label: string;
  /** How long the step holds at speed 1, before the next one starts. */
  ms: number;
  state: S;
};

export type Flow<S> = { id: string; title: string; steps: FlowStep<S>[] };

/**
 * How fast a flow runs at this view: 1 / speed. Reduced motion does not stop the flow, as the
 * auto-loop does not stop either; it zeroes the token durations, so the steps cut instead of
 * slide.
 */
export function flowPace(view: Pick<View, "speed">): number {
  return 1 / Number(view.speed);
}

/** When each step starts, in ms at this pace, plus the total as the last entry. */
export function flowMarks(steps: FlowStep<unknown>[], pace = 1): number[] {
  const marks = [0];
  for (const step of steps) marks.push((marks.at(-1) ?? 0) + step.ms * pace);
  return marks;
}

/** The step on screen at time t; past the end, the last one stays. */
export function stepAt(steps: FlowStep<unknown>[], t: number, pace = 1): number {
  const marks = flowMarks(steps, pace);
  for (let i = steps.length - 1; i > 0; i--) if (t >= (marks[i] ?? 0)) return i;
  return 0;
}

/** What the palette-to-sheet flow's stage shows at one step. */
export type PaletteSheetState = {
  palette: boolean;
  query: string;
  /** The machine whose sheet is open. */
  sheet: string | null;
};

const ms = motionMs();

/**
 * The flow of #61: open the command palette, narrow it to one machine, pick it, and its sheet
 * slides in. Steps that open something hold duration.base (the palette and panel token) on top
 * of the time to read them.
 */
export const PALETTE_SHEET_FLOW: Flow<PaletteSheetState> = {
  id: "palette-sheet",
  title: "Scripted flow: ⌘K, pick a machine, its sheet slides in",
  steps: [
    { label: "Page at rest", ms: 600, state: { palette: false, query: "", sheet: null } },
    {
      label: "⌘K opens the palette",
      ms: ms.duration.base + 800,
      state: { palette: true, query: "", sheet: null },
    },
    { label: "Type “kran”", ms: 800, state: { palette: true, query: "kran", sheet: null } },
    {
      label: "Narrow to “kran-04”",
      ms: 800,
      state: { palette: true, query: "kran-04", sheet: null },
    },
    {
      label: "Enter picks kran-04, its sheet slides in",
      ms: ms.duration.base + 1600,
      state: { palette: false, query: "kran-04", sheet: "kran-04" },
    },
  ],
};

/** The flows the scene ships. */
export const FLOWS = [PALETTE_SHEET_FLOW] as const;
