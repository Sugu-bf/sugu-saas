"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Download,
  Upload,
  LayoutGrid,
  List,
  Star,
  Package as PackageIcon,
  MoreHorizontal,
  Pencil,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import type {
  VendorProductsResponse,
  VendorProduct,
  ProductStatus,
  ProductStatusCounts,
} from "@/features/vendor/schema";

// ────────────────────────────────────────────────────────────
// Status tabs config
// ────────────────────────────────────────────────────────────

interface StatusTab {
  key: "all" | "active" | "out_of_stock" | "draft" | "archived";
  label: string;
  countKey: keyof ProductStatusCounts;
  dot?: string;
}

const STATUS_TABS: StatusTab[] = [
  { key: "all", label: "Tous", countKey: "all" },
  { key: "active", label: "Actifs", countKey: "active", dot: "bg-green-500" },
  { key: "out_of_stock", label: "En rupture", countKey: "out_of_stock", dot: "bg-red-500" },
  { key: "draft", label: "Brouillons", countKey: "draft", dot: "bg-amber-500" },
  { key: "archived", label: "Archivés", countKey: "archived", dot: "bg-gray-400" },
];

// ────────────────────────────────────────────────────────────
// Status badge + stock indicator styles
// ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ProductStatus, string> = {
  active: "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-800",
  out_of_stock: "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800",
  low_stock: "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-800",
  draft: "text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800/50 dark:border-gray-700",
  archived: "text-gray-400 bg-gray-50 border-gray-200 dark:text-gray-500 dark:bg-gray-800/50 dark:border-gray-700",
};

const STOCK_DOT: Record<string, string> = {
  ok: "bg-green-500",
  low: "bg-amber-500",
  out: "bg-red-500",
};

function getStockLevel(stock: number): "ok" | "low" | "out" {
  if (stock === 0) return "out";
  if (stock <= 5) return "low";
  return "ok";
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface ProductsContentProps {
  data: VendorProductsResponse;
  filters?: { status?: string; page?: number; search?: string };
  onFiltersChange?: (filters: { status?: string; page?: number; search?: string }) => void;
}

export function ProductsContent({ data, filters, onFiltersChange }: ProductsContentProps) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<string>(filters?.status ?? "all");
  const [searchQuery, setSearchQuery] = useState(filters?.search ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Debounced search: delay API call until user stops typing
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onFiltersChange?.({ ...filters, search: value || undefined, page: 1 });
      }, 400);
    },
    [filters, onFiltersChange],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Tab change triggers API refetch
  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      onFiltersChange?.({ ...filters, status: tab === "all" ? undefined : tab, page: 1 });
    },
    [filters, onFiltersChange],
  );

  // Pagination handlers
  const handlePageChange = useCallback(
    (page: number) => {
      onFiltersChange?.({ ...filters, page });
    },
    [filters, onFiltersChange],
  );

  // With real API, all filtering is server-side, just use data.products directly
  const filtered = data.products;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-3 lg:space-y-5">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
          Mes Produits{" "}
          <span className="text-sm font-normal text-gray-400 lg:text-lg">
            ({data.pagination.totalItems.toLocaleString("fr-FR")} produits)
          </span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/vendor/products/new" className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-600 lg:hover:-translate-y-0.5">
            <Plus className="h-4 w-4" />
            Ajouter un produit
          </Link>
          <button className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3.5 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 lg:inline-flex">
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
          <button className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3.5 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 lg:inline-flex">
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* ════════════ Tabs + Search + View Toggle ════════════ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0" role="tablist">
          {STATUS_TABS.map((tab) => {
            const count = data.statusCounts[tab.countKey];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:text-sm",
                  isActive
                    ? "bg-sugu-500 text-white shadow-md shadow-sugu-500/25"
                    : "bg-white/60 text-gray-600 backdrop-blur-sm hover:bg-white dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-800",
                )}
              >
                {tab.dot && !isActive && (
                  <span className={cn("h-2 w-2 rounded-full", tab.dot)} />
                )}
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64 lg:flex-none">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm backdrop-blur-md transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              id="products-search"
            />
          </div>

          {/* Category dropdown placeholder */}
          <button className="hidden items-center gap-1.5 rounded-xl border border-white/60 bg-white/50 px-3.5 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white lg:inline-flex dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-400">
            Catégorie
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {/* Sort dropdown placeholder */}
          <button className="hidden items-center gap-1.5 rounded-xl border border-white/60 bg-white/50 px-3.5 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white lg:inline-flex dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-400">
            Trier: Plus récents
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {/* View toggle */}
          <div className="flex rounded-xl border border-white/60 bg-white/50 p-0.5 backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-900/50">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                view === "grid"
                  ? "bg-sugu-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
              )}
              aria-label="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "rounded-lg p-2 transition-colors",
                view === "list"
                  ? "bg-sugu-500 text-white shadow-sm"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
              )}
              aria-label="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ════════════ Content ════════════ */}
      {filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-2xl py-16 text-center lg:rounded-3xl lg:py-20">
          <PackageIcon className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Aucun produit trouvé.
          </p>
        </div>
      ) : view === "grid" ? (
        <ProductGrid products={filtered} />
      ) : (
        <ProductList
          products={filtered}
          selectedIds={selectedIds}
          onToggle={toggleSelect}
          onToggleAll={toggleAll}
        />
      )}

      {/* ════════════ Bulk Actions Bar (list mode) ════════════ */}
      {view === "list" && selectedIds.size > 0 && (
        <div className="glass-card sticky bottom-20 flex items-center justify-between rounded-2xl px-4 py-2.5 animate-fade-in lg:bottom-4 lg:px-5 lg:py-3">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 lg:text-sm">
            {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-all active:scale-[0.98] lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              Archiver
            </button>
            <button className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all active:scale-[0.98] lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              Supprimer
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all active:scale-[0.98] lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-sugu-600">
              Modifier le statut
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════ Pagination ════════════ */}
      <PaginationBar
        currentPage={data.pagination.currentPage}
        totalPages={data.pagination.totalPages}
        perPage={data.pagination.perPage}
        totalItems={data.pagination.totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// GRID VIEW
// ════════════════════════════════════════════════════════════

function ProductGrid({ products }: { products: VendorProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} delay={i} />
      ))}
    </div>
  );
}

