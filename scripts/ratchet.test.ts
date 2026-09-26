import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { scan } from "./ratchet";

const RATCHET = resolve(import.meta.dir, "ratchet.ts");

/** A scratch git repo holding `files`, with an optional baseline. */
function repo(files: Record<string, string>, baseline?: Record<string, number>): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-ratchet-"));
  Bun.spawnSync(["git", "init", "-q"], { cwd: dir });
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  if (baseline) writeFileSync(join(dir, "ratchet.baseline.json"), JSON.stringify(baseline));
  return dir;
}

function run(dir: string, ...args: string[]) {
  const p = Bun.spawnSync(["bun", RATCHET, "--root", dir, ...args]);
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}

const kinds = (src: string) => scan("x.tsx", src).map((h) => `${h.pattern}:${h.text}`);

describe("scan", () => {
  test("finds raw colours in every spelling", () => {
    expect(kinds("color: #42c501; background: #fff; border-color: #000000b3;")).toEqual([
      "hex:#42c501",
      "hex:#fff",
      "hex:#000000b3",
    ]);
    expect(kinds("color: rgb(0 0 0); fill: oklch(0.7 0.2 140); x: hsla(1, 2%, 3%, 1)")).toEqual([
      "colour function:rgb(",
      "colour function:oklch(",
      "colour function:hsla(",
    ]);
    expect(
      kinds('className="bg-red-500 text-white border-t-slate-200 hover:bg-lime-300/50"')
    ).toEqual([
      "tailwind palette:bg-red-500",
      "tailwind palette:text-white",
      "tailwind palette:border-t-slate-200",
      "tailwind palette:bg-lime-300",
    ]);
    expect(kinds('{ "$value": "{palette.warm.900}" } var(--hn-palette-lime)')).toEqual([
      "palette reference:{palette.",
      "palette reference:--hn-palette-",
    ]);
  });

  test("leaves semantic tokens, entities, fragments and repo refs alone", () => {
    expect(
      kinds(
        'bg-hn-surface-card text-hn-status-crit var(--hn-ink-muted) &#39; href="#top" url(a.svg#icon) hansenexus/design#2 color-mix(in srgb, var(--hn-surface-page) 70%, transparent)'
      )
    ).toEqual([]);
  });

  test("a digits-only #123 is an issue in Markdown and a colour in code", () => {
    expect(scan("README.md", "Closes #2031, see #412.")).toEqual([]);
    expect(kinds("color: #000; border: #1234;")).toEqual(["hex:#000", "hex:#1234"]);
  });
});

describe("cli", () => {
  test("passes a clean tree", () => {
    const dir = repo({ "a.tsx": '<div className="bg-hn-surface-page" />' }, {});
    const r = run(dir);
    expect(r.code).toBe(0);
    expect(r.out).toContain("no raw palette values");
  });

  test("fails a new raw value and names file, line and match", () => {
    const dir = repo({ "src/a.tsx": 'const x = 1;\n<div style={{ color: "#ff7a66" }} />' }, {});
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.err).toContain("FAIL src/a.tsx: 1 raw colour value(s), baseline allows 0");
    expect(r.err).toContain("src/a.tsx:2 hex #ff7a66");
  });

  test("fails a file that grows past its baseline, allows it at the baseline", () => {
    const files = { "a.css": "a { color: #111; }\nb { color: #222; }\n" };
    expect(run(repo(files, { "a.css": 2 })).code).toBe(0);
    expect(run(repo(files, { "a.css": 1 })).code).toBe(1);
  });

  test("a stale baseline fails until --update lowers it", () => {
    const dir = repo({ "a.css": "a { color: #111; }\n" }, { "a.css": 3, "gone.css": 1 });
    const r = run(dir);
    expect(r.code).toBe(1);
    expect(r.err).toContain("STALE a.css: 1 raw colour value(s), baseline allows 3");
    expect(run(dir, "--update").code).toBe(0);
    expect(JSON.parse(readFileSync(join(dir, "ratchet.baseline.json"), "utf8"))).toEqual({
      "a.css": 1,
    });
    expect(run(dir).code).toBe(0);
  });

  test("--update refuses to raise the baseline", () => {
    const dir = repo({ "a.css": "a { color: #111; }\n" }, {});
    expect(run(dir, "--update").code).toBe(1);
    expect(JSON.parse(readFileSync(join(dir, "ratchet.baseline.json"), "utf8"))).toEqual({});
  });

  test("the token package and ignored files are out of scope", () => {
    const dir = repo(
      {
        "packages/tokens/tokens/primitives/color.json": '{ "$value": "#42c501" }',
        "packages/tokens/README.md": "Lime `#42c501`",
        ".gitignore": "dist/\n",
        "dist/out.css": "a { color: #fff; }",
      },
      {}
    );
    expect(run(dir).code).toBe(0);
  });
});
