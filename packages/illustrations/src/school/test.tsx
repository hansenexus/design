// school/test: a test. Three rows of answer box and line, the first box lit, and the pencil as a
// brace leaning on the sill at the right.
import {
  Beam,
  Brace,
  cells,
  Gefach,
  Lit,
  SchoolFrame,
  type SchoolIllustrationProps,
  SILL,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function TestIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const sheet = { x: bay.x, y: bay.y, w: snap(bay.w * 0.68), h: bay.h };
        const rows = cells(sheet, 1, 3, w);
        const pencil = snap(bay.h * 0.42);
        return (
          <>
            {rows.map((row, i) => {
              const s = snap(row.h * 0.7);
              const y = snap(row.y + (row.h - s) / 2);
              const box = { x: row.x, y, w: s, h: s };
              return (
                <g key={row.y}>
                  {i === 0 ? <Lit {...box} /> : <Gefach {...box} />}
                  <Beam x={row.x + s + w} y={snap(y + s / 2 - w / 2)} w={row.w - s - w} h={w} />
                </g>
              );
            })}
            <Brace
              x1={bay.x + bay.w - pencil}
              y1={SILL}
              x2={bay.x + bay.w}
              y2={SILL - pencil}
              accent
            />
          </>
        );
      }}
    </SchoolFrame>
  );
}
