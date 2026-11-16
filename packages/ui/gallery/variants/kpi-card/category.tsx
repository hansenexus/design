// The kpi-card vote (design issue 187): how one number with its trend reads on a dashboard. Sources: the
// dashboard-01 section cards of shadcn/ui and the shadcn-studio statistics component. Every
// variant draws the same KPIs (label, value, delta with direction, period, optional sparkline)
// and its own loading skeleton, composed from Card, Badge, Sparkline and Skeleton of the kit.
// Only the arrangement differs between columns; the winner becomes the `kpi-card` registry item.
import type { ReactNode } from "react";
import { cx } from "../../../src";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from "../../../src/icons";
import type { CategorySpec, Variant } from "../types";

export type Direction = "up" | "down" | "flat";

export type Kpi = {
  label: string;
  value: string;
  /** The change as shown, sign included: "+12.5%", "−4 min". */
  delta: string;
  direction: Direction;
  /** Which way is good for this number. Merge time going down is good; incidents going up is not. */
  good?: "up" | "down";
  /** What the delta compares against: "vs last week". */
  period: string;
  /** Optional trend, oldest first. Without it the card draws no sparkline. */
  trend?: readonly number[];
};

export type KpiCardProps = { kpi: Kpi };
export type KpiSkeletonProps = { sparkline: boolean; label: string };

/** A kpi-card variant: one card and its loading skeleton, drawn in every fixture. */
export type KpiCardStyle = Variant & {
  Card: (props: KpiCardProps) => ReactNode;
  Skeleton: (props: KpiSkeletonProps) => ReactNode;
};

export type Tone = "ok" | "crit" | "muted";

/** Good, bad or neither: direction against the number's good side. Flat is always muted. */
export function toneOf({ direction, good = "up" }: Kpi): Tone {
  if (direction === "flat") return "muted";
  return direction === good ? "ok" : "crit";
}

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-hn-status-ok",
  crit: "text-hn-status-crit",
  muted: "text-hn-ink-muted",
};

/** The arrow of a delta: shape carries the direction, so colour is never alone. */
export function DeltaArrow({ direction, className }: { direction: Direction; className?: string }) {
  const Glyph = direction === "up" ? ArrowUpIcon : direction === "down" ? ArrowDownIcon : MinusIcon;
  return <Glyph width={14} height={14} strokeWidth={2.2} className={cx("shrink-0", className)} />;
}

/**
 * Arrow and delta as seen, plus the spoken form ("up 12.5% vs last week") for screen readers.
 * The container must be `relative`: the absolute sr-only span otherwise escapes the vote's
 * horizontal strip at 390 px and widens the page.
 */
export function DeltaContent({ kpi, arrowClassName }: { kpi: Kpi; arrowClassName?: string }) {
  return (
    <>
      <DeltaArrow direction={kpi.direction} className={arrowClassName} />
      <span aria-hidden="true">{kpi.delta}</span>
      <span className="sr-only">{deltaLabel(kpi)}</span>
    </>
  );
}

/** "up 12.5% vs last week": what a screen reader hears for the delta. */
export function deltaLabel({ delta, direction, period }: Kpi): string {
  const word = direction === "up" ? "up" : direction === "down" ? "down" : "unchanged";
  return `${word} ${delta.replace(/^[+−-]/, "")} ${period}`;
}

const TREND = {
  rising: [12, 14, 13, 17, 16, 19, 22, 21, 24, 27],
  falling: [52, 49, 50, 46, 44, 45, 41, 39, 40, 38],
  spiking: [1, 1, 2, 1, 1, 2, 1, 2, 3, 3],
  steady: [96, 95.8, 96.2, 96.1, 95.9, 96.3, 96.2, 96.4, 96.3, 96.4],
} as const;

/** kommandant: the estate cockpit's top row. */
const ESTATE: Kpi[] = [
  {
    label: "Active lanes",
    value: "7",
    delta: "+2",
    direction: "up",
    period: "vs yesterday",
    trend: TREND.rising,
  },
  {
    label: "CI pass rate",
    value: "96.4%",
    delta: "+0.1%",
    direction: "flat",
    period: "vs last week",
    trend: TREND.steady,
  },
  {
    label: "Median merge time",
    value: "38 min",
    delta: "−12%",
    direction: "down",
    good: "down",
    period: "vs last week",
    trend: TREND.falling,
  },
  {
    label: "Open incidents",
    value: "3",
    delta: "+2",
    direction: "up",
    good: "down",
    period: "vs last 24 h",
    trend: TREND.spiking,
  },
];

/** fachwerk: the craft business's month at a glance. */
const REVENUE: Kpi = {
  label: "Umsatz Oktober",
  value: "48.230 €",
  delta: "+8,1 %",
  direction: "up",
  period: "ggü. September",
  trend: [31, 34, 33, 38, 36, 41, 40, 44, 46, 48],
};

const OPEN_QUOTES: Kpi = {
  label: "Offene Angebote",
  value: "14",
  delta: "−3",
  direction: "down",
  period: "seit Montag",
};

const OVERDUE: Kpi = {
  label: "Überfällige Rechnungen",
  value: "6.940 €",
  delta: "+1.210 €",
  direction: "up",
  good: "down",
  period: "ggü. Vormonat",
  trend: [3.1, 3.4, 3.2, 4.0, 4.4, 4.9, 5.2, 5.6, 6.1, 6.9],
};

const LONG: Kpi = {
  label: "Mean time between failures across the whole crane fleet",
  value: "1,284.6 h",
  delta: "+212.4 h",
  direction: "up",
  period: "vs the previous quarter",
  trend: TREND.rising,
};

function Grid({ children, min = 200 }: { children: ReactNode; min?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}

export const category: CategorySpec<KpiCardStyle> = {
  title: "KPI card",
  question:
    "How does one number with its trend read on a dashboard? The winner becomes the kpi-card registry item for kommandant and fachwerk.",
  level: "organism",
  fixtures: [
    {
      id: "estate-row",
      label: "kommandant: dashboard row",
      note: "Four KPIs at full width: rising, flat, falling-and-good, rising-and-bad.",
      columns: 1,
      render: ({ Card }) => (
        <Grid>
          {ESTATE.map((kpi) => (
            <Card key={kpi.label} kpi={kpi} />
          ))}
        </Grid>
      ),
    },
    {
      id: "fachwerk",
      label: "fachwerk: month at a glance",
      note: "German copy; the middle card has no trend, so no sparkline.",
      render: ({ Card }) => (
        <div className="flex flex-col gap-3">
          <Card kpi={REVENUE} />
          <Card kpi={OPEN_QUOTES} />
          <Card kpi={OVERDUE} />
        </div>
      ),
    },
    {
      id: "long",
      label: "Long label and value",
      note: "Wraps, never truncates the value.",
      render: ({ Card }) => <Card kpi={LONG} />,
    },
    {
      id: "narrow",
      label: "Narrow (180 px)",
      render: ({ Card }) => (
        <div className="w-[180px]">
          <Card kpi={ESTATE[2] ?? REVENUE} />
        </div>
      ),
    },
    {
      id: "loading",
      label: "Loading",
      note: "With and without a sparkline slot.",
      render: ({ Skeleton }) => (
        <div className="flex flex-col gap-3">
          <Skeleton sparkline label="Loading active lanes" />
          <Skeleton sparkline={false} label="Loading open quotes" />
        </div>
      ),
    },
  ],
};
