// The chart base (design#179): series colours from ChartConfig, the container's variables, the
// tooltip and legend contents, and the split that keeps Recharts out of the core entry.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CHART_SERIES_COUNT,
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
  chartColor,
  chartColours,
  chartStyle,
  formatChartValue,
} from "../src";

const ROOT = resolve(import.meta.dir, "..");

const BUILDS: ChartConfig = {
  passed: { label: "Passed", tone: "ok" },
  retried: { label: "Retried", tone: "warn" },
  failed: { label: "Failed", tone: "crit" },
};

const TRADES: ChartConfig = {
  carpentry: { label: "Carpentry" },
  roofing: { label: "Roofing" },
  masonry: { label: "Masonry" },
};

describe("chartColours", () => {
  test("untoned series take chart.series-1 … 6 in config order", () => {
    expect(chartColours(TRADES)).toEqual({
      carpentry: "var(--hn-chart-series-1)",
      roofing: "var(--hn-chart-series-2)",
      masonry: "var(--hn-chart-series-3)",
    });
  });

  test("a toned series takes its status colour and does not use up a hue", () => {
    expect(
      chartColours({
        a: { label: "A" },
        crit: { label: "Down", tone: "crit" },
        b: { label: "B" },
      })
    ).toEqual({
      a: "var(--hn-chart-series-1)",
      crit: "var(--hn-status-crit)",
      b: "var(--hn-chart-series-2)",
    });
    expect(Object.values(chartColours(BUILDS))).toEqual([
      "var(--hn-status-ok)",
      "var(--hn-status-warn)",
      "var(--hn-status-crit)",
    ]);
  });

  test("a seventh untoned series wraps to the first hue", () => {
    const config = Object.fromEntries(
      Array.from({ length: CHART_SERIES_COUNT + 1 }, (_, i) => [`s${i}`, { label: `S${i}` }])
    );
    expect(chartColours(config).s6).toBe("var(--hn-chart-series-1)");
  });

  test("every colour is a var() of a semantic token, never a raw value", () => {
    for (const colour of Object.values({ ...chartColours(TRADES), ...chartColours(BUILDS) }))
      expect(colour).toMatch(/^var\(--hn-(chart-series-[1-6]|status-(ok|busy|warn|crit))\)$/);
  });
});

describe("chartStyle and chartColor", () => {
  test("the container sets --chart-<key>, and chartColor reads the same name", () => {
    const style = chartStyle(TRADES) as Record<string, string>;
    expect(style["--chart-roofing"]).toBe("var(--hn-chart-series-2)");
    expect(chartColor("roofing")).toBe("var(--chart-roofing)");
  });

  test("keys that are not CSS-name safe are slugged the same way on both sides", () => {
    const style = chartStyle({ "plans/cad 2": { label: "Plans" } }) as Record<string, string>;
    expect(Object.keys(style)).toEqual(["--chart-plans-cad-2"]);
    expect(chartColor("plans/cad 2")).toBe("var(--chart-plans-cad-2)");
  });
});

describe("formatChartValue", () => {
  test("grouped digits, one decimal at most, the unit after a space", () => {
    expect(formatChartValue(1240, "GB")).toBe("1,240 GB");
    expect(formatChartValue(12.345, "%")).toBe("12.3 %");
    expect(formatChartValue("42")).toBe("42");
  });

  test("a value that is not a number shows as it is", () => {
    expect(formatChartValue("n/a", "h")).toBe("n/a");
    expect(formatChartValue(undefined)).toBe("");
    expect(formatChartValue(null, "h")).toBe("");
  });
});

describe("ChartContainer", () => {
  test("renders its children in a chart slot that carries every series variable", () => {
    const html = renderToStaticMarkup(
      <ChartContainer config={BUILDS} className="h-40" style={{ minHeight: 10 }}>
        <svg aria-label="plot" />
      </ChartContainer>
    );
    expect(html).toContain('data-slot="chart"');
    expect(html).toContain("--chart-passed:var(--hn-status-ok)");
    expect(html).toContain("--chart-failed:var(--hn-status-crit)");
    expect(html).toContain("min-height:10px");
    expect(html).toContain("h-40");
    expect(html).toContain('aria-label="plot"');
  });
});

