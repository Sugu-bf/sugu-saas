import type { VendorClientsResponse } from "../schema";

export const mockVendorClients: VendorClientsResponse = {
  kpis: {
    totalClients: 1247,
    newThisMonth: 34,
    activeClients: 892,
    activePercent: 71.5,
    avgBasket: 32400,
    loyaltyRate: 68,
  },
  statusCounts: { all: 1247, active: 892, loyal: 234, inactive: 121, new: 34 },
  pagination: { currentPage: 1, totalPages: 125, perPage: 10, totalItems: 1247 },
  clients: [
    {
      id: "cl-1", name: "Aminata Diallo", email: "aminata.d@email.com", phone: "+223 76 45 23 18",
      initials: "AD", avatarColor: "bg-sugu-100 text-sugu-700", city: "Bamako",
      orderCount: 12, totalSpent: 487200, avgBasket: 32400, lastOrder: "Il y a 2 jours",
      memberSince: "Mars 2025", status: "loyal", statusLabel: "Fidèle",
      recentOrders: [
        { id: "o1", reference: "#ORD-4521", date: "22 Fév", total: 44350, statusLabel: "Livrée", statusColor: "bg-green-50 text-green-600 border-green-200" },
        { id: "o2", reference: "#ORD-4498", date: "18 Fév", total: 28900, statusLabel: "Livrée", statusColor: "bg-green-50 text-green-600 border-green-200" },
        { id: "o3", reference: "#ORD-4412", date: "5 Fév", total: 67500, statusLabel: "Livrée", statusColor: "bg-green-50 text-green-600 border-green-200" },
      ],
      favoriteProducts: [
        { id: "fp1", name: "Palm oil", emoji: "🫒" },
        { id: "fp2", name: "Coffee", emoji: "☕" },
        { id: "fp3", name: "Shea butter", emoji: "🧴" },
      ],
    },
    {
      id: "cl-2", name: "Seydou Traoré", email: "seydou.t@email.com", phone: "+223 65 78 90 12",
      initials: "ST", avatarColor: "bg-blue-100 text-blue-700", city: "Bamako",
      orderCount: 8, totalSpent: 234500, avgBasket: 29300, lastOrder: "Il y a 5 jours",
      memberSince: "Juin 2025", status: "active", statusLabel: "Actif",
      recentOrders: [
        { id: "o4", reference: "#ORD-4510", date: "19 Fév", total: 35200, statusLabel: "Livrée", statusColor: "bg-green-50 text-green-600 border-green-200" },
      ],
      favoriteProducts: [
        { id: "fp4", name: "Miel", emoji: "🍯" },
        { id: "fp5", name: "Épices", emoji: "🌶️" },
      ],
    },
    {
      id: "cl-3", name: "Fatoumata Koné", email: "fatou.k@email.com", phone: "+223 70 12 34 56",
      initials: "FK", avatarColor: "bg-purple-100 text-purple-700", city: "Sikasso",
      orderCount: 23, totalSpent: 1245000, avgBasket: 54100, lastOrder: "Aujourd'hui",
      memberSince: "Jan 2024", status: "vip", statusLabel: "VIP",
      recentOrders: [
        { id: "o5", reference: "#ORD-4530", date: "24 Fév", total: 89000, statusLabel: "En cours", statusColor: "bg-sugu-50 text-sugu-600 border-sugu-200" },
      ],
      favoriteProducts: [
        { id: "fp6", name: "Bazin", emoji: "🧵" },
        { id: "fp7", name: "Karité", emoji: "🧴" },
        { id: "fp8", name: "Café", emoji: "☕" },
      ],
    },
    {
      id: "cl-4", name: "Ibrahima Sanogo", email: "ibrahim.s@email.com", phone: "+223 66 98 76 54",
      initials: "IS", avatarColor: "bg-green-100 text-green-700", city: "Bamako",
      orderCount: 3, totalSpent: 67800, avgBasket: 22600, lastOrder: "Il y a 1 semaine",
      memberSince: "Nov 2025", status: "active", statusLabel: "Actif",
      recentOrders: [], favoriteProducts: [{ id: "fp9", name: "Riz", emoji: "🍚" }],
    },
    {
      id: "cl-5", name: "Mariam Coulibaly", email: "mariam.c@email.com", phone: "+223 78 45 67 89",
      initials: "MC", avatarColor: "bg-pink-100 text-pink-700", city: "Mopti",
      orderCount: 1, totalSpent: 15200, avgBasket: 15200, lastOrder: "Il y a 3 semaines",
      memberSince: "Fév 2026", status: "new", statusLabel: "Nouveau",
      recentOrders: [], favoriteProducts: [],
    },
    {
      id: "cl-6", name: "Oumar Keita", email: "oumar.k@email.com", phone: "+223 69 11 22 33",
      initials: "OK", avatarColor: "bg-amber-100 text-amber-700", city: "Bamako",
      orderCount: 15, totalSpent: 678900, avgBasket: 45200, lastOrder: "Hier",
      memberSince: "Avr 2024", status: "loyal", statusLabel: "Fidèle",
      recentOrders: [
        { id: "o6", reference: "#ORD-4528", date: "23 Fév", total: 52300, statusLabel: "Livrée", statusColor: "bg-green-50 text-green-600 border-green-200" },
      ],
      favoriteProducts: [
        { id: "fp10", name: "Huile", emoji: "🫒" },
        { id: "fp11", name: "Farine", emoji: "🌾" },
      ],
    },
    {
      id: "cl-7", name: "Awa Diarra", email: "", phone: "+223 76 55 44 33",
      initials: "AD", avatarColor: "bg-gray-100 text-gray-500", city: "Ségou",
      orderCount: 0, totalSpent: 0, avgBasket: 0, lastOrder: "Jamais commandé",
      memberSince: "Déc 2025", status: "inactive", statusLabel: "Inactif",
      recentOrders: [], favoriteProducts: [],
    },
    {
      id: "cl-8", name: "Bakary Sissoko", email: "bakary.s@email.com", phone: "+223 65 99 88 77",
      initials: "BS", avatarColor: "bg-indigo-100 text-indigo-700", city: "Kayes",
      orderCount: 6, totalSpent: 189300, avgBasket: 31550, lastOrder: "Il y a 10 jours",
      memberSince: "Août 2025", status: "active", statusLabel: "Actif",
      recentOrders: [], favoriteProducts: [{ id: "fp12", name: "Savon", emoji: "🧼" }],
    },
  ],
};
