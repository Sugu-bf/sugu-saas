import { z } from "zod";
import { api } from "@/lib/http/client";
import { agencyDeliveriesResponseSchema, type AgencyDeliveriesResponse, type DeliveryRow, type DeliveryDetailRow, type DeliveryTimelineStep } from "../schema";
import { getInitials, getAvatarColor, mapShipmentStatusWithDelay, mapPriority, mapStatusLabelWithDelay, calculateEta, formatTime, formatDateLong } from "./utils";

// ── Backend shipments response schema ──────────────────────

const backendShippingAddressSchema = z.object({
  name: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  line1: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
}).nullable().optional();

const backendStoreSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  address_line1: z.string().nullable().optional(),
}).nullable().optional();

const backendOrderSchema = z.object({
  id: z.string().nullable().optional(),
  order_number: z.string().nullable().optional(),
  items_count: z.number().nullable().optional(),
  total: z.number().nullable().optional(),
  payment_status: z.string().nullable().optional(),
  shipping_address: backendShippingAddressSchema,
  store: backendStoreSchema,
  delivery_notes: z.string().nullable().optional(),
}).nullable().optional();

const backendCourierDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  vehicle_type: z.string().nullable().optional(),
  average_rating: z.number().nullable().optional(),
  is_available: z.boolean().nullable().optional(),
}).nullable().optional();

const backendShipmentSchema = z.object({
  id: z.string(),
  order: backendOrderSchema,
  courier: backendCourierDetailSchema,
  status: z.string(),
  shipping_amount: z.number().nullable().optional(),
  items_count: z.number().nullable().optional(),
  eta: z.string().nullable().optional(),
  picked_at: z.string().nullable().optional(),
  delivered_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  cod_mixte: z.object({
    isCodMixte: z.boolean().optional(),
    currentStep: z.string().optional(),
    deliveryFeePaid: z.boolean().optional(),
    productFeePaid: z.boolean().optional(),
    deliveryFeeAmount: z.number().optional(),
    productFeeAmount: z.number().optional(),
    deliveryFeePaidAt: z.string().nullable().optional(),
    productFeePaidAt: z.string().nullable().optional(),
  }).nullable().optional(),
});

// ── Backend detail schema (extends base with detail-specific fields) ──

const backendOrderItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit_price: z.number(),
  image: z.string().nullable().optional(),
  collected: z.boolean().optional(),
});

const backendTrackingEventSchema = z.object({
  seq: z.number(),
  event_type: z.string(),
  status: z.string().nullable().optional(),
  memo: z.string().nullable().optional(),
  created_at: z.string(),
});

const backendNoteSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  memo: z.string(),
  noted_at: z.string(),
  author: z.string(),
});

const backendOrderDetailSchema = backendOrderSchema.unwrap().unwrap().extend({
  payment_method: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  items: z.array(backendOrderItemSchema).optional().default([]),
}).nullable().optional();

const backendShipmentDetailSchema = backendShipmentSchema.extend({
  order: backendOrderDetailSchema,
  courier_phone: z.string().nullable().optional(),
  status_updated_at: z.string().nullable().optional(),
  tracking_events: z.array(backendTrackingEventSchema).optional().default([]),
  notes: z.array(backendNoteSchema).optional().default([]),
});

const backendShipmentsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    summary: z.object({
      totalToday: z.number(),
      pending: z.number(),
      inProgress: z.number(),
      delivered: z.number(),
      failed: z.number(),
    }),
    statusCounts: z.object({
      all: z.number(),
      pending: z.number(),
      assigned: z.number(),
      in_transit: z.number(),
      delivered: z.number(),
      delivery_failed: z.number(),
    }),
    shipments: z.array(backendShipmentSchema),
    pagination: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number(),
      total: z.number(),
    }),
  }),
});


// ── Shipment transformer: Backend → Frontend DeliveryRow ───

