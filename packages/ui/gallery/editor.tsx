// The live editor in the workbench's inspector (design#151): every token and recipe value of the
// current pack direction, and the skin each slot uses, grouped by level. Edits draw on the canvas
// at once (DraftStyle, DraftPack), in every frame and compare panel of that theme, and Write back
// turns the draft into files (local server) or a prefilled issue (hosted). The draft logic is in
// gallery/edit.ts, the files side in scripts/edit.ts.
import { EDITOR_THEMES } from "virtual:editor";
import { useMemo, useState } from "react";
import { Badge, Button, cx, skinSlots } from "../src";
import { useDrafts } from "./draft";
import {
  DEFAULT_SKIN,
  type Draft,
  draftCss,
  draftJson,
  draftSize,
  EDIT_PATH,
  type EditorToken,
  type EditReply,
  editedValue,
  editIssueUrl,
  emptyDraft,
  getDraft,
  saveDraft,
  scopeFor,
  setSkin,
  setToken,
  valueProblem,
  writeTarget,
} from "./edit";
import { LEVELS, levelOf } from "./levels";
import { PACKS, packFor } from "./packs";
import { InspectorHeading } from "./preview";
import type { View } from "./view";

/** Every draft as one stylesheet; mounted once per document (main.tsx), frames included. */
export function DraftStyle() {
  useDrafts();
  const css = EDITOR_THEMES.map((t) => {
    const d = getDraft(t.id);
    return d ? draftCss(d, t) : "";
  })
    .filter(Boolean)
    .join("\n");
  return css ? <style data-editor-draft="">{css}</style> : null;
}

// ── Tokens ──────────────────────────────────────────────────────────────────────────────────

/** Recipes first (design#143), then the colours and the rest, by top-level group. */
const RECIPES = ["border", "elevation", "control", "motif", "radius", "size", "shell", "font"];

const HEX = /^#[0-9a-f]{6}$/i;

