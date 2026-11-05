// Device wallpapers per brand and Focus mode: one config per brand (scripts/wallpaper/brands/,
// schema in scripts/wallpaper/schema.ts, documented in brand/wallpapers/README.md), rendered
// into brand/wallpapers/<brand>/ at every device size. Committed output must match the config:
// `--check` (and scripts/wallpaper.test.ts) fails when it drifts, as for scripts/brand.ts.
// Run: bun scripts/wallpaper.ts [brand...] [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { resolveTokens } from "../packages/tokens/scripts/resolve";
import { coverage, decodePng, hexBytes, type Image, type Point, png } from "./raster";
import { config as bargsten } from "./wallpaper/brands/bargsten";
import { config as elbeAkustik } from "./wallpaper/brands/elbe-akustik";
import { config as hansenexus } from "./wallpaper/brands/hansenexus";
import type { BrandConfig, Colour, Ground, Size, Source } from "./wallpaper/schema";
import { type Mark, readMark } from "./wallpaper/svg";

const ROOT = resolve(import.meta.dir, "..");
export const OUT = "brand/wallpapers";

export const BRANDS: Readonly<Record<string, BrandConfig>> = {
  hansenexus,
  "elbe-akustik": elbeAkustik,
  bargsten,
};

// --- colours

let palette: Map<string, string> | undefined;

/** Every colour token as path -> #rrggbb: the raw palette and the brand.* tokens. */
async function tokens(): Promise<Map<string, string>> {
  if (palette) return palette;
  const map = new Map<string, string>();
  const raw = JSON.parse(
    readFileSync(resolve(ROOT, "packages/tokens/tokens/primitives/color.json"), "utf8")
  );
  const walk = (node: unknown, path: string[]) => {
    if (!node || typeof node !== "object") return;
    const value = (node as { $value?: unknown }).$value;
    if (typeof value === "string") map.set(path.join("."), value.toLowerCase());
    for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, [...path, k]);
  };
  walk(raw, []);
  for (const t of await resolveTokens("hansenexus", "dark"))
    if (t.path.startsWith("brand.")) map.set(t.path, t.value.toLowerCase());
  palette = map;
  return map;
}

