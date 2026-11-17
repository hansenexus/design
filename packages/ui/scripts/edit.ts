// The live editor's files side (design#151): what the editor may change, as `virtual:editor`, and
// writing a draft (gallery/edit.ts) back into a pack direction under themes/:
// - token and recipe values into tokens.json (both modes) or tokens.<mode>.json, as DTCG;
// - the skin of each slot: the direction's skins/index.ts regenerated, a skin borrowed from
//   another pack copied in with its ./ helpers (a pack never imports another pack), a dropped
//   skin's file deleted.
// The written files are run through biome, and the direction is resolved and checked for contrast
// (the same rules as `bun run contrast`): a draft that does not resolve is undone, a contrast
// failure is reported and left to contrast CI on the PR, as are the screenshot baselines.
// The local gallery server calls applyDraft() (POST /api/edit, scripts/gallery.ts); an agent runs
// the CLI with the draft from the hosted gallery's issue.
//
// Run: bun scripts/edit.ts apply <draft.json> [--pr]
//      --pr commits the files on the current branch (a new editor/<theme>-<stamp> branch on
//      main), pushes and opens the pull request.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { BunPlugin } from "bun";
import { checkSet } from "../../tokens/scripts/contrast";
import {
  MODES,
  PACKS_DIR,
  type PackTheme,
  packThemes,
  type ResolvedToken,
  resolveTokens,
  TOKENS_DIR,
} from "../../tokens/scripts/resolve";
import {
  DEFAULT_SKIN,
  type Draft,
  type EditorTheme,
  type EditorToken,
  readDraft,
  valueProblem,
} from "../gallery/edit";
import { dropLeafText, setLeafText } from "./json-text";
import { REPO } from "./workbench";

type Mode = (typeof MODES)[number];
type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const readJson = (file: string): Json =>
  existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Json) : {};

/** The leaf (`{ $value }`) at a dotted path, if the tree has one. */
function leafAt(tree: Json, path: string): Json | undefined {
  let node: unknown = tree;
  for (const key of path.split(".")) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return isRecord(node) && "$value" in node ? node : undefined;
}

const quoteFamily = (f: string) => (/[\s,]/.test(f) ? JSON.stringify(f) : f);

/** A DTCG value as the editor shows and takes it: CSS-like text. */
export function authoredText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === "number")
      ? `cubic-bezier(${value.join(", ")})`
      : value.map((v) => quoteFamily(String(v))).join(", ");
  }
  if (isRecord(value) && "offsetX" in value) {
    return ["offsetX", "offsetY", "blur", "spread", "color"].map((k) => String(value[k])).join(" ");
  }
  return JSON.stringify(value);
}

/** Splits on `sep` outside quotes and parentheses. */
function split(text: string, sep: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = "";
  let cur = "";
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = "";
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === "(") {
      depth++;
      cur += ch;
    } else if (ch === ")") {
      depth--;
      cur += ch;
    } else if (depth === 0 && sep.test(ch)) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const LENGTH = /^-?\d*\.?\d+(px|rem|em)?$/;

