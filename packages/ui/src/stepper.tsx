import type { ComponentProps, ReactNode } from "react";
import { cx, focusRing } from "./cx";
import { CheckIcon } from "./icons";
import { Progress } from "./progress";
import { fillCopy, type StateLocale } from "./state-copy";

/** Where a step stands: finished, the one in front of the user, not reached yet, or failed. */
export type StepStatus = "done" | "current" | "open" | "error";

export const STEP_STATUSES: readonly StepStatus[] = ["done", "current", "open", "error"];

export type StepperStep = {
  id: string;
  label: ReactNode;
  status: StepStatus;
  /** A plain-text name for the compact readout and the select callback; defaults to `label`. */
  name?: string;
};

/**
 * full: every step in a row. compact: `Step 2 of 4` and a bar, for a phone. auto: compact under
 * 768 px of the nearest `@container` (the shell's root), full from there.
 */
export type StepperVariant = "full" | "compact" | "auto";

export type StepperCopy = {
  /** The nav landmark's name. */
  label: string;
  /** The compact readout: `{current}` and `{total}`. */
  stepOf: string;
  /** Read after a step's label, for a screen reader. */
  done: string;
  error: string;
};

export const STEPPER_COPY: Record<StateLocale, StepperCopy> = {
  en: { label: "Steps", stepOf: "Step {current} of {total}", done: "done", error: "has errors" },
  de: {
    label: "Schritte",
    stepOf: "Schritt {current} von {total}",
    done: "erledigt",
    error: "fehlerhaft",
  },
};

export type StepperProps = Omit<ComponentProps<"nav">, "onSelect"> & {
  steps: readonly StepperStep[];
  /**
   * A step was picked. Only steps `canSelect` allows are buttons; by default those before the
   * current one that are done or failed, so the user can go back but not skip ahead.
   */
  onStepSelect?: (id: string, index: number) => void;
  canSelect?: (step: StepperStep, index: number, current: number) => boolean;
  /** The current step's index, when its status is `error`; default from the statuses. */
  current?: number;
  variant?: StepperVariant;
  locale?: StateLocale;
  /** The landmark's name; default from STEPPER_COPY. */
  label?: string;
};

/** The index of the current step: the first `current`, else the first not done, else the last. */
export function currentStepIndex(steps: readonly StepperStep[]): number {
  const current = steps.findIndex((s) => s.status === "current");
  if (current >= 0) return current;
  const open = steps.findIndex((s) => s.status !== "done");
  return open >= 0 ? open : Math.max(0, steps.length - 1);
}

export const canSelectBack = (step: StepperStep, index: number, current: number) =>
  index < current && (step.status === "done" || step.status === "error");

const MARK: Record<StepStatus, string> = {
  done: "border border-hn-action-primary bg-hn-action-primary text-hn-action-primary-ink",
  current: "border-2 border-hn-action-text bg-hn-surface-card text-hn-ink-primary",
  open: "border border-hn-line-strong bg-transparent text-hn-ink-muted",
  error: "border-2 border-hn-status-crit bg-hn-surface-card text-hn-status-crit",
};

function plain(step: StepperStep): string {
  return step.name ?? (typeof step.label === "string" ? step.label : step.id);
}

/**
 * A step indicator for a wizard: each step's number (a check once done, `!` when it failed) and
 * label, the current one marked with aria-current="step". Done and failed steps before the
 * current one are buttons, so the user can go back. The compact variant is `Step 2 of 4` over a
 * progress bar. Colour is never the only signal: the mark changes shape and a screen reader hears
 * the status.
 */
export function Stepper({
  steps,
  onStepSelect,
  canSelect = canSelectBack,
  current: currentProp,
  variant = "full",
  locale = "en",
  label,
  className,
  ...props
}: StepperProps) {
  const copy = STEPPER_COPY[locale];
  const current = currentProp ?? currentStepIndex(steps);
  const now = steps[current];
  // The compact readout shows one step; a failed step elsewhere still needs a visible mark.
  const failed = steps.filter((s, index) => s.status === "error" && index !== current);
  const readout = fillCopy(copy.stepOf, { current: current + 1, total: steps.length });
  const full = (
    <ol
      data-stepper-list=""
      className={cx(
        "m-0 min-w-0 list-none items-center gap-2 p-0",
        variant === "auto" ? "hidden @3xl:flex" : "flex"
      )}
    >
      {steps.map((step, index) => {
        const pickable = onStepSelect !== undefined && canSelect(step, index, current);
        const face = (
          <>
            <span
              aria-hidden="true"
              className={cx(
                "inline-flex size-6 shrink-0 items-center justify-center rounded-full font-hn-mono text-[12px] font-semibold tabular-nums [&_svg]:size-3.5",
                MARK[step.status]
              )}
            >
              {step.status === "done" ? <CheckIcon /> : step.status === "error" ? "!" : index + 1}
            </span>
            <span
              className={cx(
                "truncate text-[13px]",
                step.status === "current" || step.status === "error"
                  ? "font-semibold text-hn-ink-primary"
                  : "text-hn-ink-muted"
              )}
            >
              {step.label}
            </span>
            {step.status === "done" || step.status === "error" ? (
              <span className="sr-only">({copy[step.status]})</span>
            ) : null}
          </>
        );
        return (
          <li
            key={step.id}
            data-step={step.id}
            data-status={step.status}
            aria-current={index === current ? "step" : undefined}
            className="flex min-w-0 items-center gap-2"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={cx(
                  "h-px w-4 shrink-0 @7xl:w-8",
                  step.status === "open" ? "bg-hn-line-subtle" : "bg-hn-line-strong"
                )}
              />
            ) : null}
            {pickable ? (
              <button
                type="button"
                data-step-select=""
                onClick={() => onStepSelect?.(step.id, index)}
                className={cx(
                  "-mx-1 inline-flex min-h-hn-target min-w-0 cursor-pointer items-center gap-2 rounded-hn-md px-1",
                  "hover:bg-hn-surface-raised",
                  focusRing
                )}
              >
                {face}
              </button>
            ) : (
              <span className="inline-flex min-h-hn-target min-w-0 items-center gap-2">{face}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
  const compact = (
    <div
      data-stepper-compact=""
      className={cx(
        "min-w-0 flex-1 flex-col gap-1",
        variant === "auto" ? "flex @3xl:hidden" : "flex"
      )}
    >
      <span className="flex min-w-0 items-baseline gap-2 text-[13px]">
        <span className="shrink-0 font-semibold text-hn-ink-primary">{readout}</span>
        {now ? <span className="truncate text-hn-ink-muted">{plain(now)}</span> : null}
        {failed.length > 0 ? (
          <span
            data-stepper-errors=""
            className="ml-auto shrink-0 truncate font-semibold text-hn-status-crit"
          >
            <span aria-hidden="true">! </span>
            {failed.map(plain).join(", ")}
            <span className="sr-only"> ({copy.error})</span>
          </span>
        ) : null}
      </span>
      <Progress
        value={current + 1}
        max={steps.length}
        label={copy.label}
        valueText={readout}
        locale={locale}
      />
    </div>
  );
  return (
    <nav
      aria-label={label ?? copy.label}
      data-stepper={variant}
      className={cx("flex min-w-0 items-center font-hn-sans", className)}
      {...props}
    >
      {variant === "compact" ? null : full}
      {variant === "full" ? null : compact}
    </nav>
  );
}
