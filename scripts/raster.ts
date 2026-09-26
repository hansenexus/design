// A small rasteriser for the mark (flat polygons only) and the PNG and ICO writers the brand
// assets need. No dependency: coverage is exact in x and sampled 16 times per pixel in y, so a
// render is deterministic on every machine.
import { deflateSync, inflateSync } from "node:zlib";

export type Point = readonly [number, number];
export type RGB = readonly [number, number, number];

/** A #rrggbb colour as bytes. */
export function hexBytes(hex: string): RGB {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`raster: expected #rrggbb, got ${hex}`);
  return [1, 2, 3].map((i) => Number.parseInt(m[i] ?? "0", 16)) as unknown as RGB;
}

/** Parses an SVG `points` attribute. */
export function points(attr: string): Point[] {
  const n = attr
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const out: Point[] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i] ?? 0, n[i + 1] ?? 0]);
  return out;
}

const SUB = 16;

/** Coverage (0..1) of `polygons` (non-zero) on a width x height grid. */
export function coverage(width: number, height: number, polygons: Point[][]): Float64Array {
  const cov = new Float64Array(width * height);
  const edges = polygons.flatMap((p) =>
    p.map((a, i) => [a, p[(i + 1) % p.length] ?? a] as const).filter(([a, b]) => a[1] !== b[1])
  );
  for (let sy = 0; sy < height * SUB; sy++) {
    const y = (sy + 0.5) / SUB;
    const row = Math.floor(sy / SUB);
    const xs: { x: number; w: number }[] = [];
    for (const [a, b] of edges) {
      const [lo, hi] = a[1] < b[1] ? [a, b] : [b, a];
      if (y < lo[1] || y >= hi[1]) continue;
      xs.push({
        x: a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]),
        w: a[1] < b[1] ? 1 : -1,
      });
    }
    xs.sort((p, q) => p.x - q.x);
    let winding = 0;
    for (let i = 0; i < xs.length - 1; i++) {
      winding += xs[i]?.w ?? 0;
      if (winding === 0) continue;
      span(cov, row * width, width, xs[i]?.x ?? 0, xs[i + 1]?.x ?? 0);
    }
  }
  return cov;
}

function span(cov: Float64Array, offset: number, width: number, x0: number, x1: number) {
  const a = Math.max(0, x0);
  const b = Math.min(width, x1);
  if (b <= a) return;
  const w = 1 / SUB;
  const first = Math.floor(a);
  const last = Math.min(width - 1, Math.floor(b));
  if (first === last) {
    cov[offset + first] = (cov[offset + first] ?? 0) + (b - a) * w;
    return;
  }
  cov[offset + first] = (cov[offset + first] ?? 0) + (first + 1 - a) * w;
  for (let x = first + 1; x < last; x++) cov[offset + x] = (cov[offset + x] ?? 0) + w;
  if (last < width) cov[offset + last] = (cov[offset + last] ?? 0) + (b - last) * w;
}

export type Image = { width: number; height: number; rgba: Uint8Array };

/** `fg` at the coverage over `bg` (opaque), or over transparency when `bg` is null. */
export function paint(
  width: number,
  height: number,
  polygons: Point[][],
  fg: RGB,
  bg: RGB | null
): Image {
  const cov = coverage(width, height, polygons);
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const c = Math.min(1, cov[i] ?? 0);
    for (let k = 0; k < 3; k++) {
      rgba[i * 4 + k] = bg ? Math.round((fg[k] ?? 0) * c + (bg[k] ?? 0) * (1 - c)) : (fg[k] ?? 0);
    }
    rgba[i * 4 + 3] = bg ? 255 : Math.round(c * 255);
  }
  return { width, height, rgba };
}

/** Scales and places polygons: p -> p * scale + [dx, dy]. */
export function place(polygons: Point[][], scale: number, dx: number, dy: number): Point[][] {
  return polygons.map((p) => p.map(([x, y]) => [x * scale + dx, y * scale + dy] as const));
}

function chunk(type: string, data: Uint8Array): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(Bun.hash.crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** An 8-bit RGBA PNG, filter 0 on every row. */
export function png({ width, height, rgba }: Image): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ]);
}

/** The pixels of a PNG written by `png` (for comparisons that ignore the deflate stream). */
export function decodePng(file: Uint8Array): Image {
  const buf = Buffer.from(file);
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error("raster: not a PNG");
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  for (let at = 8; at < buf.length; ) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString("ascii", at + 4, at + 8);
    const data = buf.subarray(at + 8, at + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    } else if (type === "IDAT") idat.push(data);
    at += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    if (raw[row] !== 0) throw new Error("raster: only filter 0 is supported");
    rgba.set(raw.subarray(row + 1, row + 1 + width * 4), y * width * 4);
  }
  return { width, height, rgba };
}

/** A .ico holding PNG entries (Vista and later; every current browser reads it). */
export function ico(images: { size: number; png: Buffer }[]): Buffer {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png: data }, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, at);
    head.writeUInt8(size >= 256 ? 0 : size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(data.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...images.map((i) => i.png)]);
}

/** The PNG entries of an .ico written by `ico`. */
export function decodeIco(file: Uint8Array): Buffer[] {
  const buf = Buffer.from(file);
  const n = buf.readUInt16LE(4);
  return Array.from({ length: n }, (_, i) => {
    const len = buf.readUInt32LE(6 + 16 * i + 8);
    const at = buf.readUInt32LE(6 + 16 * i + 12);
    return buf.subarray(at, at + len);
  });
}