/** The editor's text as a DTCG $value of `type`; a whole {reference} stays as written. */
export function dtcgValue(type: string, text: string): unknown {
  const v = text.trim();
  if (/^\{[^{}]+\}$/.test(v)) return v;
  switch (type) {
    case "fontFamily":
      return split(v, /,/).map((f) => f.replace(/^["']|["']$/g, ""));
    case "shadow": {
      const parts = split(v, /\s/);
      const lengths = parts.filter((p) => LENGTH.test(p));
      const color = parts.filter((p) => !LENGTH.test(p));
      if (lengths.length < 2 || lengths.length > 4 || color.length !== 1) {
        throw new Error(`a shadow is "x y [blur] [spread] color", not ${JSON.stringify(v)}`);
      }
      const [offsetX, offsetY, blur = "0px", spread = "0px"] = lengths;
      return { color: color[0], offsetX, offsetY, blur, spread };
    }
    case "cubicBezier": {
      const m = /^cubic-bezier\(([^)]*)\)$/.exec(v);
      const nums = (m?.[1] ?? v).split(",").map((n) => Number(n.trim()));
      if (nums.length !== 4 || nums.some(Number.isNaN)) {
        throw new Error(`a cubicBezier is cubic-bezier(x1, y1, x2, y2), not ${JSON.stringify(v)}`);
      }
      return nums;
    }
    case "number":
    case "fontWeight":
      return Number.isNaN(Number(v)) ? v : Number(v);
    default:
      return v;
  }
}

/** Every leaf of a token tree as dotted path -> value. */
function flatten(tree: unknown, prefix = "", out: Record<string, unknown> = {}) {
  if (!isRecord(tree)) return out;
  if ("$value" in tree) {
    out[prefix] = tree.$value;
    return out;
  }
  for (const [k, v] of Object.entries(tree)) {
    if (!k.startsWith("$")) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

/** The primitives a value may reference (core primitives and the direction's palette), resolved. */
function primitiveRefs(pack: PackTheme, tokensDir: string): Record<string, string> {
  const raw: Record<string, unknown> = {};
  for (const f of ["color.json", "density.json"]) {
    flatten(readJson(join(tokensDir, "primitives", f)), "", raw);
  }
  flatten(readJson(join(pack.dir, "palette.json")), "", raw);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = authoredText(v);
  for (let i = 0; i < 4; i++) {
    for (const [k, v] of Object.entries(out)) {
      const ref = /^\{([^{}]+)\}$/.exec(v);
      if (ref?.[1] && out[ref[1]] !== undefined) out[k] = out[ref[1]] as string;
    }
  }
  return out;
}

/** One pack direction as the editor sees it: every token but typography, both modes. */
export async function editorTheme(
  pack: PackTheme,
  tokensDir = TOKENS_DIR,
  packsDir = PACKS_DIR
): Promise<EditorTheme> {
  const resolved = {} as Record<Mode, ResolvedToken[]>;
  for (const m of MODES) resolved[m] = await resolveTokens(pack.id, m, tokensDir, packsDir);
  const base = readJson(join(pack.dir, "tokens.json"));
  const modeFile = {} as Record<Mode, Json>;
  for (const m of MODES) modeFile[m] = readJson(join(pack.dir, `tokens.${m}.json`));
  const light = new Map(resolved.light.map((t) => [t.path, t]));
  const primitives = primitiveRefs(pack, tokensDir);
  const refs = {} as Record<Mode, Record<string, string>>;
  for (const m of MODES) {
    refs[m] = { ...primitives, ...Object.fromEntries(resolved[m].map((t) => [t.path, t.value])) };
  }
  const tokens = resolved.dark
    .filter((t) => t.type !== "typography")
    .map((t): EditorToken => {
      const l = light.get(t.path) ?? t;
      const inMode = MODES.some((m) => leafAt(modeFile[m], t.path));
      const inBase = leafAt(base, t.path);
      const authored = (m: Mode, fallback: ResolvedToken) => {
        const leaf = leafAt(modeFile[m], t.path) ?? inBase;
        return leaf ? authoredText(leaf.$value) : fallback.value;
      };
      return {
        path: t.path,
        cssVar: t.cssVar,
        type: t.type,
        ...(t.description ? { description: t.description } : {}),
        scope: inMode || (!inBase && t.type === "color") ? "mode" : "all",
        authored: { dark: authored("dark", t), light: authored("light", l) },
        value: { dark: t.value, light: l.value },
      };
    });
  return { id: pack.id, app: pack.app, direction: pack.direction, tokens, refs };
}

/** Every pack direction under `packsDir`, for `virtual:editor`. */
export async function editorCatalog(tokensDir = TOKENS_DIR, packsDir = PACKS_DIR) {
  return Promise.all(packThemes(packsDir).map((p) => editorTheme(p, tokensDir, packsDir)));
}

/** `virtual:editor`: EDITOR_THEMES, the catalog the editor panel offers. */
export function editorPlugin(themes: EditorTheme[]): BunPlugin {
  return {
    name: "editor",
    setup(build) {
      build.onResolve({ filter: /^virtual:editor$/ }, (args) => ({
        path: args.path,
        namespace: "editor",
      }));
      build.onLoad({ filter: /.*/, namespace: "editor" }, () => ({
        contents: `export const EDITOR_THEMES = ${JSON.stringify(themes)};\n`,
        loader: "ts",
      }));
    },
  };
}

// ── Skins ───────────────────────────────────────────────────────────────────────────────────

export type SkinEntry = { slot: string; binding: string; file: string };

/** A skins/index.ts as slot -> its binding and ./file. */
export function parseSkinsIndex(source: string): SkinEntry[] {
  const files = new Map<string, string>();
  for (const m of source.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*"\.\/([^"]+)";/g)) {
    if (m[1] && m[2]) files.set(m[1], m[2]);
  }
  const body = /skins\s*:\s*Skins\s*=\s*\{([^}]*)\}/.exec(source)?.[1] ?? "";
  return [...body.matchAll(/"?([\w.-]+)"?\s*:\s*(\w+)/g)].flatMap((m) => {
    const file = m[2] ? files.get(m[2]) : undefined;
    return m[1] && m[2] && file ? [{ slot: m[1], binding: m[2], file }] : [];
  });
}

/** A skins/index.ts for `entries`, in the shape of themes/fachwerk/fachwerk/skins/index.ts. */
export function renderSkinsIndex(entries: SkinEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.slot.localeCompare(b.slot));
  const imports = [...new Map(sorted.map((e) => [e.file, e])).values()]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map((e) => `import { ${e.binding} } from "./${e.file}";`);
  const body = sorted.map((e) => `  ${JSON.stringify(e.slot)}: ${e.binding},`);
  return [
    'import type { Skins } from "@hansenexus/ui";',
    ...imports,
    "",
    "/** The direction's skins: what the recipes cannot say. Every other slot renders the default. */",
    sorted.length
      ? `export const skins: Skins = {\n${body.join("\n")}\n};`
      : "export const skins: Skins = {};",
    "",
  ].join("\n");
}