function _buildTimeline(
  backendStatus: string, 
  pickedAt?: string | null,
  codMixteData?: Record<string, unknown> | null
): DeliveryTimelineStep[] {
  const isFailed = backendStatus === "delivery_failed";
  const isDelivered = backendStatus === "delivered";
  const isInTransit = backendStatus === "in_transit";
  const isAssigned = backendStatus === "assigned";
  const isPicked = Boolean(pickedAt) || isInTransit || isDelivered;

  const steps: Omit<DeliveryTimelineStep, "current">[] = [
    {
      id: "t1",
      label: "Commande reçue",
      done: true,
    },
    {
      id: "t2",
      label: "Livreur assigné",
      done: isAssigned || isInTransit || isDelivered || isFailed,
    },
  ];

  if (codMixteData?.isCodMixte) {
    const dfeePaid = Boolean(codMixteData.deliveryFeePaid);
    steps.push({
      id: "t-del-fee",
      label: "Paiement liv. (COD Mixte)",
      done: dfeePaid,
    });
  }

  steps.push({
    id: "t3",
    label: "Ramassage",
    done: isPicked,
  });

  steps.push({
    id: "t4",
    label: "En route vers le client",
    done: isDelivered,
  });

  if (codMixteData?.isCodMixte) {
    const pfeePaid = Boolean(codMixteData.productFeePaid);
    steps.push({
      id: "t-prod-fee",
      label: "Paiement produits",
      done: pfeePaid,
    });
  }

  steps.push({
    id: "t5",
    label: "Livrée au client",
    done: isDelivered,
  });

  if (isFailed) {
    steps.push({
      id: "err_fail",
      label: "Échec de livraison",
      done: true,
    });
  }

  const lastCompletedIdx = steps.reduce(
    (lastIdx, step, index) => (step.done ? index : lastIdx),
    -1
  );

  return steps.map((step, index) => {
    // Échec => stop pulse
    if (isFailed && step.id !== "err_fail") {
      return { ...step, current: false };
    }
    if (isFailed && step.id === "err_fail") {
      return { ...step, current: true };
    }
    
    // Livrée => all done, nothing pulses
    if (isDelivered) {
      return { ...step, current: false };
    }
    
    // Default => the step immediately following the last completed step pulses
    return { ...step, current: index === lastCompletedIdx + 1 };
  });
}

function _transformShipment(raw: z.infer<typeof backendShipmentSchema>): DeliveryRow {
  const order = raw.order;
  const courier = raw.courier;
  const shippingAddr = order?.shipping_address;
  const store = order?.store;
  const status = mapShipmentStatusWithDelay(raw.status, raw.eta);
  const priority = mapPriority(raw.priority);
  const clientName = shippingAddr?.name ?? "Client";

  return {
    id: String(raw.id),
    orderId: `#${order?.order_number ?? raw.id}`,
    client: {
      name: clientName,
      phone: shippingAddr?.phone ?? "",
      initials: getInitials(clientName),
      avatarColor: getAvatarColor(String(raw.id)),
      address: [shippingAddr?.line1, shippingAddr?.city].filter(Boolean).join(", "),
      note: order?.delivery_notes ?? "",
    },
    driver: courier
      ? {
          id: String(courier.id),
          name: courier.name,
          initials: getInitials(courier.name),
          avatarColor: getAvatarColor(String(courier.id)),
          vehicle: courier.vehicle_type ?? "moto",
          rating: courier.average_rating ?? 0,
          online: courier.is_available ?? false,
        }
      : null,
    itinerary: {
      from: store?.address_line1 ?? store?.name ?? "Vendeur",
      to: shippingAddr?.line1 ?? "Destination",
      distanceKm: 1, // Placeholder — no GPS distance calculation
      fromTime: formatTime(raw.created_at),
    },
    priority,
    status,
    statusLabel: mapStatusLabelWithDelay(raw.status, raw.eta),
    eta: calculateEta(raw.eta),
    vendor: store?.name ?? "Vendeur",
    vendorUrl: store?.slug ? `https://sugu.pro/store/${store.slug}` : "#",
    orderItems: raw.items_count ?? order?.items_count ?? 0,
    orderTotal: (order?.total ?? 0) / 100,
    orderPayment: order?.payment_status === "paid" ? "paid" : "pending",
    timeline: _buildTimeline(raw.status, raw.picked_at, raw.cod_mixte),
  };
}

// ── Detail transformer: enriches base DeliveryRow with detail-specific data ──

