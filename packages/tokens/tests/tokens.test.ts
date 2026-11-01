import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "../scripts/build";
import { checkAll, ratio, TERMINAL } from "../scripts/contrast";
import { MODES, resolveTokens, THEMES, TOKENS_DIR } from "../scripts/resolve";
import { generateSwift, SWIFT_OUT } from "../scripts/swift";

const CONTRAST = resolve(import.meta.dir, "../scripts/contrast.ts");

/** A scratch copy of tokens/ with one semantic value rewritten. */
type Json = Record<string, Record<string, { $value: string }>>;

function fixture(file: string, edit: (json: Json) => void): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-tokens-"));
  cpSync(TOKENS_DIR, dir, { recursive: true });
  const path = join(dir, file);
  const json = JSON.parse(readFileSync(path, "utf8")) as Json;
  edit(json);
  writeFileSync(path, JSON.stringify(json));
  return dir;
}

function setToken(json: Json, group: string, key: string, value: string) {
  const g = json[group];
  if (!g) throw new Error(`fixture: no group ${group}`);
  g[key] = { ...g[key], $value: value };
}

describe("contrast", () => {
  test("ratio matches WCAG reference values", () => {
    expect(ratio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(ratio("#f4f0e6", "#16140f")).toBeCloseTo(16.17, 2);
  });

  test("every semantic pair in every theme and mode meets AA", async () => {
    const { results, errors, failures } = await checkAll();
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
    expect(new Set(results.map((r) => r.mode))).toEqual(new Set(["dark", "light"]));
  });

  test("a text pair under 4.5:1 fails the CLI", () => {
    // The pre-fix value: warm.600 as a dark-mode label colour is 3.4:1 on Grund.
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "ink", "muted", "{palette.warm.600}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("FAIL hansenexus/dark text: ink.muted on surface.page");
  });

  test("a UI pair under 3:1 fails the CLI", () => {
    // The board's dark Rand stark #6b6456 is 2.57:1 on Erhöht.
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "line", "strong", "{palette.warm.600}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("ui: line.strong on surface.raised");
  });

  test("skeleton pairs are checked on every surface, both modes", async () => {
    const { results } = await checkAll();
    const skeleton = results.filter((r) => r.kind === "placeholder");
    expect(new Set(skeleton.map((r) => r.fg))).toEqual(
      new Set(["skeleton.base", "skeleton.highlight"])
    );
    expect(new Set(skeleton.map((r) => r.bg)).size).toBe(4);
    expect(new Set(skeleton.map((r) => r.mode))).toEqual(new Set(["dark", "light"]));
  });

  test("a skeleton that vanishes into its surface fails the CLI", () => {
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "skeleton", "base", "{palette.warm.750}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("placeholder: skeleton.base on surface.raised");
  });

  test("all 16 terminal colours are text pairs on surface.page and surface.card, every theme, both modes", async () => {
    const { results } = await checkAll();
    const terminal = results.filter((r) => r.fg.startsWith("terminal."));
    expect(new Set(terminal.map((r) => r.fg))).toEqual(new Set(TERMINAL));
    expect(TERMINAL).toHaveLength(16);
    expect(new Set(terminal.map((r) => r.bg))).toEqual(new Set(["surface.page", "surface.card"]));
    expect(new Set(terminal.map((r) => r.kind))).toEqual(new Set(["text"]));
    expect(terminal).toHaveLength(16 * 2 * THEMES.length * 2);
    expect(terminal.every((r) => r.ratio >= 4.5)).toBe(true);
  });

  test("a terminal colour under 4.5:1 on surface.page fails the CLI", () => {
    // warm.600 is the usual ANSI bright-black grey, and 3.14:1 on the dark Grund.
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "terminal", "bright-black", "{palette.warm.600}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("text: terminal.bright-black on surface.page");
  });

  test("a terminal colour under 4.5:1 on surface.card fails the CLI", () => {
    // warm.500 clears the dark Grund (4.9:1) but not the card a panel terminal draws on (4.4:1).
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "terminal", "black", "{palette.warm.500}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    const stderr = run.stderr.toString();
    expect(stderr).toContain("text: terminal.black on surface.card");
    expect(stderr).not.toContain("text: terminal.black on surface.page");
  });

  test("a colour token outside every rule fails the CLI", () => {
    const dir = fixture("semantic/color.light.json", (j) => {
      setToken(j, "ink", "faint", "{palette.warm.200}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("ink.faint is not in any contrast rule");
  });
});

const dist = mkdtempSync(join(tmpdir(), "hn-dist-"));
const built = build(undefined, dist);

describe("build", () => {
  test("tokens.css ships both modes and every density, semantics only", async () => {
    await built;
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    expect(css).toContain('[data-mode="light"]');
    expect(css).toMatch(/:root,\n\[data-mode="dark"\]/);
    expect(css).toContain("--hn-surface-page: #16140f;");
    expect(css).toContain("--hn-action-text: #2b7300;");
    for (const d of ["compact", "comfortable", "touch"])
      expect(css).toContain(`[data-density="${d}"]`);
    expect(css).toContain('[data-theme="kommandant"]');
    // Primitives never leave the package as variables.
    expect(css).not.toMatch(/--hn-(palette|density)-/);
  });

  test("tailwind.css maps every colour into @theme", async () => {
    await built;
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain('@import "./tokens.css";');
    expect(tw).toContain("@theme inline {");
    expect(tw).toContain("--color-hn-status-crit: var(--hn-status-crit);");
    expect(tw).toContain("--spacing-hn-row: var(--hn-size-row);");
  });

  test("TS constants carry resolved values per theme and mode", async () => {
    await built;
    const mod = await import(join(dist, "index.js"));
    expect(mod.tokens.kommandant.dark.status.crit).toBe("#ff6b5e");
    expect(mod.tokens.hansenexus.dark.status.crit).toBe("#ff7a66");
    expect(mod.tokens.portal.light.action.text).toBe("#2b7300");
    expect(mod.tokens.kommandant.dark.size.row).toBe("36px");
    expect(mod.density.touch.target).toBe("44px");
    expect(mod.vars.surface.page).toBe("var(--hn-surface-page)");
  });

  test("lexilink carries B2 Ledger per mode, radius and fonts shared across modes", async () => {
    await built;
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    const shared = css.slice(css.indexOf('[data-theme="lexilink"] {'));
    expect(shared).toContain("--hn-radius-md: 0px;");
    expect(shared).toContain("--hn-font-sans: Archivo, system-ui, sans-serif;");
    expect(css).toContain('[data-theme="lexilink"][data-mode="light"]');
    const mod = await import(join(dist, "index.js"));
    expect(mod.themes).toContain("lexilink");
    const { light, dark } = mod.tokens.lexilink;
    expect(light.surface.page).toBe("#ffffff");
    expect(dark.surface.page).toBe("#1c1712");
    expect(dark.surface.band).toBe("#130f0a");
    for (const m of [light, dark]) {
      expect(m.action.primary).toBe("#f3821d");
      expect(m.action["primary-ink"]).toBe("#070707");
      expect(m.radius.pill).toBe("999px");
      expect(m.font.mono).toBe("'Geist Mono', ui-monospace, monospace");
    }
    // Every other theme keeps the shared set.
    expect(mod.tokens.hansenexus.light.radius.md).toBe("10px");
    expect(mod.tokens.portal.light.surface.page).toBe("#f4f0e6");
  });

  test("terminal tokens reach CSS, Tailwind and TS in both modes", async () => {
    await built;
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    expect(css).toContain("--hn-terminal-magenta: #d59cc8;");
    expect(css).toContain("--hn-terminal-cyan: #356e71;");
    expect(css).toContain("--hn-terminal-bright-white: #f4f0e6;");
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain("--color-hn-terminal-magenta: var(--hn-terminal-magenta);");
    const mod = await import(join(dist, "index.js"));
    expect(mod.tokens.kommandant.dark.terminal.magenta).toBe("#d59cc8");
    expect(mod.tokens.kommandant.dark.terminal.cyan).toBe("#7abfc3");
    expect(mod.tokens.kommandant.light.terminal.magenta).toBe("#834f78");
    expect(mod.tokens.kommandant.light.terminal.cyan).toBe("#356e71");
    // Green is lime, the one accent, and the aliases follow their semantic twins.
    expect(mod.tokens.kommandant.dark.terminal.green).toBe(mod.tokens.kommandant.dark.status.ok);
    expect(mod.tokens.kommandant.light.terminal.red).toBe(mod.tokens.kommandant.light.status.crit);
    expect(mod.vars.terminal["bright-black"]).toBe("var(--hn-terminal-bright-black)");
  });

  test("motion tokens reach CSS, Tailwind and TS", async () => {
    await built;
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    expect(css).toContain("--hn-delay-pending: 200ms;");
    expect(css).toContain("--hn-min-visible-pending: 400ms;");
    expect(css).toContain("--hn-pulse-easing: cubic-bezier(0.4, 0, 0.6, 1);");
    expect(css).toContain("--hn-skeleton-base: #3a352c;");
    const tw = readFileSync(join(dist, "tailwind.css"), "utf8");
    expect(tw).toContain("--ease-hn-pulse: var(--hn-pulse-easing);");
    expect(tw).toContain("--animate-hn-pulse: hn-pulse var(--hn-pulse-duration)");
    expect(tw).toContain("@keyframes hn-spin");
    // motion-reduce: and motion-safe: also follow data-reduced-motion, outside @theme (#91).
    const variants = tw.slice(tw.lastIndexOf("}\n\n@custom-variant"));
    expect(variants).toContain("@custom-variant motion-reduce {");
    expect(variants).toContain("@media (prefers-reduced-motion: reduce) {");
    expect(variants).toContain("&:where([data-reduced-motion], [data-reduced-motion] *) {");
    expect(variants).toContain("@custom-variant motion-safe {");
    expect(variants).toContain("&:not(:where([data-reduced-motion], [data-reduced-motion] *)) {");
    const mod = await import(join(dist, "index.js"));
    expect(mod.ms.delay.pending).toBe(200);
    expect(mod.ms["min-visible"].pending).toBe(400);
    expect(mod.tokens.hansenexus.light.skeleton.highlight).toBe("#cdc6b6");
  });
});

describe("kommandant Leitstand", () => {
  test("line.subtle on surface.card is 1.3:1 and action.text on surface.page 4.5:1, both modes", async () => {
    for (const mode of MODES) {
      const v = new Map(
        (await resolveTokens("kommandant", mode)).map((t) => [t.path, t.value] as const)
      );
      const pair = (fg: string, bg: string) => ratio(v.get(fg) ?? "", v.get(bg) ?? "");
      expect(pair("line.subtle", "surface.card")).toBeGreaterThanOrEqual(1.3);
      expect(pair("action.text", "surface.page")).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("a divider under 1.3:1 on surface.card fails the CLI", () => {
    // Variant A's starting value #2f2b21 is 1.25:1 on the Leitstand card.
    const dir = fixture("themes/kommandant.dark.json", (j) => {
      setToken(j, "line", "subtle", "#2f2b21");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain(
      "FAIL kommandant/dark divider: line.subtle on surface.card"
    );
  });

  test("dark surfaces are the ink set, the rail is the same in both modes", async () => {
    await built;
    const mod = await import(join(dist, "index.js"));
    const { dark, light } = mod.tokens.kommandant;
    expect(dark.surface).toMatchObject({
      page: "#121109",
      card: "#1b1912",
      raised: "#262218",
      band: "#1f1c14",
    });
    expect(light.surface.page).toBe(mod.tokens.hansenexus.light.surface.page);
    expect(dark.surface.rail).toBe("#1f1c14");
    expect(light.surface.rail).toBe(dark.surface.rail);
    expect(light.rail).toEqual(dark.rail);
    // The rail's status shapes are the dark status set, whatever the mode.
    for (const s of ["ok", "busy", "warn", "crit"]) {
      expect(light.rail[`status-${s}`]).toBe(dark.status[s]);
    }
    expect(dark.surface.tint).toBe("#1f2a12");
    expect(dark.status.off).toBe("#7a7262");
    expect(dark.action["text-hover"]).toBe("#b0ed92");
    expect(dark.action["text-hover"]).not.toBe(dark.action.text);
    const css = readFileSync(join(dist, "tokens.css"), "utf8");
    expect(blocks(css).get('[data-theme="kommandant"]')).toContain("--hn-surface-rail: #1f1c14;");
  });

  test("font.display is the sans stack and Fraunces is not in any kommandant block", async () => {
    await built;
    const mod = await import(join(dist, "index.js"));
    for (const mode of MODES) {
      const font = mod.tokens.kommandant[mode].font;
      expect(font.display).toBe(font.sans);
    }
    expect(mod.tokens.hansenexus.dark.font.display).toContain("Fraunces");
    for (const [selector, body] of blocks(readFileSync(join(dist, "tokens.css"), "utf8"))) {
      if (selector.includes("kommandant")) expect(body).not.toContain("Fraunces");
    }
  });

  test("the kommandant theme files change no block outside the kommandant selectors", async () => {
    // Without the theme's own files every block outside kommandant must come out the same.
    const dir = mkdtempSync(join(tmpdir(), "hn-tokens-"));
    cpSync(TOKENS_DIR, dir, { recursive: true });
    rmSync(join(dir, "themes/kommandant.dark.json"));
    writeFileSync(join(dir, "themes/kommandant.json"), "{}");
    const bare = mkdtempSync(join(tmpdir(), "hn-dist-"));
    await Promise.all([built, build(dir, bare)]);
    const outside = (css: string) =>
      [...blocks(css)].filter(([selector]) => !selector.includes("kommandant"));
    expect(outside(readFileSync(join(dist, "tokens.css"), "utf8"))).toEqual(
      outside(readFileSync(join(bare, "tokens.css"), "utf8"))
    );
  });
});

describe("swift", () => {
  test("the committed Tokens.swift matches the generator (snapshot)", async () => {
    // Stale after a token change: run `bun run swift` and commit the result.
    expect(readFileSync(SWIFT_OUT, "utf8")).toBe(await generateSwift());
  });

  test("Tokens.swift carries every semantic token and no primitive", async () => {
    const swift = await generateSwift();
    expect(swift).toContain("static let kommandantDark = HNColors(");
    expect(swift).toContain("page: HNRGBA(0x16140F)");
    expect(swift).toContain("case .touch: return HNSize(row: 56, target: 44)");
    expect(swift).toContain("public static let s4: Double = 16");
    expect(swift).toContain("public let terminal: Terminal");
    expect(swift).toContain("brightMagenta: HNRGBA(0xEFC0E3)");
    expect(swift).toContain('public static let mono: [String] = ["JetBrains Mono"');
    expect(swift).toContain("static let lexilinkLight = HNColors(");
    expect(swift).toContain("public static func of(_ theme: HNTheme) -> HNRadius {");
    expect(swift).toContain("HNShadowValue(color: HNRGBA(0x000000, alpha: 0xB3), x: 0, y: 30");
    expect(swift).not.toMatch(/palette\.[a-z]|density\.[a-z]|Material/);
    const colors = (
      await build(undefined, mkdtempSync(join(tmpdir(), "hn-dist-")))
    ).kommandant.light.filter((t) => t.type === "color");
    for (const t of colors) expect(swift).toContain(`public let ${camel(t.path)}: HNRGBA`);
  });

  test("a token change shows up in the Swift output", async () => {
    const dir = fixture("semantic/color.dark.json", (j) => {
      setToken(j, "status", "crit", "#ff0000");
    });
    const swift = await generateSwift(dir);
    expect(swift).toContain("crit: HNRGBA(0xFF0000)");
    expect(swift).not.toBe(readFileSync(SWIFT_OUT, "utf8"));
  });

  test("a value Swift cannot express fails the generator", async () => {
    const dir = fixture("semantic/scale.json", (j) => {
      setToken(j, "space", "4", "1rem");
    });
    await expect(generateSwift(dir)).rejects.toThrow("space.4 (dimension) is not a px dimension");
  });
});

/** CSS rule blocks of tokens.css, selector to declarations. */
function blocks(css: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(/([^{}]+?)\s*\{([^{}]*)\}/g)) {
    out.set((m[1] ?? "").replace(/\/\*.*?\*\//gs, "").trim(), m[2] ?? "");
  }
  return out;
}

/** "action.primary-hover" -> "primaryHover", the Swift property name. */
function camel(path: string): string {
  const leaf = path.split(".").pop() ?? "";
  return leaf.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
