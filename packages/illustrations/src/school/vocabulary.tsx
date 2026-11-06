// school/vocabulary: words to learn. Two flash cards, the front one with its word and meaning
// bars, the lexilink bracket mark in the action accent as the engine badge.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function VocabularyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect
        x="48"
        y="22"
        width="84"
        height="56"
        rx="6"
        transform="rotate(-8 90 50)"
        fill="currentColor"
        fillOpacity=".16"
      />
      <rect x="30" y="36" width="84" height="56" rx="6" fill="currentColor" fillOpacity=".32" />
      <rect x="42" y="50" width="36" height="8" rx="4" fill="currentColor" fillOpacity=".5" />
      <rect x="42" y="66" width="56" height="5" rx="2.5" fill="currentColor" fillOpacity=".5" />
      <rect x="42" y="76" width="40" height="5" rx="2.5" fill="currentColor" fillOpacity=".5" />
      <path d="M96 46h8v4h-4v12h4v4h-8zm16 0h-8v4h4v12h-4v4h8z" fill="var(--hn-action-primary)" />
    </Frame>
  );
}
