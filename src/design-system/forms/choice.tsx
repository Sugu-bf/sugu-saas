"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "../cn";
import { useFieldControl } from "./field";

const BOX = cn(
  "peer relative size-4 shrink-0 appearance-none border border-border-control bg-surface transition-colors duration-100",
  "hover:border-foreground-muted checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary",
  "disabled:cursor-not-allowed disabled:border-border disabled:bg-disabled",
  // Enlarged hit area without changing the visual size.
  "after:absolute after:-inset-2.5 after:content-['']",
);

interface ChoiceLabelProps {
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  control: ReactNode;
  className?: string;
}

function ChoiceLabel({ label, description, disabled, control, className }: ChoiceLabelProps) {
  if (!label) return <span className={cn("relative inline-flex size-4", className)}>{control}</span>;
  return (
    <label className={cn("flex items-start gap-2 py-1 touch:py-2.5", disabled && "cursor-not-allowed", className)}>
      <span className="relative mt-0.5 inline-flex size-4">{control}</span>
      <span className="min-w-0">
        <span className={cn("block text-body", disabled ? "text-disabled-foreground" : "text-foreground")}>
          {label}
        </span>
        {description && <span className="block text-meta text-foreground-muted">{description}</span>}
      </span>
    </label>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visible label. Without it, pass `aria-label`. */
  label?: ReactNode;
  description?: ReactNode;
  /** Mixed state, e.g. "some rows selected". */
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, indeterminate = false, className, disabled, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (innerRef.current) innerRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <ChoiceLabel
      label={label}
      description={description}
      disabled={disabled}
      className={className}
      control={
        <>
          <input
            ref={(node) => {
              innerRef.current = node;
              if (typeof forwardedRef === "function") forwardedRef(node);
              else if (forwardedRef) forwardedRef.current = node;
            }}
            type="checkbox"
            disabled={disabled}
            className={cn(BOX, "rounded-compact")}
            {...props}
          />
          <Check
            className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white peer-checked:block peer-indeterminate:hidden"
            strokeWidth={3}
            aria-hidden="true"
          />
          <Minus
            className="pointer-events-none absolute inset-0 m-auto hidden size-3 text-white peer-indeterminate:block"
            strokeWidth={3}
            aria-hidden="true"
          />
        </>
      }
    />
  );
});

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled: boolean;
  describedBy: string | undefined;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** Question the options answer; rendered as the group legend. */
  label: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  name?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

/** Native radios in a fieldset: arrow keys and grouping come from the browser. */
export function RadioGroup({
  label,
  value,
  onValueChange,
  name,
  hint,
  error,
  required = false,
  disabled = false,
  children,
  className,
}: RadioGroupProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      className={cn("flex min-w-0 flex-col gap-1", className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
    >
      <legend className="mb-1 text-label text-foreground">
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
      </legend>
      {hint && (
        <p id={hintId} className="text-meta text-foreground-muted">
          {hint}
        </p>
      )}
      <RadioGroupContext.Provider value={{ name: name ?? id, value, onValueChange, disabled, describedBy }}>
        {children}
      </RadioGroupContext.Provider>
      <p id={errorId} role="alert" className={cn("text-meta text-danger-fg", !error && "hidden")}>
        {error}
      </p>
    </fieldset>
  );
}

export interface RadioProps {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Radio({ value, label, description, disabled }: RadioProps) {
  const group = useContext(RadioGroupContext);
  if (!group) throw new Error("Radio must be rendered inside a RadioGroup.");
  const isDisabled = disabled || group.disabled;
  return (
    <ChoiceLabel
      label={label}
      description={description}
      disabled={isDisabled}
      control={
        <>
          <input
            type="radio"
            name={group.name}
            value={value}
            checked={group.value === value}
            onChange={() => group.onValueChange(value)}
            disabled={isDisabled}
            className={cn(BOX, "rounded-pill")}
          />
          <span
            className="pointer-events-none absolute inset-0 m-auto hidden size-1.5 rounded-pill bg-white peer-checked:block"
            aria-hidden="true"
          />
        </>
      }
    />
  );
}

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "role" | "aria-checked"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * On/off setting that applies immediately. Label it with `FormField`
 * or `aria-label`. For a choice submitted with a form, use `Checkbox`.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, className, onClick, ...props },
  ref,
) {
  const { isInvalid: _isInvalid, required: _required, ...control } = useFieldControl(props);
  void _isInvalid;
  void _required;
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      {...props}
      {...control}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill border border-transparent transition-colors duration-100",
        "after:absolute after:-inset-3 after:content-['']",
        checked ? "bg-primary" : "bg-border-control",
        "disabled:cursor-not-allowed disabled:bg-disabled",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-4 rounded-pill bg-white shadow-raised transition-transform duration-100",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
});
