import type { VendorDashboardData } from "../schema";

// ============================================================
// Vendor Dashboard — Mock Data (Premium Design)
// Matches the glassmorphic reference image pixel-perfect
// ============================================================

export const mockVendorDashboard: VendorDashboardData = {
  vendorName: "Mamadou",
  date: "24 Février 2026",

  // --- KPI Cards (4 gradient cards) ---
  kpis: [
    {
      id: "revenue",
      label: "Chiffre d'affaires",
      value: "2,847,500",
      subValue: "FCFA",
      badge: "↑ +12.3%",
      badgeColor: "text-emerald-600 bg-emerald-50",
      icon: "trending-up",
      gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
    {
      id: "orders-today",
      label: "Commandes aujourd'hui",
      value: "47",
      subValue: "↑",
      badge: "+8",
      badgeColor: "text-blue-600 bg-blue-50",
      icon: "shopping-bag",
      gradient: "from-blue-50 via-cyan-50/60 to-teal-50/40",
      iconBg: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white",
    },
    {
      id: "active-products",
      label: "Produits actifs",
      value: "156",
      icon: "package",
      gradient: "from-purple-50 via-violet-50/60 to-fuchsia-50/40",
      iconBg: "bg-gradient-to-br from-purple-400 to-violet-500 text-white",
    },
    {
      id: "avg-rating",
      label: "Note moyenne",
      value: "4.7",
      subValue: "/5",
      icon: "star",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    },
  ],

  // --- Revenue chart (7 days) ---
  revenueChart: [
    { day: "Lun", value: 180000 },
    { day: "Mar", value: 250000 },
    { day: "Mer", value: 220000 },
    { day: "Jeu", value: 380000 },
    { day: "Ven", value: 450000 },
    { day: "Sam", value: 520000 },
    { day: "Dim", value: 847500 },
  ],

  // --- Recent orders ---
  recentOrders: [
    {
      id: "ord-1",
      reference: "#4025",
      client: "Amina K.",
      total: 12_500,
      status: "processing",
      statusLabel: "En préparation",
    },
    {
      id: "ord-2",
      reference: "#4026",
      client: "Marce K.",
      total: 5_500,
      status: "shipped",
      statusLabel: "Expédiée",
    },
    {
      id: "ord-3",
      reference: "#4027",
      client: "Jarna J.",
      total: 13_500,
      status: "delivered",
      statusLabel: "Livrée",
    },
    {
      id: "ord-4",
      reference: "#4028",
      client: "Amina K.",
      total: 4_600,
      status: "cancelled",
      statusLabel: "Annulée",
    },
    {
      id: "ord-5",
      reference: "#4029",
      client: "Maoice A.",
      total: 3_200,
      status: "delivered",
      statusLabel: "Livrée",
    },
  ],

  // --- Top products ---
  topProducts: [
    {
      id: "prod-1",
      name: "Huile de Palme Bio",
      emoji: "🫒",
      salesCount: 350,
      revenue: 875_000,
    },
    {
      id: "prod-2",
      name: "Café Arabica",
      emoji: "☕",
      salesCount: 220,
      revenue: 550_000,
    },
    {
      id: "prod-3",
      name: "Beurre de Karité",
      emoji: "🧴",
      salesCount: 180,
      revenue: 450_000,
    },
    {
      id: "prod-4",
      name: "Savon Noir",
      emoji: "🧼",
      salesCount: 150,
      revenue: 375_000,
    },
  ],

  // --- Stock alerts ---
  stockAlerts: [
    {
      id: "alert-1",
      name: "Sac en Coton",
      emoji: "👜",
      remaining: 5,
      level: "low",
    },
    {
      id: "alert-2",
      name: "Baskets Sugu",
      emoji: "👟",
      remaining: 2,
      level: "low",
    },
    {
      id: "alert-3",
      name: "Robe Fleurie",
      emoji: "👗",
      remaining: 1,
      level: "critical",
    },
  ],
};
