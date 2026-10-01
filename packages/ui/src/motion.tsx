import { ms } from "@hansenexus/tokens";
import { createContext, type ReactNode, useContext } from "react";

/** The motion tokens in milliseconds, in the shape of the `ms` export of @hansenexus/tokens. */
export type MotionMs = {
  readonly [K in keyof typeof ms]: { readonly [L in keyof (typeof ms)[K]]: number };
};

/**
 * Every motion token in milliseconds, times `scale`: 1 is the tokens as they are, 4 plays motion
 * four times as slow, 0 is reduced motion. The one place component code reads the `ms` tokens
 * from, so a MotionProvider reaches every timer (tests/motion.test.tsx enforces it).
 */
export function motionMs(scale = 1): MotionMs {
  return Object.fromEntries(
    Object.entries(ms).map(([group, values]) => [
      group,
      Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value * scale])),
    ])
  ) as MotionMs;
}

const MotionScale = createContext(1);

/**
 * Scales the motion tokens that component timers read (the pending indicator's delay and
 * minimum) for everything inside: 4 plays them four times as slow, 0 resolves them to 0, as
 * reduced motion does. CSS durations follow the --hn-* variables instead, and motion-reduce:
 * styles a data-reduced-motion attribute. Without a provider the scale is 1.
 */
export function MotionProvider({ scale, children }: { scale: number; children: ReactNode }) {
  return <MotionScale.Provider value={scale}>{children}</MotionScale.Provider>;
}

/** The motion tokens in ms at the nearest MotionProvider's scale. */
export function useMotionMs(): MotionMs {
  return motionMs(useContext(MotionScale));
}
