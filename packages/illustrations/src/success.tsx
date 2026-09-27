// success: done. An ok disc with the check cut out, confetti in ink tones and lime.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function SuccessIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <circle cx="80" cy="60" r="36" fill="currentColor" fillOpacity=".16" />
      <path
        d="M80 36a24 24 0 1 1 0 48 24 24 0 0 1 0-48zm-13 25 4-4 6 6 13-13 4 4-17 17z"
        fillRule="evenodd"
        fill="var(--hn-status-ok)"
      />
      <circle cx="30" cy="34" r="5" fill="var(--hn-action-primary)" />
      <path d="m124 22 7 12h-14z" fill="currentColor" fillOpacity=".5" />
      <rect
        x="126"
        y="74"
        width="10"
        height="10"
        rx="2"
        transform="rotate(20 131 79)"
        fill="currentColor"
        fillOpacity=".32"
      />
      <rect x="28" y="80" width="8" height="8" rx="2" fill="currentColor" fillOpacity=".5" />
    </Frame>
  );
}
