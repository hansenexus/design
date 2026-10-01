// The shadcn registry. registry.json is the source (the shadcn build format); this writes
// one registry-item JSON per entry, file contents inlined, plus the index, into dist/r/.
// It fails when an item's declared dependencies disagree with its imports, or when an
// item does not pass shadcn's own schema.
// Every file a consumer copies in starts with a stamp, `"hn-registry: <item>@<version>";`, and
// every item carries the same version as `meta.version`, so `/design outdated` can compare what a
// repo holds with what the registry serves (#65). The version is @hansenexus/ui's.
// Run: bun scripts/registry.ts [outDir]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { registryItemSchema, registrySchema } from "shadcn/schema";

const ROOT = resolve(import.meta.dir, "..");
export const NAMESPACE = "@hansenexus";

/** Where the built registry is served: the kit-gallery image, behind Cloudflare Access (#65). */
export const REGISTRY_URL = "https://design.hansenexus.dev/r/{name}.json";

/**
 * The `registries` entry a consumer's components.json needs. The Access service token travels as
 * headers; `${VAR}` is filled from the environment by the shadcn CLI (and by outdated.ts), so the
 * token is never in a repo. `/design add` sets both variables for the child process from 1Password
 * (op-rw). Written to dist/r/components.json so a consumer, or the skill, can copy it verbatim.
 */
export const REGISTRIES = {
  [NAMESPACE]: {
    url: REGISTRY_URL,
    headers: {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: shadcn CLI env placeholder, not a JS template
      "CF-Access-Client-Id": "${HN_REGISTRY_CLIENT_ID}",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: shadcn CLI env placeholder, not a JS template
      "CF-Access-Client-Secret": "${HN_REGISTRY_CLIENT_SECRET}",
    },
  },
} satisfies Record<string, { url: string; headers: Record<string, string> }>;

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

/** The version every item is stamped with: @hansenexus/ui's package.json version. */
export function registryVersion(): string {
  return JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).version;
}

/**
 * The first line of every copied-in file. `/design outdated` parses it with STAMP_RE.
 * A directive, not a comment: with `tsx: true` shadcn writes ts-morph's `getText()`, which drops
 * a file's leading comments, so a `//` stamp on line 1 never reaches the consumer. An unknown
 * directive is inert, and it stays in the prologue next to a later "use client".
 */
export function stamp(item: string, version: string): string {
  return `"hn-registry: ${item}@${version}";`;
}

export const STAMP_RE = /^"hn-registry: ([a-z0-9-]+)@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)";$/;

export async function buildRegistry(outDir: string, version = registryVersion()): Promise<number> {
  const registry = loadRegistry();
  const errors = registry.items.flatMap(checkItem);
  if (errors.length) throw new Error(`registry:\n  ${errors.join("\n  ")}`);
  mkdirSync(outDir, { recursive: true });
  const items = registry.items.map((item) => ({
    ...item,
    meta: { ...(item.meta as Record<string, unknown> | undefined), version },
  }));
  for (const item of items) {
    const built = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      ...item,
      files: item.files?.map((f) => ({
        ...f,
        path: f.path.replace(/^src\//, "ui/"),
        content: `${stamp(item.name, version)}\n${readFileSync(resolve(ROOT, f.path), "utf8")}`,
      })),
    };
    registryItemSchema.parse(built);
    writeFileSync(resolve(outDir, `${item.name}.json`), `${JSON.stringify(built, null, 2)}\n`);
  }
  const index = { ...registry, items };
  registrySchema.parse(index);
  writeFileSync(resolve(outDir, "registry.json"), `${JSON.stringify(index, null, 2)}\n`);
  writeFileSync(
    resolve(outDir, "components.json"),
    `${JSON.stringify({ registries: REGISTRIES }, null, 2)}\n`
  );
  return items.length;
}

if (import.meta.main) {
  const out = resolve(process.argv[2] ?? resolve(ROOT, "dist/r"));
  const n = await buildRegistry(out);
  console.log(`registry: ${n} items in ${out}`);
}
