// Generates dist/ from the DTCG source: tokens.css (--hn-*), tailwind.css (Tailwind v4
// @theme), index.js + index.d.ts (TypeScript constants) and tokens.json (resolved values).
// Run: bun scripts/build.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  DENSITIES,
  MODES,
  type Mode,
  packThemes,
  type ResolvedToken,
  resolveDensities,
  resolveTokens,
  THEMES,
  type Theme,
} from "./resolve";

const DIST = resolve(import.meta.dir, "../dist");
const HEADER =
  "/* @hansenexus/tokens: generated from tokens/*.json by scripts/build.ts. Do not edit. */";

type Resolved = Record<Theme, Record<Mode, ResolvedToken[]>>;

export async function resolveAll(tokensDir?: string): Promise<Resolved> {
  const out = {} as Resolved;
  for (const theme of THEMES) {
    out[theme] = {} as Record<Mode, ResolvedToken[]>;
    for (const mode of MODES) out[theme][mode] = await resolveTokens(theme, mode, tokensDir);
  }
  return out;
}

const isModal = (t: ResolvedToken) => t.type === "color";

type TypeParts = { fontSize: string; lineHeight: string; fontWeight: number };

/** The parts of a typography token, which the CSS, Tailwind and TS outputs spread out. */
export function typeParts(t: ResolvedToken): TypeParts {
  const v = t.raw as Partial<TypeParts> | undefined;
  if (typeof v?.fontSize !== "string" || typeof v.lineHeight !== "string") {
    throw new Error(`build: ${t.path} needs fontSize and lineHeight`);
  }
  if (typeof v.fontWeight !== "number")
    throw new Error(`build: ${t.path} needs a numeric fontWeight`);
  return { fontSize: v.fontSize, lineHeight: v.lineHeight, fontWeight: v.fontWeight };
}

// A typography token becomes three properties, named the way Tailwind v4 names a --text-*
// size's companions: --hn-text-body, --hn-text-body--line-height, --hn-text-body--font-weight.
const TYPE_SUFFIXES = ["", "--line-height", "--font-weight"] as const;

function declarations(t: ResolvedToken): string[] {
  if (t.type !== "typography") return [`${t.cssVar}: ${t.value};`];
  const p = typeParts(t);
  const values = [p.fontSize, p.lineHeight, String(p.fontWeight)];
  return TYPE_SUFFIXES.map((suffix, i) => `${t.cssVar}${suffix}: ${values[i]};`);
}

function block(selector: string, tokens: ResolvedToken[], extra: string[] = []): string {
  if (tokens.length === 0 && extra.length === 0) return "";
  const lines = [...extra, ...tokens.flatMap(declarations)];
  return `${selector} {\n${lines.map((l) => `  ${l}`).join("\n")}\n}\n`;
}

type Modes = Record<Mode, ResolvedToken[]>;

/** Tokens of `own` in `mode` whose value differs from `base` (the default theme). */
function themeDiff(base: Modes, own: Modes, mode: Mode): ResolvedToken[] {
  const values = new Map(base[mode].map((t) => [t.path, t.value]));
  return own[mode].filter((t) => values.get(t.path) !== t.value);
}

/**
 * The blocks of one non-default theme: what it changes from the default theme, shared by both
 * modes under [data-theme], the rest per mode.
 */
function themeBlocks(base: Modes, own: Modes, theme: string): string[] {
  const dark = themeDiff(base, own, "dark");
  const light = themeDiff(base, own, "light");
  const lightByPath = new Map(light.map((t) => [t.path, t.value]));
  const shared = dark.filter((t) => lightByPath.get(t.path) === t.value);
  const sharedPaths = new Set(shared.map((t) => t.path));
  return [
    block(`[data-theme="${theme}"]`, shared),
    block(
      `[data-theme="${theme}"]:not([data-mode="light"])`,
      dark.filter((t) => !sharedPaths.has(t.path))
    ),
    block(
      `[data-theme="${theme}"][data-mode="light"]`,
      light.filter((t) => !sharedPaths.has(t.path))
    ),
  ];
}

