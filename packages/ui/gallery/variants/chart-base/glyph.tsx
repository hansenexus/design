// Glyph: never colour alone, the rule StatusGlyph already follows. Every series gets a colour and a
// shape (dot, ring, triangle, diamond, square, cross); line points, the tooltip and the legend all
// draw the shape, so a chart reads in greyscale and for colour-blind eyes. Colours come from the
// status set plus plum and teal; no new tokens. The legend sits to the right and switches series
// on and off.
import { useState } from "react";
import { Tooltip, type TooltipContentProps, type TooltipValueType } from "recharts";
import { cx } from "../../../src";
import {
  assignColours,
  type ChartBase,
  type ChartConfig,
  type ChartSpec,
  colourVars,
  formatValue,
  Marks,
  Panel,
  seriesVar,
} from "./category";

type Shape = "dot" | "ring" | "triangle" | "diamond" | "square" | "cross";

const SHAPES: readonly Shape[] = ["dot", "ring", "triangle", "diamond", "square", "cross"];

const PALETTE = [
  "var(--hn-status-ok)",
  "var(--hn-status-busy)",
  "var(--hn-status-warn)",
  "var(--hn-terminal-magenta)",
  "var(--hn-terminal-cyan)",
  "var(--hn-status-crit)",
] as const;

const TONES = {
  ok: "var(--hn-status-ok)",
  busy: "var(--hn-status-busy)",
  warn: "var(--hn-status-warn)",
  crit: "var(--hn-status-crit)",
} as const;

/** A toned series takes its status shape; the rest take SHAPES in order. */
function assignShapes(config: ChartConfig): Record<string, Shape> {
  const byTone = { ok: "dot", busy: "ring", warn: "triangle", crit: "diamond" } as const;
  let next = 0;
  return Object.fromEntries(
    Object.entries(config).map(([k, s]) => {
      if (s.tone) return [k, byTone[s.tone]];
      const shape = SHAPES[next % SHAPES.length] ?? "dot";
      next += 1;
      return [k, shape];
    })
  );
}

/** The shape centred on (x, y), r its half size, in the series colour. */
function GlyphMark({
  shape,
  x,
  y,
  r,
  colour,
}: {
  shape: Shape;
  x: number;
  y: number;
  r: number;
  colour: string;
}) {
  const ground = "var(--hn-surface-card)";
  switch (shape) {
    case "dot":
      return <circle cx={x} cy={y} r={r} fill={colour} stroke={ground} strokeWidth={1} />;
    case "ring":
      return <circle cx={x} cy={y} r={r * 0.8} fill={ground} stroke={colour} strokeWidth={1.8} />;
    case "triangle":
      return (
        <path
          d={`M${x} ${y - r} L${x + r} ${y + r * 0.8} L${x - r} ${y + r * 0.8} Z`}
          fill={colour}
          stroke={ground}
          strokeWidth={1}
        />
      );
    case "diamond":
      return (
        <path
          d={`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`}
          fill={colour}
          stroke={ground}
          strokeWidth={1}
        />
      );
    case "square":
      return (
        <rect
          x={x - r * 0.8}
          y={y - r * 0.8}
          width={r * 1.6}
          height={r * 1.6}
          fill={colour}
          stroke={ground}
          strokeWidth={1}
        />
      );
    case "cross":
      return (
        <path
          d={`M${x - r} ${y - r} L${x + r} ${y + r} M${x + r} ${y - r} L${x - r} ${y + r}`}
          stroke={colour}
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
  }
}

function Glyph({ shape, k, size = 10 }: { shape: Shape; k: string; size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 10 10" className="shrink-0">
      <GlyphMark shape={shape} x={5} y={5} r={4} colour={seriesVar(k)} />
    </svg>
  );
}

/** Compact, sorted by value, the series' shape in front of every row. */
function ChartTooltipContent({
  active,
  payload,
  label,
  spec,
  shapes,
}: TooltipContentProps<TooltipValueType, string | number> & {
  spec: ChartSpec;
  shapes: Record<string, Shape>;
}) {
  if (!active || !payload?.length) return null;
  const donut = spec.kind === "donut";
  const rows = [...payload].sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));
  return (
    <div className="flex flex-col gap-1 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 py-1.5 text-[11px] shadow-hn-raised">
      {donut ? null : <span className="font-mono text-hn-ink-muted">{label}</span>}
      {rows.map((p) => {
        const key = String(donut ? p.name : p.dataKey);
        return (
          <div key={key} className="flex items-center gap-1.5">
            <Glyph shape={shapes[key] ?? "dot"} k={key} size={9} />
            <span className="font-mono text-hn-ink-primary tabular-nums">
              {formatValue(p.value, spec.unit)}
            </span>
            <span className="text-hn-ink-muted">{spec.config[key]?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A column of toggles beside the plot; a switched-off series leaves the chart. */
function ChartLegendContent({
  config,
  shapes,
  hidden,
  onToggle,
}: {
  config: ChartConfig;
  shapes: Record<string, Shape>;
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="flex w-28 shrink-0 flex-col gap-0.5 text-xs">
      {Object.entries(config).map(([k, s]) => {
        const off = hidden.has(k);
        return (
          <li key={k}>
            <button
              type="button"
              aria-pressed={!off}
              onClick={() => onToggle(k)}
              className={cx(
                "flex w-full items-center gap-1.5 rounded-hn-sm px-1.5 py-1 text-left hover:bg-hn-surface-raised",
                off ? "text-hn-ink-muted line-through" : "text-hn-ink-body"
              )}
            >
              <Glyph shape={shapes[k] ?? "dot"} k={k} />
              <span className="truncate">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Chart({ spec }: { spec: ChartSpec }) {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const shapes = assignShapes(spec.config);
  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < Object.keys(spec.config).length - 1) next.add(key);
      return next;
    });
  return (
    <Panel spec={spec}>
      <div
        data-chart="glyph"
        className="flex items-start gap-2"
        style={colourVars(assignColours(spec.config, PALETTE, TONES))}
      >
        <div className="min-w-0 flex-1">
          <Marks
            spec={spec}
            height={200}
            hidden={hidden}
            areaOpacity={0.18}
            dot={(k) =>
              spec.data.length <= 12
                ? ({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) => (
                    <GlyphMark
                      key={`${k}-${index}`}
                      shape={shapes[k] ?? "dot"}
                      x={cx ?? 0}
                      y={cy ?? 0}
                      r={3.5}
                      colour={seriesVar(k)}
                    />
                  )
                : false
            }
            tooltip={
              <Tooltip
                isAnimationActive={false}
                cursor={
                  spec.kind === "donut"
                    ? false
                    : spec.kind === "bar"
                      ? { fill: "var(--hn-surface-raised)" }
                      : { stroke: "var(--hn-line-strong)", strokeWidth: 1 }
                }
                content={(p) => <ChartTooltipContent {...p} spec={spec} shapes={shapes} />}
              />
            }
          />
        </div>
        <ChartLegendContent
          config={spec.config}
          shapes={shapes}
          hidden={hidden}
          onToggle={toggle}
        />
      </div>
    </Panel>
  );
}

export const variant: ChartBase = {
  label: "Glyph",
  summary:
    "Colour and shape per series (dot, ring, triangle, diamond, square, cross), on points, in the tooltip and the legend: reads without colour. Status hues plus plum and teal, no new tokens. Legend beside the plot toggles series; it costs about 120 px of width.",
  Chart,
};
