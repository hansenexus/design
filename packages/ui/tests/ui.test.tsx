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
import { buildRegistry, loadRegistry, registryVersion, STAMP_RE } from "../scripts/registry";
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

  test("stamps every copied-in file and item with the ui version (#65)", async () => {
    const out = mkdtempSync(join(tmpdir(), "hn-registry-"));
    await buildRegistry(out, "1.2.3");
    const index = JSON.parse(readFileSync(join(out, "registry.json"), "utf8"));
    expect(index.items.map((i: { meta: { version: string } }) => i.meta.version)).toEqual(
      loadRegistry().items.map(() => "1.2.3")
    );
    for (const { name } of loadRegistry().items) {
      const item = registryItemSchema.parse(
        JSON.parse(readFileSync(join(out, `${name}.json`), "utf8"))
      );
      expect(item.meta?.version).toBe("1.2.3");
      for (const file of item.files ?? []) {
        const first = file.content?.split("\n")[0] ?? "";
        expect(first).toBe(`"hn-registry: ${name}@1.2.3";`);
        expect(first.match(STAMP_RE)?.slice(1)).toEqual([name, "1.2.3"]);
      }
    }
    expect(registryVersion()).toBe(
      JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version
    );
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

describe("layout primitives", () => {
  test("German and English layout copy have the same keys, all filled", () => {
    const shape = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" ? shape(v).map((s) => `${k}.${s}`) : [k]
      );
    expect(shape(ui.LAYOUT_COPY.de)).toEqual(shape(ui.LAYOUT_COPY.en));
    for (const locale of ui.STATE_LOCALES) {
      const values = JSON.stringify(ui.LAYOUT_COPY[locale]).match(/"[^"]*"/g) ?? [];
      expect(values).not.toContain('""');
    }
  });

  test("Card: header, body, footer; disabled is inert, pending is aria-busy", () => {
    const html = renderToStaticMarkup(
      <ui.Card>
        <ui.CardHeader>
          <ui.CardTitle as="h2">kran-01</ui.CardTitle>
          <ui.CardDescription>Quay 3</ui.CardDescription>
        </ui.CardHeader>
        <ui.CardBody>Body</ui.CardBody>
        <ui.CardFooter>
          <ui.Button>Open</ui.Button>
        </ui.CardFooter>
      </ui.Card>
    );
    expect(html).toContain("<h2");
    expect(html).toContain("bg-hn-surface-card");
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("inert");
    const disabled = renderToStaticMarkup(<ui.Card disabled>x</ui.Card>);
    expect(disabled).toContain('aria-disabled="true"');
    expect(disabled).toContain("inert");
    expect(disabled).toContain("opacity-50");
    expect(renderToStaticMarkup(<ui.Card pending>x</ui.Card>)).toContain('aria-busy="true"');
  });

  test("CardSkeleton is a busy status with a localised name, decorative placeholders", () => {
    const html = renderToStaticMarkup(<ui.CardSkeleton avatar media footer locale="de" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain(`aria-label="${ui.LAYOUT_COPY.de.loading}"`);
    expect(html).toContain('data-shape="circle"');
    expect(html.match(/data-shape="block"/g)?.length).toBe(2);
    expect(renderToStaticMarkup(<ui.CardSkeleton label="Loading kran-01" />)).toContain(
      'aria-label="Loading kran-01"'
    );
  });

  test("Alert: critical is role=alert, the rest role=status, each with a tone word and shape", () => {
    const glyphs = ui.ALERT_TONES.map((tone) => {
      const html = renderToStaticMarkup(<ui.Alert tone={tone} title="t" />);
      expect(html).toContain(`role="${tone === "critical" ? "alert" : "status"}"`);
      expect(html).toContain(`<span class="sr-only">${ui.LAYOUT_COPY.en.tone[tone]}: </span>`);
      return html.match(/<svg[^>]*>(.*?)<\/svg>/)?.[1];
    });
    expect(new Set(glyphs).size).toBe(4);
    const de = renderToStaticMarkup(<ui.Alert tone="warning" locale="de" dismissible />);
    expect(de).toContain(`${ui.LAYOUT_COPY.de.tone.warning}: `);
    expect(de).toContain(`aria-label="${ui.LAYOUT_COPY.de.dismiss}"`);
  });

  test("Alert: no close button unless dismissible; open={false} renders nothing", () => {
    expect(renderToStaticMarkup(<ui.Alert>x</ui.Alert>)).not.toContain("<button");
    expect(renderToStaticMarkup(<ui.Alert dismissible>x</ui.Alert>)).toContain('type="button"');
    expect(renderToStaticMarkup(<ui.Alert open={false}>x</ui.Alert>)).toBe("");
  });

  test("Banner is the square, full-width Alert layout", () => {
    const html = renderToStaticMarkup(<ui.Banner tone="success">Deployed</ui.Banner>);
    expect(html).toContain('data-layout="banner"');
    expect(html).toContain("rounded-none");
    expect(html).toContain("border-l-hn-status-ok");
  });

  test("initials: first and last word, uppercased", () => {
    expect(ui.initials("Ada Lovelace")).toBe("AL");
    expect(ui.initials("grace brewster murray hopper")).toBe("GH");
    expect(ui.initials("kran-01")).toBe("K0");
    expect(ui.initials("  ops ")).toBe("O");
    expect(ui.initials("")).toBe("");
  });

  test("Avatar is one named image; initials before the image loads; a skeleton while loading", () => {
    const html = renderToStaticMarkup(<ui.Avatar name="Ada Lovelace" src="/ada.png" size="lg" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Ada Lovelace"');
    expect(html).toContain("width:48px");
    const fallback = renderToStaticMarkup(<ui.Avatar name="Ada Lovelace" />);
    expect(fallback).toMatch(/<span aria-hidden="true"[^>]*>AL<\/span>/);
    const loading = renderToStaticMarkup(<ui.Avatar name="Ada" loading locale="de" />);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain(`aria-label="${ui.LAYOUT_COPY.de.loading}"`);
    expect(loading).toContain('data-shape="circle"');
    expect(loading).not.toContain("Ada");
  });

  test("Separator is decorative by default, a vertical role=separator on request", () => {
    const plain = renderToStaticMarkup(<ui.Separator />);
    expect(plain).toContain('role="none"');
    expect(plain).toContain("h-px");
    const semantic = renderToStaticMarkup(
      <ui.Separator decorative={false} orientation="vertical" tone="strong" />
    );
    expect(semantic).toContain('role="separator"');
    expect(semantic).toContain('aria-orientation="vertical"');
    expect(semantic).toContain("bg-hn-line-strong");
  });

  test("Accordion: header buttons with aria-expanded, disabled items, empty copy", () => {
    const html = renderToStaticMarkup(
      <ui.Accordion type="single" collapsible defaultValue="a">
        <ui.AccordionItem value="a">
          <ui.AccordionTrigger meta="3">Pods</ui.AccordionTrigger>
          <ui.AccordionContent locale="de" />
        </ui.AccordionItem>
        <ui.AccordionItem value="b" disabled>
          <ui.AccordionTrigger>Volumes</ui.AccordionTrigger>
          <ui.AccordionContent>none</ui.AccordionContent>
        </ui.AccordionItem>
      </ui.Accordion>
    );
    expect(html.match(/<h3/g)?.length).toBe(2);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).toContain(ui.LAYOUT_COPY.de.empty);
    expect(html).toContain('role="region"');
  });
});

describe("dates", () => {
  const day = (m: number, d: number, y = 2026) => new Date(y, m - 1, d);
  const ymd = (date: Date | null) =>
    date ? `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}` : null;

  test("monthGrid: six weeks from the week start before the 1st", () => {
    // 1 Sep 2026 is a Tuesday.
    const monday = ui.monthGrid(day(9, 1));
    expect(monday).toHaveLength(42);
    expect(ymd(monday[0] ?? null)).toBe("2026-8-31");
    expect(ymd(monday[41] ?? null)).toBe("2026-10-11");
    expect(ymd(ui.monthGrid(day(9, 1), 0)[0] ?? null)).toBe("2026-8-30");
  });

  test("calendarKeyTarget: days, weeks, week ends, months, years", () => {
    const t = (d: Date, key: string, shiftKey = false) =>
      ymd(ui.calendarKeyTarget(d, key, { shiftKey }));
    expect(t(day(9, 30), "ArrowRight")).toBe("2026-10-1");
    expect(t(day(9, 1), "ArrowLeft")).toBe("2026-8-31");
    expect(t(day(9, 16), "ArrowUp")).toBe("2026-9-9");
    expect(t(day(9, 16), "ArrowDown")).toBe("2026-9-23");
    expect(t(day(9, 16), "Home")).toBe("2026-9-14");
    expect(t(day(9, 16), "End")).toBe("2026-9-20");
    expect(t(day(1, 31), "PageDown")).toBe("2026-2-28");
    expect(t(day(9, 16), "PageUp", true)).toBe("2025-9-16");
    expect(t(day(9, 16), "a")).toBeNull();
    expect(ymd(ui.calendarKeyTarget(day(9, 16), "Home", { weekStartsOn: 0 }))).toBe("2026-9-13");
  });

  test("selectInRange: start, close in either direction, start over", () => {
    const first = ui.selectInRange(null, day(9, 18));
    expect([ymd(first.from), first.to]).toEqual(["2026-9-18", undefined]);
    const back = ui.selectInRange(first, day(9, 14));
    expect([ymd(back.from), ymd(back.to ?? null)]).toEqual(["2026-9-14", "2026-9-18"]);
    const again = ui.selectInRange(back, day(9, 2));
    expect([ymd(again.from), again.to]).toEqual(["2026-9-2", undefined]);
  });

  test("formatDate and formatDateRange write the locale's short form", () => {
    expect(ui.formatDate(day(9, 14), "de")).toBe("14.09.2026");
    expect(ui.formatDate(day(9, 14), "en")).toMatch(/^14 Sept? 2026$/);
    expect(ui.formatDateRange({ from: day(9, 14), to: day(9, 18) }, "de")).toBe("14.–18.09.2026");
    expect(ui.formatDateRange({ from: day(9, 14) }, "de")).toBe("14.09.2026 – …");
  });

  test("isDayDisabled: min, max and the predicate, by calendar day", () => {
    const bounds = { min: day(9, 10), max: new Date(2026, 8, 20, 9, 30) };
    expect(ui.isDayDisabled(new Date(2026, 8, 10, 23), bounds)).toBe(false);
    expect(ui.isDayDisabled(day(9, 9), bounds)).toBe(true);
    expect(ui.isDayDisabled(day(9, 20), bounds)).toBe(false);
    expect(ui.isDayDisabled(day(9, 21), bounds)).toBe(true);
    expect(ui.isDayDisabled(day(9, 12), { isDateDisabled: (d) => d.getDay() === 6 })).toBe(true);
  });

  test("Calendar: a labelled grid, one tab stop, today and the selection marked", () => {
    const html = renderToStaticMarkup(
      <ui.Calendar locale="de" today={day(9, 14)} selected={day(9, 18)} min={day(9, 3)} />
    );
    const title = html.match(/id="([^"]+-title)"[^>]*>([^<]+)</);
    expect(title?.[2]).toBe("September 2026");
    expect(html).toContain(`role="grid" aria-labelledby="${title?.[1]}"`);
    expect(html.match(/role="gridcell"/g)).toHaveLength(42);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html).toMatch(/tabindex="0" aria-label="Freitag, 18. September 2026"/);
    expect(html).toMatch(/aria-label="Montag, 14. September 2026" aria-current="date"/);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-label="Mittwoch, 2. September 2026" aria-disabled="true"/);
    expect(html).toContain('<th scope="col" abbr="Montag"');
    expect(html).toContain(`aria-label="${ui.STATE_COPY.de.date.previousMonth}"`);
  });

  test("Calendar range: multiselectable, start, middle and end marked", () => {
    const html = renderToStaticMarkup(
      <ui.Calendar mode="range" today={day(9, 1)} selected={{ from: day(9, 14), to: day(9, 18) }} />
    );
    expect(html).toContain('aria-multiselectable="true"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(5);
    expect(html.match(/data-range="start"/g)).toHaveLength(1);
    expect(html.match(/data-range="middle"/g)).toHaveLength(3);
    expect(html.match(/data-range="end"/g)).toHaveLength(1);
  });

  test("DatePicker: placeholder, value and range in the locale, a dialog trigger", () => {
    const empty = renderToStaticMarkup(<ui.DatePicker locale="de" />);
    expect(empty).toContain(ui.STATE_COPY.de.date.placeholder);
    expect(empty).toContain('aria-haspopup="dialog"');
    expect(empty).toContain('data-placeholder=""');
    const one = renderToStaticMarkup(<ui.DatePicker locale="de" defaultValue={day(9, 14)} />);
    expect(one).toContain("14.09.2026");
    expect(one).not.toContain('data-placeholder=""');
    const range = renderToStaticMarkup(
      <ui.DatePicker mode="range" locale="de" value={{ from: day(9, 14), to: day(9, 18) }} />
    );
    expect(range).toContain("14.–18.09.2026");
    expect(renderToStaticMarkup(<ui.DatePicker mode="range" />)).toContain(
      ui.STATE_COPY.en.date.rangePlaceholder
    );
  });

  test("DatePicker in Field: labelled, invalid, disabled; pending is busy and disabled", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Wartungsfenster" error="Bitte ein Datum wählen." required>
        <ui.DatePicker locale="de" />
      </ui.Field>
    );
    const button = html.match(/<button[^>]*>/)?.[0] ?? "";
    expect(button).toMatch(/aria-labelledby="[^"]+-label"/);
    expect(button).toContain('aria-invalid="true"');
    expect(button).toContain("aria-invalid:border-hn-status-crit");
    const pending = renderToStaticMarkup(<ui.DatePicker pending />);
    expect(pending).toContain('aria-busy="true"');
    expect(pending).toContain('disabled=""');
    expect(renderToStaticMarkup(<ui.DatePicker disabled />)).toContain('disabled=""');
  });
});