export function renderCss(all: Resolved, densities: Record<string, ResolvedToken[]>): string {
  const def = all[DEFAULT_THEME];
  const out = [HEADER, ""];
  out.push(`/* Theme ${DEFAULT_THEME} is the default; set data-theme on <html> to switch. */`);
  out.push(
    block(
      `:root,\n[data-theme="${DEFAULT_THEME}"]`,
      def[DEFAULT_MODE].filter((t) => !isModal(t))
    )
  );
  for (const mode of MODES) {
    const selector =
      mode === DEFAULT_MODE ? `:root,\n[data-mode="${mode}"]` : `[data-mode="${mode}"]`;
    out.push(block(selector, def[mode].filter(isModal), [`color-scheme: ${mode};`]));
  }
  for (const theme of THEMES) {
    if (theme === DEFAULT_THEME) continue;
    out.push(...themeBlocks(def, all[theme], theme));
  }
  out.push("/* Density overrides the theme's choice. */");
  for (const d of DENSITIES) out.push(block(`[data-density="${d}"]`, densities[d] ?? []));
  return `${out.filter(Boolean).join("\n").trimEnd()}\n`;
}

// Tailwind v4 namespace per token group. Utilities read e.g. bg-hn-surface-page,
// text-hn-ink-muted, rounded-hn-md, font-hn-mono, h-hn-row, p-hn-4, shadow-hn-lift,
// ease-hn-pulse (every cubicBezier token, named after its group), text-hn-body (size, line
// height and weight of a type role).
const TAILWIND_NAMESPACE: Record<string, (rest: string) => string> = {
  color: (rest) => `--color-hn-${rest}`,
  radius: (rest) => `--radius-hn-${rest}`,
  font: (rest) => `--font-hn-${rest}`,
  space: (rest) => `--spacing-hn-${rest}`,
  size: (rest) => `--spacing-hn-${rest}`,
  shadow: (rest) => `--shadow-hn-${rest}`,
  ease: (group) => `--ease-hn-${group}`,
  text: (rest) => `--text-hn-${rest}`,
  // The recipes (design#143): shadow-hn-overlay, rounded-hn-control-dot. border.width and
  // border.style are not utilities: Tailwind's own border utilities read them (RECIPE_DEFAULTS).
  elevation: (rest) => `--shadow-hn-${rest}`,
  control: (rest) => `--radius-hn-control-${rest}`,
};

// Tailwind's bare border, border-t, divide-x and the rest take their width from
// --default-border-width, so every line in every component follows the border.width recipe.
const RECIPE_DEFAULTS = ["  --default-border-width: var(--hn-border-width);"];

// The border.style recipe: Tailwind's border utilities draw with var(--tw-border-style), whose
// registered initial value is solid. Setting it in the base layer keeps border-dashed and the
// other style utilities working (utilities win over base).
const BORDER_STYLE = [
  "@layer base {",
  "  *,",
  "  ::before,",
  "  ::after,",
  "  ::backdrop {",
  "    --tw-border-style: var(--hn-border-style);",
  "  }",
  "}",
];

