import {
  BadgeCheck,
  Ban,
  Bike,
  CircleCheckBig,
  CircleDashed,
  CircleX,
  ClipboardCheck,
  HandCoins,
  HandHelping,
  Handshake,
  MapPinCheck,
  PackageCheck,
  PackageOpen,
  PackageSearch,
  PackageX,
  Receipt,
  ShoppingBag,
  TriangleAlert,
  Truck,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/design-system";
import { formatOrderDateTime } from "./components/order-bits";
import type { OrderDetail, OrderTrackingStep } from "./contract";

// ============================================================
// Presentation of the order tracking. The steps, their order,
// their wording, the current and next ones and the progress all
// come from the backend (`tracking`, OrderTimelineProjection).
// This file only chooses icons, tones and date formats: it adds
// no step and dates nothing.
// ============================================================

export type TrackingStepStatus = "done" | "current" | "upcoming";

export interface TrackingStepView {
  /** Stable React key. */
  id: string;
  key: string;
  icon: LucideIcon;
  title: string;
  summary: string | null;
  status: TrackingStepStatus;
  tone: Tone;
  /** An event outside the normal journey: cancellation, failed delivery, return. */
  exception: boolean;
  /** ISO timestamp for `<time>`; null when nothing was recorded or nothing happened yet. */
  dateTime: string | null;
  /** What to print for the date; null for a step that has not happened. */
  dateLabel: string | null;
}

export interface TrackingView {
  /** `tracking`: backend projection. `timeline`: older backend, steps shown as received. */
  source: "tracking" | "timeline";
  /** What the banner says about the order as a whole. */
  stateLabel: string;
  tone: Tone;
  current: TrackingStepView | null;
  next: TrackingStepView | null;
  progress: { done: number; total: number } | null;
  steps: TrackingStepView[];
}

/** Printed for a step known to be reached at a moment the backend did not record. */
export const UNDATED_LABEL = "Date non enregistrée";

const STATE: Record<string, { label: string; tone: Tone }> = {
  in_progress: { label: "Étape en cours", tone: "info" },
  completed: { label: "Parcours terminé", tone: "success" },
  canceled: { label: "Parcours interrompu", tone: "danger" },
  failed: { label: "Parcours interrompu", tone: "danger" },
  returned: { label: "Parcours interrompu", tone: "warning" },
};

/** Order status → tracking state, for a backend that sends no `tracking`. */
const STATE_OF_STATUS: Record<string, string> = {
  delivered: "completed",
  canceled: "canceled",
  failed: "failed",
  returned: "returned",
};

const ICON: Record<string, LucideIcon> = {
  placed: ShoppingBag,
  vendor_confirmed: ClipboardCheck,
  preparing: PackageOpen,
  agency_accepted: BadgeCheck,
  agency_refused: Ban,
  courier_assigned: Bike,
  delivery_fee_paid: HandCoins,
  collected: PackageCheck,
  vendor_handoff: Handshake,
  in_transit: Truck,
  awaiting_inspection: PackageSearch,
  product_fee_paid: Wallet,
  delivered: MapPinCheck,
  delivery_failed: PackageX,
  canceled: CircleX,
  returned: Undo2,
  incident: TriangleAlert,
};

const EXCEPTION_KEYS = ["canceled", "returned", "delivery_failed", "agency_refused", "incident"];

/** A manual sale is recorded by the seller and can be handed over at the counter. */
const MANUAL_ICON: Record<string, LucideIcon> = { placed: Receipt, delivered: HandHelping };

function iconOf(key: string, manual: boolean, completed: boolean): LucideIcon {
  if (manual && MANUAL_ICON[key]) return MANUAL_ICON[key];
  if (key === "delivered" && completed) return CircleCheckBig;
  return ICON[key] ?? CircleDashed;
}

function toneOf(status: TrackingStepStatus, exception: boolean, viewTone: Tone): Tone {
  if (status === "upcoming") return "neutral";
  if (status === "current") return exception && viewTone === "info" ? "warning" : viewTone;
  // A past exception stays visible as one; everything else reached is done.
  return exception ? "warning" : "success";
}

interface RawStep {
  key: string;
  title: string;
  summary: string | null;
  exception: boolean;
  status: TrackingStepStatus;
  timestamp: string | null;
  storeId: string | null;
}

function toView(step: RawStep, index: number, manual: boolean, state: string, viewTone: Tone): TrackingStepView {
  const reached = step.status !== "upcoming";
  // A timestamp that does not parse is not a date: it is shown as not recorded.
  const dated = reached && step.timestamp !== null && !Number.isNaN(new Date(step.timestamp).getTime());
  return {
    id: `${step.key}-${step.storeId ?? ""}-${index}`,
    key: step.key,
    icon: iconOf(step.key, manual, state === "completed"),
    title: step.title,
    summary: step.summary,
    status: step.status,
    tone: toneOf(step.status, step.exception, viewTone),
    exception: step.exception,
    dateTime: dated ? step.timestamp : null,
    dateLabel: !reached ? null : dated ? formatOrderDateTime(step.timestamp) : UNDATED_LABEL,
  };
}

const fromTracking = (step: OrderTrackingStep): RawStep => ({
  key: step.key,
  title: step.title,
  summary: step.summary,
  exception: step.kind === "exception",
  status: step.status,
  timestamp: step.timestamp,
  storeId: step.store_id,
});

/**
 * What the detail page shows of the tracking. Null when the backend sent no
 * step at all: the page then says so instead of drawing an empty journey.
 */
export function buildTrackingView(order: Pick<OrderDetail, "tracking" | "timeline" | "status" | "isDirect">): TrackingView | null {
  const { tracking } = order;

  if (tracking) {
    if (tracking.steps.length === 0) return null;

    const state = STATE[tracking.state] ?? STATE.in_progress;
    const manual = tracking.flow !== "marketplace" && tracking.flow !== "cod_mixte";
    const steps = tracking.steps.map((step, index) => toView(fromTracking(step), index, manual, tracking.state, state.tone));
    const current = tracking.current === null ? null : (steps[tracking.current] ?? null);

    return {
      source: "tracking",
      stateLabel: state.label,
      // An open order standing on an exception (failed attempt) is a warning.
      tone: current && current.exception && state.tone === "info" ? "warning" : state.tone,
      current,
      next: tracking.next === null ? null : (steps[tracking.next] ?? null),
      progress: tracking.progress,
      steps,
    };
  }

  // Older backend: `canonical_timeline` as received, in its order and with its
  // labels. It gives no expected path, so no progress is drawn from it.
  if (order.timeline.length === 0) return null;

  const stateCode = STATE_OF_STATUS[order.status] ?? "in_progress";
  const state = STATE[stateCode];
  const steps = order.timeline.map((step, index) =>
    toView(
      {
        key: step.key,
        title: step.label,
        summary: step.description,
        exception: EXCEPTION_KEYS.includes(step.key),
        status: step.status,
        timestamp: step.timestamp,
        storeId: step.store_id,
      },
      index,
      order.isDirect,
      stateCode,
      state.tone,
    ),
  );

  return {
    source: "timeline",
    stateLabel: state.label,
    tone: state.tone,
    current: steps.find((step) => step.status === "current") ?? null,
    next: steps.find((step) => step.status === "upcoming") ?? null,
    progress: null,
    steps,
  };
}
