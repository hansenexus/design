import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { boardProblems, decide, listCategories, registrySource } from "../scripts/variants";
import { Skeleton } from "../src";

const ROOT = resolve(import.meta.dir, "..");

/** A throwaway package root with one category and the given variant files. */
function board(category: string, variants: string[]): string {
  const root = mkdtempSync(join(tmpdir(), "hn-variants-"));
  const dir = join(root, "gallery/variants", category);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "category.tsx"), "export const category = {};\n");
  for (const v of variants) writeFileSync(join(dir, `${v}.tsx`), "export const variant = {};\n");
  return root;
}

describe("decide", () => {
  test("writes the decision file and deletes exactly the losers", () => {
    const root = board("skeleton-style", ["pulse", "static", "progressive"]);
    const deleted = decide(
      root,
      "skeleton-style",
      "static",
      "  calm on dense pages ",
      "2026-09-27"
    );
    expect(deleted.sort()).toEqual(["progressive", "pulse"]);

    const dir = join(root, "gallery/variants/skeleton-style");
    expect(existsSync(join(dir, "static.tsx"))).toBe(true);
    expect(existsSync(join(dir, "pulse.tsx"))).toBe(false);
    expect(existsSync(join(dir, "progressive.tsx"))).toBe(false);
    expect(existsSync(join(dir, "category.tsx"))).toBe(true);

    expect(JSON.parse(readFileSync(join(root, "decisions/skeleton-style.json"), "utf8"))).toEqual({
      category: "skeleton-style",
      winner: "static",
      date: "2026-09-27",
      rationale: "calm on dense pages",
      considered: ["progressive", "pulse", "static"],
    });
    const [decided] = listCategories(root);
    expect(decided?.decision?.winner).toBe("static");
    expect(boardProblems(listCategories(root))).toEqual([]);
  });

  test("refuses an unknown winner, an empty rationale, a bad date and a second decision", () => {
    const root = board("skeleton-style", ["pulse", "static"]);
    expect(() => decide(root, "skeleton-style", "shimmer", "why")).toThrow(/no variant shimmer/);
    expect(() => decide(root, "skeleton-style", "pulse", "  ")).toThrow(/rationale/);
    expect(() => decide(root, "skeleton-style", "pulse", "why", "27.09.2026")).toThrow(/date/);
    expect(() => decide(root, "nope", "pulse", "why")).toThrow(/no category/);
    // Nothing was deleted by the refusals.
    expect(listCategories(root)[0]?.variants).toEqual(["pulse", "static"]);

    decide(root, "skeleton-style", "pulse", "why", "2026-09-27");
    expect(() => decide(root, "skeleton-style", "pulse", "again")).toThrow(/already decided/);
  });

  test("a malformed decision file fails loudly", () => {
    const root = board("skeleton-style", ["pulse"]);
    mkdirSync(join(root, "decisions"));
    writeFileSync(
      join(root, "decisions/skeleton-style.json"),
      JSON.stringify({ category: "skeleton-style", winner: "pulse", date: "today" })
    );
    expect(() => listCategories(root)).toThrow(/date is not YYYY-MM-DD; rationale is empty/);
  });
});

describe("board", () => {
  test("an open vote needs two variants; a decided one keeps only its winner", () => {
    const decision = {
      category: "a",
      winner: "x",
      date: "2026-09-27",
      rationale: "r",
      considered: ["x", "y"],
    };
    expect(
      boardProblems([
        { id: "a", spec: "", variants: ["x"], decision: null },
        { id: "b", spec: "", variants: ["x", "y"], decision: { ...decision, category: "b" } },
        { id: "c", spec: "", variants: ["x"], decision: { ...decision, category: "c" } },
      ])
    ).toEqual([
      "a: an open vote needs at least two variants",
      "b: decided for x, but the variants are [x, y]",
    ]);
  });

  test("the committed board is consistent", () => {
    const categories = listCategories(ROOT);
    expect(categories.map((c) => c.id)).toContain("skeleton-style");
    expect(boardProblems(categories)).toEqual([]);
  });

  test("the gallery registry imports every category and variant", () => {
    const source = registrySource(ROOT);
    for (const c of listCategories(ROOT)) {
      expect(source).toContain(JSON.stringify(c.spec));
      for (const v of c.variants) expect(source).toContain(`id: ${JSON.stringify(v)}`);
    }
  });
});

