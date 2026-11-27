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

  // design#243: the mask (control size, padding, type, per-family corners, frame weight) is
  // tokens too. Their defaults are the literals the atoms carried before, in every theme and
  // pack direction but the rund proof, so adopting them changes nothing on screen.
  const MASK_DEFAULTS: Record<string, string> = {
    "size.control-xs": "24px",
    "size.control-sm": "32px",
    "size.control-md": "36px",
    "size.control-lg": "48px",
    "size.control-pad-xs": "8px",
    "size.control-pad-sm": "12px",
    "size.control-pad-md": "14px",
    "size.control-pad-lg": "16px",
    "size.field": "40px",
    "size.field-pad": "12px",
  };
  const TYPE_DEFAULTS: Record<string, [string, string]> = {
    "text.control-xs": ["12px", "16px"],
    "text.control-sm": ["13px", "19.5px"],
    "text.control-md": ["14px", "20px"],
    "text.control-lg": ["15px", "22.5px"],
  };

  test("mask defaults (design#243) are today's literals and radius steps in every theme but rund", async () => {
    const themes = allThemes().filter((t) => t !== "fachwerk-rund");
    expect(themes).toContain("fachwerk");
    for (const theme of themes) {
      for (const mode of MODES) {
        const all = await resolveTokens(theme, mode);
        const t = new Map(all.map((x) => [x.path, x.value]));
        for (const [path, value] of Object.entries(MASK_DEFAULTS)) expect(t.get(path)).toBe(value);
        for (const [path, [size, lh]] of Object.entries(TYPE_DEFAULTS)) {
          const raw = all.find((x) => x.path === path)?.raw;
          expect(raw).toEqual({ fontSize: size, lineHeight: lh, fontWeight: 400 });
        }
        expect(t.get("control.button")).toBe(t.get("radius.md"));
        expect(t.get("control.item")).toBe(t.get("radius.sm"));
        expect(t.get("control.field")).toBe(t.get("radius.md"));
        expect(t.get("control.card")).toBe(t.get("radius.lg"));
        expect(t.get("control.overlay")).toBe(t.get("radius.lg"));
        expect(t.get("control.dialog")).toBe(t.get("radius.xl"));
        expect(t.get("border.frame")).toBe(t.get("border.width"));
      }
    }
  });

  test("every density scale carries the control sizes, so data-density can change them", async () => {
    const { resolveDensities } = await import("../scripts/resolve");
    const densities = await resolveDensities();
    for (const tokens of Object.values(densities)) {
      const t = new Map(tokens.map((x) => [x.path, x.value]));
      for (const [path, value] of Object.entries(MASK_DEFAULTS)) expect(t.get(path)).toBe(value);
    }
  });

  test("fachwerk-rund changes the mask, not the colour: the second preset proves the recipe", async () => {
    for (const mode of MODES) {
      const base = await resolveTokens("fachwerk", mode);
      const rund = new Map((await resolveTokens("fachwerk-rund", mode)).map((x) => [x.path, x]));
      for (const t of base.filter((x) => x.type === "color"))
        expect(rund.get(t.path)?.value).toBe(t.value);
      const v = (path: string) => rund.get(path)?.value;
      expect(v("control.button")).toBe("999px");
      expect(v("control.card")).toBe("18px");
      expect(v("border.width")).toBe("1px");
      expect(v("border.frame")).toBe("2px");
      expect(v("size.control-md")).toBe("40px");
      expect(rund.get("text.control-md")?.raw).toMatchObject({ fontSize: "15px" });
    }
  });

  test("tailwind.css: the mask tokens are utilities (h-hn-control-md, rounded-hn-control-card, text-hn-control-md)", async () => {
    await built;
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain("--spacing-hn-control-md: var(--hn-size-control-md);");
    expect(tw).toContain("--spacing-hn-field-pad: var(--hn-size-field-pad);");
    expect(tw).toContain("--radius-hn-control-card: var(--hn-control-card);");
    expect(tw).toContain(
      "--text-hn-control-md--line-height: var(--hn-text-control-md--line-height);"
    );
    // border.frame is no utility: atoms draw border-(length:--hn-border-frame).
    expect(readFileSync(join(dist, "tokens.css"), "utf8")).toContain("--hn-border-frame: 1px;");
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

  test("scrollbars (design#163): thumb, hover and track in every theme and pack direction, both modes", async () => {
    for (const theme of allThemes()) {
      for (const mode of MODES) {
        const t = new Map((await resolveTokens(theme, mode)).map((x) => [x.path, x.value]));
        for (const key of ["thumb", "thumb-hover", "track"])
          expect(t.get(`scrollbar.${key}`), `${theme}/${mode} scrollbar.${key}`).toBeString();
        expect(["thin", "auto"]).toContain(t.get("scrollbar.width") ?? "");
        expect(t.get("scrollbar.size")).toMatch(/^\d+px$/);
        // The pointer has to show: hover is never the resting thumb.
        expect(t.get("scrollbar.thumb-hover"), `${theme}/${mode}`).not.toBe(
          t.get("scrollbar.thumb")
        );
      }
    }
  });

  test("tailwind.css: native bars read the scrollbar tokens, with an opt-out and a webkit fallback", async () => {
    await built;
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain("scrollbar-color: var(--hn-scrollbar-thumb) var(--hn-scrollbar-track);");
    expect(tw).toContain("scrollbar-width: var(--hn-scrollbar-width);");
    expect(tw).toContain('[data-scrollbar="native"] *');
    expect(tw).toContain("@utility scrollbar-native {");
    expect(tw).toContain("@supports not (scrollbar-color: auto) {");
    expect(tw).toContain("background-color: var(--hn-scrollbar-thumb-hover);");
    expect(tw).toContain("--color-hn-scrollbar-thumb: var(--hn-scrollbar-thumb);");
  });
});
