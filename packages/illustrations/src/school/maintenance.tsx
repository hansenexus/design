// school/maintenance: work in progress. A bare frame of four bays, one still hatched, one lit in
// the busy colour, and a band of three braces being fitted in the top-right bay.
import {
  Brace,
  cells,
  Hatch,
  Lattice,
  Lit,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolMaintenanceIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="status-busy" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 2, 2, w);
        const band = pick(c, 1);
        const s = snap(Math.min(band.w, band.h) * 0.5);
        const gap = snap(band.w * 0.25);
        const y = snap(band.y + band.h / 2 + s / 2);
        return (
          <>
            <Hatch {...pick(c, 0)} />
            <Lit {...pick(c, 2)} />
            <Lattice box={bay} cols={2} rows={2} />
            <Brace x1={band.x + gap - s / 2} y1={y} x2={band.x + gap + s / 2} y2={y - s} />
            <Brace
              x1={band.x + 2 * gap - s / 2}
              y1={y}
              x2={band.x + 2 * gap + s / 2}
              y2={y - s}
              accent
            />
            <Brace x1={band.x + 3 * gap - s / 2} y1={y} x2={band.x + 3 * gap + s / 2} y2={y - s} />
          </>
        );
      }}
    </SchoolFrame>
  );
}
