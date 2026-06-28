// ────────────────────────────────────────────────────────────
// Shared types & constants for the Create Product wizard
// ────────────────────────────────────────────────────────────

export interface VariantOption {
  id: string;
  label: string;
  price: string;
}

/** An axis of variation (e.g. Couleur, Taille, Poids) */
export interface VariantAxisValue {
  id: string;
  value: string;
  hex?: string;
}

export interface VariantAxis {
  id: string;
  name: string;
  values: VariantAxisValue[];
}

/** A generated variant (cartesian product combination) */
export interface GeneratedVariant {
  id: string;
  combination: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
}

export interface PriceTier {
  id: string;
  minQty: string;
  price: string;
}

/** A photo selected in the wizard (File object + preview URL) */
export interface ProductPhoto {
  id: string;
  file: File;                      // Original file
  previewUrl: string;              // Display URL (local blob OR Cloudinary URL from server)
  originalPreviewUrl?: string;     // Local original preview retained for comparison/revert
  isMain: boolean;
  // Detourage workflow fields:
  previewUuid?: string;            // UUID returned by backend after detourage
  backgroundRemovalPreviewId?: string;
  isBackgroundRemovalAccepted?: boolean;
  isProcessing?: boolean;          // true during the API call for detourage
  processingError?: string | null; // Error message if detourage failed
  isDetoured?: boolean;            // true if the image was successfully detoured
}

export interface ProductFormData {
  name: string;
  description: string;
  mainCategory: string;
  subCategory: string;
  tags: string[];
  origin: string;
  weightValue: string;
  weightUnit: string;
  price: string;
  originalPrice: string;
  stock: string;
  alertThreshold: string;
  autoTrackStock: boolean;
  hasVariants: boolean;
  variantAxes: VariantAxis[];
  generatedVariants: GeneratedVariant[];
  hasBulkPricing: boolean;
  bulkTiers: PriceTier[];
  publishMode: "publish" | "draft";
  photos: ProductPhoto[];
  categoryIds: string[];
}

export type FormUpdater = <K extends keyof ProductFormData>(
  field: K,
  value: ProductFormData[K],
) => void;

// ── Constants ──

export const CATEGORIES: Record<string, string[]> = {
  Alimentaire: [
    "Huiles végétales",
    "Café",
    "Boissons",
    "Farines",
    "Miels",
    "Épices",
    "Pâtes",
  ],
  Cosmétique: ["Beurres", "Savons", "Huiles essentielles"],
  Santé: ["Superfoods", "Compléments"],
  Mode: ["Vêtements", "Accessoires"],
};

export const ORIGINS = [
  { label: "Mali", flag: "🇲🇱", code: "ML" },
  { label: "Sénégal", flag: "🇸🇳", code: "SN" },
  { label: "Côte d'Ivoire", flag: "🇨🇮", code: "CI" },
  { label: "Burkina Faso", flag: "🇧🇫", code: "BF" },
  { label: "Ghana", flag: "🇬🇭", code: "GH" },
  { label: "Guinée", flag: "🇬🇳", code: "GN" },
  { label: "Niger", flag: "🇳🇪", code: "NE" },
  { label: "Togo", flag: "🇹🇬", code: "TG" },
  { label: "Bénin", flag: "🇧🇯", code: "BJ" },
  { label: "Cameroun", flag: "🇨🇲", code: "CM" },
] as const;

/** Map an origin label ("Mali") to its ISO 3166-1 alpha-2 code ("ML"). */
export function originLabelToCode(label: string): string | undefined {
  return ORIGINS.find((o) => o.label === label)?.code;
}

/** Map an ISO 3166-1 alpha-2 code ("ML") back to its origin label ("Mali"). */
export function originCodeToLabel(code: string | null | undefined): string {
  if (!code) return "";
  return ORIGINS.find((o) => o.code === code.toUpperCase())?.label ?? "";
}

export const WEIGHT_UNITS = [
  "Gramme",
  "Kilogramme",
  "Litre",
  "Millilitre",
  "Mètre",
  "Unité",
];

export const STEPS = [
  { id: 1, label: "Informations" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Prix & Stock" },
  { id: 4, label: "Récapitulatif" },
] as const;

// ── Shared CSS ──

export const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white";

export const SELECT_CLASS =
  "w-full appearance-none cursor-pointer rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 pr-10 text-sm text-gray-900 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white";

export const LABEL_CLASS =
  "mb-1.5 block text-sm font-medium text-gray-600 dark:text-gray-400";

// ── Default form data ──

export const DEFAULT_FORM_DATA: ProductFormData = {
  name: "Huile de Palme Bio 1L",
  description:
    "Huile de palme rouge 100% naturelle, issue de l'agriculture biologique. Idéale pour la cuisine, riche en vitamines A et E. Flacon en verre recyclable d'un litre.",
  mainCategory: "Alimentaire",
  subCategory: "Huiles végétales",
  tags: ["bio", "naturel", "cuisine"],
  origin: "Mali",
  weightValue: "1",
  weightUnit: "Litre",
  price: "4500",
  originalPrice: "6000",
  stock: "50",
  alertThreshold: "10",
  autoTrackStock: true,
  hasVariants: false,
  variantAxes: [],
  generatedVariants: [],
  hasBulkPricing: true,
  bulkTiers: [
    { id: "t1", minQty: "1", price: "4500" },
    { id: "t2", minQty: "5", price: "4000" },
    { id: "t3", minQty: "10", price: "3500" },
  ],
  publishMode: "publish",
  photos: [],
  categoryIds: [],
};
