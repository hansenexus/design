// Split: the shadcn-studio statistics card. Numbers on the left (label, value, then the delta
// as coloured text with its period right after it), the sparkline as a column of its own on the
// right. Compact enough for a row of six; the trend reads as much as the number.
import { Card, cx, Skeleton, SkeletonGroup, Sparkline } from "../../../src";
import {
  DeltaContent,
  type KpiCardProps,
  type KpiCardStyle,
  type KpiSkeletonProps,
  TONE_TEXT,
  toneOf,
} from "./category";

function SplitCard({ kpi }: KpiCardProps) {
  const tone = toneOf(kpi);
  return (
    <Card className="flex-row flex-wrap items-end justify-between gap-x-4 gap-y-3 p-4">
      <div className="flex min-w-0 flex-[1_1_8rem] flex-col gap-1.5">
        <p className="m-0 text-[13px] text-hn-ink-muted">{kpi.label}</p>
        <p className="m-0 font-hn-display text-2xl leading-tight font-semibold tabular-nums text-hn-ink-primary [overflow-wrap:anywhere]">
          {kpi.value}
        </p>
        <p className="m-0 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className={cx("inline-flex items-center gap-0.5 font-semibold", TONE_TEXT[tone])}>
            <DeltaContent kpi={kpi} arrowClassName="size-3.5" />
          </span>
          <span className="text-hn-ink-muted" aria-hidden="true">
            {kpi.period}
          </span>
        </p>
      </div>
      {kpi.trend ? (
        <Sparkline
          values={kpi.trend}
          width={96}
          height={44}
          area
          tone={tone === "muted" ? "action" : tone}
          className="flex-[0_1_96px]"
        />
      ) : null}
    </Card>
  );
}

function SplitSkeleton({ sparkline, label }: KpiSkeletonProps) {
  return (
    <SkeletonGroup
      label={label}
      className="flex flex-row items-end justify-between gap-4 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton shape="text" width="50%" className="text-[13px]" />
        <Skeleton shape="text" width="40%" className="text-2xl" />
        <Skeleton shape="text" width="60%" className="text-xs" />
      </div>
      {sparkline ? <Skeleton width={96} height={44} /> : null}
    </SkeletonGroup>
  );
}

export const variant: KpiCardStyle = {
  label: "Split",
  summary:
    "shadcn-studio statistics: numbers left, an area sparkline as its own column right, the delta as coloured text before its period. Dense and trend-forward; the sparkline wraps under the value when narrow.",
  Card: SplitCard,
  Skeleton: SplitSkeleton,
};
