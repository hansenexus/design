import type { ComponentProps, ReactNode } from "react";
import { Badge } from "./badge";
import { Card } from "./card";
import { cx } from "./cx";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "./icons";
import { LAYOUT_COPY } from "./layout-copy";
import { Skeleton, SkeletonGroup } from "./skeleton";
import { skinnable } from "./skin";
import { Sparkline } from "./sparkline";
import type { StateLocale } from "./state-copy";

/** Which way the number moved against its period. */
export type KpiDirection = "up" | "down" | "flat";

/** Good, bad or neither: the direction read against the number's good side. */
export type KpiTone = "ok" | "crit" | "muted";

export type KpiCardProps = Omit<ComponentProps<"div">, "children"> & {
  /** What the number is: "Active lanes", "Umsatz Oktober". */
  label: ReactNode;
  /** The number as shown, unit included: "96.4%", "48.230 €". Wraps, never truncates. */
  value: ReactNode;
  /** The change as shown, sign included: "+12.5%", "−4 min". Without it the card has no badge. */
  delta?: string;
  /** Which way the number moved; drawn as an arrow, so colour is never alone. */
  direction?: KpiDirection;
  /** Which way is good for this number. Merge time going down is good; incidents going up is not. */
  good?: "up" | "down";
  /** What the delta compares against: "vs last week", "ggü. September". */
  period?: ReactNode;
  /** Optional trend, oldest first; draws a small sparkline at the end of the footer. */
  trend?: readonly number[];
  /** The badge's spoken words (up, down, unchanged). */
  locale?: StateLocale;
};

export type KpiCopy = Record<KpiDirection, string>;

/** What a screen reader hears before the delta, per locale. */
export const KPI_COPY: Record<StateLocale, KpiCopy> = {
  en: { up: "up", down: "down", flat: "unchanged" },
  de: { up: "gestiegen um", down: "gesunken um", flat: "unverändert bei" },
};

const TONE_TEXT: Record<KpiTone, string> = {
  ok: "text-hn-status-ok",
  crit: "text-hn-status-crit",
  muted: "text-hn-ink-muted",
};

/** Good, bad or neither: direction against the number's good side. Flat is always muted. */
export function kpiTone(direction: KpiDirection, good: "up" | "down" = "up"): KpiTone {
  if (direction === "flat") return "muted";
  return direction === good ? "ok" : "crit";
}

/** "up 12.5% vs last week": the delta as spoken, sign dropped because the word carries it. */
export function kpiDeltaLabel(
  delta: string,
  direction: KpiDirection,
  period?: string,
  locale: StateLocale = "en"
): string {
  const words = [KPI_COPY[locale][direction], delta.replace(/^[+−-]\s*/, "")];
  if (period) words.push(period);
  return words.join(" ");
}

function DeltaArrow({ direction }: { direction: KpiDirection }) {
  const Glyph = direction === "up" ? ArrowUpIcon : direction === "down" ? ArrowDownIcon : MinusIcon;
  return <Glyph width={14} height={14} strokeWidth={2.2} className="shrink-0" />;
}

/**
 * One number with its trend, the shadcn dashboard-01 section card (decisions/kpi-card.json):
 * the label top left, the delta as a badge top right, the value large, and a footer rule with
 * the period and, when there is a trend, a small sparkline. Composes Card, Badge and Sparkline.
 */
function KpiCardBase({
  label,
  value,
  delta,
  direction = "flat",
  good = "up",
  period,
  trend,
  locale = "en",
  className,
  ...props
}: KpiCardProps) {
  const tone = kpiTone(direction, good);
  const spokenPeriod = typeof period === "string" ? period : undefined;
  const hasFooter = period !== undefined || (trend !== undefined && trend.length > 0);
  return (
    <Card data-tone={tone} className={cx("gap-3 p-4", className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 min-w-0 text-[13px] text-hn-ink-muted">{label}</p>
        {delta ? (
          // relative: the absolute sr-only span stays inside the badge, never widens a scroller.
          <Badge className={cx("relative shrink-0 gap-1 px-2", TONE_TEXT[tone])}>
            <DeltaArrow direction={direction} />
            <span aria-hidden="true">{delta}</span>
            <span className="sr-only">{kpiDeltaLabel(delta, direction, spokenPeriod, locale)}</span>
          </Badge>
        ) : null}
      </div>
      <p className="m-0 font-hn-display text-[28px] leading-none font-semibold tabular-nums text-hn-ink-primary [overflow-wrap:anywhere]">
        {value}
      </p>
      {hasFooter ? (
        <div className="mt-1 flex items-end justify-between gap-3 border-hn-line-subtle border-t pt-3">
          <p className="m-0 min-w-0 text-xs text-hn-ink-muted">{period}</p>
          {trend && trend.length > 0 ? (
            <Sparkline values={trend} width={72} height={22} tone={tone} className="shrink-0" />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

declare module "./skin" {
  interface SkinSlots {
    "kpi-card": KpiCardProps;
  }
}

/** One number with its trend: label, value, delta badge with direction, period and sparkline. */
export const KpiCard = skinnable("kpi-card", KpiCardBase);

export type KpiCardSkeletonProps = Omit<ComponentProps<"div">, "children"> & {
  /** Keep a slot for the sparkline, so the card does not shift when its trend arrives. */
  sparkline?: boolean;
  /** What assistive tech hears; defaults to the locale's "Loading". */
  label?: string;
  locale?: StateLocale;
};

/** A KpiCard while its number loads: the same frame and rule, placeholders in its shape. */
export function KpiCardSkeleton({
  sparkline = true,
  label,
  locale = "en",
  className,
  ...props
}: KpiCardSkeletonProps) {
  return (
    <SkeletonGroup
      label={label ?? LAYOUT_COPY[locale].loading}
      className={cx(
        "flex flex-col gap-3 rounded-hn-control-card border-(length:--hn-border-frame) border-hn-line-subtle bg-hn-surface-card p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton shape="text" width="45%" className="text-[13px]" />
        <Skeleton width={56} height={24} className="rounded-hn-control-chip" />
      </div>
      <Skeleton shape="text" width="35%" className="text-[28px]" />
      <div className="mt-1 flex items-end justify-between gap-3 border-hn-line-subtle border-t pt-3">
        <Skeleton shape="text" width="30%" className="text-xs" />
        {sparkline ? <Skeleton width={72} height={22} /> : null}
      </div>
    </SkeletonGroup>
  );
}
