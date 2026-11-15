import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { LAYOUT_COPY } from "./layout-copy";
import { Skeleton, SkeletonGroup } from "./skeleton";
import { skinnable } from "./skin";
import type { StateLocale } from "./state-copy";

export type CardProps = ComponentProps<"div"> & {
  /** raised lifts the card one step (surface.raised) for a card inside a card. */
  surface?: "card" | "raised";
  /** Greys the card out and makes it inert: nothing inside can be focused or clicked. */
  disabled?: boolean;
  /** An action inside is running: aria-busy, and the card stays as it is (no layout shift). */
  pending?: boolean;
};

const SURFACE = { card: "bg-hn-surface-card", raised: "bg-hn-surface-raised" } as const;

/** A bordered surface for one thing: a machine, a run, a setting. Header, body, footer inside. */
function CardRoot({
  surface = "card",
  disabled = false,
  pending = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      data-surface={surface}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      aria-busy={pending || undefined}
      inert={disabled || undefined}
      className={cx(
        "flex flex-col rounded-hn-lg border border-hn-line-subtle font-hn-sans text-hn-ink-body",
        SURFACE[surface],
        disabled && "opacity-50",
        className
      )}
      {...props}
    />
  );
}

function CardHeaderBase({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("flex flex-col gap-1 px-4 pt-4", className)} {...props} />;
}

export type CardTitleElement = "h2" | "h3" | "h4" | "p";

export type CardTitleProps = ComponentProps<"h3"> & {
  /** The title's element, to fit the page's heading outline. */
  as?: CardTitleElement;
};

function CardTitleBase({ as: Title = "h3", className, ...props }: CardTitleProps) {
  return (
    <Title
      className={cx(
        "m-0 font-hn-display text-base leading-snug font-semibold text-hn-ink-primary",
        className
      )}
      {...props}
    />
  );
}

function CardDescriptionBase({ className, ...props }: ComponentProps<"p">) {
  return <p className={cx("m-0 text-[13px] text-hn-ink-muted", className)} {...props} />;
}

function CardBodyBase({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("px-4 py-4 text-sm", className)} {...props} />;
}

/** Actions and meta, right-aligned, on a subtle rule. */
function CardFooterBase({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-center justify-end gap-2 border-t border-hn-line-subtle px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

declare module "./skin" {
  interface SkinSlots {
    card: CardProps;
    "card.header": ComponentProps<"div">;
    "card.title": CardTitleProps;
    "card.description": ComponentProps<"p">;
    "card.body": ComponentProps<"div">;
    "card.footer": ComponentProps<"div">;
  }
}

/** A bordered surface for one thing: a machine, a run, a setting. Header, body, footer inside. */
export const Card = skinnable("card", CardRoot);
/** The card's head: title and description, stacked. */
export const CardHeader = skinnable("card.header", CardHeaderBase);
export const CardTitle = skinnable("card.title", CardTitleBase);
export const CardDescription = skinnable("card.description", CardDescriptionBase);
export const CardBody = skinnable("card.body", CardBodyBase);
/** Actions and meta, right-aligned, on a subtle rule. */
export const CardFooter = skinnable("card.footer", CardFooterBase);

export type CardSkeletonProps = Omit<ComponentProps<"div">, "children"> & {
  /** Lines of body copy. */
  lines?: number;
  /** A leading avatar circle in the header. */
  avatar?: boolean;
  /** A media or chart block under the copy; a number is its height in px. */
  media?: boolean | number;
  /** A footer row with one button-sized block. */
  footer?: boolean;
  /** What assistive tech hears; defaults to the locale's "Loading". */
  label?: string;
  locale?: StateLocale;
  surface?: CardProps["surface"];
};

/** A Card while its data loads: the same frame, placeholders in the shape of the content. */
export function CardSkeleton({
  lines = 2,
  avatar = false,
  media = false,
  footer = false,
  label,
  locale = "en",
  surface = "card",
  className,
  ...props
}: CardSkeletonProps) {
  return (
    <SkeletonGroup
      label={label ?? LAYOUT_COPY[locale].loading}
      data-surface={surface}
      className={cx(
        "flex flex-col rounded-hn-lg border border-hn-line-subtle",
        SURFACE[surface],
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        {avatar ? <Skeleton shape="circle" width={32} /> : null}
        <Skeleton shape="text" width="45%" className="text-base" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <Skeleton shape="text" lines={lines} className="text-sm" />
        {media ? <Skeleton height={typeof media === "number" ? media : 64} /> : null}
      </div>
      {footer ? <SkeletonFooter /> : null}
    </SkeletonGroup>
  );
}

function SkeletonFooter(): ReactNode {
  return (
    <div className="flex justify-end border-t border-hn-line-subtle px-4 py-3">
      <Skeleton width={96} height={36} />
    </div>
  );
}
