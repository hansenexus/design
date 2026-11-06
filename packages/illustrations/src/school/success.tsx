// school/success: done. A sheet with its lines and an ok seal with the check cut out, a star and
// confetti in ink tones.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolSuccessIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="40" y="16" width="80" height="84" rx="6" fill="currentColor" fillOpacity=".16" />
      <g fill="currentColor" opacity=".32">
        <rect x="50" y="28" width="44" height="6" rx="3" />
        <rect x="50" y="42" width="60" height="6" rx="3" />
        <rect x="50" y="56" width="36" height="6" rx="3" />
      </g>
      <path
        d="M102 62a20 20 0 1 1 0 40 20 20 0 0 1 0-40zm-11 21 3.5-3.5 5 5 11-11 3.5 3.5-14.5 14.5z"
        fillRule="evenodd"
        fill="var(--hn-status-ok)"
      />
      <path
        d="m30 24 3.5 7.5 8 1-6 5.5 1.5 8-7-4-7 4 1.5-8-6-5.5 8-1z"
        fill="currentColor"
        fillOpacity=".5"
      />
      <path d="m132 30 6 10h-12z" fill="currentColor" fillOpacity=".32" />
      <rect
        x="128"
        y="66"
        width="8"
        height="8"
        rx="2"
        transform="rotate(20 132 70)"
        fill="currentColor"
        fillOpacity=".5"
      />
    </Frame>
  );
}
