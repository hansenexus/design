// The preview card and the view toolbar (hansenexus/design#57). A card shows one registry item
// with a replay button, which remounts its children so enter motion and delayed states play
// again, a copy-install action and the item's atomic level from registry.json (#58). With ?bare=1 the card renders exactly like a plain spec
// section, so the screenshot baselines stay the same.
// The review tools (hansenexus/design#60): compare renders the card once per theme side by side,
// speed and motion scale the motion variables (set at the gallery root, and again on each compare
// panel, whose data-theme redeclares them), and a card with a `loop` gets an auto-loop toggle
// that drives its content through QueryState's states. ViewProvider carries the same scale to the
// timers that read the motion tokens in TS (MotionProvider, #91).
import { themes } from "@hansenexus/tokens";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Badge, Button, MotionProvider } from "../src";
import { Check, Restart } from "./icons";
import { levelOf } from "./levels";
import {
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
      {children}
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
        {view.compare === "on" ? (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
            {themes.map((theme) => (
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

const LABELS: Record<keyof View, string> = {
  theme: "Theme",
  density: "Density",
  mode: "Mode",
  viewport: "Viewport",
  compare: "Compare",
  speed: "Speed",
  motion: "Motion",
};

/** One native select per view key; a change rewrites the query and re-renders every card. */
export function ViewToolbar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const keys = Object.keys(LABELS) as (keyof View)[];
  return (
    <div
      role="toolbar"
      aria-label="Gallery view"
      className="relative z-[60] flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-hn-line-subtle bg-hn-surface-band px-4 py-2.5 text-[13px] sm:px-10"
    >
      {keys.map((key) => (
        <label key={key} className="flex items-center gap-2 text-hn-ink-muted">
          {LABELS[key]}
          <select
            value={view[key]}
            onChange={(e) => onChange({ ...view, [key]: e.target.value })}
            className="h-8 rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 font-hn-mono text-hn-ink-primary"
          >
            {VIEW_OPTIONS[key].map((v) => (
              <option key={v} value={v}>
                {key === "viewport" && v !== "auto" ? `${v} px` : key === "speed" ? `${v}x` : v}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
