// Payloads shaped like ProductResource and SellerInventoryController::getProducts
// (../sugu). Prices in francs, as the backend answers them next to the centimes.

type Overrides = Record<string, unknown>;

export function productRow(overrides: Overrides = {}): Record<string, unknown> {
  return {
    id: "01JPRODUCT00000000000000A1",
    name: "Pagne tissé Faso Dan Fani",
    sku: "FDF-0042",
    brand: "",
    brand_id: null,
    image: "https://cdn.sugu.pro/s/theme/fallback-product.png",
    main_image: null,
    gallery: [],
    all_images: [],
    original_images: [],
    price: 7500,
    compareAtAmount: null,
    compareAtPrice: null,
    currency: "XOF",
    hasVariants: false,
    defaultVariantId: "v1",
    minOrderQuantity: 1,
    stock: 12,
    status: "published",
    statusCode: "active",
    moderationStatus: "approved",
    stockStatus: "in_stock",
    condition: 0,
    channel: "sugu",
    category: "Textile",
    primary_category_id: "c1",
    category_ids: ["c1"],
    country_of_origin: "BF",
    weight: 350,
    dimensions: { length: null, width: null, height: null },
    bulkPrices: [],
    variants: [{ id: "v1", title: null, sku: null, price_amount: 750000, price: 7500, stock: 12, isActive: true, isDefault: false, options: {} }],
    description: "<p>Tissé à la main.</p>",
    shortDescription: "Pagne traditionnel",
    createdAt: "2026-09-12T10:00:00.000000Z",
    updatedAt: "2026-10-01T08:30:00.000000Z",
    ...overrides,
  };
}

export function productDetail(overrides: Overrides = {}): Record<string, unknown> {
  return productRow({
    hasVariants: true,
    stock: 7,
    stockStatus: "low_stock",
    main_image: "https://cdn.sugu.pro/p/pagne-1.jpg",
    gallery: [
      { id: 11, url: "https://cdn.sugu.pro/p/pagne-1.jpg", type: "image/jpeg", is_main: true, background_removed: false },
      { id: 12, url: "https://cdn.sugu.pro/p/pagne-2.jpg", type: "image/jpeg", is_main: false, background_removed: false },
    ],
    compareAtPrice: 9000,
    compareAtAmount: 900000,
    bulkPrices: [
      { id: "b2", minQty: 20, price: 6500, currency: "XOF", isActive: true },
      { id: "b1", minQty: 10, price: 7000, currency: "XOF", isActive: true },
      { id: "b3", minQty: 50, price: 6000, currency: "XOF", isActive: false },
    ],
    variants: [
      { id: "v1", title: "Rouge / M", sku: "FDF-R-M", price_amount: 750000, price: 7500, stock: 4, isActive: true, isDefault: true, options: { Couleur: "Rouge", Taille: "M" }, bulkPrices: [] },
      { id: "v2", title: "Bleu / L", sku: "FDF-B-L", price_amount: 800000, price: 8000, stock: 3, isActive: true, isDefault: false, options: { Couleur: "Bleu", Taille: "L" }, bulkPrices: [] },
      { id: "v3", title: "Vert / S", sku: "FDF-V-S", price_amount: 750000, price: 7500, stock: 25, isActive: false, isDefault: false, options: {}, bulkPrices: [] },
    ],
    moderation: {
      status: 1,
      statusLabel: "Approuvé",
      statusColor: "green",
      rejectionReason: null,
      notePublic: null,
      reviewedAt: "2026-09-13T09:00:00.000000Z",
      submittedAt: "2026-09-12T10:05:00.000000Z",
      reviewer: { id: "sugu", name: "Sugu" },
      submitter: null,
      logs: [],
    },
    ...overrides,
  });
}

export function inventoryRow(overrides: Overrides = {}): Record<string, unknown> {
  return {
    id: "01JPRODUCT00000000000000A1",
    name: "Pagne tissé Faso Dan Fani",
    sku: "FDF-0042",
    image: "/images/fallback-product.png",
    category: "Textile",
    variants_count: 2,
    stock_available: 7,
    stock_reserved: 0,
    stock_alert_threshold: 10,
    status: "faible",
    last_updated: "il y a 2 heures",
    imageUrl: null,
    stockStatusCode: "low_stock",
    updatedAt: "2026-10-01T08:30:00.000000Z",
    hasVariants: true,
    variants: [
      { id: "v1", title: "Rouge / M", sku: "FDF-R-M", stock: 4, isDefault: true, isActive: true, allowBackorder: false },
      { id: "v2", title: "Bleu / L", sku: "FDF-B-L", stock: 3, isDefault: false, isActive: true, allowBackorder: false },
    ],
    ...overrides,
  };
}
