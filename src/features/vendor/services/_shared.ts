/**
 * Shared utilities for vendor service layer.
 * Contains helpers used across multiple domain services.
 */

// ── Status Labels ──────────────────────────────────────────

/** Order status → French label */
export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  processing: "En préparation",
  confirmed: "Confirmée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  canceled: "Annulée",
  completed: "Livrée",
  refunded: "Remboursée",
};

/** Default product emojis */
export const PRODUCT_EMOJIS = ["📦", "🛍️", "🛒", "🎁", "🧴"];

/** Avatar color palette (deterministic from name) */
const AVATAR_COLORS = [
  "bg-amber-100 text-amber-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",
];

// ── Helper Functions ───────────────────────────────────────

/** Normalize backend order statuses to frontend-expected values */
export function normalizeStatus(status: string): string {
  const map: Record<string, string> = {
    pending: "pending",
    confirmed: "processing",
    processing: "processing",
    packed: "processing",
    shipped: "shipped",
    delivered: "delivered",
    canceled: "cancelled",
    cancelled: "cancelled",
    returned: "refunded",
    completed: "delivered",
  };
  return map[status] ?? "pending";
}

/** Deterministic avatar color from name string */
export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** Extract initials from a name (up to 2 chars) */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Format ISO date to French display date */
export function formatDateFr(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

/** Category → emoji mapping */
export const CATEGORY_EMOJIS: Record<string, string> = {
  "alimentaire": "🍽️",
  "huile": "🫒",
  "café": "☕",
  "boisson": "🥤",
  "épices": "🌶️",
  "céréale": "🌾",
  "miel": "🍯",
  "cosmétique": "🧴",
  "savon": "🧼",
  "tissu": "🧵",
  "riz": "🍚",
  "fruits": "🍎",
  "légumes": "🥬",
};

/** Derive an emoji from product name or category */
export function deriveEmoji(name: string, category: string): string {
  const lowerName = name.toLowerCase();
  const lowerCat = category.toLowerCase();

  for (const [key, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (lowerName.includes(key) || lowerCat.includes(key)) return emoji;
  }
  return "📦";
}

/** Parse a number from a formatted string like "487 200 XOF" */
export function parseAmountFromLabel(label: string | undefined | null): number {
  if (!label) return 0;
  const cleaned = label.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}
