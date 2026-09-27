import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

export type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/**
 * A floating panel on Radix Popover: the card surface with the lift shadow, as Menu and Select.
 * Escape and a click outside close it, and focus returns to the trigger. It is a `dialog`: name it
 * with `aria-labelledby` (PopoverTitle) or `aria-label`. No padding of its own, so a list or a
 * calendar can run edge to edge; give free content `p-4`.
 */
export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  container,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cx(
          "z-50 rounded-hn-lg border border-hn-line-strong bg-hn-surface-card font-hn-sans text-hn-ink-body shadow-hn-lift outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

/** The popover's heading; give it an id and point the content's aria-labelledby at it. */
export function PopoverTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cx("m-0 text-sm font-semibold text-hn-ink-primary", className)} {...props} />
  );
}