// Native scrollbars (design#163): every scrolling box, the page included, draws its bars in the
// scrollbar tokens. scrollbar-color is inherited and scrollbar-width is not, so both go on every
// element. Browsers without the standard properties (Safari before 26.2) get ::-webkit-scrollbar
// instead; where the standard ones exist Chromium ignores the pseudo-elements anyway.
// Opt out with data-scrollbar="native" on a subtree or the scrollbar-native utility on one box:
// both hand the bars back to the OS.
const NATIVE = '[data-scrollbar="native"], [data-scrollbar="native"] *, .scrollbar-native';
const SCROLLBARS = [
  "@layer base {",
  "  * {",
  "    scrollbar-color: var(--hn-scrollbar-thumb) var(--hn-scrollbar-track);",
  "    scrollbar-width: var(--hn-scrollbar-width);",
  "  }",
  '  [data-scrollbar="native"],',
  '  [data-scrollbar="native"] * {',
  "    scrollbar-color: auto;",
  "    scrollbar-width: auto;",
  "  }",
  "  @supports not (scrollbar-color: auto) {",
  `    :not(${NATIVE})::-webkit-scrollbar {`,
  "      width: var(--hn-scrollbar-size);",
  "      height: var(--hn-scrollbar-size);",
  "    }",
  `    :not(${NATIVE})::-webkit-scrollbar-track,`,
  `    :not(${NATIVE})::-webkit-scrollbar-corner {`,
  "      background-color: var(--hn-scrollbar-track);",
  "    }",
  `    :not(${NATIVE})::-webkit-scrollbar-thumb {`,
  "      background-color: var(--hn-scrollbar-thumb);",
  "      border-radius: var(--hn-control-dot);",
  "    }",
  `    :not(${NATIVE})::-webkit-scrollbar-thumb:hover {`,
  "      background-color: var(--hn-scrollbar-thumb-hover);",
  "    }",
  "  }",
  "}",
  "@utility scrollbar-native {",
  "  scrollbar-color: auto;",
  "  scrollbar-width: auto;",
  "}",
];

// Tailwind's own rounded-sm/md/lg/xl read the token of the same name, so web and Swift say the
// same step for the same value (HNRadius.lg is rounded-lg, design#140). This replaces Tailwind's
// default radii for those four steps; rounded-full and the rest stay Tailwind's.
const RADIUS_ALIASES = new Set(["sm", "md", "lg", "xl"]);

// The loading animations from the motion tokens: animate-hn-pulse (skeleton base to highlight)
// and animate-hn-spin. Keyframes move between token values only; motion-reduce:animate-none
// switches them off. Shimmer has tokens but no animation: its sweep needs a gradient, which the
// brand rules forbid; the skeleton-style vote chose pulse (packages/ui/decisions).
const ANIMATIONS = [
  "  --animate-hn-pulse: hn-pulse var(--hn-pulse-duration) var(--hn-pulse-easing) infinite;",
  "  --animate-hn-spin: hn-spin var(--hn-spin-duration) var(--hn-spin-easing) infinite;",
  "",
  "  @keyframes hn-pulse {",
  "    50% {",
  "      background-color: var(--hn-skeleton-highlight);",
  "    }",
  "  }",
  "  @keyframes hn-spin {",
  "    to {",
  "      transform: rotate(1turn);",
  "    }",
  "  }",
];

// motion-reduce: and motion-safe: follow the OS setting, as Tailwind's own do, and also a
// data-reduced-motion attribute on the element or an ancestor, so an app (or the gallery's motion
// switch) can force reduced motion whatever the OS says. Without the attribute nothing changes.
const MOTION_VARIANTS = [
  "@custom-variant motion-reduce {",
  "  @media (prefers-reduced-motion: reduce) {",
  "    @slot;",
  "  }",
  "  &:where([data-reduced-motion], [data-reduced-motion] *) {",
  "    @slot;",
  "  }",
  "}",
  "@custom-variant motion-safe {",
  "  @media (prefers-reduced-motion: no-preference) {",
  "    &:not(:where([data-reduced-motion], [data-reduced-motion] *)) {",
  "      @slot;",
  "    }",
  "  }",
  "}",
];

export function renderTailwind(all: Resolved): string {
  const lines: string[] = [];
  for (const t of all[DEFAULT_THEME][DEFAULT_MODE]) {
    const [group = "", ...rest] = t.path.split(".");
    const ns = isModal(t) ? "color" : t.type === "cubicBezier" ? "ease" : group;
    const name = TAILWIND_NAMESPACE[ns]?.(
      isModal(t) ? t.path.replaceAll(".", "-") : ns === "ease" ? group : rest.join("-")
    );
    if (!name) continue;
    if (t.type === "typography") {
      for (const suffix of TYPE_SUFFIXES)
        lines.push(`  ${name}${suffix}: var(${t.cssVar}${suffix});`);
    } else {
      lines.push(`  ${name}: var(${t.cssVar});`);
    }
  }
  for (const t of all[DEFAULT_THEME][DEFAULT_MODE]) {
    const [group, key = ""] = t.path.split(".");
    if (group === "radius" && RADIUS_ALIASES.has(key)) {
      lines.push(`  --radius-${key}: var(${t.cssVar});`);
    }
  }
  lines.push(...RECIPE_DEFAULTS, "", ...ANIMATIONS);
  return [
    HEADER,
    '/* Import after tailwindcss: @import "tailwindcss"; @import "@hansenexus/tokens/tailwind.css"; */',
    '@import "./tokens.css";',
    "",
    "@theme inline {",
    ...lines,
    "}",
    "",
    ...MOTION_VARIANTS,
    "",
    ...BORDER_STYLE,
    "",
    ...SCROLLBARS,
    "",
  ].join("\n");
}

