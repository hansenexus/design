// The live copy of every theme pack (design#149): main's themes/, bundled next to this build's,
// each direction under the data-theme `<id>@live`, so a theme-pack branch's gallery compares the
// candidate with what ships, side by side. The tokens come in as gallery/dist/live.css, the skins
// through `virtual:live-packs`.
//
// Where main comes from, first match wins:
// - git: `git archive <ref> themes` (ref: WORKBENCH_LIVE_REF, default origin/main) into
//   workbench/.checkouts/_live, fresh on every build. CI fetches main first.
// - an existing workbench/.checkouts/_live (the gallery image: CI filled it, the image has no .git).
// - neither: the live copy is this build's own packs, and the gallery says so.
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, sep } from "node:path";
import type { BunPlugin } from "bun";
import { renderPackCss } from "../../tokens/scripts/build";
import { packThemes } from "../../tokens/scripts/resolve";
import { coreImport, REPO } from "./workbench";

export const LIVE_SUFFIX = "@live";
export const LIVE_DIR = resolve(REPO, "workbench/.checkouts/_live");

export type LiveSource = {
  /** The themes/ folder the live packs are read from (a real path). */
  themes: string;
  /** What the gallery shows: "origin/main 1a2b3c4", or "this build …". */
  label: string;
  /** A copy outside the workspace, with no node_modules: its bare imports need mapping. */
  extracted: boolean;
};

/** git's stdout, or null on a failure or where there is no git (the gallery image). */
function git(args: string[], cwd: string) {
  try {
    const proc = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
    return proc.exitCode === 0 ? proc.stdout : null;
  } catch {
    return null;
  }
}

/** Extracts `ref`'s themes/ into `dir`, or returns null when there is no git or no such ref. */
export function extractLive(ref: string, dir = LIVE_DIR, repo = REPO): LiveSource | null {
  const sha = git(["rev-parse", "--short", `${ref}^{commit}`], repo)
    ?.toString()
    .trim();
  if (!sha) return null;
  const tar = git(["archive", "--format=tar", ref, "themes"], repo);
  if (!tar) return null;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const untar = Bun.spawnSync(["tar", "-x", "-C", dir], { stdin: tar, stderr: "pipe" });
  if (untar.exitCode !== 0) throw new Error(`live: tar failed: ${untar.stderr.toString()}`);
  const label = `${ref} ${sha}`;
  writeFileSync(resolve(dir, "SOURCE"), `${label}\n`);
  return { themes: realpathSync(resolve(dir, "themes")), label, extracted: true };
}

/** The live packs' source for this build (see the file header). */
export function liveSource(env: Record<string, string | undefined> = process.env): LiveSource {
  const ref = env.WORKBENCH_LIVE_REF ?? "origin/main";
  const fromGit = extractLive(ref);
  if (fromGit) return fromGit;
  const kept = resolve(LIVE_DIR, "themes");
  if (existsSync(kept)) {
    const source = resolve(LIVE_DIR, "SOURCE");
    const label = existsSync(source) ? readFileSync(source, "utf8").trim() : "main";
    return { themes: realpathSync(kept), label, extracted: true };
  }
  return {
    themes: resolve(REPO, "themes"),
    label: "this build, no main to compare with",
    extracted: false,
  };
}

/** `[data-theme="x"]` -> `[data-theme="x@live"]`: the same blocks under the live ids. */
export function liveIds(css: string): string {
  return css.replace(
    /\[data-theme="([^"]+)"\]/g,
    (_, id: string) => `[data-theme="${id}${LIVE_SUFFIX}"]`
  );
}

/** gallery/dist/live.css: Tailwind's source for the live skins, then every direction's tokens. */
export async function liveCss(source: LiveSource): Promise<string> {
  const apps = [...new Set(packThemes(source.themes).map((p) => p.app))];
  const blocks = await Promise.all(
    apps.map(async (app) => liveIds(await renderPackCss(app, undefined, source.themes)))
  );
  return [
    `/* The live theme packs (${source.label}) under <id>${LIVE_SUFFIX}, by scripts/live.ts (design#149). */`,
    `@source ${JSON.stringify(source.themes)};`,
    ...blocks,
    "",
  ].join("\n");
}

/** Each pack entry under `themes` (themes/<app>/index.ts). */
function packEntries(themes: string): string[] {
  return readdirSync(themes, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(resolve(themes, d.name, "index.ts")))
    .map((d) => resolve(themes, d.name, "index.ts"))
    .sort();
}

/** `virtual:live-packs`: every live direction with its skins, re-id'd, and the source label. */
export function liveModule(source: LiveSource): string {
  const entries = packEntries(source.themes);
  return [
    ...entries.map((e, i) => `import { directions as d${i} } from ${JSON.stringify(e)};`),
    `export const LIVE_PACKS = [${entries.map((_, i) => `...d${i}`).join(", ")}].map((p) => ({ ...p, id: p.id + ${JSON.stringify(LIVE_SUFFIX)} }));`,
    `export const LIVE_SOURCE = ${JSON.stringify(source.label)};`,
  ].join("\n");
}

/**
 * `virtual:live-packs`, and bare imports from an extracted main (which has no node_modules)
 * resolved to the gallery's own copies, so the live skins share React and the skin context.
 */
export function livePlugin(source: LiveSource): BunPlugin {
  const within = source.themes + sep;
  return {
    name: "live-packs",
    setup(build) {
      build.onResolve({ filter: /^virtual:live-packs$/ }, (args) => ({
        path: args.path,
        namespace: "live-packs",
      }));
      build.onLoad({ filter: /.*/, namespace: "live-packs" }, () => ({
        contents: liveModule(source),
        loader: "ts",
      }));
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        if (!source.extracted || !args.importer.startsWith(within)) return undefined;
        const path = coreImport(args.path);
        if (!path)
          throw new Error(`live: ${args.importer} imports "${args.path}", not a core package`);
        return { path };
      });
    },
  };
}
