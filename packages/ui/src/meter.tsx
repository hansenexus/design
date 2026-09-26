import type { ComponentProps } from "react";
import { cx } from "./cx";

export type MeterTone = "ok" | "busy" | "warn" | "crit";

const FILL: Record<MeterTone, string> = {
  ok: "bg-hn-status-ok",
  busy: "bg-hn-status-busy",
  warn: "bg-hn-status-warn",
  crit: "bg-hn-status-crit",
};

/** A healthy value reads in ink; anything else takes its status colour. */
const VALUE: Record<MeterTone, string> = {
  ok: "text-hn-ink-primary",
  busy: "text-hn-status-busy",
  warn: "text-hn-status-warn",
  crit: "text-hn-status-crit",
};

export type MeterProps = Omit<ComponentProps<"div">, "children"> & {
  label: string;
  value: number;
  min?: number;
  max?: number;
  tone?: MeterTone;
  /** The readout; defaults to the value as a percentage of the range. */
  valueText?: string;
};

/** A labelled gauge (CPU, memory, disk) with its value always in text. */
export function Meter({
  label,
  value,
  min = 0,
  max = 100,
  tone = "ok",
  valueText,
  className,
  ...props
}: MeterProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
  const text = valueText ?? `${Math.round(pct)}%`;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <meter> cannot carry the label row or take token colours in every engine
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={text}
      data-tone={tone}
      className={cx("flex flex-col gap-1.5 font-hn-sans", className)}
      {...props}
    >
      <div className="flex justify-between gap-3 text-[12.5px] text-hn-ink-muted">
        <span>{label}</span>
        <span className={cx("font-hn-mono", VALUE[tone])}>{text}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-hn-surface-raised">
        <div className={cx("h-full", FILL[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