function TokenRow({
  token,
  draft,
  mode,
  onChange,
}: {
  token: EditorToken;
  draft: Draft;
  mode: "dark" | "light";
  onChange: (draft: Draft) => void;
}) {
  const edited = editedValue(draft, token, mode);
  const value = edited ?? token.authored[mode];
  const scope = scopeFor(token, mode);
  const problem = edited === undefined ? null : valueProblem(token, edited);
  const swatch = HEX.test(value) ? value : HEX.test(token.value[mode]) ? token.value[mode] : null;
  const set = (v: string | null) => onChange(setToken(draft, scope, token.path, v));
  return (
    <li className="flex flex-col gap-1" data-token={token.path}>
      <div className="flex items-center gap-1.5">
        <span
          title={token.description ?? token.path}
          className={cx(
            "min-w-0 flex-1 truncate font-hn-mono text-[11.5px]",
            edited === undefined ? "text-hn-ink-muted" : "font-semibold text-hn-ink-primary"
          )}
        >
          {token.path}
        </span>
        <span className="font-hn-mono text-[10px] text-hn-ink-muted">
          {scope === "all" ? "both" : scope}
        </span>
        {edited === undefined ? null : (
          <button
            type="button"
            onClick={() => set(null)}
            className="font-hn-mono text-[10.5px] text-hn-action-text underline"
            aria-label={`Reset ${token.path}`}
          >
            reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {swatch ? (
          <input
            type="color"
            aria-label={`${token.path} colour`}
            value={swatch}
            onChange={(e) => set(e.target.value)}
            className="h-7 w-7 shrink-0 cursor-pointer rounded-hn-sm border border-hn-line-strong bg-transparent p-0"
          />
        ) : null}
        <input
          type="text"
          aria-label={token.path}
          aria-invalid={problem ? true : undefined}
          title={problem ?? undefined}
          value={value}
          spellCheck={false}
          onChange={(e) => set(e.target.value === token.authored[mode] ? null : e.target.value)}
          className="h-7 min-w-0 flex-1 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-1.5 font-hn-mono text-[11.5px] text-hn-ink-primary aria-[invalid=true]:border-hn-status-crit"
        />
      </div>
    </li>
  );
}

function Tokens({
  tokens,
  draft,
  mode,
  onChange,
}: {
  tokens: readonly EditorToken[];
  draft: Draft;
  mode: "dark" | "light";
  onChange: (draft: Draft) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const groups = useMemo(() => {
    const map = new Map<string, EditorToken[]>();
    for (const t of tokens) {
      const g = t.path.split(".")[0] ?? t.path;
      map.set(g, [...(map.get(g) ?? []), t]);
    }
    const rank = (g: string) => (RECIPES.includes(g) ? RECIPES.indexOf(g) : RECIPES.length);
    return [...map.entries()].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b));
  }, [tokens]);
  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Filter tokens"
        aria-label="Filter tokens"
        className="h-8 rounded-hn-md border border-hn-line-subtle bg-hn-surface-card px-2.5 text-[12.5px] text-hn-ink-primary outline-none placeholder:text-hn-ink-muted focus:border-hn-line-strong"
      />
      {groups.map(([group, list]) => {
        const shown = q ? list.filter((t) => t.path.toLowerCase().includes(q)) : list;
        if (!shown.length) return null;
        const edits = list.filter((t) => editedValue(draft, t, mode) !== undefined).length;
        return (
          <details key={group} open={q ? true : undefined} className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-[12.5px] text-hn-ink-body">
              <span className="flex-1">
                {group}
                {RECIPES.includes(group) ? (
                  <span className="ml-1.5 font-hn-mono text-[10px] text-hn-ink-muted">recipe</span>
                ) : null}
              </span>
              {edits ? <Badge tone="accent">{edits}</Badge> : null}
              <span className="font-hn-mono text-[11px] text-hn-ink-muted">{list.length}</span>
            </summary>
            <ul className="m-0 mt-2 flex list-none flex-col gap-2.5 p-0">
              {shown.map((t) => (
                <TokenRow key={t.path} token={t} draft={draft} mode={mode} onChange={onChange} />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

// ── Skins ───────────────────────────────────────────────────────────────────────────────────

const OWN = "";

function Skins({
  theme,
  draft,
  onChange,
}: {
  theme: string;
  draft: Draft;
  onChange: (draft: Draft) => void;
}) {
  const own = (packFor(theme).skins ?? {}) as Record<string, unknown>;
  const slots = skinSlots();
  const levels = [...LEVELS.filter((l) => l !== "atom"), "other"] as const;
  const levelOfSlot = (slot: string) => levelOf(slot.split(".")[0] ?? slot) ?? "other";
  return (
    <div className="flex flex-col gap-3">
      {levels.map((level) => {
        const list = slots.filter((s) => levelOfSlot(s) === level);
        if (!list.length) return null;
        return (
          <div key={level} className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="flex-1 font-hn-mono text-[11px] text-hn-ink-muted">{level}s</span>
              <button
                type="button"
                className="font-hn-mono text-[10.5px] text-hn-action-text underline"
                onClick={() =>
                  onChange(list.reduce((d, slot) => setSkin(d, slot, DEFAULT_SKIN), draft))
                }
              >
                all default
              </button>
            </div>
            {list.map((slot) => {
              const sources = PACKS.filter(
                (p) => p.id !== theme && (p.skins as Record<string, unknown> | undefined)?.[slot]
              ).map((p) => p.id);
              return (
                <label
                  key={slot}
                  className="flex items-center justify-between gap-2 text-[12px] text-hn-ink-body"
                >
                  <span
                    className={cx(
                      "truncate font-hn-mono",
                      draft.skins[slot] ? "font-semibold" : null
                    )}
                  >
                    {slot}
                  </span>
                  <select
                    aria-label={`${slot} skin`}
                    value={draft.skins[slot] ?? OWN}
                    onChange={(e) =>
                      onChange(setSkin(draft, slot, e.target.value === OWN ? null : e.target.value))
                    }
                    className="h-7 w-[8.5rem] min-w-0 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-1.5 font-hn-mono text-[11.5px] text-hn-ink-primary"
                  >
                    <option value={OWN}>{own[slot] ? `${theme} (own)` : "default (own)"}</option>
                    {own[slot] ? <option value={DEFAULT_SKIN}>default</option> : null}
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Write back ──────────────────────────────────────────────────────────────────────────────

type Status = {
  tone: "ok" | "crit" | "muted";
  text: string;
  detail?: string[];
  /** The files hold the draft now: reloading drops it and draws from them. */
  written?: boolean;
} | null;

function WriteBack({ draft }: { draft: Draft }) {
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const target = writeTarget(location.hostname);
  const write = async () => {
    if (target === "issue") {
      window.open(editIssueUrl(draft), "_blank", "noopener");
      setStatus({
        tone: "muted",
        text: "Opened a prefilled issue; an agent applies it in a lane.",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(EDIT_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: draftJson(draft),
      });
      const body = (await res.json()) as EditReply;
      if ("error" in body) setStatus({ tone: "crit", text: body.error });
      else {
        setStatus({
          tone: body.contrast.length ? "crit" : "ok",
          text: `Wrote ${body.files.length} file${body.files.length === 1 ? "" : "s"}. ${
            body.contrast.length
              ? `${body.contrast.length} contrast problem(s); CI will hold the PR.`
              : "Contrast holds."
          } Reload from the files, then commit them in the lane and open the PR.`,
          detail: [...body.files, ...body.contrast],
          written: true,
        });
      }
    } catch (e) {
      setStatus({ tone: "crit", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" onClick={write} disabled={busy || draftSize(draft) === 0}>
          {target === "server" ? "Write back" : "Write back as issue"}
        </Button>
        <Button
          size="xs"
          variant="secondary"
          disabled={draftSize(draft) === 0}
          onClick={() =>
            navigator.clipboard.writeText(draftJson(draft)).then(
              () =>
                setStatus({ tone: "muted", text: "Draft copied: bun run edit apply <file> --pr" }),
              () => setStatus({ tone: "crit", text: "Copy failed" })
            )
          }
        >
          Copy draft
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={draftSize(draft) === 0}
          onClick={() => {
            saveDraft(emptyDraft(draft.theme));
            setStatus(null);
          }}
        >
          Discard
        </Button>
      </div>
      {status ? (
        <div
          role="status"
          className={cx(
            "flex flex-col gap-1 text-[12px]",
            status.tone === "crit"
              ? "text-hn-status-crit"
              : status.tone === "ok"
                ? "text-hn-status-ok"
                : "text-hn-ink-muted"
          )}
        >
          <span>{status.text}</span>
          {status.detail?.map((d) => (
            <code key={d} className="font-hn-mono text-[11px] break-all text-hn-ink-muted">
              {d}
            </code>
          ))}
          {status.written ? (
            <Button
              size="xs"
              variant="secondary"
              className="self-start"
              onClick={() => {
                saveDraft(emptyDraft(draft.theme));
                location.reload();
              }}
            >
              Reload from files
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── The panel ───────────────────────────────────────────────────────────────────────────────

/** The inspector's Editor section for the current theme. */
export function EditorPanel({ view }: { view: View }) {
  useDrafts();
  const theme = EDITOR_THEMES.find((t) => t.id === view.theme);
  if (!theme) {
    return (
      <section className="flex flex-col gap-1" aria-label="Editor">
        <InspectorHeading>Editor</InspectorHeading>
        <p className="m-0 text-[12px] text-hn-ink-muted">
          Pick a pack direction ({EDITOR_THEMES.map((t) => t.id).join(", ")}) to edit its tokens,
          recipes and skins. Core themes and live copies are read-only here.
        </p>
      </section>
    );
  }
  const draft = getDraft(theme.id) ?? emptyDraft(theme.id);
  const size = draftSize(draft);
  return (
    <section className="flex flex-col gap-3" aria-label="Editor">
      <div className="flex items-center gap-2">
        <InspectorHeading>Editor</InspectorHeading>
        <span className="ml-auto pb-1 font-hn-mono text-[11px] text-hn-ink-muted">
          {theme.id} · {view.mode}
        </span>
        {size ? <Badge tone="accent">{size}</Badge> : null}
      </div>
      <details>
        <summary className="cursor-pointer text-[13px] text-hn-ink-primary">
          Tokens and recipes
        </summary>
        <div className="mt-2">
          <Tokens tokens={theme.tokens} draft={draft} mode={view.mode} onChange={saveDraft} />
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-[13px] text-hn-ink-primary">Skins by level</summary>
        <div className="mt-2">
          <Skins theme={theme.id} draft={draft} onChange={saveDraft} />
        </div>
      </details>
      <WriteBack draft={draft} />
    </section>
  );
}
