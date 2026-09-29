// Atomic-level check (hansenexus/design#58). Every @hansenexus/ui registry item carries
// `meta.level: atom|molecule|organism|template` in packages/ui/registry.json, and a file may
// import only items of the same or a lower level: an atom never pulls in a molecule, a molecule
// never an organism. Folders stay flat; the level lives in that metadata only.
// It also fails when a gallery preview card names an item the registry lacks, or when an item
// has no scene in packages/ui/gallery/levels.ts, so the gallery nav lists every item by level.
// Run: bun scripts/levels.ts [--root <dir>]
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ITEM_SCENES, LEVELS, type Level } from "../packages/ui/gallery/levels";

export const UI = "packages/ui";

export type Item = {
  name: string;
  meta?: Record<string, unknown>;
  files?: { path: string }[];
};

export type Input = {
  items: Item[];
  /** Source text per registry file path (relative to packages/ui, e.g. src/button.tsx). */
  sources: Record<string, string>;
  /** Gallery source text per file (relative to packages/ui), searched for preview cards. */
  gallery: Record<string, string>;
  scenes: Record<string, string>;
};

const rank = (level: Level) => LEVELS.indexOf(level);
/** A packages/ui path as the repo names it, so every message points at a real file. */
const at = (path: string) => `${UI}/${path}`;

function levelOf(item: Item): Level | undefined {
  return LEVELS.find((l) => l === item.meta?.level);
}

/** Relative imports of a source file, resolved against its folder (./button → src/button). */
export function siblingImports(path: string, source: string): string[] {
  const dir = path.slice(0, path.lastIndexOf("/") + 1);
  return [...source.matchAll(/(?:from|import)\s*"(\.\/[^"]+)"/g)].map(
    (m) => `${dir}${(m[1] ?? "").slice(2)}`
  );
}

/** Registry item names a gallery file hands to <PreviewCard item="...">. */
export function previewCardItems(source: string): string[] {
  return [...source.matchAll(/<PreviewCard\b[^>]*?\bitem="([^"]+)"/g)].map((m) => m[1] ?? "");
}

export function checkLevels({ items, sources, gallery, scenes }: Input): string[] {
  const errors: string[] = [];
  const names = new Set(items.map((i) => i.name));

  for (const item of items) {
    if (!levelOf(item))
      errors.push(
        `${at("registry.json")}: ${item.name} has no level; set meta.level to one of ${LEVELS.join("|")}`
      );
    if (!scenes[item.name])
      errors.push(`${at("gallery/levels.ts")}: ${item.name} has no scene in ITEM_SCENES`);
  }
  for (const name of Object.keys(scenes))
    if (!names.has(name)) errors.push(`${at("gallery/levels.ts")}: ${name} is not a registry item`);

  for (const [file, source] of Object.entries(gallery))
    for (const name of previewCardItems(source))
      if (!names.has(name))
        errors.push(`${at(file)}: preview card item "${name}" is not a registry item`);

  // Which item owns each file, keyed without the extension so "./button" finds src/button.tsx.
  const owner = new Map<string, Item>();
  for (const item of items)
    for (const f of item.files ?? []) owner.set(f.path.replace(/\.tsx?$/, ""), item);

  for (const item of items) {
    const level = levelOf(item);
    for (const f of item.files ?? []) {
      for (const target of siblingImports(f.path, sources[f.path] ?? "")) {
        const dep = owner.get(target.replace(/\.tsx?$/, ""));
        if (!dep) {
          errors.push(`${at(f.path)} imports ${at(target)}, which no registry item owns`);
          continue;
        }
        const depLevel = levelOf(dep);
        if (!level || !depLevel || rank(depLevel) <= rank(level)) continue;
        const depFile = dep.files?.[0]?.path ?? dep.name;
        errors.push(
          `${at(f.path)} (${level}) imports ${at(depFile)} (${depLevel}): a file at level ${level} imports only ${LEVELS.slice(0, rank(level) + 1).join("|")}`
        );
      }
    }
  }
  return errors;
}

export function load(root: string): Input {
  const ui = resolve(root, UI);
  const { items } = JSON.parse(readFileSync(resolve(ui, "registry.json"), "utf8")) as {
    items: Item[];
  };
  const sources: Record<string, string> = {};
  for (const item of items)
    for (const f of item.files ?? []) sources[f.path] = readFileSync(resolve(ui, f.path), "utf8");
  const gallery: Record<string, string> = {};
  for (const f of readdirSync(resolve(ui, "gallery"), { recursive: true }) as string[])
    if (/\.tsx$/.test(f) && !f.startsWith("dist/"))
      gallery[`gallery/${f}`] = readFileSync(resolve(ui, "gallery", f), "utf8");
  return { items, sources, gallery, scenes: ITEM_SCENES };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const rootArg = args.indexOf("--root");
  const root = resolve(rootArg >= 0 ? (args[rootArg + 1] ?? ".") : resolve(import.meta.dir, ".."));
  const input = load(root);
  const errors = checkLevels(input);
  for (const e of errors) console.error(`FAIL ${e}`);
  if (errors.length) {
    console.error("levels: see scripts/levels.ts; a level imports only the same or a lower level");
    process.exit(1);
  }
  const counts = LEVELS.map(
    (l) => `${input.items.filter((i) => i.meta?.level === l).length} ${l}s`
  ).join(", ");
  console.log(`levels: ${input.items.length} registry items (${counts}), no upward import`);
}
