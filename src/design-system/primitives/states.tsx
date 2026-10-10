import type { ReactNode } from "react";
import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Button } from "./button";

interface StateShellProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  role: "status" | "alert";
  className?: string;
}

function StateShell({ icon: Icon, iconClassName, title, description, action, role, className }: StateShellProps) {
  return (
    <div role={role} className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      <Icon className={cn("size-6", iconClassName)} aria-hidden="true" />
      <p className="mt-3 text-body font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-body text-foreground-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  /** Usually the button that creates the first item. */
  action?: ReactNode;
  className?: string;
}

/** Shown only once data has loaded successfully and is empty. */
export function EmptyState({ title, description, icon = Inbox, action, className }: EmptyStateProps) {
  return (
    <StateShell
      role="status"
      icon={icon}
      iconClassName="text-foreground-subtle"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  /** Wire to the query's `refetch`. Without it, no retry button is shown. */
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
}

/** A failed load. Never rendered as an empty list. */
export function ErrorState({
  title = "Impossible de charger les données",
  description = "Vérifiez votre connexion, puis réessayez.",
  onRetry,
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <StateShell
      role="alert"
      icon={AlertTriangle}
      iconClassName="text-danger-icon"
      title={title}
      description={description}
      className={className}
      action={
        onRetry && (
          <Button icon={RefreshCw} onClick={onRetry} loading={retrying}>
            Réessayer
          </Button>
        )
      }
    />
  );
}
