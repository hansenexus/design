// no-results: things exist, the search matched none. A list card under a lens; lime accent.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function NoResultsIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="26" y="20" width="84" height="74" rx="8" fill="currentColor" fillOpacity=".16" />
      <rect x="38" y="34" width="44" height="7" rx="3.5" fill="currentColor" fillOpacity=".32" />
      <rect x="38" y="50" width="56" height="7" rx="3.5" fill="currentColor" fillOpacity=".32" />
      <rect x="38" y="66" width="32" height="7" rx="3.5" fill="currentColor" fillOpacity=".32" />
      <path
        d="M112 48a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm0 9a15 15 0 1 0 0 30 15 15 0 0 0 0-30z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".5"
      />
      <rect
        x="128"
        y="86"
        width="9"
        height="22"
        rx="4.5"
        transform="rotate(-45 132.5 97)"
        fill="var(--hn-action-primary)"
      />
    </Frame>
  );
}
