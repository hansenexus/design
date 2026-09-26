import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import ts from "typescript";
import { type Baseline, compare, type Entry } from "./baseline";
import { covering, type Directive, directives } from "./ignore";
import { nextRoute } from "./rules/next-route";
import type { CheckOptions, Rule, RuleContext, Violation } from "./types";

/** Every rule set by id. The route rule is the default; later ones are opt-in. */
export const RULES: Record<string, Rule> = { [nextRoute.id]: nextRoute };
export const DEFAULT_RULES = [nextRoute.id];

const SKIP = new Set(["node_modules", ".next", ".turbo", "dist", "out", "build", "coverage"]);

/** Files under `dir`, relative and POSIX, skipping build output and dot-directories. */
export function listFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name) && !entry.name.startsWith(".")) walk(join(abs, entry.name));
      } else if (entry.isFile()) {
        out.push(relative(dir, join(abs, entry.name)).split(sep).join("/"));
      }
    }
  };
  walk(dir);
  return out.sort();
}

export type Report = {
  ok: boolean;
  rules: string[];
  stats: Record<string, number>;
  /** Violations over the baseline: these fail. */
  new: Violation[];
  /** Violations the baseline still allows. */
  baselined: Violation[];
  /** Files with fewer violations than the baseline allows: shrink it. */
  shrink: Entry[];
  /** Violations suppressed by a reasoned `state-coverage-ignore`. */
  ignored: (Violation & { reason: string })[];
  /** `state-coverage-ignore` without a reason: these fail. */
  invalidIgnores: Directive[];
  /** Every violation before the baseline, after ignores (what `--update-baseline` writes). */
  all: Violation[];
};

export function check(
  appDir: string,
  baseline: Baseline,
  opts: CheckOptions & { rules?: string[] } = {}
): Report {
  const ruleIds = opts.rules ?? DEFAULT_RULES;
  const files = listFiles(appDir);
  const cache = new Map<string, ts.SourceFile>();
  const ctx: RuleContext = {
    appDir,
    files,
    options: opts,
    source(file) {
      const hit = cache.get(file);
      if (hit) return hit;
      const text = readFileSync(join(appDir, file), "utf8");
      // Next allows JSX in .js pages, so everything but .ts parses as TSX.
      const kind = file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
      cache.set(file, sf);
      return sf;
    },
  };

  const raw: Violation[] = [];
  const stats: Record<string, number> = {};
  for (const id of ruleIds) {
    const rule = RULES[id];
    if (!rule) throw new Error(`unknown rule ${id} (known: ${Object.keys(RULES).join(", ")})`);
    const result = rule.check(ctx);
    raw.push(...result.violations);
    for (const [k, n] of Object.entries(result.stats ?? {})) stats[k] = (stats[k] ?? 0) + n;
  }

  // Directives are read from every file a rule parsed.
  const valid: Directive[] = [];
  const invalidIgnores: Directive[] = [];
  for (const [file, sf] of cache) {
    const d = directives(file, sf.text);
    valid.push(...d.valid);
    invalidIgnores.push(...d.invalid);
  }
  const ignored: Report["ignored"] = [];
  const all: Violation[] = [];
  for (const v of raw) {
    const d = covering(valid, v.file, v.line);
    if (d) ignored.push({ ...v, reason: d.reason });
    else all.push(v);
  }

  const { over, under } = compare(all, baseline);
  const overKeys = new Set(over.map((o) => `${o.rule}\0${o.file}`));
  const isNew = (v: Violation) => overKeys.has(`${v.rule}\0${v.file}`);
  return {
    ok: over.length === 0 && invalidIgnores.length === 0,
    rules: ruleIds,
    stats: { ...stats, ignored: ignored.length },
    new: all.filter(isNew),
    baselined: all.filter((v) => !isNew(v)),
    shrink: under,
    ignored,
    invalidIgnores,
    all,
  };
}
