// Typed: a high-risk ask holds the action until the name is typed; a normal one is plain. The
// consequences sit in a bordered list. On phones the dialog is a bottom sheet with full-width
// buttons in thumb reach. Focus still starts on Cancel; the field is the next tab stop.
import { type ChangeEvent, useId, useState } from "react";
import { cx, Input } from "../../../src";
import {
  type AlertDialogStyle,
  actionVariant,
  CENTRED,
  type DialogProps,
  footer,
  isPhone,
  SURFACE,
  TEXT,
} from "./category";

const SHEET =
  "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-hn-xl border border-hn-line-strong border-b-0 bg-hn-surface-card font-hn-sans text-hn-ink-primary shadow-hn-overlay outline-none";

function Dialog({ scenario: s, parts: P }: DialogProps) {
  const id = useId();
  const [typed, setTyped] = useState("");
  const gated = s.risk === "high" && s.confirm !== undefined;
  const ready = !gated || typed.trim() === s.confirm;
  const phone = isPhone(s);
  return (
    <P.Content
      className={cx(phone ? SHEET : cx(CENTRED, SURFACE), "gap-4 p-[22px]", phone && "pb-8")}
    >
      {phone ? (
        <span aria-hidden="true" className="mx-auto h-1 w-9 rounded-full bg-hn-line-strong" />
      ) : null}
      <div className="flex flex-col gap-1.5">
        <P.Title className={TEXT.title}>{s.title}</P.Title>
        <P.Description className={TEXT.description}>{s.description}</P.Description>
      </div>
      <ul
        aria-label={s.consequencesLabel}
        className={cx(
          TEXT.fact,
          "m-0 flex list-none flex-col rounded-hn-md border border-hn-line-subtle p-0"
        )}
      >
        {s.consequences.map((c) => (
          <li key={c} className="border-hn-line-subtle border-b px-3 py-2 last:border-b-0">
            {c}
          </li>
        ))}
      </ul>
      {gated ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={id} className="font-medium text-hn-ink-body text-sm">
            {s.confirmLabel}
          </label>
          <Input
            id={id}
            mono
            autoComplete="off"
            spellCheck={false}
            value={typed}
            placeholder={s.confirm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setTyped(e.target.value)}
          />
        </div>
      ) : null}
      <div className={footer(s)}>
        <P.Cancel variant="secondary">{s.cancel}</P.Cancel>
        <P.Action variant={actionVariant(s)} disabled={!ready}>
          {s.action}
        </P.Action>
      </div>
    </P.Content>
  );
}

export const variant: AlertDialogStyle = {
  label: "Typed for high risk",
  summary:
    "High-risk asks keep the action disabled until the name is typed; normal ones stay plain. Phones get a bottom sheet. Hardest to confirm by reflex; one more step on the deletes that need it.",
  Dialog,
};
