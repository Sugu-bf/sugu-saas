import { cn } from "../cn";
import { Badge } from "../primitives/badge";
import { statusRegistries, type StatusDomain } from "./domains";

export interface StatusBadgeProps {
  /** Which business axis the code belongs to. */
  domain: StatusDomain;
  /** Raw code from the API. */
  code: string | number | null | undefined;
  className?: string;
}

/**
 * The only way to render a business status. Label, tone and icon come from
 * the domain registry; an unrecognised code shows as "Statut inconnu".
 */
export function StatusBadge({ domain, code, className }: StatusBadgeProps) {
  const status = statusRegistries[domain].resolve(code);
  return (
    <Badge
      tone={status.tone}
      icon={status.icon}
      title={status.description}
      data-status={status.code}
      data-status-known={status.known}
      className={cn(!status.known && "border-dashed", className)}
    >
      {status.label}
    </Badge>
  );
}
