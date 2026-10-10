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
  /** Accessible name, e.g. "Création d'un produit". */
  label: string;
  className?: string;
}

/**
 * Progress indicator for multi-step forms. Display only: the page owns the
 * step state and validation. Phones get a compact "Étape 2 sur 4" bar.
 */
export function Stepper({ steps, currentStep, errorSteps = [], label, className }: StepperProps) {
  const total = steps.length;
  const safeIndex = Math.min(Math.max(0, currentStep), Math.max(0, total - 1));
  const current = steps[safeIndex];

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
          const hasError = errorSteps.includes(step.id);
          const state = hasError ? "error" : index < safeIndex ? "done" : index === safeIndex ? "current" : "upcoming";
          return (
            <li
              key={step.id}
              aria-current={index === safeIndex ? "step" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 last:flex-none"
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-pill border text-meta font-medium tabular-nums",
                  state === "done" && "border-success-border bg-success-bg text-success-fg",
                  state === "current" && "border-brand bg-brand-subtle text-foreground",
                  state === "upcoming" && "border-border-strong bg-surface text-foreground-muted",
                  state === "error" && "border-danger-border bg-danger-bg text-danger-fg",
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

/** Action bar of a form. Primary action last; full-width buttons on phones. */
export function FormActions({ children, sticky = false, className }: FormActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-end",
        sticky &&
          "sticky bottom-shell z-sticky -mx-(--page-gutter) border-t border-border bg-surface px-(--page-gutter) py-3",
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
