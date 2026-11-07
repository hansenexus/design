// school/vocabulary: a word and its pair. Two card Gefache in their frames, the left one lit,
// joined by a rail, with a brace in the right card where the second word goes.
import {
  Beam,
  Cell,
  CellBrace,
  Gefach,
  Lit,
  part,
  SchoolFrame,
  type SchoolIllustrationProps,
  snap,
} from "./frame";

export type { SchoolIllustrationProps };

export function VocabularyIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const left = part(bay, 0.06, 0.14, 0.36, 0.72);
        const right = part(bay, 0.58, 0.14, 0.36, 0.72);
        const y = snap(bay.y + bay.h / 2 - w / 2);
        return (
          <>
            <Lit {...left} />
            <Cell {...left} />
            <Gefach {...right} />
            <Cell {...right} />
            <Beam x={left.x + left.w + w} y={y} w={right.x - w - (left.x + left.w + w)} h={w} />
            <CellBrace box={right} size={0.6} accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
