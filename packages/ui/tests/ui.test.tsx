import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EmptyIllustration } from "@hansenexus/illustrations/empty";
import { ErrorIllustration } from "@hansenexus/illustrations/error";
import { NoResultsIllustration } from "@hansenexus/illustrations/no-results";
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

describe("state primitives", () => {
  const boom = Object.assign(new Error("db password wrong for tenant 42"), {
    digest: "4130985",
    stack: "Error: db password wrong for tenant 42\n    at load (invoices.ts:42:11)",
  });

  test("German and English copy have the same keys, all filled", () => {
    const shape = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" ? shape(v).map((s) => `${k}.${s}`) : [k]
      );
    expect(shape(ui.STATE_COPY.de)).toEqual(shape(ui.STATE_COPY.en));
    for (const locale of ui.STATE_LOCALES) {
      const values = JSON.stringify(ui.STATE_COPY[locale]).match(/"[^"]*"/g) ?? [];
      expect(values).not.toContain('""');
    }
  });

  test("EmptyState: empty and no-results copy per locale, overridable per prop", () => {
    expect(renderToStaticMarkup(<ui.EmptyState />)).toContain(ui.STATE_COPY.en.empty.title);
    const de = renderToStaticMarkup(<ui.EmptyState variant="no-results" locale="de" />);
    expect(de).toContain(ui.STATE_COPY.de.noResults.title);
    expect(de).toContain('data-variant="no-results"');
    const own = renderToStaticMarkup(
      <ui.EmptyState title="No invoices" action={<ui.Button>New invoice</ui.Button>} />
    );
    expect(own).toContain("No invoices");
    expect(own).not.toContain(ui.STATE_COPY.en.empty.title);
    expect(own).toContain("New invoice");
  });

  test("illustrations are aria-hidden", () => {
    const art = <svg data-art="" />;
    for (const html of [
      renderToStaticMarkup(<ui.EmptyState illustration={art} />),
      renderToStaticMarkup(<ui.ErrorState illustration={art} />),
    ])
      expect(html).toMatch(/<div aria-hidden="true"[^>]*><svg data-art=""/);
  });

  test("the @hansenexus/illustrations motifs fill the slot, in ink.muted", () => {
    for (const html of [
      renderToStaticMarkup(<ui.EmptyState illustration={<EmptyIllustration />} />),
      renderToStaticMarkup(
        <ui.EmptyState variant="no-results" illustration={<NoResultsIllustration />} />
      ),
      renderToStaticMarkup(<ui.ErrorState illustration={<ErrorIllustration />} />),
    ])
      expect(html).toMatch(
        /<div aria-hidden="true" class="mb-1 text-hn-ink-muted"><svg viewBox="0 0 160 120"/
      );
  });

  test("ErrorState in production: copy, digest and retry, never the message or stack", () => {
    const html = renderToStaticMarkup(<ui.ErrorState error={boom} onRetry={() => {}} />);
    expect(html).toContain(ui.STATE_COPY.en.error.title);
    expect(html).toContain("4130985");
    expect(html).toContain(ui.STATE_COPY.en.error.retry);
    expect(html).not.toContain("password");
    expect(html).not.toContain("invoices.ts");
  });

  test("ErrorState defaults to production when NODE_ENV is not development", () => {
    const before = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "test";
      expect(renderToStaticMarkup(<ui.ErrorState error={boom} />)).not.toContain("password");
      process.env.NODE_ENV = "development";
      expect(renderToStaticMarkup(<ui.ErrorState error={boom} />)).toContain("password");
    } finally {
      process.env.NODE_ENV = before;
    }
  });

  test("ErrorState in development also shows the message and stack", () => {
    const html = renderToStaticMarkup(<ui.ErrorState error={boom} dev locale="de" />);
    expect(html).toContain(ui.STATE_COPY.de.error.title);
    expect(html).toContain("db password wrong for tenant 42");
    expect(html).toContain("invoices.ts:42:11");
    expect(html).not.toContain(ui.STATE_COPY.de.error.retry);
  });

  test("Progress: determinate carries its value, indeterminate none, both stop under reduced motion", () => {
    const det = renderToStaticMarkup(<ui.Progress value={40} label="Upload" />);
    for (const attr of [
      'role="progressbar"',
      'aria-label="Upload"',
      'aria-valuenow="40"',
      'aria-valuetext="40%"',
      "width:40%",
      "motion-reduce:transition-none",
    ])
      expect(det).toContain(attr);
    const ind = renderToStaticMarkup(<ui.Progress locale="de" />);
    expect(ind).not.toContain("aria-valuenow");
    expect(ind).toContain(`aria-label="${ui.STATE_COPY.de.progress}"`);
    expect(ind).toContain('data-state="indeterminate"');
    expect(ind).toContain("animate-hn-pulse motion-reduce:animate-none");
    expect(renderToStaticMarkup(<ui.Progress value={140} />)).toContain('data-state="complete"');
  });

  test("queryStatus: undefined is loading, null and [] are empty, errors win", () => {
    expect(ui.queryStatus(undefined)).toBe("loading");
    expect(ui.queryStatus(null)).toBe("empty");
    expect(ui.queryStatus([])).toBe("empty");
    expect(ui.queryStatus([1])).toBe("data");
    expect(ui.queryStatus(0)).toBe("data");
    expect(ui.queryStatus({ rows: [] }, { isEmpty: (d) => d.rows.length === 0 })).toBe("empty");
    expect(ui.queryStatus([1], { error: new Error("x") })).toBe("error");
  });

  test("QueryState renders each state, defaults to Skeleton and EmptyState", () => {
    const list = (q: string[] | undefined, extra: Partial<ui.QueryStateProps<string[]>> = {}) =>
      renderToStaticMarkup(
        <ui.QueryState query={q} {...extra}>
          {(rows) => (
            <ul>
              {rows.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </ui.QueryState>
      );
    const loading = list(undefined);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("bg-hn-skeleton-base");
    expect(list([])).toContain(ui.STATE_COPY.en.empty.title);
    expect(list([])).not.toContain("aria-busy");
    expect(list(["kran-01"])).toContain("<li>kran-01</li>");
    expect(list(undefined, { loading: <p>custom</p> })).toContain("<p>custom</p>");
    expect(list([], { empty: <p>none</p> })).toContain("<p>none</p>");
    const failed = list(["kran-01"], { error: boom, locale: "de" });
    expect(failed).toContain(ui.STATE_COPY.de.error.title);
    expect(failed).toContain("4130985");
    expect(failed).not.toContain("kran-01");
  });

  test("QueryState keeps a polite live region, silent on first render", () => {
    const html = renderToStaticMarkup(
      <ui.QueryState query={["a"]}>{(rows) => rows.join()}</ui.QueryState>
    );
    expect(html).toContain(
      '<span role="status" aria-live="polite" aria-atomic="true" class="sr-only"></span>'
    );
  });

  test("the live region speaks when data arrives or the query fails", () => {
    const m = { loaded: "Loaded", error: "Failed" };
    expect(ui.nextAnnouncement("loading", "data", m)).toBe("Loaded");
    expect(ui.nextAnnouncement("loading", "empty", m)).toBe("Loaded");
    expect(ui.nextAnnouncement("data", "error", m)).toBe("Failed");
    expect(ui.nextAnnouncement("data", "loading", m)).toBe("");
    expect(ui.nextAnnouncement("data", "empty", m)).toBeNull();
    expect(ui.nextAnnouncement("data", "data", m)).toBeNull();
  });
});

describe("forms", () => {
  /** The attributes of the first tag whose attributes contain `marker`. */
  const tag = (html: string, marker: string) =>
    html.match(new RegExp(`<[a-z]+[^>]*${marker}[^>]*>`))?.[0] ?? "";
  /** The first opening tag of element `name`. */
  const el = (html: string, name: string) => html.match(new RegExp(`<${name}\\b[^>]*>`))?.[0] ?? "";

  test("Field wires label, help and error to the control", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Hostname" help="Lowercase, no dots." error="Already taken." required>
        <ui.Input />
      </ui.Field>
    );
    const input = el(html, "input");
    const id = input.match(/ id="([^"]+)"/)?.[1] ?? "";
    expect(id).not.toBe("");
    expect(input).toContain(`aria-labelledby="${id}-label"`);
    expect(input).toContain(`aria-describedby="${id}-help ${id}-error"`);
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('aria-required="true"');
    expect(el(html, "label")).toContain(`id="${id}-label" for="${id}"`);
    expect(html).toMatch(new RegExp(`id="${id}-help">Lowercase, no dots.</p>`));
    expect(tag(html, `id="${id}-error"`)).toContain('data-state="error"');
    // The error is never colour alone: it carries the crit diamond.
    expect(tag(html, 'data-state="error"')).toContain("text-hn-status-crit");
    expect(html).toContain('data-status="crit"');
    expect(html).toContain('<span aria-hidden="true" class="ml-0.5 text-hn-ink-muted">*</span>');
    expect(html).toContain("data-invalid");
  });

  test("Field keeps the control's own id and description and only marks errors", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Notes">
        <ui.Textarea id="notes" aria-describedby="counter" />
      </ui.Field>
    );
    const area = el(html, "textarea");
    expect(area).toContain('id="notes"');
    expect(area).toContain('aria-describedby="counter"');
    expect(area).not.toContain("aria-invalid=");
    expect(area).not.toContain("aria-required=");
    expect(html).not.toContain("data-invalid");
  });

  test("Field disabled disables the control and dims the label", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Replicas" disabled>
        <ui.Input />
      </ui.Field>
    );
    expect(el(html, "input")).toContain('disabled=""');
    expect(el(html, "label")).toContain("opacity-50");
  });

  test("Field inline puts the control before its label (Checkbox)", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Page on-call" layout="inline" error="Required for production.">
        <ui.Checkbox />
      </ui.Field>
    );
    expect(html.indexOf('role="checkbox"')).toBeLessThan(html.indexOf("<label"));
    expect(tag(html, 'role="checkbox"')).toContain('aria-invalid="true"');
  });

  test("Field names a RadioGroup through aria-labelledby", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Environment" error="Pick one.">
        <ui.RadioGroup>
          <ui.RadioGroupItem value="prod" label="Production" />
          <ui.RadioGroupItem value="lab" label="Lab" />
        </ui.RadioGroup>
      </ui.Field>
    );
    const group = tag(html, 'role="radiogroup"');
    expect(group).toMatch(/aria-labelledby="[^"]+-label"/);
    expect(group).toContain('aria-invalid="true"');
    expect(html.match(/role="radio"/g)?.length).toBe(2);
  });

  test("Checkbox: checked, indeterminate and invalid looks, a label tied to the box", () => {
    const on = renderToStaticMarkup(<ui.Checkbox defaultChecked label="Notify" id="n" />);
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain('<label for="n"');
    expect(on).toContain("data-[state=checked]:bg-hn-action-primary");
    const mixed = renderToStaticMarkup(<ui.Checkbox checked="indeterminate" aria-label="All" />);
    expect(mixed).toContain('aria-checked="mixed"');
    expect(mixed).toContain('data-state="indeterminate"');
    expect(renderToStaticMarkup(<ui.Checkbox aria-label="x" />)).toContain(
      "aria-invalid:border-hn-status-crit"
    );
  });

  test("RadioGroupItem: checked item, disabled item, labels tied", () => {
    const html = renderToStaticMarkup(
      <ui.RadioGroup defaultValue="b" aria-label="Pick">
        <ui.RadioGroupItem value="a" id="a" label="A" disabled />
        <ui.RadioGroupItem value="b" id="b" label="B" />
      </ui.RadioGroup>
    );
    expect(tag(html, 'id="b"')).toContain('aria-checked="true"');
    expect(tag(html, 'id="a"')).toContain('disabled=""');
    expect(html).toContain('<label for="a"');
  });

  test("Textarea: invalid border, vertical resize, rows default", () => {
    const html = renderToStaticMarkup(<ui.Textarea aria-label="Notes" mono />);
    for (const c of ['rows="4"', "resize-y", "aria-invalid:border-hn-status-crit", "font-hn-mono"])
      expect(html).toContain(c);
  });

  test("FormAlert: alert role, copy per kind and locale, overridable", () => {
    const server = renderToStaticMarkup(<ui.FormAlert kind="server-error" locale="de" />);
    expect(server).toContain('role="alert"');
    expect(server).toContain(ui.STATE_COPY.de.form.serverError.title);
    expect(server).toContain(ui.STATE_COPY.de.form.serverError.description);
    const invalid = renderToStaticMarkup(<ui.FormAlert kind="invalid" />);
    expect(invalid).toContain(ui.STATE_COPY.en.form.invalid);
    expect(invalid).toContain('data-status="crit"');
    expect(
      renderToStaticMarkup(<ui.FormAlert kind="invalid">Fix the name.</ui.FormAlert>)
    ).toContain("Fix the name.");
  });
});

