import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import pkg from "../package.json";
import {
  ENTRIES,
  type Entry,
  FAMILIES,
  MOTIFS,
  type MotifId,
  SCHOOL,
  SCHOOL_STATES,
} from "../scripts/motifs";

const ROOT = resolve(import.meta.dir, "..");
const LIMIT = 3 * 1024;

type Motif = ComponentType<Record<string, unknown>>;

async function load(entry: Entry): Promise<Motif> {
  const mod = await import(resolve(ROOT, `src/${entry.path}.tsx`));
  return mod[entry.component];
}

const gzip = (s: string | Buffer) => gzipSync(s).byteLength;

const STATES = [
  "empty",
  "no-results",
  "error",
  "404",
  "offline",
  "no-permission",
  "success",
  "maintenance",
];

describe("package shape", () => {
  test("the eight motifs of design#17", () => {
    expect(Object.keys(MOTIFS).sort()).toEqual([...STATES].sort());
  });

  test("the school family of design#132: the eight states and eight domain spots", () => {
    expect(SCHOOL_STATES.join()).toBe(Object.keys(MOTIFS).join());
    expect(Object.keys(SCHOOL).sort()).toEqual<string[]>(
      [
        ...STATES,
        "class",
        "seating-plan",
        "quiz",
        "timetable",
        "vocabulary",
        "test",
        "study-group",
        "school",
      ].sort()
    );
    // The school states are the same ids with a School prefix, so a slot swaps families by path.
    for (const id of Object.keys(MOTIFS) as MotifId[]) {
      expect(SCHOOL[id]).toBe(`School${MOTIFS[id]}`);
    }
    expect(Object.keys(FAMILIES)).toEqual(["", "school"]);
    expect(ENTRIES).toHaveLength(24);
  });

  test("one export path per motif, and no barrel", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(ENTRIES.map((e) => `./${e.path}`).sort());
    for (const e of ENTRIES) {
      expect(pkg.exports[`./${e.path}` as keyof typeof pkg.exports]).toEqual({
        types: `./dist/${e.path}.d.ts`,
        import: `./dist/${e.path}.js`,
      });
    }
    for (const family of Object.keys(FAMILIES)) {
      const dir = resolve(ROOT, "src", family);
      expect(existsSync(resolve(dir, "index.ts"))).toBe(false);
      expect(existsSync(resolve(dir, "index.tsx"))).toBe(false);
      const sources = readdirSync(dir).filter(
        (f) => f !== "frame.tsx" && !(family === "" && f in FAMILIES)
      );
      const ids = Object.keys(FAMILIES[family] ?? {});
      expect(sources.sort()).toEqual(ids.map((id) => `${id}.tsx`).sort());
    }
  });

  test("each motif file exports its component, and the names are unique", async () => {
    for (const e of ENTRIES) expect(typeof (await load(e))).toBe("function");
    const names = ENTRIES.map((e) => e.component);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe.each(ENTRIES.map((e) => [e.path, e] as const))("%s", (_path, entry) => {
  test("colours only through none, currentColor and var(--hn-*)", async () => {
    const svg = renderToStaticMarkup(createElement(await load(entry)));
    const colours = [...svg.matchAll(/\b(?:fill|stroke|color|stop-color)="([^"]*)"/g)].map(
      (m) => m[1]
    );
    expect(colours).toContain("currentColor");
    for (const c of colours) expect(c).toMatch(/^(?:none|currentColor|var\(--hn-[a-z0-9-]+\))$/);
    expect(svg).not.toMatch(/<(?:image|style|linearGradient|radialGradient|filter|text)\b/);
    expect(svg).not.toMatch(/\sstyle=/);
  });

  test("accents come from the semantic tier; the school family keeps to one", async () => {
    const svg = renderToStaticMarkup(createElement(await load(entry)));
    const accents = new Set([...svg.matchAll(/var\(--hn-([a-z0-9-]+)\)/g)].map((m) => m[1]));
    expect(accents.size).toBeGreaterThan(0);
    for (const a of accents) expect(a).toMatch(/^(?:action|status)-/);
    // design#132: one accent per school motif, so the set follows the fachwerk theme as one.
    if (entry.family === "school") expect(accents.size).toBe(1);
  });

  test(`is at most ${LIMIT} bytes gzip`, async () => {
    const svg = renderToStaticMarkup(createElement(await load(entry)));
    expect(gzip(svg)).toBeLessThanOrEqual(LIMIT);
    // What ships: the source and, once built, the bundled module (frame included).
    expect(gzip(readFileSync(resolve(ROOT, `src/${entry.path}.tsx`)))).toBeLessThanOrEqual(LIMIT);
    const dist = resolve(ROOT, `dist/${entry.path}.js`);
    if (existsSync(dist)) expect(gzip(readFileSync(dist))).toBeLessThanOrEqual(LIMIT);
  });

  test("is a 160×120 box, decorative by default and named on request", async () => {
    const Motif = await load(entry);
    const plain = renderToStaticMarkup(createElement(Motif));
    expect(plain).toMatch(/^<svg viewBox="0 0 160 120" width="160" height="120"/);
    expect(plain).toContain('aria-hidden="true"');
    expect(plain).not.toContain("role=");

    const named = renderToStaticMarkup(
      createElement(Motif, { "aria-label": "Nothing here", width: 48, height: 36 })
    );
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Nothing here"');
    expect(named).not.toContain("aria-hidden");
    expect(named).toMatch(/width="48" height="36"/);
  });
});
