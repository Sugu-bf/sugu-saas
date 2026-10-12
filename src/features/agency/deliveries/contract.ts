import { z } from "zod";
import { asCents, centsToFrancs, type MoneyFrancs } from "@/design-system";

// ============================================================
// Agency deliveries — contract with `agencies/{id}/shipments/*`
// (Laravel: AgencyShipmentController, AgencyShipmentService).
//
// Units: every amount is answered in CENTIMES (`shipping_amount`,
// `order.total`, the COD Mixte fees) and is converted to francs
// here, once. Nothing else multiplies or divides by 100.
//
// What the agency may do with a delivery is said by the server
// (`next_statuses`, `can_assign`, `can_reassign`, `awaiting_decision`):
// the screens never rebuild the rules of the workflow.
// ============================================================

/** `App\Enums\Shipments\ShipmentStatus`. */
export const DELIVERY_STATUS_CODES = [
  "pending",
  "awaiting_fee_payment",
  "assigned",
  "picked_up",
  "in_transit",
  "arrived",
  "delivery_failed",
  "delivered",
] as const;

/**
 * Groups counted by `overview`; each is a `scope` of the list. `needs_action`
 * gathers what the dashboard lists first: late, to accept, to assign or failed.
 */
export const DELIVERY_SCOPES = ["awaiting_decision", "to_assign", "on_the_way", "delivered_today", "failed", "late", "needs_action"] as const;
export type DeliveryScope = (typeof DELIVERY_SCOPES)[number];

const text = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);
const id = z.union([z.string().min(1), z.number()]).transform(String);
const count = z.number().int().nonnegative();
const francs = (centimes: number | null | undefined): MoneyFrancs => centsToFrancs(asCents(centimes ?? 0));

// ── Row ─────────────────────────────────────────────────────

const rawCourierSchema = z.object({
  id,
  user_id: id.nullish(),
  name: z.string(),
  phone: text,
  vehicle_type: text,
  average_rating: z.number().nullish(),
  is_available: z.boolean().nullish(),
  // Only on the page of a delivery.
  employee_id: text.optional(),
  vehicle_plate: text.optional(),
  total_deliveries: z.number().nullish(),
  success_rate: z.number().nullish(),
  rating_count: z.number().nullish(),
});

const rawCodMixteSchema = z.object({
  isCodMixte: z.boolean().nullish(),
  deliveryFeePaid: z.boolean().nullish(),
  productFeePaid: z.boolean().nullish(),
  deliveryFeeAmount: z.number().nullish(),
  productFeeAmount: z.number().nullish(),
});

const rawOrderSchema = z.object({
  id: id.nullish(),
  order_number: text,
  items_count: z.number().nullish(),
  total: z.number().nullish(),
  /** The raw column of the order (`OrderPaymentStatus`): unpaid, pending, paid, failed, refunded, hold. */
  payment_status: text,
  /**
   * `Order::paymentSituation()`: where the payment stands, COD and COD Mixte
   * included (paid, partial, cod_pending, pending, hold, refunded, failed).
   * Absent on a backend older than V3.1.
   */
  payment_status_code: text.optional(),
  shipping_address: z.object({ name: text, phone: text, line1: text, city: text }).nullish(),
  store: z.object({ name: text, address_line1: text }).nullish(),
  delivery_notes: text,
});

const rawRowShape = {
  id,
  status: z.string(),
  order: rawOrderSchema.nullish(),
  courier: rawCourierSchema.nullish(),
  shipping_amount: z.number().nullish(),
  items_count: z.number().nullish(),
  eta: text,
  picked_at: text,
  delivered_at: text,
  created_at: text,
  priority: z.number().nullish(),
  cod_mixte: rawCodMixteSchema.nullish(),
  agency_accepted_at: text,
  agency_refusal_reason: text.optional(),
  // Added with the pro portal contract. Absent on an older backend.
  zone: z.object({ id, name: z.string() }).nullish(),
  source: text.optional(),
  pickup: z.object({ name: text, address: text, phone: text }).nullish(),
  late: z.boolean().nullish(),
  awaiting_decision: z.boolean().nullish(),
  next_statuses: z.array(z.string()).nullish(),
  can_assign: z.boolean().nullish(),
  can_reassign: z.boolean().nullish(),
  priority_reason: text.optional(),
};

export const rawDeliveryRowSchema = z.object(rawRowShape);

