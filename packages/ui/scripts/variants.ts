// Variant votes in the gallery. A category is a folder gallery/variants/<category>/ holding
// category.tsx (the fixtures every variant is shown in) and one <variant>.tsx per alternative.
// Recording the owner's choice writes decisions/<category>.json and deletes the losing files,
// so a decided category keeps exactly its winner (dec_2026-09-26_global-frontend-state-contract).
//
// Run: bun scripts/variants.ts list
//      bun scripts/variants.ts decide <category> <winner> --rationale "<why>" [--date YYYY-MM-DD]
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// import.meta.url, not import.meta.dir: Playwright loads this under Node (screenshots/vote.spec.ts).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type Decision = {
  category: string;
  winner: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  rationale: string;
  /** Every variant on the board when the decision was taken, winner included. */
  considered: string[];
};

export type CategoryFiles = {
  id: string;
  /** Absolute path of category.tsx. */
  spec: string;
  /** Variant ids, sorted; the file is <dir>/<id>.tsx. */
  variants: string[];
  decision: Decision | null;
};

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const variantsDir = (root: string) => resolve(root, "gallery/variants");
const decisionsDir = (root: string) => resolve(root, "decisions");
const decisionPath = (root: string, category: string) =>
  resolve(decisionsDir(root), `${category}.json`);

export function readDecision(root: string, category: string): Decision | null {
  const file = decisionPath(root, category);
  if (!existsSync(file)) return null;
  const d = JSON.parse(readFileSync(file, "utf8")) as Partial<Decision>;
  const problems = [
    d.category !== category && `category is ${JSON.stringify(d.category)}, not ${category}`,
    !(typeof d.winner === "string" && ID.test(d.winner)) && "winner is not a variant id",
    !(typeof d.date === "string" && DATE.test(d.date)) && "date is not YYYY-MM-DD",
    !(typeof d.rationale === "string" && d.rationale.trim()) && "rationale is empty",
    !(Array.isArray(d.considered) && d.winner && d.considered.includes(d.winner)) &&
      "considered does not list the winner",
  ].filter(Boolean);
  if (problems.length) throw new Error(`decisions/${category}.json: ${problems.join("; ")}`);
  return d as Decision;
}

/** Every category under gallery/variants, sorted, with its variants and decision. */
export function listCategories(root = ROOT): CategoryFiles[] {
  const dir = variantsDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((id) => {
      if (!ID.test(id)) throw new Error(`gallery/variants/${id}: category ids are kebab-case`);
      const spec = resolve(dir, id, "category.tsx");
      if (!existsSync(spec)) throw new Error(`gallery/variants/${id}: category.tsx is missing`);
      const variants = readdirSync(resolve(dir, id))
        .filter((f) => f.endsWith(".tsx") && f !== "category.tsx")
        .map((f) => basename(f, ".tsx"))
        .sort();
      for (const v of variants) {
        if (!ID.test(v)) {
          throw new Error(`gallery/variants/${id}/${v}.tsx: variant ids are kebab-case`);
        }
      }
      return { id, spec, variants, decision: readDecision(root, id) };
    });
}

/** What is wrong with the board: an open vote needs two variants, a decided one only its winner. */
export function boardProblems(categories: CategoryFiles[]): string[] {
  return categories.flatMap(({ id, variants, decision }) => {
    if (!decision) {
      return variants.length >= 2 ? [] : [`${id}: an open vote needs at least two variants`];
    }
    return variants.length === 1 && variants[0] === decision.winner
      ? []
      : [`${id}: decided for ${decision.winner}, but the variants are [${variants.join(", ")}]`];
  });
}

/** Records the winner and deletes the losing variant files. Returns the deleted ids. */
export function decide(
  root: string,
  category: string,
  winner: string,
  rationale: string,
  date = new Date().toISOString().slice(0, 10)
): string[] {
  const found = listCategories(root).find((c) => c.id === category);
  if (!found) throw new Error(`no category ${category} under gallery/variants`);
  if (found.decision) {
    throw new Error(`${category} is already decided for ${found.decision.winner}`);
  }
  if (!found.variants.includes(winner)) {
    throw new Error(`${category} has no variant ${winner} (${found.variants.join(", ")})`);
  }
  if (!rationale.trim()) throw new Error("a decision needs a rationale");
  if (!DATE.test(date)) throw new Error(`date ${date} is not YYYY-MM-DD`);

  const decision: Decision = {
    category,
    winner,
    date,
    rationale: rationale.trim(),
    considered: found.variants,
  };
  const file = decisionPath(root, category);
  mkdirSync(decisionsDir(root), { recursive: true });
  writeFileSync(file, `${JSON.stringify(decision, null, 2)}\n`);
  const losers = found.variants.filter((v) => v !== winner);
  for (const v of losers) rmSync(resolve(variantsDir(root), category, `${v}.tsx`));
  return losers;
}

/**
 * The source of the gallery's `virtual:variants` module (scripts/gallery.ts): each category's
 * spec and variants, imported by absolute path, plus its decision.
 */
export function registrySource(root = ROOT): string {
  const imports: string[] = [];
  const entries = listCategories(root).map((c, i) => {
    imports.push(`import * as c${i} from ${JSON.stringify(c.spec)};`);
    const variants = c.variants.map((v, j) => {
      const file = resolve(variantsDir(root), c.id, `${v}.tsx`);
      imports.push(`import * as v${i}_${j} from ${JSON.stringify(file)};`);
      return `{ id: ${JSON.stringify(v)}, ...v${i}_${j}.variant }`;
    });
    return `{ id: ${JSON.stringify(c.id)}, spec: c${i}.category, decision: ${JSON.stringify(
      c.decision
    )}, variants: [${variants.join(", ")}] }`;
  });
  return `${imports.join("\n")}\nexport const CATEGORIES = [${entries.join(",\n")}];\n`;
}

if (import.meta.main) {
  const [cmd, category, winner, ...rest] = process.argv.slice(2);
  const flag = (name: string) => {
    const i = rest.indexOf(name);
    return i >= 0 ? rest[i + 1] : undefined;
  };
  if (cmd === "list") {
    for (const c of listCategories()) {
      const state = c.decision ? `decided: ${c.decision.winner} (${c.decision.date})` : "open";
      console.log(`${c.id}  ${state}  [${c.variants.join(", ")}]`);
    }
    const problems = boardProblems(listCategories());
    for (const p of problems) console.error(`variants: ${p}`);
    process.exit(problems.length ? 1 : 0);
  } else if (cmd === "decide" && category && winner) {
    const losers = decide(ROOT, category, winner, flag("--rationale") ?? "", flag("--date"));
    console.log(`variants: ${category} decided for ${winner}; deleted ${losers.join(", ")}`);
    console.log(`variants: wrote decisions/${category}.json`);
  } else {
    console.error(
      'usage: bun scripts/variants.ts list | decide <category> <winner> --rationale "<why>" [--date YYYY-MM-DD]'
    );
    process.exit(2);
  }
}
