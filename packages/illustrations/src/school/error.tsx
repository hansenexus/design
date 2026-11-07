// school/error: something broke. Four Gefache; the top-right one is lit in the crit colour and
// holds a diamond, the sawn mark a carpenter cuts over a bad joint.
import {
  CellBrace,
  cells,
  Gefach,
  keyOf,
  Lattice,
  Lit,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolErrorIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="status-crit" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 2, 2, w);
        const hot = pick(c, 1);
        const r = snap(Math.min(hot.w, hot.h) * 0.28);
        const cx = snap(hot.x + hot.w / 2);
        const cy = snap(hot.y + hot.h / 2);
        return (
          <>
            {c.map((cell, i) =>
              i === 1 ? <Lit key={keyOf(cell)} {...cell} /> : <Gefach key={keyOf(cell)} {...cell} />
            )}
            <path
              d={`M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z`}
              fill="currentColor"
            />
            <Lattice box={bay} cols={2} rows={2} />
            <CellBrace box={pick(c, 2)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
