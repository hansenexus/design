import { Toggle as TogglePrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type ToggleVariant = "ghost" | "outline";
export type ToggleSize = "sm" | "md";

/** The toggle look, shared with ToggleGroupItem. */
export const TOGGLE_STYLES = {
  base:
    "inline-flex min-h-hn-target shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-hn-md border font-hn-sans text-sm font-medium text-hn-ink-body " +
    "hover:bg-hn-surface-raised hover:text-hn-ink-primary " +
    "data-[state=on]:bg-hn-surface-tint data-[state=on]:text-hn-ink-primary " +
    "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none " +
    "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  variant: {
    ghost: "border-transparent bg-transparent",
    outline: "border-hn-line-strong bg-transparent data-[state=on]:border-hn-action-primary",
  } satisfies Record<ToggleVariant, string>,
  size: {
    sm: "h-8 min-w-8 px-2",
    md: "h-9 min-w-9 px-2.5",
  } satisfies Record<ToggleSize, string>,
} as const;

export type ToggleProps = ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: ToggleVariant;
  size?: ToggleSize;
};

/**
 * A two-state button on Radix Toggle: `aria-pressed` follows `pressed`, Space and Enter flip it.
 * Pressed is the tint surface with primary ink. An icon-only toggle needs aria-label.
 */
export function Toggle({ variant = "ghost", size = "md", className, ...props }: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-variant={variant}
      className={cx(
        TOGGLE_STYLES.base,
        TOGGLE_STYLES.variant[variant],
        TOGGLE_STYLES.size[size],
        focusRing,
        className
      )}
      {...props}
    />
  );
}
