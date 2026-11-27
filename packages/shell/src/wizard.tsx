// Wizard (design#240, owner walkthrough 2026-11-27): a dedicated create page with steps instead of
// one endless form. Layout focus or session; the Stepper in the header (done, current, open,
// error; done steps are buttons back), the current step in the slot, a fixed footer with
// Abbrechen, Zurück and Weiter or Fertig. Each step validates before Weiter. The wizard's own
// position (step, steps done) goes out through `onDraftChange` and comes back in as `draft`, so
// a draft survives a reload wherever the app keeps it. On a phone the stepper is `Schritt 2 von
// 4` over a bar and the footer stays docked above the keyboard (the shell's footer).
// Leaving with changes asks first.
import { Button, cx, FormAlert, Stepper, type StepperStep, type StepStatus } from "@hansenexus/ui";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { PATTERN_COPY, type PatternCopy } from "./patterns-copy";
import { ConfirmLeave, type PatternShellProps, useBeforeUnload } from "./patterns-shared";
import { SHELL_MEASURE, Shell, useShell } from "./shell";

/** A step's check before Weiter: true (or nothing) passes, false or a message stops. */
export type WizardValidation = boolean | string | undefined;

export type WizardStep = {
  id: string;
  label: ReactNode;
  /** Plain text for the phone readout; defaults to `label` when that is a string. */
  name?: string;
  /** A line under the step's heading. */
  description?: ReactNode;
  /** The step's fields. They sit in the wizard's form: Enter in a field is Weiter. */
  content: ReactNode;
  /** Runs on Weiter (and on Fertig for the last step). */
  validate?: () => WizardValidation | Promise<WizardValidation>;
};

/** The wizard's position, for a draft: the step in front of the user and the steps done. */
export type WizardDraft = { step: string; done: readonly string[] };

export type WizardProps = PatternShellProps & {
  /** What is being created: in the header from 768 px of shell width. */
  title: ReactNode;
  steps: readonly WizardStep[];
  /** focus (default) keeps the nav; session gives the wizard the whole page. */
  layout?: "focus" | "session";
  /** Where the wizard starts or resumes; read on mount. */
  draft?: WizardDraft;
  /** The position changed: store it with the form data where the app keeps drafts. */
  onDraftChange?: (draft: WizardDraft) => void;
  /** The step in front of the user changed. */
  onStepChange?: (id: string) => void;
  /** Errors the app found itself (the server refused Fertig): the step id and its message. */
  errors?: Readonly<Record<string, string>>;
  /** There are changes: leaving through Abbrechen asks first, and so does a reload. */
  dirty?: boolean;
  /** Abbrechen, after the confirm when `dirty`. */
  onCancel: () => void;
  /**
   * Fertig, once the last step validates. Return false or a message to stay (the server
   * refused); the message shows on the last step.
   */
  onFinish: () => WizardValidation | void | Promise<WizardValidation | void>;
  /** Footer and confirm words; defaults from PATTERN_COPY. */
  labels?: Partial<
    Pick<
      PatternCopy,
      | "wizardBack"
      | "wizardNext"
      | "wizardFinish"
      | "wizardCancel"
      | "wizardInvalid"
      | "wizardExitTitle"
      | "wizardExitBody"
      | "wizardExitLeave"
      | "wizardExitStay"
    >
  >;
};

/** The stepper's statuses from the wizard's position. */
export function wizardStatuses(
  ids: readonly string[],
  current: number,
  done: ReadonlySet<string>,
  failed: Readonly<Record<string, string>>
): StepStatus[] {
  return ids.map((id, index) => {
    if (failed[id] !== undefined) return "error";
    if (index === current) return "current";
    return done.has(id) ? "done" : "open";
  });
}

function failure(result: WizardValidation | void, fallback: string): string | null {
  if (result === false) return fallback;
  if (typeof result === "string") return result;
  return null;
}

function plain(step: WizardStep): string {
  return step.name ?? (typeof step.label === "string" ? step.label : step.id);
}

