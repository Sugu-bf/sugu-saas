import { ApiError } from "@/lib/http/api-error";
import type { PriceTier, ProductFormData } from "./types";

interface ValidationOptions {
  requirePriceForDraft?: boolean;
}

function isIntegerInRange(value: string, minimum: number, maximum?: number): boolean {
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return parsed >= minimum && (maximum === undefined || parsed <= maximum);
}

function validateTiers(tiers: PriceTier[], label: string): string | null {
  if (tiers.length === 0) {
    return `${label} : ajoutez au moins un palier ou désactivez les tarifs de gros.`;
  }

  const normalized: Array<{ minQty: number; price: number }> = [];
  const seenMinimums = new Set<number>();

  for (const tier of tiers) {
    if (!isIntegerInRange(tier.minQty, 1, 500)) {
      return `${label} : chaque quantité minimum doit être un entier entre 1 et 500.`;
    }
    const price = Number(tier.price);
    if (!tier.price.trim() || !Number.isFinite(price) || price <= 0) {
      return `${label} : chaque prix unitaire doit être supérieur à zéro.`;
    }

    const minQty = Number(tier.minQty);
    if (seenMinimums.has(minQty)) {
      return `${label} : deux paliers ne peuvent pas avoir la même quantité minimum.`;
    }
    seenMinimums.add(minQty);
    normalized.push({ minQty, price });
  }

  normalized.sort((left, right) => left.minQty - right.minQty);
  for (let index = 1; index < normalized.length; index += 1) {
    if (normalized[index].price >= normalized[index - 1].price) {
      return `${label} : le prix doit diminuer quand la quantité augmente.`;
    }
  }

  return null;
}

export function validateProductForm(
  data: ProductFormData,
  mode: "publish" | "draft",
  options: ValidationOptions = {},
): string | null {
  if (!data.name.trim()) return "Le nom du produit est obligatoire.";

  const price = Number(data.price);
  const priceRequired = mode === "publish" || options.requirePriceForDraft;
  if (
    (priceRequired && !data.price.trim()) ||
    !Number.isFinite(price) ||
    price < 0 ||
    (priceRequired && price <= 0)
  ) {
    return "Le prix de vente doit être supérieur à zéro.";
  }

  if (data.originalPrice.trim()) {
    const originalPrice = Number(data.originalPrice);
    if (!Number.isFinite(originalPrice) || originalPrice < price) {
      return "Le prix barré doit être supérieur ou égal au prix de vente.";
    }
  }

  if (!isIntegerInRange(data.stock, 0)) {
    return "Le stock doit être un entier positif ou nul.";
  }
  if (!isIntegerInRange(data.alertThreshold, 0)) {
    return "Le seuil d’alerte doit être un entier positif ou nul.";
  }
  if (!isIntegerInRange(data.minOrderQuantity, 1, 500)) {
    return "La quantité minimum de commande doit être comprise entre 1 et 500.";
  }

  if (mode === "publish" && data.categoryIds.length === 0) {
    return "Sélectionnez au moins une catégorie.";
  }

  if (data.hasBulkPricing) {
    const tierError = validateTiers(data.bulkTiers, "Tarifs de gros du produit");
    if (tierError) return tierError;
  }

  if (!data.hasVariants) return null;
  if (data.variantAxes.length === 0) {
    return "Ajoutez au moins un axe de variantes.";
  }
  if (data.generatedVariants.length === 0) {
    return "Ajoutez des valeurs aux axes pour générer les variantes.";
  }
  if (data.generatedVariants.length > 100) {
    return "Le produit ne peut pas contenir plus de 100 variantes.";
  }

  const axisNames = data.variantAxes.map((axis) => axis.name.trim());
  if (
    axisNames.some((name) => !name) ||
    new Set(axisNames.map((name) => name.toLocaleLowerCase("fr"))).size !== axisNames.length
  ) {
    return "Chaque axe de variantes doit avoir un nom unique.";
  }
  if (data.variantAxes.some((axis) => axis.values.length === 0)) {
    return "Chaque axe de variantes doit contenir au moins une valeur.";
  }
  const seenSkus = new Set<string>();
  const seenCombinations = new Set<string>();
  for (const [index, variant] of data.generatedVariants.entries()) {
    const variantLabel = `Variante ${index + 1}`;
    if (
      axisNames.some((axisName) => !variant.combination[axisName]?.trim()) ||
      Object.keys(variant.combination).length !== axisNames.length
    ) {
      return `${variantLabel} : la combinaison d’options est incomplète.`;
    }
    if (
      data.variantAxes.some((axis) => {
        const selectedValue = variant.combination[axis.name];
        return !axis.values.some((value) => value.value === selectedValue);
      })
    ) {
      return `${variantLabel} : une valeur d’option n’appartient plus à son axe.`;
    }

    const combinationKey = Object.entries(variant.combination)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([axis, value]) => `${axis}:${value}`)
      .join("|");
    if (seenCombinations.has(combinationKey)) {
      return `${variantLabel} : cette combinaison existe déjà.`;
    }
    seenCombinations.add(combinationKey);

    const variantPrice = Number(variant.price);
    if (!variant.price.trim() || !Number.isFinite(variantPrice) || variantPrice <= 0) {
      return `${variantLabel} : le prix doit être supérieur à zéro.`;
    }
    if (!isIntegerInRange(variant.stock, 0)) {
      return `${variantLabel} : le stock doit être un entier positif ou nul.`;
    }
    if (!isIntegerInRange(variant.minOrderQuantity, 1, 500)) {
      return `${variantLabel} : la MOQ doit être comprise entre 1 et 500.`;
    }
    if (!isIntegerInRange(variant.lowStockThreshold, 0)) {
      return `${variantLabel} : le seuil de stock doit être un entier positif ou nul.`;
    }

    const normalizedSku = variant.sku.trim().toLocaleLowerCase("fr");
    if (normalizedSku) {
      if (seenSkus.has(normalizedSku)) {
        return `${variantLabel} : ce SKU est déjà utilisé par une autre variante.`;
      }
      seenSkus.add(normalizedSku);
    }

    if (variant.bulkTiers.length > 0) {
      const tierError = validateTiers(
        variant.bulkTiers,
        `Tarifs de gros de ${variantLabel.toLowerCase()}`,
      );
      if (tierError) return tierError;
    }
  }

  return null;
}

export function productMutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const firstFieldError = Object.values(error.errors).flat()[0];
    return firstFieldError ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
