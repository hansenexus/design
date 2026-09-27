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
 * Escape and a click outside close it, and focus returns to the trigger.
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
