// Motion sets (design#221): a set is an id, a label and values for the motion tokens, the
// durations, delays and easings of semantic/motion.json and the transition durations of
// semantic/scale.json, the choreography (enter, exit, stagger, emphasis) included. The build
// resolves every set to a [data-motion="<id>"] block that redeclares every motion variable, so a
// set swaps without a rebuild, the way data-theme swaps a theme. Reduced motion keeps winning:
// motion-reduce: switches transitions off whatever the variables say.
//
// Adding a set: tokens/motion-sets/<id>.json, plus its id in tokens/motion-sets/sets.json.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  type ResolvedToken,
  resolveTokens,
  TOKENS_DIR,
} from "./resolve";

export type Bezier = readonly [number, number, number, number];

/** One tokens/motion-sets/<id>.json. */
export type MotionSetFile = {
  label: string;
  description?: string;
  /** Token path to value: "180ms" for a duration, four numbers for an easing. */
  values: Record<string, unknown>;
};

export type MotionSet = {
  id: string;
  label: string;
  description: string;
  /** Every motion token, with the set's values applied. */
  tokens: ResolvedToken[];
};

/** The tokens a set may give values to: every duration and every easing. */
export const isMotionToken = (t: ResolvedToken) =>
  t.type === "duration" || t.type === "cubicBezier";

const DURATION = /^\d+(?:\.\d+)?(?:ms|s)$/;

function isBezier(v: unknown): v is Bezier {
  return (
    Array.isArray(v) &&
    v.length === 4 &&
    v.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    v[0] >= 0 &&
    v[0] <= 1 &&
    v[2] >= 0 &&
    v[2] <= 1
  );
}

/** The CSS form of an easing, as the tokens build writes it. */
export const bezierCss = ([x1, y1, x2, y2]: Bezier) => `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;

/**
 * One set over the motion tokens of the default theme: each value checked against its token's
 * type, every token the set leaves out keeps the default.
 */
export function resolveMotionSet(id: string, file: MotionSetFile, base: ResolvedToken[]) {
  const motion = base.filter(isMotionToken);
  const byPath = new Map(motion.map((t) => [t.path, t]));
  if (typeof file.label !== "string" || !file.label)
    throw new Error(`motion set ${id}: needs a label`);
  for (const [path, value] of Object.entries(file.values ?? {})) {
    const token = byPath.get(path);
    if (!token) throw new Error(`motion set ${id}: ${path} is not a motion token`);
    if (token.type === "duration" && !(typeof value === "string" && DURATION.test(value)))
      throw new Error(`motion set ${id}: ${path} needs a ms or s duration, not ${String(value)}`);
    if (token.type === "cubicBezier" && !isBezier(value))
      throw new Error(`motion set ${id}: ${path} needs four numbers, x1 and x2 within 0..1`);
  }
  const tokens = motion.map((t): ResolvedToken => {
    const value = file.values?.[t.path];
    if (value === undefined) return t;
    return t.type === "cubicBezier"
      ? { ...t, value: bezierCss(value as Bezier), raw: value }
      : { ...t, value: String(value), raw: value };
  });
  return { id, label: file.label, description: file.description ?? "", tokens } as MotionSet;
}

export const MOTION_SETS_DIR = join(TOKENS_DIR, "motion-sets");
const REGISTRY = "sets.json";

/**
 * The set files in registry order. Every id in sets.json needs its file and every file its id;
 * the first set is the default and gives no values, so the tokens as they are stay a set.
 */
export function readMotionSets(dir: string = MOTION_SETS_DIR): [string, MotionSetFile][] {
  const { sets } = JSON.parse(readFileSync(join(dir, REGISTRY), "utf8")) as { sets: string[] };
  if (sets[0] !== "default") throw new Error("motion sets: the first set is default");
  for (const file of readdirSync(dir)) {
    if (file === REGISTRY || !file.endsWith(".json")) continue;
    if (!sets.includes(file.slice(0, -5)))
      throw new Error(`motion sets: ${file} is not in ${REGISTRY}`);
  }
  if (new Set(sets).size !== sets.length) throw new Error("motion sets: an id repeats");
  return sets.map((id) => {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(`motion sets: ${id} is not a kebab id`);
    const path = join(dir, `${id}.json`);
    if (!existsSync(path)) throw new Error(`motion sets: ${id} has no ${id}.json`);
    const file = JSON.parse(readFileSync(path, "utf8")) as MotionSetFile;
    if (id === "default" && Object.keys(file.values ?? {}).length)
      throw new Error("motion sets: default gives no values, it is the tokens as they are");
    return [id, file];
  });
}

/** Every set, resolved over the default theme's motion tokens. */
export async function resolveMotionSets(
  tokensDir: string = TOKENS_DIR,
  base?: ResolvedToken[]
): Promise<MotionSet[]> {
  const tokens = base ?? (await resolveTokens(DEFAULT_THEME, DEFAULT_MODE, tokensDir));
  return readMotionSets(join(tokensDir, "motion-sets")).map(([id, file]) =>
    resolveMotionSet(id, file, tokens)
  );
}
