// school/quiz: a live question. A card with the question bar and three answers, the chosen one in
// the action accent, a timer disc at the corner.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function QuizIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="30" y="18" width="100" height="82" rx="8" fill="currentColor" fillOpacity=".16" />
      <rect x="42" y="30" width="56" height="8" rx="4" fill="currentColor" fillOpacity=".5" />
      <g fill="currentColor" opacity=".32">
        <circle cx="48" cy="54" r="5" />
        <rect x="58" y="51" width="40" height="6" rx="3" />
        <rect x="58" y="67" width="52" height="6" rx="3" />
        <circle cx="48" cy="86" r="5" />
        <rect x="58" y="83" width="32" height="6" rx="3" />
      </g>
      <circle cx="48" cy="70" r="6" fill="var(--hn-action-primary)" />
      <path
        d="M112 30a14 14 0 1 1 0 28 14 14 0 0 1 0-28zm0 5a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm-1.5 3h3v6.5l4 2.5-1.5 2.6-5.5-3.4z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".5"
      />
    </Frame>
  );
}
