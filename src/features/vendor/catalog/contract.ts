import { z } from "zod";
import { asFrancs, type MoneyFrancs } from "@/design-system";

// ============================================================
// Seller catalogue — contract with `sellers/products/*` and
// `sellers/inventory/*` (Laravel: SellerProductController,
// ProductResource, SellerInventoryController).
//
// Units: prices are answered in FRANCS (`price`, `compareAtPrice`);
// `price_amount` and `compareAtAmount` are the stored centimes and
// are never read here. Nothing multiplies or divides by 100.
//
// Statuses are kept as the backend code. `statusCode` is the real
// product status; the older `status` folds submitted, rejected,
// changes requested and suspended into "draft" and is only read
// when `statusCode` is absent.
// ============================================================

/** `App\Enums\Products\ProductStatus`, as ProductResource::statusCode names it. */
export const PRODUCT_STATUS_CODES = [
  "active",
  "draft",
  "submitted",
  "changes_requested",
  "rejected",
  "suspended",
  "unpublished",
  "archived",
] as const;

/**
 * Publication changes the seller makes alone (POST sellers/products/{id}/status),
 * as ProductResource `sellerActions` lists them for each product:
 * `unpublished` takes an approved product offline, `published` puts it back
 * online without a new review, `draft` and `archived` are what they say.
 */
export const PUBLICATION_ACTIONS = ["published", "unpublished", "draft", "archived"] as const;
export type PublicationAction = (typeof PUBLICATION_ACTIONS)[number];

function publicationActionsOf(raw: string[] | null | undefined): PublicationAction[] {
  // An older backend says nothing: no action rather than one it would refuse.
  return (raw ?? []).filter((code): code is PublicationAction => (PUBLICATION_ACTIONS as readonly string[]).includes(code));
}

export const STOCK_LEVELS = ["in_stock", "low_stock", "out_of_stock"] as const;
export type StockLevel = (typeof STOCK_LEVELS)[number];

const nullableString = z.string().nullish().transform((value) => value || null);
const amount = z.number().finite();
const id = z.union([z.string().min(1), z.number()]).transform(String);

/** Stand-in pictures some endpoints answer when a product has none. */
const PLACEHOLDER_IMAGE = /fallback-product|via\.placeholder\.com/;

/** A real picture URL, or null: a stand-in is not a picture of the product. */
function pictureOf(...candidates: (string | null | undefined)[]): string | null {
  for (const url of candidates) {
    if (url && !PLACEHOLDER_IMAGE.test(url)) return url;
  }
  return null;
}

/** Older backend: `published` for an active product, no `statusCode`. */
function statusOf(statusCode: string | null, legacy: string | null): string {
  if (statusCode) return statusCode;
  return legacy === "published" ? "active" : (legacy ?? "draft");
}

// ── List ────────────────────────────────────────────────────

const rawListItemSchema = z.object({
  id,
  name: z.string(),
  sku: nullableString,
  image: nullableString,
  main_image: nullableString,
  price: amount,
  compareAtPrice: amount.nullish(),
  hasVariants: z.boolean().nullish(),
  stock: z.number().int().nullish(),
  status: nullableString,
  statusCode: nullableString,
  sellerActions: z.array(z.string()).nullish(),
  stockStatus: nullableString,
  category: nullableString,
  variants: z.array(z.unknown()).nullish(),
  createdAt: nullableString,
  updatedAt: nullableString,
});

export interface ProductListItem {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  priceFrancs: MoneyFrancs;
  /** Crossed-out price; null when the product has none. */
  compareAtFrancs: MoneyFrancs | null;
  /** Units in stock over the active variants; null when the backend did not say. */
  stock: number | null;
  stockLevel: string | null;
  status: string;
  /** Publication changes the seller may make now, said by the backend. */
  publicationActions: PublicationAction[];
  category: string | null;
  hasVariants: boolean;
  variantCount: number;
  createdAt: string | null;
}

