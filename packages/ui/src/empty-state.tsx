import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { STATE_COPY, type StateLocale } from "./state-copy";

export type EmptyStateVariant = "empty" | "no-results";

export const EMPTY_STATE_VARIANTS: readonly EmptyStateVariant[] = ["empty", "no-results"];

export type StateTitleElement = "h2" | "h3" | "h4" | "p";

export type EmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  /** empty: nothing exists yet; no-results: things exist, the search or filter matched none. */
  variant?: EmptyStateVariant;
  /** Default copy language; title and description override it. */
  locale?: StateLocale;
  title?: ReactNode;
  description?: ReactNode;
  /** The way out: a Button to create the first item, or to clear the filters. */
  action?: ReactNode;
  /** An illustration or icon above the title. Decorative: rendered aria-hidden. */
  illustration?: ReactNode;
  /** The title's element, to fit the page's heading outline. */
  titleAs?: StateTitleElement;
};

const COPY_KEY = { empty: "empty", "no-results": "noResults" } as const;

/** Shared frame of EmptyState and ErrorState: centred, the illustration above a short text. */
export const STATE_FRAME =
  "flex flex-col items-center gap-3 px-4 py-10 text-center font-hn-sans text-hn-ink-body";

/** A data surface with nothing to show, and what to do about it. */
export function EmptyState({
  variant = "empty",
  locale = "en",
  title,
  description,
  action,
  illustration,
  titleAs: Title = "h2",
  className,
  ...props
}: EmptyStateProps) {
  const copy = STATE_COPY[locale][COPY_KEY[variant]];
  return (
    <div data-variant={variant} className={cx(STATE_FRAME, className)} {...props}>
      {illustration ? (
        <div aria-hidden="true" className="mb-1 text-hn-ink-muted">
          {illustration}
        </div>
      ) : null}
      <Title className="m-0 font-hn-display text-lg font-semibold text-hn-ink-primary">
        {title ?? copy.title}
      </Title>
      <p className="m-0 max-w-[48ch] text-sm">{description ?? copy.description}</p>
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
