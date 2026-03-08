import {
  driverDashboardSchema,
  driverDeliveriesResponseSchema,
  type DriverDashboardData,
  type DriverDeliveriesResponse,
  type DriverDeliveryStatus,
} from "./schema";

// ============================================================
// Driver Domain — Service Layer
// MVP: Mock data (no /courier/dashboard backend endpoint yet)
// Future: api.get("courier/dashboard")
// ============================================================

export async function getDriverDashboard(): Promise<DriverDashboardData> {
  // Simulate network delay for realistic loading states
  await new Promise((r) => setTimeout(r, 300));
  return driverDashboardSchema.parse(MOCK_DRIVER_DASHBOARD);
}

// ── Mock Data ──────────────────────────────────────────────

const MOCK_DRIVER_DASHBOARD = {
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

// ============================================================
// Driver — Delivery Service Layer
// MVP: Mock data (no backend endpoint yet)
// Future: api.get("courier/deliveries")
// ============================================================

export interface DriverDeliveryFilters {
  status?: DriverDeliveryStatus;
  search?: string;
}

export async function getDriverDeliveries(
  filters?: DriverDeliveryFilters,
): Promise<DriverDeliveriesResponse> {
  await new Promise((r) => setTimeout(r, 300));

  let rows = [...MOCK_DRIVER_DELIVERIES];

  // Filter by status
  if (filters?.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }

  // Filter by search
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.orderId.toLowerCase().includes(q) ||
        r.client.name.toLowerCase().includes(q) ||
        r.itinerary.pickupName.toLowerCase().includes(q) ||
        r.itinerary.deliveryName.toLowerCase().includes(q),
    );
  }

  const allRows = MOCK_DRIVER_DELIVERIES;

  const response: DriverDeliveriesResponse = {
    summary: {
      total: allRows.length,
      delivered: allRows.filter((r) => r.status === "delivered").length,
      inProgress: allRows.filter((r) =>
        ["pickup", "en_route", "to_accept"].includes(r.status),
      ).length,
      failed: allRows.filter((r) => r.status === "failed").length,
    },
    statusCounts: {
      all: allRows.length,
      to_accept: allRows.filter((r) => r.status === "to_accept").length,
      en_route: allRows.filter((r) =>
        ["pickup", "en_route"].includes(r.status),
      ).length,
      delivered: allRows.filter((r) => r.status === "delivered").length,
      failed: allRows.filter((r) => r.status === "failed").length,
    },
    rows,
  };

  return driverDeliveriesResponseSchema.parse(response);
}

// ── Mutation functions ──────────────────────────────────────

export async function acceptDelivery(deliveryId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] acceptDelivery:", deliveryId);
}

export async function refuseDelivery(deliveryId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] refuseDelivery:", deliveryId);
}

export async function markDelivered(deliveryId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] markDelivered:", deliveryId);
}

export async function signalDelay(deliveryId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] signalDelay:", deliveryId);
}

export async function markFailed(deliveryId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] markFailed:", deliveryId);
}

// ── Mock Delivery Data ──────────────────────────────────────

const MOCK_DRIVER_DELIVERIES = [
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
// MVP: Mock data (no backend endpoint yet)
// Future: api.get(`courier/deliveries/${id}`)
// ============================================================

import type { DriverDeliveryDetail } from "./schema";
import { driverDeliveryDetailSchema } from "./schema";

export async function getDriverDeliveryDetail(
  deliveryId: string,
): Promise<DriverDeliveryDetail> {
  await new Promise((r) => setTimeout(r, 300));
  // MVP: Return mock data matching the requested ID
  // Future: api.get(`courier/deliveries/${deliveryId}`)
  return driverDeliveryDetailSchema.parse({
    ...MOCK_DELIVERY_DETAIL,
    id: deliveryId,
  });
}

export async function confirmCollection(
  deliveryId: string,
  productId: string,
): Promise<void> {
  await new Promise((r) => setTimeout(r, 400));
  console.log("[mock] confirmCollection:", deliveryId, productId);
}

// ── Mock Delivery Detail Data ───────────────────────────────

const MOCK_DELIVERY_DETAIL: DriverDeliveryDetail = {
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
// MVP: Mock data (no backend endpoint yet)
// Future: api.get("courier/history")
// ============================================================

import type { DriverHistoryResponse, DriverHistoryStatus } from "./schema";
import { driverHistoryResponseSchema } from "./schema";

export interface DriverHistoryFilters {
  status?: DriverHistoryStatus;
  search?: string;
  page?: number;
  period?: "7d" | "30d" | "3m" | "all";
}

export async function getDriverHistory(
  filters?: DriverHistoryFilters,
): Promise<DriverHistoryResponse> {
  await new Promise((r) => setTimeout(r, 300));

  // MVP: Mock data. Future: api.get("courier/history", { params: filters })
  let rows = [...MOCK_HISTORY_ROWS];

  // Filter by status
  if (filters?.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }

  // Filter by search
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.orderId.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.pickupName.toLowerCase().includes(q) ||
        r.deliveryName.toLowerCase().includes(q),
    );
  }

  const allRows = MOCK_HISTORY_ROWS;

  return driverHistoryResponseSchema.parse({
    kpis: {
      totalDeliveries: 247,
      delivered: 234,
      deliveredPercent: 95.3,
      failed: 13,
      failedPercent: 4.1,
      totalEarnings: 156500,
      avgEarningsPerDelivery: 634,
    },
    statusCounts: {
      all: allRows.length,
      delivered: allRows.filter((r) => r.status === "delivered").length,
      failed: allRows.filter((r) => r.status === "failed").length,
    },
    rows,
    pagination: {
      currentPage: filters?.page ?? 1,
      totalPages: 31,
      perPage: 8,
      totalItems: 247,
    },
  });
}

// ── Mock History Data ──────────────────────────────────────

const MOCK_HISTORY_ROWS = [
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
