// The motion scene (hansenexus/design#61): every motion token as its easing curve plus a demo
// object that travels over the token's duration, one preview card per group so Replay plays it
// again, and the scripted flows as a timeline that plays, pauses, scrubs and replays.
// The demos read the CSS variables, which the gallery root scales by speed and zeroes under
// reduced motion, so the toolbar applies here as everywhere else. The active motion set
// (design#221) gives the values; the choreography card plays enter, stagger, exit and emphasis,
// and the compare card plays two sets side by side, each under its own data-motion.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { motionSetIds, motionSets } from "@hansenexus/tokens";
import { type CSSProperties, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  Button,
  Command,
  type CommandGroup,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  StatusBadge,
  useChoreography,
} from "../src";
import { Server } from "./icons";
import {
  bezierCss,
  bezierPath,
  CHOREO_ROWS,
  choreoTransition,
  type Flow,
  flowMarks,
  flowPace,
  flowsFor,
  LINEAR,
  type MotionGroup,
  motionScene,
  type PaletteSheetState,
  stepAt,
} from "./motion";
import { motionSetLabel, PreviewCard, ViewContext, ViewProvider } from "./preview";
import { activeMotionSet, motionScale, motionVariables } from "./view";

const CURVE = 96;

/** The curve in a CURVE-sized box, with the linear diagonal behind it for reference. */
function Curve({ group }: { group: MotionGroup }) {
  const value = group.easing?.value ?? LINEAR;
  return (
    <svg
      role="img"
      aria-label={`${group.easing ? bezierCss(value) : "linear"}, progress over time`}
      viewBox={`-4 -4 ${CURVE + 8} ${CURVE + 8}`}
      width={CURVE + 8}
      height={CURVE + 8}
      className="shrink-0 overflow-visible"
    >
      <rect
        width={CURVE}
        height={CURVE}
        className="fill-none stroke-hn-line-subtle"
        strokeWidth={1}
      />
      <path
        d={`M0,${CURVE} L${CURVE},0`}
        className="fill-none stroke-hn-line-strong"
        strokeDasharray="3 3"
      />
      <path
        data-curve={group.name}
        d={bezierPath(value, CURVE)}
        className="fill-none stroke-hn-action-primary"
        strokeWidth={2}
      />
    </svg>
  );
}

/**
 * A block that crosses its track once over the token's duration with the group's easing. It
 * starts on the frame after mount, so the card's Replay (a remount) plays it again.
 */
function Travel({ duration, easing }: { duration: string; easing: string }) {
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setMoved(true)));
    return () => cancelAnimationFrame(f);
  }, []);
  return (
    <div className="relative h-6 rounded-hn-sm bg-hn-surface-raised">
      <div
        data-demo=""
        data-moved={moved || undefined}
        className="absolute top-1 size-4 rounded-hn-sm bg-hn-action-primary"
        style={{
          left: moved ? "calc(100% - 1.25rem)" : "0.25rem",
          transition: `left var(${duration}) ${easing}`,
        }}
      />
    </div>
  );
}

