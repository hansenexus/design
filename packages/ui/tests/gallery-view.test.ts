import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { ms } from "@hansenexus/tokens";
import { BUILD_THEMES, PACK_GROUPS, packOf } from "../gallery/themes";
import {
  comparedThemes,
  compareThemes,
  DEFAULT_VIEW,
  frameQuery,
  groupOf,
  installCommand,
  LOOP,
  LOOP_HOLD_MS,
  loopTimings,
  MATRIX_ROWS,
  matrixQuery,
  motionTokens,
  motionVariables,
  readCompare,
  readView,
  SCENE_GROUPS,
  SCENE_LABELS,
  SCENES,
  VIEW_OPTIONS,
  viewAttributes,
  writeView,
} from "../gallery/view";

describe("gallery view (#57)", () => {
  test("an empty query is the default view, kommandant dark", () => {
    expect(readView(new URLSearchParams())).toEqual(DEFAULT_VIEW);
  });

  test("unknown values fall back to the default, known ones are kept", () => {
    const view = readView(new URLSearchParams("theme=nope&density=touch&mode=light&viewport=390"));
    expect(view).toEqual({
      ...DEFAULT_VIEW,
      density: "touch",
      mode: "light",
      viewport: "390",
    });
  });

  test("writeView round-trips, drops defaults and keeps the scene", () => {
    const view = { ...DEFAULT_VIEW, theme: "portal" as const, viewport: "1280" as const };
    const q = writeView(new URLSearchParams("scene=loading&mode=light"), view);
    expect(q.toString()).toBe("scene=loading&theme=portal&viewport=1280");
    expect(readView(q)).toEqual(view);
  });

  test("the iframe query is framed, not bare, and has no viewport of its own", () => {
    const view = { ...DEFAULT_VIEW, mode: "light" as const, viewport: "390" as const };
    const q = frameQuery(new URLSearchParams("scene=loading&viewport=390"), view);
    expect(q.get("viewport")).toBeNull();
    expect(q.get("bare")).toBeNull();
    expect(q.get("frame")).toBe("1");
    expect(q.get("mode")).toBe("light");
    expect(q.get("scene")).toBe("loading");
  });

  test("density auto leaves data-density unset so the theme picks it", () => {
    expect(viewAttributes(DEFAULT_VIEW)).toEqual({
      theme: "kommandant",
      mode: "dark",
      density: null,
      motion: "default",
      reducedMotion: null,
    });
    expect(viewAttributes({ ...DEFAULT_VIEW, density: "compact" }).density).toBe("compact");
    // data-reduced-motion="" on <html> turns motion-reduce: on whatever the OS says (#91).
    expect(viewAttributes({ ...DEFAULT_VIEW, motion: "reduced" }).reducedMotion).toBe("");
  });

  test("the install command names the registry item", () => {
    expect(installCommand("skeleton")).toBe("/design add skeleton");
  });

  test("the theme list is every token theme, lexilink included (#62), each pack (design 143), then the live copies (design 149)", () => {
    expect(VIEW_OPTIONS.theme).toEqual([
      "hansenexus",
      "kommandant",
      "portal",
      "lexilink",
      "fachwerk",
      "lexilink@live",
      "fachwerk@live",
    ]);
    for (const theme of ["lexilink", "fachwerk", "fachwerk@live"]) {
      const view = { ...DEFAULT_VIEW, theme };
      const q = writeView(new URLSearchParams(), view);
      expect(q.get("theme")).toBe(theme);
      expect(readView(q)).toEqual(view);
      expect(viewAttributes(view).theme).toBe(theme);
    }
    expect(readView(new URLSearchParams("theme=nope")).theme).toBe(DEFAULT_VIEW.theme);
  });
});

