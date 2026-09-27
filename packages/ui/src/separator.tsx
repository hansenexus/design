import { Separator as SeparatorPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root> & {
  /** strong: line.strong, for a boundary between groups; subtle (default) inside a group. */
  tone?: "subtle" | "strong";
};

/**
 * A 1 px rule between content. Decorative by default (no role); pass decorative={false} when
 * it separates sections a screen reader should know about (role=separator).
 */
export function Separator({
  orientation = "horizontal",
  decorative = true,
  tone = "subtle",
  className,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      orientation={orientation}
      decorative={decorative}
      data-tone={tone}
      className={cx(
        "shrink-0",
        tone === "strong" ? "bg-hn-line-strong" : "bg-hn-line-subtle",
        orientation === "vertical" ? "w-px self-stretch" : "h-px w-full",
        className
      )}
      {...props}
    />
  );
}
