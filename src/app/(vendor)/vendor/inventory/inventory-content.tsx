"use client";

import { useState, useCallback } from "react";
import { cn, formatCurrency, formatCompactCurrency } from "@/lib/utils";
import type {
  VendorInventoryResponse,
  InventoryProduct,
  InventoryAlert,
  StockMovement,
} from "@/features/vendor/schema";
import {
  useVendorInventory,
  useAddInventoryStock,
  useExportInventory,
} from "@/features/vendor/hooks";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  ChevronDown,
  RefreshCw,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  X,
  Check,
  Loader2,
  Download,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

type StockTab = "all" | "inStock" | "lowStock" | "outOfStock";

const STOCK_TABS: { key: StockTab; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "inStock", label: "En stock" },
  { key: "lowStock", label: "Stock faible" },
  { key: "outOfStock", label: "En rupture" },
];

const STATUS_STYLES: Record<string, string> = {
  ok: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  low: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  out: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
};

const PROGRESS_COLORS: Record<string, string> = {
  ok: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface InventoryContentProps {
  data: VendorInventoryResponse;
}

export function InventoryContent({ data: initialData }: InventoryContentProps) {
  const [activeTab, setActiveTab] = useState<StockTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addStockModal, setAddStockModal] = useState<{
    open: boolean;
    product: InventoryProduct | null;
  }>({ open: false, product: null });

  // React Query — uses the initialData prop as the first render,
  // then fetches reactively when filters change
  const { data: queryData } = useVendorInventory({
    status: activeTab,
    page: currentPage,
    search: searchQuery,
  });

  // Use query data if available, otherwise fall back to initial prop
  const data = queryData ?? initialData;

  const addStockMutation = useAddInventoryStock();
  const exportMutation = useExportInventory();

  // Client-side filtering for search (instant, before debounce kicks in)
  const filteredProducts = data.products.filter((p) => {
    const matchesSearch =
      !searchInput ||
      p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchInput.toLowerCase());
    return matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => p.id)));
    }
  };

  // Handle tab change — reset page to 1
  const handleTabChange = useCallback((tab: StockTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, []);

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    // Debounce the actual API search
    const timer = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedIds(new Set());
  }, []);

  // Handle stock add
  const handleAddStock = useCallback(
    (productId: string, quantity: number, reason?: string) => {
      addStockMutation.mutate(
        { productId, quantity, reason },
        {
          onSuccess: () => {
            setAddStockModal({ open: false, product: null });
          },
        },
      );
    },
    [addStockMutation],
  );

  // Handle export
  const handleExport = useCallback(() => {
    exportMutation.mutate(undefined, {
      onSuccess: (result) => {
        // Build CSV string from the data
        if (result.data && result.data.length > 0) {
          const headers = result.columns.join(",");
          const rows = result.data.map((row) =>
            result.columns
              .map((col) => {
                const val = row[col];
                return typeof val === "string" ? `"${val}"` : String(val ?? "");
              })
              .join(","),
          );
          const csv = [headers, ...rows].join("\n");
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `inventaire_${new Date().toISOString().split("T")[0]}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        }
      },
    });
  }, [exportMutation]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
            Inventaires
          </h1>
          {/* Page tabs */}
          <div className="mt-2 -mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:mt-3 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
            <button
              className="flex-shrink-0 rounded-full bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-sugu-500/20 transition-all lg:px-4"
              aria-current="page"
            >
              Vue d&apos;ensemble
            </button>
            <button className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:px-4">
              Mouvements
            </button>
            <button className="relative flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-500 transition-all hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 lg:px-4">
              Alertes
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                {data.stockAlerts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-750 lg:inline-flex"
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportMutation.isPending ? "Export en cours…" : "Rapport d'inventaire"}
          </button>
          <button
            onClick={() => setAddStockModal({ open: true, product: null })}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:from-sugu-600 lg:hover:to-sugu-700"
          >
            <Plus className="h-4 w-4" />
            Entrée de stock
          </button>
        </div>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        {/* Stock Value */}
        <KpiCard
          icon={<TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          label="Valeur du stock"
          delay={0}
        >
          <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white lg:text-2xl">
            {formatCurrency(data.kpis.stockValue)}{" "}
            <span className="text-sm font-semibold text-gray-500">unités</span>
          </p>
          <p className="mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            {data.kpis.stockValueChange} ce mois
          </p>
        </KpiCard>

        {/* Products in stock */}
        <KpiCard
          icon={<Package className="h-4 w-4 lg:h-5 lg:w-5" />}
          iconBg="bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-400"
          label="Produits en stock"
          delay={1}
        >
          <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white lg:text-2xl">
            {data.kpis.productsInStock}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            sur {data.kpis.totalProducts} produits
          </p>
        </KpiCard>

        {/* Out of stock */}
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5" />}
          iconBg="bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400"
          label="En rupture"
          highlight="red"
          delay={2}
        >
          <p className="mt-1 text-lg font-extrabold text-red-600 dark:text-red-400 lg:text-2xl">
            {data.kpis.outOfStock}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-red-500 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Nécessite une action
          </p>
        </KpiCard>

        {/* Low stock */}
        <KpiCard
          icon={<TrendingDown className="h-4 w-4 lg:h-5 lg:w-5" />}
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
          label="Stock faible"
          highlight="amber"
          delay={3}
        >
          <p className="mt-1 text-lg font-extrabold text-amber-600 dark:text-amber-400 lg:text-2xl">
            {data.kpis.lowStock}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            &lt; {data.kpis.lowStockThreshold} unités restantes
          </p>
        </KpiCard>

        {/* Entries this month */}
        <KpiCard
          icon={<ArrowUpRight className="h-4 w-4 lg:h-5 lg:w-5" />}
          iconBg="bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
          label="Stock disponible"
          delay={4}
        >
          <p className="mt-1 text-lg font-extrabold text-gray-900 dark:text-white lg:text-2xl">
            {formatCurrency(data.kpis.entriesThisMonth)}{" "}
            <span className="text-sm font-semibold text-gray-500">unités</span>
          </p>
          <p className="mt-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            {data.kpis.entriesChangeLabel}
          </p>
        </KpiCard>
      </div>

      {/* ════════════ Main Grid: Table + Sidebar ════════════ */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-12 lg:gap-6">
        {/* ──── Stock Table ──── */}
        <section
          className="glass-card overflow-hidden rounded-2xl xl:col-span-8"
          aria-labelledby="stock-table-title"
        >
          {/* Table Header */}
          <div className="border-b border-gray-200/60 p-4 dark:border-gray-700/40 lg:p-5">
            <h2
              id="stock-table-title"
              className="text-base font-semibold text-gray-900 dark:text-white"
            >
              Stock par produit
            </h2>
            {/* Search & Filters */}
            <div className="mt-3 flex flex-wrap items-center gap-2 lg:gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Rechercher un produit…"
                  className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-sugu-600"
                  aria-label="Rechercher un produit"
                />
              </div>

              {/* Category filter */}
              <button className="hidden items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-750 lg:inline-flex">
                <Filter className="h-3.5 w-3.5" />
                Catégorie
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {/* Stock status filter */}
              <button className="hidden items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-750 lg:inline-flex">
                <ArrowDownUp className="h-3.5 w-3.5" />
                Statut stock
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Status tabs */}
            <div className="mt-3 -mx-4 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0">
              {STOCK_TABS.map((tab) => {
                const count =
                  tab.key === "all"
                    ? data.statusCounts.all
                    : tab.key === "inStock"
                      ? data.statusCounts.inStock
                      : tab.key === "lowStock"
                        ? data.statusCounts.lowStock
                        : data.statusCounts.outOfStock;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      "flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      activeTab === tab.key
                        ? "bg-sugu-50 text-sugu-600 shadow-sm dark:bg-sugu-950/30 dark:text-sugu-400"
                        : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                    )}
                  >
                    {tab.label}
                    <span className="ml-1 text-[10px] opacity-70">{count}</span>
                  </button>
                );
              })}

              {/* Sort */}
              <div className="ml-auto hidden items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 lg:flex">
                <span>Trier:</span>
                <button className="font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                  Stock croissant ↑
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] lg:min-w-[900px]" role="table">
              <thead className="hidden lg:table-header-group">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="w-10 py-3 pl-5 text-left">
                    <input
                      type="checkbox"
                      checked={
                        filteredProducts.length > 0 &&
                        selectedIds.size === filteredProducts.length
                      }
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 dark:border-gray-600"
                      aria-label="Sélectionner tous les produits"
                    />
                  </th>
                  <th className="py-3 pl-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Produit
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    SKU
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Catégorie
                  </th>
                  <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Stock actuel
                  </th>
                  <th className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Seuil d&apos;alerte
                  </th>
                  <th className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Statut
                  </th>
                  <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Valeur stock
                  </th>
                  <th className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Dernière entrée
                  </th>
                  <th className="w-12 py-3 pr-5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <Package className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                      <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Aucun produit trouvé
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {searchInput
                          ? "Essayez avec d'autres termes de recherche"
                          : "Aucun produit avec ce filtre de statut"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, idx) => (
                    <InventoryRow
                      key={product.id}
                      product={product}
                      selected={selectedIds.has(product.id)}
                      onToggle={() => toggleSelect(product.id)}
                      onRestock={() =>
                        setAddStockModal({ open: true, product })
                      }
                      delay={idx}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-800 lg:px-5">
            {/* Selected actions */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
                  </span>
                  <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    Entrée groupée
                  </button>
                  <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                    Modifier seuils
                  </button>
                </>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {data.pagination.totalItems > 0
                  ? `${(data.pagination.currentPage - 1) * data.pagination.perPage + 1}-${Math.min(
                      data.pagination.currentPage * data.pagination.perPage,
                      data.pagination.totalItems,
                    )} sur ${data.pagination.totalItems}`
                  : "0 résultats"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={data.pagination.currentPage === 1}
                  onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({
                  length: Math.min(3, data.pagination.totalPages),
                }).map((_, i) => {
                  const pageNum = _getPageNumber(
                    i,
                    data.pagination.currentPage,
                    data.pagination.totalPages,
                  );
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all",
                        pageNum === data.pagination.currentPage
                          ? "bg-sugu-500 text-white shadow-sm shadow-sugu-500/20"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={
                    data.pagination.currentPage === data.pagination.totalPages ||
                    data.pagination.totalPages === 0
                  }
                  onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-all hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ──── Right Sidebar ──── */}
        <aside className="space-y-3 xl:col-span-4 lg:space-y-4" aria-label="Alertes et mouvements">
          {/* Stock Alerts */}
          <AlertsPanel
            alerts={data.stockAlerts}
            onRestock={(alert) => {
              const product = data.products.find((p) => p.id === alert.id);
              setAddStockModal({
                open: true,
                product: product ?? {
                  id: alert.id,
                  name: alert.name,
                  image: alert.image,
                  sku: "",
                  category: "",
                  stockCurrent: alert.remaining,
                  stockMax: 100,
                  stockPercent: 0,
                  alertThreshold: 10,
                  status: alert.level === "critical" ? "out" : "low",
                  statusLabel: alert.level === "critical" ? "Rupture" : "Faible",
                  stockValue: 0,
                  lastEntry: "",
                },
              });
            }}
          />

          {/* Recent Movements */}
          <MovementsPanel movements={data.recentMovements} />

          {/* Stock Trend */}
          <TrendCard value={data.stockTrend.value} badge={data.stockTrend.badge} />
        </aside>
      </div>

      {/* ════════════ Add Stock Modal ════════════ */}
      {addStockModal.open && (
        <AddStockModal
          product={addStockModal.product}
          isLoading={addStockMutation.isPending}
          onClose={() => setAddStockModal({ open: false, product: null })}
          onSubmit={handleAddStock}
          products={data.products}
        />
      )}
    </div>
  );
}

/** Helper: compute which page numbers to show */
function _getPageNumber(idx: number, currentPage: number, totalPages: number): number {
  if (totalPages <= 3) return idx + 1;
  if (currentPage <= 2) return idx + 1;
  if (currentPage >= totalPages - 1) return totalPages - 2 + idx;
  return currentPage - 1 + idx;
}

// ============================================================
// Sub-Components
// ============================================================

/** KPI Card wrapper */
function KpiCard({
  icon,
  iconBg,
  label,
  children,
  highlight,
  delay = 0,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  children: React.ReactNode;
  highlight?: "red" | "amber";
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:p-5 lg:hover:-translate-y-0.5 animate-card-enter",
        highlight === "red" && "ring-1 ring-red-200/50 dark:ring-red-900/30",
        highlight === "amber" && "ring-1 ring-amber-200/50 dark:ring-amber-900/30",
      )}
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl shadow-sm lg:h-10 lg:w-10", iconBg)}>
          {icon}
        </div>
      </div>
      <p className="mt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 lg:mt-3 lg:text-xs">
        {label}
      </p>
      {children}
    </div>
  );
}

/** Single inventory table row */
function InventoryRow({
  product,
  selected,
  onToggle,
  onRestock,
  delay,
}: {
  product: InventoryProduct;
  selected: boolean;
  onToggle: () => void;
  onRestock: () => void;
  delay: number;
}) {
  return (
    <tr
      className={cn(
        "group transition-colors active:bg-sugu-50/30 lg:hover:bg-sugu-50/30 dark:active:bg-sugu-950/10 dark:lg:hover:bg-sugu-950/10 animate-fade-in",
        selected && "bg-sugu-50/40 dark:bg-sugu-950/20",
      )}
      style={{ animationDelay: `${delay * 40}ms` }}
    >
      {/* Checkbox */}
      <td className="py-3.5 pl-5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 dark:border-gray-600"
          aria-label={`Sélectionner ${product.name}`}
        />
      </td>

      {/* Product */}
      <td className="py-3.5 pl-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100/80 dark:bg-gray-800/60">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <Package className={cn("h-5 w-5 text-gray-400", product.image && "hidden")} />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {product.name}
          </span>
        </div>
      </td>

      {/* SKU */}
      <td className="py-3.5">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
          {product.sku}
        </span>
      </td>

      {/* Category */}
      <td className="py-3.5">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {product.category}
        </span>
      </td>

      {/* Stock level with progress bar */}
      <td className="py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-20">
            <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
              <span>{product.stockPercent}%</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  PROGRESS_COLORS[product.status],
                )}
                style={{ width: `${product.stockPercent}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {product.stockCurrent}
          </span>
          <span className="text-xs text-gray-400">unités</span>
        </div>
      </td>

      {/* Alert threshold */}
      <td className="py-3.5 text-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {product.alertThreshold}
        </span>
      </td>

      {/* Status */}
      <td className="py-3.5 text-center">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            STATUS_STYLES[product.status],
          )}
        >
          {product.status === "ok" && "✓ "}
          {product.statusLabel}
        </span>
      </td>

      {/* Stock value */}
      <td className="py-3.5 text-right">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {product.stockValue > 0
            ? `${formatCurrency(product.stockValue)} FCFA`
            : "—"}
        </span>
      </td>

      {/* Last entry */}
      <td className="py-3.5 text-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {product.lastEntry}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3.5 pr-5 text-right">
        {product.status === "out" ? (
          <button
            onClick={onRestock}
            className="rounded-lg bg-sugu-50 px-2.5 py-1 text-[11px] font-semibold text-sugu-600 transition-all hover:bg-sugu-100 dark:bg-sugu-950/30 dark:text-sugu-400 dark:hover:bg-sugu-950/50"
          >
            Réapprovisionner
          </button>
        ) : (
          <button
            onClick={onRestock}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 opacity-100 lg:opacity-0 transition-all active:bg-gray-100 lg:hover:bg-gray-100 lg:group-hover:opacity-100 dark:active:bg-gray-800 dark:lg:hover:bg-gray-800"
            aria-label={`Actions pour ${product.name}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

/** Stock Alerts panel */
function AlertsPanel({
  alerts,
  onRestock,
}: {
  alerts: InventoryAlert[];
  onRestock: (alert: InventoryAlert) => void;
}) {
  return (
    <section
      className="glass-card rounded-2xl p-3 transition-all duration-300 lg:p-5"
      aria-labelledby="alerts-panel-title"
    >
      <div className="flex items-center justify-between">
        <h3
          id="alerts-panel-title"
          className="text-sm font-semibold text-gray-900 dark:text-white"
        >
          Alertes stock ({alerts.length})
        </h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {alerts.length} alertes
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Produits nécessitant une action
      </p>

      {alerts.length === 0 ? (
        <div className="mt-4 flex flex-col items-center py-6">
          <Check className="h-8 w-8 text-green-400" />
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Aucune alerte
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Tous vos produits sont en stock
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 transition-all",
                alert.level === "critical"
                  ? "bg-red-50/50 dark:bg-red-950/10"
                  : "bg-amber-50/50 dark:bg-amber-950/10",
              )}
            >
              {/* Severity dot */}
              <div className="mt-0.5 flex-shrink-0">
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    alert.level === "critical"
                      ? "bg-red-500 animate-pulse-dot"
                      : "bg-amber-500",
                  )}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 dark:text-white lg:text-sm">
                  {alert.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {alert.description}
                </p>
                {alert.level === "critical" && alert.salesImpact !== "Réapprovisionner" && (
                  <p className="mt-0.5 text-[10px] font-medium text-red-500 dark:text-red-400">
                    {alert.salesImpact}
                  </p>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => onRestock(alert)}
                className={cn(
                  "flex-shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                  alert.level === "critical"
                    ? "bg-sugu-500 text-white shadow-sm shadow-sugu-500/20 hover:bg-sugu-600"
                    : "border border-sugu-200 text-sugu-600 hover:bg-sugu-50 dark:border-sugu-800 dark:text-sugu-400 dark:hover:bg-sugu-950/30",
                )}
              >
                {alert.level === "critical" ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Réapprovisionner
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" />
                    Commander
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <button className="mt-3 w-full text-center text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400 dark:hover:text-sugu-300">
          Voir toutes les alertes →
        </button>
      )}
    </section>
  );
}

/** Recent Movements panel */
function MovementsPanel({ movements }: { movements: StockMovement[] }) {
  const typeIcon: Record<string, React.ReactNode> = {
    entry: <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />,
    exit: <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />,
    adjustment: <Minus className="h-3.5 w-3.5 text-amber-500" />,
  };

  const typeDotColor: Record<string, string> = {
    entry: "bg-green-500",
    exit: "bg-red-500",
    adjustment: "bg-amber-500",
  };

  return (
    <section
      className="glass-card rounded-2xl p-3 transition-all duration-300 lg:p-5"
      aria-labelledby="movements-panel-title"
    >
      <h3
        id="movements-panel-title"
        className="text-sm font-semibold text-gray-900 dark:text-white"
      >
        Mouvements récents
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Dernières entrées/sorties
      </p>

      {movements.length === 0 ? (
        <div className="mt-4 flex flex-col items-center py-6">
          <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
            Aucun mouvement récent
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Les mouvements de stock seront affichés ici
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-0 lg:mt-4">
          {movements.map((mv, idx) => (
            <div
              key={mv.id}
              className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors active:bg-white/40 lg:hover:bg-white/40 dark:active:bg-white/5 dark:lg:hover:bg-white/5"
            >
              {/* Timeline dot */}
              <div className="relative mt-1 flex flex-col items-center">
                <span className={cn("h-2 w-2 rounded-full", typeDotColor[mv.type])} />
                {idx < movements.length - 1 && (
                  <span className="mt-0.5 h-8 w-px bg-gray-200 dark:bg-gray-700" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {typeIcon[mv.type]}
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {mv.label}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                  {mv.detail}
                </p>
              </div>

              {/* Date */}
              <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                {mv.date}
              </span>
            </div>
          ))}
        </div>
      )}

      {movements.length > 0 && (
        <button className="mt-2 w-full text-center text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400 dark:hover:text-sugu-300">
          Voir tout l&apos;historique →
        </button>
      )}
    </section>
  );
}

/** Stock Trend card */
function TrendCard({ value, badge }: { value: number; badge: string }) {
  return (
    <section className="glass-card rounded-2xl p-3 transition-all duration-300 lg:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Tendance de stock
        </h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-lg font-extrabold text-gray-900 dark:text-white lg:mt-3 lg:text-2xl">
        {formatCompactCurrency(value)}{" "}
        <span className="text-sm font-semibold text-gray-500">unités</span>
      </p>

      {/* Mini chart placeholder */}
      <div className="mt-3 flex items-end gap-1">
        {[35, 48, 42, 56, 62, 58, 70, 65, 72, 68, 75, 80].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-sugu-400 to-sugu-300 opacity-60 transition-all hover:opacity-100 dark:from-sugu-600 dark:to-sugu-500"
            style={{ height: `${h * 0.5}px` }}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Add Stock Modal
// ============================================================

function AddStockModal({
  product,
  isLoading,
  onClose,
  onSubmit,
  products,
}: {
  product: InventoryProduct | null;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (productId: string, quantity: number, reason?: string) => void;
  products: InventoryProduct[];
}) {
  const [selectedProductId, setSelectedProductId] = useState(product?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const selectedProduct = product ?? products.find((p) => p.id === selectedProductId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantity < 1) return;
    onSubmit(selectedProductId, quantity, reason || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-card-enter rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Entrée de stock
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Ajouter des unités au stock
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Product selector */}
          {!product && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Produit
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                required
              >
                <option value="">Sélectionner un produit…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stockCurrent})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected product preview */}
          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
                {selectedProduct.image ? (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Package className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedProduct.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Stock actuel: {selectedProduct.stockCurrent} unités
                </p>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantité à ajouter
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-center text-sm font-bold text-gray-900 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-all hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick add buttons */}
          <div className="flex flex-wrap gap-2">
            {[5, 10, 25, 50, 100].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQuantity(n)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  quantity === n
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800",
                )}
              >
                +{n}
              </button>
            ))}
          </div>

          {/* Reason */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Raison (optionnel)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option value="">Sélectionner une raison…</option>
              <option value="purchase">Achat fournisseur</option>
              <option value="return">Retour client</option>
              <option value="production">Production</option>
              <option value="adjustment">Ajustement inventaire</option>
              <option value="transfer">Transfert entre magasins</option>
              <option value="other">Autre</option>
            </select>
          </div>

          {/* Preview total */}
          {selectedProduct && (
            <div className="rounded-xl bg-green-50/50 p-3 dark:bg-green-950/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Nouveau stock total:
                </span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {selectedProduct.stockCurrent + quantity} unités
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedProductId || quantity < 1}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sugu-500 to-sugu-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all hover:from-sugu-600 hover:to-sugu-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ajout en cours…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmer l&apos;entrée
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
