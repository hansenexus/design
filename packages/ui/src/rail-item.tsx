import { Slot } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cx, focusRing } from "./cx";

export type RailItemProps = Omit<ComponentProps<"a">, "children"> & {
  icon?: ReactNode;
  children: ReactNode;
  /** Right-aligned meta: a count, a Kbd. */
  trailing?: ReactNode;
  /** The current page. Sets aria-current="page". */
  active?: boolean;
  /** Render the single child (a router Link, say) instead of an <a>. Put the label inside it. */
  asChild?: boolean;
};

/** One entry in the navigation rail: rest, hover, active, focus. */
export function RailItem({
  icon,
  children,
  trailing,
  active = false,
  asChild = false,
  className,
  ...props
}: RailItemProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={cx(
        "group flex h-8 min-h-hn-target w-full items-center gap-2.5 rounded-hn-sm px-3 font-hn-sans text-sm no-underline",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        active
          ? "bg-hn-surface-raised font-semibold text-hn-ink-primary"
          : "font-medium text-hn-ink-body hover:bg-hn-surface-card hover:text-hn-ink-primary",
        focusRing,
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className={cx(
            "flex shrink-0 [&_svg]:size-[17px]",
            active ? "text-hn-action-text" : "text-hn-ink-muted group-hover:text-hn-ink-body"
          )}
        >
          {icon}
        </span>
      ) : null}
      {asChild ? (
        <Slot.Slottable>{children}</Slot.Slottable>
      ) : (
        <span className="min-w-0 truncate">{children}</span>
      )}
      {trailing ? (
        <span className="ml-auto shrink-0 font-hn-mono text-[11.5px] text-hn-ink-muted">
          {trailing}
        </span>
      ) : null}
    </Comp>
  );
}
