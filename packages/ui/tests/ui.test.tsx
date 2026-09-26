import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ms } from "@hansenexus/tokens";
import { renderToStaticMarkup } from "react-dom/server";
import { registryItemSchema } from "shadcn/schema";
import { buildRegistry, loadRegistry } from "../scripts/registry";
import * as ui from "../src";

const ROOT = resolve(import.meta.dir, "..");

/** The 16 primitives of hansenexus/design#2 and one export each must provide. */
const PRIMITIVES: Record<string, string> = {
  button: "Button",
  badge: "Badge",
  "status-badge": "StatusBadge",
  switch: "Switch",
  dialog: "DialogContent",
  menu: "MenuContent",
  tabs: "TabsTrigger",
  table: "Table",
  meter: "Meter",
  sparkline: "Sparkline",
  kbd: "Kbd",
  toast: "Toast",
  tooltip: "TooltipContent",
  input: "Input",
  select: "SelectTrigger",
  "rail-item": "RailItem",
};

describe("exports", () => {
  test("all 16 primitives are exported", () => {
    const missing = Object.values(PRIMITIVES).filter(
      (name) => typeof (ui as Record<string, unknown>)[name] !== "function"
    );
    expect(missing).toEqual([]);
  });
});

describe("registry", () => {
  test("covers every source file and every primitive", () => {
    const files = new Set(
      loadRegistry().items.flatMap((i) => (i.files ?? []).map((f) => f.path.replace("src/", "")))
    );
    const sources = readdirSync(resolve(ROOT, "src")).filter(
      (f) => /\.tsx?$/.test(f) && f !== "index.ts"
    );
    expect(sources.filter((f) => !files.has(f))).toEqual([]);
    const names = new Set(loadRegistry().items.map((i) => i.name));
    expect(Object.keys(PRIMITIVES).filter((n) => !names.has(n))).toEqual([]);
  });

  test("builds shadcn-valid items with the sources inlined", async () => {
    const out = mkdtempSync(join(tmpdir(), "hn-registry-"));
    const n = await buildRegistry(out);
    expect(n).toBe(loadRegistry().items.length);
    const button = registryItemSchema.parse(
      JSON.parse(readFileSync(join(out, "button.json"), "utf8"))
    );
    expect(button.dependencies).toEqual(["radix-ui"]);
    expect(button.registryDependencies).toEqual(["@hansenexus/tokens", "@hansenexus/cx"]);
    expect(button.files?.[0]?.content).toContain("export function Button");
    const tokens = JSON.parse(readFileSync(join(out, "tokens.json"), "utf8"));
    expect(Object.keys(tokens.css)).toEqual(['@import "@hansenexus/tokens/tailwind.css"']);
  });
});

