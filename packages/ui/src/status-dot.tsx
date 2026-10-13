import type { SVGProps } from "react";
import { cx } from "./cx";
import type { Status } from "./status-glyph";

const TEXT: Record<Status, string> = {
  ok: "text-hn-status-ok",
  busy: "text-hn-status-busy",
  warn: "text-hn-status-warn",
  crit: "text-hn-status-crit",
  off: "text-hn-status-off",
  unknown: "text-hn-status-unknown",
};

export type StatusDotProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  status: Status;
  /** The accessible name, e.g. "Online". The dot itself is colour only, so it is required. */
  label: string;
  /** Diameter of the dot in px; the halo adds 3 px on each side. */
  size?: number;
};

/**
 * A status dot with a halo ring, for dense rows where a StatusGlyph's shape would be noise.
 * Colour alone carries nothing: `label` names the state for assistive tech and as a tooltip.
 */
export function StatusDot({ status, label, size = 8, className, ...props }: StatusDotProps) {
  const box = size + 6;
  const c = box / 2;
  return (
    <svg
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label={label}
      data-status={status}
      className={cx("inline-block shrink-0", TEXT[status], className)}
      {...props}
    >
      <title>{label}</title>
      <circle cx={c} cy={c} r={c} fill="currentColor" fillOpacity="0.22" />
      <circle cx={c} cy={c} r={size / 2} fill="currentColor" />
    </svg>
  );
}
