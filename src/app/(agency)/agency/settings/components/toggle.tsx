"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange?: () => void;
  label?: string;
  disabled?: boolean;
}

/**
 * Reusable toggle switch component used across the agency settings tabs.
 *
 * Uses `role="switch"` and `aria-checked` for accessibility.
 */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
