import Link from "next/link";
import { Avatar, Badge, cn, type Tone } from "@/design-system";
import type { Courier } from "../couriers/contract";
import { formatRate } from "../format";

/** A success rate is read against the threshold the alerts use: under 80 % is low. */
export function rateTone(rate: number): Tone {
  if (rate >= 90) return "success";
  return rate >= 80 ? "warning" : "danger";
}

/** Share of deliveries that succeeded, coloured by how good it is; a dash before the first delivery. */
export function SuccessRate({ rate, className }: { rate: number | null; className?: string }) {
  if (rate === null) return <span className={cn("text-foreground-muted", className)}>—</span>;
  return (
    <Badge tone={rateTone(rate)} className={cn("tabular-nums", className)}>
      {formatRate(rate)}
    </Badge>
  );
}

/** A courier in a list: his picture, his name linking to his page, his matricule under it. */
export function CourierCell({ courier }: { courier: Pick<Courier, "id" | "name" | "employeeId"> }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={courier.name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <Link href={`/agency/drivers/${courier.id}`} className="truncate rounded-compact font-medium text-foreground underline-offset-2 hover:underline">
          {courier.name}
        </Link>
        {courier.employeeId && <span className="truncate text-meta text-foreground-muted tabular-nums">{courier.employeeId}</span>}
      </span>
    </span>
  );
}
