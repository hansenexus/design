// The theme-pack contract on the token side (design#143): packs are discovered from
// themes/<app>/pack.json, override only names the core defines, and every check that covers a
// core theme covers every pack direction too.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../scripts/build";
import { checkAll } from "../scripts/contrast";
import {
  allThemes,
  CORE_THEMES,
  DEFAULT_THEME,
  MODES,
  PACKS_DIR,
  packThemes,
  resolveTokens,
  THEMES,
} from "../scripts/resolve";

type Files = Record<string, unknown>;

/** A scratch themes/ folder: { "acme/pack.json": {...}, "acme/bold/tokens.json": {...} }. */
function packsDir(files: Files): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-packs-"));
  for (const [path, json] of Object.entries(files)) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), JSON.stringify(json));
  }
  return dir;
}

const paths = async (theme: string, mode: (typeof MODES)[number], dir?: string) =>
  (await resolveTokens(theme, mode, undefined, dir)).map((t) => `${t.path}:${t.type}`);

describe("pack discovery", () => {
  test("lexilink is a pack: themes/lexilink/ledger, data-theme lexilink, still bundled", () => {
    const lexilink = packThemes().find((p) => p.app === "lexilink");
    expect(lexilink).toMatchObject({ id: "lexilink", direction: "ledger", isDefault: true });
    expect(lexilink?.dir).toBe(join(PACKS_DIR, "lexilink", "ledger"));
    expect(THEMES).toEqual([...CORE_THEMES, "lexilink"]);
    expect(allThemes()).toEqual(expect.arrayContaining([...THEMES]));
  });

  test("the default direction takes the app's name, another direction <app>-<direction>", () => {
    const dir = packsDir({
      "acme/pack.json": { app: "acme", default: "bold" },
      "acme/bold/tokens.json": {},
      "acme/calm/tokens.json": {},
      "acme/notes/README.json": {},
    });
    expect(packThemes(dir).map((p) => p.id)).toEqual(["acme", "acme-calm"]);
    expect(allThemes(dir)).toEqual([...CORE_THEMES, "acme", "acme-calm"]);
  });

  test("a pack whose default direction has no tokens.json, or whose app is misnamed, fails", () => {
    const missing = packsDir({
      "acme/pack.json": { app: "acme", default: "bold" },
      "acme/calm/tokens.json": {},
    });
    expect(() => packThemes(missing)).toThrow("default direction bold has no tokens.json");
    const misnamed = packsDir({
      "acme/pack.json": { app: "other", default: "bold" },
      "acme/bold/tokens.json": {},
    });
    expect(() => packThemes(misnamed)).toThrow("pack.json names app other");
  });

  test("an unknown theme name fails instead of resolving the defaults", async () => {
    await expect(resolveTokens("nope", "dark")).rejects.toThrow("no core theme or pack direction");
  });
});

describe("pack tokens", () => {
  test("every pack direction resolves exactly the core's token names, both modes", async () => {
    const core = await paths(DEFAULT_THEME, "dark");
    for (const pack of packThemes()) {
      for (const mode of MODES) expect(await paths(pack.id, mode)).toEqual(core);
    }
  });

  test("a pack's palette.json is a primitive: it resolves references and never ships", async () => {
    const dir = packsDir({
      "acme/pack.json": { app: "acme", default: "bold" },
      "acme/bold/palette.json": {
        palette: { acme: { red: { $type: "color", $value: "#aa0000" } } },
      },
      "acme/bold/tokens.json": {
        action: { danger: { $type: "color", $value: "{palette.acme.red}" } },
      },
    });
    const tokens = await resolveTokens("acme", "dark", undefined, dir);
    expect(tokens.find((t) => t.path === "action.danger")?.value).toBe("#aa0000");
    expect(tokens.some((t) => t.path.startsWith("palette."))).toBe(false);
  });

  test("contrast covers every pack direction: a failing pair in a pack fails the check", async () => {
    const dir = packsDir({
      "acme/pack.json": { app: "acme", default: "bold" },
      "acme/bold/tokens.json": {},
      "acme/bold/tokens.light.json": {
        ink: { muted: { $type: "color", $value: "#f0f0f0" } },
      },
    });
    const { failures } = await checkAll(undefined, dir);
    expect(failures.map((f) => `${f.theme}/${f.mode} ${f.fg}`)).toContain("acme/light ink.muted");
    expect(failures.every((f) => f.theme === "acme")).toBe(true);
  });
});

describe("recipes", () => {
  const dist = mkdtempSync(join(tmpdir(), "hn-dist-recipes-"));
  const built = build(undefined, dist);

  test("the defaults are today's look: 1px solid, the one lift, pills, sm boxes, no motif", async () => {
    for (const theme of CORE_THEMES) {
      const t = new Map(
        (await resolveTokens(theme, "dark")).map((x) => [x.path, x.value] as const)
      );
      expect(t.get("border.width")).toBe("1px");
      expect(t.get("border.style")).toBe("solid");
      for (const e of ["raised", "overlay", "panel"])
        expect(t.get(`elevation.${e}`)).toBe(t.get("shadow.lift"));
      expect(t.get("control.box")).toBe(t.get("radius.sm"));
      expect(t.get("control.dot")).toBe(t.get("radius.pill"));
      expect(t.get("control.chip")).toBe(t.get("radius.pill"));
      expect(t.get("control.bar")).toBe("3px");
      for (const m of ["hatch", "brace", "cross"]) expect(t.get(`motif.${m}`)).toBe("none");
    }
  });

  test("shell defaults are the floating panels (design#152): inset, gap, no seam, core active nav", async () => {
    for (const theme of CORE_THEMES) {
      for (const mode of MODES) {
        const t = new Map((await resolveTokens(theme, mode)).map((x) => [x.path, x.value]));
        expect(t.get("shell.inset")).toBe("12px");
        expect(t.get("shell.gap")).toBe("12px");
        expect(t.get("shell.seam")).toBe("0px");
        expect(t.get("shell.rail")).toBe("208px");
        expect(t.get("shell.context")).toBe("288px");
        expect(t.get("shell.nav-row")).toBe("32px");
        expect(t.get("shell.nav-divider")).toBe("0px");
        expect(t.get("shell.radius")).toBe(t.get("radius.lg"));
        expect(t.get("shell.nav-radius")).toBe(t.get("radius.sm"));
        expect(t.get("nav.active")).toBe(t.get("surface.raised"));
        expect(t.get("nav.active-ink")).toBe(t.get("ink.primary"));
        expect(t.get("nav.tab")).toBe(t.get("surface.card"));
        expect(t.get("nav.tab-ink")).toBe(t.get("action.text"));
      }
    }
  });

  test("control shape follows the theme's radius: lexilink's square corners square its boxes", async () => {
    const t = new Map((await resolveTokens("lexilink", "light")).map((x) => [x.path, x.value]));
    expect(t.get("control.box")).toBe("0px");
    expect(t.get("control.dot")).toBe("999px");
  });

  test("tailwind.css: border width and style read the recipe, elevation and control are utilities", async () => {
    await built;
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain("--default-border-width: var(--hn-border-width);");
    expect(tw).toContain("--tw-border-style: var(--hn-border-style);");
    expect(tw).toContain("--shadow-hn-overlay: var(--hn-elevation-overlay);");
    expect(tw).toContain("--radius-hn-control-dot: var(--hn-control-dot);");
    // motif is a background-image value: atoms reach it as bg-(image:--hn-motif-hatch).
    expect(tw).not.toContain("motif");
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    expect(css).toContain("--hn-motif-hatch: none;");
  });
});
