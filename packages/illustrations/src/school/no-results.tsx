// school/no-results: looked, found nothing. A lens: one square Gefach, lit, with its 45° handle
// braced down to the sill, beside two shelves that are still open hatching.
import {
  Brace,
  Cell,
  cells,
  Hatch,
  Lattice,
  Lit,
  part,
  SchoolFrame,
  type SchoolIllustrationProps,
  SILL,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolNoResultsIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const side = snap(bay.h * 0.5);
        const lens = {
          x: snap(bay.x + bay.w * 0.1),
          y: snap(bay.y + bay.h * 0.12),
          w: side,
          h: side,
        };
        const grip = SILL - (lens.y + side);
        const shelves = part(bay, 0.68, 0, 0.32, 1);
        return (
          <>
            <Lit {...lens} />
            <Cell {...lens} />
            <Brace
              x1={lens.x + side}
              y1={lens.y + side}
              x2={lens.x + side + grip}
              y2={SILL}
              accent
            />
            {cells(shelves, 1, 2, w).map((cell) => (
              <Hatch key={cell.y} {...cell} />
            ))}
            <Lattice box={shelves} cols={1} rows={2} />
          </>
        );
      }}
    </SchoolFrame>
  );
}
