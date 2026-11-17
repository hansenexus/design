// design#221: motion sets in @hansenexus/ui and the gallery. motionMs and the choreography read a
// set's values; the view's motionSet round-trips through the query and follows the pack's
// default on "auto"; reduced motion zeroes every set; the Motion scene renders under every set.
import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { motionSetIds, motionSets, ms } from "@hansenexus/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CHOREO_ROWS,
  choreoTransition,
  flowsFor,
  motionScene,
  paletteSheetFlow,
} from "../gallery/motion";
import { Motion, otherSet } from "../gallery/motion-scene";
import { motionSetLabel, ViewProvider } from "../gallery/preview";
import { PACK_APPS, PACK_MOTION } from "../gallery/themes";
import {
  activeMotionSet,
  DEFAULT_VIEW,
  loopTimings,
  MOTION_SETS,
  motionTokens,
  motionVariables,
  readView,
  VIEW_OPTIONS,
  viewAttributes,
  writeView,
} from "../gallery/view";
import { choreography, motionMs } from "../src";

const SETS = [...motionSetIds] as string[];
type SetMs = Record<string, Record<string, number>>;
const setMs = (id: string) => motionSets[id as keyof typeof motionSets].ms as unknown as SetMs;

describe("motionMs and the choreography read a motion set", () => {
  test("without a set, or with default or an unknown id, the tokens as they are", () => {
    expect(motionMs(1, "default")).toEqual(ms);
    expect(motionMs(1, "nope")).toEqual(ms);
    expect(motionMs(1, undefined)).toEqual(ms);
  });

  test("every set, at every scale", () => {
    for (const id of SETS)
      for (const scale of [1, 4, 0]) {
        const got = motionMs(scale, id) as unknown as SetMs;
        for (const [group, values] of Object.entries(setMs(id)))
          for (const [key, value] of Object.entries(values))
            expect(got[group]?.[key]).toBe(value * scale);
      }
  });

  test("the choreography is enter, exit, stagger and emphasis of the set", () => {
    for (const id of SETS) {
      const c = choreography(1, id);
      const m = setMs(id);
      expect(c.enter).toEqual({ ms: m.enter?.duration ?? -1, easing: "var(--hn-enter-easing)" });
      expect(c.exit.ms).toBe(m.exit?.duration ?? -1);
      expect(c.emphasis.ms).toBe(m.emphasis?.duration ?? -1);
      expect(c.stagger.ms).toBe(m.stagger?.step ?? -1);
      expect(c.stagger.delay(3)).toBe(3 * (m.stagger?.step ?? -1));
    }
    expect(choreography(0, "calm").enter.ms).toBe(0);
  });
});

