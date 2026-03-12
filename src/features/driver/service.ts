import {
  driverDashboardSchema,
  driverDeliveriesResponseSchema,
  type DriverDashboardData,
  type DriverDeliveriesResponse,
  type DriverDeliveryStatus,
} from "./schema";
import { api, apiRequest } from "@/lib/http/client";
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

// ── Mock Data ──────────────────────────────────────────────

 
export const _MOCK_DRIVER_DASHBOARD = {
  driverName: "Ousmane",
  date: "Samedi 8 Mars 2026",
  city: "Ouagadougou",
  isOnline: true,
  kpis: [
    {
      id: "today-deliveries",
      label: "Livraisons aujourd'hui",
      value: "7",
      subValue: "/ 10 assignées",
      badge: "↗ +3",
      badgeColor: "text-green-600 bg-green-50",
      icon: "package",
      gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
    {
      id: "success-rate",
      label: "Taux de réussite",
      value: "94",
      subValue: "%",
      icon: "check-circle",
      gradient: "from-green-50 via-emerald-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
      ringPercent: 94,
    },
    {
      id: "today-earnings",
      label: "Gains aujourd'hui",
      value: "8,750",
      subValue: "FCFA",
      badge: "↗ +15%",
      badgeColor: "text-green-600 bg-green-50",
      icon: "banknote",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    },
    {
      id: "avg-time",
      label: "Temps moyen",
      value: "28",
      subValue: "min",
      badge: "↘ -5min",
      badgeColor: "text-green-600 bg-green-50",
      icon: "timer",
      gradient: "from-blue-50 via-cyan-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white",
    },
  ],
  currentDelivery: {
    id: "del-847",
    orderId: "#LIV-0847",
    status: "en_route" as const,
    statusLabel: "En route",
    priority: "urgent" as const,
    pickup: { name: "Boutique Bio", address: "Rue 12.45, Ouaga 2000" },
    delivery: {
      name: "Mme Traoré",
      address: "Secteur 30, Ouagadougou",
      phone: "+22676452389",
    },
    progressPercent: 65,
    etaMinutes: 12,
    itemCount: 2,
  },
  queuedDeliveries: [
    {
      id: "del-848",
      orderId: "#LIV-0848",
      priority: "normal" as const,
      route: "Pharmacie Santé+ → Quartier Cissin",
      itemCount: 2,
      timeSlot: "14h30 - 15h00",
    },
    {
      id: "del-849",
      orderId: "#LIV-0849",
      priority: "normal" as const,
      route: "Boutique Mode → Zone 1, Ouaga",
      itemCount: 1,
      timeSlot: "15h15 - 15h45",
    },
    {
      id: "del-850",
      orderId: "#LIV-0850",
      priority: "urgent" as const,
      route: "Restaurant Le Sahel → Secteur 15",
      itemCount: 3,
      timeSlot: "15h30 - 16h00",
    },
  ],
  earningsChart: [
    { day: "Lun", value: 5500 },
    { day: "Mar", value: 7200 },
    { day: "Mer", value: 4800 },
    { day: "Jeu", value: 8100 },
    { day: "Ven", value: 6500 },
    { day: "Sam", value: 8750 },
    { day: "Dim", value: 1650 },
  ],
  earningsTotal: 42500,
  earningsPrevious: 36000,
  recentActivity: [
    {
      id: "act-1",
      type: "delivery_completed" as const,
      title: "Livraison #0846 réussie",
      subtitle: "Mme Konaté · Secteur 22",
      time: "Il y a 25 min",
      dotColor: "bg-green-500",
    },
    {
      id: "act-2",
      type: "pickup_done" as const,
      title: "Collecte #0847 effectuée",
      subtitle: "Boutique Bio · Ouaga 2000",
      time: "Il y a 45 min",
      dotColor: "bg-sugu-500",
    },
    {
      id: "act-3",
      type: "assigned" as const,
      title: "Nouvelle assignation #0848",
      subtitle: "Pharmacie Santé+",
      time: "Il y a 1h",
      dotColor: "bg-blue-500",
    },
    {
      id: "act-4",
      type: "delivery_completed" as const,
      title: "Livraison #0845 réussie",
      subtitle: "M. Sawadogo · Zone 1",
      time: "Il y a 2h",
      dotColor: "bg-green-500",
    },
  ],
};

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
      value: data.kpis.today_earnings.toLocaleString("fr-FR"),
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
    assigned: "pickup",
    in_transit: "en_route",
    delivered: "delivered",
    delivery_failed: "failed",
  };
  return statusMap[backendStatus] ?? backendStatus;
}

