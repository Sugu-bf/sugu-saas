import { api, apiFetch } from "@/lib/http/client";
import { ApiError } from "@/lib/http/api-error";
import {
  parseInventoryPage,
  parseProductCounts,
  parseProductDetail,
  parseProductListPage,
  parseStockAdjustment,
  type InventoryPage,
  type ProductCounts,
  type ProductDetail,
  type ProductListPage,
  type StockLevel,
} from "./contract";

// ============================================================
// Seller catalogue — HTTP calls. Every call goes through the BFF;
// Laravel authorises each one (scope: the seller's own stores).
// Search, sort, filters and pagination are done by the server over
// the whole catalogue, never on the rows loaded in the page.
// ============================================================

export const PRODUCTS_PAGE_SIZE = 24;
export const INVENTORY_PAGE_SIZE = 25;

export type ProductSortKey = "created" | "name" | "price" | "stock";

/** Filters of the product list, as `GET sellers/products` understands them. */
export interface ProductListFilters {
  status?: string;
  /** Id of a category: the products filed under it as their primary category. */
  category?: string;
  stock?: StockLevel;
  search?: string;
  sort?: ProductSortKey;
  direction?: "asc" | "desc";
}

export interface ProductListQuery extends ProductListFilters {
  page: number;
}

export async function fetchProducts(query: ProductListQuery): Promise<ProductListPage> {
  const response = await api.get<{ data: unknown }>("sellers/products", {
    params: {
      status: query.status || undefined,
      category: query.category || undefined,
      stock: query.stock,
      search: query.search?.trim() || undefined,
      sort: query.sort,
      direction: query.direction,
      page: query.page,
      limit: PRODUCTS_PAGE_SIZE,
    },
  });
  return parseProductListPage(response.data, { page: query.page, pageSize: PRODUCTS_PAGE_SIZE });
}

export async function fetchProductCounts(): Promise<ProductCounts> {
  const response = await api.get<{ data: unknown }>("sellers/products/stats");
  return parseProductCounts(response.data);
}

export async function fetchProduct(id: string): Promise<ProductDetail> {
  const response = await api.get<{ data: unknown }>(`sellers/products/${encodeURIComponent(id)}`);
  return parseProductDetail(response.data);
}

/** Removes the product from the catalogue (soft delete on the server). */
export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`sellers/products/${encodeURIComponent(id)}`);
}

// ── Inventory ───────────────────────────────────────────────

export type InventorySortKey = "updated" | "name" | "stock";

export interface InventoryFilters {
  level?: StockLevel;
  search?: string;
  sort?: InventorySortKey;
  direction?: "asc" | "desc";
}

export interface InventoryQuery extends InventoryFilters {
  page: number;
}

/** Stock levels as `GET sellers/inventory/products` names them. */
const LEVEL_PARAM: Record<StockLevel, string> = {
  in_stock: "disponible",
  low_stock: "stock_faible",
  out_of_stock: "rupture",
};

function inventoryParams(filters: InventoryFilters): Record<string, string | undefined> {
  return {
    status: filters.level ? LEVEL_PARAM[filters.level] : undefined,
    search: filters.search?.trim() || undefined,
    sort: `${filters.sort ?? "updated"}_${filters.direction ?? "desc"}`,
  };
}

export async function fetchInventory(query: InventoryQuery): Promise<InventoryPage> {
  const response = await api.get<{ data: unknown }>("sellers/inventory/products", {
    params: { ...inventoryParams(query), page: query.page, limit: INVENTORY_PAGE_SIZE },
  });
  return parseInventoryPage(response.data, { page: query.page, pageSize: INVENTORY_PAGE_SIZE });
}

export interface StockAdjustment {
  productId: string;
  /** The variant holding the stock; omitted, the server takes the default one. */
  variantId?: string;
  /** Units added (positive) or removed (negative). Never zero. */
  quantity: number;
  reason?: string;
}

export async function adjustStock(adjustment: StockAdjustment): Promise<{ variantId: string; stock: number } | null> {
  const response = await api.post<{ data?: unknown }>(
    `sellers/inventory/${encodeURIComponent(adjustment.productId)}/add-stock`,
    {
      quantity: adjustment.quantity,
      ...(adjustment.variantId ? { variant_id: adjustment.variantId } : {}),
      ...(adjustment.reason ? { reason: adjustment.reason } : {}),
    },
  );
  return parseStockAdjustment(response.data);
}

/**
 * CSV of the whole inventory, one line per variant, built by the server.
 * A backend older than V2 answers a JSON table instead of a file: that is
 * reported as a failure, the table is not turned into a file here.
 */
export async function exportInventoryCsv(): Promise<void> {
  let response: Response;
  try {
    response = await apiFetch("sellers/inventory/export", {
      method: "POST",
      headers: { Accept: "text/csv", "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv" }),
    });
  } catch {
    throw new ApiError({ message: "Network error", status: 0, code: "NETWORK" });
  }
  if (!response.ok) throw new ApiError({ message: `HTTP ${response.status}`, status: response.status });
  if (!(response.headers.get("content-type") ?? "").includes("text/csv")) {
    throw new ApiError({ message: "HTTP 501", status: 501 });
  }

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `inventaire-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Product form ────────────────────────────────────────────

export interface ProductCategoryOption {
  id: string;
  name: string;
}

/** Active categories a product can be filed under. */
export async function fetchProductCategories(): Promise<ProductCategoryOption[]> {
  const response = await api.get<{ data: { id: string | number; name: string }[] }>("sellers/products/categories");
  return (response.data ?? []).map((category) => ({ id: String(category.id), name: category.name }));
}

/**
 * Stores the product and answers its id. Creation always saves a draft; an
 * update never changes the status. `body` comes from `buildProductBody`.
 */
export async function saveProduct(body: FormData, id?: string): Promise<string> {
  const path = id ? `sellers/products/${encodeURIComponent(id)}` : "sellers/products";
  const response = await api.post<{ data: { id: string | number } }>(path, body);
  return String(response.data.id);
}

/**
 * Queues the product for moderation. Refused (422) when its status does not
 * allow it or when it misses what a moderator needs; the message says what.
 */
export async function submitProduct(id: string): Promise<void> {
  await api.post(`sellers/products/${encodeURIComponent(id)}/submit`);
}
