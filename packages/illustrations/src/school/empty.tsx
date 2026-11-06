// school/empty: nothing here yet. A blank exercise book open on a desk, a pencil waiting; the
// action accent is the pencil.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolEmptyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="28" y="74" width="104" height="8" rx="3" fill="currentColor" fillOpacity=".5" />
      <rect x="38" y="82" width="6" height="22" rx="2" fill="currentColor" fillOpacity=".32" />
      <rect x="116" y="82" width="6" height="22" rx="2" fill="currentColor" fillOpacity=".32" />
      <path
        d="M48 44h30v30H48a4 4 0 0 1-4-4V48a4 4 0 0 1 4-4z"
        fill="currentColor"
        fillOpacity=".16"
      />
      <path
        d="M82 44h30a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H82z"
        fill="currentColor"
        fillOpacity=".16"
      />
      <rect x="78" y="44" width="4" height="30" fill="currentColor" fillOpacity=".4" />
      <rect
        x="113"
        y="18"
        width="8"
        height="38"
        rx="2"
        transform="rotate(35 117 37)"
        fill="var(--hn-action-primary)"
      />
      <path d="m99.5 59.5 10 5-4-9z" fill="currentColor" fillOpacity=".5" />
    </Frame>
  );
}
