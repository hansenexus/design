// The gallery workbench's app screens (design#148): reads workbench/apps.json, finds each app's
// screens entry, and bundles them into the gallery as `virtual:screens`, under the import rules of
// the screen-fixture contract (src/workbench/index.ts). Nothing private is published: an app in
// another repository is checked out at its pinned ref into workbench/.checkouts/<app> (CI), or
// read from WORKBENCH_<APP>=<absolute checkout> (local). Without either, the app is skipped and
// the gallery says so, so a public clone still builds.
//
// The import rules: a file in an app's screen folders (its entry's folder and its alias targets)
// imports only relative files inside those folders, react, react-dom, @hansenexus/*, radix-ui and
// the app's aliases and `allow` list. Anything else (convex, next, an app's data layer) fails the build. The
// allowed packages resolve to the gallery's own copies, so there is one React and one skin
// context, and @hansenexus/ui and @hansenexus/shell come from source like the rest of the gallery.
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import type { BunPlugin } from "bun";

const UI = resolve(import.meta.dir, "..");
export const REPO = resolve(UI, "../..");

export type AppSource = {
  /** An app in this repository: its folder, repo-relative. */
  path?: string;
  /** An app elsewhere: `owner/name` on GitHub, checked out at `ref`. */
  repo?: string;
  ref?: string;
  /** The screens entry, relative to the app's root (`path`, or the checkout). */
  entry: string;
  /** Bare specifiers the screens import from the app's own packages, mapped to root-relative paths. */
  aliases?: Record<string, string>;
  /** A stylesheet the screens need beyond Tailwind utilities, root-relative. */
  css?: string;
  /**
   * Further packages this app's screens may import (exact names, subpaths included). They resolve
   * to the gallery's own copies, so packages/ui lists each as a devDependency (design#157).
   */
  allow?: string[];
};

export type Manifest = { apps: Record<string, AppSource> };

export type ResolvedApp = {
  app: string;
  /** Absolute: the screens entry. */
  entry: string;
  /** Absolute: alias specifier to target. */
  aliases: Record<string, string>;
  /** Absolute: the folders whose files count as screen code (the entry's, the alias targets'). */
  dirs: string[];
  css?: string;
  /** The app's `allow` list from apps.json. */
  allow?: readonly string[];
};

export type SkippedApp = { app: string; reason: string };

/** Specifiers a screen may import besides relative files and its aliases. */
export const ALLOWED: readonly RegExp[] = [
  /^react(\/.*)?$/,
  /^react-dom(\/.*)?$/,
  /^@hansenexus\/[a-z-]+(\/.*)?$/,
  /^radix-ui(\/.*)?$/,
];

/** The core packages from source, as the rest of the gallery bundles them. */
const SOURCE: Record<string, string> = {
  "@hansenexus/ui": resolve(UI, "src/index.ts"),
  "@hansenexus/ui/workbench": resolve(UI, "src/workbench/index.ts"),
  "@hansenexus/shell": resolve(REPO, "packages/shell/src/index.ts"),
};

/**
 * Where a bare core import from outside this repository's packages goes: the gallery's own copy
 * (from source for ui and shell), so one React and one skin context serve everything; null when
 * the specifier is no core package.
 */
export function coreImport(spec: string): string | null {
  const source = SOURCE[spec];
  if (source) return source;
  if (ALLOWED.some((re) => re.test(spec))) return Bun.resolveSync(spec, UI);
  return null;
}

/** WORKBENCH_FACHWERK for fachwerk: the variable that points at a local checkout. */
export function envKey(app: string): string {
  return `WORKBENCH_${app.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
}

export function readManifest(repo = REPO): Manifest {
  return JSON.parse(readFileSync(resolve(repo, "workbench/apps.json"), "utf8")) as Manifest;
}

/** The checkout CI fills for an app from another repository (workbench/.checkouts is ignored). */
export function checkoutDir(app: string, repo = REPO): string {
  return resolve(repo, "workbench/.checkouts", app);
}

/**
 * Each app of the manifest with its files located, or the reason it is skipped. A missing
 * checkout skips the app; a checkout or path without the entry it names is an error.
 */
export function resolveApps(
  manifest: Manifest,
  {
    repo = REPO,
    env = process.env,
  }: { repo?: string; env?: Record<string, string | undefined> } = {}
): { apps: ResolvedApp[]; skipped: SkippedApp[] } {
  const apps: ResolvedApp[] = [];
  const skipped: SkippedApp[] = [];
  for (const [app, source] of Object.entries(manifest.apps)) {
    let root: string;
    if (source.path) root = resolve(repo, source.path);
    else if (source.repo) {
      const local = env[envKey(app)];
      root = local ? resolve(local) : checkoutDir(app, repo);
      if (!local && !existsSync(root)) {
        skipped.push({
          app,
          reason: `no checkout of ${source.repo}: set ${envKey(app)} to a local checkout, or run bun scripts/workbench-checkout.ts`,
        });
        continue;
      }
    } else throw new Error(`workbench: ${app} names neither a path nor a repo in apps.json`);
    // Real paths: the bundler hands the plugin real importer paths, so a symlinked checkout
    // (or macOS /var -> /private/var) would otherwise escape the import rules.
    if (!existsSync(root)) throw new Error(`workbench: ${app}'s root ${root} does not exist`);
    root = realpathSync(root);
    const entry = resolve(root, source.entry);
    if (!existsSync(entry)) throw new Error(`workbench: ${app}'s entry ${entry} does not exist`);
    const aliases: Record<string, string> = {};
    for (const [spec, path] of Object.entries(source.aliases ?? {})) {
      const target = resolve(root, path);
      if (!existsSync(target))
        throw new Error(`workbench: ${app}'s alias ${spec} -> ${target} does not exist`);
      aliases[spec] = realpathSync(target);
    }
    const css = source.css ? resolve(root, source.css) : undefined;
    if (css && !existsSync(css)) throw new Error(`workbench: ${app}'s css ${css} does not exist`);
    const dirs = [dirname(entry), ...Object.values(aliases)];
    apps.push({ app, entry, aliases, dirs, css, allow: source.allow ?? [] });
  }
  return { apps, skipped };
}

