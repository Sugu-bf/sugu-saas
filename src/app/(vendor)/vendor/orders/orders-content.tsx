"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Download,
  Printer,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type {
  VendorOrdersResponse,
  VendorOrder,
  OrderStatus,
  OrderStatusCounts,
} from "@/features/vendor/schema";
import {
  useVendorOrders,
  useConfirmOrder,
  useCancelOrder,
  useRequestDelivery,
} from "@/features/vendor/hooks";
import { toast } from "sonner";

// ────────────────────────────────────────────────────────────
// Status filter tabs config
// ────────────────────────────────────────────────────────────

interface StatusTab {
  key: "all" | OrderStatus;
  label: string;
  countKey: keyof OrderStatusCounts;
}

const STATUS_TABS: StatusTab[] = [
  { key: "all", label: "Toutes", countKey: "all" },
  { key: "pending", label: "En attente", countKey: "pending" },
  { key: "processing", label: "En préparation", countKey: "processing" },
  { key: "shipped", label: "Expédiées", countKey: "shipped" },
  { key: "delivered", label: "Livrées", countKey: "delivered" },
  { key: "cancelled", label: "Annulées", countKey: "cancelled" },
];

// ────────────────────────────────────────────────────────────
// Status badge styles
// ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  confirmed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  processing:
    "bg-sugu-50 text-sugu-600 border-sugu-200 dark:bg-sugu-950/30 dark:text-sugu-400",
  packed:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  shipped:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  delivered:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400",
  cancelled:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400",
  refunded:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

interface OrdersContentProps {
  data: VendorOrdersResponse;
}

