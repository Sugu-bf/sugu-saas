"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Hourglass,
  Search,
  ChevronDown,
  Download,
  Plus,
  Eye,
  MoreHorizontal,
  MapPin,
  Star,
  Phone,
  MessageCircle,
  X,
  ExternalLink,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  PackageOpen,
  Navigation,
  PackageCheck,
  PackageX,
  Loader2,
  Bike,
  Package,
  User,
} from "lucide-react";
import type {
  DeliveryRow,
  DeliveryStatus,
} from "@/features/agency/schema";
import {
  useAgencyDeliveries,
  useUpdateDeliveryStatus,
  useBulkStatus,
} from "@/features/agency/hooks";
import type { DeliveryFilters } from "@/features/agency/service";

// ────────────────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "En attente",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
  },
  pickup: {
    label: "Ramassage",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  en_route: {
    label: "En route",
    bg: "bg-sugu-50 dark:bg-sugu-950/30",
    text: "text-sugu-700 dark:text-sugu-400",
    dot: "bg-sugu-500",
  },
  delivered: {
    label: "Livré",
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  delayed: {
    label: "Retard",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  returned: {
    label: "Échoué",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", dot: "bg-red-500", text: "text-red-600 dark:text-red-400" },
  normal: { label: "Normal", dot: "bg-amber-400", text: "text-amber-600 dark:text-amber-400" },
  low: { label: "Bas", dot: "bg-green-400", text: "text-green-600 dark:text-green-400" },
};

// ────────────────────────────────────────────────────────────
// StatusBadge
// ────────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: DeliveryStatus; label: string }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Detail Panel
// ────────────────────────────────────────────────────────────

function DeliveryDetailPanel({
  row,
  onClose,
  onMarkDelivered,
  onSignalDelay,
  onMarkFailed,
  onRelaunch,
  isMutating,
}: {
  row: DeliveryRow;
  onClose: () => void;
  onMarkDelivered: (id: string) => void;
  onSignalDelay: (id: string) => void;
  onMarkFailed: (id: string) => void;
  onRelaunch: (id: string) => void;
  isMutating: boolean;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-y-auto border-l border-gray-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/95",
        "lg:relative lg:inset-auto lg:max-w-none lg:w-[340px] lg:flex-shrink-0 lg:shadow-none",
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">
            {row.orderId}
          </span>
          <StatusBadge status={row.status} label={row.statusLabel} />
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
              PRIORITY_CONFIG[row.priority].text,
              "bg-red-50 dark:bg-red-950/20",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_CONFIG[row.priority].dot)} />
            {PRIORITY_CONFIG[row.priority].label}
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* ── Commande ── */}
        <section aria-labelledby="panel-order-heading">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              <h2 id="panel-order-heading" className="text-xs font-bold text-gray-900 dark:text-white">
                Commande
              </h2>
            </div>
            <a
              href={row.vendorUrl}
              className="flex items-center gap-1 text-[10px] font-semibold text-sugu-500 hover:text-sugu-600"
            >
              {row.vendor}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {row.orderItems} items :{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(row.orderTotal)} FCFA
              </span>
            </p>
            <span
              className={cn(
                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                row.orderPayment === "paid"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
              )}
            >
              {row.orderPayment === "paid" ? "• paid" : "• en attente"}
            </span>
          </div>
        </section>

        {/* ── Itinéraire ── */}
        <section aria-labelledby="panel-itinerary-heading">
          <div className="mb-2 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            <h2 id="panel-itinerary-heading" className="text-xs font-bold text-gray-900 dark:text-white">
              Itinéraire
            </h2>
          </div>
          <div className="space-y-2">
            {/* From */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                  {row.vendor} — {row.itinerary.from}
                </p>
                <p className="text-[10px] text-gray-400">Distance : {row.itinerary.distanceKm}m</p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-semibold text-gray-500">
                {row.itinerary.fromTime}
              </span>
            </div>
            {/* To */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span className="h-2 w-2 rounded-full bg-sugu-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {row.client.name} — {row.itinerary.to}
                </p>
                <p className="text-[10px] font-semibold text-sugu-500">{row.eta}</p>
                <p className="text-[10px] text-gray-400">
                  {row.itinerary.distanceKm * 2}% restantes
                </p>
              </div>
              <span className="flex-shrink-0 text-[10px] font-semibold text-gray-500">
                {row.eta}
              </span>
            </div>
          </div>
        </section>

        {/* ── Livreur ── */}
        <section aria-labelledby="panel-driver-heading">
          <div className="mb-2 flex items-center gap-1.5">
            <Bike className="h-3.5 w-3.5 text-gray-400" />
            <h2 id="panel-driver-heading" className="text-xs font-bold text-gray-900 dark:text-white">
              Livreur
            </h2>
          </div>
          {row.driver ? (
            <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                      row.driver.avatarColor,
                    )}
                  >
                    {row.driver.initials}
                  </div>
                  {row.driver.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {row.driver.name}
                  </p>
                  <p className="text-[10px] text-gray-400">{row.driver.vehicle}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    row.driver.online
                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800",
                  )}
                >
                  {row.driver.online ? "● ligne" : "hors ligne"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                  {row.driver.rating} (ret)
                </span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button
                  aria-label={`Appeler ${row.driver.name}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Phone className="h-3 w-3" />
                  Call
                </button>
                <button
                  aria-label={`WhatsApp ${row.driver.name}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-green-600"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-50/80 p-4 text-center dark:bg-gray-900/60">
              <UserCheck className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-400">Aucun livreur assigné</p>
              <button className="mt-1 rounded-lg bg-sugu-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-sugu-600">
                + Assigner
              </button>
            </div>
          )}
        </section>

        {/* ── Client ── */}
        <section aria-labelledby="panel-client-heading">
          <div className="mb-2 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <h2 id="panel-client-heading" className="text-xs font-bold text-gray-900 dark:text-white">
              Client
            </h2>
          </div>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  {row.client.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span>Adresse — {row.client.address}</span>
                </div>
                {row.client.note && (
                  <p className="mt-0.5 text-[10px] italic text-gray-400">{row.client.note}</p>
                )}
              </div>
              <button
                aria-label={`Appeler le client ${row.client.name}`}
                className="flex-shrink-0 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Call customer
              </button>
            </div>
          </div>
        </section>

        {/* ── Timeline ── */}
        <section aria-labelledby="panel-timeline-heading">
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <h2 id="panel-timeline-heading" className="text-xs font-bold text-gray-900 dark:text-white">
              Timeline
            </h2>
          </div>
          <ol aria-label="Étapes de livraison" className="space-y-2">
            {row.timeline.map((step) => (
              <li key={step.id} className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2.5 w-2.5 flex-shrink-0 rounded-full",
                    step.done
                      ? "bg-green-500"
                      : step.current
                        ? "bg-sugu-500 ring-2 ring-sugu-200 dark:ring-sugu-900"
                        : "bg-gray-200 dark:bg-gray-700",
                  )}
                />
                <span
                  className={cn(
                    "text-xs",
                    step.done
                      ? "font-medium text-gray-700 dark:text-gray-300"
                      : step.current
                        ? "font-semibold text-gray-900 dark:text-white"
                        : "text-gray-400 dark:text-gray-600",
                  )}
                >
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* ── Action buttons ── */}
      <div className="space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
        {row.status === "en_route" && (
          <button
            id={`btn-mark-delivered-${row.id}`}
            disabled={isMutating}
            onClick={() => onMarkDelivered(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sugu-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.98] disabled:opacity-60"
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Marquer comme livrée
          </button>
        )}
        {row.status === "en_route" && (
          <button
            id={`btn-signal-delay-${row.id}`}
            disabled={isMutating}
            onClick={() => onSignalDelay(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            Signaler un retard
          </button>
        )}
        {!["delivered", "returned", "delayed"].includes(row.status) && (
          <button
            id={`btn-fail-delivery-${row.id}`}
            disabled={isMutating}
            onClick={() => onMarkFailed(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Livraison échouée
          </button>
        )}
        {row.status === "returned" && (
          <button
            id={`btn-relaunch-${row.id}`}
            disabled={isMutating}
            onClick={() => onRelaunch(row.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sugu-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 disabled:opacity-60"
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Relancer
          </button>
        )}
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

type StatusTab = "all" | "pending" | "pickup" | "en_route" | "delivered" | "failed";

type StatusTabItem = {
  key: StatusTab;
  label: string;
  icon: ReactNode;
  /** color applied when tab is inactive */
  iconClass: string;
};

const STATUS_TABS: StatusTabItem[] = [
  {
    key: "all",
    label: "Toutes",
    icon: <Truck className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "pending",
    label: "En attente",
    icon: <Hourglass className="h-3.5 w-3.5" />,
    iconClass: "text-amber-500",
  },
  {
    key: "pickup",
    label: "Ramassage",
    icon: <PackageOpen className="h-3.5 w-3.5" />,
    iconClass: "text-blue-500",
  },
  {
    key: "en_route",
    label: "En route",
    icon: <Navigation className="h-3.5 w-3.5" />,
    iconClass: "text-sugu-500",
  },
  {
    key: "delivered",
    label: "Livrées",
    icon: <PackageCheck className="h-3.5 w-3.5" />,
    iconClass: "text-green-500",
  },
  {
    key: "failed",
    label: "Échouées",
    icon: <PackageX className="h-3.5 w-3.5" />,
    iconClass: "text-red-500",
  },
];

/** Map frontend status tab to backend status filter */
function _tabToBackendStatus(tab: StatusTab): string | undefined {
  const map: Record<StatusTab, string | undefined> = {
    all: undefined,
    pending: "pending",
    pickup: "assigned",
    en_route: "in_transit",
    delivered: "delivered",
    failed: "delivery_failed",
  };
  return map[tab];
}

export function DeliveriesContent() {
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ── Build filters from UI state ──
  const filters: DeliveryFilters = {
    status: _tabToBackendStatus(activeTab),
    search: search || undefined,
    page: currentPage,
    per_page: 12,
  };

  // ── Data fetching ──
  const { data, isLoading, isError } = useAgencyDeliveries(filters);

  // ── Mutations ──
  const updateStatus = useUpdateDeliveryStatus();
  const bulkStatusMutation = useBulkStatus();

  const isMutating = updateStatus.isPending || bulkStatusMutation.isPending;

  const handleMarkDelivered = useCallback(
    (shipmentId: string) => {
      updateStatus.mutate({ shipmentId, status: "delivered" });
    },
    [updateStatus],
  );

  const handleSignalDelay = useCallback(
    (shipmentId: string) => {
      // "delayed" doesn't exist as a backend status — signal via metadata/memo
      // For now, we keep the shipment in_transit but the UI shows delayed (ETA-based)
      // This is a UX-only action: we can add a memo or trigger a notification
      updateStatus.mutate({ shipmentId, status: "in_transit", memo: "Retard signalé par l'agence" });
    },
    [updateStatus],
  );

  const handleMarkFailed = useCallback(
    (shipmentId: string) => {
      updateStatus.mutate({ shipmentId, status: "delivery_failed" });
    },
    [updateStatus],
  );

  const handleRelaunch = useCallback(
    (shipmentId: string) => {
      updateStatus.mutate({ shipmentId, status: "pending" });
    },
    [updateStatus],
  );

  const handleBulkStatusChange = useCallback(
    (status: string) => {
      if (selectedIds.size === 0) return;
      bulkStatusMutation.mutate({
        shipmentIds: Array.from(selectedIds),
        status,
      });
      setSelectedIds(new Set());
    },
    [selectedIds, bulkStatusMutation],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
          <p className="text-sm text-gray-500">Chargement des livraisons…</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <XCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-gray-500">Erreur lors du chargement des livraisons.</p>
        </div>
      </div>
    );
  }

  const { summary, rows, statusCounts, pagination } = data;

  // Filter rows client-side for search within already-filtered results
  const filteredRows = rows.filter((r) => {
    const matchesSearch =
      !search ||
      r.orderId.toLowerCase().includes(search.toLowerCase()) ||
      r.client.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.driver?.name ?? "").toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const openDetail = filteredRows.find((r) => r.id === openDetailId) ?? null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  const totalPages = pagination.totalPages;

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to page 1 when changing tabs
    setSelectedIds(new Set());
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Search is done server-side when user stops typing
    // For now, we filter client-side within the current page for responsiveness
  };

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ════ Main area ════ */}
      <div className="flex min-w-0 flex-1 flex-col space-y-4">
        {/* ────── Header ────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Livraisons{" "}
            <span className="text-base font-normal text-gray-400">
              ({summary.totalToday} aujourd&apos;hui)
            </span>
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/agency/deliveries/new"
              id="btn-new-delivery"
              className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4" />
              Nouvelle livraison
            </Link>
            <button
              id="btn-export-deliveries"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/70 px-4 py-2 text-sm font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
            >
              <Download className="h-4 w-4" />
              Exporter
            </button>
          </div>
        </div>

        {/* ────── KPI Summary Cards ────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center gap-2 text-amber-500">
              <Hourglass className="h-4 w-4" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">En attente</span>
            </div>
            <div className="mt-1.5 text-3xl font-black text-gray-900 dark:text-white">
              {summary.pending}
            </div>
            <p className="text-[10px] text-gray-400">À assigner</p>
          </div>
          <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-2 text-sugu-500">
              <Truck className="h-4 w-4" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">En cours</span>
            </div>
            <div className="mt-1.5 text-3xl font-black text-sugu-600">
              {summary.inProgress}
            </div>
            <p className="text-[10px] text-gray-400">En route/Ramassage</p>
          </div>
          <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "120ms" }}>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Livrées</span>
            </div>
            <div className="mt-1.5 text-3xl font-black text-green-600">
              {summary.delivered}
            </div>
            <p className="text-[10px] text-gray-400">Aujourd&apos;hui</p>
          </div>
          <div className="glass-card animate-card-enter rounded-2xl p-4" style={{ animationDelay: "180ms" }}>
            <div className="flex items-center gap-2 text-red-500">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Échouées</span>
            </div>
            <div className="mt-1.5 text-3xl font-black text-red-500">
              {summary.failed}
            </div>
            <p className="text-[10px] text-gray-400">Retour en cours</p>
          </div>
        </div>

        {/* ────── Status Tabs ────── */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? statusCounts.all
                : tab.key === "en_route"
                  ? statusCounts.en_route
                  : tab.key === "failed"
                    ? statusCounts.failed
                    : statusCounts[tab.key as keyof typeof statusCounts];
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-sugu-500 text-white shadow-sm"
                    : "bg-white/60 text-gray-600 hover:bg-white/80 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-900/60",
                )}
              >
                <span
                  className={cn(
                    "flex items-center",
                    isActive ? "text-white" : tab.iconClass,
                  )}
                >
                  {tab.icon}
                </span>
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                  )}
                >
                  {count ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ────── Search + Filters bar ────── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher #commande, client, livreur…"
              aria-label="Rechercher des livraisons"
              className="form-input pl-9 py-2"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            Aujourd&apos;hui
            <ChevronDown className="h-3 w-3" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            Livreur
            <ChevronDown className="h-3 w-3" />
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            Trier: Priorité
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* ────── Table ────── */}
        <div className="glass-card min-h-0 flex-1 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Tableau des livraisons">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th scope="col" className="pl-4 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredRows.length && filteredRows.length > 0}
                      onChange={toggleAll}
                      aria-label="Sélectionner toutes les livraisons"
                      className="h-4 w-4 rounded accent-sugu-500"
                    />
                  </th>
                  {["Commande", "Client", "Livreur", "Itinéraire", "Priorité", "Statut", "Heure/ETA", "Actions"].map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {filteredRows.map((row) => {
                  const isSelected = selectedIds.has(row.id);
                  const isOpen = openDetailId === row.id;
                  const priorCfg = PRIORITY_CONFIG[row.priority];

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setOpenDetailId(isOpen ? null : row.id)}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/30",
                        isOpen && "bg-sugu-50/60 dark:bg-sugu-950/20",
                        isSelected && "bg-blue-50/40 dark:bg-blue-950/10",
                      )}
                    >
                      {/* Checkbox */}
                      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          aria-label={`Sélectionner la commande ${row.orderId}`}
                          className="h-4 w-4 rounded accent-sugu-500"
                        />
                      </td>

                      {/* Commande ID */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs font-bold text-sugu-600 dark:text-sugu-400">
                          {row.orderId}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                              row.client.avatarColor,
                            )}
                          >
                            {row.client.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800 dark:text-gray-200">
                              {row.client.name}
                            </p>
                            <p className="text-[10px] text-gray-400">{row.client.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Livreur */}
                      <td className="px-3 py-3">
                        {row.driver ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                                  row.driver.avatarColor,
                                )}
                              >
                                {row.driver.initials}
                              </div>
                              {row.driver.online && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white bg-green-500 dark:border-gray-900" />
                              )}
                            </div>
                            <span className="truncate text-xs text-gray-700 dark:text-gray-300">
                              {row.driver.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-gray-400">Non assigné</span>
                        )}
                      </td>

                      {/* Itinéraire */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-sugu-400" />
                          <span className="truncate max-w-[120px]">
                            {row.itinerary.from} → {row.itinerary.to}
                          </span>
                        </div>
                      </td>

                      {/* Priorité */}
                      <td className="px-3 py-3">
                        <span className={cn("flex items-center gap-1 text-[11px] font-semibold", priorCfg.text)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", priorCfg.dot)} />
                          {priorCfg.label}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-3 py-3">
                        <StatusBadge status={row.status} label={row.statusLabel} />
                      </td>

                      {/* ETA */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            "text-[11px] font-semibold whitespace-nowrap",
                            row.status === "delayed"
                              ? "text-red-500"
                              : row.status === "delivered"
                                ? "text-green-600"
                                : "text-gray-700 dark:text-gray-300",
                          )}
                        >
                          {row.eta}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {row.status === "pending" && (
                            <button
                              aria-label={`Assigner ${row.orderId}`}
                              className="rounded-lg bg-sugu-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-sugu-600"
                            >
                              + Assigner
                            </button>
                          )}
                          {row.status === "returned" && (
                            <button
                              aria-label={`Relancer ${row.orderId}`}
                              onClick={() => handleRelaunch(row.id)}
                              disabled={isMutating}
                              className="rounded-lg bg-sugu-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-sugu-600 disabled:opacity-60"
                            >
                              ↺ Relancer
                            </button>
                          )}
                          <Link
                            href={`/agency/deliveries/${row.id}`}
                            aria-label={`Voir le détail ${row.orderId}`}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-sugu-500 dark:hover:bg-gray-800 dark:hover:text-sugu-400 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            aria-label={`Plus d'options ${row.orderId}`}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Bulk action footer ── */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 border-t border-sugu-100 bg-sugu-50/70 px-4 py-2.5 dark:border-sugu-900/30 dark:bg-sugu-950/20">
              <span className="text-xs font-semibold text-sugu-700 dark:text-sugu-400">
                {selectedIds.size} sélectionnées
              </span>
              <button
                onClick={() => handleBulkStatusChange("assigned")}
                disabled={isMutating}
                className="rounded-xl bg-sugu-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sugu-600 disabled:opacity-60"
              >
                Assigner →
              </button>
              <button
                onClick={() => handleBulkStatusChange("delivered")}
                disabled={isMutating}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 disabled:opacity-60"
              >
                Changer statut
                <ChevronDown className="h-3 w-3" />
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <Download className="h-3 w-3" />
                Exporter
              </button>
            </div>
          )}

          {/* ── Pagination ── */}
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              1–{Math.min(pagination.perPage, filteredRows.length)} sur {pagination.totalItems} livraisons
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Page précédente"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    "h-7 w-7 rounded-lg text-xs font-semibold",
                    currentPage === p
                      ? "bg-sugu-500 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
                  )}
                >
                  {p}
                </button>
              ))}
              {totalPages > 4 && <span className="text-gray-400">…</span>}
              {totalPages > 3 && (
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-7 w-7 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {totalPages}
                </button>
              )}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <span className="ml-2 text-xs text-gray-400">{pagination.perPage} par page</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════ Detail Panel ════ */}
      {openDetail && (
        <div className="ml-4 hidden lg:flex">
          <DeliveryDetailPanel
            row={openDetail}
            onClose={() => setOpenDetailId(null)}
            onMarkDelivered={handleMarkDelivered}
            onSignalDelay={handleSignalDelay}
            onMarkFailed={handleMarkFailed}
            onRelaunch={handleRelaunch}
            isMutating={isMutating}
          />
        </div>
      )}

      {/* Mobile detail panel overlay */}
      {openDetail && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpenDetailId(null)}
            aria-hidden="true"
          />
          <DeliveryDetailPanel
            row={openDetail}
            onClose={() => setOpenDetailId(null)}
            onMarkDelivered={handleMarkDelivered}
            onSignalDelay={handleSignalDelay}
            onMarkFailed={handleMarkFailed}
            onRelaunch={handleRelaunch}
            isMutating={isMutating}
          />
        </div>
      )}
    </div>
  );
}