function _transformShipmentDetail(
  raw: z.infer<typeof backendShipmentDetailSchema>,
): DeliveryDetailRow {
  const base = _transformShipment(raw);
  const order = raw.order;

  return {
    ...base,
    shippingAmount: (raw.shipping_amount ?? 0) / 100,
    paymentMethod: order?.payment_method ?? null,
    orderDate: formatDateLong(order?.created_at ?? raw.created_at),
    driverPhone: raw.courier_phone ?? null,
    statusUpdatedAt: raw.status_updated_at ?? null,
    orderItemsList: (order?.items ?? []).map((item) => ({
      name: item.name,
      qty: item.qty,
      unit_price: item.unit_price,
      image: item.image ?? null,
      collected: item.collected ?? false,
    })),
    trackingEvents: (raw.tracking_events ?? []).map((e) => ({
      seq: e.seq,
      event_type: e.event_type,
      status: e.status ?? null,
      memo: e.memo ?? null,
      created_at: e.created_at,
    })),
    notes: (raw.notes ?? []).map((n) => ({
      id: n.id,
      memo: n.memo,
      noted_at: n.noted_at,
      author: n.author,
    })),
    codMixte: raw.cod_mixte ? {
      isCodMixte: Boolean(raw.cod_mixte.isCodMixte),
      currentStep: raw.cod_mixte.currentStep ?? "awaiting_delivery_payment",
      deliveryFeePaid: Boolean(raw.cod_mixte.deliveryFeePaid),
      productFeePaid: Boolean(raw.cod_mixte.productFeePaid),
      deliveryFeeAmount: raw.cod_mixte.deliveryFeeAmount ?? 0,
      productFeeAmount: raw.cod_mixte.productFeeAmount ?? 0,
      deliveryFeePaidAt: raw.cod_mixte.deliveryFeePaidAt ?? null,
      productFeePaidAt: raw.cod_mixte.productFeePaidAt ?? null,
    } : undefined,
  };
}


// ── Deliveries filters type ────────────────────────────────

export interface DeliveryFilters {
  status?: string;
  search?: string;
  courier_id?: string;
  date?: string;
  priority?: string;
  sort?: string;
  per_page?: number;
  page?: number;
}

/**
 * Fetch the agency deliveries list from the real API.
 */
export async function getAgencyDeliveries(
  agencyId: string,
  filters?: DeliveryFilters,
): Promise<AgencyDeliveriesResponse> {
  // Build query params
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters?.status) params.status = filters.status;
  if (filters?.search) params.search = filters.search;
  if (filters?.courier_id) params.courier_id = filters.courier_id;
  if (filters?.date) params.date = filters.date;
  if (filters?.priority) params.priority = filters.priority;
  if (filters?.sort) params.sort = filters.sort;
  if (filters?.per_page) params.per_page = filters.per_page;
  if (filters?.page) params.page = filters.page;

  const raw = await api.get<z.infer<typeof backendShipmentsResponseSchema>>(
    `agencies/${agencyId}/shipments`,
    { params },
  );

  const validated = backendShipmentsResponseSchema.parse(raw);
  const d = validated.data;

  const transformed: AgencyDeliveriesResponse = {
    summary: d.summary,
    rows: d.shipments.map(_transformShipment),
    statusCounts: {
      all: d.statusCounts.all,
      pending: d.statusCounts.pending,
      pickup: d.statusCounts.assigned,
      en_route: d.statusCounts.in_transit,
      delivered: d.statusCounts.delivered,
      failed: d.statusCounts.delivery_failed,
    },
    pagination: {
      currentPage: d.pagination.current_page,
      totalPages: d.pagination.last_page,
      perPage: d.pagination.per_page,
      totalItems: d.pagination.total,
    },
  };

  return agencyDeliveriesResponseSchema.parse(transformed);
}

/**
 * Fetch a single delivery detail (enriched with items, notes, tracking events).
 */
export async function getDeliveryDetail(
  agencyId: string,
  shipmentId: string,
): Promise<DeliveryDetailRow> {
  const raw = await api.get<{ success: boolean; data: z.infer<typeof backendShipmentDetailSchema> }>(
    `agencies/${agencyId}/shipments/${shipmentId}`,
  );
  const shipment = backendShipmentDetailSchema.parse(raw.data);
  return _transformShipmentDetail(shipment);
}

/**
 * Add an internal note to a shipment.
 */
export async function addShipmentNote(
  agencyId: string,
  shipmentId: string,
  memo: string,
): Promise<{ id: string; memo: string; noted_at: string; author: string }> {
  const raw = await api.post<{ success: boolean; data: { id: string; memo: string; noted_at: string; author: string } }>(
    `agencies/${agencyId}/shipments/${shipmentId}/notes`,
    { memo },
  );
  return raw.data;
}

/**
 * Assign a courier to a shipment.
 */
export async function assignCourier(
  agencyId: string,
  shipmentId: string,
  courierId: string,
): Promise<DeliveryRow> {
  const raw = await api.post<{ success: boolean; data: z.infer<typeof backendShipmentSchema> }>(
    `agencies/${agencyId}/shipments/${shipmentId}/assign`,
    { courier_id: courierId },
  );
  const shipment = backendShipmentSchema.parse(raw.data);
  return _transformShipment(shipment);
}

/**
 * Update shipment status.
 */
