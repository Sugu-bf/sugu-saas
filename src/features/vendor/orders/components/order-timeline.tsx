import { Check, Circle, CircleDot } from "lucide-react";
import { cn } from "@/design-system";
import type { OrderTimelineStep } from "../contract";
import { formatOrderDateTime } from "./order-bits";

const STATE_LABEL: Record<OrderTimelineStep["status"], string> = {
  done: "Terminé",
  current: "En cours",
  upcoming: "À venir",
};

/**
 * History of an order: the backend's `canonical_timeline`, in its order and
 * with its labels. No step is added, reordered or dated here.
 */
export function OrderTimeline({ steps }: { steps: OrderTimelineStep[] }) {
  if (steps.length === 0) {
    return <p className="text-body text-foreground-muted">Aucun historique n&apos;a été transmis pour cette commande.</p>;
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const Icon = step.status === "done" ? Check : step.status === "current" ? CircleDot : Circle;
        const last = index === steps.length - 1;
        return (
          <li key={`${step.key}-${step.store_id ?? ""}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-pill border",
                  step.status === "done" && "border-success-border bg-success-bg text-success-icon",
                  step.status === "current" && "border-info-border bg-info-bg text-info-icon",
                  step.status === "upcoming" && "border-border bg-surface text-foreground-subtle",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <div className={cn("min-w-0 pb-4", last && "pb-0")}>
              <p
                className={cn(
                  "text-body",
                  step.status === "upcoming" ? "text-foreground-muted" : "font-medium text-foreground",
                )}
              >
                {step.label}
                <span className="sr-only"> ({STATE_LABEL[step.status]})</span>
              </p>
              {step.timestamp && (
                <p className="text-meta text-foreground-muted tabular-nums">{formatOrderDateTime(step.timestamp)}</p>
              )}
              {step.description && <p className="mt-0.5 text-meta text-foreground-muted">{step.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