/** @internal Map frontend status → human-readable label */
function _statusLabel(status: string): string {
  const labels: Record<string, string> = {
    to_accept: "À accepter",
    pickup: "Ramassage",
    en_route: "En route",
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
  from_time?: string;
  order_items: number;
  order_total: number;
  order_payment: string;
  amount: number;
  parcel_count: number;
  progress_percent?: number;
  eta_minutes?: number;
  fail_reason?: string;
  time_label: string;
  timeline: Array<{ id: string; label: string; time: string | null; done: boolean; current: boolean }>;
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

export async function markDelivered(deliveryId: string): Promise<void> {
  await api.post(`courier/deliveries/${deliveryId}/mark-delivered`);
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
    letter: string;
    type: string;
    name: string;
    address: string;
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
  accepted_at: string | null;
  completed_at: string | null;
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
      letter: stop.letter,
      type: stop.type,
      name: stop.name,
      address: stop.address,
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
    acceptedAt: d.accepted_at,
    completedAt: d.completed_at,
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
): Promise<void> {
  await api.post(
    `courier/deliveries/${deliveryId}/confirm-collection/${productId}`,
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
  acceptedAt: "2026-03-08T13:45:00",
  completedAt: null,
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
// Driver Settings — Service (API Integration)
// ============================================================

import type {
  DriverSettings,
  DriverProfile,
  DriverVehicle,
  DriverNotifications,
} from "./schema";
import { driverSettingsSchema } from "./schema";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/http/api-error";

// ── Base path ──────────────────────────────────────────────

const COURIER_SETTINGS_BASE = "courier/settings";

// ── Raw API response interface (snake_case from backend) ───

interface RawCourierSettingsResponse {
  profile: {
    first_name: string;
    last_name: string;
    email: string;
    email_verified: boolean;
    phone: string;
    phone_secondary: string | null;
    avatar_url: string | null;
    city: string;
    quarter: string;
    full_address: string;
    action_radius: number;
    language: string;
    timezone: string;
    rating: number;
    total_deliveries: number;
    success_rate: number;
    avg_delivery_minutes: number;
  };
  vehicle: {
    id: string;
    type: string;
    brand: string;
    license_plate: string;
    color: string;
    max_capacity_kg: number;
    year: number;
    notes: string | null;
    is_active: boolean;
    photos: Array<{ id: string; url: string; label: string }>;
  };
  kyc: {
    documents: Array<{
      id: string;
      type: string;
      label: string;
      status: string;
      file_name: string | null;
      uploaded_at: string | null;
      rejection_reason: string | null;
    }>;
    submitted_count: number;
    required_count: number;
    progress_percent: number;
    can_deliver: boolean;
    recent_activity: Array<{
      id: string;
      label: string;
      time: string;
      dot_color: string;
    }>;
  };
  notifications: {
    channels: Array<{ id: string; label: string; detail: string; enabled: boolean; pro: boolean }>;
    events: Array<{ id: string; label: string; icon: string; sms: boolean; email: boolean; push: boolean; whatsapp: boolean }>;
    quiet_hours: { enabled: boolean; from: string; to: string };
  };
  security: {
    two_factor_enabled: boolean;
    sessions: Array<{
      id: string;
      device: string;
      os: string;
      location: string;
      last_activity: string;
      current: boolean;
    }>;
  };
  last_saved_at: string;
}

// ── Transformer: snake_case → camelCase (Zod shape) ────────

/** @internal Maps raw API settings response to the Zod schema shape */
function _transformSettingsResponse(raw: RawCourierSettingsResponse): unknown {
  return {
    profile: {
      firstName: raw.profile.first_name,
      lastName: raw.profile.last_name,
      email: raw.profile.email,
      emailVerified: raw.profile.email_verified,
      phone: raw.profile.phone,
      phoneSecondary: raw.profile.phone_secondary,
      avatarUrl: raw.profile.avatar_url,
      city: raw.profile.city,
      quarter: raw.profile.quarter,
      fullAddress: raw.profile.full_address,
      actionRadius: raw.profile.action_radius,
      language: raw.profile.language,
      timezone: raw.profile.timezone,
      rating: raw.profile.rating,
      totalDeliveries: raw.profile.total_deliveries,
      successRate: raw.profile.success_rate,
      avgDeliveryMinutes: raw.profile.avg_delivery_minutes,
    },
    vehicle: {
      id: raw.vehicle.id,
      type: raw.vehicle.type,
      brand: raw.vehicle.brand,
      licensePlate: raw.vehicle.license_plate,
      color: raw.vehicle.color,
      maxCapacityKg: raw.vehicle.max_capacity_kg,
      year: raw.vehicle.year,
      notes: raw.vehicle.notes,
      isActive: raw.vehicle.is_active,
      photos: raw.vehicle.photos,
    },
    kyc: {
      documents: raw.kyc.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        label: doc.label,
        status: doc.status,
        fileName: doc.file_name,
        uploadedAt: doc.uploaded_at,
        rejectionReason: doc.rejection_reason,
      })),
      submittedCount: raw.kyc.submitted_count,
      requiredCount: raw.kyc.required_count,
      progressPercent: raw.kyc.progress_percent,
      canDeliver: raw.kyc.can_deliver,
      recentActivity: raw.kyc.recent_activity.map((a) => ({
        id: a.id,
        label: a.label,
        time: a.time,
        dotColor: a.dot_color,
      })),
    },
    notifications: {
      channels: raw.notifications.channels,
      events: raw.notifications.events,
      quietHours: raw.notifications.quiet_hours,
    },
    security: {
      twoFactorEnabled: raw.security.two_factor_enabled,
      sessions: raw.security.sessions.map((s) => ({
        id: s.id,
        device: s.device,
        os: s.os,
        location: s.location,
        lastActivity: s.last_activity,
        current: s.current,
      })),
    },
    lastSavedAt: raw.last_saved_at,
  };
}

// ── Helper: get auth token for raw fetch calls ─────────────

function _getToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ═══════════════════════════════════════════════════════════
// GET — Settings complètes
// ═══════════════════════════════════════════════════════════

/** GET driver settings (all sections) */
export async function getDriverSettings(): Promise<DriverSettings> {
  const response = await api.get<ApiSuccessResponse<RawCourierSettingsResponse>>(
    COURIER_SETTINGS_BASE,
  );
  return driverSettingsSchema.parse(
    _transformSettingsResponse(response.data),
  );
}

// ═══════════════════════════════════════════════════════════
// PUT — Profil
// ═══════════════════════════════════════════════════════════

/** PUT update driver profile */
export async function updateDriverProfile(data: Partial<DriverProfile>): Promise<void> {
  await api.put(`${COURIER_SETTINGS_BASE}/profile`, {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    phone_secondary: data.phoneSecondary,
    city: data.city,
    quarter: data.quarter,
    full_address: data.fullAddress,
    action_radius: data.actionRadius,
    language: data.language,
    timezone: data.timezone,
  });
}

// ═══════════════════════════════════════════════════════════
// PUT — Véhicule
// ═══════════════════════════════════════════════════════════

/** PUT update driver vehicle */
export async function updateDriverVehicle(data: Partial<DriverVehicle>): Promise<void> {
  await api.put(`${COURIER_SETTINGS_BASE}/vehicle`, {
    type: data.type,
    brand: data.brand,
    license_plate: data.licensePlate,
    color: data.color,
    max_capacity_kg: data.maxCapacityKg,
    year: data.year,
    notes: data.notes,
  });
}

// ═══════════════════════════════════════════════════════════
// POST — KYC Document Upload (multipart/form-data)
// ═══════════════════════════════════════════════════════════

/**
 * POST upload KYC document.
 * Uses raw `fetch` instead of `api.post` because the centralized
 * client always sets Content-Type=application/json which breaks
 * multipart/form-data uploads.
 */
export async function uploadKycDocument(docType: string, file: File): Promise<void> {
  const base = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
    ? env.NEXT_PUBLIC_API_BASE_URL
    : `${env.NEXT_PUBLIC_API_BASE_URL}/`;

  const fd = new FormData();
  fd.append("document_type", docType);
  fd.append("file", file);

  const token = _getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${base}${COURIER_SETTINGS_BASE}/kyc/upload`, {
    method: "POST",
    headers,
    body: fd,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      throw new ApiError({
        message: json.message ?? `HTTP ${response.status}`,
        status: response.status,
        code: json.code ?? `HTTP_${response.status}`,
        errors: json.errors,
      });
    }
    throw new ApiError({
      message: `HTTP ${response.status} — erreur lors de l'upload`,
      status: response.status,
      code: `HTTP_${response.status}`,
    });
  }
}

