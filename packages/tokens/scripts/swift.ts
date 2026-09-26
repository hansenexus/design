// Generates the SwiftPM package's token file, swift/Sources/HansenexusTokens/Tokens.swift,
// from the same Style Dictionary resolution as dist/. The file is committed so the Apple
// client can add the package by git tag; the tests fail when it is stale.
// Run: bun scripts/swift.ts          (write)
//      bun scripts/swift.ts --check  (exit 1 when the committed file differs)
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveAll } from "./build";
import {
  DEFAULT_MODE,
  DEFAULT_THEME,
  DENSITIES,
  MODES,
  type Mode,
  type ResolvedToken,
  resolveDensities,
  THEMES,
  type Theme,
} from "./resolve";

export const SWIFT_OUT = resolve(
  import.meta.dir,
  "../../../swift/Sources/HansenexusTokens/Tokens.swift"
);

type Resolved = Record<Theme, Record<Mode, ResolvedToken[]>>;

const HEADER = [
  "// @hansenexus/tokens: generated from packages/tokens/tokens/*.json by",
  "// packages/tokens/scripts/swift.ts. Do not edit; run `bun run swift` after a token change.",
  "// Semantic tier only: the raw palette never reaches Swift.",
];

// Group name -> Swift type for the groups that are not colours.
const TYPE_NAME: Record<string, string> = {
  space: "HNSpace",
  radius: "HNRadius",
  font: "HNFontFamily",
  duration: "HNDuration",
  focus: "HNFocus",
  shadow: "HNShadow",
  size: "HNSize",
};

const GROUP_DOC: Record<string, string> = {
  space: "Spacing scale in points (1 CSS px is 1 pt). `s4` is `--hn-space-4`.",
  radius: "Corner radii in points.",
  font: "Font family stacks, first choice first. `Font.hn` in SwiftUI resolves them.",
  duration: "Animation durations in seconds. Motion only on real events.",
  focus: "Focus ring geometry in points. The ring colour is `HNColors.focus.ring`.",
  size: "Row height and minimum target in points, per theme or per density.",
};

const SWIFT_KEYWORDS = new Set(["default", "case", "func", "let", "var", "in", "is", "self"]);

function ident(key: string, prefix = "s"): string {
  const camel = key.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
  const id = /^[0-9]/.test(camel) ? `${prefix}${camel}` : camel;
  return SWIFT_KEYWORDS.has(id) ? `\`${id}\`` : id;
}

const pascal = (key: string) => {
  const id = ident(key).replaceAll("`", "");
  return id.charAt(0).toUpperCase() + id.slice(1);
};

function fail(t: ResolvedToken, why: string): never {
  throw new Error(`swift: ${t.path} (${t.type}) ${why}: ${JSON.stringify(t.raw)}`);
}

function number(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(6)));
}

function points(t: ResolvedToken, v: unknown): string {
  const m = typeof v === "string" ? /^(-?\d+(?:\.\d+)?)px$/.exec(v) : null;
  if (!m?.[1]) fail(t, "is not a px dimension");
  return number(Number(m[1]));
}

function rgba(t: ResolvedToken, v: unknown): string {
  const m = typeof v === "string" ? /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v) : null;
  if (!m?.[1]) fail(t, "is not a #rrggbb or #rrggbbaa colour");
  const rgb = `0x${m[1].toUpperCase()}`;
  return m[2] ? `HNRGBA(${rgb}, alpha: 0x${m[2].toUpperCase()})` : `HNRGBA(${rgb})`;
}

/** Swift type and literal for one token. */
function swiftValue(t: ResolvedToken): [string, string] {
  const v = t.raw;
  switch (t.type) {
    case "color":
      return ["HNRGBA", rgba(t, v)];
    case "dimension":
      return ["Double", points(t, v)];
    case "duration": {
      const m = typeof v === "string" ? /^(\d+(?:\.\d+)?)(ms|s)$/.exec(v) : null;
      if (!m?.[1]) fail(t, "is not a ms or s duration");
      return ["Double", number(Number(m[1]) / (m[2] === "ms" ? 1000 : 1))];
    }
    case "fontFamily": {
      const list = Array.isArray(v) ? v : [v];
      if (!list.every((f) => typeof f === "string")) fail(t, "is not a family stack");
      return ["[String]", `[${list.map((f) => JSON.stringify(f)).join(", ")}]`];
    }
    case "shadow": {
      const s = v as Record<string, unknown>;
      if (!s || typeof s !== "object" || Array.isArray(s)) fail(t, "is not a single shadow");
      const args = [
        `color: ${rgba(t, s.color)}`,
        `x: ${points(t, s.offsetX)}`,
        `y: ${points(t, s.offsetY)}`,
        `blur: ${points(t, s.blur)}`,
        `spread: ${points(t, s.spread)}`,
      ];
      return ["HNShadowValue", `HNShadowValue(${args.join(", ")})`];
    }
    default:
      fail(t, "has a $type the Swift output does not know");
  }
}

