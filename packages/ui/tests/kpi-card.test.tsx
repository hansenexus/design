import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ITEM_SCENES } from "../gallery/levels";
import registry from "../registry.json";
import * as ui from "../src";
import { KpiCard, KpiCardSkeleton, kpiDeltaLabel, kpiTone } from "../src";

const TREND = [12, 14, 13, 17, 16, 19, 22, 21, 24, 27];

describe("kpi-card", () => {
  test("is exported, an organism in the registry and shown in the data scene", () => {
    expect(typeof ui.KpiCard).toBe("function");
    expect(typeof ui.KpiCardSkeleton).toBe("function");
    const item = registry.items.find((i) => i.name === "kpi-card");
    expect(item?.meta).toEqual({ level: "organism" });
    expect(item?.files?.map((f) => f.path)).toEqual(["src/kpi-card.tsx"]);
    expect(ITEM_SCENES["kpi-card"]).toBe("data");
  });

  test("tone reads the direction against the good side; flat is muted", () => {
    expect(kpiTone("up")).toBe("ok");
    expect(kpiTone("down")).toBe("crit");
    expect(kpiTone("down", "down")).toBe("ok");
    expect(kpiTone("up", "down")).toBe("crit");
    expect(kpiTone("flat")).toBe("muted");
    expect(kpiTone("flat", "down")).toBe("muted");
  });

  test("the spoken delta drops the sign because the word carries it", () => {
    expect(kpiDeltaLabel("+12.5%", "up", "vs last week")).toBe("up 12.5% vs last week");
    expect(kpiDeltaLabel("−12%", "down")).toBe("down 12%");
    expect(kpiDeltaLabel("-4 min", "down", "vs yesterday")).toBe("down 4 min vs yesterday");
    expect(kpiDeltaLabel("+0.1%", "flat", "vs last week")).toBe("unchanged 0.1% vs last week");
    expect(kpiDeltaLabel("+8,1 %", "up", "ggü. September", "de")).toBe(
      "gestiegen um 8,1 % ggü. September"
    );
  });

  test("draws label, value, delta badge with arrow, period and sparkline", () => {
    const html = renderToStaticMarkup(
      <KpiCard
        label="Active lanes"
        value="7"
        delta="+2"
        direction="up"
        period="vs yesterday"
        trend={TREND}
      />
    );
    expect(html).toContain("Active lanes");
    expect(html).toContain(">7</p>");
    expect(html).toContain('data-tone="ok"');
    expect(html).toContain('<span aria-hidden="true">+2</span>');
    expect(html).toContain('<span class="sr-only">up 2 vs yesterday</span>');
    expect(html).toContain("text-hn-status-ok");
    expect(html).toContain("vs yesterday");
    // The arrow and the sparkline: two svgs, both decorative.
    expect(html.match(/<svg/g)?.length).toBe(2);
    expect(html).toContain("<polyline");
    // The sr-only span sits in a positioned badge, so it cannot widen a scroll strip.
    expect(html).toMatch(
      /<span[^>]*class="[^"]*\brelative\b[^"]*"[^>]*data-tone="neutral"|data-tone="neutral"[^>]*class="[^"]*\brelative\b/
    );
  });

  test("a number that should fall is crit when it rises", () => {
    const html = renderToStaticMarkup(
      <KpiCard label="Open incidents" value="3" delta="+2" direction="up" good="down" />
    );
    expect(html).toContain('data-tone="crit"');
    expect(html).toContain("text-hn-status-crit");
  });

  test("without delta, period or trend there is no badge, footer or sparkline", () => {
    const html = renderToStaticMarkup(<KpiCard label="Machines" value="12" />);
    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("border-t");
  });

  test("a period without a trend keeps the footer but draws no sparkline", () => {
    const html = renderToStaticMarkup(
      <KpiCard
        label="Offene Angebote"
        value="14"
        delta="−3"
        direction="down"
        period="seit Montag"
        locale="de"
      />
    );
    expect(html).toContain("border-t");
    expect(html).toContain("seit Montag");
    expect(html).toContain("gesunken um 3 seit Montag");
    expect(html).not.toContain("<polyline");
  });

  test("passes className and props through to the card", () => {
    const html = renderToStaticMarkup(
      <KpiCard label="CPU" value="34%" className="col-span-2" id="cpu" />
    );
    expect(html).toContain('id="cpu"');
    expect(html).toContain("col-span-2");
  });

  test("the skeleton is a busy group with its label and an optional sparkline slot", () => {
    const withSpark = renderToStaticMarkup(<KpiCardSkeleton label="Loading active lanes" />);
    expect(withSpark).toContain('aria-busy="true"');
    expect(withSpark).toContain("Loading active lanes");
    const without = renderToStaticMarkup(<KpiCardSkeleton sparkline={false} locale="de" />);
    expect(without).toContain("Wird geladen");
    const blocks = (s: string) => s.match(/data-shape/g)?.length ?? 0;
    expect(blocks(withSpark)).toBe(blocks(without) + 1);
  });

  test("uses semantic tokens only, no raw colours", () => {
    const html = renderToStaticMarkup(
      <>
        <KpiCard label="A" value="1" delta="+1" direction="up" period="p" trend={TREND} />
        <KpiCardSkeleton />
      </>
    );
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
  });
});