describe("skeleton-style", () => {
  test("is decided for pulse, and Skeleton pulses by default, still under reduced motion", () => {
    const found = listCategories(ROOT).find((c) => c.id === "skeleton-style");
    expect(found?.decision?.winner).toBe("pulse");
    expect(found?.variants).toEqual(["pulse"]);
    const html = renderToStaticMarkup(createElement(Skeleton));
    expect(html).toContain("animate-hn-pulse motion-reduce:animate-none");
  });

  test("every variant renders the six fixtures, each as a labelled busy group", async () => {
    const found = listCategories(ROOT).find((c) => c.id === "skeleton-style");
    if (!found) throw new Error("skeleton-style is missing");
    const { category } = await import(found.spec);
    expect(category.fixtures.map((f: { id: string }) => f.id)).toEqual([
      "page",
      "card",
      "list",
      "table",
      "metric",
      "form",
    ]);
    for (const id of found.variants) {
      const { variant } = await import(resolve(found.spec, "..", `${id}.tsx`));
      for (const fixture of category.fixtures) {
        const html = renderToStaticMarkup(fixture.render(variant));
        expect(html).toContain('aria-busy="true"');
        expect(html).toMatch(/role="status"[^>]*aria-label="Loading/);
      }
    }
  });
});

describe("illustration-style", () => {
  const found = listCategories(ROOT).find((c) => c.id === "illustration-style");

  test("is decided for geometric, line-art considered and deleted", () => {
    expect(found?.decision?.winner).toBe("geometric");
    expect(found?.decision?.date).toBe("2026-09-27");
    expect(found?.decision?.considered).toEqual(["geometric", "line-art"]);
    expect(found?.variants).toEqual(["geometric"]);
  });

  test("every variant fills the empty and error slots, aria-hidden", async () => {
    if (!found) throw new Error("illustration-style is missing");
    const { category } = await import(found.spec);
    expect(category.fixtures.map((f: { id: string }) => f.id)).toEqual(["empty", "error"]);
    for (const id of found.variants) {
      const { variant } = await import(resolve(found.spec, "..", `${id}.tsx`));
      for (const fixture of category.fixtures) {
        const html = renderToStaticMarkup(fixture.render(variant));
        expect(html).toMatch(/<div aria-hidden="true"[^>]*><svg[^>]*viewBox="0 0 160 120"/);
      }
    }
  });

  // The same rule packages/illustrations enforces for all eight motifs.
  test("each motif colours only through currentColor and --hn-* vars, and is <= 3 KB gzip", async () => {
    if (!found) throw new Error("illustration-style is missing");
    for (const id of found.variants) {
      const { variant } = await import(resolve(found.spec, "..", `${id}.tsx`));
      for (const Motif of [variant.Empty, variant.Error]) {
        const svg = renderToStaticMarkup(createElement(Motif));
        const colours = [...svg.matchAll(/\b(?:fill|stroke|color|stop-color)="([^"]*)"/g)].map(
          (m) => m[1]
        );
        expect(colours.length).toBeGreaterThan(0);
        for (const c of colours)
          expect(c).toMatch(/^(?:none|currentColor|var\(--hn-[a-z0-9-]+\))$/);
        expect(svg).not.toMatch(/<(?:image|style|linearGradient|radialGradient|filter)\b/);
        expect(gzipSync(svg).byteLength).toBeLessThanOrEqual(3 * 1024);
      }
    }
  });
});