function doc(text: string | undefined, indent: string): string[] {
  return text ? [`${indent}/// ${text}`] : [];
}

/** Splits "group.key" and refuses deeper paths, which no Swift shape here covers. */
function split(t: ResolvedToken): [string, string] {
  const parts = t.path.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) fail(t, "is not a group.key path");
  return [parts[0], parts[1]];
}

function groupBy(tokens: ResolvedToken[]): Map<string, ResolvedToken[]> {
  const out = new Map<string, ResolvedToken[]>();
  for (const t of tokens) {
    const [group] = split(t);
    out.set(group, [...(out.get(group) ?? []), t]);
  }
  return out;
}

const signature = (tokens: ResolvedToken[]) => tokens.map((t) => `${t.path}:${t.type}`).join("\n");

function renderColors(all: Resolved): string[] {
  const shape = all[DEFAULT_THEME][DEFAULT_MODE].filter((t) => t.type === "color");
  for (const theme of THEMES) {
    for (const mode of MODES) {
      const got = all[theme][mode].filter((t) => t.type === "color");
      if (signature(got) !== signature(shape)) {
        throw new Error(`swift: ${theme}/${mode} colour names differ from ${DEFAULT_THEME}/dark`);
      }
    }
  }
  const groups = groupBy(shape);
  const out = [
    "/// Semantic colours of one theme in one mode. Every theme and mode carries the same names.",
    "/// In SwiftUI, `Color.hn(theme)` follows the system appearance instead of a fixed mode.",
    "public struct HNColors: Sendable, Equatable {",
  ];
  for (const [group, tokens] of groups) {
    out.push(`  public struct ${pascal(group)}: Sendable, Equatable {`);
    for (const t of tokens) {
      out.push(...doc(t.description, "    "), `    public let ${ident(split(t)[1])}: HNRGBA`);
    }
    out.push("  }", "");
  }
  for (const group of groups.keys()) out.push(`  public let ${ident(group)}: ${pascal(group)}`);
  out.push(
    "",
    "  /// The colours of `theme` in `mode`.",
    "  public static func of(_ theme: HNTheme, _ mode: HNMode) -> HNColors {",
    "    switch (theme, mode) {"
  );
  for (const theme of THEMES) {
    for (const mode of MODES) {
      out.push(`    case (.${theme}, .${mode}): return ${theme}${pascal(mode)}`);
    }
  }
  out.push("    }", "  }");
  for (const theme of THEMES) {
    for (const mode of MODES) {
      const byGroup = groupBy(all[theme][mode].filter((t) => t.type === "color"));
      out.push("", `  static let ${theme}${pascal(mode)} = HNColors(`);
      const entries = [...byGroup].map(([group, tokens]) => {
        const fields = tokens.map((t) => `      ${ident(split(t)[1])}: ${swiftValue(t)[1]}`);
        return `    ${ident(group)}: ${pascal(group)}(\n${fields.join(",\n")}\n    )`;
      });
      out.push(entries.join(",\n"), "  )");
    }
  }
  out.push("}");
  return out;
}

/** A group with the same values in every theme and mode: a namespace of constants. */
function renderShared(group: string, tokens: ResolvedToken[]): string[] {
  const out = [...doc(GROUP_DOC[group], ""), `public enum ${TYPE_NAME[group]} {`];
  tokens.forEach((t, i) => {
    const [type, value] = swiftValue(t);
    if (i > 0) out.push("");
    out.push(
      ...doc(t.description, "  "),
      `  public static let ${ident(split(t)[1])}: ${type} = ${value}`
    );
  });
  out.push("}");
  return out;
}