export interface DeliveryCourier {
  /** His profile in the agency: the id of his page. */
  id: string;
  /** His user account: what assignment and the courier filter expect. */
  userId: string;
  name: string;
  phone: string | null;
  vehicleType: string | null;
  rating: number | null;
}

/** COD Mixte: the customer pays the delivery, then the goods, in two steps. */
export interface DeliveryCodMixte {
  deliveryFeePaid: boolean;
  productFeePaid: boolean;
  deliveryFeeFrancs: MoneyFrancs;
  productFeeFrancs: MoneyFrancs;
}

export interface DeliveryRow {
  id: string;
  /** The order number, or null for a shipment without one. */
  reference: string | null;
  status: string;
  /** Waiting for the agency to accept or refuse it. */
  awaitingDecision: boolean;
  /** Promised for a time that has passed, and still not delivered. */
  late: boolean;
  /** Entered by the agency itself, not received from the marketplace. */
  manual: boolean;
  recipient: { name: string | null; phone: string | null; address: string | null; city: string | null };
  /** Where the parcel is collected. */
  pickup: { name: string | null; address: string | null; phone: string | null } | null;
  zone: { id: string; name: string } | null;
  courier: DeliveryCourier | null;
  /**
   * Where the payment of the order stands, in the codes of `deliveryPaymentStatus`.
   * From a backend that does not derive it yet, the raw status of the order:
   * `unpaid` is then shown as such, never as an unknown status.
   */
  paymentStatus: string | null;
  codMixte: DeliveryCodMixte | null;
  /** What the delivery is priced: the agency's revenue. */
  feeFrancs: MoneyFrancs;
  /** Value of the goods carried. */
  orderTotalFrancs: MoneyFrancs;
  itemsCount: number;
  /** 30 and under is urgent, over 100 is low (DeliveryOrder.priority). */
  priority: number;
  /** What the sender or the agency wrote for the courier. */
  instructions: string | null;
  eta: string | null;
  createdAt: string | null;
  pickedAt: string | null;
  deliveredAt: string | null;
  /** Statuses the agency may move this delivery to. */
  nextStatuses: string[];
  canAssign: boolean;
  canReassign: boolean;
  /** Why the dashboard lists it among the pressing ones. */
  priorityReason: string | null;
}

type RawRow = z.infer<typeof rawDeliveryRowSchema>;

function courierOf(courier: NonNullable<RawRow["courier"]>): DeliveryCourier {
  return {
    id: courier.id,
    userId: courier.user_id ?? courier.id,
    name: courier.name,
    phone: courier.phone,
    vehicleType: courier.vehicle_type,
    rating: courier.average_rating ?? null,
  };
}

export function deliveryRowOf(row: RawRow): DeliveryRow {
  const address = row.order?.shipping_address;
  const cod = row.cod_mixte?.isCodMixte ? row.cod_mixte : null;
  return {
    id: row.id,
    reference: row.order?.order_number ?? null,
    status: row.status,
    awaitingDecision: Boolean(row.awaiting_decision),
    late: Boolean(row.late),
    manual: row.source === "agency_manual",
    recipient: {
      name: address?.name ?? null,
      phone: address?.phone ?? null,
      address: address?.line1 ?? null,
      city: address?.city ?? null,
    },
    pickup: row.pickup ?? (row.order?.store ? { name: row.order.store.name, address: row.order.store.address_line1, phone: null } : null),
    zone: row.zone ?? null,
    courier: row.courier ? courierOf(row.courier) : null,
    paymentStatus: row.order?.payment_status_code ?? row.order?.payment_status ?? null,
    codMixte: cod
      ? {
          deliveryFeePaid: Boolean(cod.deliveryFeePaid),
          productFeePaid: Boolean(cod.productFeePaid),
          deliveryFeeFrancs: francs(cod.deliveryFeeAmount),
          productFeeFrancs: francs(cod.productFeeAmount),
        }
      : null,
    feeFrancs: francs(row.shipping_amount),
    orderTotalFrancs: francs(row.order?.total),
    itemsCount: row.order?.items_count ?? row.items_count ?? 0,
    priority: row.priority ?? 100,
    instructions: row.order?.delivery_notes ?? null,
    eta: row.eta,
    createdAt: row.created_at,
    pickedAt: row.picked_at,
    deliveredAt: row.delivered_at,
    nextStatuses: row.next_statuses ?? [],
    canAssign: Boolean(row.can_assign),
    canReassign: Boolean(row.can_reassign),
    priorityReason: row.priority_reason ?? null,
  };
}