/** The file of a ./ import in a skins folder: x.tsx or x.ts. */
function skinFile(dir: string, name: string): string | undefined {
  return [`${name}.tsx`, `${name}.ts`].map((f) => join(dir, f)).find((f) => existsSync(f));
}

/** The ./ imports of a skin file. */
const localImports = (source: string) =>
  [...source.matchAll(/from\s*"\.\/([^"]+)"/g)].flatMap((m) => (m[1] ? [m[1]] : []));

/** A file and every ./ file it reaches, by name. */
function closure(dir: string, name: string, seen = new Set<string>()): Set<string> {
  if (seen.has(name)) return seen;
  const file = skinFile(dir, name);
  if (!file) throw new Error(`edit: ${relative(REPO, dir)}/${name} does not exist`);
  seen.add(name);
  for (const dep of localImports(readFileSync(file, "utf8"))) closure(dir, dep, seen);
  return seen;
}

/**
 * Wires a direction that had no skins (lexilink's ledger) into its pack's index.ts:
 * `{ id: "<id>" }` becomes `{ id: "<id>", skins }` with the import beside it.
 */
function wireSkins(pack: PackTheme, packsDir: string): string {
  const file = join(packsDir, pack.app, "index.ts");
  const source = readFileSync(file, "utf8");
  const def = `{ id: ${JSON.stringify(pack.id)} }`;
  if (!source.includes(def)) {
    throw new Error(
      `edit: ${pack.id} has no skins yet and ${relative(REPO, file)} has no \`${def}\` to wire them into`
    );
  }
  const name = /\bimport\s*\{\s*skins\s*\}/.test(source)
    ? `${pack.direction.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())}Skins`
    : "skins";
  const binding = name === "skins" ? "skins" : `skins as ${name}`;
  const imports = source.match(/^import [^\n]*\n/gm) ?? [];
  const last = imports[imports.length - 1] ?? "";
  const line = `import { ${binding} } from "./${pack.direction}/skins";\n`;
  const at = source.indexOf(last) + last.length;
  const next = `${source.slice(0, at)}${line}${source.slice(at)}`.replace(
    def,
    `{ id: ${JSON.stringify(pack.id)}, skins${name === "skins" ? "" : `: ${name}`} }`
  );
  writeFileSync(file, next);
  return file;
}

