// school/offline: the line is cut. Three bays under a rail that stops short on both sides of the
// middle one, whose lower half is lit in the warn colour; a brace holds the left bay.
import {
  Beam,
  CellBrace,
  cells,
  Gefach,
  Lattice,
  Lit,
  part,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolOfflineIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="status-warn" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 3, 1, w);
        const mid = pick(c, 1);
        const y = snap(bay.y + bay.h * 0.42);
        const cut = snap(mid.w * 0.3);
        return (
          <>
            <Gefach {...pick(c, 0)} />
            <Gefach {...pick(c, 2)} />
            <Lit {...part(mid, 0, 0.5, 1, 0.5)} />
            <Beam x={bay.x} y={y} w={mid.x + cut - bay.x} h={w} />
            <Beam x={mid.x + mid.w - cut} y={y} w={bay.x + bay.w - (mid.x + mid.w - cut)} h={w} />
            <Lattice box={bay} cols={3} rows={1} />
            <CellBrace box={part(pick(c, 0), 0, 0.5, 1, 0.5)} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
