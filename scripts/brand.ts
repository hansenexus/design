// The brand assets: mark and wordmark SVGs in every variant, the favicon set, the app icon
// candidates, the menu bar template and the Swift copies, all rendered from one geometry
// (packages/ui/src/brand-geometry.ts) and the brand.* tokens. Output is committed so apps can
// vendor it from a commit; `--check` (and scripts/brand.test.ts) fails when it drifts.
// Run: bun scripts/brand.ts [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { resolveTokens } from "../packages/tokens/scripts/resolve";
import { MARK, WORDMARK } from "../packages/ui/src/brand-geometry";
import { BRAND_VARIANTS, type BrandVariant } from "../packages/ui/src/hansenexus-mark";
import { WORDMARK_TEXT } from "../packages/ui/src/hansenexus-wordmark";
import {
  decodeIco,
  decodePng,
  hexBytes,
  ico,
  type Point,
  paint,
  place,
  png,
  points,
} from "./raster";

const ROOT = resolve(import.meta.dir, "..");
export const ASSETS = "brand/assets";
export const SWIFT = "swift/Sources/HansenexusBrand";

type Variant = BrandVariant;

/** The four brand colours, read from the tokens (the same in both modes). */
export async function brandColours(): Promise<Record<Exclude<Variant, "mono">, string>> {
  const tokens = await resolveTokens("hansenexus", "dark");
  const get = (path: string) => {
    const t = tokens.find((x) => x.path === path);
    if (!t) throw new Error(`brand: token ${path} is missing`);
    return t.value;
  };
  return {
    lime: get("brand.lime"),
    "lime-deep": get("brand.lime-deep"),
    ink: get("brand.ink"),
    paper: get("brand.paper"),
  };
}

type Colours = Awaited<ReturnType<typeof brandColours>>;

const n = (v: number) => String(Math.round(v * 1000) / 1000);
const fill = (c: Colours, v: Variant) => (v === "mono" ? "currentColor" : c[v]);
const polygons = (f: string) =>
  MARK.polygons.map((p) => `  <polygon fill="${f}" points="${p}"/>`).join("\n");
const open = (viewBox: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="hansenexus">\n  <title>hansenexus</title>`;

export function markSvg(c: Colours, v: Variant): string {
  return `${open(`0 0 ${MARK.width} ${MARK.height}`)}\n${polygons(fill(c, v))}\n</svg>\n`;
}

export function wordmarkSvg(c: Colours, v: Variant): string {
  return [
    open(`0 0 ${WORDMARK.width} ${WORDMARK.height}`),
    polygons(fill(c, v)),
    `  <path fill="${fill(c, WORDMARK_TEXT[v])}" d="${WORDMARK.text}"/>`,
    "</svg>\n",
  ].join("\n");
}

/** Square viewBox, the mark centred and full width. Lime by default; lime-deep on a light tab strip, where lime falls below 3:1. */
export function faviconSvg(c: Colours): string {
  const pad = (MARK.width - MARK.height) / 2;
  return [
    open(`0 ${n(-pad)} ${MARK.width} ${MARK.width}`),
    `  <style>polygon{fill:${c.lime}}@media (prefers-color-scheme:light){polygon{fill:${c["lime-deep"]}}}</style>`,
    MARK.polygons.map((p) => `  <polygon points="${p}"/>`).join("\n"),
    "</svg>\n",
  ].join("\n");
}

/** The app icon and tray layouts. */
export const TILE_MARK = 0.625;

const MARK_POLYS: Point[][] = MARK.polygons.map(points);

/** The mark centred in a size x size square at `fraction` of its width. */
function centred(size: number, fraction: number): Point[][] {
  const scale = (size * fraction) / MARK.width;
  return place(
    MARK_POLYS,
    scale,
    (size - MARK.width * scale) / 2,
    (size - MARK.height * scale) / 2
  );
}

export type Tile = "lime-on-ink" | "ink-on-lime";

function tile(c: Colours, kind: Tile, size: number): Buffer {
  const [fg, bg] = kind === "lime-on-ink" ? [c.lime, c.ink] : [c.ink, c.lime];
  return png(paint(size, size, centred(size, TILE_MARK), hexBytes(fg), hexBytes(bg)));
}

/** The chosen app icon: lime mark on the ink tile (see brand/README.md). */
export const APP_ICON: Tile = "lime-on-ink";

/** Every generated file, path relative to the repo root. */
export async function render(): Promise<Map<string, Buffer | string>> {
  const c = await brandColours();
  const out = new Map<string, Buffer | string>();
  for (const v of BRAND_VARIANTS) {
    out.set(`${ASSETS}/mark/hansenexus-mark-${v}.svg`, markSvg(c, v));
    out.set(`${ASSETS}/wordmark/hansenexus-wordmark-${v}.svg`, wordmarkSvg(c, v));
  }

  out.set(`${ASSETS}/favicon/favicon.svg`, faviconSvg(c));
  out.set(`${ASSETS}/favicon/favicon-32.png`, tile(c, APP_ICON, 32));
  out.set(
    `${ASSETS}/favicon/favicon.ico`,
    ico([16, 32, 48].map((size) => ({ size, png: tile(c, APP_ICON, size) })))
  );
  out.set(`${ASSETS}/favicon/apple-touch-icon.png`, tile(c, APP_ICON, 180));

  for (const kind of ["lime-on-ink", "ink-on-lime"] as const) {
    for (const size of [16, 32, 1024]) {
      out.set(`${ASSETS}/app-icon/app-icon-${kind}-${size}.png`, tile(c, kind, size));
    }
  }
  out.set(`${ASSETS}/app-icon/app-icon-1024.png`, tile(c, APP_ICON, 1024));

  // macOS template image: black plus alpha, the system tints it. Mark full width in the square.
  const black = hexBytes(`#${"0".repeat(6)}`);
  out.set(`${ASSETS}/tray/trayTemplate.svg`, faviconSvgMono());
  for (const [name, size] of [
    ["trayTemplate.png", 16],
    ["trayTemplate@2x.png", 32],
  ] as const) {
    out.set(`${ASSETS}/tray/${name}`, png(paint(size, size, centred(size, 1), black, null)));
  }

  // The Swift package carries the same files as resources.
  for (const [path, body] of [...out]) {
    if (/\/(mark|wordmark)\/|app-icon-1024|tray\//.test(path)) {
      out.set(`${SWIFT}/Resources/${path.split("/").pop()}`, body);
    }
  }
  out.set(`${SWIFT}/BrandGeometry.swift`, swiftGeometry());
  return out;
}

