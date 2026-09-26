// Fixture apps are written to a scratch directory per test, so the fake app code never meets the
// repo's lint, typecheck or raw-palette ratchet.
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const CLI = resolve(import.meta.dir, "../src/cli.ts");

export function app(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "hn-state-check-"));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

export function run(dir: string, ...args: string[]) {
  const p = Bun.spawnSync(["bun", CLI, "--app", dir, ...args], { cwd: dir });
  return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() };
}