// ═══════════════════════════════════════════════════════════
// PUT — Notifications
// ═══════════════════════════════════════════════════════════

/** PUT update driver notifications */
export async function updateDriverNotifications(data: Partial<DriverNotifications>): Promise<void> {
  await api.put(`${COURIER_SETTINGS_BASE}/notifications`, {
    channels: data.channels,
    events: data.events,
    quiet_hours: data.quietHours,
  });
}

// ═══════════════════════════════════════════════════════════
// PUT — Password
// ═══════════════════════════════════════════════════════════

/** PUT update driver password */
export async function updateDriverPassword(data: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}): Promise<void> {
  await api.put(`${COURIER_SETTINGS_BASE}/security/password`, {
    current_password: data.currentPassword,
    password: data.newPassword,
    password_confirmation: data.newPasswordConfirmation,
  });
}

// ═══════════════════════════════════════════════════════════
// POST — Toggle 2FA
// ═══════════════════════════════════════════════════════════

/** POST toggle 2FA on/off */
export async function toggleDriver2FA(): Promise<void> {
  await api.post(`${COURIER_SETTINGS_BASE}/security/2fa`);
}

// ═══════════════════════════════════════════════════════════
// DELETE — Revoke Session
// ═══════════════════════════════════════════════════════════

/** DELETE revoke a single session by ID */
export async function revokeDriverSession(sessionId: string): Promise<void> {
  await api.delete(`${COURIER_SETTINGS_BASE}/security/sessions/${encodeURIComponent(sessionId)}`);
}