describe("shell-layout", () => {
  const found = listCategories(ROOT).find((c) => c.id === "shell-layout");
  const load = async () => {
    if (!found) throw new Error("shell-layout is missing");
    const { category } = await import(found.spec);
    const variants = await Promise.all(
      found.variants.map(async (id) => ({
        id,
        ...(await import(resolve(found.spec, "..", `${id}.tsx`))),
      }))
    );
    return { category, variants };
  };

  test("is decided for floating panels out of the four shells, at level template", async () => {
    expect(found?.decision?.winner).toBe("floating-panels");
    expect(found?.decision?.considered).toEqual([
      "command-first",
      "floating-panels",
      "rail-sidebar",
      "three-pane",
    ]);
    expect(found?.variants).toEqual(["floating-panels"]);
    const { category } = await load();
    expect(category.level).toBe("template");
  });

  test("the fixtures are every theme at 1280 and at 390 px", async () => {
    const { themes } = await import("@hansenexus/tokens");
    const { category } = await load();
    expect(category.fixtures.map((f: { id: string }) => f.id).sort()).toEqual(
      themes.flatMap((t) => [`${t}-desktop`, `${t}-phone`]).sort()
    );
  });

  test("every variant renders in every fixture under the fixture's own theme", async () => {
    const { category, variants } = await load();
    for (const { variant } of variants) {
      for (const fixture of category.fixtures) {
        const [theme, screen] = fixture.id.split("-");
        const html = renderToStaticMarkup(fixture.render(variant));
        expect(html).toContain(`data-theme="${theme}"`);
        expect(html).toContain(`data-screen="${screen}"`);
        // The nav: a landmark or the drawer's menu button.
        expect(html).toMatch(/aria-label="App"|aria-label="Open navigation"/);
        expect(html).toContain("kran-01");
      }
    }
  });

  // dec_2026-09-25_kommandant-visual-flat-lime-only: the web is flat unless the vote says otherwise.
  test("flat by default: no blur anywhere; floating panels are inset with the one lift", async () => {
    const { category, variants } = await load();
    for (const { variant } of variants) {
      for (const fixture of category.fixtures) {
        const html = renderToStaticMarkup(fixture.render(variant));
        expect(html).not.toMatch(/backdrop-blur|blur-3xl/);
      }
    }
    // The winner draws @hansenexus/shell itself (#64): its panels, flat.
    const { SHELL_PANEL } = await import("../../shell/src");
    expect(SHELL_PANEL).toContain("shadow-hn-lift");
    expect(SHELL_PANEL).toContain("bg-hn-surface-card");
    expect(SHELL_PANEL).not.toMatch(/blur|\//);
    const floating = variants.find((v) => v.id === "floating-panels");
    const html = renderToStaticMarkup(category.fixtures[0].render(floating?.variant));
    expect(html).toContain('data-glass="off"');
    expect(html).toContain('data-shell=""');
    expect(html.match(/data-shell-panel="(?:nav|header|main|context)"/g)).toHaveLength(4);
  });

  test("the floating-panels glass toggle turns every fixture translucent and blurred", async () => {
    const { category, variants } = await load();
    const floating = variants.find((v) => v.id === "floating-panels");
    expect(floating?.variant.Controls).toBeFunction();
    const toggle = renderToStaticMarkup(createElement(floating?.variant.Controls));
    expect(toggle).toContain('role="switch"');
    expect(toggle).toContain('aria-checked="false"');
    floating?.setGlass(true);
    try {
      for (const fixture of category.fixtures) {
        const html = renderToStaticMarkup(fixture.render(floating?.variant));
        expect(html).toContain('data-glass="on"');
        expect(html).toContain("backdrop-blur-xl");
      }
    } finally {
      floating?.setGlass(false);
    }
    // Only the variant that carries the toggle has one.
    expect(variants.filter((v) => v.variant.Controls).map((v) => v.id)).toEqual([
      "floating-panels",
    ]);
  });
});
