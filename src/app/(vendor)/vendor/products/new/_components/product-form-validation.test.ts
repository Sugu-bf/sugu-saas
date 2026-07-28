import { describe, expect, it } from "vitest";
import { transformProductRequest } from "@/features/vendor/services/product-mutation-contract";
import { validateProductForm } from "./product-form-validation";
import type { ProductFormData } from "./types";

function productForm(overrides: Partial<ProductFormData> = {}): ProductFormData {
  return {
    name: "T-shirt",
    description: "Description",
    mainCategory: "Mode",
    subCategory: "Vêtements",
    tags: [],
    origin: "Burkina Faso",
    weightValue: "250",
    weightUnit: "Gramme",
    price: "5000",
    originalPrice: "6000",
    stock: "12",
    minOrderQuantity: "2",
    alertThreshold: "3",
    autoTrackStock: true,
    hasVariants: false,
    variantAxes: [],
    generatedVariants: [],
    hasBulkPricing: false,
    bulkTiers: [],
    publishMode: "publish",
    photos: [],
    categoryIds: ["category-1"],
    ...overrides,
  };
}

describe("seller product mutation contract", () => {
  it("serializes explicit false flags so update can clear variants and bulk prices", () => {
    const payload = transformProductRequest(
      productForm({
        originalPrice: "",
        hasVariants: false,
        hasBulkPricing: false,
      }),
      ["category-1"],
    );

    expect(payload).toMatchObject({
      compareAtPrice: null,
      hasVariants: false,
      variants: [],
      hasBulkPricing: false,
      bulkPrices: [],
      minOrderQuantity: 2,
      trackStock: true,
      lowStockThreshold: 3,
    });
  });

  it("keeps exact variant inventory, MOQ and bulk tiers", () => {
    const form = productForm({
      hasVariants: true,
      variantAxes: [
        {
          id: "axis-color",
          name: "Couleur",
          values: [{ id: "red", value: "Rouge" }],
        },
      ],
      generatedVariants: [
        {
          id: "variant-red",
          combination: { Couleur: "Rouge" },
          price: "5500",
          stock: "7",
          sku: "TS-RED",
          minOrderQuantity: "3",
          trackStock: true,
          allowBackorder: false,
          lowStockThreshold: "2",
          bulkTiers: [
            { id: "tier-1", minQty: "5", price: "5000" },
            { id: "tier-2", minQty: "10", price: "4500" },
          ],
        },
      ],
    });

    expect(validateProductForm(form, "publish")).toBeNull();
    expect(transformProductRequest(form, form.categoryIds).variants?.[0]).toEqual({
      options: { Couleur: "Rouge" },
      price: 5500,
      stock: 7,
      sku: "TS-RED",
      minOrderQuantity: 3,
      trackStock: true,
      allowBackorder: false,
      lowStockThreshold: 2,
      bulkPrices: [
        { minQty: 5, price: 5000 },
        { minQty: 10, price: 4500 },
      ],
    });
  });

  it("rejects inconsistent compare-at prices and non-decreasing bulk tiers", () => {
    expect(
      validateProductForm(
        productForm({
          originalPrice: "4000",
        }),
        "publish",
      ),
    ).toContain("prix barré");

    expect(
      validateProductForm(
        productForm({
          hasBulkPricing: true,
          bulkTiers: [
            { id: "tier-1", minQty: "5", price: "4000" },
            { id: "tier-2", minQty: "10", price: "4500" },
          ],
        }),
        "publish",
      ),
    ).toContain("doit diminuer");
  });
});
