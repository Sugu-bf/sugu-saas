import type { InventoryRow, InventoryVariant } from "./contract";

// Rules of a stock adjustment, checked before the request. The server
// checks them again and has the last word.

export type StockOperation = "add" | "remove";

/** Reasons offered to the seller; sent as `reason` to the backend. */
export const ADJUSTMENT_REASONS: { value: string; label: string; operation: StockOperation }[] = [
  { value: "restock", label: "Réception de marchandise", operation: "add" },
  { value: "customer_return", label: "Retour d'un client", operation: "add" },
  { value: "inventory_count", label: "Correction après inventaire", operation: "add" },
  { value: "damaged", label: "Casse ou perte", operation: "remove" },
  { value: "offline_sale", label: "Vente hors SUGU", operation: "remove" },
  { value: "inventory_count", label: "Correction après inventaire", operation: "remove" },
];

export const MAX_ADJUSTMENT = 100_000;

/** The variants whose stock can be adjusted, default one first. Empty on an older backend. */
export function adjustableVariants(row: InventoryRow): InventoryVariant[] {
  return [...(row.variants ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
}

/** Label of a variant in the selector: its name, else its SKU, else what it is. */
export function variantLabel(variant: InventoryVariant): string {
  return variant.title ?? variant.sku ?? "Variante unique";
}

export interface AdjustmentDraft {
  operation: StockOperation;
  /** Raw text of the quantity field. */
  quantity: string;
  /** Current stock of what is adjusted. */
  currentStock: number;
}

export interface AdjustmentCheck {
  /** Signed quantity to send, when the draft is valid. */
  delta: number | null;
  /** Stock after the adjustment, when the draft is valid. */
  resultingStock: number | null;
  error: string | null;
}

export function checkAdjustment({ operation, quantity, currentStock }: AdjustmentDraft): AdjustmentCheck {
  const invalid = (error: string): AdjustmentCheck => ({ delta: null, resultingStock: null, error });
  const text = quantity.trim();

  if (text === "") return invalid("Indiquez une quantité.");
  if (!/^\d+$/.test(text)) return invalid("La quantité est un nombre entier, sans signe ni décimale.");

  const units = Number(text);
  if (units === 0) return invalid("La quantité doit être d'au moins 1.");
  if (units > MAX_ADJUSTMENT) return invalid(`La quantité ne peut pas dépasser ${MAX_ADJUSTMENT.toLocaleString("fr-FR")}.`);
  if (operation === "remove" && units > currentStock) {
    return invalid(`Vous ne pouvez pas retirer plus que le stock actuel (${currentStock.toLocaleString("fr-FR")}).`);
  }

  const delta = operation === "add" ? units : -units;
  return { delta, resultingStock: currentStock + delta, error: null };
}