describe("combobox", () => {
  const HOSTS: ui.ComboboxOption[] = [
    { value: "kran-01", label: "kran-01" },
    { value: "kran-02", label: "kran-02", disabled: true },
    { value: "pegel", label: "Pegel", description: "Tide gauge" },
  ];

  test("filterOptions: label contains the query, any case; filter false keeps all", () => {
    expect(ui.filterOptions(HOSTS, "PEG").map((o) => o.value)).toEqual(["pegel"]);
    expect(ui.filterOptions(HOSTS, "  ")).toHaveLength(3);
    expect(ui.filterOptions(HOSTS, "zzz", false)).toHaveLength(3);
    expect(
      ui.filterOptions(HOSTS, "tide", (o, q) => !!o.description?.toLowerCase().includes(q))
    ).toHaveLength(1);
  });

  test("nextOptionIndex skips disabled options and wraps", () => {
    expect(ui.nextOptionIndex(HOSTS, -1, 1)).toBe(0);
    expect(ui.nextOptionIndex(HOSTS, 0, 1)).toBe(2);
    expect(ui.nextOptionIndex(HOSTS, 2, 1)).toBe(0);
    expect(ui.nextOptionIndex(HOSTS, 0, -1)).toBe(2);
    expect(ui.nextOptionIndex([{ value: "x", label: "x", disabled: true }], -1, 1)).toBe(-1);
  });

  test("comboboxStatus: loading, error, empty, no-results, options", () => {
    const s = (options: ui.ComboboxOption[] | undefined, query = "", error?: unknown) =>
      ui.comboboxStatus(options, ui.filterOptions(options ?? [], query), { error, query });
    expect(s(undefined)).toBe("loading");
    expect(s(HOSTS, "", new Error("x"))).toBe("error");
    expect(s(undefined, "", new Error("x"))).toBe("error");
    expect(s([])).toBe("empty");
    expect(s([], "kran")).toBe("no-results");
    expect(s(HOSTS, "zzz")).toBe("no-results");
    expect(s(HOSTS, "kran")).toBe("options");
  });

  test("Combobox: an ARIA combobox input, the selection as its text, wired by Field", () => {
    const html = renderToStaticMarkup(
      <ui.Field label="Maschine" error="Bitte eine Maschine wählen.">
        <ui.Combobox options={HOSTS} defaultValue="pegel" locale="de" />
      </ui.Field>
    );
    const input = html.match(/<input[^>]*>/)?.[0] ?? "";
    for (const attr of [
      'role="combobox"',
      'aria-autocomplete="list"',
      'aria-expanded="false"',
      'aria-invalid="true"',
      'value="Pegel"',
      `placeholder="${ui.STATE_COPY.de.combobox.placeholder}"`,
    ])
      expect(input).toContain(attr);
    expect(input).toMatch(/aria-labelledby="[^"]+-label"/);
    const loading = renderToStaticMarkup(<ui.Combobox options={undefined} aria-label="Host" />);
    expect(loading).toContain('aria-busy="true"');
  });
});

