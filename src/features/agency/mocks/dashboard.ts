import type { AgencyDashboardData } from "../schema";

// ============================================================
// Agency Dashboard — Mock Data (Design-Only)
// Matches the reference image pixel-perfect
// ============================================================

export const mockAgencyDashboard: AgencyDashboardData = {
  agencyName: "Express Bamako Livraison",
  managerName: "Abdoulaye D.",

  kpis: [
    {
      id: "deliveries-today",
      label: "Livraisons aujourd'hui",
      value: "124",
      icon: "truck",
      gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
    {
      id: "success-rate",
      label: "Taux de réussite",
      value: "96.8",
      subValue: "%",
      icon: "check-circle",
      gradient: "from-green-50 via-emerald-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-green-400 to-emerald-500 text-white",
      ringPercent: 96.8,
    },
    {
      id: "avg-time",
      label: "Temps moyen",
      value: "2h 35",
      subValue: "min",
      icon: "clock",
      gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40",
      iconBg: "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
    },
    {
      id: "revenue-today",
      label: "Revenus du jour",
      value: "485,200",
      subValue: "FCFA",
      badge: "↗ +15.2%",
      badgeColor: "text-green-600 bg-green-50",
      icon: "banknote",
      gradient: "from-emerald-50 via-green-50/60 to-lime-50/40",
      iconBg: "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
    },
  ],

  activeDeliveries: [
    {
      id: "del-1",
      orderId: "#ORD-12345",
      driver: { name: "Abdoulaye D.", initials: "AD", avatarColor: "bg-sugu-100 text-sugu-700" },
      routeAddresses: "Ramassage ende Bamako → Colis pouveronne Bamak...",
      status: "pickup",
      statusLabel: "Ramassage",
      eta: "15m 20s",
    },
    {
      id: "del-2",
      orderId: "#ORD-12345",
      driver: { name: "Fanta K.", initials: "FK", avatarColor: "bg-purple-100 text-purple-700" },
      routeAddresses: "Addresses et de Bamako → Ramassage abun Bamak...",
      status: "en_route",
      statusLabel: "En route",
      eta: "15m 20s",
    },
    {
      id: "del-3",
      orderId: "#ORD-12345",
      driver: { name: "Oumou S.", initials: "OS", avatarColor: "bg-green-100 text-green-700" },
      routeAddresses: "Addresses code Bamako → Ramassage abun Bamak...",
      status: "delivered",
      statusLabel: "Livré",
      eta: "15m 20s",
    },
    {
      id: "del-4",
      orderId: "#ORD-12345",
      driver: { name: "Salif B.", initials: "SB", avatarColor: "bg-blue-100 text-blue-700" },
      routeAddresses: "Addresses erde Bamako → Colis pouveronne Bamak...",
      status: "delivered",
      statusLabel: "Livré",
      eta: "15m 20s",
    },
    {
      id: "del-5",
      orderId: "#ORD-12345",
      driver: { name: "Abdoulaye D.", initials: "AD", avatarColor: "bg-red-100 text-red-700" },
      routeAddresses: "Addresses e de Bamako → Ramassage abun Bamak...",
      status: "delayed",
      statusLabel: "Retard",
      eta: "15m 20s",
    },
  ],

  driverPerformance: [
    { id: "drv-1", name: "Moussa T.", initials: "MT", avatarColor: "bg-sugu-100 text-sugu-700", score: 98 },
    { id: "drv-2", name: "Fanta K.", initials: "FK", avatarColor: "bg-purple-100 text-purple-700", score: 95 },
    { id: "drv-3", name: "Salif B.", initials: "SB", avatarColor: "bg-blue-100 text-blue-700", score: 93 },
    { id: "drv-4", name: "Oumou S.", initials: "OS", avatarColor: "bg-green-100 text-green-700", score: 91 },
    { id: "drv-5", name: "Ibrahim D.", initials: "ID", avatarColor: "bg-amber-100 text-amber-700", score: 89 },
  ],

  complaints: [
    {
      id: "cmp-1",
      title: "Problème d'adresse - ID #9876",
      refId: "#9876",
      date: "27.10.2023 15:00",
      severity: "urgent",
    },
    {
      id: "cmp-2",
      title: "Colis endommagé - ID #9875",
      refId: "#9875",
      date: "27.10.2023 15:00",
      severity: "urgent",
    },
    {
      id: "cmp-3",
      title: "Livreur impoli - ID #9874",
      refId: "#9874",
      date: "21.10.2024 15:00",
      severity: "normal",
    },
  ],

  mapPins: [
    { id: "p1", lat: 12.639, lng: -8.003, status: "en_route" },
    { id: "p2", lat: 12.645, lng: -7.995, status: "pickup" },
    { id: "p3", lat: 12.635, lng: -8.010, status: "delayed" },
    { id: "p4", lat: 12.650, lng: -7.985, status: "en_route" },
    { id: "p5", lat: 12.630, lng: -7.998, status: "pickup" },
    { id: "p6", lat: 12.642, lng: -8.015, status: "en_route" },
    { id: "p7", lat: 12.648, lng: -8.005, status: "pickup" },
    { id: "p8", lat: 12.637, lng: -7.990, status: "delayed" },
  ],
};
