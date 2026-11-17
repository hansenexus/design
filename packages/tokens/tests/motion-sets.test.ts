// design#221: motion sets resolve over the motion tokens, every set redeclares every motion
// variable under [data-motion], and a set that names a wrong token or value fails the build.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { motionSetIds, motionSets, ms } from "../dist/index.js";
import {
  isMotionToken,
  MOTION_SETS_DIR,
  readMotionSets,
  resolveMotionSet,
  resolveMotionSets,
} from "../scripts/motion-sets";
import {
  allThemes,
  DEFAULT_MODE,
  DEFAULT_THEME,
  MODES,
  packThemes,
  resolveTokens,
} from "../scripts/resolve";

const base = await resolveTokens(DEFAULT_THEME, DEFAULT_MODE);
const motion = base.filter(isMotionToken);
const sets = await resolveMotionSets();

/** A scratch motion-sets/ folder: { "sets.json": {...}, "x.json": {...} }. */
function scratch(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-motion-sets-"));
  for (const [name, json] of Object.entries(files))
    writeFileSync(join(dir, name), JSON.stringify(json));
  return dir;
}

describe("motion sets (design#221)", () => {
  test("at least default, calm and snappy, default first", () => {
    expect(sets.map((s) => s.id).slice(0, 1)).toEqual(["default"]);
    expect(sets.map((s) => s.id)).toEqual(expect.arrayContaining(["default", "calm", "snappy"]));
  });

  test("the choreography patterns are motion tokens: enter, exit, stagger, emphasis", () => {
    const paths = motion.map((t) => t.path);
    for (const p of ["enter.duration", "enter.easing", "exit.duration", "exit.easing"])
      expect(paths).toContain(p);
    expect(paths).toContain("stagger.step");
    expect(paths).toContain("emphasis.duration");
  });

  test("the default set is the tokens as they are", () => {
    const def = sets.find((s) => s.id === "default");
    expect(def?.tokens).toEqual(motion);
  });

  test("every set gives every motion token a value of its type", () => {
    for (const set of sets) {
      expect(set.tokens.map((t) => t.path)).toEqual(motion.map((t) => t.path));
      for (const t of set.tokens) {
        if (t.type === "duration") expect(t.value).toMatch(/^\d+(\.\d+)?(ms|s)$/);
        else expect(t.value).toMatch(/^cubic-bezier\(/);
      }
    }
  });

  test("a set overrides only what it names", () => {
    const set = resolveMotionSet(
      "x",
      { label: "X", values: { "duration.fast": "90ms", "enter.easing": [0.1, 0, 0.3, 1] } },
      base
    );
    const by = new Map(set.tokens.map((t) => [t.path, t.value]));
    expect(by.get("duration.fast")).toBe("90ms");
    expect(by.get("enter.easing")).toBe("cubic-bezier(0.1, 0, 0.3, 1)");
    expect(by.get("duration.base")).toBe(motion.find((t) => t.path === "duration.base")?.value);
  });

  test("a wrong path or value fails", () => {
    const set = (values: Record<string, unknown>) => () =>
      resolveMotionSet("x", { label: "X", values }, base);
    expect(set({ "duration.quick": "90ms" })).toThrow("duration.quick is not a motion token");
    expect(set({ "color.ink": "#000" })).toThrow("is not a motion token");
    expect(set({ "duration.fast": "fast" })).toThrow("needs a ms or s duration");
    expect(set({ "enter.easing": [0, 0, 1] })).toThrow("needs four numbers");
    expect(set({ "enter.easing": [1.2, 0, 0, 1] })).toThrow("x1 and x2 within 0..1");
  });

  test("the registry and the files agree", () => {
    expect(readMotionSets().map(([id]) => id)).toEqual(sets.map((s) => s.id));
    const def = { label: "Default", values: {} };
    expect(() =>
      readMotionSets(
        scratch({ "sets.json": { sets: ["default"] }, "default.json": def, "stray.json": def })
      )
    ).toThrow("stray.json is not in sets.json");
    expect(() =>
      readMotionSets(scratch({ "sets.json": { sets: ["default", "gone"] }, "default.json": def }))
    ).toThrow("gone has no gone.json");
    expect(() =>
      readMotionSets(scratch({ "sets.json": { sets: ["calm"] }, "calm.json": def }))
    ).toThrow("the first set is default");
    expect(() =>
      readMotionSets(
        scratch({
          "sets.json": { sets: ["default"] },
          "default.json": { label: "D", values: { "duration.fast": "1ms" } },
        })
      )
    ).toThrow("default gives no values");
  });

  test("the set files sit in tokens/motion-sets", () => {
    const { sets: ids } = JSON.parse(readFileSync(join(MOTION_SETS_DIR, "sets.json"), "utf8"));
    expect(ids).toEqual(sets.map((s) => s.id));
  });
});

describe("motion sets in dist (design#221)", () => {
  const css = readFileSync(join(import.meta.dir, "../dist/tokens.css"), "utf8");

  test("every set is a [data-motion] block with every motion variable", () => {
    for (const set of sets) {
      const block = css.split(`[data-motion="${set.id}"] {`)[1]?.split("}")[0] ?? "";
      for (const t of set.tokens) expect(block).toContain(`${t.cssVar}: ${t.value};`);
    }
  });

  test("the TS constants carry each set in the shape of ms", () => {
    expect([...motionSetIds] as string[]).toEqual(sets.map((s) => s.id));
    expect(motionSets.default.ms).toEqual(ms);
    expect(motionSets.calm.ms.duration.base).toBe(300);
    expect(motionSets.snappy.easing.emphasis).toEqual([0.34, 1.56, 0.64, 1]);
    expect(motionSets.calm.vars["--hn-enter-duration"]).toBe("320ms");
  });
});

describe("pack.json motion (design#221)", () => {
  function pack(manifest: Record<string, unknown>) {
    const dir = mkdtempSync(join(tmpdir(), "hn-packs-"));
    mkdirSync(join(dir, "acme/bold"), { recursive: true });
    writeFileSync(join(dir, "acme/pack.json"), JSON.stringify(manifest));
    writeFileSync(join(dir, "acme/bold/tokens.json"), "{}");
    return dir;
  }

  test("a pack may name a default motion set", () => {
    const [theme] = packThemes(pack({ app: "acme", default: "bold", motion: "calm" }));
    expect(theme?.motion).toBe("calm");
    const [plain] = packThemes(pack({ app: "acme", default: "bold" }));
    expect(plain?.motion).toBeUndefined();
  });

  test("no pack or core theme overrides a motion token: a set is how motion changes", async () => {
    for (const theme of allThemes())
      for (const mode of MODES) {
        const own = (await resolveTokens(theme, mode)).filter(isMotionToken);
        expect({ theme, values: own.map((t) => t.value) }).toEqual({
          theme,
          values: motion.map((t) => t.value),
        });
      }
  });

  test("a set that does not exist fails", () => {
    expect(() => packThemes(pack({ app: "acme", default: "bold", motion: "wobbly" }))).toThrow(
      "names motion set wobbly, which is no set"
    );
  });
});
