// school/success: done. Four Gefache; the bottom-right one is lit in the ok colour and carries
// the check, two 45° cuts of beam, while a brace holds the top-left bay.
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

export function SchoolSuccessIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="status-ok" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 2, 2, w);
        const ok = pick(c, 3);
        const a = snap(Math.min(ok.w, ok.h) * 0.16);
        const x = snap(ok.x + ok.w / 2 - a * 1.5);
        const y = snap(ok.y + ok.h / 2);
        return (
          <>
            {c.map((cell, i) =>
              i === 3 ? <Lit key={keyOf(cell)} {...cell} /> : <Gefach key={keyOf(cell)} {...cell} />
            )}
            <path
              d={`M${x} ${y} L${x + a} ${y + a} L${x + 3 * a} ${y - a}`}
              stroke="currentColor"
              strokeWidth={w}
            />
            <Lattice box={bay} cols={2} rows={2} />
            <CellBrace box={pick(c, 0)} falling accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
