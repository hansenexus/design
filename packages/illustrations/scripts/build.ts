// Builds dist/: one ESM file per motif (dist/<id>.js, React external, no shared chunk) and its
// .d.ts. There is deliberately no index: each motif is its own import path.
// Run: bun scripts/build.ts
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { MOTIFS } from "./motifs";

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");

rmSync(DIST, { recursive: true, force: true });

const ids = Object.keys(MOTIFS);
const js = await Bun.build({
  entrypoints: ids.map((id) => resolve(ROOT, `src/${id}.tsx`)),
  outdir: DIST,
  target: "browser",
  format: "esm",
  packages: "external",
  splitting: false,
  // Production JSX runtime, as in @hansenexus/ui (design#27).
  jsx: { runtime: "automatic", development: false },
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error("build: bundling the motifs failed");
}
for (const id of ids) {
  if (/jsx-dev-runtime|jsxDEV/.test(readFileSync(resolve(DIST, `${id}.js`), "utf8"))) {
    throw new Error(`build: dist/${id}.js uses the development JSX runtime (jsxDEV)`);
  }
}

const tsc = Bun.spawnSync(["bunx", "tsc", "-p", "tsconfig.build.json"], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
});
if (tsc.exitCode !== 0) throw new Error(`build: tsc exited ${tsc.exitCode}`);
console.log(`build: ${ids.length} motifs in dist/ (${ids.join(", ")})`);
