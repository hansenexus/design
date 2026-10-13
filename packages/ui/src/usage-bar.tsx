import type { ComponentProps } from "react";
import { cx } from "./cx";

export type UsageTone = "ok" | "warn" | "crit";

export type UsageThresholds = { warn: number; crit: number };

/** Percent at which usage turns warn and crit. */
export const USAGE_THRESHOLDS: UsageThresholds = { warn: 70, crit: 90 };

/** The tone of a usage percentage: ok below `warn`, crit from `crit` on. */
export function usageTone(pct: number, thresholds: UsageThresholds = USAGE_THRESHOLDS): UsageTone {
  if (pct >= thresholds.crit) return "crit";
  if (pct >= thresholds.warn) return "warn";
  return "ok";
}

const FILL: Record<UsageTone, string> = {
  ok: "bg-hn-status-ok",
  warn: "bg-hn-status-warn",
  crit: "bg-hn-status-crit",
};

export type UsageBarProps = Omit<ComponentProps<"div">, "children"> & {
  /** The accessible name, e.g. "Disk /". */
  label: string;
  value: number;
  max?: number;
  /** Percentages at which the fill turns warn and crit. */
  thresholds?: UsageThresholds;
  /** Bar height in px. */
  height?: number;
  /** The readout for assistive tech; defaults to the percentage. */
  valueText?: string;
};

/**
 * A bare horizontal usage bar (no label row, unlike Meter) whose fill follows thresholds.
 * The value is a `meter` with `aria-valuetext`, so it is never colour alone.
 */
export function UsageBar({
  label,
  value,
  max = 100,
  thresholds,
  height = 6,
  valueText,
  className,
  style,
  ...props
}: UsageBarProps) {
  const clamped = Math.min(max, Math.max(0, value));
  const pct = max > 0 ? (clamped / max) * 100 : 0;
  const tone = usageTone(pct, thresholds);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <meter> cannot take token colours in every engine
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText ?? `${Math.round(pct)}%`}
      data-tone={tone}
      className={cx("w-full overflow-hidden rounded-full bg-hn-surface-raised", className)}
      style={{ height, ...style }}
      {...props}
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-(--hn-duration-base) motion-reduce:transition-none",
          FILL[tone]
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