/** A group that differs per theme (today only size): a struct, per theme and per density. */
function renderPerTheme(
  group: string,
  all: Resolved,
  densities: Record<string, ResolvedToken[]>
): string[] {
  const name = TYPE_NAME[group];
  const pick = (tokens: ResolvedToken[]) =>
    tokens.filter((t) => t.type !== "color" && split(t)[0] === group);
  const shape = pick(all[DEFAULT_THEME][DEFAULT_MODE]);
  const init = (tokens: ResolvedToken[]) =>
    `${name}(${tokens.map((t) => `${ident(split(t)[1])}: ${swiftValue(t)[1]}`).join(", ")})`;
  const out = [...doc(GROUP_DOC[group], ""), `public struct ${name}: Sendable, Equatable {`];
  for (const t of shape) {
    out.push(`  public let ${ident(split(t)[1])}: ${swiftValue(t)[0]}`);
  }
  out.push(
    "",
    "  /// The theme's own density.",
    `  public static func of(_ theme: HNTheme) -> ${name} {`,
    "    switch theme {"
  );
  for (const theme of THEMES) {
    out.push(`    case .${theme}: return ${init(pick(all[theme][DEFAULT_MODE]))}`);
  }
  out.push("    }", "  }");
  if (group === "size") {
    out.push(
      "",
      "  /// A density chosen over the theme's, like data-density on the web.",
      `  public static func of(_ density: HNDensity) -> ${name} {`,
      "    switch density {"
    );
    for (const d of DENSITIES) {
      const tokens = densities[d] ?? [];
      if (signature(tokens) !== signature(shape)) throw new Error(`swift: density ${d} != size`);
      out.push(`    case .${d}: return ${init(tokens)}`);
    }
    out.push("    }", "  }");
  }
  out.push("}");
  return out;
}

function renderEnum(name: string, docText: string, cases: readonly string[], def: string) {
  return [
    `/// ${docText}`,
    `public enum ${name}: String, CaseIterable, Sendable {`,
    ...cases.map((c) => `  case ${c}`),
    "",
    `  public static let \`default\`: ${name} = .${def}`,
    "}",
  ];
}

export function renderSwift(all: Resolved, densities: Record<string, ResolvedToken[]>): string {
  const sections: string[][] = [
    renderEnum("HNTheme", "Themes, the values of data-theme on the web.", THEMES, DEFAULT_THEME),
    renderEnum("HNMode", "Modes, the values of data-mode on the web.", MODES, DEFAULT_MODE),
    [
      "/// Densities, the values of data-density on the web.",
      "public enum HNDensity: String, CaseIterable, Sendable {",
      ...DENSITIES.map((d) => `  case ${d}`),
      "}",
    ],
    renderColors(all),
  ];
  const other = groupBy(all[DEFAULT_THEME][DEFAULT_MODE].filter((t) => t.type !== "color"));
  for (const [group, tokens] of other) {
    if (!TYPE_NAME[group]) throw new Error(`swift: group ${group} has no Swift type name`);
    const values = (theme: Theme, mode: Mode) =>
      signature(all[theme][mode].filter((t) => t.path.startsWith(`${group}.`))) +
      all[theme][mode]
        .filter((t) => t.path.startsWith(`${group}.`) && t.type !== "color")
        .map((t) => JSON.stringify(t.raw))
        .join();
    const base = values(DEFAULT_THEME, DEFAULT_MODE);
    const perMode = THEMES.some((th) => values(th, "dark") !== values(th, "light"));
    if (perMode) throw new Error(`swift: ${group} differs between modes; only colours may`);
    const shared = THEMES.every((th) => values(th, DEFAULT_MODE) === base);
    sections.push(shared ? renderShared(group, tokens) : renderPerTheme(group, all, densities));
  }
  return `${[HEADER, ...sections].map((s) => s.join("\n")).join("\n\n")}\n`;
}

export async function generateSwift(tokensDir?: string): Promise<string> {
  return renderSwift(await resolveAll(tokensDir), await resolveDensities(tokensDir));
}

if (import.meta.main) {
  try {
    const swift = await generateSwift();
    if (process.argv.includes("--check")) {
      if (readFileSync(SWIFT_OUT, "utf8") !== swift) {
        console.error(`swift: ${SWIFT_OUT} is stale; run bun run swift and commit it`);
        process.exit(1);
      }
      console.log("swift: Tokens.swift is up to date");
    } else {
      writeFileSync(SWIFT_OUT, swift);
      console.log(`wrote ${SWIFT_OUT}`);
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
