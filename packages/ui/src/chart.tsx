import {
  type ComponentProps,
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { cx } from "./cx";

// The chart base (design#179, decided for "categorical" in decisions/chart-base.json): shadcn's
// ChartConfig, ChartContainer, ChartTooltipContent and ChartLegendContent in hansenexus tokens.
// Nothing here imports Recharts, so the core entry stays free of it: an app draws with its own
// Recharts and hands these to <Tooltip content> and <Legend content>, or takes ChartTooltip and
// ChartLegend from @hansenexus/ui/chart. Marks read their colour as var(--chart-<key>).

/** A meaning a series can carry. A toned series takes the status colour, never a series hue. */
export type ChartTone = "ok" | "busy" | "warn" | "crit";

/** One series: its label and, only when the series means a state, a tone. Never a raw colour. */
export type ChartSeriesConfig = { label: ReactNode; tone?: ChartTone };

/** Series key (a data field, or a slice name for a pie) to its config, in drawing order. */
export type ChartConfig = Record<string, ChartSeriesConfig>;

/** How many categorical hues the tokens carry: chart.series-1 … chart.series-6. */
export const CHART_SERIES_COUNT = 6;

const TONE_VAR: Record<ChartTone, string> = {
  ok: "var(--hn-status-ok)",
  busy: "var(--hn-status-busy)",
  warn: "var(--hn-status-warn)",
  crit: "var(--hn-status-crit)",
};

/** A series key as a CSS custom-property name part: anything outside [\w-] becomes "-". */
function slug(key: string): string {
  return key.replace(/[^\w-]/g, "-");
}

/** The colour of series `key` inside a ChartContainer, for a mark's fill or stroke. */
export function chartColor(key: string): string {
  return `var(--chart-${slug(key)})`;
}

/**
 * The colour of every series as a var() of a semantic token: a toned series takes its status
 * colour, the rest take chart.series-1 … 6 in config order (a seventh untoned series wraps to 1).
 */
export function chartColours(config: ChartConfig): Record<string, string> {
  let next = 0;
  const out: Record<string, string> = {};
  for (const [key, series] of Object.entries(config)) {
    if (series.tone) {
      out[key] = TONE_VAR[series.tone];
    } else {
      out[key] = `var(--hn-chart-series-${(next % CHART_SERIES_COUNT) + 1})`;
      next += 1;
    }
  }
  return out;
}

/** `--chart-<key>` per series, the style a ChartContainer sets so marks can say chartColor(key). */
export function chartStyle(config: ChartConfig): CSSProperties {
  return Object.fromEntries(
    Object.entries(chartColours(config)).map(([key, colour]) => [`--chart-${slug(key)}`, colour])
  ) as CSSProperties;
}

/** A value as the tooltip shows it: grouped digits, at most one decimal, then the unit. */
export function formatChartValue(value: unknown, unit?: string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n))
    return String(value ?? "");
  const text = n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return unit ? `${text} ${unit}` : text;
}

const ChartContext = createContext<ChartConfig | null>(null);

/** The config of the nearest ChartContainer, or an empty one outside any. */
export function useChartConfig(): ChartConfig {
  return useContext(ChartContext) ?? {};
}

export type ChartContainerProps = ComponentProps<"div"> & { config: ChartConfig };

/**
 * Sets --chart-<key> for every series and hands the config to the tooltip and legend inside.
 * Put the Recharts chart (in a ResponsiveContainer) and a ChartLegendContent in it.
 */
export function ChartContainer({
  config,
  className,
  style,
  children,
  ...props
}: ChartContainerProps) {
  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        className={cx("flex min-w-0 flex-col gap-3 text-xs", className)}
        style={{ ...chartStyle(config), ...style }}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  );
}

/** A square key of one series' colour. Decorative: the label beside it carries the name. */
export function ChartSwatch({ series, className }: { series: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-chart-swatch={series}
      className={cx("size-2.5 shrink-0 rounded-[2px]", className)}
      style={{ background: chartColor(series) }}
    />
  );
}

/**
 * One row of a tooltip payload. Structural, so a Recharts tooltip payload fits without Recharts
 * types: `dataKey` names a cartesian series, `name` a pie slice.
 */
export type ChartTooltipItem = { dataKey?: unknown; name?: unknown; value?: unknown };

export type ChartTooltipContentProps = {
  /** From Recharts: whether the pointer is over a point. */
  active?: boolean;
  /** From Recharts: one row per series at the point. */
  payload?: readonly ChartTooltipItem[];
  /** From Recharts: the x value of the point. */
  label?: ReactNode;
  /** Appended to every value. */
  unit?: string;
  /** "name" for a pie, whose rows name their slice; "dataKey" (default) for cartesian charts. */
  seriesBy?: "dataKey" | "name";
  /** Drop the x heading (a pie has none). */
  hideLabel?: boolean;
  /** Formats a value instead of formatChartValue. */
  formatValue?: (value: unknown, key: string) => ReactNode;
  /** The config, when the tooltip renders outside a ChartContainer. */
  config?: ChartConfig;
  className?: string;
};

function keyOf(item: ChartTooltipItem, by: "dataKey" | "name"): string {
  const own = by === "name" ? item.name : item.dataKey;
  if (typeof own === "string" || typeof own === "number") return String(own);
  return String(item.name ?? "");
}

/** The floating card: the x label, then one row per series with its value right-aligned. */
export function ChartTooltipContent({
  active,
  payload,
  label,
  unit,
  seriesBy = "dataKey",
  hideLabel = false,
  formatValue,
  config,
  className,
}: ChartTooltipContentProps) {
  const fromContext = useChartConfig();
  const series = config ?? fromContext;
  if (!active || !payload?.length) return null;
  const heading = hideLabel || seriesBy === "name" ? null : label;
  return (
    <div
      data-slot="chart-tooltip"
      className={cx(
        "flex min-w-36 flex-col gap-1.5 rounded-hn-md border border-hn-line-subtle bg-hn-surface-raised px-2.5 py-2 text-xs shadow-hn-overlay",
        className
      )}
    >
      {heading !== null && heading !== undefined && heading !== "" ? (
        <span className="font-medium text-hn-ink-primary">{heading}</span>
      ) : null}
      {payload.map((item) => {
        const key = keyOf(item, seriesBy);
        return (
          <div key={key} className="flex items-center gap-2">
            <ChartSwatch series={key} />
            <span className="text-hn-ink-body">{series[key]?.label ?? key}</span>
            <span className="ml-auto pl-3 font-hn-mono text-hn-ink-primary tabular-nums">
              {formatValue ? formatValue(item.value, key) : formatChartValue(item.value, unit)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export type ChartLegendContentProps = {
  /** The config, when the legend renders outside a ChartContainer. */
  config?: ChartConfig;
  /** Series to leave out, e.g. the ones a filter hides. */
  hide?: readonly string[];
  className?: string;
};

/** Square swatches in one centred, wrapping row, in config order. */
export function ChartLegendContent({ config, hide, className }: ChartLegendContentProps) {
  const fromContext = useChartConfig();
  const entries = Object.entries(config ?? fromContext).filter(([key]) => !hide?.includes(key));
  if (!entries.length) return null;
  return (
    <ul
      data-slot="chart-legend"
      className={cx(
        "m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-hn-ink-body text-xs",
        className
      )}
    >
      {entries.map(([key, series]) => (
        <li key={key} className="flex items-center gap-1.5">
          <ChartSwatch series={key} />
          {series.label}
        </li>
      ))}
    </ul>
  );
}
