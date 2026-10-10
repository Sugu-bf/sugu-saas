"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { controlClass, useFieldControl } from "./field";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  leadingIcon?: LucideIcon;
}

/**
 * Password field with a show / hide button. The button is a real tab stop
 * and says what it will do; `aria-pressed` carries the current state.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { leadingIcon: Icon, className, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const { isInvalid: _isInvalid, ...control } = useFieldControl(props);
  void _isInvalid;
  const Toggle = visible ? EyeOff : Eye;

  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
          aria-hidden="true"
        />
      )}
      <input
        ref={ref}
        {...props}
        {...control}
        type={visible ? "text" : "password"}
        className={cn(controlClass, "h-control pr-11 pl-3 touch:h-touch touch:pr-12", Icon && "pl-9", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        aria-pressed={visible}
        disabled={control.disabled}
        className="absolute top-0 right-0 flex h-control w-10 items-center justify-center rounded-control text-foreground-subtle hover:text-foreground disabled:text-disabled-foreground touch:h-touch touch:w-11"
      >
        <Toggle className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
});
