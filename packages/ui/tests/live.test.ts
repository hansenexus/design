import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  extractLive,
  LIVE_SUFFIX,
  liveCss,
  liveIds,
  liveModule,
  livePlugin,
} from "../scripts/live";

// The live copy of the theme packs (design#149): main's themes/ under `<id>@live`, so a
// theme-pack branch compares the candidate with what ships.

const tmp = () => realpathSync(mkdtempSync(join(tmpdir(), "design-live-")));

describe("live packs (design#149)", () => {
  test("liveIds moves every data-theme block to its live id, and nothing else", () => {
    const css = `[data-theme="fachwerk"] { --a: 1; }\n[data-theme="fachwerk"][data-mode="light"] { --a: 2; }\n:root { --b: 3; }`;
    expect(liveIds(css)).toBe(
      `[data-theme="fachwerk@live"] { --a: 1; }\n[data-theme="fachwerk@live"][data-mode="light"] { --a: 2; }\n:root { --b: 3; }`
    );
  });

  test("extractLive takes a ref's themes/ out of git, and refuses a ref that is not there", () => {
    const dir = join(tmp(), "_live");
    const source = extractLive("HEAD", dir);
    expect(source?.extracted).toBe(true);
    expect(source?.label).toMatch(/^HEAD [0-9a-f]{7,}$/);
    expect(source?.themes).toBe(join(dir, "themes"));
    expect(existsSync(join(dir, "themes/fachwerk/index.ts"))).toBe(true);
    expect(readFileSync(join(dir, "SOURCE"), "utf8").trim()).toBe(source?.label ?? "");
    expect(extractLive("refs/heads/no-such-branch-design-149", join(tmp(), "_live"))).toBeNull();
  });

  test("the live css holds every pack direction under its live id, and the skins' source", async () => {
    const source = extractLive("HEAD", join(tmp(), "_live"));
    if (!source) throw new Error("no git");
    const css = await liveCss(source);
    expect(css).toContain(`@source ${JSON.stringify(source.themes)};`);
    for (const id of ["fachwerk", "lexilink"]) {
      expect(css).toContain(`[data-theme="${id}${LIVE_SUFFIX}"]`);
      expect(css).not.toContain(`[data-theme="${id}"]`);
    }
  });

  test("virtual:live-packs re-ids every direction and names its source", () => {
    const source = extractLive("HEAD", join(tmp(), "_live"));
    if (!source) throw new Error("no git");
    const mod = liveModule(source);
    expect(mod).toContain(JSON.stringify(join(source.themes, "fachwerk/index.ts")));
    expect(mod).toContain(JSON.stringify(join(source.themes, "lexilink/index.ts")));
    expect(mod).toContain(`id: p.id + "@live"`);
    expect(mod).toContain(`export const LIVE_SOURCE = ${JSON.stringify(source.label)};`);
  });

  test("the extracted packs bundle against the gallery's core copies", async () => {
    const source = extractLive("HEAD", join(tmp(), "_live"));
    if (!source) throw new Error("no git");
    const entry = join(tmp(), "entry.ts");
    writeFileSync(
      entry,
      `import { LIVE_PACKS } from "virtual:live-packs";\nexport const ids = LIVE_PACKS.map((p) => p.id);\n`
    );
    const out = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      plugins: [livePlugin(source)],
    });
    expect(out.success).toBe(true);
    const js = (await out.outputs[0]?.text()) ?? "";
    expect(js).toContain("@live");
  });

  test("an extracted pack may import only core packages", async () => {
    const root = tmp();
    const themes = join(root, "themes");
    mkdirSync(join(themes, "rogue"), { recursive: true });
    writeFileSync(
      join(themes, "rogue/index.ts"),
      `import pad from "left-pad";\nexport const directions = [{ id: "rogue", pad }];\n`
    );
    const entry = join(root, "entry.ts");
    writeFileSync(entry, `export { LIVE_PACKS } from "virtual:live-packs";\n`);
    const out = await Bun.build({
      entrypoints: [entry],
      target: "browser",
      plugins: [livePlugin({ themes, label: "test", extracted: true })],
      throw: false,
    }).catch((e: unknown) => ({ success: false, logs: [String(e)] }));
    expect(out.success).toBe(false);
    expect(out.logs.map(String).join("\n")).toContain('imports "left-pad", not a core package');
  });

  test("the gallery imports live.css after the packs", () => {
    const css = readFileSync(resolve(import.meta.dir, "../gallery/gallery.css"), "utf8");
    expect(css.indexOf('@import "./dist/live.css";')).toBeGreaterThan(
      css.indexOf('@import "./dist/packs.css";')
    );
  });
});
