"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "../cn";

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

/**
 * Wiring a control needs from its `FormField`: id, `aria-describedby`,
 * `aria-invalid`, `required`, `disabled`. Explicit props on the control win.
 */
export function useFieldControl(overrides: {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  required?: boolean;
  disabled?: boolean;
}) {
  const field = useContext(FieldContext);
  const invalid = overrides["aria-invalid"] ?? (field?.invalid ? true : undefined);
  return {
    id: overrides.id ?? field?.id,
    "aria-describedby": overrides["aria-describedby"] ?? field?.describedBy,
    "aria-invalid": invalid,
    required: overrides.required ?? field?.required,
    disabled: overrides.disabled ?? field?.disabled,
    isInvalid: invalid === true || invalid === "true",
  };
}

export interface FormFieldProps {
  label: string;
  /** Help text, always visible under the control. */
  hint?: ReactNode;
  /** Validation message. Its presence marks the control invalid. */
  error?: string | null;
  /** Positive confirmation, e.g. "Code vérifié". Hidden while there is an error. */
  success?: string | null;
  required?: boolean;
  disabled?: boolean;
  /** Give the control a fixed id (otherwise one is generated). */
  id?: string;
  /** Visually hide the label; it stays available to assistive tech. */
  hideLabel?: boolean;
  /** Exactly one control: `Input`, `Textarea`, `Select` or `Switch`. */
  children: ReactNode;
  className?: string;
}

/** Label, help, error and success around one control, linked for assistive tech. */
export function FormField({
  label,
  hint,
  error,
  success,
  required = false,
  disabled = false,
  id: idProp,
  hideLabel = false,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const successId = success && !error ? `${id}-success` : undefined;
  const describedBy = [errorId, successId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: Boolean(error), required, disabled }}>
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <label htmlFor={id} className={cn("text-label text-foreground", hideLabel && "sr-only")}>
          {label}
          {required && (
            <>
              <span className="text-danger-fg" aria-hidden="true">
                {" "}
                *
              </span>
              <span className="sr-only"> (obligatoire)</span>
            </>
          )}
        </label>
        {children}
        {hint && (
          <p id={hintId} className="text-meta text-foreground-muted">
            {hint}
          </p>
        )}
        {/* Always mounted so that a message appearing later is announced. */}
        <p
          id={errorId}
          role="alert"
          className={cn("flex items-start gap-1 text-meta text-danger-fg", !error && "hidden")}
        >
          {error && (
            <>
              <AlertCircle className="mt-px size-3.5 shrink-0 text-danger-icon" aria-hidden="true" />
              <span>{error}</span>
            </>
          )}
        </p>
        {successId && (
          <p id={successId} role="status" className="flex items-start gap-1 text-meta text-success-fg">
            <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success-icon" aria-hidden="true" />
            <span>{success}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/** Shared look of text-like controls. */
export const controlClass = cn(
  "w-full min-w-0 rounded-control border border-border-control bg-surface text-body text-foreground",
  "placeholder:text-foreground-subtle transition-colors duration-100",
  "hover:border-foreground-muted",
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled disabled:text-disabled-foreground",
  "aria-invalid:border-danger-solid",
  // 16px on touch devices: below that, iOS zooms the page on focus.
  "touch:text-base",
);
