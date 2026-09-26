// The per-app baseline (`state-coverage.baseline.json`): how many violations of each rule a file
// may still have. A file over its count fails; a file under it passes and asks for the baseline to
// shrink. Counts, not lines, so an unrelated edit that moves a page's export does not fail CI.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Violation } from "./types";

export type Baseline = {
  version: 1;
  /** rule id → app-relative file → allowed count */
  violations: Record<string, Record<string, number>>;
};

export function emptyBaseline(): Baseline {
  return { version: 1, violations: {} };
}

/** A missing file is an empty baseline: every violation is new. */
export function readBaseline(path: string): Baseline {
  if (!existsSync(path)) return emptyBaseline();
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("version" in raw) ||
    raw.version !== 1 ||
    !("violations" in raw) ||
    typeof raw.violations !== "object" ||
    raw.violations === null
  )
    throw new Error(
      `${path}: not a state-check baseline (expected {"version": 1, "violations": {…}})`
    );
  const violations: Baseline["violations"] = {};
  for (const [rule, files] of Object.entries(raw.violations)) {
    if (typeof files !== "object" || files === null) throw new Error(`${path}: bad entry ${rule}`);
    violations[rule] = {};
    for (const [file, n] of Object.entries(files)) {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0)
        throw new Error(`${path}: ${rule} → ${file} must be a count`);
      violations[rule][file] = n;
    }
  }
  return { version: 1, violations };
}

export function toBaseline(violations: Violation[]): Baseline {
  const out: Baseline["violations"] = {};
  const sorted = [...violations].sort(
    (a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file)
  );
  for (const v of sorted) {
    out[v.rule] ??= {};
    const files = out[v.rule] ?? {};
    files[v.file] = (files[v.file] ?? 0) + 1;
  }
  return { version: 1, violations: out };
}

export function writeBaseline(path: string, baseline: Baseline): void {
  writeFileSync(path, `${JSON.stringify(baseline, null, 2)}\n`);
}

export type Entry = { rule: string; file: string; count: number; allowed: number };

/** Files over their allowance (new violations) and under it (the baseline should shrink). */
export function compare(
  violations: Violation[],
  baseline: Baseline
): { over: Entry[]; under: Entry[] } {
  const found = toBaseline(violations).violations;
  const keys = new Set<string>();
  for (const src of [found, baseline.violations])
    for (const [rule, files] of Object.entries(src))
      for (const file of Object.keys(files)) keys.add(JSON.stringify([rule, file]));
  const over: Entry[] = [];
  const under: Entry[] = [];
  for (const key of [...keys].sort()) {
    const [rule, file] = JSON.parse(key) as [string, string];
    const count = found[rule]?.[file] ?? 0;
    const allowed = baseline.violations[rule]?.[file] ?? 0;
    if (count > allowed) over.push({ rule, file, count, allowed });
    else if (count < allowed) under.push({ rule, file, count, allowed });
  }
  return { over, under };
}
