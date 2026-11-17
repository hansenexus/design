// The illustration sets (design#220): the registry of src/sets.ts, the pack defaults that name
// its sets, and StateIllustration drawing the active set's state motifs.
import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FAMILIES } from "../scripts/motifs";
import {
  DEFAULT_SET,
  isSetId,
  motifPath,
  SET_IDS,
  SETS,
  type SetId,
  STATE_MOTIFS,
  setFor,
} from "../src/sets";
import {
  IllustrationSetProvider,
  STATE_ILLUSTRATIONS,
  StateIllustration,
  useIllustrationSet,
} from "../src/state";

const ROOT = resolve(import.meta.dir, "..");
const THEMES = resolve(ROOT, "../../themes");

const html = (node: ReactNode) => renderToStaticMarkup(node as never);

describe("the set registry", () => {
  test("estate and school are the first two sets, estate the default", () => {
    expect(SET_IDS.slice(0, 2)).toEqual(["estate", "school"]);
    expect(DEFAULT_SET).toBe("estate");
    expect(SET_IDS[0]).toBe(DEFAULT_SET);
    expect(new Set(SET_IDS).size).toBe(SET_IDS.length);
  });

  test("every set has an id, a label, a description and a folder of its own", () => {
    const folders = SETS.map((s) => s.folder);
    expect(new Set(folders).size).toBe(folders.length);
    for (const set of SETS) {
      expect(set.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(set.label.length).toBeGreaterThan(0);
      expect(set.description.length).toBeGreaterThan(0);
      expect(existsSync(resolve(ROOT, "src", set.folder))).toBe(true);
    }
  });

  test("every set covers the eight state motifs, each a file of its folder", () => {
    for (const set of SETS) {
      const ids = Object.keys(set.motifs);
      for (const state of STATE_MOTIFS) expect(ids).toContain(state);
      for (const id of ids) {
        expect(existsSync(resolve(ROOT, "src", `${motifPath(set, id)}.tsx`))).toBe(true);
      }
    }
  });

  test("the build's families are the sets, folder by folder", () => {
    expect(FAMILIES).toEqual(Object.fromEntries(SETS.map((s) => [s.folder, s.motifs])));
  });

  test("isSetId and setFor", () => {
    expect(isSetId("school")).toBe(true);
    expect(isSetId("fachwerk")).toBe(false);
    expect(isSetId(undefined)).toBe(false);
    expect(setFor("school").folder).toBe("school");
    expect(setFor("nope").id).toBe(DEFAULT_SET);
    expect(setFor(null).id).toBe(DEFAULT_SET);
    expect(motifPath(setFor("estate"), "404")).toBe("404");
    expect(motifPath(setFor("school"), "404")).toBe("school/404");
  });

  test("sets.ts is data only: no import, so Node and the gallery view load it bare", () => {
    expect(readFileSync(resolve(ROOT, "src/sets.ts"), "utf8")).not.toMatch(/^import /m);
  });
});

describe("pack defaults (pack.json illustrations)", () => {
  const packs = readdirSync(THEMES)
    .filter((app) => existsSync(resolve(THEMES, app, "pack.json")))
    .map((app) => JSON.parse(readFileSync(resolve(THEMES, app, "pack.json"), "utf8")));

  test("every pack that names a set names a registered one", () => {
    for (const pack of packs) {
      if (pack.illustrations !== undefined) expect(SET_IDS).toContain(pack.illustrations);
    }
  });

  test("fachwerk defaults to school, lexilink to estate", () => {
    const of = (app: string) => packs.find((p) => p.app === app)?.illustrations;
    expect(of("fachwerk")).toBe("school");
    expect(of("lexilink")).toBe("estate");
  });
});

describe("StateIllustration", () => {
  test("has every state of every set, each the set's own component", async () => {
    expect(Object.keys(STATE_ILLUSTRATIONS).sort()).toEqual([...SET_IDS].sort());
    for (const set of SETS) {
      const states = STATE_ILLUSTRATIONS[set.id as SetId];
      expect(Object.keys(states).sort()).toEqual([...STATE_MOTIFS].sort());
      for (const state of STATE_MOTIFS) {
        const mod = await import(resolve(ROOT, "src", `${motifPath(set, state)}.tsx`));
        expect(states[state]).toBe(mod[set.motifs[state]]);
      }
    }
  });

  test("draws the default set without a provider", () => {
    const Empty = STATE_ILLUSTRATIONS.estate.empty;
    expect(html(createElement(StateIllustration, { state: "empty" }))).toBe(
      html(createElement(Empty))
    );
  });

  test("follows the provider, and an explicit set wins over it", () => {
    const inSchool = (node: ReactNode) =>
      createElement(IllustrationSetProvider, { set: "school" }, node);
    const SchoolError = STATE_ILLUSTRATIONS.school.error;
    const EstateError = STATE_ILLUSTRATIONS.estate.error;
    expect(html(inSchool(createElement(StateIllustration, { state: "error", width: 48 })))).toBe(
      html(createElement(SchoolError, { width: 48 }))
    );
    expect(
      html(inSchool(createElement(StateIllustration, { state: "error", set: "estate" })))
    ).toBe(html(createElement(EstateError)));
  });

  test("an unknown set id in the provider falls back to the default", () => {
    let seen = "";
    function Probe() {
      seen = useIllustrationSet();
      return null;
    }
    html(createElement(IllustrationSetProvider, { set: "nope" }, createElement(Probe)));
    expect(seen).toBe(DEFAULT_SET);
  });
});
