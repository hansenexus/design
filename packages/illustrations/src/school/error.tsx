// school/error: something failed. A board on its easel with the crit diamond, the "!" cut out.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolErrorIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <path
        d="M32 18h96a4 4 0 0 1 4 4v58a4 4 0 0 1-4 4H32a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4zm6 8v50h84V26z"
        fillRule="evenodd"
        fill="currentColor"
        fillOpacity=".4"
      />
      <rect x="38" y="26" width="84" height="50" fill="currentColor" fillOpacity=".16" />
      <rect
        x="44"
        y="84"
        width="6"
        height="22"
        rx="2"
        transform="rotate(8 47 95)"
        fill="currentColor"
        fillOpacity=".32"
      />
      <rect
        x="110"
        y="84"
        width="6"
        height="22"
        rx="2"
        transform="rotate(-8 113 95)"
        fill="currentColor"
        fillOpacity=".32"
      />
      <rect x="100" y="70" width="14" height="4" rx="1" fill="currentColor" fillOpacity=".5" />
      <path
        d="m80 32 19 19-19 19-19-19zm-2 10.5v9a2 2 0 0 0 4 0v-9a2 2 0 0 0-4 0zm2 14a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"
        fillRule="evenodd"
        fill="var(--hn-status-crit)"
      />
    </Frame>
  );
}