// ═══════════════════════════════════════════════════════════
// DELETE — Revoke Other Sessions
// ═══════════════════════════════════════════════════════════

/** DELETE revoke all sessions except current */
export async function revokeOtherDriverSessions(): Promise<void> {
  await api.delete(`${COURIER_SETTINGS_BASE}/security/sessions/others`);
}

// ═══════════════════════════════════════════════════════════
// DELETE — Delete Account
// ═══════════════════════════════════════════════════════════

/** DELETE driver account (requires password verification) */
export async function deleteDriverAccount(data: { password: string; confirmText: string }): Promise<void> {
  await apiRequest(`${COURIER_SETTINGS_BASE}/account`, {
    method: "DELETE",
    body: {
      password: data.password,
      confirm_text: data.confirmText,
    },
  });
}

// ── Mock Driver Settings Data (preserved for reference/fallback) ──

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _MOCK_DRIVER_SETTINGS = {
  profile: {
    firstName: "Amadou",
    lastName: "Diallo",
    email: "amadou.diallo@email.com",
    emailVerified: true,
    phone: "+223 76 12 34 56",
    phoneSecondary: null,
    avatarUrl: null,
    city: "Bamako",
    quarter: "Hamdallaye ACI 2000",
    fullAddress: "Rue 305, Porte 112",
    actionRadius: 15,
    language: "Français",
    timezone: "Africa/Bamako (GMT+0)",
    rating: 4.8,
    totalDeliveries: 127,
    successRate: 98,
    avgDeliveryMinutes: 32,
  },
  vehicle: {
    id: "v-1",
    type: "moto" as const,
    brand: "Yamaha FZ",
    licensePlate: "BKO-1234-ML",
    color: "Noir",
    maxCapacityKg: 50,
    year: 2022,
    notes: null,
    isActive: true,
    photos: [
      { id: "ph-1", url: "/images/vehicle-front.jpg", label: "Vue avant" },
      { id: "ph-2", url: "/images/vehicle-side.jpg", label: "Vue côté" },
    ],
  },
  kyc: {
    documents: [
      {
        id: "kyc-1",
        type: "cni" as const,
        label: "Pièce d'identité (CNI / Passeport)",
        status: "verified" as const,
        fileName: "cni_amadou_diallo.pdf",
        uploadedAt: "2026-02-28T10:00:00Z",
        rejectionReason: null,
      },
      {
        id: "kyc-2",
        type: "permis" as const,
        label: "Permis de conduire",
        status: "pending" as const,
        fileName: "permis_amadou_diallo.pdf",
        uploadedAt: "2026-03-03T14:00:00Z",
        rejectionReason: null,
      },
      {
        id: "kyc-3",
        type: "carte_grise" as const,
        label: "Carte grise du véhicule",
        status: "pending" as const,
        fileName: "carte_grise_yamaha.pdf",
        uploadedAt: "2026-03-02T09:00:00Z",
        rejectionReason: null,
      },
      {
        id: "kyc-4",
        type: "assurance" as const,
        label: "Attestation d'assurance",
        status: "not_uploaded" as const,
        fileName: null,
        uploadedAt: null,
        rejectionReason: null,
      },
    ],
    submittedCount: 3,
    requiredCount: 4,
    progressPercent: 75,
    canDeliver: true,
    recentActivity: [
      { id: "act-k1", label: "CNI vérifiée et approuvée", time: "il y a 3 jours", dotColor: "bg-green-500" },
      { id: "act-k2", label: "Permis de conduire soumis", time: "il y a 5 jours", dotColor: "bg-amber-500" },
      { id: "act-k3", label: "Carte grise soumise", time: "il y a 6 jours", dotColor: "bg-amber-500" },
    ],
  },
  notifications: {
    channels: [
      { id: "ch-sms", label: "SMS", detail: "+223 76 12 34 56", enabled: true, pro: false },
      { id: "ch-email", label: "Email", detail: "amadou.diallo@email.com", enabled: true, pro: false },
      { id: "ch-push", label: "Push (Application)", detail: "Samsung Galaxy A54", enabled: true, pro: false },
      { id: "ch-whatsapp", label: "WhatsApp", detail: "+223 76 12 34 56", enabled: false, pro: true },
    ],
    events: [
      { id: "ev-1", label: "Nouvelle livraison assignée", icon: "package", sms: true, email: true, push: true, whatsapp: false },
      { id: "ev-2", label: "Livraison annulée", icon: "x-circle", sms: true, email: true, push: true, whatsapp: false },
      { id: "ev-3", label: "Paiement reçu", icon: "banknote", sms: false, email: true, push: true, whatsapp: false },
      { id: "ev-4", label: "Rappel de livraison", icon: "clock", sms: true, email: false, push: true, whatsapp: false },
      { id: "ev-5", label: "Message du client", icon: "message-square", sms: false, email: true, push: true, whatsapp: true },
      { id: "ev-6", label: "Mise à jour de l'agence", icon: "building", sms: false, email: true, push: false, whatsapp: false },
    ],
    quietHours: { enabled: false, from: "22:00", to: "07:00" },
  },
  security: {
    twoFactorEnabled: false,
    sessions: [
      {
        id: "sess-1",
        device: "Samsung Galaxy A54",
        os: "Android 14",
        location: "Bamako, Mali",
        lastActivity: "il y a 2 min",
        current: true,
      },
      {
        id: "sess-2",
        device: "Chrome — Windows",
        os: "Windows 11",
        location: "Bamako, Mali",
        lastActivity: "il y a 3 jours",
        current: false,
      },
    ],
  },
  lastSavedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

// ============================================================
// Driver Earnings — Service (API Integration)
// ============================================================

import type {
  DriverEarningsData,
  DriverPayoutSetting,
  DriverWithdrawalResponse,
} from "./schema";
import {
  driverEarningsDataSchema,
  driverPayoutSettingSchema,
  driverWithdrawalResponseSchema,
} from "./schema";

// ── Raw API types ───────────────────────────────────────────

interface RawEarningsKpis {
  available_balance: number;
  available_balance_change_percent: number;
  pending_amount: number;
  total_withdrawn: number;
  today_earnings: number;
  today_earnings_change_percent: number;
}

interface RawEarningsResponse {
  kpis: RawEarningsKpis;
  revenue_chart: Array<{ day: string; value: number }>;
  next_payout: {
    amount: number;
    scheduled_date: string;
    method: {
      provider: string;
      provider_label: string;
      account_masked: string;
    } | null;
    min_threshold: number;
  };
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: string;
    reference_type: string;
    amount: number;
    status: string;
  }>;
}

