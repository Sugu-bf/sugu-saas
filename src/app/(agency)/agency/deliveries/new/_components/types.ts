// ────────────────────────────────────────────────────────────
// Shared types & constants for the Create Delivery wizard
// ────────────────────────────────────────────────────────────

// STEPS
export const STEPS = [
  { id: 1, label: "Commande" },
  { id: 2, label: "Adresses" },
  { id: 3, label: "Livreur" },
  { id: 4, label: "Récapitulatif" },
] as const;

// Driver disponible (pour la sélection step 3)
export interface AvailableDriver {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  vehicle: string;
  rating: number;
  totalDeliveries: number;
  online: boolean;
  available: boolean;
  currentLoad?: string; // "2 livraisons en cours" si occupé
}

// Form data complète
export interface DeliveryFormData {
  // Step 1 — Commande
  orderId: string;              // "#ORD-..." ou vide si commande manuelle
  linkExistingOrder: boolean;
  vendorName: string;
  vendorId: string;             // ID interne si lié
  itemCount: string;            // "3"
  orderAmount: string;          // "44350"
  paymentStatus: "paid" | "pending";
  orderNotes: string;

  // Step 2 — Adresses & Client
  pickupAddress: string;        // ACI 2000, Rue 305
  pickupPhone: string;
  pickupFloor: string;          // Étage / porte
  deliveryAddress: string;      // Badalabougou, Rue 12
  deliveryPhone: string;
  deliveryFloor: string;
  clientName: string;           // Aminata Diallo
  clientPhone: string;          // +223 76 45 23 18
  clientEmail: string;
  deliveryInstructions: string; // "Appeler avant l'arrivée"

  // Step 3 — Livreur & Options
  assignNow: boolean;           // true = assigner maintenant
  selectedDriverId: string | null;
  priority: "urgent" | "normal" | "low";
  shippingFee: string;          // "2500"
  paymentMethod: string;        // "cash" | "orange_money" | "moov_money" | "prepaid"
  deliveryDate: string;         // "2026-03-02"
  timeSlotFrom: string;         // "09:00"
  timeSlotTo: string;           // "12:00"
}

export type FormUpdater = <K extends keyof DeliveryFormData>(
  field: K,
  value: DeliveryFormData[K],
) => void;

// Default form data
export const DEFAULT_FORM_DATA: DeliveryFormData = {
  orderId: "",
  linkExistingOrder: false,
  vendorName: "",
  vendorId: "",
  itemCount: "",
  orderAmount: "",
  paymentStatus: "pending",
  orderNotes: "",

  pickupAddress: "",
  pickupPhone: "",
  pickupFloor: "",
  deliveryAddress: "",
  deliveryPhone: "",
  deliveryFloor: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  deliveryInstructions: "",

  assignNow: true,
  selectedDriverId: null,
  priority: "normal",
  shippingFee: "2500",
  paymentMethod: "cash",
  deliveryDate: new Date().toISOString().split("T")[0],
  timeSlotFrom: "09:00",
  timeSlotTo: "12:00",
};

// Mock available drivers (pour le MVP — à remplacer par API)
export const MOCK_DRIVERS: AvailableDriver[] = [
  {
    id: "drv-1",
    name: "Ibrahim Konaté",
    initials: "IK",
    avatarColor: "bg-blue-100 text-blue-700",
    vehicle: "Moto, Rananing",
    rating: 4.5,
    totalDeliveries: 234,
    online: true,
    available: true,
  },
  {
    id: "drv-2",
    name: "Moussa Kouyaté",
    initials: "MK",
    avatarColor: "bg-amber-100 text-amber-700",
    vehicle: "Moto, Yamaha",
    rating: 4.2,
    totalDeliveries: 189,
    online: true,
    available: true,
  },
  {
    id: "drv-3",
    name: "Fatou Diabaté",
    initials: "FD",
    avatarColor: "bg-green-100 text-green-700",
    vehicle: "Voiture, Renault",
    rating: 4.7,
    totalDeliveries: 312,
    online: true,
    available: true,
  },
  {
    id: "drv-4",
    name: "Seydou Traoré",
    initials: "ST",
    avatarColor: "bg-red-100 text-red-700",
    vehicle: "Moto, Honda",
    rating: 4.0,
    totalDeliveries: 98,
    online: false,
    available: false,
    currentLoad: "2 livraisons en cours",
  },
];

// Mock vendors for search dropdown (MVP)
export const MOCK_VENDORS = [
  { id: "v-1", name: "Boutique Mamadou", address: "ACI 2000, Rue 305" },
  { id: "v-2", name: "Boutique Maman Aicha", address: "Avenue Kasse Keita" },
  { id: "v-3", name: "Chez Fatoumata", address: "Badalabougou, Rue 12" },
  { id: "v-4", name: "Marché Dibida", address: "Médina Coura" },
  { id: "v-5", name: "Fashion Bamako", address: "Hamdallaye ACI 2000" },
];

// CSS classes — copier exactement du vendor
export const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white";

export const SELECT_CLASS =
  "w-full appearance-none cursor-pointer rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 pr-10 text-sm text-gray-900 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white";

export const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400";

// Payment method options
export const PAYMENT_METHODS = [
  { value: "cash", label: "Espèces à la livraison" },
  { value: "orange_money", label: "Orange Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "prepaid", label: "Prépayé" },
];