export function parseProductListItem(raw: unknown): ProductListItem {
  const item = rawListItemSchema.parse(raw);
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    image: pictureOf(item.main_image, item.image),
    priceFrancs: asFrancs(item.price),
    compareAtFrancs: item.compareAtPrice ? asFrancs(item.compareAtPrice) : null,
    stock: item.stock ?? null,
    stockLevel: item.stockStatus,
    status: statusOf(item.statusCode, item.status),
    publicationActions: publicationActionsOf(item.sellerActions),
    category: item.category,
    hasVariants: Boolean(item.hasVariants),
    variantCount: item.variants?.length ?? 0,
    createdAt: item.createdAt,
  };
}

export interface ProductListPage {
  rows: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
}

const rawListSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
});

export function parseProductListPage(raw: unknown, requested: { page: number; pageSize: number }): ProductListPage {
  const list = rawListSchema.parse(raw);
  return { rows: list.data.map(parseProductListItem), total: list.total, page: requested.page, pageSize: requested.pageSize };
}

// ── Counters ────────────────────────────────────────────────

const counters = z.record(z.number().int().nonnegative());

const rawStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  published: z.number().int().nonnegative().optional(),
  drafts: z.number().int().nonnegative().optional(),
  outOfStock: z.number().int().nonnegative().optional(),
  byStatus: counters.optional(),
  byStock: counters.optional(),
  byCategory: z.array(z.object({ id, name: z.string(), count: z.number().int().nonnegative() })).optional(),
});

/** A category the catalogue is filed under, with the number of products in it. */
export interface CategoryCount {
  id: string;
  name: string;
  count: number;
}

export interface ProductCounts {
  total: number;
  /**
   * Count per status or stock level, only for those the backend counted.
   * A missing entry is UNKNOWN, not zero: nothing is obtained by
   * subtracting the others from the total.
   */
  byStatus: Partial<Record<string, number>>;
  byStock: Partial<Record<string, number>>;
  /**
   * The categories that hold products of this seller, by name: what a
   * category filter can offer. Null on a backend that does not list them.
   */
  byCategory: CategoryCount[] | null;
}

export function parseProductCounts(raw: unknown): ProductCounts {
  const stats = rawStatsSchema.parse(raw);

  // Older backend: three exact counters. `drafts` there counts drafts only,
  // while its `draft` filter also returned submitted and rejected products:
  // the number would not match the tab, so it is not shown.
  const byStatus: Partial<Record<string, number>> = stats.byStatus ?? {};
  if (!stats.byStatus && stats.published !== undefined) byStatus.active = stats.published;

  const byStock: Partial<Record<string, number>> = stats.byStock ?? {};
  if (!stats.byStock && stats.outOfStock !== undefined) byStock.out_of_stock = stats.outOfStock;

  return { total: stats.total, byStatus, byStock, byCategory: stats.byCategory ?? null };
}

// ── Detail ──────────────────────────────────────────────────

const rawBulkPriceSchema = z.object({ id, minQty: z.number().int(), price: amount, isActive: z.boolean().nullish() });

const rawVariantSchema = z.object({
  id,
  title: nullableString,
  sku: nullableString,
  price: amount.nullish(),
  stock: z.number().int().nullish(),
  isActive: z.boolean().nullish(),
  isDefault: z.boolean().nullish(),
  trackStock: z.boolean().nullish(),
  allowBackorder: z.boolean().nullish(),
  lowStockThreshold: z.number().int().nullish(),
  minOrderQuantity: z.number().int().nullish(),
  options: z.record(z.unknown()).nullish(),
  bulkPrices: z.array(rawBulkPriceSchema).nullish(),
});

const rawDetailSchema = rawListItemSchema.extend({
  brand: nullableString,
  category_ids: z.array(id).nullish(),
  canSubmit: z.boolean().nullish(),
  // `ProductCondition` value: an integer, or "new" when the product has none.
  condition: z.union([z.string(), z.number()]).nullish().transform((value) => (value == null || value === "" ? null : String(value))),
  minOrderQuantity: z.number().int().nullish(),
  description: nullableString,
  shortDescription: nullableString,
  country_of_origin: nullableString,
  weight: z.number().nullish(),
  dimensions: z
    .object({ length: z.number().nullish(), width: z.number().nullish(), height: z.number().nullish() })
    .nullish(),
  gallery: z.array(z.object({ id, url: z.string(), is_main: z.boolean().nullish() })).nullish(),
  variants: z.array(rawVariantSchema).nullish(),
  bulkPrices: z.array(rawBulkPriceSchema).nullish(),
  moderation: z
    .object({
      rejectionReason: nullableString,
      notePublic: nullableString,
      reviewedAt: nullableString,
      submittedAt: nullableString,
    })
    .nullish(),
});

