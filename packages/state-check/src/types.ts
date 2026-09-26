import type ts from "typescript";

/** One place where the state contract is not met. `file` is relative to the app, POSIX. */
export type Violation = {
  rule: string;
  file: string;
  line: number;
  message: string;
};

export type CheckOptions = {
  /** Extra call names that read the request (auth helpers). Added to the defaults. */
  authHelpers?: string[];
};

/** What a rule sees: the app's files and a parsed-source cache shared across rules. */
export type RuleContext = {
  /** Absolute path of the app (the `--app` directory). */
  appDir: string;
  /** Every file under the app, relative to `appDir`, POSIX, sorted. */
  files: string[];
  /** Parses a file (relative to `appDir`) once; later rules reuse the tree. */
  source(file: string): ts.SourceFile;
  options: CheckOptions;
};

/**
 * A rule set. The route rule is on by default; later rule sets (Convex queries, pending actions)
 * plug in here as opt-ins. A rule reports that a state is missing, never which library should
 * render it.
 */
export type Rule = {
  id: string;
  description: string;
  check(ctx: RuleContext): RuleResult;
};

/** Violations plus counts for the report (e.g. pages seen, dynamic pages, covered pages). */
export type RuleResult = { violations: Violation[]; stats?: Record<string, number> };
