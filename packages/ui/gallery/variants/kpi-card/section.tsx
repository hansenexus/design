// Section card: the shadcn dashboard-01 section card. Label top left, the delta as a badge top
// right, a large value, and a quiet footer line that spells out the trend and its period. The
// sparkline, when there is a trend, sits small at the end of that footer line.
import { Badge, Card, cx, Skeleton, SkeletonGroup, Sparkline } from "../../../src";
import {
  DeltaContent,
  type KpiCardProps,
  type KpiCardStyle,
  type KpiSkeletonProps,
  TONE_TEXT,
  toneOf,
} from "./category";

const SPARK_TONE = { ok: "ok", crit: "crit", muted: "muted" } as const;

function SectionCard({ kpi }: KpiCardProps) {
  const tone = toneOf(kpi);
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 min-w-0 text-[13px] text-hn-ink-muted">{kpi.label}</p>
        <Badge className={cx("relative shrink-0 gap-1 px-2", TONE_TEXT[tone])}>
          <DeltaContent kpi={kpi} />
        </Badge>
      </div>
      <p className="m-0 font-hn-display text-[28px] leading-none font-semibold tabular-nums text-hn-ink-primary [overflow-wrap:anywhere]">
        {kpi.value}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3 border-hn-line-subtle border-t pt-3">
        <p className="m-0 min-w-0 text-xs text-hn-ink-muted">{kpi.period}</p>
        {kpi.trend ? (
          <Sparkline values={kpi.trend} width={72} height={22} tone={SPARK_TONE[tone]} />
        ) : null}
      </div>
    </Card>
  );
}

function SectionSkeleton({ sparkline, label }: KpiSkeletonProps) {
  return (
    <SkeletonGroup
      label={label}
      className="flex flex-col gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4"
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

export const variant: KpiCardStyle = {
  label: "Section card",
  summary:
    "shadcn dashboard-01: delta as a badge top right, value large, period and a small sparkline on a footer rule. Familiar and calm; the trend is the smallest thing on the card.",
  Card: SectionCard,
  Skeleton: SectionSkeleton,
};
