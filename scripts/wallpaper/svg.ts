// Reads a flat logo SVG into filled polygons: <g>, <path> and <polygon> with fill and fill-rule
// (attribute or style, inherited) and matrix/translate/scale transforms. Curves and arcs are
// flattened into line segments. Anything else (strokes, gradients, images, <use>, other shapes)
// is refused: a wallpaper mark must be flat.
import type { FillRule, Point } from "../raster";

export type Part = { fill: string; rule: FillRule; polygons: Point[][] };
export type Mark = { parts: Part[]; box: { x: number; y: number; width: number; height: number } };

type Matrix = readonly [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** a then b: the point is first mapped by b, then by a (SVG nesting order: parent a, child b). */
function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

const apply = (m: Matrix, [x, y]: Point): Point => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

export function parseTransform(attr: string): Matrix {
  let m = IDENTITY;
  for (const [, fn, args] of attr.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = (args ?? "")
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    const at = (i: number, d = 0) => v[i] ?? d;
    let t: Matrix;
    if (fn === "matrix") t = [at(0), at(1), at(2), at(3), at(4), at(5)];
    else if (fn === "translate") t = [1, 0, 0, 1, at(0), at(1)];
    else if (fn === "scale") t = [at(0), 0, 0, at(1, at(0)), 0, 0];
    else throw new Error(`svg: unsupported transform ${fn}`);
    m = multiply(m, t);
  }
  return m;
}

/** A cursor over path data: numbers may run together ("-.5.5"), arc flags are single digits. */
class Cursor {
  at = 0;
  constructor(readonly d: string) {}
  private skip() {
    while (this.at < this.d.length && /[\s,]/.test(this.d[this.at] ?? "")) this.at++;
  }
  command(): string | null {
    this.skip();
    const c = this.d[this.at];
    if (c && /[a-z]/i.test(c)) {
      this.at++;
      return c;
    }
    return null;
  }
  hasNumber(): boolean {
    this.skip();
    return this.at < this.d.length && /[-+.\d]/.test(this.d[this.at] ?? "");
  }
  number(): number {
    this.skip();
    const m = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i.exec(this.d.slice(this.at));
    if (!m) throw new Error(`svg: expected a number at ${this.at} in path data`);
    this.at += m[0].length;
    return Number(m[0]);
  }
  flag(): boolean {
    this.skip();
    const c = this.d[this.at++];
    if (c !== "0" && c !== "1") throw new Error(`svg: expected an arc flag at ${this.at - 1}`);
    return c === "1";
  }
}

const STEPS = 24;

function cubic(out: Point[], p0: Point, c1: Point, c2: Point, p: Point) {
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const e = t * t * t;
    out.push([
      a * p0[0] + b * c1[0] + c * c2[0] + e * p[0],
      a * p0[1] + b * c1[1] + c * c2[1] + e * p[1],
    ]);
  }
}

function quad(out: Point[], p0: Point, c: Point, p: Point) {
  for (let i = 1; i <= STEPS; i++) {
    const t = i / STEPS;
    const u = 1 - t;
    out.push([
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p[1],
    ]);
  }
}

/** SVG arc (endpoint form) flattened, after the implementation notes of SVG 1.1 F.6.5. */
function arc(
  out: Point[],
  p0: Point,
  rx0: number,
  ry0: number,
  angle: number,
  large: boolean,
  sweep: boolean,
  p: Point
) {
  let rx = Math.abs(rx0);
  let ry = Math.abs(ry0);
  if (rx === 0 || ry === 0 || (p0[0] === p[0] && p0[1] === p[1])) {
    out.push(p);
    return;
  }
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (p0[0] - p[0]) / 2;
  const dy = (p0[1] - p[1]) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = (k * rx * y1) / ry;
  const cy1 = (-k * ry * x1) / rx;
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(4, Math.ceil((Math.abs(dt) / (2 * Math.PI)) * 64));
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    out.push(i === n ? p : [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy]);
  }
}

