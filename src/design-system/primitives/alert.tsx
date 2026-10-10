import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { toneIconClass, type Tone } from "./badge";

type AlertTone = Exclude<Tone, "neutral">;

const TONE_CLASS: Record<AlertTone, string> = {
  info: "border-info-border bg-info-bg text-info-fg",
  success: "border-success-border bg-success-bg text-success-fg",
  warning: "border-warning-border bg-warning-bg text-warning-fg",
  danger: "border-danger-border bg-danger-bg text-danger-fg",
};

const TONE_ICON: Record<AlertTone, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  /** Buttons or links related to the message. */
  actions?: ReactNode;
  className?: string;
}

/**
 * Inline message. `danger` and `warning` interrupt assistive tech
 * (`role="alert"`); `info` and `success` are announced politely.
 */
export function Alert({ tone = "info", title, children, actions, className }: AlertProps) {
  const Icon = TONE_ICON[tone];
  const assertive = tone === "danger" || tone === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      className={cn("flex gap-3 rounded-panel border p-3", TONE_CLASS[tone], className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", toneIconClass[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        {children && <div className="mt-0.5 text-body">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
