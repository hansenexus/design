import { ms } from "@hansenexus/tokens";
import { useEffect, useState } from "react";

export type DelayedVisibilityOptions = {
  /** Wait before showing; work that finishes sooner shows nothing. Default: the delay.pending token. */
  delayMs?: number;
  /** Once shown, stay at least this long. Default: the min-visible.pending token. */
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
    delayMs = ms.delay.pending,
    minVisibleMs = ms["min-visible"].pending,
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
 * does, for at least `minVisibleMs`. Both default to the motion tokens (200 ms, 400 ms) and are
 * read once, on mount. Starts hidden, so server markup never contains the indicator.
 */
export function useDelayedVisibility(pending: boolean, options?: DelayedVisibilityOptions) {
  const [visible, setVisible] = useState(false);
  const [controller] = useState(() => createDelayedVisibility(setVisible, options));
  useEffect(() => controller.set(pending), [controller, pending]);
  useEffect(() => controller.dispose, [controller]);
  return visible;
}
