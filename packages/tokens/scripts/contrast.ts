// WCAG 2.2 AA contrast over every semantic text and UI pair, every theme, both modes.
// Exits 1 if any pair falls below its minimum, or if a colour token is neither
// checked nor explicitly exempt (so a new token cannot slip past the check).
// Run: bun scripts/contrast.ts [--tokens <dir>]
import { MODES, type ResolvedToken, resolveTokens, THEMES } from "./resolve";

/** 1.4.3 text: 4.5:1. 1.4.11 non-text UI (borders, focus, status shapes): 3:1. */
export const AA = { text: 4.5, ui: 3 } as const;

const SURFACES = ["surface.page", "surface.band", "surface.card", "surface.raised"];

type Rule = { kind: keyof typeof AA; fg: string[]; bg: string[] };

export const RULES: Rule[] = [
  {
    kind: "text",
    fg: [
      "ink.primary",
      "ink.body",
      "ink.muted",
      "action.text",
      "action.text-hover",
      "status.ok",
      "status.busy",
      "status.warn",
      "status.crit",
    ],
    bg: SURFACES,
  },
  { kind: "text", fg: ["ink.primary", "action.text"], bg: ["surface.tint"] },
  { kind: "text", fg: ["action.primary-ink"], bg: ["action.primary", "action.primary-hover"] },
  {
    kind: "ui",
    fg: [
      "line.strong",
      "focus.ring",
      "status.ok",
      "status.busy",
      "status.warn",
      "status.crit",
      "status.off",
      "status.unknown",
    ],
    bg: SURFACES,
  },
];

/**
 * Colour tokens that are never checked as a foreground, with the reason. Every
 * other colour token must appear in RULES.
 */
export const EXEMPT: Record<string, string> = {
  "line.subtle": "decoration only; never the sole boundary of a control",
  "action.primary": "a fill; its label carries the contrast (action.primary-ink on it)",
  "action.primary-hover": "a fill; its label carries the contrast (action.primary-ink on it)",
};

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (!m?.[1]) throw new Error(`contrast: expected an opaque #rrggbb colour, got ${hex}`);
  if (m[2] && m[2].toLowerCase() !== "ff") throw new Error(`contrast: ${hex} is translucent`);
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((i) => {
    const c = Number.parseInt(m[1]?.slice(i, i + 2) ?? "0", 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export type PairResult = {
  theme: string;
  mode: string;
  kind: keyof typeof AA;
  fg: string;
  bg: string;
  ratio: number;
  min: number;
  pass: boolean;
};

export function checkSet(theme: string, mode: string, tokens: ResolvedToken[]) {
  const colors = new Map(tokens.filter((t) => t.type === "color").map((t) => [t.path, t.value]));
  const results: PairResult[] = [];
  const errors: string[] = [];
  const checked = new Set<string>();
  for (const rule of RULES) {
    for (const fg of rule.fg) {
      checked.add(fg);
      for (const bg of rule.bg) {
        const f = colors.get(fg);
        const b = colors.get(bg);
        if (!f || !b) {
          errors.push(`${theme}/${mode}: pair ${fg} on ${bg} names a missing token`);
          continue;
        }
        const r = ratio(f, b);
        const min = AA[rule.kind];
        results.push({ theme, mode, kind: rule.kind, fg, bg, ratio: r, min, pass: r >= min });
      }
    }
  }
  for (const path of colors.keys()) {
    if (path.startsWith("surface.") || checked.has(path) || path in EXEMPT) continue;
    errors.push(`${theme}/${mode}: colour token ${path} is not in any contrast rule nor EXEMPT`);
  }
  return { results, errors };
}

export async function checkAll(tokensDir?: string) {
  const results: PairResult[] = [];
  const errors: string[] = [];
  for (const theme of THEMES) {
    for (const mode of MODES) {
      const set = checkSet(theme, mode, await resolveTokens(theme, mode, tokensDir));
      results.push(...set.results);
      errors.push(...set.errors);
    }
  }
  return { results, errors, failures: results.filter((r) => !r.pass) };
}

if (import.meta.main) {
  try {
    const i = process.argv.indexOf("--tokens");
    const dir = i > -1 ? process.argv[i + 1] : undefined;
    const { results, errors, failures } = await checkAll(dir);
    for (const f of failures) {
      console.error(
        `FAIL ${f.theme}/${f.mode} ${f.kind}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1, needs ${f.min}:1`
      );
    }
    for (const e of errors) console.error(`ERROR ${e}`);
    const worst = [...results].sort((a, b) => a.ratio / a.min - b.ratio / b.min).slice(0, 5);
    console.log(`checked ${results.length} pairs; closest to the limit:`);
    for (const w of worst) {
      console.log(
        `  ${w.theme}/${w.mode} ${w.fg} on ${w.bg}: ${w.ratio.toFixed(2)}:1 (min ${w.min})`
      );
    }
    if (failures.length || errors.length) {
      console.error(`contrast: ${failures.length} pair(s) below AA, ${errors.length} error(s)`);
      process.exit(1);
    }
    console.log("contrast: every pair meets WCAG 2.2 AA");
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
