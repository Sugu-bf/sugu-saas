import { z } from "zod";
import { asCents, type MoneyCents } from "@/design-system";
import type { CanonicalTimelineStep } from "@/components/ui/canonical-timeline";

// ============================================================
// Missions of a courier — what `courier/deliveries*` and
// `courier/dashboard` answer, read into the shapes the screens use.
//
// The server says where a mission stands for the courier (`stage`)
// and what they may do now (`next_actions`): no screen copies a rule
// of the workflow. Amounts are CENTIMES, typed as such.
// ============================================================

/** `CourierDeliveryService::stageOf`. An unknown stage is kept as it is, and shown as unknown. */
export const MISSION_STAGES = ["available", "to_accept", "awaiting_fee_payment", "to_collect", "collected", "in_transit", "arrived", "delivered", "failed"] as const;
export type MissionStage = (typeof MISSION_STAGES)[number];

/** What a courier can ask of a mission. */
export const MISSION_ACTIONS = ["accept", "refuse", "confirm_collection", "start_transit", "mark_arrived", "mark_delivered", "signal_delay", "mark_failed"] as const;
export type MissionAction = (typeof MISSION_ACTIONS)[number];

export type MissionScope = "offered" | "in_progress" | "done";
export type MissionPhase = "pickup" | "dropoff";

export type PaymentMode = "online" | "cod" | "cod_prepaid" | "cod_mixte";

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));
const cents = z.coerce
  .number()
  .catch(0)
  .transform((value) => asCents(Number.isFinite(value) ? value : 0));
const instant = z
  .string()
  .nullish()
  .transform((value) => (value && !Number.isNaN(Date.parse(value)) ? value : null));

const codMixteSchema = z
  .object({
    isCodMixte: z.boolean().catch(false),
    currentStep: z.string().catch(""),
    deliveryFeePaid: z.boolean().catch(false),
    productFeePaid: z.boolean().catch(false),
    deliveryFeeAmount: cents,
    productFeeAmount: cents,
    deliveryFeePaidAt: instant,
    productFeePaidAt: instant,
  })
  .nullish()
  .transform((value) => (value && value.isCodMixte ? value : null));

export type CodMixte = NonNullable<z.infer<typeof codMixteSchema>>;

const placeSchema = z.object({ name: text, address: text }).catch({ name: null, address: null });

const rowSchema = z.object({
  id: z.string(),
  reference: text,
  order_id: text,
  status: z.string(),
  stage: z.string(),
  next_actions: z.array(z.string()).catch([]),
  blocked_actions: z.record(z.string(), z.string()).catch({}),
  pickup: placeSchema,
  delivery: placeSchema,
  recipient: z.object({ name: text, line1: text, city: text }).catch({ name: null, line1: null, city: null }),
  client: z.object({ phone: text, note: text }).partial().catch({}),
  amount: cents,
  order_total: cents,
  payment_mode: z.string().catch("online"),
  cash_to_collect: cents,
  distance_km: z.coerce.number().catch(0),
  duration_min: z.coerce.number().catch(0),
  parcel_count: z.coerce.number().catch(0),
  assigned_to_me: z.boolean().catch(true),
  accepted_at: instant,
  picked_at: instant,
  delivered_at: instant,
  scheduled_at: instant,
  updated_at: instant,
  failure: z
    .object({ code: text, reason: text, at: instant })
    .nullish()
    .transform((value) => value ?? null),
  codMixte: codMixteSchema,
});

function known<T extends string>(values: readonly T[], list: string[]): T[] {
  return list.filter((value): value is T => (values as readonly string[]).includes(value));
}

