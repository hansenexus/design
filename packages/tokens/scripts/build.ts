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

function block(selector: string, tokens: ResolvedToken[], extra: string[] = []): string {
  if (tokens.length === 0 && extra.length === 0) return "";
  const lines = [...extra, ...tokens.map((t) => `${t.cssVar}: ${t.value};`)];
  return `${selector} {\n${lines.map((l) => `  ${l}`).join("\n")}\n}\n`;
}

/** Tokens of `theme` in `mode` whose value differs from the default theme. */
function themeDiff(all: Resolved, theme: Theme, mode: Mode): ResolvedToken[] {
  const base = new Map(all[DEFAULT_THEME][mode].map((t) => [t.path, t.value]));
  return all[theme][mode].filter((t) => base.get(t.path) !== t.value);
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
    const dark = themeDiff(all, theme, "dark");
    const light = themeDiff(all, theme, "light");
    const lightByPath = new Map(light.map((t) => [t.path, t.value]));
    const shared = dark.filter((t) => lightByPath.get(t.path) === t.value);
    const sharedPaths = new Set(shared.map((t) => t.path));
    out.push(block(`[data-theme="${theme}"]`, shared));
    out.push(
      block(
        `[data-theme="${theme}"]:not([data-mode="light"])`,
        dark.filter((t) => !sharedPaths.has(t.path))
      )
    );
    out.push(
      block(
        `[data-theme="${theme}"][data-mode="light"]`,
        light.filter((t) => !sharedPaths.has(t.path))
      )
    );
  }
  out.push("/* Density overrides the theme's choice. */");
  for (const d of DENSITIES) out.push(block(`[data-density="${d}"]`, densities[d] ?? []));
  return `${out.filter(Boolean).join("\n").trimEnd()}\n`;
}

// Tailwind v4 namespace per token group. Utilities read e.g. bg-hn-surface-page,
// text-hn-ink-muted, rounded-hn-md, font-hn-mono, h-hn-row, p-hn-4, shadow-hn-lift,
// ease-hn-pulse (every cubicBezier token, named after its group).
const TAILWIND_NAMESPACE: Record<string, (rest: string) => string> = {
  color: (rest) => `--color-hn-${rest}`,
  radius: (rest) => `--radius-hn-${rest}`,
  font: (rest) => `--font-hn-${rest}`,
  space: (rest) => `--spacing-hn-${rest}`,
  size: (rest) => `--spacing-hn-${rest}`,
  shadow: (rest) => `--shadow-hn-${rest}`,
  ease: (group) => `--ease-hn-${group}`,
};

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
    if (name) lines.push(`  ${name}: var(${t.cssVar});`);
  }
  lines.push("", ...ANIMATIONS);
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

function toTree(tokens: ResolvedToken[], pick: (t: ResolvedToken) => string): Tree {
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

export function renderTs(all: Resolved, densities: Record<string, ResolvedToken[]>) {
  const values: Record<string, Record<string, Tree>> = {};
  for (const theme of THEMES) {
    values[theme] = {};
    for (const mode of MODES) values[theme][mode] = toTree(all[theme][mode], (t) => t.value);
  }
  const vars = toTree(all[DEFAULT_THEME][DEFAULT_MODE], (t) => `var(${t.cssVar})`);
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

if (import.meta.main) {
  try {
    await build();
    console.log(`built ${DIST}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
