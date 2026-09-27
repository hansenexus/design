// error: something failed. A window with a crit diamond, the "!" cut out of it.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function ErrorIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="30" y="18" width="100" height="76" rx="8" fill="currentColor" fillOpacity=".16" />
      <path d="M30 26a8 8 0 0 1 8-8h84a8 8 0 0 1 8 8v8H30z" fill="currentColor" fillOpacity=".4" />
      <path
        d="m80 42 20 20-20 20-20-20zm-2 11v9a2 2 0 0 0 4 0v-9a2 2 0 0 0-4 0zm2 14.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z"
        fillRule="evenodd"
        fill="var(--hn-status-crit)"
      />
    </Frame>
  );
}
