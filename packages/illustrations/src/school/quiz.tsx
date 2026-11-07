// school/quiz: a question with four answers. The question as a hatched band over a rail, the
// answers as four Gefache: the right one lit, a wrong one crossed with a brace.
import {
  Beam,
  CellBrace,
  cells,
  Gefach,
  Hatch,
  keyOf,
  Lattice,
  Lit,
  part,
  pick,
  SchoolFrame,
  type SchoolIllustrationProps,
} from "./frame";

export type { SchoolIllustrationProps };

export function QuizIllustration(props: SchoolIllustrationProps) {
  return (
    <SchoolFrame token="action-primary" {...props}>
      {({ bay, w }) => {
        const question = part(bay, 0, 0, 1, 0.28);
        const answers = { x: bay.x, y: question.y + question.h + w, w: bay.w, h: 0 };
        answers.h = bay.y + bay.h - answers.y;
        const c = cells(answers, 2, 2, w);
        return (
          <>
            <Hatch {...question} />
            <Beam x={bay.x} y={question.y + question.h} w={bay.w} h={w} />
            {c.map((cell, i) =>
              i === 2 ? <Lit key={keyOf(cell)} {...cell} /> : <Gefach key={keyOf(cell)} {...cell} />
            )}
            <Lattice box={answers} cols={2} rows={2} />
            <CellBrace box={pick(c, 1)} falling accent />
          </>
        );
      }}
    </SchoolFrame>
  );
}
