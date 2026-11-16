// Band: the value and its delta badge on one line, the label above in mono caps, and the trend
// as a full-bleed area band along the card's bottom edge. The chart becomes part of the surface,
// cockpit-style; without a trend an empty band of the same height keeps a row of cards even.
import { Badge, Card, cx, Skeleton, SkeletonGroup, Sparkline } from "../../../src";
import {
  DeltaContent,
  type KpiCardProps,
  type KpiCardStyle,
  type KpiSkeletonProps,
  TONE_TEXT,
  toneOf,
} from "./category";

const BAND = 40;

function BandCard({ kpi }: KpiCardProps) {
  const tone = toneOf(kpi);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <p className="m-0 font-hn-mono text-[11px] tracking-wider text-hn-ink-muted uppercase">
          {kpi.label}
        </p>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <p className="m-0 font-hn-display text-[28px] leading-none font-semibold tabular-nums text-hn-ink-primary [overflow-wrap:anywhere]">
            {kpi.value}
          </p>
          <Badge className={cx("relative gap-1 px-2", TONE_TEXT[tone])}>
            <DeltaContent kpi={kpi} />
          </Badge>
        </div>
        <p className="m-0 text-xs text-hn-ink-muted">{kpi.period}</p>
      </div>
      {kpi.trend ? (
        <Sparkline
          values={kpi.trend}
          height={BAND}
          stretch
          area
          tone={tone === "muted" ? "action" : tone}
          className="block"
        />
      ) : (
        <div style={{ height: BAND }} aria-hidden="true" />
      )}
    </Card>
  );
}

function BandSkeleton({ sparkline, label }: KpiSkeletonProps) {
  return (
    <SkeletonGroup
      label={label}
      className="flex flex-col overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card"
    >
      <div className="flex flex-col gap-2 px-4 pt-4 pb-3">
        <Skeleton shape="text" width="40%" className="text-[11px]" />
        <div className="flex items-center gap-2.5">
          <Skeleton shape="text" width="30%" className="text-[28px]" />
          <Skeleton width={56} height={24} className="rounded-hn-control-chip" />
        </div>
        <Skeleton shape="text" width="25%" className="text-xs" />
      </div>
      {sparkline ? (
        <Skeleton height={BAND} className="rounded-none" />
      ) : (
        <div style={{ height: BAND }} />
      )}
    </SkeletonGroup>
  );
}

export const variant: KpiCardStyle = {
  label: "Band",
  summary:
    "Mono label, value with the delta badge beside it, and the trend as a full-bleed area band along the bottom edge. Most cockpit-like and scannable in a row; the band claims 40 px even without a trend, so a row stays even.",
  Card: BandCard,
  Skeleton: BandSkeleton,
};