export async function updateDeliveryStatus(
  agencyId: string,
  shipmentId: string,
  status: string,
  memo?: string,
): Promise<DeliveryRow> {
  const raw = await api.post<{ success: boolean; data: z.infer<typeof backendShipmentSchema> }>(
    `agencies/${agencyId}/shipments/${shipmentId}/status`,
    { status, memo },
  );
  const shipment = backendShipmentSchema.parse(raw.data);
  return _transformShipment(shipment);
}

/**
 * Bulk assign courier to multiple shipments.
 */
export async function bulkAssign(
  agencyId: string,
  shipmentIds: string[],
  courierId: string,
): Promise<{ updated_count: number }> {
  const raw = await api.post<{ success: boolean; data: { updated_count: number } }>(
    `agencies/${agencyId}/shipments/bulk-assign`,
    { shipment_ids: shipmentIds, courier_id: courierId },
  );
  return raw.data;
}

/**
 * Bulk update status for multiple shipments.
 */
export async function bulkStatus(
  agencyId: string,
  shipmentIds: string[],
  status: string,
): Promise<{ updated_count: number }> {
  const raw = await api.post<{ success: boolean; data: { updated_count: number } }>(
    `agencies/${agencyId}/shipments/bulk-status`,
    { shipment_ids: shipmentIds, status },
  );
  return raw.data;
}

/**
 * Export deliveries (returns a download URL / triggers download).
 */
export function getExportUrl(agencyId: string): string {
  return `agencies/${agencyId}/shipments/export`;
}

// ============================================================
// Available Couriers (for delivery wizard step 3)
// ============================================================

import type { AvailableDriver } from "@/app/(agency)/agency/deliveries/new/_components/types";

const backendCourierListItemSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  vehicle_type: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  total_deliveries: z.number().nullable().optional(),
  completed_deliveries: z.number().nullable().optional(),
  rating_avg: z.union([z.number(), z.string()]).nullable().optional(),
  rating_count: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    phone_e164: z.string().nullable().optional(),
  }).nullable().optional(),
});

const backendCouriersResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    couriers: z.array(backendCourierListItemSchema),
    pagination: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number(),
      total: z.number(),
    }),
  }),
});

function _transformCourierToAvailableDriver(
  raw: z.infer<typeof backendCourierListItemSchema>,
): AvailableDriver {
  const name = raw.user?.name ?? "Livreur";
  const isActive = raw.is_active ?? false;
  const ratingRaw = raw.rating_avg;
  const rating = typeof ratingRaw === "string" ? parseFloat(ratingRaw) || 0 : (ratingRaw ?? 0);

  return {
    id: raw.user_id,
    name,
    initials: getInitials(name),
    avatarColor: getAvatarColor(raw.user_id),
    vehicle: raw.vehicle_type ?? "moto",
    rating,
    totalDeliveries: raw.total_deliveries ?? 0,
    online: isActive,
    available: isActive && raw.status !== "suspended",
    currentLoad: undefined,
  };
}

export async function getAvailableCouriers(
  agencyId: string,
  filters?: { search?: string },
): Promise<AvailableDriver[]> {
  const params: Record<string, string | number | boolean | undefined> = {
    per_page: 50,
  };
  if (filters?.search) params.search = filters.search;

  const raw = await api.get<z.infer<typeof backendCouriersResponseSchema>>(
    `agencies/${agencyId}/couriers`,
    { params },
  );

  const validated = backendCouriersResponseSchema.parse(raw);
  return validated.data.couriers.map(_transformCourierToAvailableDriver);
}

// ============================================================
// Create Delivery (manual shipment from agency wizard)
// ============================================================

export interface CreateDeliveryPayload {
  order_id?: string;
  vendor_name: string;
  items_count: number;
  order_total: number;
  payment_status: "paid" | "pending";
  order_notes?: string;
  pickup_address: string;
  pickup_phone?: string;
  delivery_address: string;
  delivery_phone?: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  delivery_instructions?: string;
  courier_id?: string;
  priority: number;
  shipping_amount: number;
  payment_method: string;
  delivery_date?: string;
  time_slot_from?: string;
  time_slot_to?: string;
}

export async function createDelivery(
  agencyId: string,
  data: CreateDeliveryPayload,
): Promise<DeliveryRow> {
  const raw = await api.post<{
    success: boolean;
    data: z.infer<typeof backendShipmentSchema>;
  }>(`agencies/${agencyId}/shipments`, data);
  const shipment = backendShipmentSchema.parse(raw.data);
  return _transformShipment(shipment);
}
