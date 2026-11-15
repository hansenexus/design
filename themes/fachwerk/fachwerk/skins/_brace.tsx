import { cx } from "@hansenexus/ui";
import type { ComponentProps } from "react";

export type BraceProps = ComponentProps<"span"> & {
  /** The Andreaskreuz (both diagonals) instead of one brace. */
  cross?: boolean;
};

/**
 * A cell with one brace or the cross, the pack's one ornament (fachwerk frame.tsx `Brace`),
 * painted from the motif recipes. Decorative: hidden from assistive tech.
 */
export function Brace({ cross = false, className, ...props }: BraceProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "block shrink-0",
        cross ? "bg-(image:--hn-motif-cross)" : "bg-(image:--hn-motif-brace)",
        className
      )}
      {...props}
    />
  );
}
