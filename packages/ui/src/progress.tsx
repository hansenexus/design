import type { ComponentProps } from "react";
import { cx } from "./cx";
import { STATE_COPY, type StateLocale } from "./state-copy";

export type ProgressProps = Omit<ComponentProps<"div">, "children"> & {
  /** Done so far, 0 to max. Leave it out (or null) when the total is unknown: indeterminate. */
  value?: number | null;
  max?: number;
  /** The accessible name; defaults to the locale's "Progress". */
  label?: string;
  /** Show the label and readout above the bar. */
  showLabel?: boolean;
  /** The readout; defaults to the value as a percentage of max. */
  valueText?: string;
  locale?: StateLocale;
};

/**
 * A progress bar: busy while it runs, ok once complete. Determinate with a value; without one
 * it is indeterminate and the track pulses on the skeleton tokens. Under reduced motion the
 * pulse and the width transition stop.
 */
export function Progress({
  value,
  max = 100,
  label,
  showLabel = false,
  valueText,
  locale = "en",
  className,
  ...props
}: ProgressProps) {
  const name = label ?? STATE_COPY[locale].progress;
  const determinate = typeof value === "number" && Number.isFinite(value);
  const clamped = determinate ? Math.min(max, Math.max(0, value)) : 0;
  const pct = determinate && max > 0 ? (clamped / max) * 100 : 0;
  const complete = determinate && clamped >= max;
  const text = determinate ? (valueText ?? `${Math.round(pct)}%`) : valueText;
  return (
    <div
      role="progressbar"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuetext={text}
      aria-busy={determinate ? undefined : true}
      data-state={complete ? "complete" : determinate ? "loading" : "indeterminate"}
      className={cx("flex flex-col gap-1.5 font-hn-sans", className)}
      {...props}
    >
      {showLabel ? (
        <div className="flex justify-between gap-3 text-[12.5px] text-hn-ink-muted">
          <span>{name}</span>
          {text ? <span className="font-hn-mono text-hn-ink-primary">{text}</span> : null}
        </div>
      ) : null}
      {determinate ? (
        <div className="h-1.5 overflow-hidden rounded-[3px] bg-hn-surface-raised">
          <div
            className={cx(
              "h-full transition-[width] duration-(--hn-duration-base) motion-reduce:transition-none",
              complete ? "bg-hn-status-ok" : "bg-hn-status-busy"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-1.5 rounded-[3px] bg-hn-skeleton-base animate-hn-pulse motion-reduce:animate-none" />
      )}
    </div>
  );
}