export function OrdersContent({ data: initialData }: OrdersContentProps) {
  const [activeTab, setActiveTab] = useState<"all" | OrderStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<VendorOrder | null>(null);
  const [currentPage, setCurrentPage] = useState(initialData.pagination.currentPage);

  // Re-fetch when filters/page change via React Query
  const { data: queryData } = useVendorOrders({
    status: activeTab === "all" ? undefined : activeTab,
    page: currentPage,
    search: searchQuery || undefined,
  });

  // Use the latest query data, falling back to initial SSR data
  const data = queryData ?? initialData;

  // Client-side filter (supplements backend filter which may not support text search)
  const filteredOrders = data.orders.filter((order) => {
    const matchesStatus = activeTab === "all" || order.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      order.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.productSummary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleTabChange = useCallback((tab: "all" | OrderStatus) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-3 lg:space-y-5">
      {/* ════════════ Page Header ════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
          Commandes
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/vendor/orders/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-sugu-500/25 transition-all active:scale-[0.98] lg:gap-2 lg:px-4 lg:py-2.5 lg:text-sm lg:hover:bg-sugu-600"
          >
            <Plus className="h-4 w-4" />
            Nouvelle commande
          </Link>
          <button
            className="hidden items-center gap-2 rounded-xl border border-sugu-200 bg-sugu-50/80 px-4 py-2.5 text-sm font-semibold text-sugu-600 transition-all hover:bg-sugu-100 hover:border-sugu-300 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400 lg:inline-flex"
            aria-label="Exporter en CSV"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
          <button
            className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2.5 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all hover:bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300 dark:hover:bg-gray-800 lg:inline-flex"
            aria-label="Imprimer"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

      {/* ════════════ Status Tabs ════════════ */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0" role="tablist" aria-label="Filtrer par statut">
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
                  : "bg-white/60 text-gray-600 backdrop-blur-sm hover:bg-white hover:text-gray-900 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white",
              )}
            >
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

      {/* ════════════ Search + Filters ════════════ */}
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par N° commande, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/60 bg-white/50 py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm backdrop-blur-md transition-all focus:border-sugu-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500 dark:focus:border-sugu-600 dark:focus:bg-gray-900"
            id="orders-search"
          />
        </div>
        <button className="inline-flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-gray-900 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:bg-gray-800">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
        </button>
      </div>

      {/* ════════════ Orders Table ════════════ */}
      <div className="glass-card overflow-hidden rounded-2xl lg:rounded-3xl">
        {/* Table Header */}
        <div className="hidden border-b border-gray-100/80 bg-gray-50/30 dark:border-gray-800/50 lg:block">
          <div className="grid grid-cols-12 items-center gap-3 px-6 py-3">
            <div className="col-span-1 flex items-center">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 dark:border-gray-600"
                aria-label="Sélectionner toutes les commandes"
              />
            </div>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              N° Commande
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Client
            </span>
            <span className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Produits
            </span>
            <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Montant
            </span>
            <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Statut
            </span>
            <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Agence
            </span>
            <span className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Date
            </span>
            <span className="col-span-1 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </span>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100/60 dark:divide-gray-800/40">
          {filteredOrders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aucune commande trouvée.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={cn(
                  "group cursor-pointer px-4 py-2.5 transition-colors active:bg-white/40 dark:active:bg-white/5 lg:grid lg:grid-cols-12 lg:items-center lg:gap-3 lg:px-6 lg:py-4 lg:cursor-default",
                  selectedOrder?.id === order.id && "bg-sugu-50/30 dark:bg-sugu-950/10",
                )}
              >
                {/* Checkbox — desktop only */}
                <div className="hidden lg:col-span-1 lg:flex lg:items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500 dark:border-gray-600"
                    aria-label={`Sélectionner ${order.reference}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* ── Mobile: compact 2-line layout ── */}
                <div className="flex items-center justify-between lg:hidden">
                  {/* Left: ref + avatar + name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Link
                      href={`/vendor/orders/${order.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 text-xs font-bold text-gray-800 hover:text-sugu-500 dark:text-gray-200"
                    >
                      {order.reference}
                    </Link>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <div
                      className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${order.client.avatarColor}`}
                    >
                      {order.client.initials}
                    </div>
                    <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {order.client.name}
                    </span>
                  </div>
                  {/* Right: amount + eye icon */}
                  <div className="flex flex-shrink-0 items-center gap-1.5 pl-2">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {formatCurrency(order.total)}
                    </span>
                    <Link
                      href={`/vendor/orders/${order.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors active:bg-gray-100 dark:active:bg-gray-800"
                      aria-label={`Voir page détails ${order.reference}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
                {/* Mobile: line 2 — status + date */}
                <div className="mt-1 flex items-center justify-between lg:hidden">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-px text-[10px] font-medium",
                      STATUS_BADGE[order.status],
                    )}
                  >
                    {order.statusLabel}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {order.date}
                  </span>
                </div>

                {/* ── Desktop: original grid cells ── */}
                {/* Reference */}
                <div className="hidden lg:col-span-2 lg:block">
                  <Link
                    href={`/vendor/orders/${order.id}`}
                    className="text-sm font-bold text-gray-800 transition-colors hover:text-sugu-500 dark:text-gray-200 dark:hover:text-sugu-400"
                  >
                    {order.reference}
                  </Link>
                </div>

                {/* Client */}
                <div className="hidden items-center gap-2.5 lg:col-span-2 lg:flex">
                  <div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${order.client.avatarColor}`}
                  >
                    {order.client.initials}
                  </div>
                  <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                    {order.client.name}
                  </span>
                </div>

                {/* Products */}
                <div className="hidden lg:col-span-2 lg:block">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {order.productSummary}
                  </span>
                </div>

                {/* Amount */}
                <div className="hidden lg:col-span-1 lg:block">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {formatCurrency(order.total)} FCFA
                  </span>
                </div>

                {/* Status */}
                <div className="hidden lg:col-span-1 lg:block">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      STATUS_BADGE[order.status],
                    )}
                  >
                    {order.statusLabel}
                  </span>
                </div>

                {/* Agency */}
                <div className="hidden lg:col-span-1 lg:block">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {order.agency}
                  </span>
                </div>

                {/* Date */}
                <div className="hidden lg:col-span-1 lg:block">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {order.date}
                  </span>
                </div>

                {/* Actions */}
                <div className="hidden lg:flex lg:justify-center lg:col-span-1">
                  <Link
                    href={`/vendor/orders/${order.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-sugu-500 dark:hover:bg-gray-800 dark:hover:text-sugu-400"
                    aria-label={`Voir page détails ${order.reference}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100/80 px-4 py-3 dark:border-gray-800/50 sm:flex-row lg:px-6 lg:py-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-gray-800"
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(3, data.pagination.totalPages) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  p === currentPage
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                )}
              >
                {p}
              </button>
            ))}
            {data.pagination.totalPages > 3 && (
              <>
                <span className="px-1 text-gray-400">…</span>
                <button
                  onClick={() => handlePageChange(data.pagination.totalPages)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    currentPage === data.pagination.totalPages
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                  )}
                >
                  {data.pagination.totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => handlePageChange(Math.min(data.pagination.totalPages, currentPage + 1))}
              disabled={currentPage >= data.pagination.totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-gray-800"
              aria-label="Page suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 lg:text-sm">
            {((currentPage - 1) * data.pagination.perPage) + 1}-{Math.min(currentPage * data.pagination.perPage, data.pagination.totalItems)} sur{" "}
            {data.pagination.totalItems.toLocaleString("fr-FR")} commandes
          </p>
        </div>
      </div>

      {/* ════════════ Order Detail Panel (Slide-over) ════════════ */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Order Detail Panel
// ────────────────────────────────────────────────────────────

function OrderDetailPanel({
  order,
  onClose,
}: {
  order: VendorOrder;
  onClose: () => void;
}) {
  const confirmMutation = useConfirmOrder();
  const cancelMutation = useCancelOrder();
  const deliveryMutation = useRequestDelivery();

  const handleConfirm = () => {
    confirmMutation.mutate(order.id, {
      onSuccess: () => {
        toast.success("Commande confirmée avec succès");
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Erreur lors de la confirmation");
      },
    });
  };

  const handleRequestDelivery = () => {
    deliveryMutation.mutate(order.id, {
      onSuccess: () => {
        toast.success("Demande de livraison envoyée");
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Erreur lors de la demande de livraison");
      },
    });
  };

  const handleCancel = () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;
    cancelMutation.mutate(order.id, {
      onSuccess: () => {
        toast.success("Commande annulée");
        onClose();
      },
      onError: (err) => {
        toast.error(err.message || "Erreur lors de l'annulation");
      },
    });
  };

  const isMutating = confirmMutation.isPending || cancelMutation.isPending || deliveryMutation.isPending;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed inset-0 z-50 animate-slide-in-right lg:inset-y-0 lg:left-auto lg:right-0 lg:w-full lg:max-w-md">
        <div className="flex h-full flex-col overflow-y-auto bg-white shadow-2xl dark:bg-gray-950 lg:bg-white/90 lg:backdrop-blur-xl lg:dark:bg-gray-950/90">
          {/* Panel Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/60 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-950/80 lg:px-6 lg:py-4">
            <h2 className="text-base font-bold text-gray-900 dark:text-white lg:text-lg">
              Détails de la Commande {order.reference}
            </h2>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Fermer le panneau"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 p-4 lg:space-y-6 lg:p-6">
            {/* ── Client Info ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Information Client
              </h3>
              <div className="mt-3 space-y-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {order.client.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Phone className="h-3.5 w-3.5" />
                  {order.client.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="h-3.5 w-3.5" />
                  {order.client.email}
                </div>
              </div>
            </section>

            {/* ── Products ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Produits
              </h3>
              <div className="mt-3 space-y-3">
                {order.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm dark:bg-gray-800">
                      {product.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {product.name}
                        {product.variant && (
                          <span className="font-normal text-gray-500 dark:text-gray-400">
                            {" "}
                            - {product.variant}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Quantité : {product.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {formatCurrency(product.price)} FCFA
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Delivery Address ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Adresse de livraison
              </h3>
              <div className="mt-3 flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div>
                  <p>{order.deliveryAddress.street}</p>
                  <p>
                    {order.deliveryAddress.city},{" "}
                    {order.deliveryAddress.country}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Timeline ── */}
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Chronologie
              </h3>
              <div className="mt-3 space-y-0">
                {order.timeline.map((event, i) => (
                  <div key={event.id} className="flex gap-3">
                    {/* Dot + line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "mt-1 h-3 w-3 rounded-full border-2",
                          event.completed
                            ? "border-sugu-500 bg-sugu-500"
                            : "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900",
                        )}
                      />
                      {i < order.timeline.length - 1 && (
                        <div
                          className={cn(
                            "my-0.5 w-0.5 flex-1",
                            event.completed
                              ? "bg-sugu-200 dark:bg-sugu-800"
                              : "bg-gray-200 dark:bg-gray-700",
                          )}
                        />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-4">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          event.completed
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-400 dark:text-gray-500",
                        )}
                      >
                        {event.label}
                      </p>
                      {event.date && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {event.date}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Panel Footer — Actions */}
          <div className="sticky bottom-0 flex gap-2 border-t border-gray-200/60 bg-white/80 p-3 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-950/80 lg:gap-3 lg:p-4">
            {order.status === "pending" && (
              <button
                onClick={handleConfirm}
                disabled={isMutating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sugu-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sugu-500/25 transition-all hover:bg-sugu-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {confirmMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Préparer la commande
              </button>
            )}
            {(order.status === "confirmed" || order.status === "processing" || order.status === "packed") && (
              <button
                onClick={handleRequestDelivery}
                disabled={isMutating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-sugu-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sugu-500/25 transition-all hover:bg-sugu-600 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {deliveryMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Demander la livraison
              </button>
            )}
            {!["delivered", "cancelled", "refunded", "shipped"].includes(order.status) && (
              <button
                onClick={handleCancel}
                disabled={isMutating}
                className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
              >
                {cancelMutation.isPending && <Loader2 className="h-4 w-4 animate-spin inline mr-1" />}
                Annuler
              </button>
            )}
            <button className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800">
              Contacter le client
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
