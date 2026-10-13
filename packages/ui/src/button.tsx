import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon-xs" | "icon-sm" | "icon" | "icon-lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-hn-action-primary text-hn-action-primary-ink border-hn-action-primary hover:bg-hn-action-primary-hover hover:border-hn-action-primary-hover",
  secondary: "bg-transparent text-hn-ink-primary border-hn-line-strong hover:bg-hn-surface-raised",
  /** Like secondary, on an opaque card fill: holds its edge over rows, media and tinted panels. */
  outline:
    "bg-hn-surface-card text-hn-ink-primary border-hn-line-strong hover:bg-hn-surface-raised",
  ghost:
    "bg-transparent text-hn-ink-body border-transparent hover:bg-hn-surface-raised hover:text-hn-ink-primary",
  danger:
    "bg-hn-action-danger text-hn-action-danger-ink border-hn-action-danger hover:brightness-110",
};

// Gap, radius and icon size live here, not in the base classes: cx appends without merging, so
// two utilities for one property would race on stylesheet order. Compact and icon sizes never
// drop below the density's minimum target (min-h-hn-target, min-w-hn-target).
const SIZE: Record<ButtonSize, string> = {
  xs: "h-6 gap-1 rounded-hn-sm px-2 text-xs [&_svg]:size-3.5",
  sm: "h-8 gap-1.5 rounded-hn-md px-3 text-[13px] [&_svg]:size-4",
  md: "h-9 gap-2 rounded-hn-md px-3.5 text-sm [&_svg]:size-4",
  lg: "h-12 gap-2 rounded-hn-md px-4 text-[15px] [&_svg]:size-4",
  "icon-xs": "size-6 min-w-hn-target rounded-hn-sm p-0 [&_svg]:size-3.5",
  "icon-sm": "size-8 min-w-hn-target rounded-hn-md p-0 [&_svg]:size-4",
  icon: "size-9 min-w-hn-target rounded-hn-md p-0 [&_svg]:size-4",
  "icon-lg": "size-12 min-w-hn-target rounded-hn-md p-0 [&_svg]:size-5",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  /** `icon-*` sizes are square and hold one icon: give them an `aria-label`. */
  size?: ButtonSize;
  /** Render the child element (a link, say) with the button's look. */
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      data-variant={variant}
      data-size={size}
      className={cx(
        "inline-flex min-h-hn-target shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border font-hn-sans font-semibold no-underline",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        focusRing,
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...props}
    />
  );
}
