// Raw-palette ratchet. Colour values live in packages/tokens and nowhere else: every other
// file reaches colour through the semantic tier (--hn-*, bg-hn-*). This counts raw colour
// literals per file (hex, rgb()/hsl()/oklch() and friends, Tailwind's own palette
// utilities, {palette.*} references) and fails when a file has more than
// ratchet.baseline.json allows. The baseline only goes down: when a file gets cleaner,
// `--update` lowers it; it never raises a count or adds a file.
// Run: bun scripts/ratchet.ts [--update] [--root <dir>]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";

/** Paths the ratchet never reads, with the reason. */
export const EXEMPT: Record<string, string> = {
  "packages/tokens/": "the token package owns the palette",
  "scripts/ratchet.ts": "the ratchet's own patterns",
  "scripts/ratchet.test.ts": "fixtures that must trip the ratchet",
  "packages/ui/tests/ui.test.tsx": "a probe proving Tailwind's palette cannot compile",
  "bun.lock": "integrity hashes, not colours",
};

const TEXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".svg",
]);

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY =
  "bg|text|border|border-[trblxyse]|ring|ring-offset|outline|fill|stroke|from|via|to|shadow|inset-shadow|drop-shadow|decoration|accent|caret|divide|placeholder";

export const PATTERNS: { name: string; re: RegExp }[] = [
  // #rgb, #rgba, #rrggbb, #rrggbbaa. Not an HTML entity (&#39;), a URL fragment (page#top)
  // or a repo-qualified ref (design#2). In Markdown a digits-only #123 or #2031 is an issue.
  {
    name: "hex",
    re: /(?<![\w&/#])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi,
  },
  { name: "colour function", re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi },
  {
    name: "tailwind palette",
    re: new RegExp(`\\b(?:${UTILITY})-(?:(?:${PALETTE})-\\d{2,3}|black|white)\\b`, "g"),
  },
  { name: "palette reference", re: /\{palette\.|--hn-palette-/g },
];

export type Hit = { file: string; line: number; pattern: string; text: string };

/** In prose a digits-only #123 or #2031 is an issue; in code it may be #000. */
function isIssueRef(file: string, match: string): boolean {
  return extname(file) === ".md" && /^#\d{3,4}$/.test(match);
}

export function scan(file: string, source: string): Hit[] {
  const hits: Hit[] = [];
  source.split("\n").forEach((text, i) => {
    for (const { name, re } of PATTERNS) {
      for (const m of text.matchAll(re)) {
        if (name === "hex" && isIssueRef(file, m[0])) continue;
        hits.push({ file, line: i + 1, pattern: name, text: m[0] });
      }
    }
  });
  return hits;
}

export function isExempt(path: string): boolean {
  return Object.keys(EXEMPT).some((p) => (p.endsWith("/") ? path.startsWith(p) : path === p));
}

/** Tracked and untracked-but-not-ignored files, so a new file is caught before its commit. */
export function listFiles(root: string): string[] {
  const git = Bun.spawnSync(["git", "ls-files", "-co", "--exclude-standard"], { cwd: root });
  if (git.exitCode !== 0) throw new Error(`ratchet: git ls-files failed in ${root}`);
  return git.stdout
    .toString()
    .split("\n")
    .filter((f) => f && TEXT.has(extname(f)) && !isExempt(f) && existsSync(resolve(root, f)));
}

export type Result = {
  counts: Record<string, number>;
  hits: Hit[];
  over: { file: string; count: number; allowed: number }[];
  under: { file: string; count: number; allowed: number }[];
};

export function check(root: string, baseline: Record<string, number>): Result {
  const hits = listFiles(root).flatMap((f) => scan(f, readFileSync(resolve(root, f), "utf8")));
  const counts: Record<string, number> = {};
  for (const h of hits) counts[h.file] = (counts[h.file] ?? 0) + 1;
  const files = new Set([...Object.keys(counts), ...Object.keys(baseline)]);
  const over: Result["over"] = [];
  const under: Result["under"] = [];
  for (const file of [...files].sort()) {
    const count = counts[file] ?? 0;
    const allowed = baseline[file] ?? 0;
    if (count > allowed) over.push({ file, count, allowed });
    else if (count < allowed) under.push({ file, count, allowed });
  }
  return { counts, hits, over, under };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf("--root");
  const root = resolve(rootArg >= 0 ? (args[rootArg + 1] ?? ".") : resolve(import.meta.dir, ".."));
  const baselinePath = resolve(root, "ratchet.baseline.json");
  const baseline: Record<string, number> = existsSync(baselinePath)
    ? JSON.parse(readFileSync(baselinePath, "utf8"))
    : {};
  const { hits, over, under, counts } = check(root, baseline);

  if (args.includes("--update")) {
    if (over.length) {
      console.error("ratchet: --update only lowers the baseline; fix these first:");
      for (const o of over) console.error(`  ${o.file}: ${o.count} (allowed ${o.allowed})`);
      process.exit(1);
    }
    const next = Object.fromEntries(
      Object.entries(counts)
        .filter(([, n]) => n > 0)
        .sort()
    );
    writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`ratchet: baseline now allows ${Object.keys(next).length} file(s)`);
    process.exit(0);
  }

  for (const o of over) {
    console.error(`FAIL ${o.file}: ${o.count} raw colour value(s), baseline allows ${o.allowed}`);
    for (const h of hits.filter((x) => x.file === o.file))
      console.error(`  ${h.file}:${h.line} ${h.pattern} ${h.text}`);
  }
  for (const u of under)
    console.error(
      `STALE ${u.file}: ${u.count} raw colour value(s), baseline allows ${u.allowed}; run bun scripts/ratchet.ts --update`
    );
  if (over.length || under.length) {
    console.error(
      "ratchet: colour outside packages/tokens goes through a semantic token (var(--hn-*), bg-hn-*)"
    );
    process.exit(1);
  }
  const total = Object.values(baseline).reduce((a, b) => a + b, 0);
  console.log(`ratchet: no raw palette values outside packages/tokens (baseline ${total})`);
}