export const parseDeliveryRow = (raw: unknown): DeliveryRow => deliveryRowOf(rawDeliveryRowSchema.parse(raw));

/** The status to show: a request the agency has not decided on reads « À accepter », whatever its code. */
export function displayStatusOf(row: Pick<DeliveryRow, "status" | "awaitingDecision">): string {
  return row.awaitingDecision ? "to_accept" : row.status;
}

/** What to call a delivery when the backend gave it no number. */
export function deliveryLabel(reference: string | null): string {
  return reference ?? "Sans numéro";
}

// ── List ────────────────────────────────────────────────────

const rawOverviewSchema = z.object({
  awaitingDecision: count,
  toAssign: count,
  onTheWay: count,
  deliveredToday: count,
  deliveredYesterday: count,
  failed: count,
  late: count,
});

export type DeliveryOverview = z.infer<typeof rawOverviewSchema>;
export const parseDeliveryOverview = (raw: unknown): DeliveryOverview => rawOverviewSchema.parse(raw);

const rawListSchema = z.object({
  shipments: z.array(z.unknown()),
  statusCounts: z.record(z.string(), count),
  overview: rawOverviewSchema.nullish(),
  zones: z.array(z.object({ id, name: z.string(), count })).nullish(),
  pagination: z.object({ total: count }),
});

export interface DeliveryZone {
  id: string;
  name: string;
  count: number;
}

export interface DeliveryListPage {
  rows: DeliveryRow[];
  total: number;
  page: number;
  pageSize: number;
  /** One counter per status, and `all`. */
  statusCounts: Partial<Record<string, number>>;
  /** Null on a backend older than the pro portal contract: the page then shows no group. */
  overview: DeliveryOverview | null;
  /** Zones the deliveries fall in; null when the backend does not list them. */
  zones: DeliveryZone[] | null;
}

export function parseDeliveryListPage(raw: unknown, requested: { page: number; pageSize: number }): DeliveryListPage {
  const list = rawListSchema.parse(raw);
  return {
    rows: list.shipments.map(parseDeliveryRow),
    total: list.pagination.total,
    page: requested.page,
    pageSize: requested.pageSize,
    statusCounts: list.statusCounts,
    overview: list.overview ?? null,
    zones: list.zones ?? null,
  };
}

// ── Detail ──────────────────────────────────────────────────

export const JOURNEY_STEP_KEYS = ["received", "accepted", "assigned", "picked_up", "in_transit", "delivered", "delivery_failed"] as const;
export type JourneyStepKey = (typeof JOURNEY_STEP_KEYS)[number];

const rawJourneySchema = z.object({
  state: z.enum(["in_progress", "completed", "failed"]),
  steps: z.array(
    z.object({
      key: z.string(),
      status: z.enum(["done", "current", "upcoming"]),
      timestamp: z.string().nullish(),
    }),
  ),
});

const rawDetailSchema = z.object({
  ...rawRowShape,
  status_updated_at: text.optional(),
  order: rawOrderSchema
    .extend({
      payment_method: text.optional(),
      created_at: text.optional(),
      shipping_address_line2: text.optional(),
      items: z
        .array(z.object({ name: z.string(), qty: z.number(), unit_price: z.number(), image: text, collected: z.boolean().nullish() }))
        .nullish(),
    })
    .nullish(),
  notes: z.array(z.object({ id, memo: z.string(), noted_at: z.string(), author: z.string() })).nullish(),
  journey: rawJourneySchema.nullish(),
  schedule: z.object({ scheduled_at: text, date: text, from: text, to: text }).nullish(),
  delivery_instructions: text.optional(),
  recipient: z.object({ email: text, deliveries_count: z.number().int().nonnegative() }).nullish(),
  position: z
    .object({ lat: z.number(), lng: z.number(), recorded_at: text, distance_km: z.number().nullish() })
    .nullish(),
});

export interface DeliveryItem {
  name: string;
  quantity: number;
  unitPriceFrancs: MoneyFrancs;
  image: string | null;
}

export interface DeliveryNote {
  id: string;
  text: string;
  author: string;
  at: string;
}

export interface JourneyStep {
  key: string;
  status: "done" | "current" | "upcoming";
  /** Null for a step that has not happened, and for one reached at a moment nothing recorded. */
  at: string | null;
}

