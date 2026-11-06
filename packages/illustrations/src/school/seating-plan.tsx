// school/seating-plan: who sits where. The teacher's desk at the top, three rows of seats, one
// seat in the action accent.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

const COLS = [34, 62, 90, 118];
const ROWS = [44, 64, 84];

export function SeatingPlanIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <rect x="56" y="16" width="48" height="12" rx="3" fill="currentColor" fillOpacity=".5" />
      <g fill="currentColor" opacity=".32">
        {ROWS.flatMap((y) =>
          COLS.map((x) =>
            x === 90 && y === 64 ? null : (
              <rect key={`${x}-${y}`} x={x - 10} y={y - 7} width="20" height="14" rx="3" />
            )
          )
        )}
      </g>
      <rect x="80" y="57" width="20" height="14" rx="3" fill="var(--hn-action-primary)" />
    </Frame>
  );
}
