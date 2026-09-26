// Resolves the DTCG source with Style Dictionary, one pass per theme and mode.
// Primitives (tokens/primitives/) take part in resolution but are filtered out
// of every output: components only ever see the semantic tier.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import StyleDictionary from "style-dictionary";

export const THEMES = ["hansenexus", "kommandant", "portal"] as const;
export const MODES = ["dark", "light"] as const;
export const DENSITIES = ["compact", "comfortable", "touch"] as const;
export const DEFAULT_THEME = "hansenexus";
export const DEFAULT_MODE = "dark";

export type Theme = (typeof THEMES)[number];
export type Mode = (typeof MODES)[number];

export type ResolvedToken = {
  /** Dotted path, e.g. "surface.page". */
  path: string;
  /** CSS custom property name, e.g. "--hn-surface-page". */
  cssVar: string;
  type: string;
  value: string;
  description?: string;
};

export const TOKENS_DIR = resolve(import.meta.dir, "../tokens");

const isPrimitive = (filePath: string) => filePath.includes("/primitives/");

export async function resolveTokens(
  theme: Theme,
  mode: Mode,
  tokensDir: string = TOKENS_DIR
): Promise<ResolvedToken[]> {
  const source = [
    join(tokensDir, "primitives/*.json"),
    join(tokensDir, "semantic/scale.json"),
    join(tokensDir, `semantic/color.${mode}.json`),
    join(tokensDir, `themes/${theme}.json`),
  ];
  // Optional per-mode theme overrides, e.g. themes/portal.light.json.
  const modeOverride = join(tokensDir, `themes/${theme}.${mode}.json`);
  if (existsSync(modeOverride)) source.push(modeOverride);

  const sd = new StyleDictionary({
    source,
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "error" },
    platforms: {
      css: {
        prefix: "hn",
        transforms: ["name/kebab", "color/css", "fontFamily/css", "shadow/css/shorthand"],
      },
    },
  });
  const { allTokens } = await sd.getPlatformTokens("css");
  return allTokens
    .filter((t) => !isPrimitive(t.filePath))
    .map((t) => ({
      path: t.path.join("."),
      cssVar: `--${t.name}`,
      type: String(t.$type),
      value: String(t.$value),
      ...(t.$description ? { description: String(t.$description) } : {}),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "en", { numeric: true }));
}

/** Density scales, resolved from tokens/primitives/density.json. */
export async function resolveDensities(
  tokensDir: string = TOKENS_DIR
): Promise<Record<string, ResolvedToken[]>> {
  const sd = new StyleDictionary({
    source: [join(tokensDir, "primitives/density.json")],
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "error" },
    platforms: { css: { prefix: "hn", transforms: ["name/kebab"] } },
  });
  const { allTokens } = await sd.getPlatformTokens("css");
  const out: Record<string, ResolvedToken[]> = {};
  for (const d of DENSITIES) {
    out[d] = allTokens
      .filter((t) => t.path[1] === d)
      .map((t) => {
        // density.compact.row -> size.row, the name themes publish it under.
        const key = t.path.slice(2).join("-");
        return {
          path: `size.${key}`,
          cssVar: `--hn-size-${key}`,
          type: String(t.$type),
          value: String(t.$value),
        };
      });
  }
  return out;
}
