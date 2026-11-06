// school/timetable: the week. A header row over five days of lessons, the current lesson in the
// action accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

const DAYS = [34, 54, 74, 94, 114];
const SLOTS = [38, 54, 70, 86];

export function TimetableIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="30" y="16" width="100" height="88" rx="6" fill="currentColor" fillOpacity=".16" />
      <path d="M30 22a6 6 0 0 1 6-6h88a6 6 0 0 1 6 6v8H30z" fill="currentColor" fillOpacity=".5" />
      <g fill="currentColor" opacity=".32">
        {DAYS.flatMap((x) =>
          SLOTS.map((y) =>
            x === 74 && y === 54 ? null : (
              <rect key={`${x}-${y}`} x={x} y={y} width="12" height="12" rx="2" />
            )
          )
        )}
      </g>
      <rect x="74" y="54" width="12" height="28" rx="2" fill="var(--hn-action-primary)" />
    </Frame>
  );
}
