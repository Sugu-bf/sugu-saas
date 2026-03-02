import { z } from "zod";
import { api } from "@/lib/http/client";
import {
  agencyDashboardSchema,
  agencyDeliveriesResponseSchema,
  agencyDriversResponseSchema,
  driverProfileSchema,
  agencyStatsResponseSchema,
  agencySettingsResponseSchema,
  type AgencyDashboardData,
  type AgencyDeliveriesResponse,
  type AgencyDriversResponse,
  type DriverProfile,
  type AgencyStatsResponse,
  type AgencySettingsResponse,
  type DeliveryStatus,
  type DeliveryPriority,
  type DeliveryRow,
  type DeliveryDetailRow,
  type DeliveryTimelineStep,
} from "./schema";
import { mockAgencyDashboard } from "./mocks/dashboard";
import { mockAgencyDeliveries } from "./mocks/deliveries";
import { mockAgencyDrivers } from "./mocks/drivers";
import { mockDriverProfile } from "./mocks/driver-profile";
import { mockAgencyStats } from "./mocks/statistics";

// ============================================================
// Agency Domain — Service Layer
// Dashboard: REAL API.  Deliveries: REAL API.  Others: mock.
// ============================================================

// ── Backend response schemas (validation) ──────────────────

const backendKpisSchema = z.object({
  deliveriesToday: z.number(),
  deliveriesYesterday: z.number(),
  successRate: z.number(),
  successRateTarget: z.number().optional().default(95),
  avgDeliveryMinutes: z.number(),
  revenueToday: z.number(),           // centimes
  revenueGrowthPercent: z.number(),
});

const backendCourierSchema = z.object({
  id: z.string(),
  name: z.string(),
}).nullable();

const backendActiveDeliverySchema = z.object({
  id: z.string(),
  order_id: z.string().nullable(),
  courier: backendCourierSchema,
  pickup_address: z.string(),
  delivery_address: z.string(),
  status: z.string(),
  created_at: z.string().nullable(),
  estimated_delivery_at: z.string().nullable(),
});

const backendDriverPerfSchema = z.object({
  courier_id: z.string(),
  name: z.string(),
  total_deliveries: z.number(),
  completed_deliveries: z.number(),
  success_rate: z.number(),
});

const backendComplaintSchema = z.object({
  id: z.string(),
  subject: z.string(),
  reference: z.string().nullable(),
  created_at: z.string().nullable(),
  priority: z.string(),
});

const backendDashboardResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    agencyName: z.string(),
    managerName: z.string(),
    kpis: backendKpisSchema,
    activeDeliveries: z.array(backendActiveDeliverySchema),
    driverPerformance: z.array(backendDriverPerfSchema),
    recentComplaints: z.array(backendComplaintSchema),
  }),
});

type BackendDashboardData = z.infer<typeof backendDashboardResponseSchema>["data"];

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
});

// ── Backend detail schema (extends base with detail-specific fields) ──

const backendOrderItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit_price: z.number(),
  image: z.string().nullable().optional(),
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

// ── Transformer helpers ────────────────────────────────────

/** Get initials from a full name: "Moussa Traoré" → "MT" */
function _getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/** Deterministic avatar color from a string (index-based cycle) */
const AVATAR_COLORS = [
  "bg-sugu-100 text-sugu-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700",
  "bg-teal-100 text-teal-700",
];

function _getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Format minutes into human-readable: 155 → "2h 35", 45 → "45" */
function _formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return String(m);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

/** Format centimes amount to display: 48520000 → "485,200" (FCFA is added as subValue) */
function _formatCurrency(centimes: number): string {
  const amount = Math.round(centimes / 100);
  return amount.toLocaleString("fr-FR");
}

/** Map backend ShipmentStatus → frontend DeliveryStatus */
function _mapShipmentStatus(backendStatus: string): DeliveryStatus {
  const map: Record<string, DeliveryStatus> = {
    pending: "pending",
    assigned: "pickup",
    in_transit: "en_route",
    delivered: "delivered",
    delivery_failed: "returned",
  };
  return map[backendStatus] ?? "pending";
}

/** Map backend status → French label */
function _mapShipmentStatusLabel(backendStatus: string): string {
  const map: Record<string, string> = {
    pending: "En attente",
    assigned: "Ramassage",
    in_transit: "En route",
    delivered: "Livré",
    delivery_failed: "Échoué",
  };
  return map[backendStatus] ?? "En attente";
}

/** Check if ETA is overdue → delayed */
function _isDelayed(backendStatus: string, eta: string | null | undefined): boolean {
  if (backendStatus !== "in_transit" || !eta) return false;
  try {
    return new Date(eta).getTime() < Date.now();
  } catch {
    return false;
  }
}

