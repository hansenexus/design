// Plain: the kit's Dialog sheet with text and two buttons. Only the action button carries the
// tone (danger or primary); no icon, no accent, no typed field at any risk.
import { cx } from "../../../src";
import {
  type AlertDialogStyle,
  actionVariant,
  CENTRED,
  type DialogProps,
  footer,
  SURFACE,
  TEXT,
} from "./category";

function Dialog({ scenario: s, parts: P }: DialogProps) {
  return (
    <P.Content className={cx(CENTRED, SURFACE, "gap-4 p-[22px]")}>
      <div className="flex flex-col gap-1.5">
        <P.Title className={TEXT.title}>{s.title}</P.Title>
        <P.Description className={TEXT.description}>{s.description}</P.Description>
      </div>
      <ul className={cx(TEXT.fact, "m-0 flex list-disc flex-col gap-0.5 pl-5")}>
        {s.consequences.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className={footer(s)}>
        <P.Cancel variant="secondary">{s.cancel}</P.Cancel>
        <P.Action variant={actionVariant(s)}>{s.action}</P.Action>
      </div>
    </P.Content>
  );
}

export const variant: AlertDialogStyle = {
  label: "Plain",
  summary:
    "Text and two buttons on the Dialog sheet; only the action button turns danger. Calmest and the closest to shadcn; a risky delete looks like any other question until the button.",
  Dialog,
};
