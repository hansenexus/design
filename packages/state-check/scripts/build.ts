// Builds dist/: index.js (the library) and cli.js (the `state-check` bin), both ESM for Node
// with typescript external, plus index.d.ts and friends.
// Run: bun scripts/build.ts
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");

rmSync(DIST, { recursive: true, force: true });

const js = await Bun.build({
  entrypoints: [resolve(ROOT, "src/index.ts"), resolve(ROOT, "src/cli.ts")],
  outdir: DIST,
  target: "node",
  format: "esm",
  packages: "external",
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error("build: bundling failed");
}

// The bin runs under plain Node, whatever runtime the consuming repo uses.
const cli = resolve(DIST, "cli.js");
const body = readFileSync(cli, "utf8").replace(/^#!.*\n/, "");
writeFileSync(cli, `#!/usr/bin/env node\n${body}`);
chmodSync(cli, 0o755);

const tsc = Bun.spawnSync(["bunx", "tsc", "-p", "tsconfig.build.json"], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
});
if (tsc.exitCode !== 0) throw new Error(`build: tsc exited ${tsc.exitCode}`);
console.log("build: dist/index.js, dist/cli.js, dist/*.d.ts");