/** Map frontend status from backend status + ETA check */
function _mapShipmentStatusWithDelay(backendStatus: string, eta: string | null | undefined): DeliveryStatus {
  if (_isDelayed(backendStatus, eta)) return "delayed";
  return _mapShipmentStatus(backendStatus);
}

/** Map frontend status label with delayed check */
function _mapStatusLabelWithDelay(backendStatus: string, eta: string | null | undefined): string {
  if (_isDelayed(backendStatus, eta)) return "Retard";
  return _mapShipmentStatusLabel(backendStatus);
}

/** Map priority int → enum */
function _mapPriority(priorityInt: number | null | undefined): DeliveryPriority {
  const p = priorityInt ?? 100;
  if (p <= 30) return "urgent";
  if (p <= 100) return "normal";
  return "low";
}

/** Calculate ETA display string */
function _calculateEta(estimatedAt: string | null | undefined): string {
  if (!estimatedAt) return "N/A";
  try {
    const eta = new Date(estimatedAt);
    const now = new Date();
    const diffMs = eta.getTime() - now.getTime();

    if (diffMs <= 0) return "Arrivé";

    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h ${m}m`;
  } catch {
    return "N/A";
  }
}

/** Format ISO date → "DD.MM.YYYY HH:mm" */
function _formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

/** Format time from ISO → "HH:mm" */
function _formatTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

/** Format ISO date → long French: "01 Mars 2026, 18:15" */
function _formatDateLong(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const months = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}

/** Build timeline from backend shipment status */
function _buildTimeline(backendStatus: string): DeliveryTimelineStep[] {
  const steps = [
    { id: "t1", label: "Commande reçue", statusIdx: 0 },
    { id: "t2", label: "Livreur assigné", statusIdx: 1 },
    { id: "t3", label: "Ramassage effectué", statusIdx: 2 },
    { id: "t4", label: "En route vers le client", statusIdx: 2 },
    { id: "t5", label: "Livré", statusIdx: 3 },
  ];
  const statusOrder = ["pending", "assigned", "in_transit", "delivered"];
  const currentIdx = statusOrder.indexOf(backendStatus);
  // delivery_failed → treat as after in_transit for timeline
  const effectiveIdx = backendStatus === "delivery_failed" ? 2 : currentIdx;

  return steps.map((step, i) => ({
    id: step.id,
    label: step.label,
    done: i <= effectiveIdx,
    current: i === effectiveIdx,
  }));
}

// ── Shipment transformer: Backend → Frontend DeliveryRow ───

function _transformShipment(raw: z.infer<typeof backendShipmentSchema>): DeliveryRow {
  const order = raw.order;
  const courier = raw.courier;
  const shippingAddr = order?.shipping_address;
  const store = order?.store;
  const status = _mapShipmentStatusWithDelay(raw.status, raw.eta);
  const priority = _mapPriority(raw.priority);
  const clientName = shippingAddr?.name ?? "Client";

  return {
    id: String(raw.id),
    orderId: `#${order?.order_number ?? raw.id}`,
    client: {
      name: clientName,
      phone: shippingAddr?.phone ?? "",
      initials: _getInitials(clientName),
      avatarColor: _getAvatarColor(String(raw.id)),
      address: [shippingAddr?.line1, shippingAddr?.city].filter(Boolean).join(", "),
      note: order?.delivery_notes ?? "",
    },
    driver: courier
      ? {
          id: String(courier.id),
          name: courier.name,
          initials: _getInitials(courier.name),
          avatarColor: _getAvatarColor(String(courier.id)),
          vehicle: courier.vehicle_type ?? "moto",
          rating: courier.average_rating ?? 0,
          online: courier.is_available ?? false,
        }
      : null,
    itinerary: {
      from: store?.address_line1 ?? store?.name ?? "Vendeur",
      to: shippingAddr?.line1 ?? "Destination",
      distanceKm: 1, // Placeholder — no GPS distance calculation
      fromTime: _formatTime(raw.created_at),
    },
    priority,
    status,
    statusLabel: _mapStatusLabelWithDelay(raw.status, raw.eta),
    eta: _calculateEta(raw.eta),
    vendor: store?.name ?? "Vendeur",
    vendorUrl: "#",
    orderItems: raw.items_count ?? order?.items_count ?? 0,
    orderTotal: (order?.total ?? 0) / 100,
    orderPayment: order?.payment_status === "paid" ? "paid" : "pending",
    timeline: _buildTimeline(raw.status),
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
    orderDate: _formatDateLong(order?.created_at ?? raw.created_at),
    driverPhone: raw.courier_phone ?? null,
    statusUpdatedAt: raw.status_updated_at ?? null,
    orderItemsList: (order?.items ?? []).map((item) => ({
      name: item.name,
      qty: item.qty,
      unit_price: item.unit_price,
      image: item.image ?? null,
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
  };
}

// ── Transformer: Backend dashboard → Frontend schema ───────

function _transformDashboard(raw: BackendDashboardData): AgencyDashboardData {
  const kpis = raw.kpis;

  return {
    agencyName: raw.agencyName,
    managerName: raw.managerName,
    kpis: [
      {
        id: "deliveries-today",
        label: "Livraisons aujourd'hui",
        value: String(kpis.deliveriesToday),
        icon: "truck",
        gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
        iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
      },
      {
        id: "success-rate",
        label: "Taux de réussite",
        value: String(kpis.successRate),
        subValue: "%",
        icon: "check-circle",
        gradient: "from-green-50 via-emerald-50/60 to-teal-50/40",
        iconBg: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
        ringPercent: kpis.successRate,
      },
      {
        id: "avg-time",
        label: "Temps moyen",
        value: _formatMinutes(kpis.avgDeliveryMinutes),
        subValue: "min",
        icon: "clock",
        gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40",
        iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
      },
      {
        id: "revenue-today",
        label: "Revenus du jour",
        value: _formatCurrency(kpis.revenueToday),
        subValue: "FCFA",
        badge:
          kpis.revenueGrowthPercent !== 0
            ? `↗ +${kpis.revenueGrowthPercent}%`
            : undefined,
        badgeColor: "text-green-600 bg-green-50",
        icon: "banknote",
        gradient: "from-emerald-50 via-green-50/60 to-lime-50/40",
        iconBg: "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
      },
    ],
    activeDeliveries: raw.activeDeliveries.map((d) => ({
      id: d.id,
      orderId: d.order_id ? `#${d.order_id}` : "#—",
      driver: {
        name: d.courier?.name ?? "Non assigné",
        initials: _getInitials(d.courier?.name ?? "NA"),
        avatarColor: _getAvatarColor(d.courier?.id ?? d.id),
      },
      routeAddresses: `${d.pickup_address} → ${d.delivery_address}`,
      status: _mapShipmentStatus(d.status),
      statusLabel: _mapShipmentStatusLabel(d.status),
      eta: _calculateEta(d.estimated_delivery_at),
    })),
    driverPerformance: raw.driverPerformance.map((d) => ({
      id: d.courier_id,
      name: d.name,
      initials: _getInitials(d.name),
      avatarColor: _getAvatarColor(d.courier_id),
      score: d.success_rate,
    })),
    complaints: raw.recentComplaints.map((c) => ({
      id: c.id,
      title: `${c.subject}${c.reference ? ` - ID ${c.reference}` : ""}`,
      refId: c.reference ?? `#${c.id.slice(0, 8)}`,
      date: _formatDate(c.created_at),
      severity:
        c.priority === "high" || c.priority === "urgent" ? "urgent" : "normal",
    })),
    // Map pins: generated from real active deliveries.
    // Since backend doesn't provide GPS coords yet, we distribute pins
    // deterministically around a center point based on the shipment ID.
    mapPins: raw.activeDeliveries.map((d) => {
      // Deterministic pseudo-random offset from shipment ID
      let hash = 0;
      for (let c = 0; c < d.id.length; c++) {
        hash = ((hash << 5) - hash + d.id.charCodeAt(c)) | 0;
      }
      const latOffset = ((hash % 100) / 100) * 0.08 - 0.04;
      const lngOffset = (((hash >> 8) % 100) / 100) * 0.08 - 0.04;

      return {
        id: d.id,
        lat: 12.3714 + latOffset,   // ~Ouagadougou center
        lng: -1.5197 + lngOffset,
        status: _mapShipmentStatus(d.status),
      };
    }),
  };
}

// ============================================================
// Public service functions
// ============================================================

/**
 * Fetch the agency dashboard data from the real API.
 *
 * @param agencyId — The delivery partner ULID
 */
export async function getAgencyDashboard(
  agencyId?: string,
): Promise<AgencyDashboardData> {
  // Fallback to mock if no agencyId (dev/design preview)
  if (!agencyId) {
    console.info("[agency/dashboard] No agencyId — using mock data");
    return agencyDashboardSchema.parse(mockAgencyDashboard);
  }

  try {
    const raw = await api.get<z.infer<typeof backendDashboardResponseSchema>>(
      `agencies/${agencyId}/dashboard`,
    );

    // Validate the raw backend response
    const validated = backendDashboardResponseSchema.parse(raw);

    // Transform backend shape → frontend schema
    const transformed = _transformDashboard(validated.data);

    // Validate final shape against the strict frontend schema
    return agencyDashboardSchema.parse(transformed);
  } catch (error) {
    console.error("[agency/dashboard] API error — falling back to mock:", error);
    // Graceful degradation: show mock data if API fails
    return agencyDashboardSchema.parse(mockAgencyDashboard);
  }
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
 *
 * @param agencyId — The delivery partner ULID
 * @param filters  — Optional filters (status, search, courier_id, date, priority, sort, per_page, page)
 */
export async function getAgencyDeliveries(
  agencyId?: string,
  filters?: DeliveryFilters,
): Promise<AgencyDeliveriesResponse> {
  // Fallback to mock if no agencyId (dev/design preview)
  if (!agencyId) {
    console.info("[agency/deliveries] No agencyId — using mock data");
    return agencyDeliveriesResponseSchema.parse(mockAgencyDeliveries);
  }

  try {
    // Build query params (strip undefined values)
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

    // Validate raw backend response
    const validated = backendShipmentsResponseSchema.parse(raw);
    const d = validated.data;

    // Transform backend status counts → frontend status counts
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

    // Validate final shape
    return agencyDeliveriesResponseSchema.parse(transformed);
  } catch (error) {
    console.error("[agency/deliveries] API error — falling back to mock:", error);
    return agencyDeliveriesResponseSchema.parse(mockAgencyDeliveries);
  }
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
// Drivers — Backend schemas, transformers, API calls
// ============================================================

// ── Backend courier response schemas ───────────────────────

const backendCourierCardSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  employee_id: z.string().nullable().optional(),
  vehicle_type: z.string().nullable().optional(),
  vehicle_plate: z.string().nullable().optional(),
  phone_e164: z.string().nullable().optional(),
  emergency_contact_name: z.string().nullable().optional(),
  emergency_contact_phone: z.string().nullable().optional(),
  status: z.string(), // "active" | "inactive" | "pending_kyc" | "suspended"
  is_active: z.boolean(),
  kyc_verified: z.boolean(),
  total_deliveries: z.number().nullable().optional(),
  completed_deliveries: z.number().nullable().optional(),
  failed_deliveries: z.number().nullable().optional(),
  rating_avg: z.union([z.number(), z.string()]).nullable().optional(),
  rating_count: z.number().nullable().optional(),
  hired_at: z.string().nullable().optional(),
  last_delivery_at: z.string().nullable().optional(),
  suspended_until: z.string().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable().optional(),
    phone_e164: z.string().nullable().optional(),
  }),
  branch: z.object({
    id: z.string(),
    name: z.string(),
  }).nullable().optional(),
  kyc_documents: z.array(z.object({
    id: z.string(),
    document_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    file_path: z.string().nullable().optional(),
    verified_at: z.string().nullable().optional(),
  })).optional().default([]),
});

type BackendCourierCard = z.infer<typeof backendCourierCardSchema>;

const backendDriversListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    couriers: z.array(backendCourierCardSchema),
    pagination: z.object({
      current_page: z.number(),
      last_page: z.number(),
      per_page: z.number(),
      total: z.number(),
    }),
  }),
});

const backendCourierDetailResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    courier: backendCourierCardSchema,
    stats: z.object({
      total_deliveries: z.number(),
      completed_deliveries: z.number(),
      failed_deliveries: z.number(),
      success_rate: z.number(),
      rating_avg: z.union([z.number(), z.string()]).nullable().optional(),
      rating_count: z.number(),
      kyc_verified: z.boolean(),
      kyc_documents_count: z.number().optional().default(0),
      approved_documents_count: z.number().optional().default(0),
    }),
  }),
});

// ── Driver transformer helpers ─────────────────────────────

/** Map backend courier status → frontend DriverStatusVal */
function _mapCourierStatus(status: string, isActive: boolean): "online" | "offline" | "suspended" {
  if (status === "suspended") return "suspended";
  if (status === "active" && isActive) return "online";
  return "offline";
}

/** Parse a rating that might be a string or number */
function _parseRating(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "string") return parseFloat(val) || 0;
  return val;
}

/** Format a relative date string from ISO date */
function _formatRelativeDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `il y a ${diffDays}j`;
    const diffMonths = Math.floor(diffDays / 30);
    return `il y a ${diffMonths} mois`;
  } catch {
    return "—";
  }
}

/** Format hired_at → seniority string ("8 mois", "1 an 3 mois") */
function _computeSeniority(hiredAt: string | null | undefined): { seniority: string; seniorityDetail: string } {
  if (!hiredAt) return { seniority: "—", seniorityDetail: "—" };
  try {
    const d = new Date(hiredAt);
    const now = new Date();
    const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const frMonths = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const seniorityDetail = `depuis ${frMonths[d.getMonth()]} ${d.getFullYear()}`;
    if (months < 1) return { seniority: "< 1 mois", seniorityDetail };
    if (months < 12) return { seniority: `${months} mois`, seniorityDetail };
    const years = Math.floor(months / 12);
    const rem = months % 12;
    const label = years === 1 ? "1 an" : `${years} ans`;
    return { seniority: rem > 0 ? `${label} ${rem} mois` : label, seniorityDetail };
  } catch {
    return { seniority: "—", seniorityDetail: "—" };
  }
}