function TokenGroup({ group }: { group: MotionGroup }) {
  const view = useContext(ViewContext);
  const factor = motionScale(view);
  const easing = group.easing ? `var(${group.easing.cssVar})` : "linear";
  return (
    <div
      data-group={group.name}
      className="flex flex-col gap-4 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-card p-4 sm:flex-row"
    >
      <div className="flex flex-col gap-1.5">
        <Curve group={group} />
        <span className="font-hn-mono text-[11.5px] text-hn-ink-muted">
          {group.easing ? group.easing.path : "no easing token: linear"}
        </span>
        {group.easing ? (
          <span className="font-hn-mono text-[11.5px] text-hn-ink-body">
            {bezierCss(group.easing.value)}
          </span>
        ) : null}
      </div>
      <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-3 p-0">
        {group.durations.map((d) => (
          <li key={d.path} data-token={d.path} className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-hn-mono text-hn-ink-primary">{d.path}</span>
              <span className="font-hn-mono text-hn-ink-body">{d.ms}ms</span>
              {factor !== 1 ? (
                <span className="font-hn-mono text-hn-ink-muted">now {d.ms * factor}ms</span>
              ) : null}
            </div>
            {d.description ? (
              <span className="text-[13px] text-hn-ink-muted">{d.description}</span>
            ) : null}
            <Travel duration={d.cssVar} easing={easing} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// The flow's stage.

const MACHINES: CommandGroup[] = [
  {
    id: "machines",
    heading: "Machines",
    items: [
      { id: "kran-01", label: "kran-01", hint: "production", icon: <Server /> },
      { id: "kran-02", label: "kran-02", hint: "production", icon: <Server /> },
      { id: "kran-04", label: "kran-04", hint: "staging", icon: <Server /> },
      { id: "pegel", label: "pegel", hint: "offline", icon: <Server />, disabled: true },
    ],
  },
];

const noFocus = (e: Event) => e.preventDefault();

/**
 * One frame of the palette-to-sheet flow. The frame's transform makes it the containing block of
 * the fixed sheet, as in the overlays scene. Palette and sheet enter from their @starting-style
 * over duration.base; the palette is the inline Command, not the modal CommandDialog, so the
 * timeline's controls stay usable while it is open.
 */
function PaletteSheetStage({ state }: { state: PaletteSheetState }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const enter =
    "transition-[opacity,translate] duration-(--hn-enter-duration) ease-hn-enter motion-reduce:transition-none";
  return (
    <div
      ref={setEl}
      data-stage=""
      className="relative h-[380px] overflow-hidden rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="flex flex-col gap-2 p-4 text-sm text-hn-ink-muted">
        <span className="font-hn-mono text-hn-ink-body">harbour / machines</span>
        <span>4 machines, 1 offline.</span>
      </div>
      {state.palette ? (
        <>
          <div className="absolute inset-0 bg-hn-surface-page/70" />
          <div
            data-flow-palette=""
            className={`absolute inset-x-4 top-6 mx-auto max-w-[440px] starting:-translate-y-2 starting:opacity-0 ${enter}`}
          >
            <Command
              groups={MACHINES}
              query={state.query}
              onQueryChange={() => {}}
              label="Flow palette"
            />
          </div>
        </>
      ) : null}
      {el && state.sheet ? (
        <Sheet open modal={false}>
          <SheetContent
            container={el}
            side="right"
            bottomOnMobile={false}
            showClose={false}
            onOpenAutoFocus={noFocus}
            onCloseAutoFocus={noFocus}
            data-flow-sheet=""
            className={`starting:translate-x-full ${enter}`}
          >
            <SheetHeader>
              <SheetTitle>{state.sheet}</SheetTitle>
              <SheetDescription>Staging, quay 4. Last report 12 s ago.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <StatusBadge status="ok" className="self-start">
                Online
              </StatusBadge>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}

/** Advances t by real time while playing, at the flow's pace, and stops at the end. */
function usePlayhead(total: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const dt = last.current === null ? 0 : now - last.current;
      last.current = now;
      setT((prev) => Math.min(total, prev + dt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, total]);
  useEffect(() => {
    if (t >= total) setPlaying(false);
  }, [t, total]);
  return { t, setT, playing, setPlaying };
}

/**
 * A flow as a timeline: play/pause, play from the start, a scrubber over the whole flow and one
 * button per step. The stage renders the step under the playhead, so every control is a seek.
 */
function FlowPlayer<S>({ flow, stage }: { flow: Flow<S>; stage: (state: S) => ReactNode }) {
  const view = useContext(ViewContext);
  const pace = flowPace(view);
  const marks = flowMarks(flow.steps, pace);
  const total = marks.at(-1) ?? 0;
  const { t, setT, playing, setPlaying } = usePlayhead(total);
  const index = stepAt(flow.steps, t, pace);
  const step = flow.steps[index] ?? flow.steps[0];
  if (!step) return null;
  const seek = (to: number) => {
    setPlaying(false);
    setT(Math.max(0, Math.min(total, to)));
  };
  return (
    <div data-flow={flow.id} data-step={index} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            if (t >= total) setT(0);
            setPlaying(!playing);
          }}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setT(0);
            setPlaying(true);
          }}
        >
          Play from start
        </Button>
        <span className="ml-auto font-hn-mono text-[12px] text-hn-ink-muted">
          {Math.round(t)} / {Math.round(total)} ms
        </span>
      </div>
      <input
        type="range"
        aria-label={`Scrub ${flow.title}`}
        min={0}
        max={Math.round(total)}
        step={10}
        value={Math.round(t)}
        onChange={(e) => seek(Number(e.target.value))}
        className="w-full accent-hn-action-primary"
      />
      <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {flow.steps.map((s, i) => (
          <li key={s.label}>
            <Button
              variant="ghost"
              aria-current={i === index ? "step" : undefined}
              onClick={() => seek(marks[i] ?? 0)}
              className="aria-[current=step]:bg-hn-surface-raised aria-[current=step]:text-hn-ink-primary"
            >
              {i + 1}. {s.label}
            </Button>
          </li>
        ))}
      </ol>
      <span role="status" className="sr-only">
        Step {index + 1} of {flow.steps.length}: {step.label}
      </span>
      {stage(step.state)}
    </div>
  );
}

/** Runs `fn` on the frame after mount (two frames, so the start state paints first). */
function useAfterMount(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => ref.current());
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);
}

/**
 * The choreography (design#221): the rows enter one after another, stagger.step apart, the first
 * takes the emphasis once they are in, and Exit sends them all out together. Replay remounts it.
 */
function Choreography() {
  const beats = useChoreography();
  const [shown, setShown] = useState(false);
  const [emphasis, setEmphasis] = useState(false);
  useAfterMount(() => setShown(true));
  useEffect(() => {
    if (!emphasis) return;
    const t = setTimeout(() => setEmphasis(false), beats.emphasis.ms);
    return () => clearTimeout(t);
  }, [emphasis, beats.emphasis.ms]);
  return (
    <div data-choreography="" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setShown(!shown)}>
          {shown ? "Exit" : "Enter"}
        </Button>
        <Button variant="ghost" disabled={!shown} onClick={() => setEmphasis(true)}>
          Emphasis
        </Button>
        <span className="ml-auto self-center font-hn-mono text-[12px] text-hn-ink-muted">
          enter {beats.enter.ms} · stagger {beats.stagger.ms} · exit {beats.exit.ms} · emphasis{" "}
          {beats.emphasis.ms} ms
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {CHOREO_ROWS.map((row, i) => (
          <li
            key={row}
            data-choreo-row={row}
            data-shown={shown || undefined}
            className="flex items-center gap-2 rounded-hn-sm border border-hn-line-subtle bg-hn-surface-card px-3 py-2 text-sm motion-reduce:transition-none"
            style={{
              opacity: shown ? 1 : 0,
              translate: shown ? "0 0" : "0 0.5rem",
              scale: emphasis && i === 0 ? "1.04" : "1",
              transition: choreoTransition(i, shown),
            }}
          >
            <Server />
            <span className="font-hn-mono text-hn-ink-primary">{row}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One side of the compare card: its content under motion set `set`, as data-motion gives it to
 * CSS and a ViewProvider to the timers, at the toolbar's speed and reduced motion.
 */
function SetPanel({ set, children }: { set: string; children: ReactNode }) {
  const view = useContext(ViewContext);
  const own = { ...view, motionSet: set };
  return (
    <div
      data-motion={set}
      data-compare-set={set}
      className="flex min-w-0 flex-col gap-3 rounded-hn-lg border border-hn-line-subtle bg-hn-surface-page p-4"
      style={motionVariables(own) as CSSProperties}
    >
      <span className="text-sm font-semibold text-hn-ink-primary">{motionSetLabel(set, view)}</span>
      <ViewProvider view={own}>{children}</ViewProvider>
    </div>
  );
}

/** The set the compare card starts against: the first set that is not the active one. */
export function otherSet(active: string): string {
  return motionSetIds.find((id) => id !== active) ?? active;
}

/** Two motion sets side by side: the active one and a picked one, each playing the choreography. */
function MotionCompare({ active }: { active: string }) {
  const [other, setOther] = useState(() => otherSet(active));
  return (
    <div data-motion-compare="" className="flex flex-col gap-3">
      <label className="flex items-center gap-3 text-sm text-hn-ink-muted">
        Compare with
        <select
          value={other}
          onChange={(e) => setOther(e.target.value)}
          className="rounded-hn-sm border border-hn-line-strong bg-hn-surface-card px-2 py-1 text-hn-ink-primary"
        >
          {motionSetIds.map((id) => (
            <option key={id} value={id}>
              {motionSets[id].label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["active", active],
            ["other", other],
          ] as const
        ).map(([side, set]) => (
          <SetPanel key={`${side}-${set}`} set={set}>
            <Choreography />
          </SetPanel>
        ))}
      </div>
    </div>
  );
}

export function Motion() {
  const view = useContext(ViewContext);
  const set = activeMotionSet(view);
  const info = motionSets[set as keyof typeof motionSets];
  const groups = motionScene(set);
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-hn-ink-muted">@hansenexus/tokens</span>
        <h1 className="m-0 font-hn-display text-[32px] leading-tight font-semibold tracking-[-0.02em] sm:text-[44px]">
          Motion
        </h1>
        <p className="m-0 max-w-[65ch] text-sm text-hn-ink-body">
          Every token of semantic/motion.json, and the transition durations of semantic/scale.json:
          the curve, and a block that crosses its track over the duration. Replay plays a card
          again; speed and motion in the toolbar scale every duration.
        </p>
        <p data-active-set={set} className="m-0 max-w-[65ch] text-sm text-hn-ink-body">
          <span className="font-semibold text-hn-ink-primary">
            Motion set: {motionSetLabel(view.motionSet, view)}.
          </span>{" "}
          {info?.description} Pick another under Animation set in the toolbar (?motionSet=).
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        {groups.map((group) => (
          <PreviewCard key={group.name} title={`${group.name} (${group.source})`} item="tokens">
            <TokenGroup group={group} />
          </PreviewCard>
        ))}
        <PreviewCard title="Choreography: enter, stagger, exit, emphasis" item="motion">
          <Choreography />
        </PreviewCard>
        <PreviewCard title="Compare motion sets" item="motion">
          <MotionCompare key={set} active={set} />
        </PreviewCard>
        {flowsFor(set).map((flow) => (
          <PreviewCard key={flow.id} title={flow.title} item="command" wide>
            <FlowPlayer flow={flow} stage={(state) => <PaletteSheetStage state={state} />} />
          </PreviewCard>
        ))}
      </div>
    </main>
  );
}
