// school/404: the page is not here. A row of lockers, the middle door open on an empty locker, a
// pin over it; action accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolNotFoundIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="30" y="34" width="28" height="68" rx="3" fill="currentColor" fillOpacity=".32" />
      <rect x="102" y="34" width="28" height="68" rx="3" fill="currentColor" fillOpacity=".32" />
      <path d="M62 34h36v68H62z" fill="currentColor" fillOpacity=".16" />
      <path d="M62 34 86 44v62L62 102z" fill="currentColor" fillOpacity=".5" />
      <g fill="currentColor" opacity=".5">
        <rect x="36" y="42" width="16" height="3" rx="1.5" />
        <rect x="108" y="42" width="16" height="3" rx="1.5" />
        <rect x="36" y="48" width="16" height="3" rx="1.5" />
        <rect x="108" y="48" width="16" height="3" rx="1.5" />
        <rect x="51" y="66" width="3" height="8" rx="1.5" />
        <rect x="106" y="66" width="3" height="8" rx="1.5" />
      </g>
      <path
        d="M80 6a12 12 0 0 1 12 12c0 8.5-12 19-12 19S68 26.5 68 18A12 12 0 0 1 80 6zm0 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"
        fillRule="evenodd"
        fill="var(--hn-action-primary)"
      />
    </Frame>
  );
}