describe("the view's motion set (design#221)", () => {
  afterEach(() => {
    for (const app of PACK_APPS) delete PACK_MOTION[app];
  });

  test("auto first, then every set; auto is the default and stays out of the query", () => {
    expect(MOTION_SETS).toEqual(["auto", ...SETS]);
    expect(VIEW_OPTIONS.motionSet).toBe(MOTION_SETS);
    expect(DEFAULT_VIEW.motionSet).toBe("auto");
    expect(writeView(new URLSearchParams(), DEFAULT_VIEW).has("motionSet")).toBe(false);
  });

  test("every set round-trips through the query; an unknown one is auto", () => {
    for (const id of SETS) {
      const view = { ...DEFAULT_VIEW, motionSet: id };
      const q = writeView(new URLSearchParams(), view);
      expect(q.get("motionSet")).toBe(id);
      expect(readView(q)).toEqual(view);
    }
    expect(readView(new URLSearchParams("motionSet=wobbly")).motionSet).toBe("auto");
  });

  test("auto follows the pack's default, else default; a picked set wins over the pack", () => {
    expect(activeMotionSet({ ...DEFAULT_VIEW, theme: "fachwerk" })).toBe("default");
    PACK_MOTION.fachwerk = "calm";
    expect(activeMotionSet({ ...DEFAULT_VIEW, theme: "fachwerk" })).toBe("calm");
    expect(activeMotionSet({ ...DEFAULT_VIEW, theme: "fachwerk@live" })).toBe("calm");
    expect(activeMotionSet({ ...DEFAULT_VIEW, theme: "kommandant" })).toBe("default");
    expect(activeMotionSet({ ...DEFAULT_VIEW, theme: "fachwerk", motionSet: "snappy" })).toBe(
      "snappy"
    );
    expect(motionSetLabel("auto", { theme: "fachwerk" })).toBe("auto (Calm)");
  });

  test("PACK_MOTION is every pack.json's motion", () => {
    for (const app of PACK_APPS) {
      const url = new URL(`../../../themes/${app}/pack.json`, import.meta.url);
      const manifest = JSON.parse(readFileSync(url, "utf8")) as { motion?: string };
      expect({ app, motion: PACK_MOTION[app] }).toEqual({ app, motion: manifest.motion });
    }
    for (const app of Object.keys(PACK_MOTION)) expect(PACK_APPS).toContain(app);
  });

  test("data-motion carries the active set", () => {
    expect(viewAttributes(DEFAULT_VIEW).motion).toBe("default");
    expect(viewAttributes({ ...DEFAULT_VIEW, motionSet: "snappy" }).motion).toBe("snappy");
  });

  test("speed scales the active set's durations; at 1x the attribute alone applies", () => {
    for (const id of SETS) {
      const view = { ...DEFAULT_VIEW, motionSet: id };
      expect(motionVariables(view)).toEqual({});
      const slow = motionVariables({ ...view, speed: "0.25" });
      for (const [name, value] of motionTokens(1, id)) expect(slow[name]).toBe(`${value * 4}ms`);
    }
    expect(motionVariables({ ...DEFAULT_VIEW, speed: "0.5", motionSet: "calm" })).toHaveProperty(
      "--hn-duration-base",
      "600ms"
    );
  });

  test("reduced motion keeps winning over every set", () => {
    for (const id of SETS) {
      const vars = motionVariables({ ...DEFAULT_VIEW, motionSet: id, motion: "reduced" });
      expect(Object.keys(vars).length).toBe(motionTokens().length);
      for (const value of Object.values(vars)) expect(value).toBe("0ms");
      const view = { ...DEFAULT_VIEW, motionSet: id, motion: "reduced" as const };
      expect(viewAttributes(view).reducedMotion).toBe("");
      expect(loopTimings(view).delayMs).toBe(0);
    }
  });

  test("the auto-loop's pending timings follow the set", () => {
    const calm = loopTimings({ ...DEFAULT_VIEW, motionSet: "calm" });
    expect(calm.delayMs).toBe(setMs("calm").delay?.pending ?? -1);
    expect(calm.minVisibleMs).toBe(setMs("calm")["min-visible"]?.pending ?? -1);
  });
});

describe("the Motion scene covers every set (design#221)", () => {
  test("the token groups show the set's durations and easings", () => {
    for (const id of SETS) {
      const easing = motionSets[id as keyof typeof motionSets].easing as Record<string, unknown>;
      for (const group of motionScene(id)) {
        for (const d of group.durations) {
          const [a = "", b = ""] = d.path.split(".");
          expect(d.ms).toBe(setMs(id)[a]?.[b] ?? -1);
        }
        if (group.easing) expect(group.easing.value).toEqual(easing[group.name] as never);
      }
    }
  });

  test("the scripted flow holds the set's enter on the steps that open something", () => {
    for (const id of SETS) {
      const enter = setMs(id).enter?.duration ?? -1;
      const steps = paletteSheetFlow(id).steps;
      expect(steps[1]?.ms).toBe(enter + 800);
      expect(steps.at(-1)?.ms).toBe(enter + 1600);
      expect(flowsFor(id)[0].steps).toEqual(steps);
    }
  });

  test("rows enter one stagger step apart and leave together", () => {
    expect(choreoTransition(0, true)).toContain("calc(0 * var(--hn-stagger-step))");
    expect(choreoTransition(2, true)).toContain(
      "opacity var(--hn-enter-duration) var(--hn-enter-easing) calc(2 * var(--hn-stagger-step))"
    );
    expect(choreoTransition(2, false)).not.toContain("stagger");
    expect(choreoTransition(2, false)).toContain("var(--hn-exit-duration) var(--hn-exit-easing)");
    expect(choreoTransition(1, true)).toContain("scale var(--hn-emphasis-duration)");
  });

  test("the compare card starts against another set", () => {
    for (const id of SETS) expect(otherSet(id)).not.toBe(id);
  });

  test("the scene renders under every set: its values, the choreography, both compare sides", () => {
    for (const id of SETS) {
      const html = renderToStaticMarkup(
        <ViewProvider view={{ ...DEFAULT_VIEW, motionSet: id }}>
          <Motion />
        </ViewProvider>
      );
      expect(html).toContain(`data-active-set="${id}"`);
      expect(html).toContain(`${setMs(id).duration?.base}ms`);
      for (const row of CHOREO_ROWS) expect(html).toContain(`data-choreo-row="${row}"`);
      expect(html).toContain(`data-compare-set="${id}"`);
      expect(html).toContain(`data-compare-set="${otherSet(id)}"`);
      expect(html).toContain(`enter ${setMs(id).enter?.duration} · stagger`);
    }
  });
});