// ── Internal Transformers ───────────────────────────────────

/** @internal Transform API earnings → DriverEarningsData shape */
function _transformEarningsResponse(raw: Record<string, unknown>): unknown {
  const data = raw as unknown as RawEarningsResponse;

  // Build 4 display-ready KPI cards from raw numbers
  const kpis = [
    {
      id: "available-balance", // ⚠️ CRITICAL: withdraw wizard depends on this ID
      label: "Solde disponible",
      value: data.kpis.available_balance.toLocaleString("fr-FR"),
      subValue: "FCFA",
      badge:
        data.kpis.available_balance_change_percent > 0
          ? `+${data.kpis.available_balance_change_percent}%`
          : `${data.kpis.available_balance_change_percent}%`,
      badgeColor:
        data.kpis.available_balance_change_percent >= 0
          ? "text-green-600 bg-green-100"
          : "text-red-600 bg-red-100",
      icon: "wallet",
      gradient: "from-green-50/50 to-white",
      iconBg: "bg-green-50 text-green-600",
    },
    {
      id: "pending",
      label: "En attente",
      value: data.kpis.pending_amount.toLocaleString("fr-FR"),
      subValue: "FCFA",
      icon: "clock",
      gradient: "from-amber-50/50 to-white",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      id: "total-withdrawn",
      label: "Total retiré",
      value: data.kpis.total_withdrawn.toLocaleString("fr-FR"),
      subValue: "FCFA",
      icon: "arrow-down-to-line",
      gradient: "from-blue-50/50 to-white",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      id: "today-earnings",
      label: "Gains aujourd'hui",
      value: data.kpis.today_earnings.toLocaleString("fr-FR"),
      subValue: "FCFA",
      badge:
        data.kpis.today_earnings_change_percent > 0
          ? `+${data.kpis.today_earnings_change_percent}%`
          : `${data.kpis.today_earnings_change_percent}%`,
      badgeColor:
        data.kpis.today_earnings_change_percent >= 0
          ? "text-sugu-600 bg-sugu-100"
          : "text-red-600 bg-red-100",
      icon: "trending-up",
      gradient: "from-sugu-50/50 to-white",
      iconBg: "bg-sugu-50 text-sugu-600",
    },
  ];

  return {
    kpis,
    revenueChart: data.revenue_chart,
    nextPayout: {
      amount: data.next_payout.amount,
      scheduledDate: data.next_payout.scheduled_date,
      method: data.next_payout.method
        ? {
            provider: data.next_payout.method.provider,
            providerLabel: data.next_payout.method.provider_label,
            accountMasked: data.next_payout.method.account_masked,
          }
        : null,
      minThreshold: data.next_payout.min_threshold,
    },
    transactions: data.transactions.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      type: t.type,
      referenceType: t.reference_type,
      amount: t.amount,
      status: t.status,
    })),
  };
}

