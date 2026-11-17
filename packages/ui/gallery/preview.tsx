// The preview card and the view toolbar (hansenexus/design#57). A card shows one registry item
// with a replay button, which remounts its children so enter motion and delayed states play
// again, a copy-install action and the item's atomic level from registry.json (#58). With ?bare=1 the card renders exactly like a plain spec
// section, so the screenshot baselines stay the same.
// The review tools (hansenexus/design#60): compare renders the card once per theme side by side
// (every theme of the build for "on", or the current theme plus a picked list, design#149),
// speed and motion scale the motion variables (set at the gallery root, and again on each compare
// panel, whose data-theme redeclares them), and a card with a `loop` gets an auto-loop toggle
// that drives its content through QueryState's states. ViewProvider carries the same scale to the
// timers that read the motion tokens in TS (MotionProvider, #91).
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Badge, Button, MotionProvider } from "../src";
import { DraftPack } from "./draft";
import { Check, Restart } from "./icons";
import { levelOf } from "./levels";
import { packIllustrations } from "./packs";
import { BUILD_THEMES, LIVE, PACK_GROUPS, packOf } from "./themes";
import {
  comparedThemes,
  compareThemes,
  DEFAULT_VIEW,
  installCommand,
  LOOP,
  type LoopStatus,
  loopTimings,
  motionScale,
  motionVariables,
  VIEW_OPTIONS,
  type View,
  viewAttributes,
} from "./view";

/** True when the page renders for a screenshot or inside the viewport iframe. */
export const BareContext = createContext(false);

/** The current view, for the compare panels and the motion timings. */
export const ViewContext = createContext<View>(DEFAULT_VIEW);

/**
 * Provides the view, and scales the TS motion timings (Spinner, useDelayedVisibility) by the
 * same factor as the motion variables, so speed and reduced motion reach every timer.
 */
export function ViewProvider({ view, children }: { view: View; children: ReactNode }) {
  return (
    <ViewContext.Provider value={view}>
      <MotionProvider scale={motionScale(view)}>{children}</MotionProvider>
    </ViewContext.Provider>
  );
}

/** Steps through loopTimings' states while `on`, starting at loading, and around again. */
function useLoop(on: boolean, view: View): LoopStatus {
  const [step, setStep] = useState(0);
  const { speed, motion } = view;
  useEffect(() => {
    if (!on) {
      setStep(0);
      return;
    }
    const { steps } = loopTimings({ speed, motion });
    const t = setTimeout(() => setStep((n) => (n + 1) % steps.length), steps[step]?.ms ?? 0);
    return () => clearTimeout(t);
  }, [on, step, speed, motion]);
  return LOOP[step] ?? "loading";
}

/** One compare panel: the card's content under one theme, in the current mode and density. */
function ThemePanel({ theme, view, children }: { theme: string; view: View; children: ReactNode }) {
  const { mode, density } = viewAttributes(view);
  return (
    <div
      data-theme={theme}
      data-mode={mode}
      data-density={density ?? undefined}
      data-compare={theme}
      style={motionVariables(view) as CSSProperties}
      className="flex min-w-0 flex-col gap-2 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page p-3 text-hn-ink-primary"
    >
      <span className="font-hn-mono text-xs text-hn-ink-muted">{theme}</span>
      <DraftPack theme={theme}>{children}</DraftPack>
    </div>
  );
}