describe("dist", () => {
  // The npm build must use react/jsx-runtime: a production React exports jsxDEV as
  // undefined, so a dev-runtime dist crashes every production render (design#27).
  const DIST_JS = join(ROOT, "dist/index.js");

  test("dist/index.js uses the production JSX runtime", () => {
    const js = readFileSync(DIST_JS, "utf8");
    expect(js.match(/jsx-dev-runtime|jsxDEV/g) ?? []).toEqual([]);
    expect(js).toContain("react/jsx-runtime");
  });

  test("dist/index.js imports as ESM in Node with every src export", () => {
    // Node links ESM strictly: an export without a declaration (Bun 1.4.0 bundled
    // `MARK2 as MARK`) is a SyntaxError there, which is what a Next.js consumer hits.
    const script = `const m = await import(process.argv[1]);
      process.stdout.write(JSON.stringify(Object.keys(m).sort()));`;
    const proc = Bun.spawnSync(["node", "--input-type=module", "-e", script, DIST_JS], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "production" },
    });
    expect(proc.stderr.toString()).toBe("");
    expect(JSON.parse(proc.stdout.toString())).toEqual(Object.keys(ui).sort());
  });

  test("dist/index.js renders under NODE_ENV=production", () => {
    const script = `import { createElement } from "react";
      import { renderToStaticMarkup } from "react-dom/server";
      import { Skeleton } from ${JSON.stringify(DIST_JS)};
      process.stdout.write(renderToStaticMarkup(createElement(Skeleton)));`;
    const proc = Bun.spawnSync([process.execPath, "-e", script], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: "production" },
    });
    expect(proc.stderr.toString()).toBe("");
    expect(proc.stdout.toString()).toContain('data-shape="block"');
  });
});
