import type { ComponentProps } from "react";
import { cx } from "./cx";

export type SparklineTone = "ok" | "busy" | "warn" | "crit" | "muted";

const STROKE: Record<SparklineTone, string> = {
  ok: "stroke-hn-status-ok",
  busy: "stroke-hn-status-busy",
  warn: "stroke-hn-status-warn",
  crit: "stroke-hn-status-crit",
  muted: "stroke-hn-ink-muted",
};

export type SparklineProps = Omit<ComponentProps<"svg">, "children" | "values"> & {
  values: readonly number[];
  width?: number;
  height?: number;
  tone?: SparklineTone;
  /** Accessible summary. Without it the line is decorative (aria-hidden). */
  label?: string;
};

/** Points of the polyline, scaled into the box with a 1 px inset. */
export function sparklinePoints(values: readonly number[], width: number, height: number): string {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step + 1 : width / 2;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** A trend line without axes. Flat, one stroke, no fill or glow. */
export function Sparkline({
  values,
  width = 120,
  height = 28,
  tone = "ok",
  label,
  className,
  ...props
}: SparklineProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("shrink-0 overflow-visible", className)}
      {...props}
    >
      {label ? <title>{label}</title> : null}
      <polyline
        points={sparklinePoints(values, width, height)}
        fill="none"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={STROKE[tone]}
      />
    </svg>
  );
}
