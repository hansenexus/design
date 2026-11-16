// The charts scene (design#179): the chart base the vote decided (categorical) as the kit ships
// it. ChartContainer, ChartTooltipContent and ChartLegendContent come from the core entry,
// ChartTooltip from @hansenexus/ui/chart; the marks, axes and fixtures are the vote's, so the
// scene draws what the vote showed. Hover a chart for its tooltip; the last row pins one open.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import type { ReactNode } from "react";
import { ChartContainer, ChartLegendContent, ChartTooltipContent } from "../src";
import { ChartTooltip } from "../src/chart/index";
import {
  BUILDS,
  type ChartSpec,
  CPU,
  HOURS_BY_TRADE,
  Marks,
  Panel,
  STORAGE,
  TRAFFIC,
} from "./variants/chart-base/category";

/** One chart: its card, the container, the marks with a tooltip, the legend below. */
export function ChartCard({ spec, height = 200 }: { spec: ChartSpec; height?: number }) {
  const pie = spec.kind === "donut";
  const cursor =
    spec.kind === "bar"
      ? { fill: "var(--hn-surface-raised)" }
      : { stroke: "var(--hn-line-strong)", strokeWidth: 1 };
  return (
    <Panel spec={spec}>
      <ChartContainer config={spec.config}>
        <Marks
          spec={spec}
          height={height}
          tooltip={
            <ChartTooltip
              cursor={pie ? false : cursor}
              isAnimationActive={false}
              content={<ChartTooltipContent unit={spec.unit} seriesBy={pie ? "name" : "dataKey"} />}
            />
          }
        />
        <ChartLegendContent />
      </ChartContainer>
    </Panel>
  );
}

function Spec({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <section
      className={
        wide ? "flex min-w-0 flex-col gap-3.5 lg:col-span-2" : "flex min-w-0 flex-col gap-3.5"
      }
    >
      <h2 className="m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

/** The tooltip and legend without a chart: what a hover on hn-agent at 08:00 shows. */
function Pinned() {
  const row = CPU.data[4] ?? {};
  const payload = Object.keys(CPU.config).map((key) => ({ dataKey: key, value: row[key] }));
  return (
    <div className="flex flex-col gap-4 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4">
      <ChartContainer config={CPU.config} className="items-start">
        <ChartTooltipContent active payload={payload} label={row.time} unit={CPU.unit} />
        <ChartLegendContent hide={["hn-pi"]} className="justify-start" />
      </ChartContainer>
    </div>
  );
}

export function Charts() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/ui</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Charts
        </h1>
        <p className="m-0 max-w-[65ch] text-hn-ink-body">
          Series take chart.series-1 … 6 in config order; a series that means a state carries a tone
          and takes its status colour instead.
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        <Spec title="Area, stacked · three series">
          <ChartCard spec={TRAFFIC} />
        </Spec>
        <Spec title="Bars, stacked · four series">
          <ChartCard spec={HOURS_BY_TRADE} />
        </Spec>
        <Spec title="Lines · all six hues">
          <ChartCard spec={CPU} />
        </Spec>
        <Spec title="Donut · the tooltip names the slice">
          <ChartCard spec={STORAGE} />
        </Spec>
        <Spec title="Toned series · ok, warn, crit">
          <ChartCard spec={BUILDS} />
        </Spec>
        <Spec title="Tooltip and legend, pinned · one series hidden from the legend">
          <Pinned />
        </Spec>
      </div>
    </main>
  );
}