const inside = (file: string, dir: string) => file === dir || file.startsWith(dir + sep);

const under = (spec: string, name: string) => spec === name || spec.startsWith(`${name}/`);

const field = (value: unknown, key: string): unknown =>
  value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;

/**
 * An alias that names a package folder resolves through its `exports["."]`: Bun resolves a bare
 * folder by its index file only, and a workspace package keeps its entry in exports
 * (`@fachwerk/module-quiz` -> packages/modules/quiz -> ./src/index.ts). Null without one.
 */
export function packageEntry(dir: string): string | null {
  const pkg = resolve(dir, "package.json");
  if (!existsSync(pkg)) return null;
  const exports: unknown = JSON.parse(readFileSync(pkg, "utf8")).exports;
  const dot = typeof exports === "string" ? exports : field(exports, ".");
  const target = typeof dot === "string" ? dot : (field(dot, "import") ?? field(dot, "default"));
  return typeof target === "string" ? resolve(dir, target) : null;
}

export type ImportResolution = { path: string } | { error: string } | null;

/**
 * Where a screen file's import goes, or why it may not: null when `importer` is no screen
 * file, so the bundler resolves it as usual.
 */
export function resolveScreenImport(
  spec: string,
  importer: string,
  apps: readonly ResolvedApp[]
): ImportResolution {
  const app = apps.find((a) => a.dirs.some((d) => inside(importer, d)));
  if (!app) return null;
  const from = `workbench: ${importer} (${app.app}) imports "${spec}"`;
  if (spec.startsWith(".") || spec.startsWith("/")) {
    const target = resolve(dirname(importer), spec);
    if (!app.dirs.some((d) => inside(target, d)))
      return { error: `${from}, outside its screen folders (${app.dirs.join(", ")})` };
    return { path: Bun.resolveSync(target, dirname(importer)) };
  }
  for (const [alias, target] of Object.entries(app.aliases)) {
    if (!under(spec, alias)) continue;
    const entry = spec === alias ? packageEntry(target) : null;
    return { path: entry ?? Bun.resolveSync(target + spec.slice(alias.length), dirname(importer)) };
  }
  const core = coreImport(spec);
  if (core) return { path: core };
  if (app.allow?.some((name) => under(spec, name))) return { path: Bun.resolveSync(spec, UI) };
  return {
    error: `${from}: a screen imports only relative files, react, react-dom, @hansenexus/*, radix-ui, and the aliases and allow list of its app in workbench/apps.json (design#148)`,
  };
}

/** The `virtual:screens` module: every resolved app's default export, and the skipped apps. */
export function screensSource(apps: readonly ResolvedApp[], skipped: readonly SkippedApp[]) {
  return [
    ...apps.map((a, i) => `import app${i} from ${JSON.stringify(a.entry)};`),
    `export const APPS = [${apps.map((_, i) => `app${i}`).join(", ")}];`,
    `export const SKIPPED = ${JSON.stringify(skipped)};`,
  ].join("\n");
}

/** gallery/dist/screens.css: the app stylesheets, then Tailwind sources for every screen folder. */
export function screensCss(apps: readonly ResolvedApp[]): string {
  return [
    "/* Written by scripts/workbench.ts: the app screens' styles and Tailwind sources (design#148). */",
    ...apps.flatMap((a) => (a.css ? [`@import ${JSON.stringify(a.css)};`] : [])),
    ...apps.flatMap((a) => a.dirs.map((d) => `@source ${JSON.stringify(d)};`)),
    "",
  ].join("\n");
}

/** `virtual:screens` plus the import rules, for the gallery's Bun.build (scripts/gallery.ts). */
export function screensPlugin(apps: readonly ResolvedApp[], skipped: readonly SkippedApp[]) {
  return {
    name: "workbench-screens",
    setup(build) {
      build.onResolve({ filter: /^virtual:screens$/ }, (args) => ({
        path: args.path,
        namespace: "screens",
      }));
      build.onLoad({ filter: /.*/, namespace: "screens" }, () => ({
        contents: screensSource(apps, skipped),
        loader: "ts",
      }));
      build.onResolve({ filter: /.*/ }, (args) => {
        const r = resolveScreenImport(args.path, args.importer, apps);
        if (!r) return undefined;
        if ("error" in r) throw new Error(r.error);
        return { path: r.path };
      });
    },
  } satisfies BunPlugin;
}
