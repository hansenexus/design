// The chart-base vote (hansenexus/design#179): the base every chart type builds on, shadcn's
// ChartContainer, ChartTooltip, ChartLegend and a ChartConfig that maps series to colours, on
// Recharts v3 (owner's pick on design#164). Every variant draws the same five charts from the same
// data through the same marks, axes and grid below; only the parts the vote chooses differ: how a
// series gets its colour, the tooltip and the legend.
// Recharts stays in the gallery (a devDependency) until the vote: the winner ships as its own
// entry point (@hansenexus/ui/chart), so apps without charts never load it.
import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { cx } from "../../../src";
import type { CategorySpec, Variant } from "../types";

// ── ChartConfig ──────────────────────────────────────────────────────────────────────────────

/** A meaning a series can carry. A toned series takes the status colour in every variant. */
export type ChartTone = "ok" | "busy" | "warn" | "crit";

/** One series: its label and, only when the series means a state, a tone. Never a raw colour. */
export type SeriesConfig = { label: string; tone?: ChartTone };

/** Series key (a data field, or a slice name for a donut) to its config, in drawing order. */
export type ChartConfig = Record<string, SeriesConfig>;

export type ChartKind = "area" | "bar" | "line" | "donut";

export type ChartSpec = {
  kind: ChartKind;
  title: string;
  description: string;
  config: ChartConfig;
  /** Cartesian: one row per x value. Donut: one row per slice, `{ key, value }`. */
  data: Record<string, string | number>[];
  /** The x field of a cartesian chart. */
  x: string;
  stacked?: boolean;
  /** Appended to values in tooltips and readouts. */
  unit?: string;
};

/** The colour of each series as a CSS value (a var() of a semantic token), keyed like the config. */
export type SeriesColours = Record<string, string>;

/**
 * Colours per series: a toned series takes its tone, the rest take `palette` in order. A variant
 * owns the palette; this owns the rule, so the same series gets the same slot in every variant.
 */
export function assignColours(
  config: ChartConfig,
  palette: readonly string[],
  tones: Record<ChartTone, string>
): SeriesColours {
  let next = 0;
  const out: SeriesColours = {};
  for (const [key, s] of Object.entries(config)) {
    if (s.tone) {
      out[key] = tones[s.tone];
    } else {
      out[key] = palette[next % palette.length] ?? "currentColor";
      next += 1;
    }
  }
  return out;
}

/** `--chart-<key>` per series, set on the container so marks can say var(--chart-<key>). */
export function colourVars(colours: SeriesColours): CSSProperties {
  return Object.fromEntries(
    Object.entries(colours).map(([k, v]) => [`--chart-${k}`, v])
  ) as CSSProperties;
}

export const seriesVar = (key: string) => `var(--chart-${key})`;

export function formatValue(value: unknown, unit?: string): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  const text = n.toLocaleString("en-GB", { maximumFractionDigits: 1 });
  return unit ? `${text} ${unit}` : text;
}

// ── The marks every variant shares ───────────────────────────────────────────────────────────

