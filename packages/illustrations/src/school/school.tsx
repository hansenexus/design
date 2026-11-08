// school/school: the school itself. A 45° gable with its collar beam over the bay, the door as
// the lit Gefach between two windows, and a brace in each outer bay.
import {
  Beam,
  Brace,
  CellBrace,
  Gefach,
  Lit,
  part,
  SchoolFrame,
  type SchoolIllustrationProps,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const cx = snap(bay.x + bay.w / 2);
        const rise = snap(Math.min(bay.h * 0.4, bay.w * 0.3));
        const apex = bay.y + w;
        const eaves = apex + rise;
        const wall = { x: bay.x, y: eaves + w, w: bay.w, h: bay.y + bay.h - eaves - w };
        const door = part(wall, 0.38, 0.1, 0.24, 0.9);
        return (
          <>
            <Brace x1={cx - rise} y1={eaves} x2={cx} y2={apex} />
            <Brace x1={cx} y1={apex} x2={cx + rise} y2={eaves} />
            <Beam x={cx - rise} y={eaves} w={2 * rise} h={w} />
            <Gefach {...part(wall, 0.06, 0.2, 0.2, 0.4)} />
            <Gefach {...part(wall, 0.74, 0.2, 0.2, 0.4)} />
            <Lit {...door} />
            <Beam x={door.x - w} y={door.y} w={w} h={door.h} />
            <Beam x={door.x + door.w} y={door.y} w={w} h={door.h} />
            <CellBrace box={part(wall, 0, 0.6, 0.3, 0.4)} accent />
            <CellBrace box={part(wall, 0.7, 0.6, 0.3, 0.4)} falling />
          </>
        );
      }}
    </SchoolFrame>
  );
}