function ProductCard({ product, delay }: { product: VendorProduct; delay: number }) {
  const stockLevel = getStockLevel(product.stock);

  return (
    <div
      className="glass-card group relative rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:p-4 lg:hover:-translate-y-1 lg:hover:shadow-lg animate-card-enter"
      style={{ animationDelay: `${Math.min(delay, 11) * 50}ms` }}
    >
      {/* Promo badge */}
      {product.isPromo && (
        <div className="absolute left-3 top-3 z-10 rounded-lg bg-sugu-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">
          Promo
        </div>
      )}

      {/* Clickable area → detail page */}
      <Link href={`/vendor/products/${product.id}`} className="block" aria-label={`Voir les détails de ${product.name}`}>
        {/* Product image */}
        <div className="relative mb-2 flex h-28 items-center justify-center overflow-hidden rounded-xl bg-gray-50/80 dark:bg-gray-800/40 lg:mb-3 lg:h-36">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <span className="text-4xl lg:text-5xl">{product.emoji}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white truncate lg:text-sm">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold text-sugu-500 lg:text-base">
            {formatCurrency(product.price)} FCFA
          </span>
          {product.originalPrice && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Stock + Sold */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 lg:mt-2 lg:gap-3 lg:text-xs">
          <span className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", STOCK_DOT[stockLevel])} />
            {product.stock} en stock
          </span>
          <span>📦 {product.sold.toLocaleString("fr-FR")} vendus</span>
        </div>

        {/* Rating + Status */}
        <div className="mt-1.5 flex items-center justify-between lg:mt-2">
          {product.rating > 0 ? (
            <div className="flex items-center gap-1 text-xs">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {product.rating}
              </span>
              <span className="text-gray-400">({product.reviewCount})</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
          <span
            className={cn(
              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
              STATUS_BADGE[product.status],
            )}
          >
            {product.statusLabel}
          </span>
        </div>
      </Link>

      {/* Actions (hover) */}
      <div className="mt-2 flex items-center gap-2 opacity-100 transition-opacity lg:mt-3 lg:opacity-0 lg:group-hover:opacity-100">
        <Link
          href={`/vendor/products/${product.id}`}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <Pencil className="h-3 w-3" />
          Voir détails
        </Link>
        <button className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// LIST VIEW
// ════════════════════════════════════════════════════════════

function ProductList({
  products,
  selectedIds,
  onToggle,
  onToggleAll,
}: {
  products: VendorProduct[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl lg:rounded-3xl">
      {/* Table Header */}
      <div className="hidden border-b border-gray-100/80 bg-gray-50/30 dark:border-gray-800/50 lg:block">
        <div className="grid grid-cols-12 items-center gap-3 px-5 py-3">
          <div className="col-span-1 flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedIds.size === products.length && products.length > 0}
              onChange={onToggleAll}
              className="h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500"
              aria-label="Sélectionner tout"
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Image
            </span>
          </div>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Nom du produit
          </span>
          <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Catégorie
          </span>
          <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Prix
          </span>
          <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Stock
          </span>
          <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Vendus
          </span>
          <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Note
          </span>
          <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Statut
          </span>
          <span className="col-span-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
            Actions
          </span>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-100/60 dark:divide-gray-800/40">
        {products.map((product) => (
          <ProductRow
            key={product.id}
            product={product}
            isSelected={selectedIds.has(product.id)}
            onToggle={() => onToggle(product.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductRow({
  product,
  isSelected,
  onToggle,
}: {
  product: VendorProduct;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const stockLevel = getStockLevel(product.stock);
  const isDraft = product.status === "draft";

  return (
    <div
      className={cn(
        "group flex flex-col gap-1.5 px-4 py-2.5 transition-colors active:bg-white/40 dark:active:bg-white/5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-3 lg:px-5 lg:py-3.5",
        isSelected
          ? "bg-sugu-50/40 dark:bg-sugu-950/10"
          : "lg:hover:bg-white/40 dark:lg:hover:bg-white/5",
        isDraft && "opacity-50",
      )}
    >
      {/* Checkbox + Image */}
      <div className="flex items-center gap-2.5 lg:col-span-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="hidden h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 lg:block"
          aria-label={`Sélectionner ${product.name}`}
        />
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50/80 dark:bg-gray-800/50 lg:h-10 lg:w-10">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-lg lg:text-xl">{product.emoji}</span>
          )}
        </div>
      </div>

      {/* Name + SKU */}
      <div className="lg:col-span-2 min-w-0">
        <Link
          href={`/vendor/products/${product.id}`}
          className="text-xs font-semibold text-gray-900 dark:text-white truncate lg:text-sm hover:text-sugu-500 dark:hover:text-sugu-400 transition-colors block"
        >
          {product.name}
        </Link>
        <p className="text-[11px] text-gray-400">
          SKU: {product.sku}
        </p>
      </div>

      {/* Category */}
      <div className="hidden lg:col-span-2 lg:block">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {product.category} &gt; {product.subcategory}
        </span>
      </div>

      {/* Price */}
      <div className="lg:col-span-1">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-sugu-500 lg:text-sm">
            {formatCurrency(product.price)} FCFA
          </span>
          {product.originalPrice && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-400 line-through">
                {formatCurrency(product.originalPrice)}
              </span>
              <span className="text-[11px] font-bold text-green-600">
                -{product.discountPercent}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stock */}
      <div className="hidden text-center lg:col-span-1 lg:block">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {product.stock}
          </span>
          <span className={cn("h-2 w-2 rounded-full", STOCK_DOT[stockLevel])} />
          {stockLevel === "low" && (
            <AlertTriangle className="h-3 w-3 text-amber-500" />
          )}
        </div>
      </div>

      {/* Sold */}
      <div className="hidden text-center lg:col-span-1 lg:block">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {product.sold.toLocaleString("fr-FR")}
        </span>
      </div>

      {/* Rating */}
      <div className="hidden text-center lg:col-span-1 lg:block">
        {product.rating > 0 ? (
          <div className="inline-flex items-center gap-1 text-sm">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {product.rating}
            </span>
            <span className="text-xs text-gray-400">({product.reviewCount})</span>
          </div>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>

      {/* Status */}
      <div className="lg:col-span-1">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-px text-[10px] font-medium lg:px-2.5 lg:py-0.5 lg:text-[11px]",
            STATUS_BADGE[product.status],
          )}
        >
          {product.statusLabel}
        </span>
        {product.isPromo && (
          <span className="ml-1 rounded bg-sugu-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sugu-500">
            Promo
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="hidden items-center justify-center gap-1.5 lg:col-span-2 lg:flex">
        <Link
          href={`/vendor/products/${product.id}`}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sugu-500 dark:hover:bg-gray-800"
          aria-label={`Voir détails de ${product.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Link>
        <button
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label={`Plus d'options pour ${product.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// PAGINATION BAR
// ════════════════════════════════════════════════════════════

function PaginationBar({
  currentPage,
  totalPages,
  perPage,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  perPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  // Calculate display range
  const startItem = Math.min((currentPage - 1) * perPage + 1, totalItems);
  const endItem = Math.min(currentPage * perPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [1];
    if (currentPage > 3) pages.push("ellipsis");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-gray-400 dark:text-gray-500 lg:text-sm">
        Affichage {startItem}-{endItem} sur{" "}
        {totalItems.toLocaleString("fr-FR")} produits
      </p>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-gray-800"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                p === currentPage
                  ? "bg-sugu-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-800",
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-gray-800"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
