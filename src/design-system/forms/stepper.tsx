"use client";

import type { ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Button } from "../primitives/button";

export interface StepDefinition {
  id: string;
  label: string;
}

export interface StepperProps {
  steps: StepDefinition[];
  /** Index of the current step, 0-based. */
  currentStep: number;
  /** Ids of steps holding validation errors. */
  errorSteps?: string[];
  /**
   * Ids of the steps that are complete. By default every step before the
   * current one is shown as done. A form whose steps can be left unfinished
   * (a draft) passes the ones that really are, wherever they stand: a check
   * mark then never covers a step with something missing.
   */
  completedSteps?: string[];
  /** Accessible name, e.g. "Création d'un produit". */
  label: string;
  /**
   * Makes each step a button. The page decides whether the move is allowed
   * (it usually validates the current step first). With it, phones show the
   * steps themselves, each one a tap away, instead of the compact bar.
   */
  onStepSelect?: (index: number) => void;
  className?: string;
}

const MARKER: Record<"done" | "current" | "upcoming" | "error", string> = {
  done: "border-success-border bg-success-bg text-success-fg",
  current: "border-brand bg-brand-subtle text-foreground",
  upcoming: "border-border-strong bg-surface text-foreground-muted",
  error: "border-danger-border bg-danger-bg text-danger-fg",
};

/**
 * Progress indicator for multi-step forms. The page owns the step state and
 * validation. Display only by default, with a compact "Étape 2 sur 4" bar on
 * phones; with `onStepSelect`, the steps are buttons at every width.
 */
export function Stepper({ steps, currentStep, errorSteps = [], completedSteps, label, onStepSelect, className }: StepperProps) {
  const total = steps.length;
  const safeIndex = Math.min(Math.max(0, currentStep), Math.max(0, total - 1));
  const current = steps[safeIndex];
  const stateOf = (step: StepDefinition, index: number) => {
    if (errorSteps.includes(step.id)) return "error";
    if (index === safeIndex) return "current";
    return (completedSteps ? completedSteps.includes(step.id) : index < safeIndex) ? "done" : "upcoming";
  };

  if (onStepSelect) {
    return (
      <nav aria-label={label} className={className}>
        <ol className="flex items-start">
          {steps.map((step, index) => {
            const state = stateOf(step, index);
            const isCurrent = index === safeIndex;
            return (
              <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
                {/* Line from the previous marker to this one: it stops short of both. */}
                {index > 0 && (
                  <span
                    className={cn(
                      "absolute top-3.5 right-[calc(50%+1.125rem)] left-[calc(-50%+1.125rem)] h-px",
                      index <= safeIndex ? "bg-brand" : "bg-border-strong",
                    )}
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => onStepSelect(index)}
                  className="relative flex w-full min-w-0 flex-col items-center gap-1 rounded-control px-1 pb-1 touch:min-h-touch"
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-pill border text-meta font-medium tabular-nums",
                      MARKER[state],
                      // The step being shown is the filled one, in error or not.
                      // `primary` is the orange white text is legible on.
                      state === "current" && "border-primary bg-primary text-primary-foreground",
                      state === "error" && isCurrent && "border-danger-solid bg-danger-solid text-white",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : state === "error" ? (
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate text-meta md:text-label",
                      state === "error" ? "text-danger-fg" : isCurrent ? "text-foreground" : "text-foreground-muted",
                      isCurrent ? "font-semibold" : "font-normal",
                    )}
                  >
                    {step.label}
                    <span className="sr-only">
                      {state === "done" && " (terminée)"}
                      {state === "error" && " (à corriger)"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className={className}>
      <div className="md:hidden">
        <p className="text-label text-foreground">
          <span className="text-foreground-muted">
            Étape {safeIndex + 1} sur {total}
          </span>
          {current && <> · {current.label}</>}
        </p>
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={safeIndex + 1}
          aria-valuetext={current ? `Étape ${safeIndex + 1} sur ${total} : ${current.label}` : undefined}
          className="mt-2 h-1 overflow-hidden rounded-pill bg-surface-hover"
        >
          <div className="h-full bg-brand" style={{ width: `${((safeIndex + 1) / Math.max(1, total)) * 100}%` }} />
        </div>
      </div>

      <ol className="hidden items-center gap-2 md:flex">
        {steps.map((step, index) => {
          const state = stateOf(step, index);
          return (
            <li
              key={step.id}
              aria-current={index === safeIndex ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-pill border text-meta font-medium tabular-nums",
                  MARKER[state],
                )}
              >
                {state === "done" ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : state === "error" ? (
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "truncate text-label",
                  state === "current" || state === "error" ? "text-foreground" : "text-foreground-muted",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {state === "done" && " (terminée)"}
                  {state === "error" && " (à corriger)"}
                </span>
              </span>
              {index < total - 1 && <span className="h-px min-w-4 flex-1 bg-border-strong" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface FormActionsProps {
  children: ReactNode;
  /** Stick to the bottom of the scroll container (long forms). */
  sticky?: boolean;
  className?: string;
}

/**
 * Action bar of a form. Primary action last. On phones the actions share one
 * row and the primary one takes the remaining width: a stack of full-width
 * buttons would cover a third of the screen once the bar is sticky.
 *
 * Sticky, the bar is an edge-to-edge strip resting on the phone tab bar; from
 * 768px it is a raised panel as wide as the form, resting where the page ends.
 */
export function FormActions({ children, sticky = false, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 md:justify-end [&>*]:min-w-0 [&>*:last-child]:flex-1 md:[&>*:last-child]:flex-none",
        sticky && [
          "sticky sticky-bottom-shell z-sticky -mx-(--page-gutter) border-t border-border bg-surface px-(--page-gutter) py-3",
          "md:bottom-0 md:mx-0 md:mb-0 md:rounded-panel md:border md:px-3 md:shadow-overlay",
        ],
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface StepActionsProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitIcon?: LucideIcon;
  /** The final submission is in flight. */
  submitting?: boolean;
  sticky?: boolean;
}

/** Précédent / Suivant, and the final action on the last step. */
export function StepActions({
  isFirstStep,
  isLastStep,
  onPrevious,
  onNext,
  onSubmit,
  submitLabel,
  submitIcon = Check,
  submitting = false,
  sticky,
}: StepActionsProps) {
  return (
    <FormActions sticky={sticky}>
      {!isFirstStep && (
        <Button variant="secondary" icon={ArrowLeft} onClick={onPrevious} disabled={submitting}>
          Précédent
        </Button>
      )}
      {isLastStep ? (
        <Button variant="primary" icon={submitIcon} onClick={onSubmit} loading={submitting}>
          {submitLabel}
        </Button>
      ) : (
        <Button variant="primary" trailingIcon={ArrowRight} onClick={onNext}>
          Suivant
        </Button>
      )}
    </FormActions>
  );
}
