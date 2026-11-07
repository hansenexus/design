// school/class: a class. The board as a wide lit Gefach in its own frame over a row of three
// desks, a brace under the last one.
import {
  Cell,
  CellBrace,
  cells,
  Gefach,
  Lattice,
  Lit,
  part,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
} from "./frame";

export type { SchoolIllustrationProps };

export function ClassIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const board = part(bay, 0.14, 0.1, 0.72, 0.36);
        const desks = part(bay, 0, 0.66, 1, 0.34);
        const c = cells(desks, 3, 1, w);
        return (
          <>
            <Lit {...board} />
            <Cell {...board} />
            {c.map((cell) => (
              <Gefach key={cell.x} {...cell} />
            ))}
            <Lattice box={desks} cols={3} rows={1} />
            <CellBrace box={pick(c, 2)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