/** Applies the draft's skins to `pack`; returns every file written or deleted. */
function applySkins(draft: Draft, pack: PackTheme, packsDir: string): string[] {
  if (Object.keys(draft.skins).length === 0) return [];
  const dir = join(pack.dir, "skins");
  const index = join(dir, "index.ts");
  const had = existsSync(index);
  const entries = new Map(
    (had ? parseSkinsIndex(readFileSync(index, "utf8")) : []).map((e) => [e.slot, e])
  );
  const before = had ? closure(dir, "index") : new Set<string>();
  const touched: string[] = [];
  const all = packThemes(packsDir);
  for (const [slot, source] of Object.entries(draft.skins)) {
    if (source === DEFAULT_SKIN) {
      entries.delete(slot);
      continue;
    }
    if (source === pack.id) continue;
    const from = all.find((p) => p.id === source);
    if (!from) throw new Error(`edit: no pack direction ${source} to take the ${slot} skin from`);
    const fromDir = join(from.dir, "skins");
    const fromIndex = join(fromDir, "index.ts");
    const entry = existsSync(fromIndex)
      ? parseSkinsIndex(readFileSync(fromIndex, "utf8")).find((e) => e.slot === slot)
      : undefined;
    if (!entry) throw new Error(`edit: ${source} has no skin for ${slot}`);
    mkdirSync(dir, { recursive: true });
    for (const name of closure(fromDir, entry.file)) {
      const src = skinFile(fromDir, name);
      if (!src) continue;
      const dest = join(dir, src.slice(fromDir.length + 1));
      // The slot's own skin file is replaced; any other file of the same name must be the same.
      const replaced = entries.get(slot)?.file === name;
      if (
        !replaced &&
        existsSync(dest) &&
        readFileSync(dest, "utf8") !== readFileSync(src, "utf8")
      ) {
        throw new Error(`edit: ${relative(REPO, dest)} exists with other content; rename one`);
      }
      copyFileSync(src, dest);
      touched.push(dest);
    }
    const clash = [...entries.values()].find(
      (e) => e.binding === entry.binding && e.file !== entry.file
    );
    if (clash) throw new Error(`edit: ${slot}'s ${entry.binding} clashes with ${clash.slot}'s`);
    entries.set(slot, { ...entry, slot });
  }
  if (!had && entries.size === 0) return touched;
  mkdirSync(dir, { recursive: true });
  writeFileSync(index, renderSkinsIndex([...entries.values()]));
  touched.push(index);
  if (!had) touched.push(wireSkins(pack, packsDir));
  // Delete the files no skin reaches any more.
  const kept = new Set<string>();
  for (const e of entries.values()) closure(dir, e.file, kept);
  for (const name of before) {
    if (name === "index" || kept.has(name)) continue;
    const file = skinFile(dir, name);
    if (file) {
      rmSync(file);
      touched.push(file);
    }
  }
  return touched;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────────

export type ApplyResult = {
  theme: string;
  /** Repo-relative paths written or deleted. */
  files: string[];
  /** Contrast failures and errors of the direction after the edit (bun run contrast's rules). */
  contrast: string[];
};

export type ApplyOptions = {
  tokensDir?: string;
  packsDir?: string;
  /** Repo root the reported paths are relative to. */
  repo?: string;
  /** Run biome format over the written files (off in the tests' temp copies). */
  format?: boolean;
};

/** Writes a draft into its pack direction. A draft that does not resolve is undone and throws. */
export async function applyDraft(input: unknown, options: ApplyOptions = {}): Promise<ApplyResult> {
  const { tokensDir = TOKENS_DIR, packsDir = PACKS_DIR, repo = REPO, format = true } = options;
  const draft = readDraft(input);
  if (typeof draft === "string") throw new Error(`edit: ${draft}`);
  const pack = packThemes(packsDir).find((p) => p.id === draft.theme);
  if (!pack) {
    throw new Error(`edit: ${draft.theme} is not a pack direction; the editor writes only packs`);
  }
  const theme = await editorTheme(pack, tokensDir, packsDir);
  const types = new Map(theme.tokens.map((t) => [t.path, t]));

  const fileOf = (scope: string) =>
    join(pack.dir, scope === "all" ? "tokens.json" : `tokens.${scope}.json`);
  // Edited as text (scripts/json-text.ts): only the edited values change in the diff.
  const texts: Record<string, string> = {};
  const dirty = new Set<string>();
  const text = (scope: string) => {
    texts[scope] ??= existsSync(fileOf(scope)) ? readFileSync(fileOf(scope), "utf8") : "{}\n";
    return texts[scope];
  };
  const tree = (scope: string) => JSON.parse(text(scope)) as Json;
  const edit = (scope: string, next: string) => {
    texts[scope] = next;
    dirty.add(scope);
  };
  for (const scope of ["all", ...MODES] as const) {
    for (const [path, value] of Object.entries(draft.tokens[scope])) {
      const token = types.get(path);
      if (!token) throw new Error(`edit: ${path} is not a token ${draft.theme} can set`);
      const problem = valueProblem(token, value);
      if (problem) throw new Error(`edit: ${path}: ${problem}`);
      const dtcg = dtcgValue(token.type, value);
      if (scope === "all") {
        for (const m of MODES) {
          if (leafAt(tree(m), path)) {
            throw new Error(`edit: ${path} is set per mode in ${draft.theme}; edit it per mode`);
          }
        }
      } else {
        const shared = leafAt(tree("all"), path);
        if (shared) {
          // A per-mode edit of a shared value: the other mode keeps it, in its own file.
          edit("all", dropLeafText(text("all"), path));
          const other = scope === "dark" ? "light" : "dark";
          if (!leafAt(tree(other), path) && draft.tokens[other][path] === undefined) {
            edit(other, setLeafText(text(other), path, shared.$value, token.type));
          }
        }
      }
      edit(scope, setLeafText(text(scope), path, dtcg, token.type));
    }
  }

  const backups = new Map<string, string | null>();
  const keep = (file: string) => {
    if (!backups.has(file)) backups.set(file, existsSync(file) ? readFileSync(file, "utf8") : null);
  };
  for (const scope of dirty) keep(fileOf(scope));
  // Back up what the skins may touch before touching it.
  const skinsDir = join(pack.dir, "skins");
  if (Object.keys(draft.skins).length) {
    keep(join(packsDir, pack.app, "index.ts"));
    if (existsSync(join(skinsDir, "index.ts"))) {
      for (const name of closure(skinsDir, "index")) {
        const f = skinFile(skinsDir, name);
        if (f) keep(f);
      }
    }
  }
  const files: string[] = [];
  try {
    for (const scope of dirty) {
      writeFileSync(fileOf(scope), text(scope));
      files.push(fileOf(scope));
    }
    for (const f of applySkins(draft, pack, packsDir)) {
      keep(f);
      if (!files.includes(f)) files.push(f);
    }
    for (const m of MODES) await resolveTokens(pack.id, m, tokensDir, packsDir);
  } catch (e) {
    for (const [file, body] of backups) {
      if (body === null) rmSync(file, { force: true });
      else writeFileSync(file, body);
    }
    for (const f of files) if (!backups.has(f)) rmSync(f, { force: true });
    throw new Error(`edit: the draft was undone: ${e instanceof Error ? e.message : String(e)}`);
  }
  const present = files.filter((f) => existsSync(f));
  if (format && present.length) {
    const biome = resolve(repo, "node_modules/.bin/biome");
    if (existsSync(biome)) {
      Bun.spawnSync([biome, "format", "--write", ...present], { cwd: repo, stdout: "ignore" });
    }
  }
  const contrast: string[] = [];
  for (const m of MODES) {
    const set = checkSet(pack.id, m, await resolveTokens(pack.id, m, tokensDir, packsDir));
    contrast.push(...set.errors);
    for (const f of set.results.filter((r) => !r.pass)) {
      contrast.push(
        `${f.theme}/${f.mode} ${f.kind}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1, needs ${f.min}:1`
      );
    }
  }
  return { theme: pack.id, files: files.map((f) => relative(repo, f)).sort(), contrast };
}

// ── The pull request ────────────────────────────────────────────────────────────────────────

/** The commands --pr runs, in order (pure, so the tests read them). */
export function prCommands(result: ApplyResult, branch: string, stamp: string): string[][] {
  const app = packThemes().find((p) => p.id === result.theme)?.app ?? result.theme;
  const onDefault = ["main", "master"].includes(branch);
  const title = `feat(theme-${app}): live-editor draft for ${result.theme}`;
  const body = [
    `The gallery's live editor (design#151) wrote these files for \`${result.theme}\`:`,
    "",
    ...result.files.map((f) => `- \`${f}\``),
    "",
    result.contrast.length
      ? `Contrast after the edit: ${result.contrast.length} problem(s); contrast CI will hold the PR:\n\n${result.contrast.map((c) => `- ${c}`).join("\n")}`
      : "Contrast after the edit: every pair meets WCAG 2.2 AA.",
    "",
    "Screenshot baselines (`bun run screenshots`) judge the rest.",
  ].join("\n");
  return [
    ...(onDefault ? [["git", "switch", "-c", `editor/${result.theme}-${stamp}`]] : []),
    ["git", "add", "-A", "--", ...result.files],
    ["git", "commit", "-m", title],
    ["git", "push", "-u", "origin", "HEAD"],
    ["gh", "pr", "create", "--title", title, "--body", body],
  ];
}

if (import.meta.main) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  if (cmd !== "apply" || !file) {
    console.error("usage: bun scripts/edit.ts apply <draft.json> [--pr]");
    process.exit(2);
  }
  try {
    const result = await applyDraft(JSON.parse(readFileSync(resolve(file), "utf8")));
    for (const f of result.files) console.log(`edit: wrote ${f}`);
    for (const c of result.contrast) console.error(`edit: contrast ${c}`);
    if (rest.includes("--pr")) {
      const branch = Bun.spawnSync(["git", "branch", "--show-current"], { cwd: REPO })
        .stdout.toString()
        .trim();
      const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 12);
      for (const c of prCommands(result, branch, stamp)) {
        const run = Bun.spawnSync(c, { cwd: REPO, stdout: "inherit", stderr: "inherit" });
        if (run.exitCode !== 0) throw new Error(`${c.slice(0, 3).join(" ")} failed`);
      }
    }
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