export interface ProductVariant {
  id: string;
  /** "Rouge / L"; null for the single variant of a simple product. */
  title: string | null;
  sku: string | null;
  priceFrancs: MoneyFrancs | null;
  stock: number;
  isActive: boolean;
  isDefault: boolean;
  trackStock: boolean;
  allowBackorder: boolean;
  lowStockThreshold: number | null;
  minOrderQuantity: number | null;
  /** Option name → value, e.g. { Couleur: "Rouge" }. */
  options: Record<string, string>;
  bulkPrices: ProductBulkPrice[];
}

export interface ProductBulkPrice {
  id: string;
  minQuantity: number;
  priceFrancs: MoneyFrancs;
}

export interface ProductPicture {
  id: string;
  url: string;
  isMain: boolean;
}

export interface ProductModeration {
  /** Why the product was rejected or sent back, as written for the seller. */
  reason: string | null;
  note: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

export interface ProductDetail extends ProductListItem {
  brand: string | null;
  categoryIds: string[];
  /**
   * Whether the product can be sent to moderation now. Said by the backend
   * (`canSubmit`); on an older backend, derived from the workflow: draft,
   * rejected and changes requested.
   */
  canSubmit: boolean;
  /** `App\Enums\Products\ProductCondition` value, as sent. */
  condition: string | null;
  minOrderQuantity: number;
  /** HTML sanitised by the backend (HtmlSanitizer::sanitizeRichText). */
  descriptionHtml: string | null;
  shortDescription: string | null;
  originCountry: string | null;
  weightGrams: number | null;
  /** Millimetres, as stored; null when none is set. */
  dimensionsMm: { length: number | null; width: number | null; height: number | null } | null;
  pictures: ProductPicture[];
  variants: ProductVariant[];
  bulkPrices: ProductBulkPrice[];
  moderation: ProductModeration | null;
  updatedAt: string | null;
}

function optionsOf(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const options: Record<string, string> = {};
  for (const [name, value] of Object.entries(raw ?? {})) {
    if (typeof value === "string" || typeof value === "number") options[name] = String(value);
  }
  return options;
}

/** The backend titles the single variant of a simple product "Default". */
function variantTitle(title: string | null): string | null {
  return title && title !== "Default" ? title : null;
}

export function parseProductDetail(raw: unknown): ProductDetail {
  const product = rawDetailSchema.parse(raw);
  const dimensions = product.dimensions;
  const hasDimensions = dimensions && [dimensions.length, dimensions.width, dimensions.height].some((value) => value != null);
  const moderation = product.moderation;
  const hasModeration =
    moderation && [moderation.rejectionReason, moderation.notePublic, moderation.submittedAt, moderation.reviewedAt].some(Boolean);

  const tiersOf = (tiers: z.infer<typeof rawBulkPriceSchema>[] | null | undefined): ProductBulkPrice[] =>
    (tiers ?? [])
      .filter((tier) => tier.isActive !== false)
      .map((tier) => ({ id: tier.id, minQuantity: tier.minQty, priceFrancs: asFrancs(tier.price) }))
      .sort((a, b) => a.minQuantity - b.minQuantity);

  const variants = (product.variants ?? []).map((variant) => ({
    id: variant.id,
    title: variantTitle(variant.title),
    sku: variant.sku,
    priceFrancs: variant.price == null ? null : asFrancs(variant.price),
    stock: variant.stock ?? 0,
    isActive: variant.isActive ?? true,
    isDefault: Boolean(variant.isDefault),
    trackStock: variant.trackStock ?? true,
    allowBackorder: Boolean(variant.allowBackorder),
    lowStockThreshold: variant.lowStockThreshold ?? null,
    minOrderQuantity: variant.minOrderQuantity ?? null,
    options: optionsOf(variant.options),
    bulkPrices: tiersOf(variant.bulkPrices),
  }));
  const listItem = parseProductListItem(raw);

  return {
    ...listItem,
    variantCount: variants.length,
    brand: product.brand,
    categoryIds: product.category_ids ?? [],
    canSubmit: product.canSubmit ?? ["draft", "rejected", "changes_requested"].includes(listItem.status),
    condition: product.condition,
    minOrderQuantity: Math.max(1, product.minOrderQuantity ?? 1),
    descriptionHtml: product.description,
    shortDescription: product.shortDescription,
    originCountry: product.country_of_origin,
    weightGrams: product.weight ?? null,
    dimensionsMm: hasDimensions
      ? { length: dimensions.length ?? null, width: dimensions.width ?? null, height: dimensions.height ?? null }
      : null,
    pictures: (product.gallery ?? [])
      .filter((picture) => !PLACEHOLDER_IMAGE.test(picture.url))
      .map((picture) => ({ id: picture.id, url: picture.url, isMain: Boolean(picture.is_main) })),
    variants,
    bulkPrices: tiersOf(product.bulkPrices),
    moderation: hasModeration
      ? {
          reason: moderation.rejectionReason,
          note: moderation.notePublic,
          submittedAt: moderation.submittedAt,
          reviewedAt: moderation.reviewedAt,
        }
      : null,
    updatedAt: product.updatedAt,
  };
}

// ── Inventory ───────────────────────────────────────────────

const rawInventoryVariantSchema = z.object({
  id,
  title: nullableString,
  sku: nullableString,
  stock: z.number().int(),
  isDefault: z.boolean().nullish(),
  isActive: z.boolean().nullish(),
});

const rawInventoryRowSchema = z.object({
  id,
  name: z.string(),
  sku: nullableString,
  image: nullableString,
  imageUrl: nullableString,
  category: nullableString,
  stock_available: z.number().int(),
  status: nullableString,
  stockStatusCode: nullableString,
  updatedAt: nullableString,
  hasVariants: z.boolean().nullish(),
  variants: z.array(rawInventoryVariantSchema).nullish(),
});

export interface InventoryVariant {
  id: string;
  title: string | null;
  sku: string | null;
  stock: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface InventoryRow {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  category: string | null;
  /** Units over the active variants. */
  stock: number;
  stockLevel: string | null;
  updatedAt: string | null;
  /**
   * Where the stock is. Null on an older backend, which does not list the
   * variants: the stock can then only be adjusted on the product as a whole.
   */
  variants: InventoryVariant[] | null;
}

/** French codes of the older inventory endpoint → stock levels. */
const LEGACY_STOCK_LEVEL: Record<string, StockLevel> = {
  disponible: "in_stock",
  faible: "low_stock",
  rupture: "out_of_stock",
};

export function parseInventoryRow(raw: unknown): InventoryRow {
  const row = rawInventoryRowSchema.parse(raw);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    image: pictureOf(row.imageUrl, row.image),
    category: row.category,
    stock: row.stock_available,
    stockLevel: row.stockStatusCode ?? (row.status ? (LEGACY_STOCK_LEVEL[row.status] ?? row.status) : null),
    updatedAt: row.updatedAt,
    variants: row.variants
      ? row.variants.map((variant) => ({
          id: variant.id,
          title: variantTitle(variant.title),
          sku: variant.sku,
          stock: variant.stock,
          isDefault: Boolean(variant.isDefault),
          isActive: variant.isActive ?? true,
        }))
      : null,
  };
}

export interface InventoryPage {
  rows: InventoryRow[];
  total: number;
  page: number;
  pageSize: number;
}

const rawInventorySchema = z.object({
  items: z.array(z.unknown()),
  pagination: z.object({ total: z.number().int().nonnegative() }),
});

export function parseInventoryPage(raw: unknown, requested: { page: number; pageSize: number }): InventoryPage {
  const list = rawInventorySchema.parse(raw);
  return { rows: list.items.map(parseInventoryRow), total: list.pagination.total, page: requested.page, pageSize: requested.pageSize };
}

const adjustmentSchema = z.object({ variantId: id, stock: z.number().int() }).nullish();

/** New stock of the adjusted variant; null when the backend does not answer it. */
export function parseStockAdjustment(raw: unknown): { variantId: string; stock: number } | null {
  return adjustmentSchema.parse(raw) ?? null;
}
