import type { SVGProps } from "react";
import { cx } from "./cx";

export type Status = "ok" | "busy" | "warn" | "crit" | "off" | "unknown";

export const STATUSES: readonly Status[] = ["ok", "busy", "warn", "crit", "off", "unknown"];

/** Shape colour per status. Status is never colour alone: each has its own shape. */
const FILL: Record<Status, string> = {
  ok: "fill-hn-status-ok",
  busy: "stroke-hn-status-busy",
  warn: "fill-hn-status-warn",
  crit: "fill-hn-status-crit",
  off: "stroke-hn-status-off",
  unknown: "stroke-hn-status-unknown",
};

function Shape({ status }: { status: Status }) {
  switch (status) {
    case "ok":
      return <circle cx="5" cy="5" r="4.2" />;
    case "busy":
      return <circle cx="5" cy="5" r="3.6" fill="none" strokeWidth="1.8" strokeDasharray="17 6" />;
    case "warn":
      return <path d="M5 0.8 L9.4 9 L0.6 9 Z" />;
    case "crit":
      return <path d="M5 0.4 L9.6 5 L5 9.6 L0.4 5 Z" />;
    case "off":
      return <circle cx="5" cy="5" r="3.6" fill="none" strokeWidth="1.8" />;
    case "unknown":
      return <circle cx="5" cy="5" r="3.6" fill="none" strokeWidth="1.6" strokeDasharray="2 2" />;
  }
}

export type StatusGlyphProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  status: Status;
  /** Edge length in px. */
  size?: number;
};

/** ok dot, busy ring, warn triangle, crit diamond, off hollow circle, unknown dashed circle. */
export function StatusGlyph({ status, size = 10, className, ...props }: StatusGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden="true"
      data-status={status}
      className={cx("shrink-0", FILL[status], className)}
      {...props}
    >
      <Shape status={status} />
    </svg>
  );
}
