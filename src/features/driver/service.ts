import {
  driverDashboardSchema,
  driverDeliveriesResponseSchema,
  type DriverDashboardData,
  type DriverDeliveriesResponse,
  type DriverDeliveryStatus,
  type DriverCodMixte,
} from "./schema";
import { api } from "@/lib/http/client";
import type { ApiSuccessResponse } from "@/types";

// ============================================================
// Driver Domain — Service Layer
// API: GET /v1/courier/dashboard
// ============================================================

export async function getDriverDashboard(): Promise<DriverDashboardData> {
  const response = await api.get<ApiSuccessResponse<Record<string, unknown>>>(
    "courier/dashboard",
  );
  return driverDashboardSchema.parse(
    _transformDashboardResponse(response.data),
  );
}

// ── Transform API response → Zod schema shape ──────────────

interface RawDashboardKpis {
  today_deliveries: { completed: number; assigned: number };
  success_rate: number;
  today_earnings: number;
  avg_time_minutes: number;
}

interface RawCurrentDelivery {
  id: string;
  order_id: string;
  status: string;
  status_label: string;
  priority: string;
  pickup: { name: string; address: string };
  delivery: { name: string; address: string; phone: string };
  progress_percent: number;
  eta_minutes: number;
  item_count: number;
}

interface RawQueuedDelivery {
  id: string;
  order_id: string;
  priority: string;
  route: string;
  item_count: number;
  time_slot: string;
}

interface RawActivityEvent {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
}

interface RawDashboardResponse {
  driver_name: string;
  date: string;
  city: string;
  is_online: boolean;
  kpis: RawDashboardKpis;
  current_delivery: RawCurrentDelivery | null;
  queued_deliveries: RawQueuedDelivery[];
  earnings_chart: Array<{ day: string; value: number }>;
  earnings_total: number;
  earnings_previous: number;
  recent_activity: RawActivityEvent[];
}

