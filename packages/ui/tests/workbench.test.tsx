import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
// The built package, as the example app imports it: one module, so the pack's skins reach it.
import { type Skins, ThemePack } from "@hansenexus/ui";
import {
  type AppScreens,
  defineScreen,
  fixtureContext,
  validateScreens,
  WORKBENCH_NOW,
} from "@hansenexus/ui/workbench";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import example from "../../../workbench/example";
import { PACKS } from "../gallery/packs";
import {
  envKey,
  type Manifest,
  type ResolvedApp,
  readManifest,
  resolveApps,
  resolveScreenImport,
  screensCss,
  screensPlugin,
  screensSource,
} from "../scripts/workbench";

// The screen-fixture contract of design#148: the shape an app's screens keep, the import rules
// the gallery build enforces, and the example app rendering under every theme pack.

const REPO = resolve(import.meta.dir, "../../..");

const render = async (app: AppScreens, id: string, fixture: string, pack?: (typeof PACKS)[0]) => {
  const screen = app.screens.find((s) => s.id === id);
  const f = screen?.fixtures.find((x) => x.id === fixture);
  if (!screen || !f) throw new Error(`no ${id}#${fixture}`);
  const props = await f.load(fixtureContext());
  const node = <screen.component {...props} />;
  return renderToStaticMarkup(pack ? <ThemePack pack={pack}>{node}</ThemePack> : node);
};

describe("contract shape (design#148)", () => {
  test("the example app keeps it", () => {
    expect(validateScreens(example)).toEqual([]);
  });

  test("names every broken rule", () => {
    const Bare = () => null;
    const broken: AppScreens = {
      app: "demo",
      screens: [
        defineScreen({
          id: "other/x",
          title: " ",
          level: "template",
          component: Bare,
          fixtures: [{ id: "a", label: "a", load: () => ({}) }],
        }),
        defineScreen({
          id: "demo/Two",
          title: "Two",
          level: "template",
          viewports: [],
          component: Bare,
          fixtures: [
            { id: "Bad id", label: "x", load: () => ({}) },
            { id: "Bad id", label: "y", load: () => ({}) },
          ],
        }),
        defineScreen({
          id: "demo/three",
          title: "Three",
          level: "template",
          component: Bare,
          fixtures: [{ id: "a", label: "a", load: () => ({}) }],
        }),
        defineScreen({
          id: "demo/three",
          title: "Three again",
          level: "template",
          component: Bare,
          fixtures: [{ id: "a", label: "a", load: () => ({}) }],
        }),
      ],
    };
    expect(validateScreens(broken)).toEqual([
      'demo: screen "other/x": id must be "demo/<kebab-name>"',
      'demo: screen "other/x": empty title',
      'demo: screen "demo/Two": id must be "demo/<kebab-name>"',
      'demo: screen "demo/Two": empty viewports',
      'demo: screen "demo/Two": fixture "Bad id" is not kebab-case',
      'demo: screen "demo/Two": fixture "Bad id" is not kebab-case',
      'demo: screen "demo/Two": duplicate fixture "Bad id"',
      'demo: screen "demo/three": duplicate id',
    ]);
  });

  test("fixtures load against a frozen clock", async () => {
    const ctx = fixtureContext();
    expect(ctx.now.toISOString()).toBe(WORKBENCH_NOW.toISOString());
    ctx.now.setFullYear(2000);
    expect(fixtureContext().now.toISOString()).toBe(WORKBENCH_NOW.toISOString());
    const a = await render(example, "example/machines", "estate");
    const b = await render(example, "example/machines", "estate");
    expect(a).toBe(b);
  });

  test("ctx.action reports the name and arguments", async () => {
    const seen: string[] = [];
    const ctx = fixtureContext(
      (name) =>
        (...args) =>
          seen.push(`${name}:${args.join(",")}`)
    );
    const screen = example.screens[0];
    const props = (await screen?.fixtures[0].load(ctx)) as { onOpen: (n: string) => void };
    props.onOpen("kran-api-01");
    expect(seen).toEqual(["open:kran-api-01"]);
  });
});

describe("the example app under every pack", () => {
  test("realistic volume: 36 machines, and an empty estate", async () => {
    const full = await render(example, "example/machines", "estate");
    expect(full.match(/<tr/g)?.length).toBe(37);
    const empty = await render(example, "example/machines", "new");
    expect(empty).toContain("No machines yet");
  });

  for (const pack of PACKS) {
    test(`${pack.id}: every fixture renders`, async () => {
      for (const screen of example.screens)
        for (const f of screen.fixtures)
          expect(await render(example, screen.id, f.id, pack)).toContain("Elbhafen");
    });
  }

  test("a pack's skins reach the screen's shell and states: one @hansenexus/ui", async () => {
    const Probe = ({ Base, ...props }: { Base: ComponentType<object> }) => (
      <>
        <Base {...props} />
        <i data-skin-probe="" />
      </>
    );
    const probe = { id: "probe", skins: { shell: Probe, "empty-state": Probe } as Skins };
    const empty = await render(example, "example/machines", "new", probe);
    expect(empty.match(/data-skin-probe/g)?.length).toBe(2);
  });

  test("fachwerk's empty-state skin draws the empty estate", async () => {
    const fachwerk = PACKS.find((p) => p.id === "fachwerk");
    expect(fachwerk?.skins?.["empty-state"]).toBeDefined();
    const plain = await render(example, "example/machines", "new");
    expect(await render(example, "example/machines", "new", fachwerk)).not.toBe(plain);
  });
});

