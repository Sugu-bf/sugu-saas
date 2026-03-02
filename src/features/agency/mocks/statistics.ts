import type { AgencyStatsResponse } from "../schema";

// ============================================================
// Agency Statistics — Mock Data (Design-Only)
// ============================================================

export const mockAgencyStats: AgencyStatsResponse = {
  // KPIs
  totalDeliveries: 3247,
  deliveriesGrowth: "+14%",
  successRate: 96,
  avgDeliveryTime: "2h 35min",
  avgTimeTarget: "< 3h",
  totalRevenue: "6.8M FCFA",
  revenueGrowth: "+22%",

  // Chart — Feb daily data
  chartMonth: "Fév",
  chartData: [
    { day: 1, label: "1 Fév", value: 80 },
    { day: 2, label: "2 Fév", value: 75 },
    { day: 3, label: "3 Fév", value: 60 },
    { day: 4, label: "4 Fév", value: 90 },
    { day: 5, label: "5 Fév", value: 95 },
    { day: 6, label: "6 Fév", value: 110 },
    { day: 7, label: "7 Fév", value: 100 },
    { day: 8, label: "8 Fév", value: 115 },
    { day: 9, label: "9 Fév", value: 105 },
    { day: 10, label: "10 Fév", value: 130 },
    { day: 11, label: "11 Fév", value: 140 },
    { day: 12, label: "12 Fév", value: 125 },
    { day: 13, label: "13 Fév", value: 155 },
    { day: 14, label: "14 Fév", value: 170 },
    { day: 15, label: "15 Fév", value: 156 },
    { day: 16, label: "16 Fév", value: 145 },
    { day: 17, label: "17 Fév", value: 180 },
    { day: 18, label: "18 Fév", value: 175 },
    { day: 19, label: "19 Fév", value: 200 },
    { day: 20, label: "20 Fév", value: 210 },
    { day: 21, label: "21 Fév", value: 195 },
    { day: 22, label: "22 Fév", value: 220 },
    { day: 23, label: "23 Fév", value: 235 },
    { day: 24, label: "24 Fév", value: 240 },
    { day: 25, label: "25 Fév", value: 225 },
    { day: 26, label: "26 Fév", value: 245 },
    { day: 27, label: "27 Fév", value: 250 },
    { day: 28, label: "28 Fév", value: 230 },
  ],
  chartThisMonth: 3247,
  chartPrevMonth: 2835,
  chartGrowth: "+14%",

  // Driver of the month
  driverOfMonth: {
    id: "drv-01",
    name: "Ibrahim Konaté",
    initials: "IK",
    avatarColor: "bg-amber-100 text-amber-700",
    avatarUrl: null,
    vehicle: "moto",
    deliveries: 124,
    successRate: 98,
    rating: 4.9,
    quote:
      "Meilleur livreur de l'agence avec 124 livraisons et un taux de réussite exceptionnel de 98%.",
    month: "Février 2026",
    runner2nd: "Aminata D. (112)",
    runner3rd: "Moussa T. (98)",
  },

  // Top drivers
  topDrivers: [
    { id: "drv-01", rank: 1, name: "Ibrahim Konaté", initials: "IK", avatarColor: "bg-amber-100 text-amber-700", deliveries: 124, successRate: 98 },
    { id: "drv-02", rank: 2, name: "Aminata Diarra", initials: "AD", avatarColor: "bg-purple-100 text-purple-700", deliveries: 112, successRate: 96 },
    { id: "drv-03", rank: 3, name: "Moussa Traoré", initials: "MT", avatarColor: "bg-blue-100 text-blue-700", deliveries: 98, successRate: 95 },
    { id: "drv-04", rank: 4, name: "Fatoumata Sanogo", initials: "FS", avatarColor: "bg-green-100 text-green-700", deliveries: 87, successRate: 97 },
    { id: "drv-05", rank: 5, name: "Boubacar Keita", initials: "BK", avatarColor: "bg-rose-100 text-rose-700", deliveries: 72, successRate: 80 },
  ],

  // Failure reasons
  failureCount: 124,
  failureRate: "3.8%",
  failureVsPrev: "-18% vs avant",
  failureReasons: [
    { id: "fr-1", label: "Client absent", percentage: 36, color: "bg-sugu-500" },
    { id: "fr-2", label: "Adresse incorrecte", percentage: 23, color: "bg-sugu-300" },
    { id: "fr-3", label: "Colis refusé", percentage: 15, color: "bg-gray-300" },
    { id: "fr-4", label: "Autres", percentage: 26, color: "bg-gray-200" },
  ],
  failureTip:
    "Conseil: Un SMS de confirmation avant livraison réduirait 36% des échecs.",

  // Weekly summary
  weekDays: [
    { day: "Lun", deliveries: 148, successRate: 95, isHighlighted: false },
    { day: "Mar", deliveries: 138, successRate: 96, isHighlighted: false },
    { day: "Mer", deliveries: 156, successRate: 97, isHighlighted: false },
    { day: "Jeu", deliveries: 132, successRate: 94, isHighlighted: false },
    { day: "Ven", deliveries: 165, successRate: 96, isHighlighted: false },
    { day: "Sam", deliveries: 184, successRate: 98, isHighlighted: true },
    { day: "Dim", deliveries: 82, successRate: 93, isHighlighted: false },
  ],
};
