// Categorical: shadcn's chart base as it ships, in hansenexus tokens. Six hues, lime first, then
// the muted terminal hues (sky, amber, plum, teal, coral); a floating tooltip card and a legend
// below the plot. The winner adds them to @hansenexus/tokens as chart.series-1 … 6 per mode and
// pack (today they alias the terminal set, already 4.5:1 on page and card in both modes).
import type { ReactNode } from "react";
import { Tooltip, type TooltipContentProps, type TooltipValueType } from "recharts";
import {
  assignColours,
  type ChartBase,
  type ChartConfig,
  type ChartSpec,
  colourVars,
  formatValue,
  Marks,
  Panel,
  seriesVar,
} from "./category";

const PALETTE = [
  "var(--hn-action-primary)",
  "var(--hn-terminal-blue)",
  "var(--hn-terminal-yellow)",
  "var(--hn-terminal-magenta)",
  "var(--hn-terminal-cyan)",
  "var(--hn-terminal-red)",
] as const;

const TONES = {
  ok: "var(--hn-status-ok)",
  busy: "var(--hn-status-busy)",
  warn: "var(--hn-status-warn)",
  crit: "var(--hn-status-crit)",
} as const;

/** Sets --chart-<key> from the config and sizes the plot. */
function ChartContainer({ config, children }: { config: ChartConfig; children: ReactNode }) {
  return (
    <div
      data-chart="categorical"
      className="flex flex-col gap-3"
      style={colourVars(assignColours(config, PALETTE, TONES))}
    >
      {children}
    </div>
  );
}

function Swatch({ k }: { k: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2.5 shrink-0 rounded-[2px]"
      style={{ background: seriesVar(k) }}
    />
  );
}

/** A floating card: the x label, then one row per series, value right-aligned. */
function ChartTooltipContent({
  active,
  payload,
  label,
  spec,
}: TooltipContentProps<TooltipValueType, string | number> & { spec: ChartSpec }) {
  if (!active || !payload?.length) return null;
  const donut = spec.kind === "donut";
  const heading = donut ? null : label;
  return (
    <div className="flex min-w-36 flex-col gap-1.5 rounded-hn-md border border-hn-line-subtle bg-hn-surface-raised px-2.5 py-2 text-xs shadow-hn-overlay">
      {heading ? <span className="font-medium text-hn-ink-primary">{heading}</span> : null}
      {payload.map((p) => {
        const key = String(donut ? p.name : p.dataKey);
        return (
          <div key={key} className="flex items-center gap-2">
            <Swatch k={key} />
            <span className="text-hn-ink-body">{spec.config[key]?.label ?? key}</span>
            <span className="ml-auto pl-3 font-mono text-hn-ink-primary tabular-nums">
              {formatValue(p.value, spec.unit)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Square swatches in one centred, wrapping row under the plot. */
function ChartLegendContent({ config }: { config: ChartConfig }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-hn-ink-body text-xs">
      {Object.entries(config).map(([k, s]) => (
        <li key={k} className="flex items-center gap-1.5">
          <Swatch k={k} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function Chart({ spec }: { spec: ChartSpec }) {
  const cursor =
    spec.kind === "bar"
      ? { fill: "var(--hn-surface-raised)" }
      : { stroke: "var(--hn-line-strong)", strokeWidth: 1 };
  return (
    <Panel spec={spec}>
      <ChartContainer config={spec.config}>
        <Marks
          spec={spec}
          height={200}
          tooltip={
            <Tooltip
              cursor={spec.kind === "donut" ? false : cursor}
              isAnimationActive={false}
              content={(p) => <ChartTooltipContent {...p} spec={spec} />}
            />
          }
        />
        <ChartLegendContent config={spec.config} />
      </ChartContainer>
    </Panel>
  );
}

export const variant: ChartBase = {
  label: "Categorical",
  summary:
    "shadcn's base in our tokens: six hues (lime, then the muted terminal sky, amber, plum, teal, coral), a floating tooltip card, a legend row below. Familiar and fast to read; amber and coral series can be mistaken for warn and crit next to status UI. Adds chart.series-1…6 to the tokens.",
  Chart,
};
