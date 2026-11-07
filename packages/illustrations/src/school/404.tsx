// school/404: the page is not here. A wall of six Gefache with one knocked out: the top middle
// is lit and hatched, the gap that should have been plastered, and a brace props the wall next to it.
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

export function SchoolNotFoundIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 3, 2, w);
        const gap = pick(c, 1);
        return (
          <>
            {c.map((cell, i) => (i === 1 ? null : <Gefach key={keyOf(cell)} {...cell} />))}
            <Lit {...gap} />
            <Hatch {...gap} />
            <Lattice box={bay} cols={3} rows={2} />
            <CellBrace box={pick(c, 3)} falling accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
