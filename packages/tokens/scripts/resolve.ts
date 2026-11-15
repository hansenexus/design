// Resolves the DTCG source with Style Dictionary, one pass per theme and mode.
// Primitives (tokens/primitives/, a pack's palette.json) take part in resolution but are
// filtered out of every output: components only ever see the semantic tier.
//
// A theme is either a core theme (tokens/themes/<theme>.json) or a theme pack direction
// (<repo>/themes/<app>/<direction>/, design#143). Packs are discovered from pack.json.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import StyleDictionary from "style-dictionary";

/** The themes @hansenexus/tokens owns: tokens/themes/<theme>.json. */
export const CORE_THEMES = ["hansenexus", "kommandant", "portal"] as const;
/**
 * Pack themes still built into @hansenexus/tokens (tokens.css, the TS constants, Swift) until
 * their app moves to its @hansenexus/theme-<app> package. Every other pack ships only there.
 */
export const BUNDLED_PACKS = ["lexilink"] as const;
/** The themes of @hansenexus/tokens: the core plus the bundled packs. */
export const THEMES = [...CORE_THEMES, ...BUNDLED_PACKS] as const;
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
  /** CSS value; for a typography token the JSON of its parts, so theme diffs still compare. */
  value: string;
  /** Resolved DTCG value before CSS transforms: arrays and objects stay structured. */
  raw: unknown;
  description?: string;
};

export const TOKENS_DIR = resolve(import.meta.dir, "../tokens");
/** The theme packs: themes/<app>/pack.json plus one folder per direction. */
export const PACKS_DIR = resolve(import.meta.dir, "../../../themes");

export type PackManifest = {
  /** The app, and the package name: @hansenexus/theme-<app>. */
  app: string;
  /** The direction the package ships; its data-theme is the app name. */
  default: string;
  description?: string;
};

export type PackTheme = {
  /** The data-theme value: <app> for the default direction, <app>-<direction> otherwise. */
  id: string;
  app: string;
  direction: string;
  /** Absolute path of themes/<app>/<direction>. */
  dir: string;
  isDefault: boolean;
};

/** Every pack direction under `packsDir`: by app, the default direction first. */
export function packThemes(packsDir: string = PACKS_DIR): PackTheme[] {
  if (!existsSync(packsDir)) return [];
  const out: PackTheme[] = [];
  for (const app of readdirSync(packsDir).sort()) {
    const manifestPath = join(packsDir, app, "pack.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PackManifest;
    if (manifest.app !== app) throw new Error(`pack ${app}: pack.json names app ${manifest.app}`);
    const directions = readdirSync(join(packsDir, app), { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(packsDir, app, d.name, "tokens.json")))
      .map((d) => d.name)
      .sort((a, b) => Number(b === manifest.default) - Number(a === manifest.default));
    if (!directions.includes(manifest.default)) {
      throw new Error(`pack ${app}: default direction ${manifest.default} has no tokens.json`);
    }
    for (const direction of directions) {
      const isDefault = direction === manifest.default;
      out.push({
        id: isDefault ? app : `${app}-${direction}`,
        app,
        direction,
        dir: join(packsDir, app, direction),
        isDefault,
      });
    }
  }
  return out;
}

/** Every theme the checks cover: the core themes and every pack direction. */
export function allThemes(packsDir: string = PACKS_DIR): string[] {
  return [...CORE_THEMES, ...packThemes(packsDir).map((p) => p.id)];
}

const isPrimitive = (filePath: string) =>
  filePath.includes("/primitives/") || basename(filePath) === "palette.json";

/** The files that define `theme` in `mode` on top of the shared tiers. */
function themeSources(theme: string, mode: Mode, tokensDir: string, packsDir: string) {
  if ((CORE_THEMES as readonly string[]).includes(theme)) {
    const source = [join(tokensDir, `themes/${theme}.json`)];
    // Optional per-mode theme overrides, e.g. themes/kommandant.dark.json.
    const modeOverride = join(tokensDir, `themes/${theme}.${mode}.json`);
    if (existsSync(modeOverride)) source.push(modeOverride);
    return { palette: [], source };
  }
  const pack = packThemes(packsDir).find((p) => p.id === theme);
  if (!pack) throw new Error(`resolve: no core theme or pack direction named ${theme}`);
  // A direction: palette.json (its primitives), tokens.json and tokens.<mode>.json.
  const palette = [join(pack.dir, "palette.json")].filter((f) => existsSync(f));
  const source = [join(pack.dir, "tokens.json")];
  const modeOverride = join(pack.dir, `tokens.${mode}.json`);
  if (existsSync(modeOverride)) source.push(modeOverride);
  return { palette, source };
}

export async function resolveTokens(
  theme: string,
  mode: Mode,
  tokensDir: string = TOKENS_DIR,
  packsDir: string = PACKS_DIR
): Promise<ResolvedToken[]> {
  const { palette, source } = themeSources(theme, mode, tokensDir, packsDir);
  // The shared tiers are `include`, the theme `source`: a theme may override a shared token
  // without a collision error, while two files within either list still may not collide.
  const include = [
    join(tokensDir, "primitives/*.json"),
    ...palette,
    join(tokensDir, "semantic/scale.json"),
    join(tokensDir, "semantic/recipe.json"),
    join(tokensDir, "semantic/motion.json"),
    join(tokensDir, "semantic/type.json"),
    join(tokensDir, `semantic/color.${mode}.json`),
  ];

  const sd = new StyleDictionary({
    include,
    source,
    usesDtcg: true,
    log: { verbosity: "silent", warnings: "error" },
    platforms: {
      css: {
        prefix: "hn",
        transforms: [
          "name/kebab",
          "color/css",
          "fontFamily/css",
          "cubicBezier/css",
          "shadow/css/shorthand",
        ],
      },
      // No value transforms: references resolved, values as authored (the Swift output).
      raw: { transforms: [] },
    },
  });
  const { allTokens } = await sd.getPlatformTokens("css");
  const raw = new Map(
    (await sd.getPlatformTokens("raw")).allTokens.map((t) => [t.path.join("."), t.$value])
  );
  return allTokens
    .filter((t) => !isPrimitive(t.filePath))
    .map((t) => ({
      path: t.path.join("."),
      cssVar: `--${t.name}`,
      type: String(t.$type),
      value: t.$type === "typography" ? JSON.stringify(t.$value) : String(t.$value),
      raw: raw.get(t.path.join(".")),
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
          raw: t.$value,
        };
      });
  }
  return out;
}
