// Builds dist/: one ESM file per motif (dist/<path>.js, React external, no shared chunk) and its
// .d.ts. There is deliberately no index: each motif is its own import path. The school family
// lands in dist/school/, mirroring src/school/.
// Run: bun scripts/build.ts
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { ENTRIES, MODULES } from "./motifs";

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");

rmSync(DIST, { recursive: true, force: true });

const paths = ENTRIES.map((e) => e.path);
const js = await Bun.build({
  entrypoints: [
    ...paths.map((p) => resolve(ROOT, `src/${p}.tsx`)),
    ...MODULES.map((m) => resolve(ROOT, `src/${m}.ts`)),
  ],
  outdir: DIST,
  root: resolve(ROOT, "src"),
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
for (const p of paths) {
  if (/jsx-dev-runtime|jsxDEV/.test(readFileSync(resolve(DIST, `${p}.js`), "utf8"))) {
    throw new Error(`build: dist/${p}.js uses the development JSX runtime (jsxDEV)`);
  }
}

const tsc = Bun.spawnSync(["bunx", "tsc", "-p", "tsconfig.build.json"], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
});
if (tsc.exitCode !== 0) throw new Error(`build: tsc exited ${tsc.exitCode}`);
console.log(`build: ${paths.length} motifs and ${MODULES.join(", ")} in dist/`);