/** @internal Maps raw API dashboard response to the Zod schema shape */
function _transformDashboardResponse(raw: Record<string, unknown>): unknown {
  const data = raw as unknown as RawDashboardResponse;

  // --- KPI transformation (raw numbers → display-ready card objects) ---
  const kpis = [
    {
      id: "today-deliveries",
      label: "Livraisons aujourd'hui",
      value: String(data.kpis.today_deliveries.completed),
      subValue: `/ ${data.kpis.today_deliveries.assigned} assignées`,
      icon: "package",
      gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
    {
      id: "success-rate",
      label: "Taux de réussite",
      value: String(data.kpis.success_rate),
      subValue: "%",
      icon: "check-circle",
      gradient: "from-green-50 via-emerald-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
      ringPercent: data.kpis.success_rate,
    },
    {
      id: "today-earnings",
      label: "Gains aujourd'hui",
      value: centsToXofValue(data.kpis.today_earnings),
      subValue: "FCFA",
      icon: "banknote",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    },
    {
      id: "avg-time",
      label: "Temps moyen",
      value: String(data.kpis.avg_time_minutes),
      subValue: "min",
      icon: "timer",
      gradient: "from-blue-50 via-cyan-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white",
    },
  ];

  // --- Activity event: add dotColor based on type ---
  const dotColorMap: Record<string, string> = {
    delivery_completed: "bg-green-500",
    pickup_done: "bg-sugu-500",
    assigned: "bg-blue-500",
    delivery_failed: "bg-red-500",
  };

  return {
    driverName: data.driver_name,
    date: data.date,
    city: data.city,
    isOnline: data.is_online,
    kpis,
    currentDelivery: data.current_delivery
      ? {
          id: data.current_delivery.id,
          orderId: data.current_delivery.order_id,
          status: data.current_delivery.status,
          statusLabel: data.current_delivery.status_label,
          priority: data.current_delivery.priority,
          pickup: data.current_delivery.pickup,
          delivery: data.current_delivery.delivery,
          progressPercent: data.current_delivery.progress_percent,
          etaMinutes: data.current_delivery.eta_minutes,
          itemCount: data.current_delivery.item_count,
        }
      : null,
    queuedDeliveries: data.queued_deliveries.map((qd) => ({
      id: qd.id,
      orderId: qd.order_id,
      priority: qd.priority,
      route: qd.route,
      itemCount: qd.item_count,
      timeSlot: qd.time_slot,
    })),
    earningsChart: data.earnings_chart,
    earningsTotal: data.earnings_total,
    earningsPrevious: data.earnings_previous,
    recentActivity: data.recent_activity.map((act) => ({
      id: act.id,
      type: act.type,
      title: act.title,
      subtitle: act.subtitle,
      time: act.time,
      dotColor: dotColorMap[act.type] ?? "bg-gray-400",
    })),
  };
}

// ============================================================
// Driver — Delivery Service Layer
// API: GET /v1/courier/deliveries
// ============================================================

export interface DriverDeliveryFilters {
  status?: DriverDeliveryStatus;
  search?: string;
}

// ── Internal Transformers ───────────────────────────────────

/** @internal Map backend ShipmentStatus → frontend DriverDeliveryStatus */
function _mapShipmentStatus(backendStatus: string): string {
  const statusMap: Record<string, string> = {
    pending: "to_accept",
    awaiting_fee_payment: "awaiting_fee_payment",
    assigned: "pickup",
    picked_up: "picked_up",
    in_transit: "en_route",
    arrived: "arrived",
    delivered: "delivered",
    delivery_failed: "failed",
  };
  const mapped = statusMap[backendStatus];
  if (mapped === undefined) {
    console.warn(`[driver] unknown backend status: "${backendStatus}" — passed through`);
    return backendStatus;
  }
  return mapped;
}

/** @internal Map frontend status → human-readable label */
function _statusLabel(status: string): string {
  const labels: Record<string, string> = {
    to_accept: "À accepter",
    awaiting_fee_payment: "En attente de paiement frais",
    pickup: "Ramassage",
    picked_up: "Collecté",
    en_route: "En route",
    arrived: "Arrivé au client",
    delivered: "Livré",
    failed: "Échoué",
  };
  return labels[status] ?? status;
}

/** @internal Compute initials from a full name */
function _getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** @internal Avatar color palette */
const AVATAR_COLORS = [
  "bg-purple-100 text-purple-600",
  "bg-blue-100 text-blue-600",
  "bg-emerald-100 text-emerald-600",
  "bg-amber-100 text-amber-600",
  "bg-red-100 text-red-600",
  "bg-indigo-100 text-indigo-600",
  "bg-pink-100 text-pink-600",
] as const;

/** @internal Deterministic avatar color based on name hash */
function _getAvatarColor(name: string): string {
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/**
 * Raw COD Mixte block from the backend (Trou n°3).
 * Wrapper key is snake_case (`cod_mixte`) but inner fields are camelCase.
 * `deliveryFeeAmount` / `productFeeAmount` are RAW CENTIMES.
 * Whole block is `null` for Legacy COD and non-COD orders.
 */
interface RawCodMixte {
  isCodMixte?: boolean;
  currentStep?: string;
  deliveryFeePaid?: boolean;
  productFeePaid?: boolean;
  deliveryFeeAmount?: number;
  productFeeAmount?: number;
  deliveryFeePaidAt?: string | null;
  productFeePaidAt?: string | null;
}

/** @internal Map the backend cod_mixte block → frontend codMixte (centimes preserved). */
function _mapCodMixte(raw: RawCodMixte | null | undefined): DriverCodMixte {
  if (!raw) return null;
  return {
    isCodMixte: Boolean(raw.isCodMixte),
    currentStep: raw.currentStep ?? "awaiting_delivery_payment",
    deliveryFeePaid: Boolean(raw.deliveryFeePaid),
    productFeePaid: Boolean(raw.productFeePaid),
    deliveryFeeAmount: raw.deliveryFeeAmount ?? 0,
    productFeeAmount: raw.productFeeAmount ?? 0,
    deliveryFeePaidAt: raw.deliveryFeePaidAt ?? null,
    productFeePaidAt: raw.productFeePaidAt ?? null,
  };
}

/** Raw API row shape (snake_case) */
interface RawDeliveryRow {
  id: string;
  order_id: string;
  status: string;
  priority?: string;
  pickup: { name: string; address: string };
  delivery: { name: string; address: string };
  client: { name: string; phone: string; address: string; note: string | null };
  distance_km: number;
  duration_min: number;
  from_time?: string | null;
  order_items: number;
  order_total: number;
  order_payment: string;
  amount: number;
  parcel_count: number;
  progress_percent?: number | null;
  eta_minutes?: number | null;
  fail_reason?: string | null;
  time_label: string;
  timeline: Array<{ id: string; label: string; time: string | null; done: boolean; current: boolean }>;
  cod_mixte?: RawCodMixte | null;
}

/** @internal Transform a single API row → DriverDeliveryRow shape */
function _transformDeliveryRow(raw: RawDeliveryRow): unknown {
  const mappedStatus = _mapShipmentStatus(raw.status);
  return {
    id: raw.id,
    orderId: raw.order_id,
    status: mappedStatus,
    statusLabel: _statusLabel(mappedStatus),
    itinerary: {
      pickupName: raw.pickup.name,
      pickupAddress: raw.pickup.address,
      deliveryName: raw.delivery.name,
      deliveryAddress: raw.delivery.address,
      distanceKm: raw.distance_km,
      durationMin: raw.duration_min,
      fromTime: raw.from_time,
    },
    client: {
      name: raw.client.name,
      phone: raw.client.phone,
      address: raw.client.address,
      initials: _getInitials(raw.client.name),
      avatarColor: _getAvatarColor(raw.client.name),
      note: raw.client.note,
    },
    orderItems: raw.order_items,
    orderTotal: raw.order_total,
    orderPayment: raw.order_payment,
    amount: raw.amount,
    parcelCount: raw.parcel_count,
    progressPercent: raw.progress_percent,
    etaMinutes: raw.eta_minutes,
    failReason: raw.fail_reason,
    timeLabel: raw.time_label,
    timeline: raw.timeline,
    codMixte: _mapCodMixte(raw.cod_mixte),
  };
}

/** Raw API deliveries response shape */
interface RawDeliveriesResponse {
  summary: {
    total: number;
    delivered: number;
    in_progress: number;
    failed: number;
  };
  status_counts: {
    all: number;
    to_accept: number;
    en_route: number;
    delivered: number;
    failed: number;
  };
  rows: RawDeliveryRow[];
}

/** @internal Transform full API response → DriverDeliveriesResponse shape */
function _transformDeliveriesResponse(raw: Record<string, unknown>): unknown {
  const data = raw as unknown as RawDeliveriesResponse;
  return {
    summary: {
      total: data.summary.total,
      delivered: data.summary.delivered,
      inProgress: data.summary.in_progress,
      failed: data.summary.failed,
    },
    statusCounts: data.status_counts,
    rows: data.rows.map(_transformDeliveryRow),
  };
}

export async function getDriverDeliveries(
  filters?: DriverDeliveryFilters,
): Promise<DriverDeliveriesResponse> {
  const response = await api.get<ApiSuccessResponse<Record<string, unknown>>>(
    "courier/deliveries",
    {
      params: {
        status: filters?.status,
        search: filters?.search,
      },
    },
  );
  return driverDeliveriesResponseSchema.parse(
    _transformDeliveriesResponse(response.data),
  );
}

// ── Mutation functions ──────────────────────────────────────

export async function acceptDelivery(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/accept`);
}

export async function refuseDelivery(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/refuse`);
}

export async function markDelivered(
  deliveryId: string,
  code: string,
): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/mark-delivered`, {
    json: { code },
  });
}

export async function startTransit(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/start-transit`);
}

