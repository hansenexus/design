// The school family's construction engine (design#134), direction B of fachwerk
// (hansenexus/fachwerk#218, "Fachwerk wörtlich: Balken, Gefache, eine Strebe"). A motif is a
// composition of beams, Gefache and braces drawn into a bay; `SchoolFrame` builds the bay from
// the motif's `variant` recipe (variants.ts) and the motif draws relative to it, so one drawing
// serves every recipe. The vocabulary is strict: straight beams in `currentColor`, posts and
// rails framing Gefache that are plaster fills in tones of the ink, the 45° brace as the one
// diagonal, no curve and no round shape anywhere, and every motif standing on a sill beam, so
// nothing floats. One token accent per motif, carried by the lit Gefach or by the accent brace
// as the recipe says. Ink inverts for dark mode; the fills follow it.
import { createContext, type ReactNode, useContext } from "react";
import { type IllustrationProps, Svg } from "../frame";
import {
  DEFAULT_SCHOOL_VARIANT,
  type SchoolRecipe,
  type SchoolVariant,
  schoolRecipe,
} from "./variants";

export type { IllustrationProps };

/** Every school motif takes the family's `variant`. */
export type SchoolIllustrationProps = IllustrationProps & { variant?: SchoolVariant };

export type Box = { x: number; y: number; w: number; h: number };

/** The fill opacity of an unlit Gefach: plaster in the ink's tone. */
export const PLASTER = 0.12;

/** The fill opacity of a shaded Gefach or a detail drawn in ink tone. */
export const SHADE = 0.28;

/** The fill opacity of the lit Gefach when the recipe gives the accent to a brace or to nothing. */
export const LIT = 0.45;

/** Where the sill beam's top edge is; every bay ends on it and every motif stands on it. */
export const SILL = 100;

/** How a motif is painted under its recipe: the lit Gefach's fill and the accent brace's stroke. */
export type Paint = { lit: string; litOpacity?: number; strebe: string };

/** What a motif draws into: the open bay, the beam width and the paint of its recipe. */
export type Bau = { bay: Box; w: number; recipe: SchoolRecipe; paint: Paint };

const Ctx = createContext<Bau>({
  bay: { x: 16, y: 14, w: 128, h: 86 },
  w: 6,
  recipe: schoolRecipe(),
  paint: { lit: "currentColor", litOpacity: LIT, strebe: "currentColor" },
});

const ZERO: Box = { x: 0, y: 0, w: 0, h: 0 };

/** A React key for a cell: its position, unique within one composition. */
export const keyOf = (b: Box) => `${b.x},${b.y}`;

/** The `i`th of `cells()`, for compositions that address cells by index. */
export const pick = (c: Box[], i: number): Box => c[i] ?? ZERO;

/** Round to the half unit, so 45° braces and hatches stay exact in the markup. */
export const snap = (v: number) => Math.round(v * 2) / 2;

/** A sub-box of `box` by fractions of its width and height, snapped. */
export function part(box: Box, fx: number, fy: number, fw: number, fh: number): Box {
  const x = snap(box.x + box.w * fx);
  const y = snap(box.y + box.h * fy);
  return { x, y, w: snap(box.x + box.w * (fx + fw)) - x, h: snap(box.y + box.h * (fy + fh)) - y };
}

/** The open cells of `box` split into `cols` × `rows` with beams of width `w` between, row-major. */
export function cells(box: Box, cols: number, rows: number, w: number): Box[] {
  const cw = (box.w - (cols - 1) * w) / cols;
  const ch = (box.h - (rows - 1) * w) / rows;
  const xs = Array.from({ length: cols + 1 }, (_, i) => snap(box.x + i * (cw + w)));
  const ys = Array.from({ length: rows + 1 }, (_, i) => snap(box.y + i * (ch + w)));
  const out: Box[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = xs[c] ?? box.x;
      const y = ys[r] ?? box.y;
      out.push({ x, y, w: (xs[c + 1] ?? x) - w - x, h: (ys[r + 1] ?? y) - w - y });
    }
  }
  return out;
}

function paintFor(recipe: SchoolRecipe, token: string): Paint {
  const colour = `var(--hn-${token})`;
  switch (recipe.accent) {
    case "gefach":
      return { lit: colour, strebe: "currentColor" };
    case "strebe":
      return { lit: "currentColor", litOpacity: SHADE, strebe: colour };
    default:
      return { lit: "currentColor", litOpacity: LIT, strebe: "currentColor" };
  }
}

/**
 * The box with the sill beam every school motif stands on, built as the recipe says. `token` is
 * the motif's one accent, a name below `--hn-` from the action or status tier. The child is a
 * draw function: it gets the bay and draws relative to it.
 */
export function SchoolFrame({
  variant = DEFAULT_SCHOOL_VARIANT,
  token,
  children,
  ...props
}: SchoolIllustrationProps & { token: string; children: (bau: Bau) => ReactNode }) {
  const recipe = schoolRecipe(variant);
  const w = recipe.weight;
  const paint = paintFor(recipe, token);
  let bay: Box;
  let sill: [number, number];
  let frame: ReactNode = null;
  switch (recipe.framing) {
    case "gefach":
      bay = { x: 8 + w, y: 8 + w, w: 144 - 2 * w, h: SILL - 8 - w };
      sill = [8, 144];
      frame = (
        <>
          <Beam x={8} y={8} w={144} h={w} />
          <Beam x={8} y={8} w={w} h={SILL - 8} />
          <Beam x={152 - w} y={8} w={w} h={SILL - 8} />
        </>
      );
      break;
    case "haus":
      bay = { x: 28 + w, y: 58 + w, w: 104 - 2 * w, h: SILL - 58 - w };
      sill = [16, 128];
      frame = (
        <>
          <path d="M28 58 L80 6 L132 58 Z" fill="currentColor" fillOpacity={PLASTER} />
          <path d="M28 58 L80 6 L132 58" stroke="currentColor" strokeWidth={w} />
          <Beam x={58} y={32} w={44} h={w} />
          <Beam x={28} y={58} w={104} h={w} />
          <Beam x={28} y={58} w={w} h={SILL - 58} />
          <Beam x={132 - w} y={58} w={w} h={SILL - 58} />
        </>
      );
      break;
    default:
      bay = { x: 16, y: 14, w: 128, h: SILL - 14 };
      sill = [16, 128];
  }
  return (
    <Svg data-variant={variant} {...props}>
      <Ctx.Provider value={{ bay, w, recipe, paint }}>
        {frame}
        {children({ bay, w, recipe, paint })}
      </Ctx.Provider>
      <Beam x={sill[0]} y={SILL} w={sill[1]} h={w} />
    </Svg>
  );
}

