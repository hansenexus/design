// school/empty: nothing here yet. A wall of six Gefache whose middle bay is still open, hatched
// for the plaster to come; the first Gefach is lit as the place to start.
import {
  CellBrace,
  cells,
  Gefach,
  Hatch,
  keyOf,
  Lattice,
  Lit,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolEmptyIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 3, 2, w);
        return (
          <>
            {c.map((cell, i) =>
              i === 0 ? (
                <Lit key={keyOf(cell)} {...cell} />
              ) : i % 3 === 1 ? (
                <Hatch key={keyOf(cell)} {...cell} />
              ) : (
                <Gefach key={keyOf(cell)} {...cell} />
              )
            )}
            <Lattice box={bay} cols={3} rows={2} />
            <CellBrace box={pick(c, 5)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
