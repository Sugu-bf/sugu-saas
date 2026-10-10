import { z } from "zod";
import { asFrancs, type MoneyFrancs } from "@/design-system";

// ============================================================
// Seller orders — contract with `sellers/orders/*` (Laravel:
// SellerOrderController, SellerOrderService).
//
// Units: every amount of these endpoints is in FRANCS. The backend
// stores centimes and converts with `centsToUnits` before answering,
// COD Mixte fees included. Nothing here multiplies or divides by 100.
//
// Statuses are kept as the backend code (`App\Enums\Orders\OrderStatus`,
// `resolvePaymentStatusCode`). An unknown code stays unknown: it is
// never folded into "pending".
// ============================================================

/** `App\Enums\Orders\OrderStatus`, in lifecycle order. */
export const ORDER_STATUS_CODES = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "canceled",
  "returned",
  "failed",
] as const;

const nullableString = z.string().nullish().transform((value) => value || null);
const amount = z.number().finite();

// ── Available actions ───────────────────────────────────────

const actionsSchema = z.object({
  confirm: z.boolean(),
  cancel: z.boolean(),
  requestDelivery: z.boolean(),
  markShipped: z.boolean(),
  markDelivered: z.boolean(),
});
export type OrderActions = z.infer<typeof actionsSchema>;
export type OrderActionKey = keyof OrderActions;

function isDirectChannel(channel: unknown): boolean {
  return Array.isArray(channel) && channel.includes("direct");
}

// ── List ────────────────────────────────────────────────────

const rawListItemSchema = z.object({
  id: z.string().min(1),
  reference: nullableString,
  displayId: nullableString,
  date: nullableString,
  customer: z
    .object({ name: nullableString, phone: nullableString, email: nullableString })
    .nullish(),
  channel: z.unknown().optional(),
  isDirect: z.boolean().optional(),
  statusCode: z.string().min(1),
  paymentStatusCode: nullableString,
  is_cod: z.boolean().nullish(),
  cod_flow_type: nullableString,
  cod_current_step: nullableString,
  itemCount: z.number().int().nonnegative().nullish(),
  totalAmount: amount,
  items: z.array(z.object({ name: nullableString, quantity: z.number().nullish() })).nullish(),
  actions: actionsSchema.nullish(),
});

export interface OrderListItem {
  id: string;
  /** The order number (`SU-2026-…`) as the backend gives it; null when it gives none. */
  reference: string | null;
  placedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  itemCount: number;
  itemsSummary: string;
  totalFrancs: MoneyFrancs;
  status: string;
  paymentStatus: string | null;
  /** `mixte`: split COD. `legacy`: full cash on delivery. null: not a COD order. */
  codFlow: "mixte" | "legacy" | null;
  codStep: string | null;
  /** Manual sale made by the seller (channel `direct`). */
  isDirect: boolean;
  /** Transitions the server says it would accept; null when it does not say. */
  actions: OrderActions | null;
}

export interface OrderListPage {
  rows: OrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

function summarizeItems(items: { name: string | null; quantity?: number | null }[]): string {
  const [first, ...rest] = items;
  if (!first) return "";
  const head = `${first.quantity ?? 1} × ${first.name ?? "Article"}`;
  return rest.length > 0 ? `${head} + ${rest.length} autre${rest.length > 1 ? "s" : ""}` : head;
}

function codFlowOf(isCod: boolean | null | undefined, flow: string | null): OrderListItem["codFlow"] {
  if (!isCod) return null;
  return flow === "mixte" ? "mixte" : "legacy";
}

export function parseOrderListItem(raw: unknown): OrderListItem {
  const item = rawListItemSchema.parse(raw);
  const items = item.items ?? [];
  return {
    id: item.id,
    reference: item.reference ?? item.displayId,
    placedAt: item.date,
    customerName: item.customer?.name ?? null,
    customerPhone: item.customer?.phone ?? null,
    itemCount: item.itemCount ?? items.length,
    itemsSummary: summarizeItems(items),
    totalFrancs: asFrancs(item.totalAmount),
    status: item.statusCode,
    paymentStatus: item.paymentStatusCode,
    codFlow: codFlowOf(item.is_cod, item.cod_flow_type),
    codStep: item.cod_current_step,
    isDirect: item.isDirect ?? isDirectChannel(item.channel),
    actions: item.actions ?? null,
  };
}

const rawListSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
});