export interface DeliveryJourney {
  state: "in_progress" | "completed" | "failed";
  steps: JourneyStep[];
}

export interface DeliveryPosition {
  lat: number;
  lng: number;
  recordedAt: string | null;
  /** As the crow flies to the recipient; null when his address is not located. */
  distanceKm: number | null;
}

/** The courier of a delivery, with his record in the agency. */
export interface DeliveryCourierRecord extends DeliveryCourier {
  employeeId: string | null;
  vehiclePlate: string | null;
  totalDeliveries: number | null;
  /** Percentage; null before his first delivery. */
  successRate: number | null;
  ratingCount: number | null;
}

export interface DeliveryDetail extends Omit<DeliveryRow, "courier"> {
  courier: DeliveryCourierRecord | null;
  paymentMethod: string | null;
  orderedAt: string | null;
  statusUpdatedAt: string | null;
  addressLine2: string | null;
  /** Directions typed with a manual delivery (landmark, floor…). */
  directions: string | null;
  refusalReason: string | null;
  items: DeliveryItem[];
  notes: DeliveryNote[];
  /** Null on a backend that does not build it: the page then draws no progress. */
  journey: DeliveryJourney | null;
  /** The slot the delivery was promised for, as typed. */
  schedule: { date: string | null; from: string | null; to: string | null } | null;
  /** Answered to who runs the agency only. */
  recipientRecord: { email: string | null; deliveriesCount: number } | null;
  /** Null without a recorded position; undefined when the backend did not answer it to this user. */
  position: DeliveryPosition | null | undefined;
}

export function parseDeliveryDetail(raw: unknown): DeliveryDetail {
  const detail = rawDetailSchema.parse(raw);
  const row = deliveryRowOf(detail);
  const schedule = detail.schedule;
  return {
    ...row,
    courier:
      row.courier && detail.courier
        ? {
            ...row.courier,
            employeeId: detail.courier.employee_id ?? null,
            vehiclePlate: detail.courier.vehicle_plate ?? null,
            totalDeliveries: detail.courier.total_deliveries ?? null,
            successRate: detail.courier.success_rate ?? null,
            ratingCount: detail.courier.rating_count ?? null,
          }
        : null,
    paymentMethod: detail.order?.payment_method ?? null,
    orderedAt: detail.order?.created_at ?? null,
    statusUpdatedAt: detail.status_updated_at ?? null,
    addressLine2: detail.order?.shipping_address_line2 ?? null,
    directions: detail.delivery_instructions ?? null,
    refusalReason: detail.agency_refusal_reason ?? null,
    items: (detail.order?.items ?? []).map((item) => ({
      name: item.name,
      quantity: item.qty,
      unitPriceFrancs: francs(item.unit_price),
      image: item.image,
    })),
    notes: (detail.notes ?? []).map((note) => ({ id: note.id, text: note.memo, author: note.author, at: note.noted_at })),
    journey: detail.journey
      ? { state: detail.journey.state, steps: detail.journey.steps.map((step) => ({ key: step.key, status: step.status, at: step.timestamp ?? null })) }
      : null,
    schedule: schedule && (schedule.date || schedule.from || schedule.to) ? { date: schedule.date, from: schedule.from, to: schedule.to } : null,
    recipientRecord: detail.recipient ? { email: detail.recipient.email, deliveriesCount: detail.recipient.deliveries_count } : null,
    position:
      detail.position === undefined
        ? undefined
        : detail.position
          ? {
              lat: detail.position.lat,
              lng: detail.position.lng,
              recordedAt: detail.position.recorded_at,
              distanceKm: detail.position.distance_km ?? null,
            }
          : null,
  };
}

// ── Bulk changes ────────────────────────────────────────────

const rawBulkSchema = z.object({
  updated: z.array(id).nullish(),
  updated_count: z.number().int().nullish(),
  rejected: z.array(z.object({ shipment_id: id, reason: z.string() })).nullish(),
});

export interface BulkOutcome {
  updatedCount: number;
  /** What the server refused, each with the code of its reason. */
  rejected: { id: string; reason: string }[];
}

export function parseBulkOutcome(raw: unknown): BulkOutcome {
  const outcome = rawBulkSchema.parse(raw);
  return {
    updatedCount: outcome.updated_count ?? outcome.updated?.length ?? 0,
    rejected: (outcome.rejected ?? []).map((entry) => ({ id: entry.shipment_id, reason: entry.reason })),
  };
}