/** The step wizard: give it the steps, it brings the Shell, the stepper and the footer. */
export function Wizard({
  title,
  steps,
  layout = "focus",
  draft,
  onDraftChange,
  onStepChange,
  errors,
  dirty = false,
  onCancel,
  onFinish,
  labels,
  locale = "en",
  ...shell
}: WizardProps) {
  const copy = { ...PATTERN_COPY[locale], ...labels };
  const ids = steps.map((s) => s.id);
  const [current, setCurrent] = useState(() => {
    const at = draft ? ids.indexOf(draft.step) : -1;
    return at >= 0 ? at : 0;
  });
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set(draft?.done ?? []));
  const [failed, setFailed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const moved = useRef(false);
  const formId = useId();
  useBeforeUnload(dirty);

  const step = steps[current];
  const allFailed = { ...errors, ...failed };
  const statuses = wizardStatuses(ids, current, done, allFailed);
  const last = current === steps.length - 1;

  const go = useCallback(
    (index: number, nextDone: ReadonlySet<string>) => {
      const target = steps[index];
      if (!target) return;
      moved.current = true;
      setCurrent(index);
      onStepChange?.(target.id);
      onDraftChange?.({ step: target.id, done: [...nextDone] });
    },
    [steps, onStepChange, onDraftChange]
  );

  const next = async () => {
    if (!step || busy) return;
    setBusy(true);
    try {
      const problem = failure(await step.validate?.(), copy.wizardInvalid);
      if (problem !== null) {
        setFailed((f) => ({ ...f, [step.id]: problem }));
        return;
      }
      setFailed(({ [step.id]: _, ...rest }) => rest);
      const nextDone = new Set(done).add(step.id);
      setDone(nextDone);
      if (!last) {
        go(current + 1, nextDone);
        return;
      }
      const refused = failure(await onFinish(), copy.wizardInvalid);
      if (refused !== null) setFailed((f) => ({ ...f, [step.id]: refused }));
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (current > 0 && !busy) go(current - 1, done);
  };

  const cancel = () => {
    if (dirty) setConfirming(true);
    else onCancel();
  };

  const stepperSteps: StepperStep[] = steps.map((s, index) => ({
    id: s.id,
    label: s.label,
    name: plain(s),
    status: statuses[index] ?? "open",
  }));

  return (
    <Shell
      {...shell}
      locale={locale}
      layout={layout}
      measure="text"
      header={
        <div className="flex min-w-0 flex-1 items-center gap-3 @3xl:gap-6">
          <h1
            data-wizard-title=""
            className="sr-only m-0 truncate text-[15px] font-semibold text-hn-ink-primary @3xl:not-sr-only @3xl:max-w-[16rem] @3xl:shrink-0"
          >
            {title}
          </h1>
          <Stepper
            steps={stepperSteps}
            current={current}
            variant="auto"
            locale={locale}
            onStepSelect={(_, index) => {
              if (!busy) go(index, done);
            }}
            className="min-w-0 flex-1 @3xl:justify-center"
          />
        </div>
      }
      footer={
        <WizardFooter layout={layout}>
          <Button variant="ghost" data-wizard="cancel" onClick={cancel} disabled={busy}>
            {copy.wizardCancel}
          </Button>
          <span className="flex-1" />
          {current > 0 ? (
            <Button variant="secondary" data-wizard="back" onClick={back} disabled={busy}>
              {copy.wizardBack}
            </Button>
          ) : null}
          <Button
            type="submit"
            form={formId}
            data-wizard={last ? "finish" : "next"}
            aria-busy={busy || undefined}
            disabled={busy}
          >
            {last ? copy.wizardFinish : copy.wizardNext}
          </Button>
        </WizardFooter>
      }
    >
      {step ? (
        <WizardStepView
          key={step.id}
          step={step}
          index={current}
          total={steps.length}
          error={allFailed[step.id]}
          moved={moved}
          formId={formId}
          onSubmit={next}
          locale={locale}
          layout={layout}
        />
      ) : null}
      <WizardConfirm
        open={confirming}
        onOpenChange={setConfirming}
        onLeave={onCancel}
        copy={copy}
      />
    </Shell>
  );
}

function WizardFooter({ layout, children }: { layout: "focus" | "session"; children: ReactNode }) {
  return (
    <div
      data-wizard-footer=""
      className={cx(
        "flex w-full items-center gap-2",
        layout === "session" && cx("mx-auto", SHELL_MEASURE.text)
      )}
    >
      {children}
    </div>
  );
}

function WizardStepView({
  step,
  index,
  total,
  error,
  moved,
  formId,
  onSubmit,
  locale,
  layout,
}: {
  step: WizardStep;
  index: number;
  total: number;
  error?: string;
  moved: { current: boolean };
  formId: string;
  onSubmit: () => void;
  locale: "de" | "en";
  layout: "focus" | "session";
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const alert = useRef<HTMLDivElement>(null);
  const headingId = useId();
  // Focus the new step's heading after a move, so a screen reader starts at the step. The view
  // is keyed by the step, so this runs once per step.
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [moved]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  return (
    <section
      aria-labelledby={headingId}
      data-wizard-step={step.id}
      className={cx(
        "flex w-full flex-col gap-5",
        layout === "focus" && cx("mx-auto", SHELL_MEASURE.text)
      )}
    >
      <header className="flex flex-col gap-1">
        <span className="font-hn-mono text-[12px] text-hn-ink-muted tabular-nums">
          {index + 1}/{total}
        </span>
        <h2
          ref={heading}
          id={headingId}
          tabIndex={-1}
          className="m-0 font-hn-display text-[22px] font-semibold tracking-[-0.01em] text-hn-ink-primary outline-none"
        >
          {step.label}
        </h2>
        {step.description ? (
          <p className="m-0 text-sm text-hn-ink-body">{step.description}</p>
        ) : null}
      </header>
      {error ? (
        <div ref={alert} tabIndex={-1} className="outline-none">
          <FormAlert kind="invalid" locale={locale} data-wizard-error="">
            {error}
          </FormAlert>
        </div>
      ) : null}
      <form
        id={formId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        {step.content}
      </form>
    </section>
  );
}

function WizardConfirm({
  open,
  onOpenChange,
  onLeave,
  copy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => void;
  copy: PatternCopy;
}) {
  const { portal } = useShell();
  return (
    <ConfirmLeave
      open={open}
      onOpenChange={onOpenChange}
      title={copy.wizardExitTitle}
      description={copy.wizardExitBody}
      leave={copy.wizardExitLeave}
      stay={copy.wizardExitStay}
      onLeave={onLeave}
      container={portal}
    />
  );
}
