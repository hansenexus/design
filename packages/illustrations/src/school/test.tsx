// school/test: a test. An answer sheet with its boxes, one ticked, and the pencil in the action
// accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function TestIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="36" y="14" width="78" height="88" rx="6" fill="currentColor" fillOpacity=".16" />
      <rect x="62" y="10" width="26" height="10" rx="3" fill="currentColor" fillOpacity=".5" />
      <g fill="currentColor" opacity=".32">
        <rect x="46" y="32" width="10" height="10" rx="2" />
        <rect x="62" y="34" width="40" height="6" rx="3" />
        <rect x="62" y="52" width="32" height="6" rx="3" />
        <rect x="46" y="68" width="10" height="10" rx="2" />
        <rect x="62" y="70" width="36" height="6" rx="3" />
      </g>
      <path
        d="M46 50h10v10H46zm2 4.6 1.6-1.6 1.8 1.8 3.4-3.4L56.4 53l-5 5z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".5"
      />
      <rect
        x="116"
        y="46"
        width="8"
        height="44"
        rx="2"
        transform="rotate(30 120 68)"
        fill="var(--hn-action-primary)"
      />
      <path d="m99 92 11 3-6-8z" fill="currentColor" fillOpacity=".5" />
    </Frame>
  );
}