function toMission(raw: z.infer<typeof rowSchema>) {
  const reference = raw.reference ?? raw.order_id?.replace(/^#/, "") ?? null;
  return {
    id: raw.id,
    /** Number of the order, e.g. `SU-2026-000206`; null for a shipment without one. */
    reference,
    /** Raw `ShipmentStatus`. */
    status: raw.status,
    stage: raw.stage,
    actions: known(MISSION_ACTIONS, raw.next_actions),
    /** The next action when something precise holds it: `{ start_transit: "DELIVERY_FEE_UNPAID" }`. */
    blocked: raw.blocked_actions as Partial<Record<MissionAction, string>>,
    pickup: raw.pickup,
    recipient: {
      name: raw.recipient.name ?? raw.delivery.name,
      address: raw.recipient.line1 ?? raw.delivery.address,
      city: raw.recipient.city,
      /** Masked in a list, whole in the page of the mission. */
      phone: raw.client.phone ?? null,
      note: raw.client.note ?? null,
    },
    /** What the delivery is paid to the agency. */
    fee: raw.amount as MoneyCents,
    orderTotal: raw.order_total as MoneyCents,
    paymentMode: (["online", "cod", "cod_prepaid", "cod_mixte"].includes(raw.payment_mode) ? raw.payment_mode : "online") as PaymentMode,
    /** Cash the courier takes at the door. Zero when nothing is paid in cash. */
    cashToCollect: raw.cash_to_collect as MoneyCents,
    /** Only when the server knows them: 0 means unknown, never « 0 km ». */
    distanceKm: raw.distance_km > 0 ? raw.distance_km : null,
    durationMin: raw.duration_min > 0 ? raw.duration_min : null,
    parcelCount: raw.parcel_count,
    /** False for a mission that is free in the agency: nobody carries it yet. */
    mine: raw.assigned_to_me,
    acceptedAt: raw.accepted_at,
    pickedAt: raw.picked_at,
    deliveredAt: raw.delivered_at,
    scheduledAt: raw.scheduled_at,
    updatedAt: raw.updated_at,
    failure: raw.failure,
    codMixte: raw.codMixte,
  };
}

export type Mission = ReturnType<typeof toMission>;

export function parseMission(raw: unknown): Mission {
  return toMission(rowSchema.parse(raw));
}

// ── Lists ───────────────────────────────────────────────────

const paginationSchema = z.object({
  current_page: z.coerce.number().catch(1),
  total_pages: z.coerce.number().catch(1),
  per_page: z.coerce.number().catch(10),
  total_items: z.coerce.number().catch(0),
});

const listSchema = z.object({
  counts: z.object({ offered: z.coerce.number().catch(0), in_progress: z.coerce.number().catch(0), done: z.coerce.number().catch(0) }),
  rows: z.array(z.unknown()),
  pagination: paginationSchema,
});

export interface MissionListPage {
  counts: Record<MissionScope, number>;
  rows: Mission[];
  page: number;
  pageSize: number;
  total: number;
}

export function parseMissionList(raw: unknown): MissionListPage {
  const data = listSchema.parse(raw);
  return {
    counts: data.counts,
    rows: data.rows.map(parseMission),
    page: data.pagination.current_page,
    pageSize: data.pagination.per_page,
    total: data.pagination.total_items,
  };
}

// ── Home ────────────────────────────────────────────────────

const overviewSchema = z.object({
  driver_name: text,
  agency_name: text,
  is_online: z.boolean().catch(false),
  counts: z.object({
    to_accept: z.coerce.number().catch(0),
    in_progress: z.coerce.number().catch(0),
    delivered: z.coerce.number().catch(0),
    failed: z.coerce.number().catch(0),
    week_total: z.coerce.number().catch(0),
  }),
  next_mission: z.unknown().nullish(),
  recent_activity: z
    .array(z.object({ id: z.string(), type: z.string().catch(""), title: z.string(), subtitle: text, time: text }))
    .catch([]),
});

export interface Overview {
  name: string | null;
  agencyName: string | null;
  /** The account is active: the agency can give missions to this courier. */
  active: boolean;
  counts: { toAccept: number; inProgress: number; delivered: number; failed: number; weekTotal: number };
  nextMission: Mission | null;
  /** The last movements of the courier's missions, worded and dated by the server. */
  activity: { id: string; type: string; title: string; detail: string | null; when: string | null }[];
}

export function parseOverview(raw: unknown): Overview {
  const data = overviewSchema.parse(raw);
  return {
    name: data.driver_name,
    agencyName: data.agency_name,
    active: data.is_online,
    counts: {
      toAccept: data.counts.to_accept,
      inProgress: data.counts.in_progress,
      delivered: data.counts.delivered,
      failed: data.counts.failed,
      weekTotal: data.counts.week_total,
    },
    nextMission: data.next_mission ? parseMission(data.next_mission) : null,
    activity: data.recent_activity.map((entry) => ({ id: entry.id, type: entry.type, title: entry.title, detail: entry.subtitle, when: entry.time })),
  };
}

// ── Page of a mission ───────────────────────────────────────

const productSchema = z.object({
  id: z.string(),
  name: z.string().catch("Article"),
  variant: text,
  quantity: z.coerce.number().catch(1),
  collected: z.boolean().catch(false),
});

const stopSchema = z.object({
  id: z.string(),
  store_id: text,
  type: z.string(),
  name: text,
  address: text,
  products: z.array(productSchema).catch([]),
  is_completed: z.boolean().catch(false),
  pickup_code_required: z.boolean().catch(false),
  collected_at: instant,
});

const pointSchema = z
  .object({ lat: z.number(), lng: z.number() })
  .nullish()
  .transform((value) => value ?? null);

const timelineStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["done", "current", "upcoming"]),
  timestamp: instant,
  store_id: text,
  actor_type: text,
  description: text,
});

