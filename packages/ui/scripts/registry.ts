// The shadcn registry. registry.json is the source (the shadcn build format); this writes
// one registry-item JSON per entry, file contents inlined, plus the index, into dist/r/.
// It fails when an item's declared dependencies disagree with its imports, or when an
// item does not pass shadcn's own schema.
// Run: bun scripts/registry.ts [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { registryItemSchema, registrySchema } from "shadcn/schema";

const ROOT = resolve(import.meta.dir, "..");
export const NAMESPACE = "@hansenexus";

type Item = {
  name: string;
  type: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files?: { path: string; type: string; content?: string }[];
  [key: string]: unknown;
};

export function loadRegistry(): { name: string; items: Item[]; [key: string]: unknown } {
  const raw = JSON.parse(readFileSync(resolve(ROOT, "registry.json"), "utf8"));
  return registrySchema.parse(raw) as { name: string; items: Item[] };
}

/** Packages and sibling items a source file imports (react is a given in every shadcn app). */
export function importsOf(source: string): { packages: string[]; siblings: string[] } {
  const specs = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1] ?? "");
  return {
    packages: [...new Set(specs.filter((s) => !s.startsWith(".") && s !== "react"))].sort(),
    siblings: [
      ...new Set(specs.filter((s) => s.startsWith("./")).map((s) => `${NAMESPACE}/${s.slice(2)}`)),
    ].sort(),
  };
}

/** Mismatches between what an item declares and what its files import. */
export function checkItem(item: Item): string[] {
  const errors: string[] = [];
  if (!item.files?.length) return errors;
  const packages = new Set<string>();
  const siblings = new Set<string>();
  for (const file of item.files) {
    const found = importsOf(readFileSync(resolve(ROOT, file.path), "utf8"));
    for (const p of found.packages) packages.add(p);
    for (const s of found.siblings) siblings.add(s);
  }
  const declared = [...(item.dependencies ?? [])].sort();
  const wanted = [...packages].sort();
  if (declared.join() !== wanted.join())
    errors.push(
      `${item.name}: dependencies ${JSON.stringify(declared)}, imports ${JSON.stringify(wanted)}`
    );
  const declaredReg = (item.registryDependencies ?? []).filter((d) => d !== `${NAMESPACE}/tokens`);
  if (declaredReg.sort().join() !== [...siblings].sort().join())
    errors.push(
      `${item.name}: registryDependencies ${JSON.stringify(declaredReg)}, imports ${JSON.stringify([...siblings])}`
    );
  if (!item.registryDependencies?.includes(`${NAMESPACE}/tokens`))
    errors.push(`${item.name}: must depend on ${NAMESPACE}/tokens`);
  return errors;
}

export async function buildRegistry(outDir: string): Promise<number> {
  const registry = loadRegistry();
  const errors = registry.items.flatMap(checkItem);
  if (errors.length) throw new Error(`registry:\n  ${errors.join("\n  ")}`);
  mkdirSync(outDir, { recursive: true });
  for (const item of registry.items) {
    const built = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      ...item,
      files: item.files?.map((f) => ({
        ...f,
        path: f.path.replace(/^src\//, "ui/"),
        content: readFileSync(resolve(ROOT, f.path), "utf8"),
      })),
    };
    registryItemSchema.parse(built);
    writeFileSync(resolve(outDir, `${item.name}.json`), `${JSON.stringify(built, null, 2)}\n`);
  }
  writeFileSync(resolve(outDir, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`);
  return registry.items.length;
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? resolve(ROOT, "dist/r"));
  const n = await buildRegistry(out);
  console.log(`registry: ${n} items in ${out}`);
}