export async function markArrived(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/mark-arrived`);
}

export async function signalDelay(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/signal-delay`);
}

export async function markFailed(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/mark-failed`);
}

// ── Mock Delivery Data ──────────────────────────────────────

export const _MOCK_DRIVER_DELIVERIES = [
  {
    id: "drv-del-001",
    orderId: "#LIV-0851",
    status: "to_accept" as const,
    statusLabel: "À accepter",
    itinerary: {
      pickupName: "Boutique Bio",
      pickupAddress: "Rue 12.45, Ouaga 2000",
      deliveryName: "Secteur 30",
      deliveryAddress: "Av. Charles de Gaulle, Secteur 30",
      distanceKm: 4.2,
      durationMin: 18,
      fromTime: "16:45",
    },
    client: {
      name: "Mme Traoré",
      phone: "+22676452389",
      address: "Secteur 30, Ouagadougou",
      initials: "MT",
      avatarColor: "bg-purple-100 text-purple-600",
      note: "Sonner 2 fois, étage 3",
    },
    orderItems: 3,
    orderTotal: 15500,
    orderPayment: "cod" as const,
    amount: 1500,
    parcelCount: 2,
    timeLabel: "Il y a 3 min",
    timeline: [
      { id: "t1", label: "Commande reçue", time: "16:30", done: true, current: false },
      { id: "t2", label: "En attente d'acceptation", time: null, done: false, current: true },
      { id: "t3", label: "Ramassage", time: null, done: false, current: false },
      { id: "t4", label: "Livraison", time: null, done: false, current: false },
    ],
  },
  {
    id: "drv-del-002",
    orderId: "#LIV-0847",
    status: "en_route" as const,
    statusLabel: "En route",
    itinerary: {
      pickupName: "Pharmacie Santé+",
      pickupAddress: "Av. Kwamé N'Krumah",
      deliveryName: "Quartier Cissin",
      deliveryAddress: "Rue 15.20, Cissin",
      distanceKm: 6.5,
      durationMin: 25,
      fromTime: "15:15",
    },
    client: {
      name: "M. Ouédraogo",
      phone: "+22670112233",
      address: "Quartier Cissin, Ouagadougou",
      initials: "MO",
      avatarColor: "bg-blue-100 text-blue-600",
      note: null,
    },
    orderItems: 2,
    orderTotal: 8200,
    orderPayment: "paid" as const,
    amount: 1200,
    parcelCount: 1,
    progressPercent: 65,
    etaMinutes: 8,
    timeLabel: "15:15",
    timeline: [
      { id: "t1", label: "Commande reçue", time: "14:50", done: true, current: false },
      { id: "t2", label: "Acceptée", time: "14:52", done: true, current: false },
      { id: "t3", label: "Collecte effectuée", time: "15:15", done: true, current: false },
      { id: "t4", label: "En route vers client", time: null, done: false, current: true },
    ],
  },
  {
    id: "drv-del-003",
    orderId: "#LIV-0848",
    status: "pickup" as const,
    statusLabel: "Ramassage",
    itinerary: {
      pickupName: "Restaurant Le Sahel",
      pickupAddress: "Zone 1, Ouagadougou",
      deliveryName: "Secteur 15",
      deliveryAddress: "Rue 15.45, Secteur 15",
      distanceKm: 3.1,
      durationMin: 15,
      fromTime: "16:00",
    },
    client: {
      name: "Mme Konaté",
      phone: "+22675889944",
      address: "Secteur 15, Ouagadougou",
      initials: "MK",
      avatarColor: "bg-emerald-100 text-emerald-600",
      note: "Livrer avant 17h svp",
    },
    orderItems: 4,
    orderTotal: 22000,
    orderPayment: "paid" as const,
    amount: 1800,
    parcelCount: 3,
    timeLabel: "16:00",
    timeline: [
      { id: "t1", label: "Commande reçue", time: "15:40", done: true, current: false },
      { id: "t2", label: "Acceptée", time: "15:42", done: true, current: false },
      { id: "t3", label: "Ramassage en cours", time: "16:00", done: false, current: true },
      { id: "t4", label: "Livraison", time: null, done: false, current: false },
    ],
  },
  {
    id: "drv-del-004",
    orderId: "#LIV-0845",
    status: "delivered" as const,
    statusLabel: "Livré",
    itinerary: {
      pickupName: "Boutique Mode",
      pickupAddress: "Av. de la Liberté",
      deliveryName: "Zone 1",
      deliveryAddress: "Rue 1.30, Zone 1",
      distanceKm: 2.8,
      durationMin: 12,
      fromTime: "13:30",
    },
    client: {
      name: "M. Sawadogo",
      phone: "+22678554411",
      address: "Zone 1, Ouagadougou",
      initials: "MS",
      avatarColor: "bg-amber-100 text-amber-600",
      note: null,
    },
    orderItems: 1,
    orderTotal: 35000,
    orderPayment: "paid" as const,
    amount: 1000,
    parcelCount: 1,
    timeLabel: "13:55",
    timeline: [
      { id: "t1", label: "Commande reçue", time: "13:10", done: true, current: false },
      { id: "t2", label: "Acceptée", time: "13:12", done: true, current: false },
      { id: "t3", label: "Collecte effectuée", time: "13:30", done: true, current: false },
      { id: "t4", label: "Livré", time: "13:55", done: true, current: false },
    ],
  },
  {
    id: "drv-del-005",
    orderId: "#LIV-0843",
    status: "failed" as const,
    statusLabel: "Échoué",
    itinerary: {
      pickupName: "Supermarché Marina",
      pickupAddress: "Rond-point des Nations Unies",
      deliveryName: "Paglayiri",
      deliveryAddress: "Secteur 28, Paglayiri",
      distanceKm: 7.1,
      durationMin: 30,
      fromTime: "11:00",
    },
    client: {
      name: "Mme Compaoré",
      phone: "+22672330011",
      address: "Paglayiri, Ouagadougou",
      initials: "MC",
      avatarColor: "bg-red-100 text-red-600",
      note: null,
    },
    orderItems: 5,
    orderTotal: 42000,
    orderPayment: "cod" as const,
    amount: 2000,
    parcelCount: 4,
    failReason: "Client absent",
    timeLabel: "12:10",
    timeline: [
      { id: "t1", label: "Commande reçue", time: "10:30", done: true, current: false },
      { id: "t2", label: "Acceptée", time: "10:32", done: true, current: false },
      { id: "t3", label: "Collecte effectuée", time: "11:00", done: true, current: false },
      { id: "t4", label: "Échec livraison", time: "12:10", done: true, current: false },
    ],
  },
];

// ============================================================
// Driver — Delivery Detail Service Layer
// API: GET /v1/courier/deliveries/{id}
// ============================================================

import type { DriverDeliveryDetail } from "./schema";
import { driverDeliveryDetailSchema } from "./schema";

/** Raw API detail response shape (snake_case) */
interface RawDeliveryDetailResponse {
  id: string;
  order_id: string;
  status: string;
  status_label: string;
  priority: string;
  security_code: string;
  amount: number;
  order_total: number;
  order_payment: string;
  distance_km: number;
  estimated_minutes: number;
  parcel_count: number;
  stops: Array<{
    id: string;
    store_id?: string | null;
    letter: string;
    type: string;
    name: string;
    address: string;
    pickup_code?: string | null;
    products: Array<{
      id: string;
      name: string;
      variant: string | null;
      quantity: number;
      price: number;
      image_url: string | null;
      collected: boolean;
    }>;
    is_completed: boolean;
  }>;
  client: {
    name: string;
    phone: string;
    address: string;
    note: string | null;
    is_regular: boolean;
  };
  timeline: Array<{
    id: string;
    label: string;
    subtitle: string | null;
    time: string | null;
    done: boolean;
    current: boolean;
  }>;
  // D3b — single canonical timeline projection (driver role).
  canonical_timeline?: Array<{
    key: string;
    label: string;
    status: "done" | "current" | "upcoming";
    timestamp: string | null;
    store_id?: string | null;
    actor_type?: string | null;
    description?: string | null;
  }>;
  accepted_at: string | null;
  completed_at: string | null;
  cod_mixte?: RawCodMixte | null;
}

/** @internal Transform API detail response → DriverDeliveryDetail shape */
function _transformDeliveryDetailResponse(raw: Record<string, unknown>): unknown {
  const d = raw as unknown as RawDeliveryDetailResponse;
  const mappedStatus = _mapShipmentStatus(d.status);
  return {
    id: d.id,
    orderId: d.order_id,
    status: mappedStatus,
    statusLabel: _statusLabel(mappedStatus),
    priority: d.priority,
    securityCode: d.security_code,
    amount: d.amount,
    orderTotal: d.order_total,
    orderPayment: d.order_payment,
    distanceKm: d.distance_km,
    estimatedMinutes: d.estimated_minutes,
    parcelCount: d.parcel_count,
    stops: d.stops.map((stop) => ({
      id: stop.id,
      storeId: stop.store_id ?? null,
      letter: stop.letter,
      type: stop.type,
      name: stop.name,
      address: stop.address,
      pickupCode: stop.pickup_code ?? null,
      products: stop.products.map((p) => ({
        id: p.id,
        name: p.name,
        variant: p.variant,
        quantity: p.quantity,
        price: p.price,
        imageUrl: p.image_url,
        collected: p.collected,
      })),
      isCompleted: stop.is_completed,
    })),
    client: {
      name: d.client.name,
      phone: d.client.phone,
      address: d.client.address,
      initials: _getInitials(d.client.name),
      avatarColor: _getAvatarColor(d.client.name),
      note: d.client.note,
      isRegular: d.client.is_regular,
    },
    timeline: d.timeline,
    // D3b — driver detail consumes this; the legacy 4-step `timeline` is no
    // longer the timeline source on the driver detail page.
    canonicalTimeline: d.canonical_timeline ?? [],
    acceptedAt: d.accepted_at,
    completedAt: d.completed_at,
    codMixte: _mapCodMixte(d.cod_mixte),
  };
}

export async function getDriverDeliveryDetail(
  deliveryId: string,
): Promise<DriverDeliveryDetail> {
  const response = await api.get<ApiSuccessResponse<Record<string, unknown>>>(
    `courier/deliveries/${deliveryId}`,
  );
  return driverDeliveryDetailSchema.parse(
    _transformDeliveryDetailResponse(response.data),
  );
}

export async function confirmCollection(
  deliveryId: string,
  productId: string,
  pickupCode?: string,
): Promise<void> {
  // MÉCANISME-A — the boutique's pickup code is verified server-side before the
  // collection is recorded. The courier enters the code the vendor communicates.
  await api.post(
    `courier/deliveries/${deliveryId}/confirm-collection/${productId}`,
    { pickup_code: pickupCode },
  );
}

// ── Mock Delivery Detail Data ───────────────────────────────

export const _MOCK_DELIVERY_DETAIL: DriverDeliveryDetail = {
  id: "del-847",
  orderId: "#LIV-0847",
  status: "en_route",
  statusLabel: "En route",
  priority: "urgent",
  securityCode: "SU-000123",
  amount: 1800,
  orderTotal: 12500,
  orderPayment: "paid",
  distanceKm: 2.8,
  estimatedMinutes: 20,
  parcelCount: 3,
  stops: [
    {
      id: "stop-a",
      letter: "A",
      type: "pickup",
      name: "Moussa Telecom",
      address: "Rue de Kaolack, Ouagadougou",
      isCompleted: true,
      products: [
        {
          id: "prod-1",
          name: "Casque sans fil Premium",
          variant: "Noir · Standard",
          quantity: 1,
          price: 12990,
          imageUrl: null,
          collected: true,
        },
        {
          id: "prod-2",
          name: "Radio fx Premium",
          variant: "Argent · 44mm",
          quantity: 1,
          price: 12990,
          imageUrl: null,
          collected: true,
        },
      ],
    },
    {
      id: "stop-b",
      letter: "B",
      type: "pickup",
      name: "K-Market",
      address: "Villa 42, Rue ME-15, Mermoz",
      isCompleted: false,
      products: [
        {
          id: "prod-3",
          name: "Smart Watch Series 5",
          variant: "Argent · 44mm",
          quantity: 1,
          price: 45000,
          imageUrl: null,
          collected: false,
        },
      ],
    },
    {
      id: "stop-c",
      letter: "C",
      type: "delivery",
      name: "Simpore Watson",
      address: "Cité Keur Gorgui, Villa 234",
      isCompleted: false,
      products: [],
    },
  ],
  client: {
    name: "Simpore Watson",
    phone: "+226 70 00 11 22",
    address: "Cité Keur Gorgui, Villa 234",
    initials: "SW",
    avatarColor: "bg-indigo-100 text-indigo-700",
    note: "Sonner 2 fois. Bâtiment C, 3ème étage.",
    isRegular: true,
  },
  timeline: [
    { id: "tl-1", label: "Livraison acceptée", subtitle: "Aujourd'hui à 13:45", time: "13:45", done: true, current: false },
    { id: "tl-2", label: "Collecte des produits", subtitle: "En cours chez TechStore Pro", time: "14:00", done: true, current: false },
    { id: "tl-3", label: "Colis récupéré", subtitle: "En attente", time: null, done: false, current: true },
    { id: "tl-4", label: "En route vers le client", subtitle: "Prévenez le client de votre arrivée", time: null, done: false, current: false },
    { id: "tl-5", label: "Arrivé chez le client", subtitle: null, time: null, done: false, current: false },
    { id: "tl-6", label: "Livré", subtitle: "Validation client requise", time: null, done: false, current: false },
  ],
  // D3b — canonical timeline projection (driver role).
  canonicalTimeline: [
    { key: "courier_assigned", label: "Livreur assigné", status: "done", timestamp: "2026-03-08T13:45:00Z", store_id: null, actor_type: null, description: null },
    { key: "collected", label: "Collecté", status: "current", timestamp: "2026-03-08T14:00:00Z", store_id: null, actor_type: null, description: null },
    { key: "in_transit", label: "En livraison", status: "upcoming", timestamp: null, store_id: null, actor_type: null, description: null },
    { key: "delivered", label: "Livrée", status: "upcoming", timestamp: null, store_id: null, actor_type: null, description: null },
  ],
  acceptedAt: "2026-03-08T13:45:00",
  completedAt: null,
  codMixte: null,
};

// ============================================================
// Driver — History Service Layer
// API: GET /v1/courier/history
// ============================================================

import type { DriverHistoryResponse, DriverHistoryStatus } from "./schema";
import { driverHistoryResponseSchema } from "./schema";

export interface DriverHistoryFilters {
  status?: DriverHistoryStatus;
  search?: string;
  page?: number;
  period?: "7d" | "30d" | "3m" | "all";
}

// ── Raw API response interfaces (snake_case) ────────────────

interface RawHistoryKpis {
  total_deliveries: number;
  delivered: number;
  delivered_percent: number;
  failed: number;
  failed_percent: number;
  total_earnings: number;
  avg_earnings_per_delivery: number;
}

interface RawHistoryRow {
  id: string;
  order_id: string;
  status: string;
  date: string;
  time: string;
  pickup_name: string;
  delivery_name: string;
  client_name: string;
  parcel_count: number;
  client_note: string | null;
  amount: number;
  duration_minutes: number;
  distance_km: number;
  fail_reason: string | null;
}

interface RawHistoryResponse {
  kpis: RawHistoryKpis;
  status_counts: {
    all: number;
    delivered: number;
    failed: number;
  };
  rows: RawHistoryRow[];
  pagination: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total_items: number;
  };
}

/** Status label mapping */
const HISTORY_STATUS_LABELS: Record<string, string> = {
  delivered: "Livré",
  failed: "Échoué",
  delivery_failed: "Échoué",
};

/** @internal Transform API history response → Zod schema shape */
function _transformHistoryResponse(raw: Record<string, unknown>): unknown {
  const data = raw as unknown as RawHistoryResponse;
  return {
    kpis: {
      totalDeliveries: data.kpis.total_deliveries,
      delivered: data.kpis.delivered,
      deliveredPercent: data.kpis.delivered_percent,
      failed: data.kpis.failed,
      failedPercent: data.kpis.failed_percent,
      totalEarnings: data.kpis.total_earnings,
      avgEarningsPerDelivery: data.kpis.avg_earnings_per_delivery,
    },
    statusCounts: data.status_counts,
    rows: data.rows.map((r) => {
      // Map backend "delivery_failed" → frontend "failed"
      const mappedStatus = r.status === "delivery_failed" ? "failed" : r.status;
      return {
        id: r.id,
        orderId: r.order_id,
        status: mappedStatus,
        statusLabel: HISTORY_STATUS_LABELS[r.status] ?? r.status,
        date: r.date,
        time: r.time,
        pickupName: r.pickup_name,
        deliveryName: r.delivery_name,
        clientName: r.client_name,
        parcelCount: r.parcel_count,
        clientNote: r.client_note,
        amount: r.amount,
        durationMinutes: r.duration_minutes,
        distanceKm: r.distance_km,
        failReason: r.fail_reason,
      };
    }),
    pagination: {
      currentPage: data.pagination.current_page,
      totalPages: data.pagination.total_pages,
      perPage: data.pagination.per_page,
      totalItems: data.pagination.total_items,
    },
  };
}

export async function getDriverHistory(
  filters?: DriverHistoryFilters,
): Promise<DriverHistoryResponse> {
  const response = await api.get<ApiSuccessResponse<Record<string, unknown>>>(
    "courier/history",
    {
      params: {
        status: filters?.status,
        search: filters?.search,
        page: filters?.page,
        period: filters?.period,
      },
    },
  );
  return driverHistoryResponseSchema.parse(
    _transformHistoryResponse(response.data),
  );
}

// ── Mock History Data ──────────────────────────────────────

 
export const _MOCK_HISTORY_ROWS = [
  {
    id: "hist-001",
    orderId: "#LIV-0846",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "Aujourd'hui",
    time: "14:30",
    pickupName: "Moussa Telecom",
    deliveryName: "Plateau, Rue 12",
    clientName: "M. Konaté",
    parcelCount: 1,
    clientNote: null,
    amount: 2500,
    durationMinutes: 25,
    distanceKm: 3.2,
    failReason: null,
  },
  {
    id: "hist-002",
    orderId: "#LIV-0840",
    status: "failed" as const,
    statusLabel: "Annulée",
    date: "Hier",
    time: "13:15",
    pickupName: "K-Market",
    deliveryName: "Ouakam, Cité Comico",
    clientName: "Mme Fall",
    parcelCount: 2,
    clientNote: null,
    amount: 1200,
    durationMinutes: 18,
    distanceKm: 1.8,
    failReason: "Client absent",
  },
  {
    id: "hist-003",
    orderId: "#LIV-0835",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "12 Oct",
    time: "09:45",
    pickupName: "Pharmacie Guigon",
    deliveryName: "Médina, Rue 6",
    clientName: "M. Diop",
    parcelCount: 1,
    clientNote: "Colis fragile",
    amount: 3000,
    durationMinutes: 32,
    distanceKm: 5.1,
    failReason: null,
  },
  {
    id: "hist-004",
    orderId: "#LIV-0830",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "10 Oct",
    time: "18:20",
    pickupName: "Auchan Mermoz",
    deliveryName: "Sacré Coeur 3",
    clientName: "Mme Sy",
    parcelCount: 3,
    clientNote: null,
    amount: 1500,
    durationMinutes: 20,
    distanceKm: 2.5,
    failReason: null,
  },
  {
    id: "hist-005",
    orderId: "#LIV-0825",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "10 Oct",
    time: "15:10",
    pickupName: "TechStore Pro",
    deliveryName: "Almadies, Villa 12",
    clientName: "M. Ba",
    parcelCount: 2,
    clientNote: null,
    amount: 1800,
    durationMinutes: 28,
    distanceKm: 4.2,
    failReason: null,
  },
  {
    id: "hist-006",
    orderId: "#LIV-0820",
    status: "failed" as const,
    statusLabel: "Annulée",
    date: "8 Oct",
    time: "11:30",
    pickupName: "Boutique Bio",
    deliveryName: "Ouaga 2000",
    clientName: "M. Traoré",
    parcelCount: 1,
    clientNote: null,
    amount: 2000,
    durationMinutes: 15,
    distanceKm: 3.0,
    failReason: "Adresse introuvable",
  },
  {
    id: "hist-007",
    orderId: "#LIV-0815",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "7 Oct",
    time: "12:45",
    pickupName: "Restaurant Le Sahel",
    deliveryName: "Secteur 22",
    clientName: "Mme Ouédraogo",
    parcelCount: 4,
    clientNote: null,
    amount: 2200,
    durationMinutes: 35,
    distanceKm: 6.3,
    failReason: null,
  },
  {
    id: "hist-008",
    orderId: "#LIV-0810",
    status: "delivered" as const,
    statusLabel: "Livré",
    date: "5 Oct",
    time: "16:00",
    pickupName: "Marina Market",
    deliveryName: "Cissin",
    clientName: "M. Kaboré",
    parcelCount: 1,
    clientNote: null,
    amount: 1200,
    durationMinutes: 18,
    distanceKm: 2.9,
    failReason: null,
  },
];

// ============================================================
// Amounts of the old dashboard transformer
// ============================================================

const XOF_DISPLAY = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Centimes of the API as a figure in francs, without its unit. */
function centsToXofValue(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return XOF_DISPLAY.format(safe / 100);
}
