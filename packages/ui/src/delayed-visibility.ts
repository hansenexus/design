import { useEffect, useState } from "react";
import { motionMs, useMotionMs } from "./motion";

export type DelayedVisibilityOptions = {
  /**
   * Wait before showing; work that finishes sooner shows nothing. Default: the delay.pending
   * token, scaled by a MotionProvider in the hook.
   */
  delayMs?: number;
  /** Once shown, stay at least this long. Default: the min-visible.pending token, scaled alike. */
  minVisibleMs?: number;
};

/**
 * The timing rule for pending indicators, without React: `set(true)` shows after `delayMs`,
 * `set(false)` hides at once if nothing showed yet, otherwise once `minVisibleMs` has passed
 * since it showed. `onChange` fires on every visibility change.
 */
export function createDelayedVisibility(
  onChange: (visible: boolean) => void,
  {
    delayMs = motionMs().delay.pending,
    minVisibleMs = motionMs()["min-visible"].pending,
  }: DelayedVisibilityOptions = {}
) {
  let visible = false;
  let shownAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const change = (next: boolean) => {
    visible = next;
    if (next) shownAt = Date.now();
    onChange(next);
  };

  return {
    set(pending: boolean) {
      clear();
      if (pending && !visible) timer = setTimeout(() => change(true), delayMs);
      if (!pending && visible) {
        const left = minVisibleMs - (Date.now() - shownAt);
        if (left > 0) timer = setTimeout(() => change(false), left);
        else change(false);
      }
    },
    dispose: clear,
  };
}

/**
 * Whether a pending indicator for `pending` should render: not before `delayMs`, and once it
 * does, for at least `minVisibleMs`. Both default to the motion tokens (200 ms, 400 ms) at the
 * nearest MotionProvider's scale and are read once, on mount. Starts hidden, so server markup
 * never contains the indicator.
 */
export function useDelayedVisibility(pending: boolean, options?: DelayedVisibilityOptions) {
  const timing = useMotionMs();
  const [visible, setVisible] = useState(false);
  const [controller] = useState(() =>
    createDelayedVisibility(setVisible, {
      delayMs: options?.delayMs ?? timing.delay.pending,
      minVisibleMs: options?.minVisibleMs ?? timing["min-visible"].pending,
    })
  );
  useEffect(() => controller.set(pending), [controller, pending]);
  useEffect(() => controller.dispose, [controller]);
  return visible;
}
