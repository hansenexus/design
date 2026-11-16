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
        // Height, corner and inline padding are the shell recipe (design#152), so a flush pack
        // draws full-width cells without forking the atom.
        "group flex h-(--hn-shell-nav-row) min-h-hn-target w-full items-center gap-2.5 rounded-(--hn-shell-nav-radius) px-(--hn-shell-nav-pad) font-hn-sans text-sm no-underline",
        "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
        active
          ? "bg-hn-nav-active font-semibold text-hn-nav-active-ink"
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
            active ? "text-hn-nav-active-icon" : "text-hn-ink-muted group-hover:text-hn-ink-body"
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
        <span
          className={cx(
            "ml-auto shrink-0 font-hn-mono text-[11.5px]",
            active ? "text-hn-nav-active-meta" : "text-hn-ink-muted"
          )}
        >
          {trailing}
        </span>
      ) : null}
    </Comp>
  );
}