/** Format hired_at → French date ("19 Juin 2025") */
function _formatFrenchDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  try {
    const d = new Date(isoDate);
    const frMonths = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return `${d.getDate()} ${frMonths[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return "—";
  }
}

/** Map a vehicle_type string to a valid VehicleType enum value */
function _mapVehicleType(vt: string | null | undefined): "moto" | "voiture" | "vélo" | "tricycle" {
  const val = (vt ?? "moto").toLowerCase();
  if (val === "moto" || val === "voiture" || val === "vélo" || val === "tricycle") return val;
  if (val === "car" || val === "auto") return "voiture";
  if (val === "bike" || val === "bicycle") return "vélo";
  return "moto";
}

/** Transform a backend courier → frontend DriverCard */
function _transformCourierToCard(
  raw: BackendCourierCard,
  rankIndex: number,
): z.infer<typeof import("./schema").driverCardSchema> {
  const name = raw.user.name;
  const totalDel = raw.total_deliveries ?? 0;
  const completedDel = raw.completed_deliveries ?? 0;
  const successRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 100) : 0;
  const rating = _parseRating(raw.rating_avg);
  const frontendStatus = _mapCourierStatus(raw.status, raw.is_active);

  return {
    id: String(raw.id),
    name,
    phone: raw.user.phone_e164 ?? raw.phone_e164 ?? "",
    email: raw.user.email ?? "",
    initials: _getInitials(name),
    avatarColor: _getAvatarColor(String(raw.id)),
    avatarUrl: null,
    rank: rankIndex === 0 ? 1 : null,
    status: frontendStatus,
    vehicle: _mapVehicleType(raw.vehicle_type),
    totalDeliveries: totalDel,
    rating,
    ratingLabel: "note",
    todayDeliveries: 0, // Not available from index endpoint
    successRate,
    currentActivityLabel: null, // Not available from index endpoint
    warningLabel: successRate > 0 && successRate < 95 ? "Warning" : null,
    lastSeen: raw.last_delivery_at && frontendStatus === "offline"
      ? _formatRelativeDate(raw.last_delivery_at)
      : null,
  };
}

/** Transform a backend courier → frontend DriverDetail (side panel) */
function _transformCourierToDetail(
  raw: BackendCourierCard,
  rankIndex: number,
): z.infer<typeof import("./schema").driverDetailSchema> {
  const name = raw.user.name;
  const totalDel = raw.total_deliveries ?? 0;
  const completedDel = raw.completed_deliveries ?? 0;
  const successRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 100) : 0;
  const rating = _parseRating(raw.rating_avg);
  const frontendStatus = _mapCourierStatus(raw.status, raw.is_active);

  return {
    id: String(raw.id),
    name,
    phone: raw.user.phone_e164 ?? raw.phone_e164 ?? "",
    email: raw.user.email ?? "",
    initials: _getInitials(name),
    avatarColor: _getAvatarColor(String(raw.id)),
    avatarUrl: null,
    rank: rankIndex === 0 ? 1 : null,
    status: frontendStatus,
    age: "—",
    quartier: "—",
    vehicle: _mapVehicleType(raw.vehicle_type),
    vehicleId: raw.vehicle_plate ?? "—",
    permis: raw.kyc_verified ? "Vérifié" : "—",
    joinedDate: _formatFrenchDate(raw.hired_at),
    verified: raw.kyc_verified,
    totalDeliveries: totalDel,
    successRate,
    rating,
    avgTime: "—",
    monthlyProgress: Math.min(totalDel > 0 ? Math.round((completedDel / Math.max(totalDel, 1)) * 100) : 0, 100),
    todayDeliveries: 0,
    todayCompleted: 0,
    todayFailed: 0,
    todayRevenue: "—",
    todayHours: "—",
    recentDeliveries: [],
  };
}

/** Full transformers: backend couriers list → frontend AgencyDriversResponse */
function _transformCouriersListResponse(
  validated: z.infer<typeof backendDriversListResponseSchema>,
): AgencyDriversResponse {
  const couriers = validated.data.couriers;

  // Sort by total_deliveries desc to determine rank
  const sorted = [...couriers].sort(
    (a, b) => (b.total_deliveries ?? 0) - (a.total_deliveries ?? 0),
  );

  // Build driver cards
  const drivers = sorted.map((c, i) => _transformCourierToCard(c, i));

  // Compute summary aggregates
  const totalDrivers = validated.data.pagination.total;
  const activeCount = couriers.filter(c => c.status === "active" && c.is_active).length;
  const offlineCount = couriers.filter(c => c.status === "inactive" || (!c.is_active && c.status !== "suspended")).length;
  const suspendedCount = couriers.filter(c => c.status === "suspended").length;

  const ratings = couriers.map(c => _parseRating(c.rating_avg)).filter(r => r > 0);
  const averageRating = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  const totalReviews = couriers.reduce((sum, c) => sum + (c.rating_count ?? 0), 0);

  const totalDel = couriers.reduce((sum, c) => sum + (c.total_deliveries ?? 0), 0);
  const completedDel = couriers.reduce((sum, c) => sum + (c.completed_deliveries ?? 0), 0);
  const aggregateSuccessRate = totalDel > 0 ? Math.round((completedDel / totalDel) * 1000) / 10 : 0;

  // Build detail for the first driver
  const firstCourier = sorted[0];
  const driverDetail = firstCourier
    ? _transformCourierToDetail(firstCourier, 0)
    : mockAgencyDrivers.driverDetail;

  return {
    summary: {
      totalDrivers,
      activeDrivers: activeCount,
      inProgressDeliveries: 0, // Not available from index endpoint
      averageRating,
      totalReviews,
      successRate: aggregateSuccessRate,
      successTarget: 95,
    },
    drivers,
    statusCounts: {
      all: totalDrivers,
      online: activeCount,
      offline: offlineCount,
      suspended: suspendedCount,
    },
    driverDetail,
    lastUpdated: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Transform backend courier detail → frontend DriverProfile */
function _transformCourierToProfile(
  courier: BackendCourierCard,
  stats: z.infer<typeof backendCourierDetailResponseSchema>["data"]["stats"],
): DriverProfile {
  const name = courier.user.name;
  const frontendStatus = _mapCourierStatus(courier.status, courier.is_active);
  const rating = _parseRating(stats.rating_avg);
  const { seniority, seniorityDetail } = _computeSeniority(courier.hired_at);
  const emergencyParts = [courier.emergency_contact_name, courier.emergency_contact_phone].filter(Boolean);

  // Map KYC documents
  const documents = courier.kyc_documents.map((doc, i) => ({
    id: doc.id ?? `doc-${i}`,
    label: doc.document_type ?? `Document ${i + 1}`,
    value: doc.status === "approved" ? "Vérifié" : doc.status === "pending" ? "En attente" : (doc.status ?? "—"),
    status: doc.status === "approved" || doc.verified_at
      ? "verified" as const
      : doc.status === "rejected"
        ? "expired" as const
        : "pending" as const,
  }));

  const docsApproved = stats.approved_documents_count;
  const docsTotal = stats.kyc_documents_count;
  const documentsStatus = stats.kyc_verified
    ? "Tous les documents sont vérifiés"
    : `${docsApproved}/${docsTotal} documents approuvés`;

  return {
    id: String(courier.id),
    name,
    initials: _getInitials(name),
    avatarColor: _getAvatarColor(String(courier.id)),
    avatarUrl: null,
    rank: null,
    status: frontendStatus,
    statusSince: frontendStatus === "online" ? "En service" : frontendStatus === "suspended" ? "Suspendu" : "Hors ligne",
    vehicle: _mapVehicleType(courier.vehicle_type),

    // Hero KPIs
    totalDeliveries: stats.total_deliveries,
    monthDeliveries: 0, // Not available from stats endpoint
    successRate: stats.success_rate,
    rating,
    totalReviews: stats.rating_count,
    avgDeliveryTime: "—", // Not available
    avgTimeTarget: "< 3h",
    monthRevenue: "—", // No wallet endpoint
    seniority,
    seniorityDetail,

    // Personal info
    fullName: name,
    phone: courier.user.phone_e164 ?? courier.phone_e164 ?? "",
    email: courier.user.email ?? "",
    dateOfBirth: "—", // Not in model
    address: "—", // Not in model
    emergencyContact: emergencyParts.join(" — ") || "",
    joinedDate: _formatFrenchDate(courier.hired_at),
    addedBy: "—", // Not in API

    // Vehicle & documents
    vehicleType: (courier.vehicle_type ?? "Moto").charAt(0).toUpperCase() + (courier.vehicle_type ?? "moto").slice(1),
    vehicleMake: "—", // Not in model
    licensePlate: courier.vehicle_plate ?? "",
    documents,
    documentsStatus,

    // Performance chart — not available, provide placeholder
    perfBars: [
      { hour: "08", value: 0 }, { hour: "10", value: 0 }, { hour: "12", value: 0 },
      { hour: "14", value: 0 }, { hour: "16", value: 0 }, { hour: "18", value: 0 },
      { hour: "20", value: 0 },
    ],
    perfDeliveries: stats.total_deliveries,
    perfVsLastMonth: "—",
    perfVsTeamAvg: "—",
    perfRank: "—",

    // Revenue — not available
    revTotal: "—",
    revFees: "—",
    revBonus: "—",
    revTips: "—",
    revPaid: "—",
    revPending: "—",
    revNextPayment: "—",

    // Reviews — partial data
    reviewAvg: rating,
    reviewDistribution: [
      { stars: 5, count: Math.round(stats.rating_count * 0.7) },
      { stars: 4, count: Math.round(stats.rating_count * 0.15) },
      { stars: 3, count: Math.round(stats.rating_count * 0.08) },
      { stars: 2, count: Math.round(stats.rating_count * 0.05) },
      { stars: 1, count: Math.round(stats.rating_count * 0.02) },
    ],
    recentReviews: [],

    // Recent deliveries table — not available
    recentDeliveriesTable: [],
    tableTodayTotal: "—",
    tableTodayCount: 0,
    tableAvgPerTeam: 0,
    tableRank: 0,

    // Incidents — not available
    incidentCount: stats.failed_deliveries,
    incidentRate: stats.total_deliveries > 0
      ? Math.round((stats.failed_deliveries / stats.total_deliveries) * 100)
      : 0,
    incidents: [],

    // Footer
    membershipSince: `Membre ${seniorityDetail}`,
  };
}

// ── Drivers API functions ──────────────────────────────────

export interface DriverFilters {
  status?: string;
  search?: string;
  sort_by?: string;
}

/**
 * Fetch the agency drivers list + detail.
 *
 * GET /agencies/{agencyId}/couriers
 */
export async function getAgencyDrivers(
  agencyId?: string,
  filters?: DriverFilters,
): Promise<AgencyDriversResponse> {
  // Fallback to mock if no agencyId (dev/design preview)
  if (!agencyId) {
    console.info("[agency/drivers] No agencyId — using mock data");
    return agencyDriversResponseSchema.parse(mockAgencyDrivers);
  }

  try {
    const params: Record<string, string | number | boolean | undefined> = {
      per_page: 50, // Fetch all couriers for summary computation
    };
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;
    if (filters?.sort_by) params.sort_by = filters.sort_by;

    const raw = await api.get<z.infer<typeof backendDriversListResponseSchema>>(
      `agencies/${agencyId}/couriers`,
      { params },
    );

    const validated = backendDriversListResponseSchema.parse(raw);
    const transformed = _transformCouriersListResponse(validated);
    return agencyDriversResponseSchema.parse(transformed);
  } catch (error) {
    console.error("[agency/drivers] API error — falling back to mock:", error);
    return agencyDriversResponseSchema.parse(mockAgencyDrivers);
  }
}

/**
 * Fetch a single driver's full profile.
 *
 * GET /agencies/{agencyId}/couriers/{courierId}
 */
export async function getDriverProfile(
  agencyId?: string,
  courierId?: string,
): Promise<DriverProfile> {
  if (!agencyId || !courierId) {
    console.info("[agency/driver-profile] No agencyId/courierId — using mock data");
    return driverProfileSchema.parse(mockDriverProfile);
  }

  try {
    const raw = await api.get<z.infer<typeof backendCourierDetailResponseSchema>>(
      `agencies/${agencyId}/couriers/${courierId}`,
    );

    const validated = backendCourierDetailResponseSchema.parse(raw);
    const transformed = _transformCourierToProfile(validated.data.courier, validated.data.stats);
    return driverProfileSchema.parse(transformed);
  } catch (error) {
    console.error("[agency/driver-profile] API error — falling back to mock:", error);
    return driverProfileSchema.parse(mockDriverProfile);
  }
}

/**
 * Fetch detail for a single courier (side panel in drivers list).
 *
 * GET /agencies/{agencyId}/couriers/{courierId}
 * Returns DriverDetail (not the full DriverProfile).
 */
export async function getDriverDetail(
  agencyId: string,
  courierId: string,
): Promise<z.infer<typeof import("./schema").driverDetailSchema>> {
  const raw = await api.get<z.infer<typeof backendCourierDetailResponseSchema>>(
    `agencies/${agencyId}/couriers/${courierId}`,
  );
  const validated = backendCourierDetailResponseSchema.parse(raw);
  const courier = validated.data.courier;

  // Determine rank — not available from single detail, use null
  return _transformCourierToDetail(courier, -1);
}

// ── Driver mutations ───────────────────────────────────────

/**
 * Suspend a courier.
 *
 * POST /agencies/{agencyId}/couriers/{courierId}/suspend
 */
export async function suspendCourier(
  agencyId: string,
  courierId: string,
  reason?: string,
  suspendedUntil?: string,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers/${courierId}/suspend`,
    { reason, suspended_until: suspendedUntil },
  );
}

