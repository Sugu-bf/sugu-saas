import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * D3b — canonical timeline contract.
 *
 * The backend exposes `canonical_timeline` on the order/shipment detail payloads:
 * a single projection that merges OrderStatusHistory + ShipmentTrackingEvent
 * (incl. the D3a lifecycle markers) + the COD payment milestones into one
 * ordered list of steps. Per-boutique steps carry a `store_id`.
 *
 * This is the shared contract consumed by the vendor / agency / driver views in
 * sugu-saas (and mirrored, as a contract only, by sugu-marketplace for the
 * client view).
 */
export interface CanonicalTimelineStep {
  key: string;
  label: string;
  status: "done" | "current" | "upcoming";
  timestamp: string | null;
  store_id?: string | null;
  actor_type?: string | null;
  description?: string | null;
}

const TIME_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatStepTime(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "" : TIME_FMT.format(d);
}

interface CanonicalTimelineProps {
  steps: CanonicalTimelineStep[];
  /** Optional store_id → boutique name, to label per-boutique steps. */
  storeNames?: Record<string, string>;
  className?: string;
}

/**
 * Vertical canonical timeline. Renders done / current / upcoming consistently
 * with the prior per-view timelines (green check / sugu dot / grey), and
 * suffixes per-boutique steps with the boutique name when provided.
 */
export function CanonicalTimeline({ steps, storeNames, className }: CanonicalTimelineProps) {
  return (
    <ol className={cn("space-y-0", className)} aria-label="Étapes de la commande">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const done = step.status === "done";
        const current = step.status === "current";
        const storeName = step.store_id ? storeNames?.[step.store_id] : undefined;
        const label = storeName ? `${step.label} — ${storeName}` : step.label;
        const time = formatStepTime(step.timestamp);

        return (
          <li key={`${step.key}-${step.store_id ?? ""}-${i}`} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {done && !current ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                  <Check className="h-3 w-3 text-white" />
                </span>
              ) : current ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sugu-500 ring-2 ring-sugu-200 animate-pulse-dot">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
              ) : (
                <span className="h-5 w-5 rounded-full bg-gray-200" />
              )}
              {!isLast && (
                <span className={cn("mt-0.5 h-6 w-px", done ? "bg-green-300" : "bg-gray-200")} />
              )}
            </div>

            <div className="flex flex-1 items-start justify-between pb-2 min-w-0">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs",
                    done && !current
                      ? "font-medium text-gray-700"
                      : current
                        ? "font-bold text-sugu-600"
                        : "text-gray-400",
                  )}
                >
                  {label}
                </p>
                {step.description ? (
                  <p className="text-[10px] text-gray-400 truncate">{step.description}</p>
                ) : null}
              </div>
              {time ? (
                <span className="flex-shrink-0 text-[11px] font-medium text-gray-500">{time}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
