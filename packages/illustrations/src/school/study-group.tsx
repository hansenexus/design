// school/study-group: learning together. Three tall Gefache for three at the bench, the middle
// one lit as the one speaking, the bench a rail over a braced bay.
import {
  Beam,
  CellBrace,
  cells,
  Gefach,
  keyOf,
  Lattice,
  Lit,
  part,
  SchoolFrame,
  type SchoolIllustrationProps,
} from "./frame";

export type { SchoolIllustrationProps };

export function StudyGroupIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const heads = part(bay, 0.1, 0, 0.8, 0.56);
        const bench = { x: bay.x, y: heads.y + heads.h, w: bay.w, h: w };
        const under = { x: bay.x, y: bench.y + w, w: bay.w, h: bay.y + bay.h - bench.y - w };
        const c = cells(heads, 3, 1, w);
        return (
          <>
            {c.map((cell, i) =>
              i === 1 ? <Lit key={keyOf(cell)} {...cell} /> : <Gefach key={keyOf(cell)} {...cell} />
            )}
            <Lattice box={heads} cols={3} rows={1} />
            <Beam {...bench} />
            <CellBrace box={under} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