type Tree = { [key: string]: string | Tree };

/** "200ms" or "0.2s" in milliseconds. */
export function parseDuration(value: string): number {
  const m = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value);
  if (!m?.[1]) throw new Error(`build: ${value} is not a ms or s duration`);
  return Number(m[1]) * (m[2] === "s" ? 1000 : 1);
}

type NumberTree = { [key: string]: number | NumberTree };

function numbers(tree: Tree): NumberTree {
  return Object.fromEntries(
    Object.entries(tree).map(([k, v]) => [k, typeof v === "string" ? Number(v) : numbers(v)])
  );
}

function toTree(tokens: ResolvedToken[], pick: (t: ResolvedToken) => string | Tree): Tree {
  const root: Tree = {};
  for (const t of tokens) {
    const parts = t.path.split(".");
    const leaf = parts.pop() ?? "";
    let node = root;
    for (const p of parts) {
      const next = node[p];
      if (typeof next === "object") node = next;
      else node = node[p] = {};
    }
    node[leaf] = pick(t);
  }
  return root;
}

function toType(value: unknown, indent = ""): string {
  if (typeof value === "string" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `readonly [${value.map((v) => toType(v, indent)).join(", ")}]`;
  const inner = `${indent}  `;
  const entries = Object.entries(value as Record<string, unknown>).map(
    ([k, v]) => `${inner}readonly ${JSON.stringify(k)}: ${toType(v, inner)};`
  );
  return `{\n${entries.join("\n")}\n${indent}}`;
}

/** A typography token as { size, lineHeight, weight }; other tokens as their CSS value. */
function tsValue(t: ResolvedToken): string | Tree {
  if (t.type !== "typography") return t.value;
  const p = typeParts(t);
  return { size: p.fontSize, lineHeight: p.lineHeight, weight: String(p.fontWeight) };
}

function tsVar(t: ResolvedToken): string | Tree {
  if (t.type !== "typography") return `var(${t.cssVar})`;
  const [size, lineHeight, weight] = TYPE_SUFFIXES.map((s) => `var(${t.cssVar}${s})`);
  return { size: size ?? "", lineHeight: lineHeight ?? "", weight: weight ?? "" };
}

export function renderTs(all: Resolved, densities: Record<string, ResolvedToken[]>) {
  const values: Record<string, Record<string, Tree>> = {};
  for (const theme of THEMES) {
    values[theme] = {};
    for (const mode of MODES) values[theme][mode] = toTree(all[theme][mode], tsValue);
  }
  const vars = toTree(all[DEFAULT_THEME][DEFAULT_MODE], tsVar);
  const density: Record<string, Tree> = {};
  for (const d of DENSITIES) {
    density[d] = Object.fromEntries(
      (densities[d] ?? []).map((t) => [t.path.split(".").pop(), t.value])
    );
  }
  const durations = all[DEFAULT_THEME][DEFAULT_MODE].filter((t) => t.type === "duration");
  const ms = toTree(durations, (t) => String(parseDuration(t.value)));
  const exports: [string, string, unknown][] = [
    ["themes", "Theme names, the values of data-theme.", [...THEMES]],
    ["modes", "Mode names, the values of data-mode.", [...MODES]],
    ["densities", "Density names, the values of data-density.", [...DENSITIES]],
    ["defaultTheme", "Theme applied at :root.", DEFAULT_THEME],
    ["defaultMode", "Mode applied at :root.", DEFAULT_MODE],
    [
      "tokens",
      "Resolved values per theme and mode, e.g. tokens.kommandant.dark.status.crit.",
      values,
    ],
    ["vars", "CSS variable references that follow the active theme, mode and density.", vars],
    ["density", "Row height and minimum target per density.", density],
    ["ms", "Every duration in milliseconds, for timers, e.g. ms.delay.pending = 200.", numbers(ms)],
  ];
  const js = [
    HEADER,
    ...exports.map(
      ([name, doc, v]) => `/** ${doc} */\nexport const ${name} = ${JSON.stringify(v, null, 2)};`
    ),
    "",
  ].join("\n");
  const dts = [
    HEADER,
    ...exports.map(
      ([name, doc, v]) => `/** ${doc} */\nexport declare const ${name}: ${toType(v)};`
    ),
    "export type Theme = (typeof themes)[number];",
    "export type Mode = (typeof modes)[number];",
    "export type Density = (typeof densities)[number];",
    "",
  ].join("\n");
  return { js, dts };
}

export async function build(tokensDir?: string, dist = DIST) {
  const all = await resolveAll(tokensDir);
  const densities = await resolveDensities(tokensDir);
  mkdirSync(dist, { recursive: true });
  writeFileSync(resolve(dist, "tokens.css"), renderCss(all, densities));
  writeFileSync(resolve(dist, "tailwind.css"), renderTailwind(all));
  const { js, dts } = renderTs(all, densities);
  writeFileSync(resolve(dist, "index.js"), js);
  writeFileSync(resolve(dist, "index.d.ts"), dts);
  const noRaw = (key: string, v: unknown) => (key === "raw" ? undefined : v);
  writeFileSync(resolve(dist, "tokens.json"), `${JSON.stringify(all, noRaw, 2)}\n`);
  return all;
}

async function resolveModes(theme: string, tokensDir?: string, packsDir?: string): Promise<Modes> {
  const out = {} as Modes;
  for (const mode of MODES) out[mode] = await resolveTokens(theme, mode, tokensDir, packsDir);
  return out;
}

/**
 * The theme.css of @hansenexus/theme-<app> (design#143): every direction of the pack as
 * [data-theme] blocks over the default theme, in the shape tokens.css gives a bundled theme.
 * Load it after @hansenexus/tokens' tokens.css (tailwind.css imports that).
 */
export async function renderPackCss(app: string, tokensDir?: string, packsDir?: string) {
  const directions = packThemes(packsDir).filter((p) => p.app === app);
  if (directions.length === 0) throw new Error(`build: no pack named ${app}`);
  const base = await resolveModes(DEFAULT_THEME, tokensDir, packsDir);
  const out = [
    `/* @hansenexus/theme-${app}: generated from themes/${app} by @hansenexus/tokens scripts/build.ts. Do not edit. */`,
    "/* Load after @hansenexus/tokens/tokens.css; set data-theme to a direction's id. */",
    "",
  ];
  for (const p of directions) {
    out.push(`/* ${p.direction}${p.isDefault ? " (default)" : ""} */`);
    out.push(...themeBlocks(base, await resolveModes(p.id, tokensDir, packsDir), p.id));
  }
  return `${out.filter(Boolean).join("\n").trimEnd()}\n`;
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    const pack = args.indexOf("--pack");
    if (pack >= 0) {
      // bun scripts/build.ts --pack <app> --out <dir>: a theme package's theme.css.
      const app = args[pack + 1] ?? "";
      const outArg = args.indexOf("--out");
      const out = resolve(outArg >= 0 ? (args[outArg + 1] ?? ".") : ".");
      mkdirSync(out, { recursive: true });
      writeFileSync(resolve(out, "theme.css"), await renderPackCss(app));
      console.log(`built ${resolve(out, "theme.css")}`);
      process.exit(0);
    }
    await build();
    console.log(`built ${DIST}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