/** Path data as closed polygons (subpaths), every command absolute or relative. */
export function pathPolygons(d: string): Point[][] {
  const c = new Cursor(d);
  const polys: Point[][] = [];
  let poly: Point[] = [];
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  let lastC: Point | null = null; // last cubic control, for S
  let lastQ: Point | null = null; // last quadratic control, for T
  let cmd = "";
  const flush = () => {
    if (poly.length > 2) polys.push(poly);
    poly = [];
  };
  for (;;) {
    const next = c.command();
    if (next) cmd = next;
    else if (!c.hasNumber()) break;
    else if (cmd === "M") cmd = "L";
    else if (cmd === "m") cmd = "l";
    if (!cmd) throw new Error("svg: path data must start with a command");
    const rel = cmd === cmd.toLowerCase();
    const pt = (): Point => {
      const x = c.number();
      const y = c.number();
      return rel ? [cur[0] + x, cur[1] + y] : [x, y];
    };
    const up = cmd.toUpperCase();
    let nextC: Point | null = null;
    let nextQ: Point | null = null;
    if (up === "M") {
      flush();
      cur = pt();
      start = cur;
      poly.push(cur);
    } else if (up === "L") {
      cur = pt();
      poly.push(cur);
    } else if (up === "H") {
      const x = c.number();
      cur = [rel ? cur[0] + x : x, cur[1]];
      poly.push(cur);
    } else if (up === "V") {
      const y = c.number();
      cur = [cur[0], rel ? cur[1] + y : y];
      poly.push(cur);
    } else if (up === "C" || up === "S") {
      const c1: Point =
        up === "C" ? pt() : lastC ? [2 * cur[0] - lastC[0], 2 * cur[1] - lastC[1]] : cur;
      const c2 = pt();
      const p = pt();
      cubic(poly, cur, c1, c2, p);
      nextC = c2;
      cur = p;
    } else if (up === "Q" || up === "T") {
      const q: Point =
        up === "Q" ? pt() : lastQ ? [2 * cur[0] - lastQ[0], 2 * cur[1] - lastQ[1]] : cur;
      const p = pt();
      quad(poly, cur, q, p);
      nextQ = q;
      cur = p;
    } else if (up === "A") {
      const rx = c.number();
      const ry = c.number();
      const rot = c.number();
      const large = c.flag();
      const sweep = c.flag();
      const p = pt();
      arc(poly, cur, rx, ry, rot, large, sweep, p);
      cur = p;
    } else if (up === "Z") {
      flush();
      cur = start;
      // A command after Z without M starts a new subpath at the start point.
      poly.push(cur);
      cmd = "";
    } else throw new Error(`svg: unsupported path command ${cmd}`);
    lastC = nextC;
    lastQ = nextQ;
  }
  flush();
  return polys;
}

type Style = { fill?: string; rule?: FillRule };

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, k, v] of tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) if (k) out[k] = v ?? "";
  return out;
}

function style(a: Record<string, string>): Style {
  const s: Style = {};
  const decl: Record<string, string> = {};
  for (const part of (a.style ?? "").split(";")) {
    const [k, v] = part.split(":").map((x) => x.trim());
    if (k && v) decl[k] = v;
  }
  const fill = decl.fill ?? a.fill;
  const rule = decl["fill-rule"] ?? a["fill-rule"];
  if (fill) s.fill = fill;
  if (rule === "evenodd" || rule === "nonzero") s.rule = rule;
  const stroke = decl.stroke ?? a.stroke;
  if (stroke && stroke !== "none") throw new Error("svg: strokes are not allowed in a mark");
  return s;
}

// SVG's own defaults, spelt out so the palette ratchet does not mistake them for brand colours.
const grey = (digit: string) => `#${digit.repeat(6)}`;
const BLACK = grey("0");
const NAMED: Record<string, string> = { white: grey("f"), black: BLACK };

function normaliseFill(fill: string): string {
  const f = fill.toLowerCase();
  const named = NAMED[f];
  if (named) return named;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(f);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/.test(f)) return f;
  throw new Error(`svg: unsupported fill ${fill}`);
}

/** Every filled part of a logo SVG in document order, with the bounding box of all of them. */
export function readMark(source: string): Mark {
  const body = source.replace(/<!--[\s\S]*?-->/g, "").replace(/<metadata[\s\S]*?<\/metadata>/g, "");
  if (/<(linearGradient|radialGradient|image|use|filter|mask|clipPath|text)\b/.test(body))
    throw new Error("svg: a mark must be flat: no gradient, image, use, filter, mask or text");
  const stack: { m: Matrix; s: Style }[] = [];
  let top = { m: IDENTITY, s: { rule: "nonzero" } as Style };
  const parts: Part[] = [];
  for (const [tag, close, name] of body.matchAll(/<(\/?)([\w:]+)\b[^>]*>/g)) {
    if (!name || name === "?xml" || name === "!DOCTYPE") continue;
    if (close) {
      if (name === "g" || name === "svg") top = stack.pop() ?? top;
      continue;
    }
    const a = attrs(tag);
    const own = style(a);
    const m = a.transform ? multiply(top.m, parseTransform(a.transform)) : top.m;
    const s: Style = { ...top.s, ...own };
    const selfClosing = tag.endsWith("/>");
    if (name === "svg" || name === "g") {
      if (!selfClosing) {
        stack.push(top);
        top = { m, s };
      }
      continue;
    }
    let polys: Point[][];
    if (name === "path") polys = pathPolygons(a.d ?? "");
    else if (name === "polygon") {
      const n = (a.points ?? "")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      const poly: Point[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) poly.push([n[i] ?? 0, n[i + 1] ?? 0]);
      polys = [poly];
    } else if (name === "title" || name === "desc" || name === "style" || name === "defs") continue;
    else throw new Error(`svg: unsupported element <${name}> in a mark`);
    const fill = s.fill ?? BLACK;
    if (fill === "none") continue;
    parts.push({
      fill: normaliseFill(fill),
      rule: s.rule ?? "nonzero",
      polygons: polys.map((p) => p.map((q) => apply(m, q))),
    });
  }
  if (!parts.length) throw new Error("svg: no filled shape in the mark");
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const part of parts)
    for (const poly of part.polygons)
      for (const [x, y] of poly) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
  return { parts, box: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } };
}
