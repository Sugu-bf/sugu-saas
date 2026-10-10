import type { HTMLAttributes } from "react";
import { cn } from "../cn";

/** Placeholder block. Decorative: the container announces the loading state. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-compact bg-surface-hover", className)}
      {...props}
    />
  );
}
