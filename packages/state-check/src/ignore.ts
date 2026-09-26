// `// state-coverage-ignore: <reason>` is the only opt-out. It suppresses a violation reported on
// its own line or on the line below, and the reason is mandatory: a directive without one is an
// error that no baseline can absorb.

export type Directive = { file: string; line: number; reason: string };

const DIRECTIVE = /\/\/\s*state-coverage-ignore\b(.*)$/;

/** Every directive in `text`, valid (non-empty reason after a colon) or not. */
export function directives(
  file: string,
  text: string
): { valid: Directive[]; invalid: Directive[] } {
  const valid: Directive[] = [];
  const invalid: Directive[] = [];
  text.split("\n").forEach((line, i) => {
    const m = DIRECTIVE.exec(line);
    if (!m) return;
    const rest = (m[1] ?? "").trim();
    const reason = rest.startsWith(":") ? rest.slice(1).trim() : "";
    (reason ? valid : invalid).push({ file, line: i + 1, reason });
  });
  return { valid, invalid };
}

/** The directive that covers a violation at `line` in `file`, if any. */
export function covering(list: Directive[], file: string, line: number): Directive | undefined {
  return list.find((d) => d.file === file && (d.line === line || d.line === line - 1));
}
