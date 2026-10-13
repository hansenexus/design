import { ScrollArea as ScrollAreaPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type ScrollAreaProps = ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /** Which bars to draw; the content scrolls natively either way. */
  scrollbars?: "vertical" | "horizontal" | "both";
};

/**
 * A scrolling box with thin token-coloured bars on Radix ScrollArea. Native scrolling, wheel,
 * touch and keyboard stay as they are; only the bars are drawn. Give the root a height (or a
 * max-height).
 */
export function ScrollArea({
  className,
  children,
  scrollbars = "vertical",
  type = "hover",
  ...props
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      type={type}
      className={cx("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className={cx("size-full rounded-[inherit]", focusRing)}>
        {children}
      </ScrollAreaPrimitive.Viewport>
      {scrollbars !== "horizontal" && <ScrollBar orientation="vertical" />}
      {scrollbars !== "vertical" && <ScrollBar orientation="horizontal" />}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/** One bar of a ScrollArea; ScrollArea draws its own, this is for a custom root. */
export function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      className={cx(
        "flex touch-none p-px select-none",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        orientation === "vertical" ? "h-full w-2 border-l border-l-transparent" : "h-2 flex-col",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-hn-pill bg-hn-line-strong hover:bg-hn-ink-muted" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}
