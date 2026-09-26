// Builds dist/: index.js (ESM, dependencies external), index.d.ts and friends, styles.css
// (the utilities the primitives use, Tailwind v4) and r/*.json (the shadcn registry).
// Run: bun scripts/build.ts
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { buildRegistry } from "./registry";

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");

function run(cmd: string[]) {
  const proc = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (proc.exitCode !== 0) throw new Error(`build: ${cmd.join(" ")} exited ${proc.exitCode}`);
}

rmSync(DIST, { recursive: true, force: true });

const js = await Bun.build({
  entrypoints: [resolve(ROOT, "src/index.ts")],
  outdir: DIST,
  target: "browser",
  format: "esm",
  packages: "external",
  sourcemap: "linked",
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error("build: bundling src/index.ts failed");
}

run(["bunx", "tsc", "-p", "tsconfig.build.json"]);
run(["bunx", "@tailwindcss/cli", "-i", "src/styles.css", "-o", "dist/styles.css"]);
const items = await buildRegistry(resolve(DIST, "r"));
console.log(`build: dist/index.js, dist/styles.css, ${items} registry items in dist/r`);
