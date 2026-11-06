// school/maintenance: being worked on. A gear over a ruler, busy hub.
import { Frame, type IllustrationProps } from "../frame";

export type { IllustrationProps };

export function SchoolMaintenanceIllustration(props: IllustrationProps) {
  const r = 22;
  const t = r * 0.36;
  return (
    <Frame {...props}>
      <g fill="currentColor" opacity=".5">
        <circle cx="74" cy="48" r={r} />
        {[0, 45, 90, 135].map((a) => (
          <rect
            key={a}
            x={74 - t / 2}
            y={48 - r - t}
            width={t}
            height={2 * (r + t)}
            rx={t / 4}
            transform={`rotate(${a} 74 48)`}
          />
        ))}
      </g>
      <circle cx="74" cy="48" r="8" fill="var(--hn-status-busy)" />
      <rect x="28" y="82" width="104" height="14" rx="2" fill="currentColor" fillOpacity=".32" />
      <g fill="currentColor" opacity=".5">
        {[36, 46, 56, 66, 76, 86, 96, 106, 116, 126].map((x, i) => (
          <rect key={x} x={x - 1} y="82" width="2" height={i % 2 === 0 ? 7 : 4} />
        ))}
      </g>
      <path d="M112 36h12v4h-6l6 8-4 2-6-8z" fill="currentColor" fillOpacity=".32" />
    </Frame>
  );
}
