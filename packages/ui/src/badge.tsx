import type { ComponentProps } from "react";
import { cx } from "./cx";

export type BadgeTone = "neutral" | "accent";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-hn-surface-raised text-hn-ink-body",
  accent: "bg-hn-surface-tint text-hn-action-text",
};

export type BadgeProps = ComponentProps<"span"> & { tone?: BadgeTone };

/** A small pill for counts, kinds and tags. For health use StatusBadge. */
export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cx(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-hn-pill px-2.5 font-hn-sans text-[12.5px] font-semibold",
        TONE[tone],
        className
      )}
      {...props}
    />
  );
}