/** A config colour as #rrggbb. */
export async function colour(c: Colour): Promise<string> {
  if (typeof c !== "string") {
    const [a, b, t] = c.mix;
    const [x, y] = [hexBytes(await colour(a)), hexBytes(await colour(b))];
    const hex = [0, 1, 2]
      .map((i) => Math.round((x[i] ?? 0) + ((y[i] ?? 0) - (x[i] ?? 0)) * t))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
  const hex = (await tokens()).get(c);
  if (!hex) throw new Error(`wallpaper: unknown colour ${c}`);
  return hex;
}

// --- sources

export function sourcePath(s: Source): string {
  const base =
    s.root === "repo"
      ? ROOT
      : s.root === "hn-monorepo"
        ? (process.env.HN_MONOREPO ?? resolve(homedir(), "repos/hn-monorepo"))
        : (process.env.HN_WALLPAPER_SOURCES ?? resolve(homedir(), "data/wallpaper-sources"));
  return resolve(base, s.path);
}

/** Whether every mark file of a brand is on this machine (client sources live outside the repo). */
export function sourcesPresent(config: BrandConfig): boolean {
  return Object.values(config.mark.variants).every((v) => existsSync(sourcePath(v.file)));
}

/** The mark of one variant, its fills checked against (or repainted with) the config's. */
export async function variantMark(config: BrandConfig, name: string): Promise<Mark> {
  const v = config.mark.variants[name];
  if (!v) throw new Error(`wallpaper: ${config.brand} has no mark variant ${name}`);
  const mark = readMark(readFileSync(sourcePath(v.file), "utf8"));
  const want = await Promise.all(v.fills.map(colour));
  if (v.repaint) {
    const [only] = want;
    if (want.length !== 1 || !only) throw new Error("wallpaper: repaint takes exactly one fill");
    return { ...mark, parts: mark.parts.map((p) => ({ ...p, fill: only })) };
  }
  const have = [...new Set(mark.parts.map((p) => p.fill))].sort();
  if (have.join() !== [...new Set(want)].sort().join())
    throw new Error(
      `wallpaper: ${config.brand} mark ${name} has fills ${have.join(" ")}, the config allows ${want.join(" ")}`
    );
  return mark;
}

// --- motif

/** The contour lines of a ground: polylines in pixels with their colour and stroke width. */
export function contours(
  config: BrandConfig,
  ground: Ground,
  size: Size
): { points: Point[]; colour: Colour; width: number }[] {
  const m = config.motif;
  const { width: W, height: H, layout } = size;
  const n = Math.round(m.lines[layout] * (ground.density ?? 1));
  const hi = ground.highlight ? Math.round(n * ground.highlight.at) : -1;
  const out: { points: Point[]; colour: Colour; width: number }[] = [];
  const STEPS = 48;
  for (let i = 0; i < n; i++) {
    const y = H * (m.top + (i * m.span) / n);
    const a = H * m.amplitude[layout] * (1 + Math.sin(i * 0.7));
    // A smooth cubic chain (SVG "S"): the first control point mirrors the previous second one.
    let cur: Point = [-0.01 * W, y];
    let prev: Point = cur;
    const pts: Point[] = [cur];
    for (let k = 1; k <= m.segments; k++) {
      const x = (W * k) / m.segments;
      const yy = y + a * Math.sin(k * 1.1 + i * 0.45);
      const c1: Point = [2 * cur[0] - prev[0], 2 * cur[1] - prev[1]];
      const c2: Point = [x - W / (2 * m.segments), yy - a * 0.6];
      const p: Point = [x, yy];
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const u = 1 - t;
        pts.push([
          u * u * u * cur[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p[0],
          u * u * u * cur[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p[1],
        ]);
      }
      prev = c2;
      cur = p;
    }
    // Run on past the right edge so the stroke never ends inside the picture.
    pts.push([1.01 * W, cur[1]]);
    const accent = i === hi ? ground.highlight : undefined;
    out.push({
      points: pts,
      colour: accent ? accent.colour : i % m.majorEvery === 0 ? ground.major : ground.line,
      width: H * m.stroke[layout] * (accent ? accent.weight : 1),
    });
  }
  return out;
}

/** A polyline as one closed outline `width` wide (mitred joins; the curves are smooth). */
export function strokeOutline(points: Point[], width: number): Point[] {
  const h = width / 2;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i] ?? [0, 0];
    const a = points[Math.max(0, i - 1)] ?? p;
    const b = points[Math.min(points.length - 1, i + 1)] ?? p;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push([p[0] + nx * h, p[1] + ny * h]);
    right.push([p[0] - nx * h, p[1] - ny * h]);
  }
  return [...left, ...right.reverse()];
}

// --- raster

type Canvas = Image;

function canvas(width: number, height: number, bg: string): Canvas {
  const rgba = new Uint8Array(width * height * 4);
  const [r, g, b] = hexBytes(bg);
  for (let i = 0; i < width * height; i++) rgba.set([r, g, b, 255], i * 4);
  return { width, height, rgba };
}

/** Composites `polygons` in `fill` over the canvas, only inside their bounding box. */
function draw(c: Canvas, polygons: Point[][], fill: string, rule: "nonzero" | "evenodd") {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const poly of polygons)
    for (const [x, y] of poly) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  const bx = Math.max(0, Math.floor(x0));
  const by = Math.max(0, Math.floor(y0));
  const bw = Math.min(c.width, Math.ceil(x1) + 1) - bx;
  const bh = Math.min(c.height, Math.ceil(y1) + 1) - by;
  if (bw <= 0 || bh <= 0) return;
  const local = polygons.map((p) => p.map(([x, y]) => [x - bx, y - by] as const));
  const cov = coverage(bw, bh, local, rule);
  const fg = hexBytes(fill);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const a = Math.min(1, cov[y * bw + x] ?? 0);
      if (a <= 0) continue;
      const at = ((by + y) * c.width + bx + x) * 4;
      for (let k = 0; k < 3; k++) {
        const under = c.rgba[at + k] ?? 0;
        c.rgba[at + k] = Math.round((fg[k] ?? 0) * a + under * (1 - a));
      }
    }
  }
}

