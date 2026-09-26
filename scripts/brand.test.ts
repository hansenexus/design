import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MARK } from "../packages/ui/src/brand-geometry";
import { APP_ICON, ASSETS, brandColours, render, segments, stale } from "./brand";
import { decodeIco, decodePng, hexBytes } from "./raster";

const ROOT = resolve(import.meta.dir, "..");

// hansenexus/hn-monorepo apps/hansenexus/public/logo.svg: the geometry must stay unchanged.
const CANONICAL = [
  "309.72 0 246.7 99.12 105.15 321.81 0 321.81 204.56 0 309.72 0",
  "422.64 210.46 351.85 321.81 246.7 321.81 317.48 210.46 246.7 99.12 351.85 99.12 422.64 210.46",
];

describe("brand", () => {
  test("the mark is the canonical logo, unchanged", () => {
    const polygons: readonly string[] = MARK.polygons;
    expect([...polygons]).toEqual(CANONICAL);
    expect([MARK.width, MARK.height]).toEqual([422.64, 321.81]);
  });

  test("committed assets match the geometry and the tokens (run bun run brand)", async () => {
    expect(await stale()).toEqual([]);
  });

  test("every SVG is flat: one colour per part, no gradient, filter, stroke or opacity", async () => {
    for (const [path, body] of await render()) {
      if (!path.endsWith(".svg")) continue;
      expect(body).not.toMatch(/gradient|filter|stroke|opacity|<image/i);
      expect(body).toContain('aria-label="hansenexus"');
    }
  });

  test("the lime mark uses brand.lime and the mono mark currentColor", async () => {
    const c = await brandColours();
    const lime = readFileSync(resolve(ROOT, ASSETS, "mark/hansenexus-mark-lime.svg"), "utf8");
    expect(lime.match(/fill="([^"]+)"/g)).toEqual([`fill="${c.lime}"`, `fill="${c.lime}"`]);
    const mono = readFileSync(resolve(ROOT, ASSETS, "mark/hansenexus-mark-mono.svg"), "utf8");
    expect(mono).toContain('fill="currentColor"');
  });

  test("the favicon switches to lime-deep on a light tab strip", async () => {
    const c = await brandColours();
    const svg = readFileSync(resolve(ROOT, ASSETS, "favicon/favicon.svg"), "utf8");
    expect(svg).toContain(`fill:${c.lime}`);
    expect(svg).toMatch(
      new RegExp(`prefers-color-scheme:light\\)\\{polygon\\{fill:${c["lime-deep"]}`)
    );
  });

  test("raster sizes, the app icon ground and the ico entries", async () => {
    const c = await brandColours();
    const size = (p: string) => decodePng(readFileSync(resolve(ROOT, ASSETS, p)));
    expect(size("favicon/favicon-32.png").width).toBe(32);
    expect(size("favicon/apple-touch-icon.png").width).toBe(180);
    const icon = size("app-icon/app-icon-1024.png");
    expect([icon.width, icon.height]).toEqual([1024, 1024]);
    // The corner is the flat ground: ink under the lime mark, opaque.
    const ground = APP_ICON === "lime-on-ink" ? c.ink : c.lime;
    expect([...icon.rgba.subarray(0, 4)]).toEqual([...hexBytes(ground), 255]);
    const ico = decodeIco(readFileSync(resolve(ROOT, ASSETS, "favicon/favicon.ico")));
    expect(ico.map((p) => decodePng(p).width)).toEqual([16, 32, 48]);
    const tray = size("tray/trayTemplate@2x.png");
    expect(tray.width).toBe(32);
    // Template image: black only, shape in alpha.
    for (let i = 0; i < tray.rgba.length; i += 4) {
      expect([tray.rgba[i], tray.rgba[i + 1], tray.rgba[i + 2]]).toEqual([0, 0, 0]);
    }
  });

  test("path segments parse absolute commands and implicit repeats", () => {
    expect(segments("M1 2 3 4H5V6Q7 8 9 10C1 2 3 4 5 6Z")).toEqual([
      { op: "move", p: [1, 2] },
      { op: "line", p: [3, 4] },
      { op: "line", p: [5, 4] },
      { op: "line", p: [5, 6] },
      { op: "quad", c: [7, 8], p: [9, 10] },
      { op: "curve", c1: [1, 2], c2: [3, 4], p: [5, 6] },
      { op: "close" },
    ]);
  });
});
