// The animated form of the state motifs (design#223): the same motif as StateIllustration draws,
// in the active illustration set, moving as ./animations describes it, timed by the active
// motion set's tokens. Under reduced motion it is the still motif, nothing more: the OS setting
// (or the `reducedMotion` prop) skips the animation here, and the stylesheet itself never runs
// under prefers-reduced-motion: reduce or below a [data-reduced-motion] element.
import { useSyncExternalStore } from "react";
import { ANIMATION_CSS, animationKey, recipeFor } from "./animations";
import { STATE_ILLUSTRATIONS, type StateIllustrationProps, useIllustrationSet } from "./state";

const QUERY = "(prefers-reduced-motion: reduce)";

type MediaWindow = { matchMedia?: (query: string) => { matches: boolean } };

/** True when `win` asks for reduced motion; false without a window (a server render). */
export function prefersReducedMotion(win: MediaWindow | undefined = globalThis as MediaWindow) {
  return win?.matchMedia?.(QUERY).matches ?? false;
}

function subscribe(onChange: () => void) {
  const media = (globalThis as { matchMedia?: (q: string) => MediaQueryList }).matchMedia?.(QUERY);
  media?.addEventListener("change", onChange);
  return () => media?.removeEventListener("change", onChange);
}

/** The OS reduced-motion setting, live; false on the server, where the stylesheet decides. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => prefersReducedMotion(),
    () => false
  );
}

export type AnimatedIllustrationProps = StateIllustrationProps & {
  /** Draw the still motif whatever the OS says; the OS setting applies without it. */
  reducedMotion?: boolean;
  /**
   * A motion set id (design#221) to time this motif by, set as data-motion on its <svg>.
   * Without it the motif follows the nearest data-motion, the page's active set.
   */
  motionSet?: string;
};

/**
 * The state motif `state` of the active set (or of `set`), animated. Mount it again (a new
 * `key`) to replay. Any SVG attribute passes through, as on the still motif.
 */
export function AnimatedIllustration({
  state,
  set,
  reducedMotion,
  motionSet,
  ...props
}: AnimatedIllustrationProps) {
  const active = useIllustrationSet();
  const osReduced = useReducedMotion();
  const id = set ?? active;
  const Motif = STATE_ILLUSTRATIONS[id][state];
  if (reducedMotion ?? osReduced) return <Motif {...props} />;
  const recipe = recipeFor(id, state);
  return (
    <>
      <style href="@hansenexus/illustrations/animated" precedence="hn-illustrations">
        {ANIMATION_CSS}
      </style>
      <Motif
        {...props}
        data-hn-motion={animationKey(id, state)}
        data-hn-play={recipe.play}
        data-motion={motionSet}
      />
    </>
  );
}
