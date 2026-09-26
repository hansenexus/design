import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { type Status, StatusGlyph } from "./status-glyph";

export const STATUS_LABEL: Record<Status, string> = {
  ok: "Healthy",
  busy: "Running",
  warn: "Attention",
  crit: "Critical",
  off: "Offline",
  unknown: "Unknown",
};

/** off and unknown are shape colours only; their labels use ink.muted. */
const TEXT: Record<Status, string> = {
  ok: "text-hn-status-ok",
  busy: "text-hn-status-busy",
  warn: "text-hn-status-warn",
  crit: "text-hn-status-crit",
  off: "text-hn-ink-muted",
  unknown: "text-hn-ink-muted",
};

export type StatusBadgeProps = ComponentProps<"span"> & {
  status: Status;
  /** Defaults to the English label of the status (Healthy, Running, ...). */
  children?: ReactNode;
};

/** A status pill: shape plus label, never colour alone. */
export function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      data-status={status}
      className={cx(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-hn-pill bg-hn-surface-raised px-2.5 font-hn-sans text-[12.5px] font-semibold",
        TEXT[status],
        className
      )}
      {...props}
    >
      <StatusGlyph status={status} size={9} />
      <span>{children ?? STATUS_LABEL[status]}</span>
    </span>
  );
}
