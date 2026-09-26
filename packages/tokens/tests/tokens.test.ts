import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "../scripts/build";
import { checkAll, ratio } from "../scripts/contrast";
import { TOKENS_DIR } from "../scripts/resolve";

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

  test("a colour token outside every rule fails the CLI", () => {
    const dir = fixture("semantic/color.light.json", (j) => {
      setToken(j, "ink", "faint", "{palette.warm.200}");
    });
    const run = Bun.spawnSync(["bun", CONTRAST, "--tokens", dir]);
    expect(run.exitCode).toBe(1);
    expect(run.stderr.toString()).toContain("ink.faint is not in any contrast rule");
  });
});

describe("build", () => {
  const dist = mkdtempSync(join(tmpdir(), "hn-dist-"));
  const built = build(undefined, dist);

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
    expect(mod.tokens.kommandant.dark.status.crit).toBe("#ff7a66");
    expect(mod.tokens.portal.light.action.text).toBe("#2b7300");
    expect(mod.tokens.kommandant.dark.size.row).toBe("36px");
    expect(mod.density.touch.target).toBe("44px");
    expect(mod.vars.surface.page).toBe("var(--hn-surface-page)");
  });
});