/** One wallpaper as pixels. */
export async function paintGround(
  config: BrandConfig,
  ground: Ground,
  size: Size,
  mark: Mark
): Promise<Image> {
  const c = canvas(size.width, size.height, await colour(ground.background));
  for (const line of contours(config, ground, size))
    draw(c, [strokeOutline(line.points, line.width)], await colour(line.colour), "nonzero");
  const place = config.mark.placement[size.layout];
  const scale = (size.width * place.width) / mark.box.width;
  const dx = size.width * place.cx - (mark.box.width * scale) / 2 - mark.box.x * scale;
  const dy = size.height * place.cy - (mark.box.height * scale) / 2 - mark.box.y * scale;
  for (const part of mark.parts) {
    const polys = part.polygons.map((p) =>
      p.map(([x, y]) => [x * scale + dx, y * scale + dy] as const)
    );
    draw(c, polys, part.fill, part.rule);
  }
  return c;
}

export function fileName(config: BrandConfig, ground: Ground, size: Size): string {
  const draft = config.status === "draft" ? "-draft" : "";
  return `${OUT}/${config.brand}/${ground.name}-${size.name}${draft}.png`;
}

/** Every wallpaper of a brand: path relative to the repo root -> pixels. */
export async function* renderBrand(config: BrandConfig): AsyncGenerator<[string, Image]> {
  const marks = new Map<string, Mark>();
  for (const ground of config.grounds) {
    let mark = marks.get(ground.mark);
    if (!mark) {
      mark = await variantMark(config, ground.mark);
      marks.set(ground.mark, mark);
    }
    for (const size of config.sizes)
      yield [fileName(config, ground, size), await paintGround(config, ground, size, mark)];
  }
}

/** Committed paths whose pixels differ from a fresh render (committed brands only). */
export async function stale(config: BrandConfig, root = ROOT): Promise<string[]> {
  const out: string[] = [];
  for await (const [path, img] of renderBrand(config)) {
    const file = resolve(root, path);
    if (!existsSync(file)) {
      out.push(path);
      continue;
    }
    const disk = decodePng(readFileSync(file));
    if (
      disk.width !== img.width ||
      disk.height !== img.height ||
      !Buffer.from(disk.rgba).equals(Buffer.from(img.rgba))
    )
      out.push(path);
  }
  return out;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const names = args.filter((a) => !a.startsWith("--"));
  const unknown = names.filter((n) => !BRANDS[n]);
  if (unknown.length) {
    console.error(
      `wallpaper: unknown brand ${unknown.join(", ")} (${Object.keys(BRANDS).join(", ")})`
    );
    process.exit(2);
  }
  const chosen = (names.length ? names : Object.keys(BRANDS)).map((n) => BRANDS[n] as BrandConfig);
  let failed = false;
  for (const config of chosen) {
    if (!sourcesPresent(config)) {
      const missing = Object.values(config.mark.variants)
        .map((v) => sourcePath(v.file))
        .filter((p) => !existsSync(p));
      console.error(
        `wallpaper: ${config.brand} skipped, mark source missing:\n  ${missing.join("\n  ")}`
      );
      if (names.length) failed = true;
      continue;
    }
    if (args.includes("--check")) {
      if (!config.commit) continue;
      const drift = await stale(config);
      if (drift.length) {
        console.error(
          `wallpaper: stale, run bun run wallpaper ${config.brand}:\n  ${drift.join("\n  ")}`
        );
        failed = true;
      } else console.log(`wallpaper: ${config.brand} matches its config`);
      continue;
    }
    let n = 0;
    for await (const [path, img] of renderBrand(config)) {
      const file = resolve(ROOT, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, png(img));
      n++;
    }
    console.log(
      `wallpaper: ${config.brand}: wrote ${n} files${config.status === "draft" ? " (draft)" : ""}`
    );
  }
  if (failed) process.exit(1);
}