export function PreviewCard({
  title,
  item,
  wide = false,
  loop,
  children,
}: {
  title: string;
  /** The registry.json item name the install command adds. */
  item: string;
  wide?: boolean;
  /** Content for one QueryState status; gives the card an auto-loop toggle. */
  loop?: (status: LoopStatus) => ReactNode;
  children: ReactNode;
}) {
  const bare = useContext(BareContext);
  const view = useContext(ViewContext);
  const [run, setRun] = useState(0);
  const [looping, setLooping] = useState(false);
  const status = useLoop(looping && !bare && loop !== undefined, view);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const command = installCommand(item);
  const level = levelOf(item);

  useEffect(() => {
    if (copy === "idle") return;
    const t = setTimeout(() => setCopy("idle"), 2000);
    return () => clearTimeout(t);
  }, [copy]);

  const section = wide ? "flex flex-col gap-3.5 lg:col-span-2" : "flex flex-col gap-3.5";
  const heading = "m-0 font-hn-mono text-[13px] font-medium text-hn-ink-muted";
  if (bare) {
    return (
      <section className={section}>
        <h2 className={heading}>{title}</h2>
        {children}
      </section>
    );
  }

  const content = loop && looping ? loop(status) : children;

  const onCopy = () => {
    navigator.clipboard.writeText(command).then(
      () => setCopy("copied"),
      () => setCopy("failed")
    );
  };

  return (
    <section className={section} data-preview={item} data-level={level}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className={heading}>{title}</h2>
        {level ? <Badge>{level}</Badge> : null}
        <div className="ml-auto flex items-center gap-1">
          {loop ? (
            <Button
              variant="ghost"
              aria-pressed={looping}
              onClick={() => setLooping((on) => !on)}
              aria-label={`Auto-loop ${title}`}
            >
              {looping ? `Auto-loop: ${status === "data" ? "success" : status}` : "Auto-loop"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => setRun((n) => n + 1)}
            aria-label={`Replay ${title}`}
          >
            <Restart />
            Replay
          </Button>
          <Button variant="ghost" onClick={onCopy} title={command}>
            {copy === "copied" ? <Check /> : null}
            {copy === "copied" ? "Copied" : "Copy install"}
          </Button>
        </div>
      </div>
      <span role="status" className="sr-only">
        {copy === "copied"
          ? `Copied ${command}`
          : copy === "failed"
            ? `Copy failed: ${command}`
            : ""}
      </span>
      {copy === "failed" ? (
        <code className="font-hn-mono text-[12px] text-hn-ink-body">{command}</code>
      ) : null}
      {/* Keyed on speed and motion too, so timers that read their timing on mount pick it up. */}
      <div key={`${run}-${view.speed}-${view.motion}`} data-run={run} className="contents">
        {view.compare !== "off" ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
            {(view.compare === "on" ? BUILD_THEMES : comparedThemes(view)).map((theme) => (
              <ThemePanel key={theme} theme={theme} view={view}>
                {content}
              </ThemePanel>
            ))}
          </div>
        ) : (
          content
        )}
      </div>
    </section>
  );
}

/** A theme's name in the pickers: a live copy says where it comes from. */
export function themeLabel(theme: string, liveSource = "main"): string {
  return theme.endsWith(LIVE) ? `${theme.slice(0, -LIVE.length)} (live, ${liveSource})` : theme;
}

const SELECT =
  "h-8 w-[9.5rem] min-w-0 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 font-hn-mono text-[12.5px] text-hn-ink-primary";

/** One inspector row: the label on the left, its select on the right. */
function Picker<T extends string>({
  label,
  value,
  options,
  name = (v) => v,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  name?: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-h-9 items-center justify-between gap-3 text-hn-ink-muted">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={SELECT}>
        {options.map((v) => (
          <option key={v} value={v}>
            {name(v)}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * The themes to compare with (design#149), by pack: a checkbox each, the live copies included.
 * Ticking one makes compare a list; "every theme" is compare=on. In the inspector the list opens
 * in place under its row, so it never covers the canvas.
 */
function CompareWith({
  view,
  liveSource,
  onChange,
}: {
  view: View;
  liveSource: string;
  onChange: (view: View) => void;
}) {
  const picked = view.compare === "on" ? [] : compareThemes(view);
  const toggle = (theme: string, on: boolean) => {
    const next = on ? [...picked, theme] : picked.filter((t) => t !== theme);
    onChange({ ...view, compare: next.length ? next.join(",") : "off" });
  };
  const summary =
    view.compare === "on"
      ? "every theme"
      : picked.length
        ? picked.map((t) => themeLabel(t, liveSource)).join(", ")
        : "off";
  return (
    <details className="group text-hn-ink-muted">
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3">
        Compare{" "}
        <span className="flex w-[9.5rem] min-w-0 items-center justify-between gap-1 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 py-1.5 font-hn-mono text-[12.5px] text-hn-ink-primary">
          <span className="truncate">{summary}</span>
          <span aria-hidden="true" className="text-hn-ink-muted group-open:rotate-180">
            ▾
          </span>
        </span>
      </summary>
      <fieldset
        aria-label="Compare with"
        className="m-0 mt-1 mb-2 flex min-w-0 flex-col gap-2 rounded-hn-md border border-hn-line-subtle bg-hn-surface-card p-3"
      >
        <label className="flex items-center gap-2 text-hn-ink-primary">
          <input
            type="checkbox"
            checked={view.compare === "on"}
            onChange={(e) => onChange({ ...view, compare: e.target.checked ? "on" : "off" })}
          />
          every theme of this build
        </label>
        {PACK_GROUPS.map((g) => (
          <div key={g.pack} className="flex flex-col gap-1">
            <span className="font-hn-mono text-xs">{g.pack}</span>
            {g.directions.map((t) => (
              <label key={t} className="flex items-center gap-2 pl-2 text-hn-ink-primary">
                <input
                  type="checkbox"
                  data-compare-option={t}
                  disabled={t === view.theme || view.compare === "on"}
                  checked={picked.includes(t)}
                  onChange={(e) => toggle(t, e.target.checked)}
                />
                {themeLabel(t, liveSource)}
              </label>
            ))}
          </div>
        ))}
      </fieldset>
    </details>
  );
}

/** A small uppercase heading over a group of inspector rows. */
export function InspectorHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="m-0 pb-1 font-hn-mono text-[10.5px] font-normal tracking-[0.08em] text-hn-ink-muted uppercase">
      {children}
    </h2>
  );
}

/**
 * The view settings in the workbench's inspector (design#162): the theme (pack and direction,
 * the data-theme), density and mode, then the review tools: compare (a checklist of themes), the
 * matrix, speed and motion. The viewport sits on the canvas toolbar, next to the canvas it sizes.
 * A change rewrites the query and re-renders every card.
 */
export function ViewToolbar({
  view,
  onChange,
  liveSource = "main",
}: {
  view: View;
  onChange: (view: View) => void;
  /** Where the live copies come from, e.g. "origin/main 1a2b3c4" (scripts/live.ts). */
  liveSource?: string;
}) {
  const pack = packOf(view.theme);
  const group = PACK_GROUPS.find((g) => g.pack === pack) ?? PACK_GROUPS[0];
  const set =
    <K extends keyof View>(key: K) =>
    (value: View[K]) =>
      onChange({ ...view, [key]: value });
  return (
    <div
      role="toolbar"
      aria-label="Gallery view"
      aria-orientation="vertical"
      className="flex flex-col gap-5 text-[13px]"
    >
      <section className="flex flex-col">
        <InspectorHeading>Theme</InspectorHeading>
        <Picker
          label="Pack"
          value={pack}
          options={PACK_GROUPS.map((g) => g.pack)}
          onChange={(p) => {
            const first = PACK_GROUPS.find((g) => g.pack === p)?.directions[0];
            if (first) onChange({ ...view, theme: first });
          }}
        />
        <Picker
          label="Direction"
          value={view.theme}
          options={group?.directions ?? [view.theme]}
          name={(t) => themeLabel(t, liveSource)}
          onChange={set("theme")}
        />
        <Picker
          label="Density"
          value={view.density}
          options={VIEW_OPTIONS.density}
          onChange={set("density")}
        />
        <Picker label="Mode" value={view.mode} options={VIEW_OPTIONS.mode} onChange={set("mode")} />
        <Picker
          label="Illustrations"
          value={view.illustrations}
          options={VIEW_OPTIONS.illustrations}
          name={(s) => (s === "auto" ? `auto (${packIllustrations(view.theme)})` : s)}
          onChange={set("illustrations")}
        />
      </section>
      <section className="flex flex-col">
        <InspectorHeading>Review</InspectorHeading>
        <CompareWith view={view} liveSource={liveSource} onChange={onChange} />
        <Picker
          label="Matrix"
          value={view.matrix}
          options={VIEW_OPTIONS.matrix}
          name={(v) => (v === "on" ? "light/dark × 390/1280" : v)}
          onChange={set("matrix")}
        />
        <Picker
          label="Speed"
          value={view.speed}
          options={VIEW_OPTIONS.speed}
          name={(v) => `${v}x`}
          onChange={set("speed")}
        />
        <Picker
          label="Motion"
          value={view.motion}
          options={VIEW_OPTIONS.motion}
          onChange={set("motion")}
        />
      </section>
    </div>
  );
}
