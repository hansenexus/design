// school/offline: no connection. A tablet on the desk with the signal arcs, struck through by a
// warn bar.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolOfflineIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="28" y="88" width="104" height="8" rx="3" fill="currentColor" fillOpacity=".32" />
      <rect x="44" y="22" width="72" height="62" rx="6" fill="currentColor" fillOpacity=".16" />
      <path d="M44 28a6 6 0 0 1 6-6h60a6 6 0 0 1 6 6v6H44z" fill="currentColor" fillOpacity=".4" />
      <rect x="74" y="76" width="12" height="4" rx="2" fill="currentColor" fillOpacity=".4" />
      <g fill="currentColor" fillOpacity=".5" fillRule="evenodd">
        <path d="M56 58a24 24 0 0 1 48 0h-7a17 17 0 0 0-34 0z" />
        <path d="M66 62a14 14 0 0 1 28 0h-7a7 7 0 0 0-14 0z" />
      </g>
      <circle cx="80" cy="68" r="4" fill="currentColor" fillOpacity=".5" />
      <rect
        x="76"
        y="20"
        width="8"
        height="70"
        rx="4"
        transform="rotate(-40 80 55)"
        fill="var(--hn-status-warn)"
      />
    </Frame>
  );
}