/** @internal Transform payout settings response */
function _transformPayoutSettings(
  raw: unknown[],
): unknown[] {
  return (raw as Array<Record<string, unknown>>).map((ps) => ({
    id: ps.id,
    type: ps.type,
    provider: ps.provider,
    providerLabel: ps.provider_label,
    accountMasked: ps.account_masked,
    accountName: ps.account_name,
    isDefault: ps.is_default,
    isVerified: ps.is_verified,
  }));
}

/** @internal Transform withdrawal response */
function _transformWithdrawalResponse(
  raw: Record<string, unknown>,
): unknown {
  return {
    id: raw.id,
    payoutNumber: raw.payout_number,
    amount: raw.amount,
    feeAmount: raw.fee_amount,
    netAmount: raw.net_amount,
    status: raw.status,
    estimatedDate: raw.estimated_date,
  };
}

// ── Service Functions ───────────────────────────────────────

/** GET driver earnings data (KPIs + chart + payout + transactions) */
export async function getDriverEarnings(): Promise<DriverEarningsData> {
  const response = await api.get<ApiSuccessResponse<Record<string, unknown>>>(
    "courier/earnings",
  );
  return driverEarningsDataSchema.parse(
    _transformEarningsResponse(response.data),
  );
}

/** GET payout settings (payment methods) */
export async function getDriverPayoutSettings(): Promise<
  DriverPayoutSetting[]
> {
  const response = await api.get<ApiSuccessResponse<unknown[]>>(
    "courier/payout-settings",
  );
  const transformed = _transformPayoutSettings(response.data);
  return transformed.map((ps) => driverPayoutSettingSchema.parse(ps));
}

