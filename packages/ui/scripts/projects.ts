// The projects scan (design#222): for each project of workbench/projects.json with a local
// checkout, reads its package.json files for this repository's @hansenexus/* packages and records
// package, range and whether the range is behind the latest version. The checkout is found as the
// workbench finds an app's (scripts/workbench.ts): WORKBENCH_<PROJECT> or WORKBENCH_<REPO NAME>
// (an absolute checkout of the project's repository), else workbench/.checkouts/<project>. No
// checkout: the manifest entry alone, unscanned. The result is build data for the gallery
// (`virtual:projects`, gallery/dist/projects.json), never committed: only package names and
// ranges leave a private repository, no paths or other content.
// "Latest" is the version this repository's package.json files carry, i.e. the last release cut
// from main; the scan needs no network.
// Run: bun scripts/projects.ts [--json]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BunPlugin } from "bun";
import { type ProjectsManifest, validateProjects } from "../gallery/projects";
import { checkoutDir, envKey, REPO } from "./workbench";

export type Dependency = {
  package: string;
  /** The range as written; a catalog range resolved to the catalog's entry. */
  range: string;
  /** The version this repository carries, or null for a package it does not publish. */
  latest: string | null;
  /** True when the range does not admit `latest`. */
  behind: boolean;
};

export type ProjectScan =
  | { id: string; scanned: true; via: string; deps: Dependency[] }
  | { id: string; scanned: false; reason: string };

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);
const FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

export function readProjectsManifest(repo = REPO): ProjectsManifest {
  const manifest = JSON.parse(readFileSync(resolve(repo, "workbench/projects.json"), "utf8"));
  const problems = validateProjects(manifest);
  if (problems.length) throw new Error(problems.join("\n"));
  return manifest as ProjectsManifest;
}

/** This repository's packages and their versions: the "latest" a range is held against. */
export function latestVersions(repo = REPO): Record<string, string> {
  const root = JSON.parse(readFileSync(resolve(repo, "package.json"), "utf8")) as {
    workspaces?: string[];
  };
  const out: Record<string, string> = {};
  for (const pattern of root.workspaces ?? []) {
    const dirs = pattern.endsWith("/*")
      ? readdirSync(resolve(repo, pattern.slice(0, -2))).map((d) =>
          resolve(repo, pattern.slice(0, -2), d)
        )
      : [resolve(repo, pattern)];
    for (const dir of dirs) {
      const file = join(dir, "package.json");
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, "utf8")) as {
        name?: string;
        version?: string;
        private?: boolean;
      };
      if (pkg.name?.startsWith("@hansenexus/") && pkg.version && !pkg.private)
        out[pkg.name] = pkg.version;
    }
  }
  return out;
}

/** Every package.json under `dir`, outside node_modules and build output. */
function packageFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) {
        if (!SKIP_DIRS.has(name) && !name.startsWith(".")) walk(path);
      } else if (name === "package.json") files.push(path);
    }
  };
  walk(dir);
  return files;
}

type Catalogs = Record<string, Record<string, string>>;

/** The checkout's catalogs (bun and pnpm style, root or under workspaces), "" for the default. */
export function readCatalogs(root: string): Catalogs {
  const file = join(root, "package.json");
  if (!existsSync(file)) return {};
  const pkg = JSON.parse(readFileSync(file, "utf8")) as {
    catalog?: Record<string, string>;
    catalogs?: Catalogs;
    workspaces?: unknown;
  };
  const ws = (pkg.workspaces && !Array.isArray(pkg.workspaces) ? pkg.workspaces : {}) as typeof pkg;
  return {
    ...pkg.catalogs,
    ...ws.catalogs,
    "": { ...pkg.catalog, ...ws.catalog },
  };
}

/** `catalog:` and `catalog:<name>` to the catalog's range; other ranges as written. */
export function resolveRange(name: string, range: string, catalogs: Catalogs): string {
  if (!range.startsWith("catalog:")) return range;
  return catalogs[range.slice("catalog:".length)]?.[name] ?? range;
}

