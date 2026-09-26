import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx } from "./cx";

export function TooltipProvider({
  delayDuration = 300,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export type TooltipContentProps = ComponentProps<typeof TooltipPrimitive.Content> & {
  /** Portal target; defaults to document.body. */
  container?: HTMLElement | null;
};

/** A short hint on Erhöht. Never the only place information lives. */
export function TooltipContent({
  className,
  sideOffset = 6,
  container,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal container={container}>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cx(
          "z-50 max-w-72 rounded-hn-sm border border-hn-line-strong bg-hn-surface-raised px-2 py-1 font-hn-sans text-xs text-hn-ink-primary shadow-hn-lift",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