export function parseOrderListPage(raw: unknown, requested: { page: number; pageSize: number }): OrderListPage {
  const list = rawListSchema.parse(raw);
  return {
    rows: list.data.map(parseOrderListItem),
    total: list.total,
    page: requested.page,
    pageSize: requested.pageSize,
  };
}

// ── Counters ────────────────────────────────────────────────

const rawStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  byStatus: z.record(z.number().int().nonnegative()).optional(),
  pending: z.number().int().nonnegative().optional(),
  confirmed: z.number().int().nonnegative().optional(),
  delivered: z.number().int().nonnegative().optional(),
  canceled: z.number().int().nonnegative().optional(),
});

export interface OrderCounts {
  total: number;
  /**
   * Count per status code, only for the statuses the backend counted.
   * A status missing here is UNKNOWN, not zero: it is never computed by
   * subtracting the others from the total.
   */
  byStatus: Partial<Record<string, number>>;
}

export function parseOrderCounts(raw: unknown): OrderCounts {
  const stats = rawStatsSchema.parse(raw);
  if (stats.byStatus) return { total: stats.total, byStatus: stats.byStatus };

  // Backend without `byStatus`: keep the four exact counters it has.
  // `shipping` (shipped + processing merged) cannot be split, so neither
  // status gets a number.
  const byStatus: Partial<Record<string, number>> = {};
  for (const code of ["pending", "confirmed", "delivered", "canceled"] as const) {
    if (stats[code] !== undefined) byStatus[code] = stats[code];
  }
  return { total: stats.total, byStatus };
}

// ── Detail ──────────────────────────────────────────────────

const timelineStepSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["done", "current", "upcoming"]),
  timestamp: z.string().nullable(),
  store_id: nullableString,
  actor_type: nullableString,
  description: nullableString,
});
export type OrderTimelineStep = z.infer<typeof timelineStepSchema>;

const rawDetailSchema = z.object({
  id: z.string().min(1),
  reference: nullableString,
  createdAt: nullableString,
  channel: z.unknown().optional(),
  isDirect: z.boolean().optional(),
  statusCode: z.string().min(1),
  parties: z
    .object({
      client: z
        .object({ name: nullableString, location: nullableString, phone: nullableString, email: nullableString })
        .nullish(),
      driver: z.object({ name: nullableString, phone: nullableString }).nullish(),
    })
    .nullish(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        name: nullableString,
        variant: nullableString,
        quantity: z.number(),
        price: amount,
        total: amount,
        image: nullableString,
        storeId: nullableString,
      }),
    )
    .default([]),
  pricing: z.object({
    subtotal: amount,
    deliveryFees: amount.nullish(),
    discount: amount.nullish(),
    tax: amount.nullish(),
    total: amount,
    orderTotal: amount.nullish(),
    paymentStatus: nullableString,
  }),
  canonical_timeline: z.array(timelineStepSchema).nullish(),
  cod_mixte: z
    .object({
      isCodMixte: z.boolean().nullish(),
      currentStep: nullableString,
      deliveryFeePaid: z.boolean().nullish(),
      productFeePaid: z.boolean().nullish(),
      deliveryFeeAmount: amount.nullish(),
      productFeeAmount: amount.nullish(),
      deliveryFeePaidAt: nullableString,
      productFeePaidAt: nullableString,
      vendorConfirmedAt: nullableString,
      agencyAccepted: z.boolean().nullish(),
    })
    .nullish(),
  delivery: z
    .object({
      method: nullableString,
      address: z
        .object({
          fullName: nullableString,
          phone: nullableString,
          line1: nullableString,
          line2: nullableString,
          zone: nullableString,
          city: nullableString,
          state: nullableString,
          countryCode: nullableString,
        })
        .nullish(),
      partner: z.object({ id: z.string(), name: nullableString }).nullish(),
      shipmentStatus: nullableString,
      courier: z.object({ name: nullableString, phone: nullableString }).nullish(),
      note: nullableString,
    })
    .nullish(),
  actions: actionsSchema.nullish(),
});