/** A solid ink beam: a post when tall, a rail when wide. */
export function Beam({ x, y, w, h }: Box) {
  return <rect x={x} y={y} width={w} height={h} fill="currentColor" />;
}

/** A post of the recipe's width, from `y` down `h` units. */
export function Post({ x, y, h }: { x: number; y: number; h: number }) {
  const { w } = useContext(Ctx);
  return <Beam x={x} y={y} w={w} h={h} />;
}

/** A rail of the recipe's width, from `x` across `w` units. */
export function Rail({ x, y, w }: { x: number; y: number; w: number }) {
  const bau = useContext(Ctx);
  return <Beam x={x} y={y} w={w} h={bau.w} />;
}

/** A Gefach: a plaster fill in the ink's tone (`PLASTER`), or shaded (`SHADE`). */
export function Gefach({ x, y, w, h, tone = PLASTER }: Box & { tone?: number }) {
  return <rect x={x} y={y} width={w} height={h} fill="currentColor" fillOpacity={tone} />;
}

/** The motif's lit Gefach: the token colour, or a darker plaster when the accent is elsewhere. */
export function Lit({ x, y, w, h }: Box) {
  const { paint } = useContext(Ctx);
  return <rect x={x} y={y} width={w} height={h} fill={paint.lit} fillOpacity={paint.litOpacity} />;
}

/** The beams between the cells of a `cols` × `rows` split of `box`; the edge beams are the frame's. */
export function Lattice({ box, cols, rows }: { box: Box; cols: number; rows: number }) {
  const { w } = useContext(Ctx);
  const c = cells(box, cols, rows, w);
  return (
    <>
      {c.slice(1, cols).map((cell) => (
        <Beam key={cell.x} x={cell.x - w} y={box.y} w={w} h={box.h} />
      ))}
      {c
        .filter((_, i) => i % cols === 0 && i > 0)
        .map((cell) => (
          <Beam key={cell.y} x={box.x} y={cell.y - w} w={box.w} h={w} />
        ))}
    </>
  );
}

/** Four beams around `box`, outside it, so the box stays the open Gefach. */
export function Cell({ x, y, w, h }: Box) {
  const bau = useContext(Ctx);
  const b = bau.w;
  return (
    <>
      <Beam x={x - b} y={y - b} w={w + 2 * b} h={b} />
      <Beam x={x - b} y={y + h} w={w + 2 * b} h={b} />
      <Beam x={x - b} y={y} w={b} h={h} />
      <Beam x={x + w} y={y} w={b} h={h} />
    </>
  );
}

/**
 * A 45° brace (Strebe) between two points, which must differ by the same amount in x and y.
 * The motif's `accent` brace takes the token colour when the recipe gives it the accent.
 */
export function Brace({
  x1,
  y1,
  x2,
  y2,
  accent = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  accent?: boolean;
}) {
  const { w, paint } = useContext(Ctx);
  const stroke = accent ? paint.strebe : "currentColor";
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={w} />;
}

/**
 * A brace inside `box`, rising from its bottom-left corner or falling from its top-left one,
 * `size` of the shorter side long; the motif's accent brace when `accent` is set.
 */
export function CellBrace({
  box,
  falling = false,
  size = 1,
  accent = false,
}: {
  box: Box;
  falling?: boolean;
  size?: number;
  accent?: boolean;
}) {
  const s = snap(Math.min(box.w, box.h) * size);
  const y1 = falling ? box.y : box.y + box.h;
  return <Brace x1={box.x} y1={y1} x2={box.x + s} y2={falling ? y1 + s : y1 - s} accent={accent} />;
}

/** The Andreaskreuz: two braces crossing in the middle of `box`; the rising one is the accent. */
export function Cross({ x, y, w, h }: Box) {
  const s = snap(Math.min(w, h) * 0.4);
  const cx = snap(x + w / 2);
  const cy = snap(y + h / 2);
  return (
    <>
      <Brace x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} />
      <Brace x1={cx - s} y1={cy + s} x2={cx + s} y2={cy - s} accent />
    </>
  );
}

/** The hairline of a hatch: a third of the beam. */
export const hair = (w: number) => Math.max(1, Math.round(w / 3));

/** A 45° hatch over `box`: the open Gefach that waits for its plaster. */
export function Hatch({ x, y, w, h }: Box) {
  const bau = useContext(Ctx);
  const step = 2 * bau.w;
  const lines: string[] = [];
  for (let d = snap(-h + step / 2); d < w; d += step) {
    const t0 = Math.max(0, d);
    const t1 = Math.min(w, h + d);
    if (t1 - t0 < step / 2) continue;
    lines.push(`M${x + t0} ${y + t0 - d} L${x + t1} ${y + t1 - d}`);
  }
  return <path d={lines.join(" ")} stroke="currentColor" strokeWidth={hair(bau.w)} />;
}
