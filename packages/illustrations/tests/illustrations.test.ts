import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { type ComponentType, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import pkg from "../package.json";
import { MOTIFS, type MotifId } from "../scripts/motifs";

const ROOT = resolve(import.meta.dir, "..");
const LIMIT = 3 * 1024;
const IDS = Object.keys(MOTIFS) as MotifId[];

type Motif = ComponentType<Record<string, unknown>>;

async function load(id: MotifId): Promise<Motif> {
  const mod = await import(resolve(ROOT, `src/${id}.tsx`));
  return mod[MOTIFS[id]];
}

const gzip = (s: string | Buffer) => gzipSync(s).byteLength;

describe("package shape", () => {
  test("the eight motifs of design#17", () => {
    expect([...IDS].sort()).toEqual(
      [
        "empty",
        "no-results",
        "error",
        "404",
        "offline",
        "no-permission",
        "success",
        "maintenance",
      ].sort() as MotifId[]
    );
  });

  test("one export path per motif, and no barrel", () => {
    expect(Object.keys(pkg.exports).sort()).toEqual(IDS.map((id) => `./${id}`).sort());
    for (const id of IDS) {
      expect(pkg.exports[`./${id}` as keyof typeof pkg.exports]).toEqual({
        types: `./dist/${id}.d.ts`,
        import: `./dist/${id}.js`,
      });
    }
    expect(existsSync(resolve(ROOT, "src/index.ts"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/index.tsx"))).toBe(false);
    const sources = readdirSync(resolve(ROOT, "src")).filter((f) => f !== "frame.tsx");
    expect(sources.sort()).toEqual(IDS.map((id) => `${id}.tsx`).sort());
  });

  test("each motif file exports its component", async () => {
    for (const id of IDS) expect(typeof (await load(id))).toBe("function");
  });
});

describe.each(IDS)("%s", (id) => {
  test("colours only through none, currentColor and var(--hn-*)", async () => {
    const svg = renderToStaticMarkup(createElement(await load(id)));
    const colours = [...svg.matchAll(/\b(?:fill|stroke|color|stop-color)="([^"]*)"/g)].map(
      (m) => m[1]
    );
    expect(colours).toContain("currentColor");
    for (const c of colours) expect(c).toMatch(/^(?:none|currentColor|var\(--hn-[a-z0-9-]+\))$/);
    expect(svg).not.toMatch(/<(?:image|style|linearGradient|radialGradient|filter|text)\b/);
    expect(svg).not.toMatch(/\sstyle=/);
  });

  test(`is at most ${LIMIT} bytes gzip`, async () => {
    const svg = renderToStaticMarkup(createElement(await load(id)));
    expect(gzip(svg)).toBeLessThanOrEqual(LIMIT);
    // What ships: the source and, once built, the bundled module (frame included).
    expect(gzip(readFileSync(resolve(ROOT, `src/${id}.tsx`)))).toBeLessThanOrEqual(LIMIT);
    const dist = resolve(ROOT, `dist/${id}.js`);
    if (existsSync(dist)) expect(gzip(readFileSync(dist))).toBeLessThanOrEqual(LIMIT);
  });

  test("is a 160×120 box, decorative by default and named on request", async () => {
    const Motif = await load(id);
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
