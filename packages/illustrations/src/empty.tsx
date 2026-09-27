// empty: nothing exists yet. An open box, three shapes waiting to go in; lime accent.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function EmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M36 58 80 42l44 16-44 16z" fill="currentColor" fillOpacity=".16" />
      <path d="M36 58l44 16v26L36 84z" fill="currentColor" fillOpacity=".5" />
      <path d="M124 58 80 74v26l44-16z" fill="currentColor" fillOpacity=".32" />
      <circle cx="58" cy="26" r="7" fill="var(--hn-action-primary)" />
      <rect
        x="86"
        y="12"
        width="13"
        height="13"
        rx="2"
        transform="rotate(15 92.5 18.5)"
        fill="currentColor"
        fillOpacity=".5"
      />
      <path d="m110 38 7-12 7 12z" fill="currentColor" fillOpacity=".32" />
    </Frame>
  );
}
