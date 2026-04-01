"use client";

// ============================================================
// DriverDeliveriesContent — slim orchestrator
//
// All UI components live in _components/.
// This file handles: state, data fetching, filtering,
// and composing the layout.
// ============================================================

import { useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { useDriverDeliveries } from "@/features/driver/hooks";
import type { DriverDeliveryFilters } from "@/features/driver/service";
import {
  tabToDriverStatus,
  KpiSummaryBar,
  StatusTabBar,
  SearchBar,
  DeliveryCard,
  EmptyState,
  DriverDeliveryDetailPanel,
  useDeliveryActions,
} from "./_components";
import type { DriverStatusTab } from "./_components";

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function DriverDeliveriesContent() {
  // ── UI state ──
  const [activeTab, setActiveTab] = useState<DriverStatusTab>("all");
  const [search, setSearch] = useState("");
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  // ── Filters → data ──
  const filters: DriverDeliveryFilters = {
    status: tabToDriverStatus(activeTab),
    search: search || undefined,
  };
  const { data, isLoading, isError } = useDriverDeliveries(filters);

  // ── Mutations (centralised) ──
  const {
    isMutating,
    handleAccept,
    handleRefuse,
    handleStartTransit,
    handleMarkArrived,
    handleMarkDelivered,
    handleSignalDelay,
    handleMarkFailed,
  } = useDeliveryActions();

  // ── Tab change resets detail panel ──
  const handleTabChange = (tab: DriverStatusTab) => {
    setActiveTab(tab);
    setOpenDetailId(null);
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="h-12 w-12 rounded-2xl bg-sugu-500 animate-pulse" />
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-white" />
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Chargement de vos livraisons…
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              Erreur de chargement
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Impossible de charger vos livraisons.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived data ──
  const { summary, rows, statusCounts } = data;

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.orderId.toLowerCase().includes(q) ||
      r.client.name.toLowerCase().includes(q) ||
      r.itinerary.pickupName.toLowerCase().includes(q) ||
      r.itinerary.deliveryName.toLowerCase().includes(q)
    );
  });

  const openDetail = filteredRows.find((r) => r.id === openDetailId) ?? null;

  // ── Shared detail panel props ──
  const detailPanelProps = openDetail
    ? {
        row: openDetail,
        onClose: () => setOpenDetailId(null),
        onStartTransit: handleStartTransit,
        onMarkArrived: handleMarkArrived,
        onMarkDelivered: handleMarkDelivered,
        onSignalDelay: handleSignalDelay,
        onMarkFailed: handleMarkFailed,
        onAccept: handleAccept,
        onRefuse: handleRefuse,
        isMutating,
      }
    : null;

  // ── Render ──
  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ═══════════ LEFT — List panel ═══════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pr-0 lg:pr-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white lg:text-2xl">
              Mes Livraisons
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100/80 px-2.5 py-1 text-[10px] font-bold text-green-700 dark:bg-green-950/40 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              En service
            </span>
          </div>
        </div>

        {/* KPI Summary */}
        <KpiSummaryBar summary={summary} />

        {/* Status Tabs */}
        <StatusTabBar
          activeTab={activeTab}
          statusCounts={statusCounts}
          onTabChange={handleTabChange}
        />

        {/* Search */}
        <SearchBar value={search} onChange={setSearch} />

        {/* Delivery Cards */}
        <div className="space-y-3 pb-4">
          {filteredRows.length > 0 ? (
            filteredRows.map((row, index) => (
              <DeliveryCard
                key={row.id}
                row={row}
                index={index}
                isSelected={openDetailId === row.id}
                onClick={() =>
                  setOpenDetailId(openDetailId === row.id ? null : row.id)
                }
              />
            ))
          ) : (
            <EmptyState
              search={search}
              onClearSearch={() => setSearch("")}
              activeTab={activeTab}
            />
          )}
        </div>
      </div>

      {/* ═══════════ RIGHT — Detail Panel (desktop) ═══════════ */}
      {detailPanelProps && (
        <div className="ml-2 hidden lg:flex">
          <DriverDeliveryDetailPanel {...detailPanelProps} />
        </div>
      )}

      {/* ═══════════ Mobile detail overlay ═══════════ */}
      {detailPanelProps && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpenDetailId(null)}
            aria-hidden="true"
          />
          <DriverDeliveryDetailPanel {...detailPanelProps} />
        </div>
      )}
    </div>
  );
}
