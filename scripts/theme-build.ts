// Builds the theme package in the current folder (themes/<app>, design#143) into dist/:
// theme.css (every direction of the pack as [data-theme] blocks, @hansenexus/tokens'
// renderPackCss), index.js (the ThemePackDefinitions and their skins, ESM, dependencies
// external) and the declarations. @hansenexus/ui must be built first: the skins and the
// declarations import it (the root build runs the workspace in dependency order).
// Run from a theme package: bun ../../scripts/theme-build.ts
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderPackCss } from "../packages/tokens/scripts/build";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");

function run(cmd: string[]) {
  const proc = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
  if (proc.exitCode !== 0) throw new Error(`theme-build: ${cmd.join(" ")} exited ${proc.exitCode}`);
}

const { app } = JSON.parse(readFileSync(resolve(ROOT, "pack.json"), "utf8")) as { app: string };
const { name } = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")) as {
  name: string;
};
if (name !== `@hansenexus/theme-${app}`)
  throw new Error(
    `theme-build: package ${name} holds pack ${app}; name it @hansenexus/theme-${app}`
  );

rmSync(DIST, { recursive: true, force: true });

const js = await Bun.build({
  entrypoints: [resolve(ROOT, "index.ts")],
  outdir: DIST,
  target: "browser",
  format: "esm",
  packages: "external",
  sourcemap: "linked",
  jsx: { runtime: "automatic", development: false },
});
if (!js.success) {
  for (const log of js.logs) console.error(log);
  throw new Error("theme-build: bundling index.ts failed");
}
if (/jsx-dev-runtime|jsxDEV/.test(readFileSync(resolve(DIST, "index.js"), "utf8")))
  throw new Error("theme-build: dist/index.js uses the development JSX runtime (jsxDEV)");

writeFileSync(resolve(DIST, "theme.css"), await renderPackCss(app));
if (existsSync(resolve(ROOT, "tsconfig.build.json")))
  run(["bunx", "tsc", "-p", "tsconfig.build.json"]);
console.log(`theme-build: ${name} dist/index.js, dist/index.d.ts, dist/theme.css`);