/** Whether `range` is behind `latest`: it does not admit it. workspace: and unknown ranges are not. */
export function isBehind(range: string, latest: string | null): boolean {
  if (!latest || range.startsWith("workspace:") || range.startsWith("catalog:")) return false;
  try {
    return !Bun.semver.satisfies(latest, range);
  } catch {
    return false;
  }
}

/**
 * The @hansenexus/* dependencies of this repository's packages under `dir`, deduplicated by
 * package and range, sorted. `root` is the repository root, for its catalogs.
 */
export function scanDependencies(
  dir: string,
  latest: Record<string, string>,
  root = dir
): Dependency[] {
  const catalogs = readCatalogs(root);
  const seen = new Map<string, Dependency>();
  for (const file of packageFiles(dir)) {
    const pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    for (const field of FIELDS) {
      const deps = pkg[field];
      if (!deps || typeof deps !== "object") continue;
      for (const [name, raw] of Object.entries(deps as Record<string, string>)) {
        if (!(name in latest) || typeof raw !== "string") continue;
        const range = resolveRange(name, raw, catalogs);
        const v = latest[name] ?? null;
        seen.set(`${name} ${range}`, {
          package: name,
          range,
          latest: v,
          behind: isBehind(range, v),
        });
      }
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.package.localeCompare(b.package) || a.range.localeCompare(b.range)
  );
}

/** The repository's name of `owner/name`, for its WORKBENCH_<NAME> variable. */
const repoName = (repo: string) => repo.split("/")[1] ?? repo;

/** Each project's scan, or why it is unscanned. */
export function scanProjects(
  manifest: ProjectsManifest,
  {
    repo = REPO,
    env = process.env,
    latest = latestVersions(repo),
  }: {
    repo?: string;
    env?: Record<string, string | undefined>;
    latest?: Record<string, string>;
  } = {}
): ProjectScan[] {
  return Object.entries(manifest.projects).map(([id, project]): ProjectScan => {
    const keys = [...new Set([envKey(id), envKey(repoName(project.repo))])];
    const key = keys.find((k) => env[k]);
    let root: string | null = null;
    let via = "";
    if (project.repo === "hansenexus/design") {
      root = repo;
      via = "this repository";
    } else if (key) {
      root = resolve(env[key] as string);
      via = key;
    } else if (existsSync(checkoutDir(id, repo))) {
      root = checkoutDir(id, repo);
      via = "workbench/.checkouts";
    }
    if (!root)
      return {
        id,
        scanned: false,
        reason: `no checkout: set ${keys.join(" or ")} to a local checkout of ${project.repo}`,
      };
    const dir = project.path ? resolve(root, project.path) : root;
    if (!existsSync(dir))
      return { id, scanned: false, reason: `${via} has no ${project.path ?? "checkout"}` };
    return { id, scanned: true, via, deps: scanDependencies(dir, latest, root) };
  });
}

/** `virtual:projects`: the scan and the latest versions, for the Projects scene. */
export function projectsSource(scan: readonly ProjectScan[], latest: Record<string, string>) {
  return [
    `export const SCAN = ${JSON.stringify(scan)};`,
    `export const LATEST = ${JSON.stringify(latest)};`,
  ].join("\n");
}

export function projectsPlugin(scan: readonly ProjectScan[], latest: Record<string, string>) {
  return {
    name: "workbench-projects",
    setup(build) {
      build.onResolve({ filter: /^virtual:projects$/ }, (args) => ({
        path: args.path,
        namespace: "projects",
      }));
      build.onLoad({ filter: /.*/, namespace: "projects" }, () => ({
        contents: projectsSource(scan, latest),
        loader: "ts",
      }));
    },
  } satisfies BunPlugin;
}

if (import.meta.main) {
  const latest = latestVersions();
  const scan = scanProjects(readProjectsManifest(), { latest });
  if (process.argv.includes("--json")) console.log(JSON.stringify(scan, null, 2));
  else
    for (const s of scan) {
      if (!s.scanned) console.log(`${s.id}: unscanned (${s.reason})`);
      else
        console.log(
          `${s.id} (${s.via}): ${
            s.deps
              .map((d) => `${d.package}@${d.range}${d.behind ? ` < ${d.latest}` : ""}`)
              .join(", ") || "no @hansenexus packages of this repository"
          }`
        );
    }
}
