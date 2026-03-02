import type { OrderDetail } from "../schema";

// ============================================================
// Vendor Order Detail — Mock Data (Design-Only)
// Matches reference image #ORD-4521
// ============================================================

export const mockOrderDetail: OrderDetail = {
  id: "ord-4521",
  reference: "#ORD-4521",
  status: "processing",
  statusLabel: "En préparation",

  client: {
    name: "Aminata Diallo",
    initials: "AD",
    avatarColor: "bg-amber-100 text-amber-700",
    phone: "+223 76 45 23 18",
    email: "aminata.d@email.com",
    orderCount: 12,
    isLoyal: true,
  },

  products: [
    {
      id: "p1",
      name: "Huile de Palme Bio 1L",
      emoji: "🫒",
      quantity: 3,
      unitPrice: 4500,
      lineTotal: 13500,
      ready: true,
    },
    {
      id: "p2",
      name: "Café Arabica Premium 500g",
      emoji: "☕",
      quantity: 2,
      unitPrice: 8900,
      lineTotal: 17800,
      ready: true,
    },
    {
      id: "p3",
      name: "Beurre de Karité Pur 250g",
      emoji: "🧴",
      quantity: 1,
      unitPrice: 3200,
      lineTotal: 3200,
      ready: false,
    },
    {
      id: "p4",
      name: "Miel du Sahel 500ml",
      emoji: "🍯",
      quantity: 1,
      unitPrice: 12000,
      lineTotal: 12000,
      ready: false,
    },
  ],

  readyCount: 2,
  totalCount: 4,

  financial: {
    subtotal: 46500,
    deliveryCost: 2500,
    deliveryLabel: "Express Bamako",
    discountPercent: 10,
    discountAmount: 4650,
    total: 44350,
    paymentMethod: "Payé via Orange Money",
    paymentStatus: "Payé",
  },

  delivery: {
    provider: "Express Bamako",
    type: "Livraison express",
    estimatedTime: "Estimée 2-4h",
    driverStatus: "En attente d'assignation",
    address: {
      line1: "Quartier ACI 2000,",
      line2: "Rue 305, Porte 12,",
      city: "Bamako",
      country: "Mali",
    },
    clientNote: "Appeler avant la livraison",
  },

  timeline: [
    {
      id: "tl-1",
      label: "Commande reçue",
      date: "24 Fév 2026, 08:15",
      description: "Le client Aminata Diallo a passé commande depuis l'app",
      status: "completed",
    },
    {
      id: "tl-2",
      label: "Paiement confirmé",
      date: "24 Fév 2026, 08:16",
      description: "Mobile Money Orange • 44,350 FCFA reçu",
      status: "completed",
    },
    {
      id: "tl-3",
      label: "En préparation",
      date: "24 Fév 2026, 08:45",
      description: "Vous avez commencé la préparation (2/4 articles prêts)",
      status: "current",
    },
    {
      id: "tl-4",
      label: "Prête pour enlèvement",
      date: "En attente",
      status: "pending",
    },
    {
      id: "tl-5",
      label: "Récupérée par le livreur",
      date: "En attente",
      status: "pending",
    },
    {
      id: "tl-6",
      label: "Livrée au client",
      date: "Estimée: 24 Fév, 12:00",
      status: "pending",
    },
  ],
};
