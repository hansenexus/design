// Marked, the winner (decisions/alert-dialog.json): the tone is visible before the buttons. A destructive ask gets a crit glyph in a tinted
// tile and a crit rule along the top edge; a neutral one the info glyph on a raised tile. The
// consequences sit in a raised box. On phones the glyph and the title centre above the text.
import { cx, StatusGlyph } from "../../../src";
import { InfoIcon } from "../../../src/icons";
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

function Mark({ destructive }: { destructive: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-hn-lg",
        destructive ? "bg-hn-status-crit/15" : "bg-hn-surface-raised text-hn-status-busy"
      )}
    >
      {destructive ? <StatusGlyph status="crit" size={16} /> : <InfoIcon />}
    </span>
  );
}

function Dialog({ scenario: s, parts: P }: DialogProps) {
  const destructive = s.tone === "destructive";
  const phone = isPhone(s);
  return (
    <P.Content
      className={cx(
        CENTRED,
        SURFACE,
        "gap-4 overflow-hidden p-[22px]",
        destructive && "border-t-[3px] border-t-hn-status-crit"
      )}
    >
      <div
        className={cx("flex gap-3.5", phone ? "flex-col items-center text-center" : "items-start")}
      >
        <Mark destructive={destructive} />
        <div className="flex flex-col gap-1.5">
          <P.Title className={TEXT.title}>{s.title}</P.Title>
          <P.Description className={TEXT.description}>{s.description}</P.Description>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-hn-md bg-hn-surface-raised px-3.5 py-3">
        <span className="font-semibold text-hn-ink-muted text-xs uppercase tracking-wide">
          {s.consequencesLabel}
        </span>
        <ul className={cx(TEXT.fact, "m-0 flex list-none flex-col gap-1 p-0")}>
          {s.consequences.map((c) => (
            <li key={c} className="flex items-start gap-2">
              <StatusGlyph status={destructive ? "crit" : "busy"} size={8} className="mt-[6px]" />
              {c}
            </li>
          ))}
        </ul>
      </div>
      <div className={footer(s)}>
        <P.Cancel variant="secondary">{s.cancel}</P.Cancel>
        <P.Action variant={actionVariant(s)}>{s.action}</P.Action>
      </div>
    </P.Content>
  );
}

export const variant: AlertDialogStyle = {
  label: "Marked",
  summary:
    "A crit glyph, a crit top rule and a boxed list of what happens mark a destructive ask before the buttons; a neutral one gets the info glyph and no rule. Clearest tone; the loudest dialog in the kit.",
  Dialog,
};
