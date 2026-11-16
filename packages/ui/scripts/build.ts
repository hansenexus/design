// Builds dist/: index.js (ESM, dependencies external), index.d.ts and friends, workbench/index.js
// (the screen-fixture contract, `@hansenexus/ui/workbench`, design#148), chart/index.js (the
// Recharts half of the chart base, `@hansenexus/ui/chart`, design#179), styles.css
// (the utilities the primitives use, Tailwind v4) and r/*.json (the shadcn registry).
// Run: bun scripts/build.ts
import { readFileSync, rmSync } from "node:fs";
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
  entrypoints: [
    resolve(ROOT, "src/index.ts"),
    resolve(ROOT, "src/workbench/index.ts"),
    resolve(ROOT, "src/chart/index.ts"),
  ],
  outdir: DIST,
  target: "browser",
  format: "esm",
  packages: "external",
  sourcemap: "linked",
  // Production JSX runtime (react/jsx-runtime). Bun defaults to react/jsx-dev-runtime unless
  // NODE_ENV=production, and a production React exports jsxDEV as undefined (design#27).
  jsx: { runtime: "automatic", development: false },
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error(
    "build: bundling src/index.ts, src/workbench/index.ts and src/chart/index.ts failed"
  );
}

const core = readFileSync(resolve(DIST, "index.js"), "utf8");
if (/jsx-dev-runtime|jsxDEV/.test(core)) {
  throw new Error("build: dist/index.js uses the development JSX runtime (jsxDEV)");
}
// Apps without charts never load Recharts (design#179): only dist/chart/index.js may import it.
if (/from\s*"recharts"/.test(core)) {
  throw new Error("build: dist/index.js imports recharts; it belongs in src/chart/index.ts");
}

run(["bunx", "tsc", "-p", "tsconfig.build.json"]);
run(["bunx", "@tailwindcss/cli", "-i", "src/styles.css", "-o", "dist/styles.css"]);
const items = await buildRegistry(resolve(DIST, "r"));
console.log(`build: dist/index.js, dist/styles.css, ${items} registry items in dist/r`);
