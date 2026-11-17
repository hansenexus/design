import { motionSets, ms } from "@hansenexus/tokens";
import { createContext, type ReactNode, useContext } from "react";

/** The motion tokens in milliseconds, in the shape of the `ms` export of @hansenexus/tokens. */
export type MotionMs = {
  readonly [K in keyof typeof ms]: { readonly [L in keyof (typeof ms)[K]]: number };
};

/** A motion set's id (design#221), the value of data-motion: "default", "calm", "snappy". */
export type MotionSetName = keyof typeof motionSets;

/** The set's tokens in ms; an unknown id is the default set, the tokens as they are. */
function setMs(set: string | undefined): MotionMs {
  return (set && set in motionSets ? motionSets[set as MotionSetName].ms : ms) as MotionMs;
}

/**
 * Every motion token in milliseconds, times `scale`: 1 is the tokens as they are, 4 plays motion
 * four times as slow, 0 is reduced motion. `set` picks a motion set's values (design#221); without
 * one, the default. The one place component code reads the `ms` tokens from, so a MotionProvider
 * reaches every timer (tests/motion.test.tsx enforces it).
 */
export function motionMs(scale = 1, set?: string): MotionMs {
  return Object.fromEntries(
    Object.entries(setMs(set)).map(([group, values]) => [
      group,
      Object.fromEntries(
        Object.entries(values as Record<string, number>).map(([key, value]) => [key, value * scale])
      ),
    ])
  ) as MotionMs;
}

const MotionScale = createContext(1);
const MotionSet = createContext<string | undefined>(undefined);

/**
 * Scales the motion tokens that component timers read (the pending indicator's delay and
 * minimum) for everything inside: 4 plays them four times as slow, 0 resolves them to 0, as
 * reduced motion does. `set` names the motion set whose values the timers read, the one the
 * data-motion attribute gives CSS. CSS durations follow the --hn-* variables instead, and
 * motion-reduce: styles a data-reduced-motion attribute. Without a provider the scale is 1 and
 * the set the default.
 */
export function MotionProvider({
  scale,
  set,
  children,
}: {
  scale: number;
  set?: string;
  children: ReactNode;
}) {
  return (
    <MotionScale.Provider value={scale}>
      <MotionSet.Provider value={set}>{children}</MotionSet.Provider>
    </MotionScale.Provider>
  );
}

/** The motion tokens in ms at the nearest MotionProvider's scale and set. */
export function useMotionMs(): MotionMs {
  return motionMs(useContext(MotionScale), useContext(MotionSet));
}

/** One choreography pattern: how long it takes, and the CSS variable of its easing. */
export type Beat = { ms: number; easing: string };

/** The named choreography patterns (design#221): enter, exit, stagger and emphasis. */
export type Choreography = {
  enter: Beat;
  exit: Beat;
  /** The step between siblings that enter one after another; `delay(i)` is sibling i's wait. */
  stagger: { ms: number; delay: (index: number) => number };
  emphasis: Beat;
};

/** The choreography at a scale and set, read from the motion tokens as motionMs reads them. */
export function choreography(scale = 1, set?: string): Choreography {
  const m = motionMs(scale, set);
  return {
    enter: { ms: m.enter.duration, easing: "var(--hn-enter-easing)" },
    exit: { ms: m.exit.duration, easing: "var(--hn-exit-easing)" },
    stagger: { ms: m.stagger.step, delay: (i) => i * m.stagger.step },
    emphasis: { ms: m.emphasis.duration, easing: "var(--hn-emphasis-easing)" },
  };
}

/** The choreography at the nearest MotionProvider's scale and set. */
export function useChoreography(): Choreography {
  return choreography(useContext(MotionScale), useContext(MotionSet));
}
