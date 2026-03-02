/**
 * Inventory Service
 * Handles: GET/POST /sellers/inventory — stats, tabs, alerts, products, stock, export
 */
import {
  vendorInventoryResponseSchema,
  type VendorInventoryResponse,
} from "../schema";
import { api } from "@/lib/http/client";

// ── Raw API Types ──────────────────────────────────────────

interface RawTabCount { id: string; label: string; count: number; color: string; }
interface RawInventoryStat { label: string; value: number; subtext?: string; icon: string; color: string; trend?: { value: string; isPositive: boolean; label: string }; }
interface RawInventoryAlert { id: string; name: string; sku: string; image: string; stock: number; status: string; actionLabel: string; }
interface RawInventoryProduct { id: string; name: string; sku: string; image: string; category: string; variants_count: number; stock_available: number; stock_reserved: number; stock_alert_threshold: number; status: string; last_updated: string; }
interface RawInventoryProductsResponse { success: boolean; data: { items: RawInventoryProduct[]; pagination: { page: number; limit: number; total: number; pages: number }; }; }

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch vendor inventory data (paginated, filterable).
 * Calls 4 endpoints in parallel.
 */
export async function getVendorInventory(
  status?: string,
  page?: number,
  search?: string,
  category?: string,
): Promise<VendorInventoryResponse> {
  const productParams: Record<string, string | number | undefined> = { page: page ?? 1, limit: 10 };
  if (search) productParams.search = search;
  if (status && status !== "all" && status !== "tous") {
    const statusMap: Record<string, string> = { inStock: "disponible", lowStock: "stock_faible", outOfStock: "rupture" };
    productParams.status = statusMap[status] ?? status;
  }
  if (category && category !== "all") productParams["filters.category"] = category;

  const [statsRes, tabsRes, alertsRes, productsRes] = await Promise.all([
    api.get<{ success: boolean; data: RawInventoryStat[] }>("sellers/inventory/stats"),
    api.get<{ success: boolean; data: RawTabCount[] }>("sellers/inventory/tabs"),
    api.get<{ success: boolean; data: RawInventoryAlert[] }>("sellers/inventory/alerts"),
    api.get<RawInventoryProductsResponse>("sellers/inventory/products", { params: productParams }),
  ]);

  const kpis = _transformInventoryStats(statsRes.data ?? [], tabsRes.data ?? []);
  const stockAlerts = (alertsRes.data ?? []).map(_transformInventoryAlert);

  const recentMovements: Array<{ id: string; type: "entry" | "exit" | "adjustment"; label: string; date: string; detail: string }> = [];

  const totalStockStat = (statsRes.data ?? []).find((s) => s.label.toLowerCase().includes("stock total"));
  const stockTrend = { value: totalStockStat?.value ?? 0, label: "Tendance de stock", badge: `${stockAlerts.length} alertes` };

  const rawProducts = productsRes.data?.items ?? [];
  const pagination = productsRes.data?.pagination ?? { page: 1, limit: 10, total: 0, pages: 1 };
  const products = rawProducts.map(_transformInventoryProduct);
  const statusCounts = _buildInventoryStatusCounts(tabsRes.data ?? []);

  return vendorInventoryResponseSchema.parse({
    kpis, stockAlerts, recentMovements, stockTrend, products, statusCounts,
    pagination: { currentPage: pagination.page, totalPages: pagination.pages, perPage: pagination.limit, totalItems: pagination.total },
  });
}

/** Add stock to an inventory product */
export async function addInventoryStock(
  productId: string, quantity: number, reason?: string, notes?: string,
): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/inventory/${productId}/add-stock`, { quantity, reason, notes });
}

/** Export inventory data as CSV */
export async function exportInventoryCSV(): Promise<{
  format: string; rows: number; columns: string[]; data: Array<Record<string, unknown>>;
}> {
  const res = await api.post<{ success: boolean; message: string; data: { format: string; rows: number; columns: string[]; data: Array<Record<string, unknown>> } }>("sellers/inventory/export");
  return res.data;
}

// ── Transformers ───────────────────────────────────────────

function _transformInventoryStats(stats: RawInventoryStat[], tabs: RawTabCount[]) {
  const totalStock = stats.find((s) => s.label.toLowerCase().includes("stock total"));
  const availableStock = stats.find((s) => s.label.toLowerCase().includes("disponible"));
  const allTab = tabs.find((t) => t.id === "tous");
  const availableTab = tabs.find((t) => t.id === "disponible");
  const lowTab = tabs.find((t) => t.id === "stock_faible");
  const outTab = tabs.find((t) => t.id === "rupture");

  return {
    stockValue: totalStock?.value ?? 0,
    stockValueChange: availableStock?.trend?.value ?? "+0%",
    productsInStock: (availableTab?.count ?? 0) + (lowTab?.count ?? 0),
    totalProducts: allTab?.count ?? 0,
    outOfStock: outTab?.count ?? 0,
    lowStock: lowTab?.count ?? 0,
    lowStockThreshold: 10,
    entriesThisMonth: availableStock?.value ?? 0,
    entriesChangeLabel: availableStock?.trend?.label ?? "vs mois dernier",
  };
}

function _transformInventoryAlert(raw: RawInventoryAlert) {
  const level = raw.status === "critical" ? "critical" as const : "low" as const;
  const remaining = raw.stock;
  let description: string;
  if (remaining <= 0) description = "En rupture de stock";
  else if (remaining <= 3) description = `Seulement ${remaining} unité${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`;
  else description = `Stock limité: ${remaining} unités`;

  return { id: raw.id, name: raw.name, image: raw.image || "", level, remaining, description, salesImpact: raw.actionLabel ?? "Commander" };
}

function _transformInventoryProduct(raw: RawInventoryProduct) {
  const statusMap: Record<string, string> = { disponible: "ok", faible: "low", rupture: "out" };
  const status = statusMap[raw.status] ?? "ok";
  const statusLabelMap: Record<string, string> = { ok: "OK", low: "Faible", out: "Rupture" };
  const stockMax = Math.max(raw.stock_available, raw.stock_alert_threshold * 6, 1);
  const stockPercent = Math.min(100, Math.round((raw.stock_available / stockMax) * 100));

  return {
    id: raw.id, name: raw.name, image: raw.image || "", sku: raw.sku || "", category: raw.category || "",
    stockCurrent: raw.stock_available, stockMax, stockPercent, alertThreshold: raw.stock_alert_threshold,
    status, statusLabel: statusLabelMap[status] ?? "OK", stockValue: 0, lastEntry: raw.last_updated || "",
  };
}

function _buildInventoryStatusCounts(tabs: RawTabCount[]) {
  const allTab = tabs.find((t) => t.id === "tous");
  const availableTab = tabs.find((t) => t.id === "disponible");
  const lowTab = tabs.find((t) => t.id === "stock_faible");
  const outTab = tabs.find((t) => t.id === "rupture");
  return { all: allTab?.count ?? 0, inStock: availableTab?.count ?? 0, lowStock: lowTab?.count ?? 0, outOfStock: outTab?.count ?? 0 };
}
