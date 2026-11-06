// school/class: a class. The board at the front with a chalk line in the action accent, three
// desks before it.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function ClassIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M34 14h92a4 4 0 0 1 4 4v46a4 4 0 0 1-4 4H34a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4zm4 6v42h84V20z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".4"
      />
      <rect x="38" y="20" width="84" height="42" fill="currentColor" fillOpacity=".16" />
      <rect x="48" y="30" width="40" height="5" rx="2.5" fill="var(--hn-action-primary)" />
      <rect x="48" y="42" width="26" height="5" rx="2.5" fill="currentColor" fillOpacity=".32" />
      <g fill="currentColor">
        <rect x="30" y="80" width="28" height="7" rx="2" opacity=".5" />
        <rect x="66" y="80" width="28" height="7" rx="2" opacity=".5" />
        <rect x="102" y="80" width="28" height="7" rx="2" opacity=".5" />
        <rect x="34" y="87" width="4" height="14" opacity=".32" />
        <rect x="70" y="87" width="4" height="14" opacity=".32" />
        <rect x="106" y="87" width="4" height="14" opacity=".32" />
        <rect x="52" y="87" width="4" height="14" opacity=".32" />
        <rect x="88" y="87" width="4" height="14" opacity=".32" />
        <rect x="124" y="87" width="4" height="14" opacity=".32" />
      </g>
    </Frame>
  );
}
