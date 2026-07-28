import { createProductRequestSchema, type CreateProductRequest } from "../schema";

interface ProductMutationTier {
  minQty: string;
  price: string;
}

interface ProductMutationVariant {
  id: string;
  combination: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  minOrderQuantity: string;
  trackStock: boolean;
  allowBackorder: boolean;
  lowStockThreshold: string;
  bulkTiers: ProductMutationTier[];
}

export interface ProductMutationFormData {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  stock: string;
  minOrderQuantity: string;
  alertThreshold: string;
  autoTrackStock: boolean;
  weightValue: string;
  weightUnit: string;
  origin?: string;
  publishMode: "publish" | "draft";
  hasBulkPricing: boolean;
  bulkTiers: ProductMutationTier[];
  hasVariants: boolean;
  generatedVariants: ProductMutationVariant[];
}

const WEIGHT_UNIT_MAP: Record<string, "kg" | "g" | "lb"> = {
  Gramme: "g",
  Kilogramme: "kg",
};

const ORIGIN_LABEL_TO_CODE: Record<string, string> = {
  Mali: "ML",
  Sénégal: "SN",
  "Côte d'Ivoire": "CI",
  "Burkina Faso": "BF",
  Ghana: "GH",
  Guinée: "GN",
  Niger: "NE",
  Togo: "TG",
  Bénin: "BJ",
  Cameroun: "CM",
};

export function transformProductRequest(
  formData: ProductMutationFormData,
  categoryIds?: string[],
): CreateProductRequest {
  const price = parseFloat(formData.price) || 0;
  const compareAtPrice = formData.originalPrice.trim() ? parseFloat(formData.originalPrice) : null;
  const stock = parseInt(formData.stock) || 0;
  const minOrderQuantity = parseInt(formData.minOrderQuantity);
  const lowStockThreshold = parseInt(formData.alertThreshold);
  const weightValue = parseFloat(formData.weightValue) || 0;
  const weightUnit = WEIGHT_UNIT_MAP[formData.weightUnit] ?? "g";
  const weight = weightValue > 0 ? weightValue : undefined;
  const status = formData.publishMode === "publish" ? "published" : "draft";
  const bulkPrices = formData.hasBulkPricing
    ? formData.bulkTiers.map((tier) => ({
        minQty: parseInt(tier.minQty),
        price: parseFloat(tier.price),
      }))
    : [];

  const hasVariants = Boolean(formData.hasVariants && formData.generatedVariants.length);
  const variants = hasVariants
    ? formData.generatedVariants.map((variant) => ({
        options: variant.combination,
        price: Number(variant.price),
        stock: Number(variant.stock),
        sku: variant.sku || undefined,
        minOrderQuantity: variant.minOrderQuantity.trim()
          ? parseInt(variant.minOrderQuantity)
          : null,
        trackStock: variant.trackStock,
        allowBackorder: variant.allowBackorder,
        lowStockThreshold: parseInt(variant.lowStockThreshold),
        bulkPrices: variant.bulkTiers.map((tier) => ({
          minQty: parseInt(tier.minQty),
          price: parseFloat(tier.price),
        })),
      }))
    : [];

  return createProductRequestSchema.parse({
    name: formData.name,
    description: formData.description,
    price,
    compareAtPrice,
    stock,
    minOrderQuantity,
    trackStock: formData.autoTrackStock,
    lowStockThreshold,
    allowBackorder: false,
    primary_category_id: categoryIds?.[0],
    category: categoryIds,
    country_of_origin: formData.origin ? ORIGIN_LABEL_TO_CODE[formData.origin] : undefined,
    status,
    weight,
    weightUnit,
    currency: "XOF",
    hasBulkPricing: formData.hasBulkPricing,
    bulkPrices,
    hasVariants,
    variants,
  });
}
