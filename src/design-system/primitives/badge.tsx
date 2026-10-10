import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const badgeVariants = cva(
  "inline-flex h-6 max-w-full items-center gap-1 rounded-pill border px-2 text-meta font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "border-neutral-border bg-neutral-bg text-neutral-fg",
        success: "border-success-border bg-success-bg text-success-fg",
        warning: "border-warning-border bg-warning-bg text-warning-fg",
        danger: "border-danger-border bg-danger-bg text-danger-fg",
        info: "border-info-border bg-info-bg text-info-fg",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export const toneIconClass: Record<Tone, string> = {
  neutral: "text-neutral-icon",
  success: "text-success-icon",
  warning: "text-warning-icon",
  danger: "text-danger-icon",
  info: "text-info-icon",
};

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  icon?: LucideIcon;
}

/** Compact label. The pill shape is reserved for this kind of marker. */
export function Badge({ tone, icon: Icon, className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {Icon && (
        <Icon className={cn("size-3.5 shrink-0", toneIconClass[tone ?? "neutral"])} aria-hidden="true" />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}