export interface OrderDetailItem {
  id: string;
  name: string;
  variant: string | null;
  quantity: number;
  unitPriceFrancs: MoneyFrancs;
  lineTotalFrancs: MoneyFrancs;
  image: string | null;
  storeId: string | null;
}

export interface OrderCodMixte {
  step: string | null;
  deliveryFeePaid: boolean;
  productFeePaid: boolean;
  deliveryFeeFrancs: MoneyFrancs | null;
  productFeeFrancs: MoneyFrancs | null;
  deliveryFeePaidAt: string | null;
  productFeePaidAt: string | null;
  vendorConfirmedAt: string | null;
}

export interface OrderDeliveryAddress {
  fullName: string | null;
  phone: string | null;
  /** Lines to print, in order. Built only from what is stored. */
  lines: string[];
}

export interface OrderDetail {
  id: string;
  reference: string | null;
  placedAt: string | null;
  status: string;
  isDirect: boolean;
  customer: { name: string | null; phone: string | null; email: string | null };
  items: OrderDetailItem[];
  amounts: {
    /** The viewing vendor's items. */
    itemsFrancs: MoneyFrancs;
    /** Order-level figures; null when the backend sent none. */
    deliveryFrancs: MoneyFrancs | null;
    discountFrancs: MoneyFrancs | null;
    taxFrancs: MoneyFrancs | null;
    /** What the customer pays for the whole order; null on an older backend. */
    orderTotalFrancs: MoneyFrancs | null;
    /** Total of the viewing vendor's items. */
    vendorTotalFrancs: MoneyFrancs;
  };
  paymentStatus: string | null;
  codMixte: OrderCodMixte | null;
  delivery: {
    /** `pickup` (counter sale) or `shipping`, for a manual sale. */
    method: string | null;
    address: OrderDeliveryAddress | null;
    partnerName: string | null;
    shipmentStatus: string | null;
    courier: { name: string | null; phone: string | null } | null;
    note: string | null;
  };
  timeline: OrderTimelineStep[];
  actions: OrderActions;
  /** `server`: flags sent by the backend. `rules`: derived from the known workflow. */
  actionsSource: "server" | "rules";
}

function francsOrNull(value: number | null | undefined): MoneyFrancs | null {
  return value === null || value === undefined ? null : asFrancs(value);
}

/**
 * Display rules used only when the backend does not send `actions`. They
 * mirror the guards of SellerOrderController and stay on the cautious side:
 * the server still accepts or refuses every request.
 */
export function deriveActionsFromRules(order: {
  status: string;
  isDirect: boolean;
  hasShipment: boolean;
  codMixte: Pick<OrderCodMixte, "deliveryFeePaid" | "productFeePaid"> | null;
}): OrderActions {
  const { status } = order;
  const feesSettled = order.codMixte === null || (order.codMixte.deliveryFeePaid && order.codMixte.productFeePaid);
  return {
    confirm: status === "pending",
    cancel: !["delivered", "canceled", "returned"].includes(status),
    requestDelivery: status === "confirmed" || status === "processing",
    markShipped: ["confirmed", "processing", "packed"].includes(status),
    // A marketplace delivery is closed by the customer's code, not by the seller.
    markDelivered: status === "shipped" && (order.isDirect || !order.hasShipment) && feesSettled,
  };
}

/** The backend answers "Standard" when an item has no option: that is not a variant. */
function variantOf(value: string | null): string | null {
  return value && value !== "Standard" ? value : null;
}

