// The outdated check behind `/design outdated` (#65): finds every copied-in registry block in a
// consumer repo by its stamp (`"hn-registry: <item>@<version>";`, line 1, written by registry.ts),
// fetches the registry index and lists each block whose version is behind `meta.version`.
// The registry comes from the consumer's components.json (`registries["@hansenexus"]`, headers with
// `${VAR}` filled from the environment, as the shadcn CLI does) or, without one, from REGISTRIES in
// registry.ts. Header values are secrets: they are sent, never printed, and a missing variable is
// reported by name only.
// Run: bun scripts/outdated.ts [consumerDir] [--registry <url|dir>] [--json]
// Exit 1 when a block is behind, 2 on a usage or fetch error.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { NAMESPACE, REGISTRIES, STAMP_RE } from "./registry";

export type Stamp = { file: string; item: string; version: string };
export type Row = Stamp & {
  registry: string | null;
  state: "behind" | "current" | "ahead" | "unknown";
};
export type RegistryConfig = { url: string; headers?: Record<string, string> };

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage"]);
const STAMP_FILES = /\.(tsx?|jsx?|css)$/;
const SCAN_BYTES = 256;

/** Every stamped file under `dir`, as paths relative to it. */
export function findStamps(dir: string): Stamp[] {
  const stamps: Stamp[] = [];
  const walk = (current: string) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(path);
        continue;
      }
      if (!STAMP_FILES.test(name)) continue;
      const stamp = readStamp(path);
      if (stamp) stamps.push({ file: relative(dir, path), ...stamp });
    }
  };
  walk(dir);
  return stamps;
}

/** The stamp on a file's first line, or null. Looks only at the head of the file. */
export function readStamp(path: string): { item: string; version: string } | null {
  const head = readFileSync(path).subarray(0, SCAN_BYTES).toString("utf8");
  const match = (head.split("\n")[0] ?? "").match(STAMP_RE);
  return match ? { item: match[1] ?? "", version: match[2] ?? "" } : null;
}

/** semver order: -1 when a < b, 0 when equal, 1 when a > b. A prerelease sorts before its release. */
export function compareVersions(a: string, b: string): number {
  const [aCore = "", aPre] = a.split("-", 2);
  const [bCore = "", bPre] = b.split("-", 2);
  const an = aCore.split(".").map(Number);
  const bn = bCore.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (an[i] ?? 0) - (bn[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  if (aPre === bPre) return 0;
  if (aPre === undefined) return 1;
  if (bPre === undefined) return -1;
  return aPre < bPre ? -1 : 1;
}

/** Each stamp against the index's `meta.version`; a stamped item the index lacks is `unknown`. */
export function compareStamps(
  stamps: Stamp[],
  index: { items: { name: string; meta?: { version?: string } }[] }
): Row[] {
  const versions = new Map(index.items.map((i) => [i.name, i.meta?.version ?? null]));
  return stamps.map((stamp) => {
    const registry = versions.get(stamp.item) ?? null;
    if (registry === null) return { ...stamp, registry, state: "unknown" };
    const order = compareVersions(stamp.version, registry);
    return {
      ...stamp,
      registry,
      state: order < 0 ? "behind" : order > 0 ? "ahead" : "current",
    };
  });
}

/** The `@hansenexus` registry from `<dir>/components.json`, or the default from registry.ts. */
export function registryConfig(dir: string): RegistryConfig {
  const path = join(dir, "components.json");
  if (!existsSync(path)) return REGISTRIES[NAMESPACE];
  const config = JSON.parse(readFileSync(path, "utf8")) as {
    registries?: Record<string, string | RegistryConfig>;
  };
  const entry = config.registries?.[NAMESPACE];
  if (entry === undefined) return REGISTRIES[NAMESPACE];
  return typeof entry === "string" ? { url: entry } : entry;
}

/**
 * `${VAR}` in a header value, filled from `env` the way the shadcn CLI fills it. Throws naming the
 * variable (never its value) when one is unset or empty.
 */
export function expandHeaders(
  headers: Record<string, string> = {},
  env: Record<string, string | undefined> = process.env
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, template] of Object.entries(headers)) {
    out[name] = template.replace(/\$\{([A-Z0-9_]+)\}/g, (_, key: string) => {
      const value = env[key];
      if (!value)
        throw new Error(`outdated: ${key} is not set (header ${name}); read it via op-rw`);
      return value;
    });
  }
  return out;
}

/** The index URL for an item URL template: `.../r/{name}.json` gives `.../r/registry.json`. */
export function indexUrl(template: string): string {
  return template.replace("{name}", "registry");
}

/** The registry index from a local directory (a `dist/r`) or over HTTP with the config's headers. */
export async function loadIndex(
  source: string | RegistryConfig,
  env: Record<string, string | undefined> = process.env
): Promise<{ items: { name: string; meta?: { version?: string } }[] }> {
  if (typeof source === "string" && !/^https?:\/\//.test(source)) {
    return JSON.parse(readFileSync(join(source, "registry.json"), "utf8"));
  }
  const config = typeof source === "string" ? { url: source } : source;
  const url = indexUrl(config.url);
  const response = await fetch(url, { headers: expandHeaders(config.headers, env) });
  if (!response.ok) throw new Error(`outdated: ${url} answered ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("json"))
    throw new Error(
      `outdated: ${url} answered ${type || "no content-type"}, not JSON (Access login page?)`
    );
  return (await response.json()) as { items: { name: string; meta?: { version?: string } }[] };
}

/** One line per block that is behind or unknown, then a summary line. */
export function formatReport(rows: Row[]): string {
  const behind = rows.filter((r) => r.state === "behind");
  const unknown = rows.filter((r) => r.state === "unknown");
  const lines = behind.map((r) => `${r.item}  ${r.version} -> ${r.registry}  ${r.file}`);
  for (const r of unknown) lines.push(`${r.item}  ${r.version} -> (not in registry)  ${r.file}`);
  const summary =
    rows.length === 0
      ? "outdated: no stamped blocks found"
      : `outdated: ${behind.length} of ${rows.length} blocks behind${unknown.length ? `, ${unknown.length} unknown` : ""}`;
  return [...lines, summary].join("\n");
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const at = args.indexOf("--registry");
  const override = at >= 0 ? args[at + 1] : undefined;
  const dir = resolve(args.find((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1)) ?? ".");
  try {
    const stamps = findStamps(dir);
    const index = await loadIndex(override ?? registryConfig(dir));
    const rows = compareStamps(stamps, index);
    console.log(json ? JSON.stringify(rows, null, 2) : formatReport(rows));
    process.exit(rows.some((r) => r.state === "behind") ? 1 : 0);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
}
