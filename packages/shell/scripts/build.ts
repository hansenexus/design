// Builds dist/: index.js (ESM, dependencies external), index.d.ts and friends, and styles.css
// (the utilities the shell uses, Tailwind v4). @hansenexus/ui must be built first: the
// declarations import its types (the root build runs the workspace in dependency order).
// Run: bun scripts/build.ts
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

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
  // Production JSX runtime, as in @hansenexus/ui (design#27).
  jsx: { runtime: "automatic", development: false },
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error("build: bundling src/index.ts failed");
}
if (/jsx-dev-runtime|jsxDEV/.test(readFileSync(resolve(DIST, "index.js"), "utf8"))) {
  throw new Error("build: dist/index.js uses the development JSX runtime (jsxDEV)");
}

run(["bunx", "tsc", "-p", "tsconfig.build.json"]);
run(["bunx", "@tailwindcss/cli", "-i", "src/styles.css", "-o", "dist/styles.css"]);
console.log("build: dist/index.js, dist/index.d.ts, dist/styles.css");
