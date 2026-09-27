// The shared frame of every motif: a 160×120 box, the ground shadow, and the accessibility
// default. Geometric style (decisions/illustration-style.json in @hansenexus/ui): flat filled
// shapes in tones of currentColor, one token accent, cut-outs as even-odd holes rather than a
// surface colour, so a motif sits on any background.
import type { ComponentProps, ReactNode } from "react";

/**
 * Any SVG attribute; `width` and `height` default to 160 × 120. Decorative (aria-hidden)
 * unless you name it with `aria-label` or `aria-labelledby`, which makes it `role="img"`.
 */
export type IllustrationProps = Omit<ComponentProps<"svg">, "children" | "viewBox">;

export function Frame({ children, ...props }: IllustrationProps & { children: ReactNode }) {
  const named = props["aria-label"] != null || props["aria-labelledby"] != null;
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: aria-hidden, or role="img" with the caller's label
    <svg
      viewBox="0 0 160 120"
      width={160}
      height={120}
      fill="none"
      focusable="false"
      aria-hidden={named ? undefined : true}
      role={named ? "img" : undefined}
      {...props}
    >
      <ellipse cx="80" cy="106" rx="50" ry="6" fill="currentColor" fillOpacity=".12" />
      {children}
    </svg>
  );
}