describe("review tools (#60)", () => {
  // Every duration token's value as the built tokens.css declares it on :root.
  const css = readFileSync(require.resolve("@hansenexus/tokens/tokens.css"), "utf8");
  const declared = (name: string) => css.match(new RegExp(`${name}: (\\d+)ms;`))?.[1];

  test("compare, speed and motion round-trip through the query and default to off, 1, full", () => {
    expect(readView(new URLSearchParams("compare=maybe&speed=3&motion=none"))).toEqual(
      DEFAULT_VIEW
    );
    const view = { ...DEFAULT_VIEW, compare: "on", speed: "0.25" as const };
    const q = writeView(new URLSearchParams(), { ...view, motion: "reduced" });
    expect(q.toString()).toBe("compare=on&speed=0.25&motion=reduced");
    expect(readView(q)).toEqual({ ...view, motion: "reduced" });
  });

  test("the motion tokens are every duration variable tokens.css declares", () => {
    const names = motionTokens().map(([name]) => name);
    expect(names).toContain("--hn-delay-pending");
    expect(names).toContain("--hn-min-visible-pending");
    expect(names).toContain("--hn-spin-duration");
    for (const [name, value] of motionTokens()) expect(Number(declared(name))).toBe(value);
    const inCss = [...css.matchAll(/(--hn-[\w-]+): \d+ms;/g)].map((m) => m[1] ?? "");
    expect(new Set(names)).toEqual(new Set(inCss));
  });

  test("speed 1 with full motion sets nothing, so the tokens' own values apply", () => {
    expect(motionVariables(DEFAULT_VIEW)).toEqual({});
  });

  test("at 0.25x every motion token duration is multiplied by 4", () => {
    const vars = motionVariables({ speed: "0.25", motion: "full" });
    expect(Object.keys(vars).length).toBe(motionTokens().length);
    for (const [name, value] of motionTokens()) expect(vars[name]).toBe(`${value * 4}ms`);
    expect(vars["--hn-delay-pending"]).toBe("800ms");
    expect(motionVariables({ speed: "0.5", motion: "full" })["--hn-spin-duration"]).toBe("1600ms");
  });

  test("reduced motion resolves every duration to 0, at any speed", () => {
    for (const speed of ["1", "0.25"] as const) {
      const vars = motionVariables({ speed, motion: "reduced" });
      expect(Object.keys(vars).length).toBe(motionTokens().length);
      for (const value of Object.values(vars)) expect(value).toBe("0ms");
    }
  });

  test("the auto-loop cycles loading, empty, error and success on the motion-token timings", () => {
    expect(LOOP).toEqual(["loading", "empty", "error", "data"]);
    const at1 = loopTimings(DEFAULT_VIEW);
    expect(ms.delay.pending).toBe(200);
    expect(ms["min-visible"].pending).toBe(400);
    expect(at1.delayMs).toBe(200);
    expect(at1.minVisibleMs).toBe(400);
    expect(at1.steps).toEqual([
      { status: "loading", ms: 600 },
      { status: "empty", ms: LOOP_HOLD_MS },
      { status: "error", ms: LOOP_HOLD_MS },
      { status: "data", ms: LOOP_HOLD_MS },
    ]);
    const slow = loopTimings({ speed: "0.25", motion: "full" });
    expect(slow.delayMs).toBe(800);
    expect(slow.minVisibleMs).toBe(1600);
    expect(slow.steps[0]?.ms).toBe(2400);
  });

  test("under reduced motion the indicator has no delay or minimum, but the loop still holds", () => {
    const reduced = loopTimings({ speed: "1", motion: "reduced" });
    expect(reduced.delayMs).toBe(0);
    expect(reduced.minVisibleMs).toBe(0);
    for (const step of reduced.steps) expect(step.ms).toBeGreaterThan(0);
  });
});

