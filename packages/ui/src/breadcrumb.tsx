import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cx, focusRing } from "./cx";
import { ChevronRightIcon, EllipsisIcon } from "./icons";
import { STATE_COPY, type StateLocale } from "./state-copy";

export type BreadcrumbProps = ComponentProps<"nav"> & {
  /** Default copy language, for the landmark's name. `aria-label` overrides it. */
  locale?: StateLocale;
};

/** Where the page sits: a `nav` landmark around a BreadcrumbList. */
export function Breadcrumb({ locale = "en", "aria-label": label, ...props }: BreadcrumbProps) {
  return <nav aria-label={label ?? STATE_COPY[locale].navigation.breadcrumb} {...props} />;
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cx(
        "m-0 flex list-none flex-wrap items-center gap-1.5 p-0 font-hn-sans text-sm text-hn-ink-muted",
        className
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return <li className={cx("inline-flex min-w-0 items-center gap-1.5", className)} {...props} />;
}

export type BreadcrumbLinkProps = ComponentProps<"a"> & {
  /** Render the single child (a router Link, say) with the link's look. */
  asChild?: boolean;
};

/** An ancestor page. Long names truncate; the full name stays in the accessible name. */
export function BreadcrumbLink({ asChild = false, className, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot.Root : "a";
  return (
    <Comp
      className={cx(
        "max-w-[24ch] truncate rounded-hn-sm text-hn-ink-body no-underline underline-offset-4 hover:text-hn-ink-primary hover:underline",
        focusRing,
        className
      )}
      {...props}
    />
  );
}

/** The current page: plain text with aria-current="page", not a link. */
export function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      className={cx("max-w-[32ch] truncate font-medium text-hn-ink-primary", className)}
      {...props}
    />
  );
}

/** The mark between two items; a chevron unless you pass one. Hidden from assistive tech. */
export function BreadcrumbSeparator({ className, children, ...props }: ComponentProps<"li">) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      className={cx("inline-flex text-hn-ink-muted [&_svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

export type BreadcrumbEllipsisProps = ComponentProps<"button"> & {
  locale?: StateLocale;
};

/**
 * The collapsed middle of a long path. A button, so it can open a Menu of the hidden levels:
 * `<MenuTrigger asChild><BreadcrumbEllipsis /></MenuTrigger>`.
 */
export function BreadcrumbEllipsis({
  locale = "en",
  className,
  "aria-label": label,
  type = "button",
  ...props
}: BreadcrumbEllipsisProps) {
  return (
    <button
      type={type}
      aria-label={label ?? STATE_COPY[locale].navigation.more}
      className={cx(
        "inline-flex size-6 min-h-hn-target min-w-hn-target cursor-pointer items-center justify-center rounded-hn-sm border-0 bg-transparent p-0 text-hn-ink-muted hover:bg-hn-surface-raised hover:text-hn-ink-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        focusRing,
        className
      )}
      {...props}
    >
      <EllipsisIcon />
    </button>
  );
}
