// The motion scene (hansenexus/design#61): every motion token as its easing curve plus a demo
// object that travels over the token's duration, one preview card per group so Replay plays it
// again, and the scripted flows as a timeline that plays, pauses, scrubs and replays.
// The demos read the CSS variables, which the gallery root scales by speed and zeroes under
// reduced motion, so the toolbar applies here as everywhere else.
// Names are an invented estate: no real hostnames, IPs or people in a public repo.

import { type ReactNode, useContext, useEffect, useRef, useState } from "react";
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
} from "../src";
import { Server } from "./icons";
import {
  bezierCss,
  bezierPath,
  FLOWS,
  type Flow,
  flowMarks,
  flowPace,
  LINEAR,
  type MotionGroup,
  motionScene,
  type PaletteSheetState,
  stepAt,
} from "./motion";
import { PreviewCard, ViewContext } from "./preview";
import { motionScale } from "./view";

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
    "transition-[opacity,translate] duration-(--hn-duration-base) motion-reduce:transition-none";
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

export function Motion() {
  const groups = motionScene();
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
      </header>
      <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
        {groups.map((group) => (
          <PreviewCard key={group.name} title={`${group.name} (${group.source})`} item="tokens">
            <TokenGroup group={group} />
          </PreviewCard>
        ))}
        {FLOWS.map((flow) => (
          <PreviewCard key={flow.id} title={flow.title} item="command" wide>
            <FlowPlayer flow={flow} stage={(state) => <PaletteSheetStage state={state} />} />
          </PreviewCard>
        ))}
      </div>
    </main>
  );
}
