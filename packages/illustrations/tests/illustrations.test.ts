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
  MODULES,
  MOTIFS,
  type MotifId,
  SCHOOL,
  SCHOOL_STATES,
} from "../scripts/motifs";
import { hair, SILL } from "../src/school/frame";
import {
  DEFAULT_SCHOOL_VARIANT,
  isSchoolVariant,
  SCHOOL_RECIPES,
  SCHOOL_VARIANTS,
  schoolRecipe,
} from "../src/school/variants";

const ROOT = resolve(import.meta.dir, "..");
const LIMIT = 3 * 1024;

type Motif = ComponentType<Record<string, unknown>>;

async function load(entry: Entry): Promise<Motif> {
  const mod = await import(resolve(ROOT, `src/${entry.path}.tsx`));
  return mod[entry.component];
}

const gzip = (s: string | Buffer) => gzipSync(s).byteLength;

/** The (dx, dy) of every segment of a path made of absolute M, L, H, V and Z commands. */
function pathSegments(d: string): [number, number][] {
  const tokens = d.match(/[MLHVZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: [number, number][] = [];
  let cur: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  const num = (i: number) => Number(tokens[i]);
  for (let i = 0; i < tokens.length; ) {
    const cmd = tokens[i++];
    let next: [number, number];
    switch (cmd) {
      case "M":
        cur = [num(i), num(i + 1)];
        start = cur;
        i += 2;
        continue;
      case "L":
        next = [num(i), num(i + 1)];
        i += 2;
        break;
      case "H":
        next = [num(i), cur[1]];
        i += 1;
        break;
      case "V":
        next = [cur[0], num(i)];
        i += 1;
        break;
      case "Z":
        next = start;
        break;
      default:
        throw new Error(`path command ${cmd} is not one of M L H V Z: ${d}`);
    }
    out.push([next[0] - cur[0], next[1] - cur[1]]);
    cur = next;
  }
  return out;
}

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

  test("the school family of design#132 (restyled in design#134): eight states, eight spots", () => {
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

  test("one export path per motif and per module, and no barrel", () => {
    const paths = [...ENTRIES.map((e) => e.path), ...MODULES];
    expect(Object.keys(pkg.exports).sort()).toEqual(paths.map((p) => `./${p}`).sort());
    for (const p of paths) {
      expect(pkg.exports[`./${p}` as keyof typeof pkg.exports]).toEqual({
        types: `./dist/${p}.d.ts`,
        import: `./dist/${p}.js`,
      });
    }
    for (const family of Object.keys(FAMILIES)) {
      const dir = resolve(ROOT, "src", family);
      expect(existsSync(resolve(dir, "index.ts"))).toBe(false);
      expect(existsSync(resolve(dir, "index.tsx"))).toBe(false);
      const sources = readdirSync(dir).filter(
        (f) =>
          f !== "frame.tsx" &&
          !(family === "" && f in FAMILIES) &&
          !MODULES.some((m) => `${family}/${f}` === `${m}.ts`)
      );
      const ids = Object.keys(FAMILIES[family] ?? {});
      expect(sources.sort()).toEqual(ids.map((id) => `${id}.tsx`).sort());
    }
  });

  test("the school variants (design#134): named recipes, a default among them", () => {
    expect<string[]>(SCHOOL_VARIANTS).toEqual(Object.keys(SCHOOL_RECIPES));
    expect(SCHOOL_VARIANTS.length).toBeGreaterThanOrEqual(2);
    expect(isSchoolVariant(DEFAULT_SCHOOL_VARIANT)).toBe(true);
    expect(isSchoolVariant("kommandant")).toBe(false);
    expect(schoolRecipe()).toBe(SCHOOL_RECIPES[DEFAULT_SCHOOL_VARIANT]);
    for (const v of SCHOOL_VARIANTS) {
      expect(v).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const r = schoolRecipe(v);
      expect([4, 6, 8]).toContain(r.weight);
      expect(["frei", "gefach", "haus"]).toContain(r.framing);
      expect(["gefach", "strebe", "none"]).toContain(r.accent);
    }
    // Every recipe differs from every other in at least one axis.
    const keys = SCHOOL_VARIANTS.map((v) => JSON.stringify(schoolRecipe(v)));
    expect(new Set(keys).size).toBe(keys.length);
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

  if (entry.family === "school") {
    test("draws the default variant when none is given", async () => {
      const Motif = await load(entry);
      const plain = renderToStaticMarkup(createElement(Motif));
      expect(plain).toBe(
        renderToStaticMarkup(createElement(Motif, { variant: DEFAULT_SCHOOL_VARIANT }))
      );
      expect(plain).toContain(`data-variant="${DEFAULT_SCHOOL_VARIANT}"`);
    });

    describe.each(SCHOOL_VARIANTS)("variant %s", (variant) => {
      const recipe = schoolRecipe(variant);

      test("keeps the colour rules; the accent sits where the recipe puts it", async () => {
        const svg = renderToStaticMarkup(createElement(await load(entry), { variant }));
        expect(svg).toContain(`data-variant="${variant}"`);
        const colours = [...svg.matchAll(/\b(?:fill|stroke|color|stop-color)="([^"]*)"/g)].map(
          (m) => m[1]
        );
        for (const c of colours) {
          expect(c).toMatch(/^(?:none|currentColor|var\(--hn-[a-z0-9-]+\))$/);
        }
        const accents = new Set([...svg.matchAll(/var\(--hn-([a-z0-9-]+)\)/g)].map((m) => m[1]));
        // One token, carried by the lit Gefach or the accent brace; none in the ink-only recipe.
        expect(accents.size).toBe(recipe.accent === "none" ? 0 : 1);
        for (const a of accents) expect(a).toMatch(/^(?:action|status)-/);
        expect(gzip(svg)).toBeLessThanOrEqual(LIMIT);
      });

      test("is built of straight beams, 45° braces and plaster Gefache (design#134)", async () => {
        const svg = renderToStaticMarkup(createElement(await load(entry), { variant }));
        const w = recipe.weight;
        // No round shape, no rotation, nothing rounded beyond 2 units: a sawn edge, not a blob.
        expect(svg).not.toMatch(/<(?:circle|ellipse|polygon|polyline)\b/);
        expect(svg).not.toMatch(/\stransform=/);
        for (const [, r] of svg.matchAll(/\sr[xy]="([^"]*)"/g)) {
          expect(Number(r)).toBeLessThanOrEqual(2);
        }
        // Every stroke is a beam of the recipe's width, or the hairline of a hatch.
        const widths = [...svg.matchAll(/\sstroke-width="([^"]*)"/g)].map((m) => Number(m[1]));
        for (const width of widths) expect([w, hair(w)]).toContain(width);
        // Every edge is horizontal, vertical or at 45°: lines, and paths of absolute M/L/H/V/Z.
        const segments: [number, number][] = [];
        for (const [, x1, y1, x2, y2] of svg.matchAll(
          /<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g
        )) {
          segments.push([Number(x2) - Number(x1), Number(y2) - Number(y1)]);
        }
        for (const [, d = ""] of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)) {
          expect(d).toMatch(/^[MLHVZ0-9 .-]+$/);
          segments.push(...pathSegments(d));
        }
        for (const [dx, dy] of segments) {
          const diagonal = Math.abs(Math.abs(dx) - Math.abs(dy)) < 1e-9;
          expect(dx === 0 || dy === 0 || diagonal).toBe(true);
        }
        // ... and at least one of them is a brace: a diagonal as wide as a beam.
        const braces = [...svg.matchAll(/<line [^>]*stroke-width="([^"]*)"/g)].map((m) =>
          Number(m[1])
        );
        expect(braces).toContain(w);
        // Nothing floats: the motif stands on the family's sill beam, drawn last.
        expect(svg).toMatch(
          new RegExp(
            `<rect x="\\d+" y="${SILL}" width="\\d+" height="${w}" fill="currentColor"></rect></svg>$`
          )
        );
        // Everything stays inside the box.
        for (const [, x, y, bw, bh] of svg.matchAll(
          /<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/g
        )) {
          expect(Number(x)).toBeGreaterThanOrEqual(0);
          expect(Number(y)).toBeGreaterThanOrEqual(0);
          expect(Number(x) + Number(bw)).toBeLessThanOrEqual(160);
          expect(Number(y) + Number(bh)).toBeLessThanOrEqual(120);
          expect(Number(bw)).toBeGreaterThan(0);
          expect(Number(bh)).toBeGreaterThan(0);
        }
      });
    });
  }

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
