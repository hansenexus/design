// The dependency graph of the registry, for the gallery's blast-radius view (hansenexus/design#59).
// An edge runs from an item to each item it uses: its `registryDependencies` plus the registry
// items its files import (a relative import resolves to the item that owns the file), plus
// `meta.uses` for an item that installs an npm package instead of copying files (the shell, #64).
// For every
// item it lists what it uses directly and every item that uses it, directly or transitively, so
// one atom's page shows each molecule and organism a change to it reaches.
// Built once per gallery build (scripts/gallery.ts): the gallery imports it as `virtual:graph`
// and the build writes it as gallery/dist/graph.json, so nothing is parsed at runtime.
// Run: bun scripts/graph.ts [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NAMESPACE } from "./registry";

const ROOT = resolve(import.meta.dir, "..");

export type GraphItem = {
  name: string;
  meta?: Record<string, unknown>;
  registryDependencies?: string[];
  files?: { path: string }[];
};

export type Dependent = {
  name: string;
  /** The shortest chain from the dependent down to the item, both ends included. */
  path: string[];
};

export type GraphNode = {
  /** Items this one uses directly, sorted. */
  uses: string[];
  /** Every item that uses this one, directly or through others, nearest first, then by name. */
  usedBy: Dependent[];
};

export type Graph = Record<string, GraphNode>;

/** Relative imports of a source file, resolved against its folder (./button -> src/button). */
function relativeImports(path: string, source: string): string[] {
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  return [...source.matchAll(/(?:from|import)\s*"(\.\/[^"]+)"/g)].map(
    (m) => `${dir}${(m[1] ?? "").slice(2)}`
  );
}

const stem = (path: string) => path.replace(/\.tsx?$/, "");

/**
 * The graph from the registry items and their file sources (keyed by the item's file path).
 * Throws on an edge to something that is not a registry item, so a broken graph fails the build.
 */
export function buildGraph(items: GraphItem[], sources: Record<string, string>): Graph {
  const names = new Set(items.map((i) => i.name));
  const owner = new Map<string, string>();
  for (const item of items) for (const f of item.files ?? []) owner.set(stem(f.path), item.name);

  const uses = new Map<string, Set<string>>();
  for (const item of items) {
    const out = new Set<string>();
    for (const dep of item.registryDependencies ?? []) {
      const name = dep.startsWith(`${NAMESPACE}/`) ? dep.slice(NAMESPACE.length + 1) : dep;
      if (!names.has(name)) throw new Error(`graph: ${item.name} depends on unknown ${dep}`);
      out.add(name);
    }
    const declared = item.meta?.uses;
    for (const name of Array.isArray(declared) ? (declared as string[]) : []) {
      if (!names.has(name)) throw new Error(`graph: ${item.name} uses unknown ${name}`);
      out.add(name);
    }
    for (const f of item.files ?? []) {
      for (const target of relativeImports(f.path, sources[f.path] ?? "")) {
        const dep = owner.get(stem(target));
        if (!dep) throw new Error(`graph: ${f.path} imports ${target}, which no item owns`);
        if (dep !== item.name) out.add(dep);
      }
    }
    uses.set(item.name, out);
  }

  const direct = new Map<string, string[]>(items.map((i) => [i.name, []]));
  for (const [name, deps] of uses) for (const dep of deps) direct.get(dep)?.push(name);

  const graph: Graph = {};
  for (const item of items) {
    // Breadth first up the reversed edges: the first visit is the shortest chain.
    const via = new Map<string, string>();
    const depth = new Map<string, number>([[item.name, 0]]);
    const queue = [item.name];
    for (let at = queue.shift(); at !== undefined; at = queue.shift()) {
      for (const up of [...(direct.get(at) ?? [])].sort()) {
        if (depth.has(up)) continue;
        depth.set(up, (depth.get(at) ?? 0) + 1);
        via.set(up, at);
        queue.push(up);
      }
    }
    const usedBy = [...via.keys()]
      .sort((a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || a.localeCompare(b))
      .map((name) => {
        const path = [name];
        for (let n = via.get(name); n !== undefined; n = via.get(n)) path.push(n);
        return { name, path };
      });
    graph[item.name] = { uses: [...(uses.get(item.name) ?? [])].sort(), usedBy };
  }
  return graph;
}

/** The graph of packages/ui/registry.json and the files its items own. */
export function loadGraph(root = ROOT): Graph {
  const { items } = JSON.parse(readFileSync(resolve(root, "registry.json"), "utf8")) as {
    items: GraphItem[];
  };
  const sources: Record<string, string> = {};
  for (const item of items)
    for (const f of item.files ?? []) sources[f.path] = readFileSync(resolve(root, f.path), "utf8");
  return buildGraph(items, sources);
}

/** The source of the gallery's `virtual:graph` module. */
export function graphSource(graph: Graph = loadGraph()): string {
  return `export const GRAPH = ${JSON.stringify(graph)};\n`;
}

if (import.meta.main) {
  const graph = loadGraph();
  const out = process.argv[2];
  if (out) writeFileSync(resolve(out), `${JSON.stringify(graph, null, 2)}\n`);
  for (const [name, node] of Object.entries(graph))
    console.log(`${name}: uses ${node.uses.length}, used by ${node.usedBy.length}`);
}