function faviconSvgMono(): string {
  const pad = (MARK.width - MARK.height) / 2;
  return `${open(`0 ${n(-pad)} ${MARK.width} ${MARK.width}`)}\n${polygons("currentColor")}\n</svg>\n`;
}

type Segment =
  | { op: "move" | "line"; p: Point }
  | { op: "quad"; c: Point; p: Point }
  | { op: "curve"; c1: Point; c2: Point; p: Point }
  | { op: "close" };

/** Absolute SVG path data (M L H V Q C Z, implicit repeats) as segments. */
export function segments(d: string): Segment[] {
  const tokens = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const out: Segment[] = [];
  let at = 0;
  let cmd = "";
  let cur: Point = [0, 0];
  const num = () => Number(tokens[at++]);
  const pt = (): Point => [num(), num()];
  while (at < tokens.length) {
    const t = tokens[at] ?? "";
    if (/[a-z]/i.test(t)) {
      cmd = t;
      at++;
      if (cmd === "Z") {
        out.push({ op: "close" });
        continue;
      }
    } else if (cmd === "M") cmd = "L";
    let s: Exclude<Segment, { op: "close" }>;
    if (cmd === "M") s = { op: "move", p: pt() };
    else if (cmd === "L") s = { op: "line", p: pt() };
    else if (cmd === "H") s = { op: "line", p: [num(), cur[1]] };
    else if (cmd === "V") s = { op: "line", p: [cur[0], num()] };
    else if (cmd === "Q") s = { op: "quad", c: pt(), p: pt() };
    else if (cmd === "C") s = { op: "curve", c1: pt(), c2: pt(), p: pt() };
    else throw new Error(`brand: unsupported path command ${cmd}`);
    out.push(s);
    cur = s.p;
  }
  return out;
}

function swiftGeometry(): string {
  const p = ([x, y]: Point) => `.init(${n(x)}, ${n(y)})`;
  const seg = (s: Segment) => {
    switch (s.op) {
      case "move":
        return `.move(${p(s.p)})`;
      case "line":
        return `.line(${p(s.p)})`;
      case "quad":
        return `.quad(${p(s.c)}, ${p(s.p)})`;
      case "curve":
        return `.curve(${p(s.c1)}, ${p(s.c2)}, ${p(s.p)})`;
      case "close":
        return ".close";
    }
  };
  const lines = [
    "// Generated by scripts/brand.ts from packages/ui/src/brand-geometry.ts. Do not edit.",
    "// The name, mark and wordmark are trademarks, not covered by the MIT licence (TRADEMARK.md).",
    "",
    "extension HNBrandGeometry {",
    `  public static let markSize = HNPoint(${n(MARK.width)}, ${n(MARK.height)})`,
    "  public static let markPolygons: [[HNPoint]] = [",
    ...MARK_POLYS.map((poly) => `    [${poly.map(p).join(", ")}],`),
    "  ]",
    `  public static let wordmarkSize = HNPoint(${n(WORDMARK.width)}, ${n(WORDMARK.height)})`,
    `  public static let wordmarkTextX: Double = ${n(WORDMARK.textX)}`,
    "  public static let wordmarkText: [HNPathSegment] = [",
    ...segments(WORDMARK.text).map((s) => `    ${seg(s)},`),
    "  ]",
    "}",
    "",
  ];
  return lines.join("\n");
}

/** Paths whose committed content differs from `render()` (pixels for PNG and ICO). */
export async function stale(root = ROOT): Promise<string[]> {
  const out: string[] = [];
  for (const [path, body] of await render()) {
    const file = resolve(root, path);
    if (!existsSync(file)) {
      out.push(path);
      continue;
    }
    const disk = readFileSync(file);
    if (path.endsWith(".png")) {
      if (!samePixels(disk, body as Buffer)) out.push(path);
    } else if (path.endsWith(".ico")) {
      const a = decodeIco(disk);
      const b = decodeIco(body as Buffer);
      if (a.length !== b.length || a.some((x, i) => !samePixels(x, b[i] ?? Buffer.alloc(0))))
        out.push(path);
    } else if (disk.toString("utf8") !== body) out.push(path);
  }
  return out;
}

function samePixels(a: Uint8Array, b: Uint8Array): boolean {
  const x = decodePng(a);
  const y = decodePng(b);
  return x.width === y.width && x.height === y.height && Buffer.from(x.rgba).equals(y.rgba);
}

if (import.meta.main) {
  if (process.argv.includes("--check")) {
    const drift = await stale();
    if (drift.length) {
      console.error(`brand: stale, run bun scripts/brand.ts:\n  ${drift.join("\n  ")}`);
      process.exit(1);
    }
    console.log("brand: assets match the geometry and the tokens");
  } else {
    const files = await render();
    for (const [path, body] of files) {
      const file = resolve(ROOT, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, body);
    }
    console.log(`brand: wrote ${files.size} files`);
  }
}