describe("pack switcher and compare (design#149)", () => {
  test("each theme belongs to one pack, its live copy to the same", () => {
    expect(packOf("kommandant")).toBe("core");
    expect(packOf("lexilink")).toBe("lexilink");
    expect(packOf("fachwerk")).toBe("fachwerk");
    expect(packOf("fachwerk@live")).toBe("fachwerk");
    expect(packOf("fachwerk-blueprint")).toBe("fachwerk");
    expect(PACK_GROUPS.map((g) => g.pack)).toEqual(["core", "lexilink", "fachwerk"]);
    expect(PACK_GROUPS.find((g) => g.pack === "fachwerk")?.directions).toEqual([
      "fachwerk",
      "fachwerk@live",
    ]);
    expect(PACK_GROUPS.find((g) => g.pack === "core")?.directions).toEqual([
      "hansenexus",
      "kommandant",
      "portal",
    ]);
  });

  test("compare is off, on (every theme of this build), or a list of known themes", () => {
    expect(readCompare(null)).toBe("off");
    expect(readCompare("on")).toBe("on");
    expect(readCompare("nope")).toBe("off");
    expect(readCompare("fachwerk,nope,lexilink,fachwerk")).toBe("fachwerk,lexilink");
    expect(compareThemes({ compare: "on" })).toEqual([...BUILD_THEMES]);
    expect(BUILD_THEMES.some((t) => t.endsWith("@live"))).toBe(false);
    expect(compareThemes({ compare: "off" })).toEqual([]);
    expect(compareThemes({ compare: "fachwerk,fachwerk@live" })).toEqual([
      "fachwerk",
      "fachwerk@live",
    ]);
  });

  test("the compared themes start with the current one, without repeats", () => {
    const view = { ...DEFAULT_VIEW, theme: "fachwerk", compare: "lexilink,fachwerk,fachwerk@live" };
    expect(comparedThemes(view)).toEqual(["fachwerk", "lexilink", "fachwerk@live"]);
    expect(comparedThemes({ ...view, compare: "off" })).toEqual(["fachwerk"]);
    const q = writeView(new URLSearchParams(), view);
    expect(q.get("compare")).toBe("lexilink,fachwerk,fachwerk@live");
    expect(readView(q)).toEqual(view);
  });

  test("the matrix is light and dark at 1280 and 390, and round-trips", () => {
    expect(MATRIX_ROWS.map((r) => `${r.mode}@${r.width}`)).toEqual([
      "light@1280",
      "dark@1280",
      "light@390",
      "dark@390",
    ]);
    expect(readView(new URLSearchParams("matrix=maybe")).matrix).toBe("off");
    const view = { ...DEFAULT_VIEW, matrix: "on" as const };
    expect(readView(writeView(new URLSearchParams(), view))).toEqual(view);
  });

  test("a matrix cell is the page alone, in its theme and mode, with no compare or matrix", () => {
    const view = {
      ...DEFAULT_VIEW,
      theme: "fachwerk",
      viewport: "390" as const,
      compare: "lexilink",
      matrix: "on" as const,
      density: "compact" as const,
    };
    const q = matrixQuery(
      new URLSearchParams(
        "scene=screens&screen=example/machines&frame=1&compare=lexilink&matrix=on"
      ),
      view,
      "lexilink@live",
      "light"
    );
    expect(q.get("bare")).toBe("1");
    expect(q.get("frame")).toBeNull();
    expect(q.get("theme")).toBe("lexilink@live");
    expect(q.get("mode")).toBe("light");
    expect(q.get("density")).toBe("compact");
    expect(q.get("viewport")).toBeNull();
    expect(q.get("compare")).toBeNull();
    expect(q.get("matrix")).toBeNull();
    expect(q.get("scene")).toBe("screens");
    expect(q.get("screen")).toBe("example/machines");
  });
});

describe("workbench tree (design#162)", () => {
  test("every scene sits in exactly one group", () => {
    const grouped = SCENE_GROUPS.flatMap((g) => g.scenes);
    expect([...grouped].sort()).toEqual([...SCENES].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
    for (const scene of SCENES) expect(groupOf(scene)?.scenes).toContain(scene);
  });

  test("every scene has a label, and group ids are unique", () => {
    for (const scene of SCENES) expect(SCENE_LABELS[scene]).toBeTruthy();
    const ids = SCENE_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
