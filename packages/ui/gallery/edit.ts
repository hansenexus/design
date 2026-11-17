// The workbench's live editor (design#151, ruling dec_2026-11-15_global-design-theme-packs-gallery-
// workbench point 5): a draft of one pack direction's token and recipe values and of the skin each
// slot uses, applied to the canvas as it is typed, then written back. Pure apart from the draft
// store, so tests/editor.test.ts covers it without a browser.
//
// The draft lives in localStorage, so the viewport iframe and the matrix cells (same origin) draw
// it too and follow every change through the storage event. Writing it back mirrors the vote
// board's Decide (gallery/decide.ts): on the local server (`bun run gallery -- --serve`) a POST to
// EDIT_PATH runs applyDraft() from scripts/edit.ts in that checkout; on the hosted gallery (nothing
// writes there) the control opens a prefilled issue carrying the draft and the command an agent
// runs (`bun run edit apply <draft> --pr`). Only pack directions are editable, never core themes.

import type { ThemePackDefinition } from "../src";
import { REPO } from "./decide";

export const EDIT_PATH = "/api/edit";

/** A token edit applies to both modes (tokens.json) or to one (tokens.<mode>.json). */
export type EditScope = "all" | "dark" | "light";
export const EDIT_SCOPES: readonly EditScope[] = ["all", "dark", "light"];

/** "default" renders the slot's own component; a theme id borrows that pack direction's skin. */
export const DEFAULT_SKIN = "default";

export type Draft = {
  /** The pack direction's data-theme, e.g. "fachwerk". */
  theme: string;
  /** Token path -> value as authored: a colour, "2px", a reference such as "{radius.sm}". */
  tokens: Record<EditScope, Record<string, string>>;
  /** Skin slot -> DEFAULT_SKIN or the theme whose skin it uses. */
  skins: Record<string, string>;
};

/** One editable token of a pack direction, from `virtual:editor` (scripts/edit.ts). */
export type EditorToken = {
  path: string;
  cssVar: string;
  type: string;
  description?: string;
  /** Where an edit is written: tokens.json ("all") or the current mode's file ("mode"). */
  scope: "all" | "mode";
  /** The value as the pack authors it, or the resolved value where the pack inherits it. */
  authored: Record<"dark" | "light", string>;
  /** The resolved CSS value. */
  value: Record<"dark" | "light", string>;
};

export type EditorTheme = {
  id: string;
  app: string;
  direction: string;
  tokens: EditorToken[];
  /** Every reference a value may name ("palette.fachwerk.brick", "radius.sm") -> its CSS value, per mode. */
  refs: Record<"dark" | "light", Record<string, string>>;
};

export type EditReply = { theme: string; files: string[]; contrast: string[] } | { error: string };

export const emptyDraft = (theme: string): Draft => ({
  theme,
  tokens: { all: {}, dark: {}, light: {} },
  skins: {},
});

/** How many edits a draft holds. */
export function draftSize(draft: Draft): number {
  return (
    EDIT_SCOPES.reduce((n, s) => n + Object.keys(draft.tokens[s]).length, 0) +
    Object.keys(draft.skins).length
  );
}

/** The scope an edit to `token` takes in `mode`. */
export function scopeFor(token: Pick<EditorToken, "scope">, mode: "dark" | "light"): EditScope {
  return token.scope === "all" ? "all" : mode;
}

/** The draft with `path` set (or, for null, reset) in `scope`. */
export function setToken(
  draft: Draft,
  scope: EditScope,
  path: string,
  value: string | null
): Draft {
  const next = { ...draft.tokens[scope] };
  if (value === null) delete next[path];
  else next[path] = value;
  return { ...draft, tokens: { ...draft.tokens, [scope]: next } };
}

/** The draft with `slot` set to a theme's skin or DEFAULT_SKIN, or (null) back to the pack's own. */
export function setSkin(draft: Draft, slot: string, source: string | null): Draft {
  const skins = { ...draft.skins };
  if (source === null) delete skins[slot];
  else skins[slot] = source;
  return { ...draft, skins };
}

/** The draft's value for a token in `mode`, if it edits it. */
export function editedValue(
  draft: Draft | undefined,
  token: Pick<EditorToken, "path" | "scope">,
  mode: "dark" | "light"
): string | undefined {
  return draft?.tokens[scopeFor(token, mode)][token.path];
}

const REF = /^\{([^{}]+)\}$/;

/** A value as CSS: a whole-value reference resolves through `refs`; anything else is used as typed. */
export function cssValue(value: string, refs: Record<string, string>): string {
  const ref = REF.exec(value.trim());
  if (!ref?.[1]) return value.trim();
  return refs[ref[1]] ?? value.trim();
}

/** What is wrong with a value before it reaches the canvas or a file. */
export function valueProblem(token: Pick<EditorToken, "type">, value: string): string | null {
  const v = value.trim();
  if (!v) return "empty";
  if (/[;{}]/.test(v.replace(REF, ""))) return "no ; or braces outside a {reference}";
  if (token.type === "typography") return "typography tokens are not editable";
  return null;
}

/**
 * The stylesheet that lays the draft over its theme: per mode, the theme.css selectors
 * (packages/tokens/scripts/build.ts) with the attribute doubled, so it wins wherever the theme
 * applies, the compare panels and matrix cells included, and nowhere else. An "all" edit goes in
 * both blocks, a reference resolved in each mode.
 */