const detailSchema = rowSchema.extend({
  stops: z.array(stopSchema).catch([]),
  canonical_timeline: z.array(timelineStepSchema).catch([]),
  delivery_code_issued: z.boolean().catch(true),
  positions: z.object({ pickup: pointSchema, dropoff: pointSchema }).catch({ pickup: null, dropoff: null }),
});

export interface PickupStop {
  id: string;
  /** The boutique, as the steps of the timeline name it. */
  storeId: string | null;
  name: string | null;
  address: string | null;
  /** Articles to take at this boutique. Collecting one collects the stop. */
  products: z.infer<typeof productSchema>[];
  collected: boolean;
  collectedAt: string | null;
  /** The boutique gives a code, which the courier types to confirm. */
  codeRequired: boolean;
}

export interface MissionDetail extends Mission {
  pickups: PickupStop[];
  /** The canonical projection of the order (V1.2), as the courier is allowed to see it. */
  timeline: CanonicalTimelineStep[];
  /** No code was issued for this delivery: it cannot be closed from here. */
  deliveryCodeIssued: boolean;
  positions: { pickup: { lat: number; lng: number } | null; dropoff: { lat: number; lng: number } | null };
}

export function parseMissionDetail(raw: unknown): MissionDetail {
  const data = detailSchema.parse(raw);
  return {
    ...toMission(data),
    pickups: data.stops
      .filter((stop) => stop.type === "pickup")
      .map((stop) => ({
        id: stop.id,
        storeId: stop.store_id,
        name: stop.name,
        address: stop.address,
        products: stop.products,
        collected: stop.is_completed,
        collectedAt: stop.collected_at,
        codeRequired: stop.pickup_code_required,
      })),
    timeline: data.canonical_timeline,
    deliveryCodeIssued: data.delivery_code_issued,
    positions: data.positions,
  };
}

// ── Reading a mission ───────────────────────────────────────

export const can = (mission: Pick<Mission, "actions">, action: MissionAction) => mission.actions.includes(action);

/** « Mission SU-2026-000206 », or « Mission » for a shipment without a number. */
export function missionLabel(reference: string | null): string {
  return reference ? `Mission ${reference}` : "Mission";
}

/** The four steps the courier walks, in order, and how far this mission is. */
export const JOURNEY = [
  { key: "assigned", label: "Assignée" },
  { key: "collected", label: "Collectée" },
  { key: "in_transit", label: "En transit" },
  { key: "delivered", label: "Livrée" },
] as const;

export type JourneyState = "done" | "current" | "upcoming";

/**
 * Where each step of `JOURNEY` stands. The step reached last is the current
 * one: a mission on the road is « En transit », with what came before it
 * done and the delivery still to come. A delivered mission has them all
 * done; a failed one keeps what it reached, and no current step.
 */
export function journeyOf(mission: Pick<Mission, "stage" | "acceptedAt" | "pickedAt">): JourneyState[] {
  const reached = (() => {
    switch (mission.stage) {
      case "delivered":
        return 4;
      case "in_transit":
      case "arrived":
        return 3;
      case "collected":
        return 2;
      case "to_accept":
      case "to_collect":
      case "awaiting_fee_payment":
        return 1;
      case "failed":
        // As far as it got before failing.
        return mission.pickedAt ? 2 : 1;
      default:
        return 0;
    }
  })();
  const closed = mission.stage === "delivered" || mission.stage === "failed";
  return JOURNEY.map((_, index) => (index < reached - 1 || (closed && index < reached) ? "done" : index === reached - 1 ? "current" : "upcoming"));
}

/**
 * What is to be paid at the door, in one line under the amount.
 * `amount` is null when the courier has nothing to take.
 */
export function collectionOf(mission: Pick<Mission, "paymentMode" | "cashToCollect" | "codMixte" | "orderTotal">): { amount: MoneyCents | null; label: string } {
  if (mission.paymentMode === "cod") return { amount: mission.cashToCollect, label: "À encaisser (COD)" };
  if (mission.paymentMode === "cod_mixte") {
    const cod = mission.codMixte;
    if (cod && cod.deliveryFeePaid && cod.productFeePaid) return { amount: null, label: "Payée par mobile money" };
    // The customer pays by mobile money, in two parts: nothing in cash.
    return { amount: null, label: "COD Mixte : paiement mobile money par le client" };
  }
  if (mission.paymentMode === "cod_prepaid") return { amount: null, label: "Déjà payée : rien à encaisser" };
  return { amount: null, label: "Payée en ligne : rien à encaisser" };
}