/** POST submit withdrawal request */
export async function submitDriverWithdrawal(data: {
  amount: number;
  payoutSettingId: string;
  pin?: string;
}): Promise<DriverWithdrawalResponse> {
  const idempotencyKey = crypto.randomUUID();
  const response = await api.post<
    ApiSuccessResponse<Record<string, unknown>>
  >("courier/withdrawals", {
    amount: data.amount,
    payout_setting_id: data.payoutSettingId,
    pin: data.pin,
    idempotency_key: idempotencyKey,
  });
  return driverWithdrawalResponseSchema.parse(
    _transformWithdrawalResponse(response.data),
  );
}

// ── Mock Earnings Data (preserved for reference) ────────────

 
export const _MOCK_DRIVER_EARNINGS = {
  kpis: [
    {
      id: "available-balance",
      label: "Solde disponible",
      value: "45,750",
      subValue: "FCFA",
      badge: "+12%",
      badgeColor: "text-green-600 bg-green-100",
      icon: "wallet",
      gradient: "from-green-50/50 to-white",
      iconBg: "bg-green-50 text-green-600",
    },
    {
      id: "pending",
      label: "En attente",
      value: "12,300",
      subValue: "FCFA",
      icon: "clock",
      gradient: "from-amber-50/50 to-white",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      id: "total-withdrawn",
      label: "Total retiré",
      value: "156,500",
      subValue: "FCFA",
      icon: "arrow-down-to-line",
      gradient: "from-blue-50/50 to-white",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      id: "today-earnings",
      label: "Gains aujourd'hui",
      value: "8,200",
      subValue: "FCFA",
      badge: "+8.5%",
      badgeColor: "text-sugu-600 bg-sugu-100",
      icon: "trending-up",
      gradient: "from-sugu-50/50 to-white",
      iconBg: "bg-sugu-50 text-sugu-600",
    },
  ],
  revenueChart: [
    { day: "Lun", value: 5200 },
    { day: "Mar", value: 7800 },
    { day: "Mer", value: 4500 },
    { day: "Jeu", value: 9100 },
    { day: "Ven", value: 8200 },
    { day: "Sam", value: 6700 },
    { day: "Dim", value: 4250 },
  ],
  nextPayout: {
    amount: 45750,
    scheduledDate: "15 mars 2026",
    method: {
      provider: "orange_money",
      providerLabel: "Orange Money",
      accountMasked: "*** *** ** 56",
    },
    minThreshold: 5000,
  },
  transactions: [
    {
      id: "txn-1",
      date: "Aujourd'hui",
      description: "Livraison #ORD-2847",
      type: "credit" as const,
      referenceType: "delivery" as const,
      amount: 2500,
      status: "confirmed" as const,
    },
    {
      id: "txn-2",
      date: "Aujourd'hui",
      description: "Livraison #ORD-2843",
      type: "credit" as const,
      referenceType: "delivery" as const,
      amount: 1800,
      status: "confirmed" as const,
    },
    {
      id: "txn-3",
      date: "Hier",
      description: "Retrait Orange Money",
      type: "debit" as const,
      referenceType: "payout" as const,
      amount: 25000,
      status: "completed" as const,
    },
    {
      id: "txn-4",
      date: "Hier",
      description: "Commission SUGU (5%)",
      type: "debit" as const,
      referenceType: "commission" as const,
      amount: 750,
      status: "confirmed" as const,
    },
    {
      id: "txn-5",
      date: "10 mars",
      description: "Livraison #ORD-2838",
      type: "credit" as const,
      referenceType: "delivery" as const,
      amount: 3200,
      status: "pending" as const,
    },
  ],
};

 
export const _MOCK_PAYOUT_SETTINGS = [
  {
    id: "ps-1",
    type: "mobile_money" as const,
    provider: "orange_money",
    providerLabel: "Orange Money",
    accountMasked: "+223 76 ** ** 56",
    accountName: "Amadou Diallo",
    isDefault: true,
    isVerified: true,
  },
  {
    id: "ps-2",
    type: "mobile_money" as const,
    provider: "moov_money",
    providerLabel: "Moov Money",
    accountMasked: "+223 65 ** ** 89",
    accountName: "Amadou Diallo",
    isDefault: false,
    isVerified: true,
  },
];

