// Atomic-level check (hansenexus/design#58). Every @hansenexus/ui registry item carries
// `meta.level: atom|molecule|organism|template` in packages/ui/registry.json, and a file may
// import only items of the same or a lower level: an atom never pulls in a molecule, a molecule
// never an organism. Folders stay flat; the level lives in that metadata only.
// An item that installs an npm package instead of copying files (the shell, #64) names the items
// it draws in `meta.uses`; the same rule holds for those.
// It also fails when a gallery preview card names an item the registry lacks, or when an item
// has no scene in packages/ui/gallery/levels.ts, so the gallery nav lists every item by level.
// Theme-pack skins (themes/<app>/<direction>/skins/, design#143) sit at the level of the item they
// skin and follow the same rule (checkSkins).
// Run: bun scripts/levels.ts [--root <dir>]
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
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
  /** Theme-pack skin sources (design#143), keyed by repo path: themes/<app>/<direction>/skins/*. */
  skins?: Record<string, string>;
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

/** Names a source file exports: declarations and `export { a, b as c }` lists. */
export function exportedNames(source: string): string[] {
  const declared = [
    ...source.matchAll(
      /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|function|class|type|interface|enum)\s+(\w+)/g
    ),
  ].map((m) => m[1] ?? "");
  const listed = [...source.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap((m) =>
    (m[1] ?? "").split(",").map((n) => (n.trim().split(/\s+as\s+/)[1] ?? n).trim())
  );
  return [...declared, ...listed].filter(Boolean);
}

/** `import { A, type B, C as D } from "<pkg>"` → ["A", "B", "C"], over every such import. */
export function namedImports(source: string, pkg: string): string[] {
  const from = new RegExp(`import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*"${pkg}"`, "g");
  return [...source.matchAll(from)].flatMap((m) =>
    (m[1] ?? "")
      .split(",")
      .map(
        (n) =>
          n
            .trim()
            .replace(/^type\s+/, "")
            .split(/\s+as\s+/)[0] ?? ""
      )
      .filter(Boolean)
  );
}

const SKIN_FILE = /^themes\/[^/]+\/[^/]+\/skins\/([^/]+)\.tsx?$/;

/**
 * Theme-pack skins (design#143). A file `skins/<item>.tsx` or `skins/<item>.<part>.tsx` skins a
 * registry item, so it sits at that item's level and imports only that level or lower: named
 * imports from @hansenexus/ui map to the item that exports each name, @hansenexus/shell is the
 * shell, `./<file>` is the sibling skin. Atoms have no skin: a pack changes them through recipe
 * tokens. `_<name>.tsx` is a helper at atom level; `index.ts(x)` collects the skins and is free.
 */
export function checkSkins(
  items: Item[],
  sources: Record<string, string>,
  skins: Record<string, string>
): string[] {
  const errors: string[] = [];
  const byName = new Map(items.map((i) => [i.name, i]));
  const exporter = new Map<string, Item>();
  for (const item of items)
    for (const f of item.files ?? [])
      for (const name of exportedNames(sources[f.path] ?? "")) exporter.set(name, item);

  /** The level a skin file sits at, or a reason it has none. */
  const fileLevel = (base: string): Level | string => {
    if (base === "index") return "template";
    if (base.startsWith("_")) return "atom";
    const name = base.split(".")[0] ?? base;
    const item = byName.get(name);
    if (!item) return `is named for ${name}, which is not a registry item`;
    const level = levelOf(item);
    if (!level) return `skins ${name}, which has no level`;
    if (level === "atom")
      return `skins ${name}, an atom: atoms take no skin, change them through recipe tokens`;
    return level;
  };

  for (const [path, source] of Object.entries(skins)) {
    const base = path.match(SKIN_FILE)?.[1]?.replace(/\.tsx?$/, "");
    if (base === undefined) {
      errors.push(`${path}: a skin lives in themes/<app>/<direction>/skins/<item>.tsx`);
      continue;
    }
    const level = fileLevel(base);
    if (!(LEVELS as readonly string[]).includes(level)) {
      errors.push(`${path} ${level}`);
      continue;
    }
    const own = level as Level;
    const deps: [string, Level | string][] = [];
    if (/import\s+\*\s+as\s+\w+\s+from\s+"@hansenexus\/ui"/.test(source))
      errors.push(
        `${path}: import names from @hansenexus/ui, not the namespace, so levels can be checked`
      );
    for (const name of namedImports(source, "@hansenexus/ui")) {
      const item = exporter.get(name);
      if (!item) errors.push(`${path}: @hansenexus/ui exports no ${name} from a registry item`);
      else deps.push([`${name} (${item.name})`, levelOf(item) ?? "atom"]);
    }
    if (/from\s+"@hansenexus\/shell"/.test(source)) {
      const shell = byName.get("shell");
      deps.push(["@hansenexus/shell", (shell && levelOf(shell)) ?? "template"]);
    }
    for (const m of source.matchAll(/(?:from|import)\s*"(\.{1,2}\/[^"]+)"/g)) {
      const target = m[1] ?? "";
      if (!target.startsWith("./") || target.slice(2).includes("/")) {
        errors.push(`${path}: imports ${target}; a skin imports only sibling skins (./<file>)`);
        continue;
      }
      const sibling = fileLevel(target.slice(2).replace(/\.tsx?$/, ""));
      deps.push([target, sibling]);
    }
    for (const [what, depLevel] of deps) {
      if (!(LEVELS as readonly string[]).includes(depLevel)) continue;
      if (rank(depLevel as Level) <= rank(own)) continue;
      errors.push(
        `${path} (${own}) imports ${what} (${depLevel}): a skin at level ${own} imports only ${LEVELS.slice(0, rank(own) + 1).join("|")}`
      );
    }
  }
  return errors;
}

export function checkLevels({ items, sources, gallery, scenes, skins = {} }: Input): string[] {
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
    const uses = item.meta?.uses;
    for (const name of Array.isArray(uses) ? (uses as string[]) : []) {
      const dep = items.find((i) => i.name === name);
      if (!dep) {
        errors.push(
          `${at("registry.json")}: ${item.name} uses ${name}, which is not a registry item`
        );
        continue;
      }
      const depLevel = levelOf(dep);
      if (!level || !depLevel || rank(depLevel) <= rank(level)) continue;
      errors.push(
        `${at("registry.json")}: ${item.name} (${level}) uses ${name} (${depLevel}): a ${level} uses only ${LEVELS.slice(0, rank(level) + 1).join("|")}`
      );
    }
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
  errors.push(...checkSkins(items, sources, skins));
  return errors;
}

/** Every file under themes/<app>/<direction>/skins/, keyed by repo path. */
function loadSkins(root: string): Record<string, string> {
  const skins: Record<string, string> = {};
  const themes = resolve(root, "themes");
  if (!existsSync(themes)) return skins;
  for (const f of readdirSync(themes, { recursive: true }) as string[]) {
    const path = `themes/${f.split(sep).join("/")}`;
    if (/\/skins\/.+\.tsx?$/.test(path)) skins[path] = readFileSync(resolve(root, path), "utf8");
  }
  return skins;
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
  return { items, sources, gallery, scenes: ITEM_SCENES, skins: loadSkins(root) };
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