describe("data table", () => {
  type Machine = { id: string; host: string; cpu: number | null; seen: Date; quay: string };
  const M: Machine[] = [
    { id: "a", host: "kran-10", cpu: 21, seen: new Date(2026, 8, 14), quay: "Nord" },
    { id: "b", host: "kran-2", cpu: null, seen: new Date(2026, 8, 12), quay: "Süd" },
    { id: "c", host: "Pegel", cpu: 88, seen: new Date(2026, 8, 13), quay: "Nord" },
    { id: "d", host: "ärger-01", cpu: 21, seen: new Date(2026, 8, 11), quay: "Süd" },
  ];
  const COLUMNS: ui.DataTableColumn<Machine>[] = [
    { id: "host", header: "Host", cell: (m) => m.host, sortValue: (m) => m.host, mono: true },
    { id: "cpu", header: "CPU", cell: (m) => m.cpu ?? "–", sortValue: (m) => m.cpu, align: "end" },
    { id: "seen", header: "Seen", cell: (m) => m.seen.getDate(), sortValue: (m) => m.seen },
    { id: "quay", header: "Quay", cell: (m) => m.quay, filterValue: (m) => m.quay },
  ];
  const ids = (rows: Machine[]) => rows.map((r) => r.id).join("");
  const sort = (id: string, direction: ui.SortDirection = "asc") =>
    ids(ui.sortRows(M, COLUMNS, { id, direction }, "de"));

  test("sortRows: collation with numbers, numbers, dates, empties last, stable", () => {
    expect(sort("host")).toBe("dbac");
    expect(sort("host", "desc")).toBe("cabd");
    expect(sort("cpu")).toBe("adcb");
    expect(sort("cpu", "desc")).toBe("cadb");
    expect(sort("seen")).toBe("dbca");
    expect(ids(ui.sortRows(M, COLUMNS, null))).toBe("abcd");
    expect(ids(ui.sortRows(M, COLUMNS, { id: "quay", direction: "asc" }))).toBe("abcd");
  });

  test("filterRows: every word somewhere, any case, plus the predicate", () => {
    expect(ids(ui.filterRows(M, COLUMNS, "KRAN"))).toBe("ab");
    expect(ids(ui.filterRows(M, COLUMNS, "kran süd"))).toBe("b");
    expect(ids(ui.filterRows(M, COLUMNS, "88"))).toBe("c");
    expect(ids(ui.filterRows(M, COLUMNS, "", (m) => m.quay === "Nord"))).toBe("ac");
    expect(ids(ui.filterRows(M, COLUMNS, "  "))).toBe("abcd");
  });

  test("nextSort, toggleAll and dataTableStatus", () => {
    expect(ui.nextSort(null, "host")).toEqual({ id: "host", direction: "asc" });
    expect(ui.nextSort({ id: "host", direction: "asc" }, "host").direction).toBe("desc");
    expect(ui.nextSort({ id: "host", direction: "desc" }, "host").direction).toBe("asc");
    expect(ui.nextSort({ id: "host", direction: "desc" }, "cpu")).toEqual({
      id: "cpu",
      direction: "asc",
    });
    expect([...ui.toggleAll(new Set(["a", "x"]), ["a", "b"])].sort()).toEqual(["a", "b", "x"]);
    expect([...ui.toggleAll(new Set(["a", "b", "x"]), ["a", "b"])]).toEqual(["x"]);
    expect(ui.dataTableStatus(undefined, [])).toBe("loading");
    expect(ui.dataTableStatus([1], [1], new Error("x"))).toBe("error");
    expect(ui.dataTableStatus([], [])).toBe("empty");
    expect(ui.dataTableStatus([1], [])).toBe("no-results");
    expect(ui.dataTableStatus([1], [1])).toBe("data");
  });

  const table = (props: Partial<ui.DataTableProps<Machine>> = {}) =>
    renderToStaticMarkup(
      <ui.DataTable columns={COLUMNS} rows={M} getRowId={(m) => m.id} {...props} />
    );

  test("sorted column carries aria-sort; sortable headers are buttons", () => {
    const html = table({ defaultSort: { id: "cpu", direction: "desc" }, locale: "de" });
    expect(html.match(/aria-sort=/g)).toHaveLength(1);
    expect(html).toMatch(/<th scope="col"[^>]*aria-sort="descending"><button[^>]*>CPU</);
    expect(html.match(/<th[^>]*><button/g)).toHaveLength(3);
    expect(html.indexOf("Pegel")).toBeLessThan(html.indexOf("kran-10"));
    expect(html.indexOf("kran-10")).toBeLessThan(html.indexOf("kran-2<"));
  });

  test("selection: a named box per row, tri-state header, selected rows marked", () => {
    const html = table({
      selectable: true,
      defaultSelection: ["a"],
      getRowLabel: (m) => m.host,
      locale: "de",
    });
    expect(html).toContain(`aria-label="${ui.STATE_COPY.de.table.selectAll}"`);
    expect(html).toContain('aria-label="kran-10 auswählen"');
    expect(html.match(/<tr[^>]*data-state="selected"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="mixed"[^>]*aria-label="Alle Zeilen auswählen"/);
    const all = table({ selectable: true, selection: new Set(["a", "b", "c", "d"]) });
    expect(all).toMatch(/aria-checked="true"[^>]*aria-label="Select all rows"/);
  });

  test("loading keeps the header, draws skeleton rows and is busy", () => {
    const html = table({ rows: undefined, loadingRows: 3 });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Host");
    expect(html.match(/<tr[^>]*aria-hidden="true"/g)).toHaveLength(3);
    expect(html).toContain('data-state="loading"');
  });

  test("empty, no-results with clear filters, error with digest and retry", () => {
    expect(table({ rows: [], locale: "de" })).toContain(ui.STATE_COPY.de.empty.title);
    const none = table({ query: "zzz", onClearFilters: () => {} });
    expect(none).toContain(ui.STATE_COPY.en.noResults.title);
    expect(none).toContain(ui.STATE_COPY.en.table.clearFilters);
    expect(none).toContain('data-state="no-results"');
    expect(none).toMatch(/<td[^>]*colSpan="4"/);
    const failed = table({
      error: Object.assign(new Error("secret"), { digest: "77" }),
      onRetry: () => {},
    });
    expect(failed).toContain(ui.STATE_COPY.en.error.title);
    expect(failed).toContain("77");
    expect(failed).toContain(ui.STATE_COPY.en.error.retry);
    expect(failed).not.toContain("kran-10");
  });

  test("pending keeps the rows, is busy, locks sorting and selection", () => {
    const html = table({ pending: true, selectable: true });
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("kran-10");
    expect(html).toContain("data-pending");
    // Three sort buttons and the select-all box.
    expect(html.match(/<th[^>]*><button[^>]*disabled=""/g)).toHaveLength(4);
  });

  test("fillCopy fills named slots and keeps unknown ones", () => {
    expect(ui.fillCopy("{row} auswählen", { row: "kran-01" })).toBe("kran-01 auswählen");
    expect(ui.fillCopy("{a} {b}", { a: "x" })).toBe("x {b}");
  });
});

describe("overlays and navigation", () => {
  const tag = (html: string, marker: string) =>
    html.match(new RegExp(`<[a-z]+[^>]*${marker}[^>]*>`))?.[0] ?? "";

  test("the set is exported and in the registry", () => {
    const names = ["PopoverContent", "SheetContent", "Breadcrumb", "Pagination", "Command"];
    const exported = ui as Record<string, unknown>;
    expect(names.filter((n) => typeof exported[n] !== "function")).toEqual([]);
    const items = new Set(loadRegistry().items.map((i) => i.name));
    for (const n of ["popover", "sheet", "breadcrumb", "pagination", "command"])
      expect(items.has(n)).toBe(true);
  });

  test("fillCopy fills known names and keeps the rest", () => {
    expect(ui.fillCopy("Page {page} of {count}", { page: 3, count: 12 })).toBe("Page 3 of 12");
    expect(ui.fillCopy("{a} {b}", { a: 1 })).toBe("1 {b}");
  });

  test("de and en copy have the same keys", () => {
    const keys = (o: object, p = ""): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === "object" && v !== null ? keys(v, `${p}${k}.`) : [`${p}${k}`]
      );
    expect(keys(ui.STATE_COPY.de).sort()).toEqual(keys(ui.STATE_COPY.en).sort());
  });

  test("paginationRange: all pages when few, fixed length with gaps when many", () => {
    expect(ui.paginationRange(1, 1)).toEqual([1]);
    expect(ui.paginationRange(1, 0)).toEqual([]);
    expect(ui.paginationRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ui.paginationRange(1, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis", 12]);
    expect(ui.paginationRange(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
    expect(ui.paginationRange(12, 12)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12]);
    for (let p = 1; p <= 40; p++) expect(ui.paginationRange(p, 40)).toHaveLength(7);
    expect(ui.paginationRange(10, 40, 2)).toHaveLength(9);
  });

  test("Pagination: nav landmark, aria-current, edges off, nothing for one page", () => {
    const html = renderToStaticMarkup(<ui.Pagination page={1} pageCount={12} locale="de" />);
    expect(html).toContain('<nav aria-label="Seitennavigation"');
    expect(tag(html, 'aria-current="page"')).toContain('aria-label="Seite 1"');
    expect(tag(html, 'aria-label="Zurück"')).toContain('disabled=""');
    expect(tag(html, 'aria-label="Weiter"')).not.toContain('disabled=""');
    expect(html).toContain('role="status"');
    expect(renderToStaticMarkup(<ui.Pagination page={1} pageCount={1} />)).toBe("");
  });

  test("Pagination: a pending page keeps aria-current and marks the nav busy", () => {
    const html = renderToStaticMarkup(<ui.Pagination page={4} pageCount={12} pendingPage={5} />);
    expect(html).toMatch(/<nav[^>]*aria-busy="true"/);
    expect(tag(html, 'aria-current="page"')).toContain('aria-label="Page 4"');
    // The spinner waits for the pending delay, so the first render shows the number.
    expect(html).not.toContain("data-pending");
  });

  test("Pagination: links, disabled", () => {
    const links = renderToStaticMarkup(
      <ui.Pagination page={2} pageCount={4} href={(p) => `/list?page=${p}`} />
    );
    expect(links).toContain('href="/list?page=3"');
    expect(tag(links, 'aria-current="page"')).toMatch(/^<a /);
    const off = renderToStaticMarkup(<ui.Pagination page={2} pageCount={4} disabled />);
    expect(off.match(/disabled=""/g)?.length).toBe(6);
  });

  test("Breadcrumb: named nav, current page, hidden separators, ellipsis button", () => {
    const html = renderToStaticMarkup(
      <ui.Breadcrumb locale="de">
        <ui.BreadcrumbList>
          <ui.BreadcrumbItem>
            <ui.BreadcrumbLink href="/">Bestand</ui.BreadcrumbLink>
          </ui.BreadcrumbItem>
          <ui.BreadcrumbSeparator />
          <ui.BreadcrumbItem>
            <ui.BreadcrumbEllipsis locale="de" />
          </ui.BreadcrumbItem>
          <ui.BreadcrumbSeparator />
          <ui.BreadcrumbItem>
            <ui.BreadcrumbPage>kran-04</ui.BreadcrumbPage>
          </ui.BreadcrumbItem>
        </ui.BreadcrumbList>
      </ui.Breadcrumb>
    );
    expect(html).toContain('<nav aria-label="Seitenpfad"');
    expect(html).toContain("<ol");
    expect(tag(html, 'aria-current="page"')).toMatch(/^<span /);
    expect(html.match(/role="presentation" aria-hidden="true"/g)?.length).toBe(2);
    expect(html).toContain(`aria-label="${ui.STATE_COPY.de.navigation.more}"`);
    expect(html).toMatch(/<button type="button"/);
  });

  const GROUPS: ui.CommandGroup[] = [
    {
      id: "m",
      heading: "Machines",
      items: [
        { id: "a", label: "kran-01", keywords: ["crane"] },
        { id: "b", label: "Über-Kai", disabled: true },
        { id: "c", label: "pegel" },
      ],
    },
    { id: "x", heading: "Actions", items: [{ id: "d", label: "Restart deployment" }] },
  ];

  test("filterCommandGroups: words, keywords, accents, empty groups dropped", () => {
    const labels = (q: string) =>
      ui.filterCommandGroups(GROUPS, q).flatMap((g) => g.items.map((i) => i.label));
    expect(labels("")).toHaveLength(4);
    expect(labels("crane")).toEqual(["kran-01"]);
    expect(labels("uber")).toEqual(["Über-Kai"]);
    expect(labels("restart dep")).toEqual(["Restart deployment"]);
    expect(ui.filterCommandGroups(GROUPS, "restart").map((g) => g.id)).toEqual(["x"]);
    expect(labels("zzz")).toEqual([]);
  });

  test("commandStatus: error wins, loading only without results, no-results needs a query", () => {
    expect(ui.commandStatus({ count: 3, query: "k", error: true })).toBe("error");
    expect(ui.commandStatus({ count: 3, query: "k", loading: true })).toBe("results");
    expect(ui.commandStatus({ count: 0, query: "k", loading: true })).toBe("loading");
    expect(ui.commandStatus({ count: 0, query: "k" })).toBe("no-results");
    expect(ui.commandStatus({ count: 0, query: "  " })).toBe("empty");
  });

  test("Command: combobox owns the listbox, first enabled option active, disabled marked", () => {
    const html = renderToStaticMarkup(<ui.Command groups={GROUPS} locale="de" />);
    const input = tag(html, 'role="combobox"');
    expect(input).toContain('aria-expanded="true"');
    expect(input).toContain('aria-autocomplete="list"');
    expect(input).toContain(`aria-label="${ui.STATE_COPY.de.command.label}"`);
    const list = input.match(/aria-controls="([^"]+)"/)?.[1] ?? "";
    expect(tag(html, `id="${list}"`)).toContain('role="listbox"');
    const active = input.match(/aria-activedescendant="([^"]+)"/)?.[1] ?? "";
    expect(tag(html, `id="${active}"`)).toContain('aria-selected="true"');
    expect(html.match(/role="option"/g)?.length).toBe(4);
    expect(html.match(/aria-disabled="true"/g)?.length).toBe(1);
    expect(html.match(/role="group" aria-labelledby=/g)?.length).toBe(2);
    expect(html).toContain("4 Treffer");
  });

  test("Command: loading, no-results, error and empty states", () => {
    const loading = renderToStaticMarkup(
      <ui.Command groups={[]} filter={false} defaultQuery="x" loading />
    );
    expect(loading).toContain('data-state="loading"');
    expect(loading).toContain('data-shape="text"');
    expect(tag(loading, 'role="combobox"')).toContain('aria-busy="true"');
    expect(tag(loading, 'role="combobox"')).toContain('aria-expanded="false"');
    const none = renderToStaticMarkup(<ui.Command groups={GROUPS} defaultQuery="zzz" />);
    expect(none).toContain('data-state="no-results"');
    expect(none).toContain("Nothing matches “zzz”.");
    const error = renderToStaticMarkup(
      <ui.Command groups={GROUPS} error onRetry={() => {}} locale="de" />
    );
    expect(tag(error, 'role="alert"')).not.toBe("");
    expect(error).toContain(ui.STATE_COPY.de.error.retry);
    expect(error).toContain('data-status="crit"');
    const empty = renderToStaticMarkup(<ui.Command groups={[]} />);
    expect(empty).toContain(ui.STATE_COPY.en.command.empty);
  });

  test("isCommandShortcut: ⌘K or Ctrl+K only", () => {
    const k = { key: "k", metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };
    expect(ui.isCommandShortcut({ ...k, metaKey: true })).toBe(true);
    expect(ui.isCommandShortcut({ ...k, ctrlKey: true, key: "K" })).toBe(true);
    expect(ui.isCommandShortcut(k)).toBe(false);
    expect(ui.isCommandShortcut({ ...k, metaKey: true, shiftKey: true })).toBe(false);
    expect(ui.isCommandShortcut({ ...k, ctrlKey: true, key: "p" }, "p")).toBe(true);
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
