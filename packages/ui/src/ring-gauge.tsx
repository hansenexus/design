import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type RingGaugeTone = "ok" | "busy" | "warn" | "crit" | "muted" | "action";

const TEXT: Record<RingGaugeTone, string> = {
  ok: "text-hn-status-ok",
  busy: "text-hn-status-busy",
  warn: "text-hn-status-warn",
  crit: "text-hn-status-crit",
  muted: "text-hn-ink-muted",
  action: "text-hn-action-primary",
};

/** Font size that keeps the centre value inside the ring as its digit count grows ("100%"). */
export function ringFontSize(text: string, size: number): number {
  const f = text.length >= 4 ? 0.23 : text.length === 3 ? 0.29 : 0.34;
  return Math.round(size * f);
}

export type RingGaugeProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  /** The accessible name, e.g. "CPU". */
  label: string;
  value: number;
  max?: number;
  /** Arc colour; a status tone or the action colour. */
  tone?: RingGaugeTone;
  /** A free arc colour (any CSS colour, e.g. a series variable); overrides `tone`. */
  color?: string;
  /** Outer diameter in px. */
  size?: number;
  /** Arc width in px. */
  stroke?: number;
  /** The centre text, auto-sized; defaults to the percentage. Also the `aria-valuetext`. */
  valueText?: string;
  /** A small uppercase caption under the value. */
  caption?: string;
  /** Replaces the centre value and caption. */
  children?: ReactNode;
};

/** A radial gauge with its value as text in the centre. Flat: one arc on a muted track. */
export function RingGauge({
  label,
  value,
  max = 100,
  tone = "action",
  color,
  size = 58,
  stroke = 6,
  valueText,
  caption,
  children,
  className,
  style,
  ...props
}: RingGaugeProps) {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const text = valueText ?? `${Math.round(pct)}%`;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <meter> cannot draw a ring
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={text}
      data-tone={color ? undefined : tone}
      className={cx("relative inline-grid shrink-0 place-items-center font-hn-sans", className)}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      <svg
        width={size}
        height={size}
        aria-hidden="true"
        className={cx("-rotate-90", color ? undefined : TEXT[tone])}
        style={color ? { color } : undefined}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-hn-surface-raised"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-(--hn-duration-base) motion-reduce:transition-none"
        />
      </svg>
      {/* The default centre repeats aria-valuetext; custom children stay readable. */}
      <div
        className="absolute inset-0 grid place-items-center"
        aria-hidden={children ? undefined : true}
      >
        {children ?? (
          <div className="text-center leading-none">
            <div
              className="font-semibold text-hn-ink-primary tabular-nums"
              style={{ fontSize: ringFontSize(text, size) }}
            >
              {text}
            </div>
            {caption ? (
              <div
                className="mt-0.5 text-hn-ink-muted uppercase tracking-wide"
                style={{ fontSize: Math.max(8, Math.round(size * 0.13)) }}
              >
                {caption}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
