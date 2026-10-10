"use client";

import { Input } from "@/design-system";

export const OTP_LENGTH = 6;

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  name?: string;
  autoFocus?: boolean;
}

/** One field for a 6-digit code: digits only, numeric keypad, SMS/e-mail autofill. */
export function OtpInput({ value, onChange, name = "code", autoFocus }: OtpInputProps) {
  return (
    <Input
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={OTP_LENGTH}
      placeholder="000000"
      autoFocus={autoFocus}
      className="text-center text-section-title tracking-[0.4em] tabular-nums touch:text-lg"
    />
  );
}
