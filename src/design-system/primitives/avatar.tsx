"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "../cn";

export interface AvatarProps {
  /** Full name: used for the initials and as the accessible name. */
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "size-6 text-meta",
  md: "size-8 text-meta",
  lg: "size-10 text-body",
} as const;

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill border border-border bg-surface-subtle font-medium text-foreground-muted select-none",
        SIZE[size],
        className,
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={name} className="size-full object-cover" />}
      <AvatarPrimitive.Fallback role="img" aria-label={name}>
        {initialsOf(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
