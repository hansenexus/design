import { Accordion as AccordionPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cx, focusRing } from "./cx";
import { ChevronDownIcon } from "./icons";
import { LAYOUT_COPY } from "./layout-copy";
import type { StateLocale } from "./state-copy";

/**
 * Sections that open and close. Radix gives the keyboard: Tab to a header, Enter or Space
 * toggles, the arrow keys, Home and End move between headers.
 */
export function Accordion({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      className={cx(
        "flex flex-col rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card font-hn-sans",
        className
      )}
      {...props}
    />
  );
}

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cx("border-b border-hn-line-subtle last:border-b-0", className)}
      {...props}
    />
  );
}

export type AccordionTriggerProps = ComponentProps<typeof AccordionPrimitive.Trigger> & {
  /** Trailing detail before the chevron: a count, a StatusBadge. */
  meta?: ReactNode;
};

/** The header button. The chevron turns when open; disabled items dim and skip the keyboard. */
export function AccordionTrigger({ meta, className, children, ...props }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Header className="m-0 flex">
      <AccordionPrimitive.Trigger
        className={cx(
          "group flex min-h-hn-target flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-sm font-semibold text-hn-ink-primary",
          "hover:bg-hn-surface-raised disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
          "transition-colors duration-(--hn-duration-fast) motion-reduce:transition-none",
          focusRing,
          className
        )}
        {...props}
      >
        <span className="min-w-0 flex-1">{children}</span>
        {meta ? <span className="text-[12.5px] font-normal text-hn-ink-muted">{meta}</span> : null}
        <ChevronDownIcon
          className={cx(
            "shrink-0 text-hn-ink-muted group-data-[state=open]:rotate-180",
            "transition-transform duration-(--hn-duration-fast) motion-reduce:transition-none"
          )}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export type AccordionContentProps = ComponentProps<typeof AccordionPrimitive.Content> & {
  /** Language of the empty copy. */
  locale?: StateLocale;
  /** Shown when the section has no children; defaults to the locale's "Nothing here yet." */
  emptyMessage?: ReactNode;
};

/** The section body. Without children it says so, instead of opening onto nothing. */
export function AccordionContent({
  locale = "en",
  emptyMessage,
  className,
  children,
  ...props
}: AccordionContentProps) {
  const empty = children === undefined || children === null || children === false;
  return (
    <AccordionPrimitive.Content
      data-empty={empty ? "" : undefined}
      className={cx("px-4 pb-4 text-sm text-hn-ink-body", className)}
      {...props}
    >
      {empty ? (
        <p className="m-0 text-hn-ink-muted">{emptyMessage ?? LAYOUT_COPY[locale].empty}</p>
      ) : (
        children
      )}
    </AccordionPrimitive.Content>
  );
}
