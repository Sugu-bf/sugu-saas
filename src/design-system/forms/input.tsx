"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { controlClass, useFieldControl } from "./field";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: LucideIcon;
  /** Short unit or suffix shown inside the field, e.g. "FCFA". */
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leadingIcon: Icon, suffix, className, type = "text", ...props },
  ref,
) {
  const { isInvalid: _isInvalid, ...control } = useFieldControl(props);
  void _isInvalid;
  const input = (
    <input
      ref={ref}
      type={type}
      {...props}
      {...control}
      className={cn(
        controlClass,
        "h-control px-3 touch:h-touch",
        Icon && "pl-9",
        suffix && "pr-14",
        className,
      )}
    />
  );
  if (!Icon && !suffix) return input;
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
          aria-hidden="true"
        />
      )}
      {input}
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-label text-foreground-muted">
          {suffix}
        </span>
      )}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  const { isInvalid: _isInvalid, ...control } = useFieldControl(props);
  void _isInvalid;
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...props}
      {...control}
      className={cn(controlClass, "min-h-20 resize-y px-3 py-2", className)}
    />
  );
});

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Declarative options. Alternatively pass `<option>` children. */
  options?: SelectOption[];
  /** First, empty option, e.g. "Choisir une agence". */
  placeholder?: string;
  /** Smaller control for toolbars. */
  compact?: boolean;
}

/**
 * Native select: the system picker is the most reliable control on phones,
 * and it is keyboard- and screen-reader-complete without extra code.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, compact = false, className, children, ...props },
  ref,
) {
  const { isInvalid: _isInvalid, ...control } = useFieldControl(props);
  void _isInvalid;
  return (
    <div className="relative min-w-0">
      <select
        ref={ref}
        {...props}
        {...control}
        className={cn(
          controlClass,
          "appearance-none truncate pr-9 pl-3",
          compact ? "h-control-sm text-label touch:h-touch" : "h-control touch:h-touch",
          className,
        )}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-foreground-subtle"
        aria-hidden="true"
      />
    </div>
  );
});