describe("the gallery's import rules", () => {
  const dir = "/x/app/screens";
  const apps: ResolvedApp[] = [
    {
      app: "demo",
      entry: `${dir}/index.ts`,
      aliases: { "@demo/brand": "/x/app/brand" },
      dirs: [dir, "/x/app/brand"],
    },
  ];
  const at = `${dir}/page.tsx`;

  test("a file outside the screen folders is not the rules' business", () => {
    expect(resolveScreenImport("convex/react", "/x/app/convex/api.ts", apps)).toBeNull();
  });

  test("refuses the data layer, frameworks, and relative paths out of the folders", () => {
    for (const spec of ["convex/react", "next/link", "@tanstack/react-router", "lodash"]) {
      const r = resolveScreenImport(spec, at, apps);
      expect(r && "error" in r ? r.error : "").toContain(`imports "${spec}"`);
    }
    const out = resolveScreenImport("../convex/_generated/api", at, apps);
    expect(out && "error" in out ? out.error : "").toContain("outside its screen folders");
  });

  test("the core resolves to the gallery's source, react to the gallery's copy", () => {
    expect(resolveScreenImport("@hansenexus/ui", at, apps)).toEqual({
      path: resolve(REPO, "packages/ui/src/index.ts"),
    });
    expect(resolveScreenImport("@hansenexus/shell", at, apps)).toEqual({
      path: resolve(REPO, "packages/shell/src/index.ts"),
    });
    const react = resolveScreenImport("react", at, apps);
    expect(react && "path" in react ? react.path : "").toContain("node_modules");
  });

  test("an alias, and a relative path inside an alias, resolve", () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "hn-workbench-")));
    mkdirSync(join(tmp, "screens"));
    mkdirSync(join(tmp, "brand"));
    writeFileSync(join(tmp, "brand/index.ts"), "export const mark = 1;");
    writeFileSync(join(tmp, "brand/word.ts"), "export const word = 1;");
    const real: ResolvedApp[] = [
      {
        app: "demo",
        entry: join(tmp, "screens/index.ts"),
        aliases: { "@demo/brand": join(tmp, "brand") },
        dirs: [join(tmp, "screens"), join(tmp, "brand")],
      },
    ];
    const page = join(tmp, "screens/page.tsx");
    expect(resolveScreenImport("@demo/brand", page, real)).toEqual({
      path: join(tmp, "brand/index.ts"),
    });
    expect(resolveScreenImport("@demo/brand/word", page, real)).toEqual({
      path: join(tmp, "brand/word.ts"),
    });
    expect(resolveScreenImport("../brand/word", page, real)).toEqual({
      path: join(tmp, "brand/word.ts"),
    });
  });

  test("the gallery build fails on a screen that imports Convex", async () => {
    const tmp = realpathSync(mkdtempSync(join(tmpdir(), "hn-workbench-")));
    writeFileSync(
      join(tmp, "index.ts"),
      'import { useQuery } from "convex/react";\nexport default { app: "bad", screens: [useQuery] };'
    );
    const { apps: bad, skipped } = resolveApps(
      { apps: { bad: { path: tmp, entry: "index.ts" } } },
      { repo: "/" }
    );
    const entry = join(tmp, "main.ts");
    writeFileSync(entry, 'import { APPS } from "virtual:screens";\nconsole.log(APPS);');
    const out = await Bun.build({
      entrypoints: [entry],
      plugins: [screensPlugin(bad, skipped)],
      throw: false,
    }).catch((e: unknown) => ({ success: false, logs: [String(e)] }));
    expect(out.success).toBe(false);
    expect(out.logs.map(String).join("\n")).toContain('imports "convex/react"');
  });
});

describe("apps.json", () => {
  test("the manifest's in-repo apps resolve; the example is one", () => {
    const { apps, skipped } = resolveApps(readManifest(), { env: {} });
    expect(apps.map((a) => a.app)).toContain("example");
    for (const s of skipped) expect(s.reason).toContain(envKey(s.app));
  });

  test("an app from another repo: skipped without a checkout, read from WORKBENCH_<APP>", () => {
    const manifest: Manifest = {
      apps: { "fach-werk": { repo: "acme/fach-werk", ref: "abc", entry: "s/index.ts" } },
    };
    const none = resolveApps(manifest, { repo: mkdtempSync(join(tmpdir(), "hn-wb-")), env: {} });
    expect(none.apps).toEqual([]);
    expect(none.skipped[0]?.reason).toContain("WORKBENCH_FACH_WERK");
    const local = realpathSync(mkdtempSync(join(tmpdir(), "hn-wb-")));
    mkdirSync(join(local, "s"));
    writeFileSync(join(local, "s/index.ts"), "export default {}");
    const found = resolveApps(manifest, { env: { WORKBENCH_FACH_WERK: local } });
    expect(found.apps[0]?.dirs).toEqual([join(local, "s")]);
    expect(() =>
      resolveApps({ apps: { x: { path: local, entry: "missing.ts" } } }, { repo: "/", env: {} })
    ).toThrow("does not exist");
  });

  test("virtual:screens and screens.css name every app", () => {
    const apps: ResolvedApp[] = [
      { app: "a", entry: "/r/a/index.ts", aliases: {}, dirs: ["/r/a"], css: "/r/a/a.css" },
    ];
    const src = screensSource(apps, [{ app: "b", reason: "no checkout" }]);
    expect(src).toContain('import app0 from "/r/a/index.ts";');
    expect(src).toContain("export const APPS = [app0];");
    expect(src).toContain('"reason":"no checkout"');
    const css = screensCss(apps);
    expect(css.indexOf('@import "/r/a/a.css";')).toBeLessThan(css.indexOf('@source "/r/a";'));
  });
});