export function draftCss(draft: Draft, theme: EditorTheme | undefined): string {
  if (!theme) return "";
  const byPath = new Map(theme.tokens.map((t) => [t.path, t]));
  const t = JSON.stringify(draft.theme);
  const blocks = [
    [`[data-theme=${t}][data-theme]:not([data-mode="light"])`, "dark"],
    [`[data-theme=${t}][data-theme][data-mode="light"]`, "light"],
  ] as const;
  return blocks
    .map(([selector, mode]) => {
      const edits = { ...draft.tokens.all, ...draft.tokens[mode] };
      const lines = Object.entries(edits).flatMap(([path, value]) => {
        const token = byPath.get(path);
        if (!token || valueProblem(token, value)) return [];
        return [`  ${token.cssVar}: ${cssValue(value, theme.refs[mode])};`];
      });
      return lines.length ? `${selector} {\n${lines.join("\n")}\n}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * The pack a draft draws: its own skins, then each drafted slot set to DEFAULT_SKIN (removed) or
 * to the skin of the theme named (from `packs`).
 */
export function editedPack(
  pack: ThemePackDefinition,
  draft: Draft | undefined,
  packFor: (theme: string) => ThemePackDefinition
): ThemePackDefinition {
  if (!draft || draft.theme !== pack.id || Object.keys(draft.skins).length === 0) return pack;
  const skins: Record<string, unknown> = { ...pack.skins };
  for (const [slot, source] of Object.entries(draft.skins)) {
    if (source === DEFAULT_SKIN) delete skins[slot];
    else {
      const skin = (packFor(source).skins as Record<string, unknown> | undefined)?.[slot];
      if (skin) skins[slot] = skin;
    }
  }
  return { ...pack, skins: skins as ThemePackDefinition["skins"] };
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.values(v).every((x) => typeof x === "string");

/** A Draft from parsed JSON, or the reason it is not one (the server and the CLI read it so). */
export function readDraft(v: unknown): Draft | string {
  if (!isRecord(v)) return "a draft is a JSON object";
  if (typeof v.theme !== "string" || !v.theme) return "a draft needs a theme";
  if (!isRecord(v.tokens)) return "a draft needs tokens: { all, dark, light }";
  const tokens = v.tokens;
  for (const s of EDIT_SCOPES) {
    if (tokens[s] !== undefined && !isStrings(tokens[s]))
      return `tokens.${s} maps paths to strings`;
  }
  if (v.skins !== undefined && !isStrings(v.skins)) return "skins maps slots to theme ids";
  const pick = (s: EditScope) => (isStrings(tokens[s]) ? tokens[s] : {});
  return {
    theme: v.theme,
    tokens: { all: pick("all"), dark: pick("dark"), light: pick("light") },
    skins: isStrings(v.skins) ? v.skins : {},
  };
}

// ── Write back ──────────────────────────────────────────────────────────────────────────────

export type WriteTarget = "server" | "issue";

/** `server` when the gallery is served by scripts/gallery.ts on the loopback, `issue` elsewhere. */
export function writeTarget(hostname: string): WriteTarget {
  return ["127.0.0.1", "localhost", "[::1]"].includes(hostname) ? "server" : "issue";
}

/** The draft as the file `bun run edit apply` reads. */
export const draftJson = (draft: Draft) => `${JSON.stringify(draft, null, 2)}\n`;

/** The issue body: the draft and the command an agent runs in a lane. */
export function editIssueBody(draft: Draft): string {
  return [
    `Owner's edit of the \`${draft.theme}\` pack direction, from the gallery's live editor (design#151).`,
    "",
    "```json",
    draftJson(draft).trimEnd(),
    "```",
    "",
    "Save the JSON as `draft.json` in a lane and run, then let contrast CI and the screenshot baselines judge the PR:",
    "",
    "```sh",
    "cd packages/ui && bun run edit apply draft.json --pr",
    "```",
    "",
  ].join("\n");
}

/** The prefilled new-issue URL for the hosted gallery. */
export function editIssueUrl(draft: Draft): string {
  const q = new URLSearchParams({
    title: `edit ${draft.theme}: ${draftSize(draft)} change${draftSize(draft) === 1 ? "" : "s"} from the live editor`,
    body: editIssueBody(draft),
    labels: "ready",
  });
  return `https://github.com/${REPO}/issues/new?${q}`;
}

// ── The draft store ─────────────────────────────────────────────────────────────────────────

export const STORE_KEY = "hn-gallery-editor";

type Drafts = Record<string, Draft>;

function readStore(): Drafts {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!isRecord(parsed)) return {};
    const out: Drafts = {};
    for (const [theme, d] of Object.entries(parsed)) {
      const draft = readDraft(d);
      if (typeof draft !== "string" && draft.theme === theme) out[theme] = draft;
    }
    return out;
  } catch {
    return {};
  }
}

let drafts: Drafts | null = null;
const listeners = new Set<() => void>();

function all(): Drafts {
  drafts ??= readStore();
  return drafts;
}

/** The draft of `theme`, if it has one. */
export function getDraft(theme: string): Draft | undefined {
  return all()[theme];
}

/** Stores (or, when empty, drops) a theme's draft and tells every subscriber. */
export function saveDraft(draft: Draft) {
  const next = { ...all() };
  if (draftSize(draft)) next[draft.theme] = draft;
  else delete next[draft.theme];
  drafts = next;
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(next));
  } catch {
    // A private window without storage still edits this page; the frames just do not follow.
  }
  for (const l of listeners) l();
}

let version = 0;

/** For useSyncExternalStore: a change here or in another frame (the storage event). */
export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORE_KEY) return;
    drafts = null;
    version++;
    listener();
  };
  globalThis.addEventListener?.("storage", onStorage);
  return () => {
    listeners.delete(listener);
    globalThis.removeEventListener?.("storage", onStorage);
  };
}

/** A snapshot that changes whenever a draft does. */
export function draftsVersion(): string {
  return `${version}:${JSON.stringify(all())}`;
}
