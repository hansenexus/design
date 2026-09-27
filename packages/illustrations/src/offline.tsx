// offline: no connection. A cloud, struck through by a warn bar.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

export function OfflineIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g fill="currentColor" opacity=".32">
        <circle cx="64" cy="62" r="20" />
        <circle cx="90" cy="52" r="26" />
        <rect x="36" y="62" width="88" height="24" rx="12" />
      </g>
      <rect x="48" y="90" width="64" height="6" rx="3" fill="currentColor" fillOpacity=".16" />
      <rect
        x="76"
        y="18"
        width="8"
        height="84"
        rx="4"
        transform="rotate(-40 80 60)"
        fill="var(--hn-status-warn)"
      />
    </Frame>
  );
}