export function parseOrderDetail(raw: unknown): OrderDetail {
  const order = rawDetailSchema.parse(raw);
  const client = order.parties?.client;
  const isDirect = order.isDirect ?? isDirectChannel(order.channel);

  const cod = order.cod_mixte?.isCodMixte
    ? {
        step: order.cod_mixte.currentStep,
        deliveryFeePaid: Boolean(order.cod_mixte.deliveryFeePaid),
        productFeePaid: Boolean(order.cod_mixte.productFeePaid),
        deliveryFeeFrancs: francsOrNull(order.cod_mixte.deliveryFeeAmount),
        productFeeFrancs: francsOrNull(order.cod_mixte.productFeeAmount),
        deliveryFeePaidAt: order.cod_mixte.deliveryFeePaidAt,
        productFeePaidAt: order.cod_mixte.productFeePaidAt,
        vendorConfirmedAt: order.cod_mixte.vendorConfirmedAt,
      }
    : null;

  const rawAddress = order.delivery?.address;
  // Older backend: one free-text line ("city, street") and nothing else. It is
  // shown as received, never split into invented street/city/country parts.
  const legacyLocation = client?.location && client.location !== "Adresse inconnue" ? client.location : null;
  const address: OrderDeliveryAddress | null = rawAddress
    ? {
        fullName: rawAddress.fullName,
        phone: rawAddress.phone,
        lines: [
          rawAddress.line1,
          rawAddress.line2,
          [rawAddress.zone, rawAddress.city].filter(Boolean).join(", ") || null,
          rawAddress.state,
        ].filter((line): line is string => Boolean(line)),
      }
    : !order.delivery && legacyLocation
      ? { fullName: null, phone: null, lines: [legacyLocation] }
      : null;

  const courier = order.delivery?.courier ?? order.parties?.driver ?? null;
  const hasShipment = Boolean(order.delivery?.shipmentStatus || order.delivery?.partner || courier);

  return {
    id: order.id,
    reference: order.reference,
    placedAt: order.createdAt,
    status: order.statusCode,
    isDirect,
    customer: { name: client?.name ?? null, phone: client?.phone ?? null, email: client?.email ?? null },
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name ?? "Article",
      variant: variantOf(item.variant),
      quantity: item.quantity,
      unitPriceFrancs: asFrancs(item.price),
      lineTotalFrancs: asFrancs(item.total),
      image: item.image,
      storeId: item.storeId,
    })),
    amounts: {
      itemsFrancs: asFrancs(order.pricing.subtotal),
      deliveryFrancs: francsOrNull(order.pricing.deliveryFees),
      discountFrancs: francsOrNull(order.pricing.discount),
      taxFrancs: francsOrNull(order.pricing.tax),
      orderTotalFrancs: francsOrNull(order.pricing.orderTotal),
      vendorTotalFrancs: asFrancs(order.pricing.total),
    },
    paymentStatus: order.pricing.paymentStatus,
    codMixte: cod,
    delivery: {
      method: order.delivery?.method ?? null,
      address,
      partnerName: order.delivery?.partner?.name ?? null,
      shipmentStatus: order.delivery?.shipmentStatus ?? null,
      courier: courier ? { name: courier.name ?? null, phone: courier.phone ?? null } : null,
      note: order.delivery?.note ?? null,
    },
    timeline: order.canonical_timeline ?? [],
    actions: order.actions ?? deriveActionsFromRules({ status: order.statusCode, isDirect, hasShipment, codMixte: cod }),
    actionsSource: order.actions ? "server" : "rules",
  };
}

// ── Pickup codes ────────────────────────────────────────────

const pickupCodeSchema = z.object({
  store_id: z.string(),
  pickup_code: z.string(),
  /** `App\Enums\Delivery\StorePickupStatus`; `collected` once the courier confirmed. */
  status: z.string(),
  vendor_handoff_at: nullableString,
});
export type PickupCode = z.infer<typeof pickupCodeSchema>;

export function parsePickupCodes(raw: unknown): PickupCode[] {
  return z.object({ codes: z.array(pickupCodeSchema) }).parse(raw).codes;
}
