// maintenance: being worked on. Two meshing gears, busy hubs.
import { Frame, type IllustrationProps } from "./frame";

export type { IllustrationProps };

/** A gear: a disc and four crossed teeth bars, drawn as one shape through group opacity. */
function Gear({ x, y, r, opacity }: { x: number; y: number; r: number; opacity: string }) {
  const t = r * 0.36;
  return (
    <g fill="currentColor" opacity={opacity}>
      <circle cx={x} cy={y} r={r} />
      {[0, 45, 90, 135].map((a) => (
        <rect
          key={a}
          x={x - t / 2}
          y={y - r - t}
          width={t}
          height={2 * (r + t)}
          rx={t / 4}
          transform={`rotate(${a} ${x} ${y})`}
        />
      ))}
    </g>
  );
}

export function MaintenanceIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <Gear x={66} y={56} r={26} opacity=".5" />
      <Gear x={112} y={78} r={14} opacity=".32" />
      <circle cx="66" cy="56" r="9" fill="var(--hn-status-busy)" />
      <circle cx="112" cy="78" r="5" fill="var(--hn-status-busy)" />
    </Frame>
  );
}