describe("ChartTooltipContent", () => {
  const payload = [
    { dataKey: "carpentry", name: "Carpentry", value: 120 },
    { dataKey: "roofing", name: "Roofing", value: 61.25 },
  ];

  test("nothing while the pointer is away or the payload is empty", () => {
    const off = renderToStaticMarkup(
      <ChartContainer config={TRADES}>
        <ChartTooltipContent active={false} payload={payload} label="KW 40" />
        <ChartTooltipContent active payload={[]} label="KW 40" />
      </ChartContainer>
    );
    expect(off).not.toContain("chart-tooltip");
  });

  test("the x label, then one row per series: swatch, config label, formatted value", () => {
    const html = renderToStaticMarkup(
      <ChartContainer config={TRADES}>
        <ChartTooltipContent active payload={payload} label="KW 40" unit="h" />
      </ChartContainer>
    );
    expect(html).toContain('data-slot="chart-tooltip"');
    expect(html).toContain(">KW 40<");
    expect(html).toContain(">Carpentry<");
    expect(html).toContain(">120 h<");
    expect(html).toContain(">61.3 h<");
    expect(html).toContain('data-chart-swatch="roofing"');
    expect(html).toContain("background:var(--chart-roofing)");
    expect(html).toContain('aria-hidden="true"');
    expect(html.indexOf("Carpentry")).toBeLessThan(html.indexOf("Roofing"));
  });

  test("a pie names its slice: seriesBy name reads the row's name and drops the heading", () => {
    const html = renderToStaticMarkup(
      <ChartContainer config={{ backups: { label: "Backups" } }}>
        <ChartTooltipContent
          active
          seriesBy="name"
          label="ignored"
          payload={[{ dataKey: "value", name: "backups", value: 1240 }]}
          unit="GB"
        />
      </ChartContainer>
    );
    expect(html).toContain(">Backups<");
    expect(html).toContain(">1,240 GB<");
    expect(html).not.toContain("ignored");
    expect(html).toContain('data-chart-swatch="backups"');
  });

  test("outside a container it takes config as a prop, and a key with no config shows itself", () => {
    const html = renderToStaticMarkup(
      <ChartTooltipContent
        active
        hideLabel
        label="KW 40"
        config={TRADES}
        payload={[...payload, { dataKey: "glazing", value: 3 }]}
        formatValue={(v, key) => `${key}=${String(v)}`}
      />
    );
    expect(html).not.toContain("KW 40");
    expect(html).toContain(">Carpentry<");
    expect(html).toContain(">glazing<");
    expect(html).toContain(">carpentry=120<");
  });
});

describe("ChartLegendContent", () => {
  test("one item per series in config order, from the container", () => {
    const html = renderToStaticMarkup(
      <ChartContainer config={TRADES}>
        <ChartLegendContent />
      </ChartContainer>
    );
    expect(html).toContain('data-slot="chart-legend"');
    expect(html.match(/<li/g)).toHaveLength(3);
    const order = ["Carpentry", "Roofing", "Masonry"].map((l) => html.indexOf(`>${l}<`));
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("hide leaves series out, and an empty legend renders nothing", () => {
    const some = renderToStaticMarkup(<ChartLegendContent config={TRADES} hide={["roofing"]} />);
    expect(some).not.toContain("Roofing");
    expect(some.match(/<li/g)).toHaveLength(2);
    expect(renderToStaticMarkup(<ChartLegendContent />)).toBe("");
  });
});

describe("entry points", () => {
  test("the core chart source never imports Recharts; @hansenexus/ui/chart does", () => {
    const core = readFileSync(resolve(ROOT, "src/chart.tsx"), "utf8");
    expect(core).not.toMatch(/from\s+"recharts"/);
    const entry = readFileSync(resolve(ROOT, "src/chart/index.ts"), "utf8");
    expect(entry).toMatch(/from\s+"recharts"/);
  });

  test("ChartTooltip and ChartLegend are Recharts' Tooltip and Legend", async () => {
    const recharts = await import("recharts");
    const entry = await import("../src/chart/index");
    expect(entry.ChartTooltip).toBe(recharts.Tooltip);
    expect(entry.ChartLegend).toBe(recharts.Legend);
  });

  test("package.json ships ./chart and keeps recharts an optional peer", () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
    expect(pkg.exports["./chart"]).toEqual({
      types: "./dist/chart/index.d.ts",
      import: "./dist/chart/index.js",
    });
    expect(pkg.dependencies.recharts).toBeUndefined();
    expect(pkg.peerDependencies.recharts).toBeString();
    expect(pkg.peerDependenciesMeta.recharts.optional).toBe(true);
  });
});
