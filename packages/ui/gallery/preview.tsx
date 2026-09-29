// The preview card and the view toolbar (hansenexus/design#57). A card shows one registry item
// with a replay button, which remounts its children so enter motion and delayed states play
// again, a copy-install action and the item's atomic level from registry.json (#58). With ?bare=1 the card renders exactly like a plain spec
// section, so the screenshot baselines stay the same.
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Badge, Button } from "../src";
import { Check, Restart } from "./icons";
import { levelOf } from "./levels";
import { installCommand, VIEW_OPTIONS, type View } from "./view";

/** True when the page renders for a screenshot or inside the viewport iframe. */
export const BareContext = createContext(false);

export function PreviewCard({
  title,
  item,
  wide = false,
  children,
}: {
  title: string;
  /** The registry.json item name the install command adds. */
  item: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const bare = useContext(BareContext);
  const [run, setRun] = useState(0);
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
      <div key={run} data-run={run} className="contents">
        {children}
      </div>
    </section>
  );
}

const LABELS: Record<keyof View, string> = {
  theme: "Theme",
  density: "Density",
  mode: "Mode",
  viewport: "Viewport",
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
                {key === "viewport" && v !== "auto" ? `${v} px` : v}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
