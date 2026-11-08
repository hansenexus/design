// school/timetable: the week. A header rail of five shaded day Gefache over three rows of
// lessons, one lit, one free period braced.
import {
  Beam,
  CellBrace,
  cells,
  Gefach,
  keyOf,
  Lattice,
  Lit,
  part,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
  SHADE,
} from "./frame";

export type { SchoolIllustrationProps };

export function TimetableIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const head = part(bay, 0, 0, 1, 0.2);
        const body = { x: bay.x, y: head.y + head.h + w, w: bay.w, h: 0 };
        body.h = bay.y + bay.h - body.y;
        const days = cells(head, 5, 1, w);
        const c = cells(body, 5, 3, w);
        return (
          <>
            {days.map((cell) => (
              <Gefach key={cell.x} {...cell} tone={SHADE} />
            ))}
            <Lattice box={head} cols={5} rows={1} />
            <Beam x={bay.x} y={head.y + head.h} w={bay.w} h={w} />
            {c.map((cell, i) =>
              i === 7 ? (
                <Lit key={keyOf(cell)} {...cell} />
              ) : i === 13 ? null : (
                <Gefach key={keyOf(cell)} {...cell} />
              )
            )}
            <Lattice box={body} cols={5} rows={3} />
            <CellBrace box={pick(c, 13)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
