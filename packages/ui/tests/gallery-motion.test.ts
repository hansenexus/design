import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ms } from "@hansenexus/tokens";
import {
  bezierCss,
  bezierPath,
  FLOWS,
  flowMarks,
  flowPace,
  motionGroups,
  motionScene,
  PALETTE_SHEET_FLOW,
  stepAt,
} from "../gallery/motion";
import { SCENES } from "../gallery/view";

const MOTION = JSON.parse(
  readFileSync(new URL("../../tokens/tokens/semantic/motion.json", import.meta.url), "utf8")
);

/** Every token path in a DTCG tree. */
function paths(node: Record<string, unknown>, at: string[] = []): string[] {
  if ("$value" in node) return [at.join(".")];
  return Object.entries(node)
    .filter(([k]) => !k.startsWith("$"))
    .flatMap(([k, v]) => paths(v as Record<string, unknown>, [...at, k]));
}

describe("motion scene (#61)", () => {
  test("the scene is linked from the nav", () => {
    expect(SCENES).toContain("motion");
  });

  test("every token of semantic/motion.json is in the scene", () => {
    const shown = motionScene()
      .filter((g) => g.source === "semantic/motion.json")
      .flatMap((g) => [...g.durations.map((d) => d.path), ...(g.easing ? [g.easing.path] : [])]);
    expect(shown.sort()).toEqual(paths(MOTION).sort());
  });

  test("durations match the ms export and name the variables the gallery scales", () => {
    for (const group of motionScene())
      for (const d of group.durations) {
        const [a = "", b = ""] = d.path.split(".");
        expect(d.ms).toBe((ms as unknown as Record<string, Record<string, number>>)[a]?.[b] ?? -1);
        expect(d.cssVar).toBe(`--hn-${a}-${b}`);
      }
  });

  test("a group keeps its easing, a group without one has none", () => {
    const [pulse] = motionGroups(
      {
        pulse: {
          duration: { $type: "duration", $value: "1.6s" },
          easing: { $type: "cubicBezier", $value: [0.4, 0, 0.6, 1] },
        },
      },
      "x.json"
    );
    expect(pulse?.durations[0]?.ms).toBe(1600);
    expect(pulse?.easing?.cssVar).toBe("--hn-pulse-easing");
    expect(bezierCss(pulse?.easing?.value ?? [0, 0, 0, 0])).toBe("cubic-bezier(0.4, 0, 0.6, 1)");
    const delay = motionScene().find((g) => g.name === "delay");
    expect(delay?.easing).toBeUndefined();
  });

  test("the curve runs bottom-left to top-right through the control points", () => {
    expect(bezierPath([0.4, 0, 0.2, 1], 100)).toBe("M0,100 C40,100 20,0 100,0");
  });
});

describe("scripted flow (#61)", () => {
  const steps = PALETTE_SHEET_FLOW.steps;

  test("at least one flow ships: palette, pick, sheet", () => {
    expect(FLOWS.length).toBeGreaterThanOrEqual(1);
    expect(steps[0]?.state).toEqual({ palette: false, query: "", sheet: null });
    expect(steps.some((s) => s.state.palette)).toBe(true);
    expect(steps.at(-1)?.state).toEqual({ palette: false, query: "kran-04", sheet: "kran-04" });
  });

  test("marks are cumulative and scale with the pace", () => {
    const marks = flowMarks(steps);
    expect(marks[0]).toBe(0);
    expect(marks.at(-1)).toBe(steps.reduce((sum, s) => sum + s.ms, 0));
    expect(flowMarks(steps, 4).at(-1)).toBe((marks.at(-1) ?? 0) * 4);
  });

  test("stepAt runs the steps in order and holds the last past the end", () => {
    const marks = flowMarks(steps);
    steps.forEach((_, i) => {
      expect(stepAt(steps, marks[i] ?? 0)).toBe(i);
      expect(stepAt(steps, (marks[i + 1] ?? 0) - 1)).toBe(i);
    });
    expect(stepAt(steps, -5)).toBe(0);
    expect(stepAt(steps, 1e9)).toBe(steps.length - 1);
  });

  test("the pace is 1 / speed", () => {
    expect(flowPace({ speed: "1" })).toBe(1);
    expect(flowPace({ speed: "0.25" })).toBe(4);
  });
});
