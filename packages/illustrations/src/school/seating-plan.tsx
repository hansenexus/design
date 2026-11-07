// school/seating-plan: who sits where. A grid of twelve seat Gefache, one lit, one braced empty.
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
} from "./frame";

export type { SchoolIllustrationProps };

export function SeatingPlanIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 4, 3, w);
        return (
          <>
            {c.map((cell, i) =>
              i === 6 ? (
                <Lit key={keyOf(cell)} {...cell} />
              ) : i === 11 ? null : (
                <Gefach key={keyOf(cell)} {...cell} />
              )
            )}
            <Lattice box={bay} cols={4} rows={3} />
            <CellBrace box={pick(c, 11)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
