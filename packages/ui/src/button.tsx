import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-hn-action-primary text-hn-action-primary-ink border-hn-action-primary hover:bg-hn-action-primary-hover hover:border-hn-action-primary-hover",
  secondary: "bg-transparent text-hn-ink-primary border-hn-line-strong hover:bg-hn-surface-raised",
  ghost:
    "bg-transparent text-hn-ink-body border-transparent hover:bg-hn-surface-raised hover:text-hn-ink-primary",
  danger:
    "bg-hn-action-danger text-hn-action-danger-ink border-hn-action-danger hover:brightness-110",
};

const SIZE: Record<ButtonSize, string> = {
  md: "h-9 px-3.5 text-sm",
  lg: "h-12 px-4 text-[15px]",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
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
      className={cx(
        "inline-flex min-h-hn-target shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-hn-md border font-hn-sans font-semibold no-underline",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        focusRing,
        VARIANT[variant],
        SIZE[size],
        className
      )}
      {...props}
    />
  );
}
