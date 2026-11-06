// school/no-results: the search found nothing. An open book with lines under a lens; the action
// accent is the lens handle.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolNoResultsIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path d="M26 42 76 50v46L26 88z" fill="currentColor" fillOpacity=".16" />
      <path d="M126 42 76 50v46l50-8z" fill="currentColor" fillOpacity=".16" />
      <rect x="74" y="48" width="4" height="48" fill="currentColor" fillOpacity=".4" />
      <g fill="currentColor" opacity=".32">
        <path d="M34 54l32 5v5l-32-5z" />
        <path d="M34 66l24 4v5l-24-4z" />
        <path d="M86 59l32-5v5l-32 5z" />
      </g>
      <path
        d="M108 56a22 22 0 1 1 0 44 22 22 0 0 1 0-44zm0 8a14 14 0 1 0 0 28 14 14 0 0 0 0-28z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".5"
      />
      <rect
        x="124"
        y="90"
        width="9"
        height="22"
        rx="4.5"
        transform="rotate(-45 128.5 101)"
        fill="var(--hn-action-primary)"
      />
    </Frame>
  );
}