/**
 * Reactivate a suspended courier.
 *
 * POST /agencies/{agencyId}/couriers/{courierId}/activate
 */
export async function activateCourier(
  agencyId: string,
  courierId: string,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers/${courierId}/activate`,
  );
}

/** Payload for adding a new courier */
export interface AddCourierPayload {
  user_id: string;
  vehicle_type?: string;
  branch_id?: string;
}

/**
 * Add a new courier to the agency.
 *
 * POST /agencies/{agencyId}/couriers
 */
export async function addCourier(
  agencyId: string,
  data: AddCourierPayload,
): Promise<void> {
  await api.post(
    `agencies/${agencyId}/couriers`,
    data,
  );
}

/**
 * Remove/delete a courier from the agency.
 *
 * DELETE /agencies/{agencyId}/couriers/{courierId}
 */
export async function removeCourier(
  agencyId: string,
  courierId: string,
): Promise<void> {
  await api.delete(
    `agencies/${agencyId}/couriers/${courierId}`,
  );
}

/**
 * Fetch the agency statistics.
 *
 * READY FOR API: Replace body with:
 *   const params = new URLSearchParams({ period });
 *   const res = await api.get(`/agency/statistics?${params}`);
 *   return agencyStatsResponseSchema.parse(res);
 */
export async function getAgencyStats(
  _period?: string,
): Promise<AgencyStatsResponse> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return agencyStatsResponseSchema.parse(mockAgencyStats);
}

/**
 * Fetch the agency settings.
 *
 * READY FOR API: Replace body with:
 *   const res = await api.get("/agency/settings");
 *   return agencySettingsResponseSchema.parse(res);
 */
export async function getAgencySettings(): Promise<AgencySettingsResponse> {
  const { mockAgencySettings } = await import("./mocks/settings");
  await new Promise((resolve) => setTimeout(resolve, 100));
  return agencySettingsResponseSchema.parse(mockAgencySettings);
}

// ============================================================
// Available Couriers (for delivery wizard step 3)
// ============================================================

import type { AvailableDriver } from "@/app/(agency)/agency/deliveries/new/_components/types";
import { MOCK_DRIVERS } from "@/app/(agency)/agency/deliveries/new/_components/types";

// ── Backend courier list item schema ──

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

/**
 * Transform a backend courier list item → frontend AvailableDriver.
 *
 * IMPORTANT: We use `user_id` (not `id`) as the driver ID because
 * Shipment.assigned_courier_id references users.id, not delivery_couriers.id.
 */
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
    initials: _getInitials(name),
    avatarColor: _getAvatarColor(raw.user_id),
    vehicle: raw.vehicle_type ?? "moto",
    rating,
    totalDeliveries: raw.total_deliveries ?? 0,
    online: isActive,
    available: isActive && raw.status !== "suspended",
    currentLoad: undefined,
  };
}

/**
 * Fetch available couriers for the delivery wizard.
 *
 * GET /agencies/{agencyId}/couriers
 */
export async function getAvailableCouriers(
  agencyId: string,
  filters?: { search?: string },
): Promise<AvailableDriver[]> {
  if (!agencyId) return MOCK_DRIVERS;

  try {
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
  } catch (error) {
    console.error("[agency/couriers] API error — falling back to mock:", error);
    return MOCK_DRIVERS;
  }
}

// ============================================================
// Create Delivery (manual shipment from agency wizard)
// ============================================================

export interface CreateDeliveryPayload {
  order_id?: string;
  vendor_name: string;
  items_count: number;
  order_total: number;         // In FCFA
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
  courier_id?: string;         // null if "assign later"
  priority: number;            // 10=urgent, 50=normal, 100=low
  shipping_amount: number;     // FCFA
  payment_method: string;
  delivery_date?: string;
  time_slot_from?: string;
  time_slot_to?: string;
}

/**
 * Create a new delivery (manual shipment from agency).
 *
 * POST /agencies/{agencyId}/shipments
 */
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