describe("markup", () => {
  test("Button defaults to type=button and keeps the variant", () => {
    const html = renderToStaticMarkup(<ui.Button variant="danger">Scale to 2</ui.Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain('data-variant="danger"');
    expect(html).toContain("bg-hn-action-danger");
  });

  test("StatusBadge carries a shape per status, not colour alone", () => {
    const shapes = ui.STATUSES.map((s) => {
      const html = renderToStaticMarkup(<ui.StatusBadge status={s} />);
      expect(html).toContain(ui.STATUS_LABEL[s]);
      return html.match(/<svg[^>]*>(.*?)<\/svg>/)?.[1];
    });
    expect(new Set(shapes).size).toBe(6);
  });

  test("off and unknown labels use ink.muted, not their shape colour", () => {
    for (const s of ["off", "unknown"] as const) {
      const html = renderToStaticMarkup(<ui.StatusBadge status={s} />);
      expect(html).toContain("text-hn-ink-muted");
    }
  });

  test("Meter is a labelled meter with its value in text", () => {
    const html = renderToStaticMarkup(<ui.Meter label="Memory" value={88} tone="warn" />);
    for (const attr of [
      'role="meter"',
      'aria-label="Memory"',
      'aria-valuenow="88"',
      'aria-valuetext="88%"',
    ])
      expect(html).toContain(attr);
  });

  test("Meter clamps to its range", () => {
    const html = renderToStaticMarkup(<ui.Meter label="Disk" value={140} />);
    expect(html).toContain('aria-valuenow="100"');
    expect(html).toContain("width:100%");
  });

  test("RailItem marks the current page", () => {
    expect(
      renderToStaticMarkup(
        <ui.RailItem href="/map" active>
          Map
        </ui.RailItem>
      )
    ).toContain('aria-current="page"');
    expect(renderToStaticMarkup(<ui.RailItem href="/map">Map</ui.RailItem>)).not.toContain(
      "aria-current"
    );
  });

  test("Sparkline is decorative unless labelled", () => {
    expect(renderToStaticMarkup(<ui.Sparkline values={[1, 2]} />)).toContain('aria-hidden="true"');
    const labelled = renderToStaticMarkup(<ui.Sparkline values={[1, 2]} label="rising" />);
    expect(labelled).toContain('role="img"');
    expect(labelled).toContain('aria-label="rising"');
  });

  test("sparklinePoints spans the box with a 1 px inset", () => {
    expect(ui.sparklinePoints([0, 10], 100, 20)).toBe("1.0,18.0 99.0,2.0");
    expect(ui.sparklinePoints([5, 5, 5], 10, 10)).toBe("1.0,8.0 5.0,8.0 9.0,8.0");
    expect(ui.sparklinePoints([], 10, 10)).toBe("");
  });

  test("Switch with a label points a <label> at the control", () => {
    const html = renderToStaticMarkup(<ui.Switch id="motion" label="Motion" defaultChecked />);
    expect(html).toContain('<label for="motion"');
    expect(html).toContain('id="motion"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });
});

describe("delayed visibility", () => {
  let seen: boolean[];
  const start = (options?: ui.DelayedVisibilityOptions) =>
    ui.createDelayedVisibility((v) => seen.push(v), options);

  beforeEach(() => {
    seen = [];
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  test("defaults come from the motion tokens", () => {
    expect(ms.delay.pending).toBe(200);
    expect(ms["min-visible"].pending).toBe(400);
  });

  test("work under 200 ms never shows the indicator", () => {
    const c = start();
    c.set(true);
    jest.advanceTimersByTime(199);
    c.set(false);
    jest.advanceTimersByTime(1000);
    expect(seen).toEqual([]);
  });

  test("shows at 200 ms, then stays at least 400 ms", () => {
    const c = start();
    c.set(true);
    jest.advanceTimersByTime(200);
    expect(seen).toEqual([true]);
    jest.advanceTimersByTime(50);
    c.set(false);
    jest.advanceTimersByTime(349);
    expect(seen).toEqual([true]);
    jest.advanceTimersByTime(1);
    expect(seen).toEqual([true, false]);
  });

  test("hides at once when it has already shown long enough", () => {
    const c = start();
    c.set(true);
    jest.advanceTimersByTime(200 + 500);
    c.set(false);
    expect(seen).toEqual([true, false]);
  });

  test("work that resumes inside the minimum keeps the indicator without a flicker", () => {
    const c = start();
    c.set(true);
    jest.advanceTimersByTime(200);
    c.set(false);
    jest.advanceTimersByTime(100);
    c.set(true);
    jest.advanceTimersByTime(1000);
    expect(seen).toEqual([true]);
  });

  test("custom timings and dispose", () => {
    const c = start({ delayMs: 50, minVisibleMs: 0 });
    c.set(true);
    jest.advanceTimersByTime(50);
    c.set(false);
    expect(seen).toEqual([true, false]);
    c.set(true);
    c.dispose();
    jest.advanceTimersByTime(1000);
    expect(seen).toEqual([true, false]);
  });
});

describe("loading", () => {
  test("Spinner renders nothing on first paint (the 200 ms delay)", () => {
    expect(renderToStaticMarkup(<ui.Spinner />)).toBe("");
  });

  test("SpinnerGlyph is a named busy status that stops under reduced motion", () => {
    const html = renderToStaticMarkup(<ui.SpinnerGlyph label="Sending" />);
    for (const attr of ['role="status"', 'aria-busy="true"', 'aria-label="Sending"'])
      expect(html).toContain(attr);
    expect(html).toContain("animate-hn-spin");
    expect(html).toContain("motion-reduce:animate-none");
  });

  test("Skeleton shapes are decorative, pulse on the skeleton tokens, stop under reduced motion", () => {
    for (const shape of ui.SKELETON_SHAPES) {
      const html = renderToStaticMarkup(<ui.Skeleton shape={shape} width={40} height={40} />);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain(`data-shape="${shape}"`);
      expect(html).toContain("bg-hn-skeleton-base");
      expect(html).toContain("animate-hn-pulse motion-reduce:animate-none");
    }
    expect(renderToStaticMarkup(<ui.Skeleton shape="circle" width={32} />)).toContain(
      "rounded-full"
    );
  });

  test("a text skeleton draws its lines, the last one shorter", () => {
    const html = renderToStaticMarkup(<ui.Skeleton shape="text" lines={3} />);
    expect(html.match(/bg-hn-skeleton-base/g)?.length).toBe(3);
    expect(html.match(/w-3\/5/g)?.length).toBe(1);
  });

  test("SkeletonGroup marks its container aria-busy", () => {
    const html = renderToStaticMarkup(
      <ui.SkeletonGroup>
        <ui.Skeleton />
      </ui.SkeletonGroup>
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Loading"');
  });
});

describe("brand", () => {
  test("the mark is named hansenexus and defaults to currentColor", () => {
    const html = renderToStaticMarkup(<ui.HansenexusMark size={32} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="hansenexus"');
    expect(html).toContain('height="32"');
    expect(html).toContain("fill-current");
    expect(html).toContain(`viewBox="0 0 ${ui.MARK.width} ${ui.MARK.height}"`);
    expect(html.match(/<polygon /g)?.length).toBe(2);
  });

  test("every variant is one flat token fill, no gradient or filter", () => {
    for (const variant of ui.BRAND_VARIANTS) {
      for (const html of [
        renderToStaticMarkup(<ui.HansenexusMark variant={variant} />),
        renderToStaticMarkup(<ui.HansenexusWordmark variant={variant} />),
      ]) {
        expect(html).toContain(ui.BRAND_FILL[variant]);
        expect(html).not.toMatch(/gradient|filter|stroke|opacity/i);
      }
    }
  });

  test("the lime wordmark sets paper text, lime-deep sets ink text", () => {
    const lime = renderToStaticMarkup(<ui.HansenexusWordmark variant="lime" />);
    expect(lime).toContain("fill-hn-brand-lime");
    expect(lime).toContain("fill-hn-brand-paper");
    const deep = renderToStaticMarkup(<ui.HansenexusWordmark variant="lime-deep" />);
    expect(deep).toContain("fill-hn-brand-ink");
  });

  test("a custom label replaces the name; aria-hidden makes it decoration", () => {
    expect(renderToStaticMarkup(<ui.HansenexusWordmark aria-label="hansenexus home" />)).toContain(
      'aria-label="hansenexus home"'
    );
    expect(renderToStaticMarkup(<ui.HansenexusMark aria-hidden />)).toContain('aria-hidden="true"');
  });
});

describe("styles", () => {
  test("Tailwind's own palette cannot compile next to the primitives", () => {
    // Inside node_modules so the probe resolves tailwindcss and @hansenexus/tokens like src/ does.
    const cache = resolve(ROOT, "node_modules/.cache");
    mkdirSync(cache, { recursive: true });
    const dir = mkdtempSync(join(cache, "hn-palette-"));
    writeFileSync(
      join(dir, "probe.html"),
      '<div class="bg-red-500 text-white bg-hn-surface-card">'
    );
    const css = readFileSync(resolve(ROOT, "src/styles.css"), "utf8")
      .replace('@source "./";', `@source "${dir}";`)
      .replace('"./no-palette.css"', `"${resolve(ROOT, "src/no-palette.css")}"`);
    writeFileSync(join(dir, "in.css"), css);
    const run = Bun.spawnSync(
      ["bunx", "@tailwindcss/cli", "-i", join(dir, "in.css"), "-o", join(dir, "out.css")],
      { cwd: ROOT }
    );
    expect(run.exitCode).toBe(0);
    const out = readFileSync(join(dir, "out.css"), "utf8");
    expect(out).toContain(".bg-hn-surface-card");
    expect(out).not.toContain(".bg-red-500");
    expect(out).not.toContain(".text-white");
  });

  test("the loading animations compile and switch off under prefers-reduced-motion", () => {
    const run = Bun.spawnSync(
      ["bunx", "@tailwindcss/cli", "-i", "src/styles.css", "-o", "node_modules/.cache/motion.css"],
      { cwd: ROOT }
    );
    expect(run.exitCode).toBe(0);
    const css = readFileSync(resolve(ROOT, "node_modules/.cache/motion.css"), "utf8");
    expect(css).toContain("@keyframes hn-pulse");
    expect(css).toContain("@keyframes hn-spin");
    expect(css).toContain(".animate-hn-pulse");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.motion-reduce\\:animate-none \{\s*animation: none;/
    );
  });
});
