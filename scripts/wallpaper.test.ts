import { describe, expect, test } from "bun:test";
import { ratio } from "../packages/tokens/scripts/contrast";
import { BRAND_VARIANTS } from "../packages/ui/src/hansenexus-mark";
import { brandColours } from "./brand";
import { BRANDS, colour, fileName, sourcesPresent, stale, variantMark } from "./wallpaper";
import { type BrandConfig, SIZES } from "./wallpaper/schema";
import { pathPolygons, readMark } from "./wallpaper/svg";

const configs = Object.values(BRANDS);

describe("wallpaper configs", () => {
  test("every brand has a config: hansenexus, elbe-akustik, bargsten", () => {
    expect(Object.keys(BRANDS).sort()).toEqual(["bargsten", "elbe-akustik", "hansenexus"]);
    for (const [key, c] of Object.entries(BRANDS)) expect(c.brand).toBe(key);
  });

  test("every brand renders the four device sizes", () => {
    for (const c of configs) expect(c.sizes).toEqual(SIZES);
    expect(SIZES.map((s) => `${s.width}x${s.height}`)).toEqual([
      "1320x2868",
      "2752x2064",
      "6016x3384",
      "5120x2880",
    ]);
  });

  test("ground names are unique and every ground uses a declared mark variant", () => {
    for (const c of configs) {
      const names = c.grounds.map((g) => g.name);
      expect(new Set(names).size).toBe(names.length);
      for (const g of c.grounds) expect(Object.keys(c.mark.variants)).toContain(g.mark);
    }
  });

  test("clients are never committed: their logos stay out of this public repository", () => {
    for (const c of configs.filter((x) => x.brand !== "hansenexus")) {
      expect(c.commit).toBe(false);
      // Approved or not, the -draft suffix follows the status.
      const [ground] = c.grounds;
      const [size] = c.sizes;
      if (!ground || !size) continue;
      const name = fileName(c, ground, size);
      if (c.status === "draft") expect(name).toEndWith("-draft.png");
      else expect(name).not.toContain("-draft");
    }
  });

  test("mark contrast: every fill of the mark is at least 3:1 on its ground (WCAG 1.4.11)", async () => {
    const low: string[] = [];
    for (const c of configs) {
      for (const g of c.grounds) {
        const bg = await colour(g.background);
        const v = c.mark.variants[g.mark];
        for (const f of v?.fills ?? []) {
          const fg = await colour(f);
          const r = ratio(fg, bg);
          if (r < 3) low.push(`${c.brand}/${g.name}: ${fg} on ${bg} is ${r.toFixed(2)}:1`);
        }
      }
    }
    expect(low).toEqual([]);
  });
});

describe("hansenexus wallpapers", () => {
  const hn = BRANDS.hansenexus as BrandConfig;

  test("one ground per Focus, named as the Focus profiles expect (dotfiles#180)", () => {
    expect(hn.grounds.map((g) => [g.name, g.focus])).toEqual([
      ["device-hub", "Device Hub"],
      ["arbeiten", "Arbeiten"],
      ["buchhaltung", "Buchhaltung"],
      ["steuern", "Steuern"],
      ["alltag", null],
    ]);
    expect(hn.status).toBe("approved");
    expect(hn.commit).toBe(true);
  });

  test("the mark only in the brand variants: the generated file, its own colour, unchanged", async () => {
    const c = await brandColours();
    for (const [name, v] of Object.entries(hn.mark.variants)) {
      expect(BRAND_VARIANTS.filter((x) => x !== "mono")).toContain(name as never);
      expect(v.file).toEqual({
        root: "repo",
        path: `brand/assets/mark/hansenexus-mark-${name}.svg`,
      });
      expect(v.fills).toEqual([`brand.${name}`]);
      expect(v.repaint).toBeUndefined();
      const mark = await variantMark(hn, name);
      for (const p of mark.parts) expect(p.fill).toBe(c[name as keyof typeof c]);
    }
  });

  test("lime only on dark grounds, lime-deep or ink on light ones (brand/README.md)", async () => {
    const c = await brandColours();
    for (const g of hn.grounds) {
      const bg = await colour(g.background);
      const light = ratio(bg, c.ink) > ratio(bg, c.paper);
      expect(light ? ["lime-deep", "ink"] : ["lime", "paper"]).toContain(g.mark);
    }
  });

  test(
    "committed wallpapers match the config (run bun run wallpaper hansenexus)",
    async () => {
      expect(await stale(hn)).toEqual([]);
    },
    { timeout: 300_000 }
  );
});

describe("wallpaper marks", () => {
  test("a mark file whose fills differ from the config is refused", async () => {
    const hn = BRANDS.hansenexus as BrandConfig;
    const lime = hn.mark.variants.lime;
    if (!lime) throw new Error("no lime variant");
    const wrong: BrandConfig = {
      ...hn,
      mark: { ...hn.mark, variants: { lime: { ...lime, fills: ["brand.ink"] } } },
    };
    await expect(variantMark(wrong, "lime")).rejects.toThrow(/fills/);
  });

  for (const c of configs.filter((x) => x.brand !== "hansenexus")) {
    test.skipIf(!sourcesPresent(c))(
      `${c.brand}: the mark sources read with the declared fills`,
      async () => {
        for (const name of Object.keys(c.mark.variants)) {
          const mark = await variantMark(c, name);
          expect(mark.parts.length).toBeGreaterThan(0);
        }
      }
    );
  }
});

describe("svg reader", () => {
  test("relative commands, implicit repeats, H/V and close", () => {
    expect(pathPolygons("m10 10 h10 v10 l-10 0z")).toEqual([
      [
        [10, 10],
        [20, 10],
        [20, 20],
        [10, 20],
      ],
    ]);
  });

  test("numbers that run together and arcs with packed flags", () => {
    const [poly] = pathPolygons("M0 0a5 5 0 105 5z");
    expect(poly?.at(-1)).toEqual([5, 5]);
    const [run] = pathPolygons("M0-.5.5.5-1 1z");
    expect(run).toEqual([
      [0, -0.5],
      [0.5, 0.5],
      [-1, 1],
    ]);
  });

  test("a half-circle arc stays on its radius", () => {
    const [poly] = pathPolygons("M0 0A10 10 0 0 1 20 0Z");
    for (const [x, y] of poly ?? []) expect(Math.hypot(x - 10, y)).toBeCloseTo(10, 6);
  });

  test("transforms nest and fills inherit, fill-rule from the root style", () => {
    const mark = readMark(
      `<svg style="fill-rule:evenodd"><g transform="translate(10 0)scale(2)" fill="#123456"><path d="M0 0H1V1Z"/></g></svg>`
    );
    expect(mark.parts).toHaveLength(1);
    expect(mark.parts[0]?.fill).toBe("#123456");
    expect(mark.parts[0]?.rule).toBe("evenodd");
    expect(mark.parts[0]?.polygons[0]).toEqual([
      [10, 0],
      [12, 0],
      [12, 2],
    ]);
    expect(mark.box).toEqual({ x: 10, y: 0, width: 2, height: 2 });
  });

  test("strokes, gradients and images are refused", () => {
    expect(() => readMark(`<svg><path d="M0 0H1V1Z" stroke="#000"/></svg>`)).toThrow(/stroke/);
    expect(() => readMark(`<svg><linearGradient id="g"/></svg>`)).toThrow(/flat/);
    expect(() => readMark(`<svg><image href="x.png"/></svg>`)).toThrow(/flat/);
  });
});
