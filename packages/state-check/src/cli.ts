// state-check --app <dir> [--baseline <file>] [--json] [--update-baseline] [--auth-helper <name>]…
// Exit 0: no violation beyond the baseline. Exit 1: new violations or an ignore without a reason.
// Exit 2: bad usage or an unreadable baseline.
import { existsSync, realpathSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readBaseline, toBaseline, writeBaseline } from "./baseline";
import { check, type Report } from "./check";

const USAGE = `usage: state-check --app <dir> [--baseline <file>] [--json] [--update-baseline]
                   [--auth-helper <name>]...

  --app <dir>          the Next.js app (holds app/ or src/app/)
  --baseline <file>    allowed violations (default <app>/state-coverage.baseline.json)
  --json               print the report as JSON
  --update-baseline    rewrite the baseline to the current violations
  --auth-helper <name> a call that reads the session, on top of the built-in list (repeatable)`;

type Args = {
  app?: string;
  baseline?: string;
  json: boolean;
  update: boolean;
  authHelpers: string[];
};

function parse(argv: string[]): Args {
  const args: Args = { json: false, update: false, authHelpers: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === "--app") args.app = value();
    else if (a === "--baseline") args.baseline = value();
    else if (a === "--json") args.json = true;
    else if (a === "--update-baseline") args.update = true;
    else if (a === "--auth-helper") args.authHelpers.push(value());
    else if (a === "--help" || a === "-h") {
      console.log(USAGE);
      process.exit(0);
    } else throw new Error(`unknown argument ${a}`);
  }
  return args;
}

function print(report: Report, appDir: string, baselinePath: string): void {
  const at = (file: string, line?: number) =>
    `${relative(process.cwd(), join(appDir, file))}${line ? `:${line}` : ""}`;
  for (const v of report.new) console.error(`FAIL ${at(v.file, v.line)} ${v.rule}: ${v.message}`);
  for (const d of report.invalidIgnores)
    console.error(`FAIL ${at(d.file, d.line)} state-coverage-ignore needs a reason after a colon`);
  for (const s of report.shrink)
    console.log(
      `SHRINK ${at(s.file)} ${s.rule}: baseline allows ${s.allowed}, found ${s.count}; shrink the baseline (state-check --update-baseline)`
    );
  for (const v of report.ignored)
    console.log(`IGNORED ${at(v.file, v.line)} ${v.rule}: ${v.reason}`);
  const s = report.stats;
  const counts = [
    `${s.pages ?? 0} pages`,
    `${s.dynamic ?? 0} dynamic`,
    `${s.covered ?? 0} covered`,
    `${report.baselined.length} baselined`,
    `${report.ignored.length} ignored`,
    `${report.new.length} new`,
  ].join(", ");
  const verdict = report.ok ? "pass" : "FAIL";
  console.log(`state-check: ${counts} (${relative(process.cwd(), baselinePath)}): ${verdict}`);
}

function main(): number {
  let args: Args;
  try {
    args = parse(process.argv.slice(2));
  } catch (e) {
    console.error(`state-check: ${(e as Error).message}\n${USAGE}`);
    return 2;
  }
  if (!args.app) {
    console.error(`state-check: --app is required\n${USAGE}`);
    return 2;
  }
  if (!existsSync(args.app) || !statSync(args.app).isDirectory()) {
    console.error(`state-check: ${args.app} is not a directory`);
    return 2;
  }
  // Real path, so file:line output is relative to the real working directory.
  const appDir = realpathSync(args.app);
  const baselinePath = resolve(args.baseline ?? join(appDir, "state-coverage.baseline.json"));

  let report: Report;
  try {
    const baseline = readBaseline(baselinePath);
    report = check(appDir, baseline, { authHelpers: args.authHelpers });
  } catch (e) {
    console.error(`state-check: ${(e as Error).message}`);
    return 2;
  }

  if (args.update) {
    writeBaseline(baselinePath, toBaseline(report.all));
    console.log(
      `state-check: wrote ${relative(process.cwd(), baselinePath)} (${report.all.length} violation(s))`
    );
    for (const d of report.invalidIgnores)
      console.error(`FAIL ${d.file}:${d.line} state-coverage-ignore needs a reason after a colon`);
    return report.invalidIgnores.length ? 1 : 0;
  }

  if (args.json) {
    const { all: _all, ...rest } = report;
    console.log(JSON.stringify({ app: appDir, baseline: baselinePath, ...rest }, null, 2));
  } else print(report, appDir, baselinePath);
  return report.ok ? 0 : 1;
}

process.exit(main());
