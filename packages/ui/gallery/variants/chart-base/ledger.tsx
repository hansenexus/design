// Ledger: the Leitstand reading of a chart. One accent: the first series is lime, the rest step
// down the ink ramp (ink.primary, ink.body, ink.muted, line.strong, line.subtle), lines past the
// third add a dash. No floating tooltip: the legend is a readout in the header that shows the
// latest values and follows the pointer, so numbers never cover the plot. Proposes no new hues;
// the winner adds chart.accent and chart.ramp-1 … 5 as aliases of the ink tokens.
import { useState } from "react";
import { Tooltip } from "recharts";
import {
  assignColours,
  type ChartBase,
  type ChartSpec,
  colourVars,
  formatValue,
  Marks,
  Panel,
  seriesVar,
} from "./category";

const PALETTE = [
  "var(--hn-action-primary)",
  "var(--hn-ink-primary)",
  "var(--hn-ink-body)",
  "var(--hn-ink-muted)",
  "var(--hn-line-strong)",
  "var(--hn-line-subtle)",
] as const;

const TONES = {
  ok: "var(--hn-action-primary)",
  busy: "var(--hn-status-busy)",
  warn: "var(--hn-status-warn)",
  crit: "var(--hn-status-crit)",
} as const;

const DASHES = [undefined, undefined, undefined, "5 3", "2 3", "8 3 2 3"] as const;

/** A short stroke in the series' colour and dash; a block for bars and slices. */
function Key({ k, dash, block }: { k: string; dash?: string; block: boolean }) {
  return block ? (
    <span aria-hidden="true" className="h-2 w-3 shrink-0" style={{ background: seriesVar(k) }} />
  ) : (
    <svg aria-hidden="true" width="14" height="6" className="shrink-0">
      <line
        x1="0"
        y1="3"
        x2="14"
        y2="3"
        stroke={seriesVar(k)}
        strokeWidth="2"
        strokeDasharray={dash}
      />
    </svg>
  );
}

/**
 * ChartLegend and ChartTooltip in one: the series with their values at the active row (the
 * latest row when nothing is hovered), or the active slice of a donut (the total when none is).
 */
function Readout({ spec, active }: { spec: ChartSpec; active: number | null }) {
  const keys = Object.keys(spec.config);
  const donut = spec.kind === "donut";
  const row = donut ? null : spec.data[active ?? spec.data.length - 1];
  const total = spec.data.reduce((s, d) => s + Number(d.value ?? 0), 0);
  const slice = donut && active !== null ? spec.data[active] : undefined;
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <span className="font-mono text-[11px] text-hn-ink-muted uppercase tracking-wide">
        {donut
          ? slice
            ? (spec.config[String(slice.key)]?.label ?? String(slice.key))
            : "Total"
          : `${String(row?.[spec.x] ?? "")}${active === null ? " · latest" : ""}`}
      </span>
      {donut && !slice ? (
        <span className="font-mono text-hn-ink-primary text-lg tabular-nums">
          {formatValue(total, spec.unit)}
        </span>
      ) : donut && slice ? (
        <span className="font-mono text-hn-ink-primary text-lg tabular-nums">
          {formatValue(slice.value, spec.unit)}
          <span className="pl-2 text-hn-ink-muted text-xs">
            {Math.round((Number(slice.value) / total) * 100)} %
          </span>
        </span>
      ) : null}
      <dl className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-x-4 gap-y-1 text-xs">
        {keys.map((k, i) => (
          <div key={k} className="flex min-w-0 items-center gap-1.5">
            <Key k={k} dash={DASHES[i]} block={spec.kind !== "line" && spec.kind !== "area"} />
            <dt className="truncate text-hn-ink-body">{spec.config[k]?.label}</dt>
            {row ? (
              <dd className="ml-auto font-mono text-hn-ink-primary tabular-nums">
                {formatValue(row[k])}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

function Chart({ spec }: { spec: ChartSpec }) {
  const [active, setActive] = useState<number | null>(null);
  const colours = assignColours(spec.config, PALETTE, TONES);
  return (
    <Panel spec={spec}>
      <div data-chart="ledger" className="flex flex-col gap-3" style={colourVars(colours)}>
        <Readout spec={spec} active={active} />
        <Marks
          spec={spec}
          height={180}
          areaOpacity={0.12}
          dash={(_, i) => (spec.kind === "line" ? DASHES[i] : undefined)}
          onActive={setActive}
          tooltip={
            spec.kind === "donut" ? null : (
              <Tooltip
                content={() => null}
                isAnimationActive={false}
                cursor={
                  spec.kind === "bar"
                    ? { fill: "var(--hn-surface-raised)" }
                    : { stroke: "var(--hn-ink-muted)", strokeWidth: 1, strokeDasharray: "2 2" }
                }
              />
            )
          }
        />
      </div>
    </Panel>
  );
}

export const variant: ChartBase = {
  label: "Ledger",
  summary:
    "One lime accent, the other series on the ink ramp, dashes past the third line. No floating tooltip: a readout above the plot shows the latest values and follows the pointer. Calm and dense for kommandant; past four series greys get hard to tell apart.",
  Chart,
};
