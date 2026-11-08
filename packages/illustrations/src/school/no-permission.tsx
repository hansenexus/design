// school/no-permission: not for you. A door Gefach in the middle bay, lit in the warn colour and
// barred with an Andreaskreuz, between two plastered bays.
import {
  Cross,
  cells,
  Gefach,
  Lattice,
  Lit,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
} from "./frame";

export type { SchoolIllustrationProps };

export function SchoolNoPermissionIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="status-warn" {...props}>
      {({ bay, w }) => {
        const c = cells(bay, 3, 1, w);
        const door = pick(c, 1);
        return (
          <>
            <Gefach {...pick(c, 0)} />
            <Lit {...door} />
            <Gefach {...pick(c, 2)} />
            <Lattice box={bay} cols={3} rows={1} />
            <Cross {...door} />
          </>
        );
      }}
    </SchoolFrame>
  );
}