const AXIS = {
  tick: { fill: "var(--hn-ink-muted)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
  tickMargin: 6,
} as const;

export type MarksProps = {
  spec: ChartSpec;
  height: number;
  /** A Recharts <Tooltip> element, or null for none. */
  tooltip?: ReactNode;
  /** Series the legend has switched off. */
  hidden?: ReadonlySet<string>;
  /** Line dash per series, for variants that tell series apart by stroke as well as colour. */
  dash?: (key: string, index: number) => string | undefined;
  /** Point markers per line series; false draws none. */
  dot?: (key: string) => Parameters<typeof Line>[0]["dot"];
  /** Fill opacity of areas. */
  areaOpacity?: number;
  /** The index under the pointer (a row, or a slice), null when it leaves. */
  onActive?: (index: number | null) => void;
};

function toIndex(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The plot itself: axes, grid and series marks, coloured through var(--chart-<key>). */
export function Marks({
  spec,
  height,
  tooltip = null,
  hidden,
  dash,
  dot,
  areaOpacity = 0.25,
  onActive,
}: MarksProps) {
  const keys = Object.keys(spec.config).filter((k) => !hidden?.has(k));
  const stack = spec.stacked ? "total" : undefined;
  const move = onActive
    ? {
        onMouseMove: (state: { activeTooltipIndex?: unknown }) =>
          onActive(toIndex(state.activeTooltipIndex)),
        onMouseLeave: () => onActive(null),
      }
    : {};
  const margin = { top: 6, right: 6, bottom: 0, left: -12 };

  let chart: ReactNode;
  if (spec.kind === "donut") {
    const slices = spec.data.filter((d) => !hidden?.has(String(d.key)));
    chart = (
      <PieChart>
        {tooltip}
        <Pie
          data={slices}
          dataKey="value"
          nameKey="key"
          innerRadius="58%"
          outerRadius="88%"
          paddingAngle={1.5}
          stroke="var(--hn-surface-card)"
          strokeWidth={2}
          isAnimationActive={false}
          onMouseEnter={(_: unknown, i: number) => onActive?.(i)}
          onMouseLeave={() => onActive?.(null)}
        >
          {slices.map((d) => (
            <Cell key={String(d.key)} fill={seriesVar(String(d.key))} />
          ))}
        </Pie>
      </PieChart>
    );
  } else {
    const axes = (
      <>
        <CartesianGrid vertical={false} stroke="var(--hn-line-subtle)" />
        <XAxis dataKey={spec.x} {...AXIS} minTickGap={16} />
        <YAxis {...AXIS} width={44} />
        {tooltip}
      </>
    );
    if (spec.kind === "bar") {
      chart = (
        <BarChart data={spec.data} margin={margin} {...move}>
          {axes}
          {keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              name={spec.config[k]?.label}
              stackId={stack}
              fill={seriesVar(k)}
              radius={spec.stacked && i < keys.length - 1 ? 0 : [3, 3, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      );
    } else if (spec.kind === "area") {
      chart = (
        <AreaChart data={spec.data} margin={margin} {...move}>
          {axes}
          {keys.map((k, i) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              name={spec.config[k]?.label}
              stackId={stack}
              stroke={seriesVar(k)}
              strokeWidth={1.6}
              strokeDasharray={dash?.(k, i)}
              fill={seriesVar(k)}
              fillOpacity={areaOpacity}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      );
    } else {
      chart = (
        <LineChart data={spec.data} margin={margin} {...move}>
          {axes}
          {keys.map((k, i) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={spec.config[k]?.label}
              stroke={seriesVar(k)}
              strokeWidth={1.6}
              strokeDasharray={dash?.(k, i)}
              dot={dot ? dot(k) : false}
              activeDot={{ r: 3.5, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      );
    }
  }
  return (
    <ResponsiveContainer width="100%" height={height} initialDimension={{ width: 360, height }}>
      {chart}
    </ResponsiveContainer>
  );
}

/** The card a chart sits in: title, description, an optional slot at the top right. */
export function Panel({
  spec,
  aside,
  children,
  className,
}: {
  spec: ChartSpec;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "flex min-w-0 flex-col gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4",
        className
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-medium text-hn-ink-primary text-sm">{spec.title}</h3>
          <p className="text-hn-ink-muted text-xs">{spec.description}</p>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** A chart-base variant: one whole chart, its container, tooltip and legend around Marks. */
export type ChartBase = Variant & { Chart: (props: { spec: ChartSpec }) => ReactNode };

// ── Fixtures: deterministic data, kommandant and fachwerk situations ─────────────────────────

const wave = (i: number, base: number, amp: number, phase: number, period = 24) =>
  Math.round(base + amp * Math.sin(((i + phase) / period) * Math.PI * 2) + amp * 0.3 * Math.cos(i));

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export const TRAFFIC: ChartSpec = {
  kind: "area",
  title: "Requests by app",
  description: "Last 24 hours, stacked",
  x: "hour",
  stacked: true,
  unit: "req/min",
  config: {
    kommandant: { label: "kommandant" },
    fachwerk: { label: "fachwerk" },
    lexilink: { label: "lexilink" },
  },
  data: HOURS.map((hour, i) => ({
    hour,
    kommandant: Math.max(4, wave(i, 42, 26, 16)),
    fachwerk: Math.max(2, wave(i, 30, 22, 18)),
    lexilink: Math.max(1, wave(i, 14, 9, 20)),
  })),
};

const WEEKS = ["KW 38", "KW 39", "KW 40", "KW 41", "KW 42", "KW 43", "KW 44", "KW 45"];

export const HOURS_BY_TRADE: ChartSpec = {
  kind: "bar",
  title: "Hours by trade",
  description: "Site Elbstraße, per calendar week",
  x: "week",
  stacked: true,
  unit: "h",
  config: {
    carpentry: { label: "Carpentry" },
    roofing: { label: "Roofing" },
    masonry: { label: "Masonry" },
    electrics: { label: "Electrics" },
  },
  data: WEEKS.map((week, i) => ({
    week,
    carpentry: wave(i, 120, 40, 0, 8),
    roofing: Math.max(0, wave(i, 60, 50, 3, 8)),
    masonry: Math.max(0, wave(i, 80, 30, 5, 8)),
    electrics: wave(i, 36, 14, 2, 8),
  })),
};

const NODES = ["hn-agent", "hn-k3s", "hn-runner", "runner-2", "hn-nas", "hn-pi"] as const;

export const CPU: ChartSpec = {
  kind: "line",
  title: "CPU per node",
  description: "Six series, every 2 hours",
  x: "time",
  unit: "%",
  config: Object.fromEntries(NODES.map((n) => [n, { label: n }])),
  data: HOURS.filter((_, i) => i % 2 === 0).map((time, i) =>
    Object.fromEntries([
      ["time", time],
      ...NODES.map((n, j) => [n, Math.min(98, Math.max(3, wave(i, 18 + j * 11, 12, j * 2, 12)))]),
    ])
  ),
};

export const STORAGE: ChartSpec = {
  kind: "donut",
  title: "Storage by bucket",
  description: "hn-nas, 3.1 TB used",
  x: "key",
  unit: "GB",
  config: {
    backups: { label: "Backups" },
    media: { label: "Media" },
    "plans-cad": { label: "Plans and CAD" },
    mail: { label: "Mail" },
    other: { label: "Other" },
  },
  data: [
    { key: "backups", value: 1240 },
    { key: "media", value: 820 },
    { key: "plans-cad", value: 610 },
    { key: "mail", value: 280 },
    { key: "other", value: 150 },
  ],
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const BUILDS: ChartSpec = {
  kind: "bar",
  title: "CI runs",
  description: "This week; failed is toned crit in every variant",
  x: "day",
  stacked: true,
  unit: "runs",
  config: {
    passed: { label: "Passed", tone: "ok" },
    flaky: { label: "Retried", tone: "warn" },
    failed: { label: "Failed", tone: "crit" },
  },
  data: DAYS.map((day, i) => ({
    day,
    passed: i > 4 ? 6 + i : wave(i, 38, 10, 1, 7),
    flaky: [3, 1, 4, 2, 5, 0, 1][i] ?? 0,
    failed: [2, 0, 6, 1, 3, 0, 0][i] ?? 0,
  })),
};

export const category: CategorySpec<ChartBase> = {
  title: "Chart base",
  question:
    "How do charts take their colours, and how do tooltip and legend read? The winner becomes ChartContainer, ChartTooltip, ChartLegend and ChartConfig in @hansenexus/ui/chart; every chart type builds on it.",
  level: "organism",
  fixtures: [
    {
      id: "area",
      label: "Area, stacked · kommandant",
      note: "Same data, marks, axes and grid in every column; hover a chart to see its tooltip.",
      render: ({ Chart }) => <Chart spec={TRAFFIC} />,
    },
    {
      id: "bar",
      label: "Bars, stacked · fachwerk",
      render: ({ Chart }) => <Chart spec={HOURS_BY_TRADE} />,
    },
    {
      id: "line",
      label: "Six series · the palette under stress",
      render: ({ Chart }) => <Chart spec={CPU} />,
    },
    {
      id: "donut",
      label: "Donut · shares",
      render: ({ Chart }) => <Chart spec={STORAGE} />,
    },
    {
      id: "toned",
      label: "Toned series · state, not category",
      note: "Series that mean a state carry a tone in ChartConfig and take the status colour.",
      render: ({ Chart }) => <Chart spec={BUILDS} />,
    },
  ],
};
