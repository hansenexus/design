import { type ComponentProps, useId } from "react";
import { cx } from "./cx";

export type SparklineTone = "ok" | "busy" | "warn" | "crit" | "muted" | "action";

const TEXT: Record<SparklineTone, string> = {
  ok: "text-hn-status-ok",
  busy: "text-hn-status-busy",
  warn: "text-hn-status-warn",
  crit: "text-hn-status-crit",
  muted: "text-hn-ink-muted",
  action: "text-hn-action-primary",
};

export type SparklineProps = Omit<ComponentProps<"svg">, "children" | "values" | "color"> & {
  values: readonly number[];
  /** Box width in px; ignored with `stretch`. */
  width?: number;
  height?: number;
  tone?: SparklineTone;
  /** A free line colour (any CSS colour, e.g. a series variable); overrides `tone`. */
  color?: string;
  /** Fill the area under the line with a fading gradient of the line colour. */
  area?: boolean;
  /** Bottom of the scale; defaults to the smallest value. */
  min?: number;
  /** Top of the scale; defaults to the largest value. Values above it are capped. */
  max?: number;
  /** Stretch to the container's width; the stroke stays crisp. */
  stretch?: boolean;
  /** Accessible summary. Without it the line is decorative (aria-hidden). */
  label?: string;
};

/** Points of the polyline, scaled into the box with a 1 px inset. */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
  domain: { min?: number; max?: number } = {}
): string {
  if (values.length === 0) return "";
  const max = domain.max ?? Math.max(...values);
  const min = domain.min ?? Math.min(...values);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - 2) / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step + 1 : width / 2;
      const y = height - 2 - ((Math.min(max, Math.max(min, v)) - min) / range) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/** A trend line without axes. Flat, one stroke and no glow; `area` adds a fading fill. */
export function Sparkline({
  values,
  width = 120,
  height = 28,
  tone = "ok",
  color,
  area = false,
  min,
  max,
  stretch = false,
  label,
  className,
  style,
  ...props
}: SparklineProps) {
  const gradient = `hn-spark-${useId()}`;
  const points = sparklinePoints(values, width, height, { min, max });
  // The area closes along the bottom edge, under the first and last point.
  const [first, last] = values.length > 1 ? [1, width - 1] : [width / 2, width / 2];
  return (
    <svg
      width={stretch ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? "none" : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("shrink-0 overflow-visible", color ? undefined : TEXT[tone], className)}
      style={color ? { color, ...style } : style}
      {...props}
    >
      {label ? <title>{label}</title> : null}
      {area && points ? (
        <>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            points={`${first},${height} ${points} ${last},${height}`}
            fill={`url(#${gradient})`}
          />
        </>
      ) : null}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect={stretch ? "non-scaling-stroke" : undefined}
      />
    </svg>
  );
}
