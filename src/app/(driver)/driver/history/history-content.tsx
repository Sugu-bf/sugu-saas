"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  CheckCircle2,
  XCircle,
  Banknote,
  AlertTriangle,
  ChevronDown,
  Clock,
  Route,
} from "lucide-react";
import { useDriverHistory } from "@/features/driver/hooks";
import type { DriverHistoryRow, DriverHistoryStatus } from "@/features/driver/schema";

// ────────────────────────────────────────────────────────────
// Status tab config
// ────────────────────────────────────────────────────────────

type HistoryStatusTab = "all" | DriverHistoryStatus;

interface HistoryTab {
  key: HistoryStatusTab;
  label: string;
  icon: React.ElementType;
}

const HISTORY_TABS: HistoryTab[] = [
  { key: "all", label: "Tous", icon: Package },
  { key: "delivered", label: "Terminées", icon: CheckCircle2 },
  { key: "failed", label: "Annulées", icon: XCircle },
];

// ────────────────────────────────────────────────────────────
// Period pills config
// ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { key: string; label: string }[] = [
  { key: "7d", label: "7j" },
  { key: "30d", label: "30j" },
  { key: "3m", label: "3 mois" },
  { key: "all", label: "Tout" },
];

// ────────────────────────────────────────────────────────────
// KPI Card sub-component
// ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  iconBg,
  value,
  label,
  badge,
  badgeBg,
  valueColor,
}: {
  icon: React.ElementType;
  iconBg: string;
  value: string;
  label: string;
  badge?: string;
  badgeBg?: string;
  valueColor?: string;
}) {
  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-4 animate-card-enter">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          iconBg,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p
          className={cn(
            "text-2xl font-extrabold",
            valueColor ?? "text-gray-900",
          )}
        >
          {value}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
          {label}
        </p>
        {badge && (
          <span
            className={cn(
              "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badgeBg ?? "bg-gray-100 text-gray-600",
            )}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// History Row sub-component (Desktop)
// ────────────────────────────────────────────────────────────

function HistoryRow({
  row,
  index,
}: {
  row: DriverHistoryRow;
  index: number;
}) {
  const isFailed = row.status === "failed";

  return (
    <Link
      href={`/driver/deliveries/${row.id}`}
      className="group hidden items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50/50 lg:grid"
      style={{
        gridTemplateColumns: "40px 120px 1fr 160px 80px 80px 60px 60px 32px",
      }}
    >
      {/* # */}
      <span className="font-mono text-xs text-gray-400">{index + 1}</span>

      {/* Date */}
      <div>
        <p className="text-xs font-semibold text-gray-700">{row.date}</p>
        <p className="text-[10px] text-gray-400">{row.time}</p>
      </div>

      {/* Itinerary — compact dots */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
          <span className="truncate text-xs text-gray-700">
            {row.pickupName}
          </span>
          <span className="text-gray-300">→</span>
          <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sugu-500" />
          <span className="truncate text-xs text-gray-700">
            {row.deliveryName}
          </span>
        </div>
        {/* Fail reason or client note below route */}
        {row.failReason && (
          <p className="mt-0.5 text-[10px] text-red-400">{row.failReason}</p>
        )}
        {!row.failReason && row.clientNote && (
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-500">
            <AlertTriangle className="h-2.5 w-2.5" />
            {row.clientNote}
          </p>
        )}
      </div>

      {/* Client */}
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-600">{row.clientName}</p>
        <p className="text-[10px] text-gray-400">
          {row.parcelCount} colis
        </p>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
          isFailed ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isFailed ? "bg-red-500" : "bg-green-500",
          )}
        />
        {row.statusLabel}
      </span>

      {/* Gain */}
      <span
        className={cn(
          "text-sm font-bold",
          isFailed ? "text-gray-400 line-through" : "text-green-600",
        )}
      >
        {formatCurrency(row.amount)} F
      </span>

      {/* Duration */}
      <span className="text-xs text-gray-500">{row.durationMinutes} min</span>

      {/* Distance */}
      <span className="text-xs text-gray-500">{row.distanceKm}km</span>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />
    </Link>
  );
}

// ────────────────────────────────────────────────────────────
// History Row sub-component (Mobile)
// ────────────────────────────────────────────────────────────

function MobileHistoryRow({
  row,
}: {
  row: DriverHistoryRow;
}) {
  const isFailed = row.status === "failed";

  return (
    <Link
      href={`/driver/deliveries/${row.id}`}
      className="flex items-center justify-between border-b border-gray-50 px-4 py-3 lg:hidden"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">{row.orderId}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              isFailed
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-700",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isFailed ? "bg-red-500" : "bg-green-500",
              )}
            />
            {row.statusLabel}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          <span className="truncate">
            {row.pickupName} → {row.deliveryName}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-400">
          {row.date}, {row.time}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 pl-2 text-right">
        <span
          className={cn(
            "text-sm font-bold",
            isFailed ? "text-gray-400 line-through" : "text-green-600",
          )}
        >
          {formatCurrency(row.amount)} F
        </span>
        <ChevronRight className="ml-1 inline h-4 w-4 text-gray-300" />
      </div>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function DriverHistoryContent() {
  // ── State ──
  const [activeTab, setActiveTab] = useState<HistoryStatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState<"7d" | "30d" | "3m" | "all">("all");

  // ── Data ──
  const { data, isLoading } = useDriverHistory({
    status: activeTab === "all" ? undefined : (activeTab as DriverHistoryStatus),
    search: searchQuery || undefined,
    page: currentPage,
    period,
  });

  // ── Handlers ──
  const handleTabChange = useCallback((tab: HistoryStatusTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePeriodChange = useCallback((p: "7d" | "30d" | "3m" | "all") => {
    setPeriod(p);
    setCurrentPage(1);
  }, []);

  // ── Loading State ──
  if (isLoading && !data) {
    return <HistoryLoadingSkeleton />;
  }

  if (!data) return null;

  const { kpis, statusCounts, rows, pagination } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-3 lg:space-y-5">
      {/* ════════════ Page Header ════════════ */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
            <Clock className="mr-2 inline h-5 w-5 text-sugu-500 lg:h-6 lg:w-6" />
            Historique des livraisons
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Toutes vos courses passées
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
          aria-label="Exporter l'historique"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exporter</span>
        </button>
      </div>

      {/* ════════════ KPI Summary Row ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Package}
          iconBg="bg-sugu-50 text-sugu-500"
          value={kpis.totalDeliveries.toLocaleString("fr-FR")}
          label="Total courses"
        />
        <KpiCard
          icon={CheckCircle2}
          iconBg="bg-green-50 text-green-500"
          value={kpis.delivered.toLocaleString("fr-FR")}
          label="Livrées"
          valueColor="text-green-600"
          badge={`${kpis.deliveredPercent}%`}
          badgeBg="bg-green-100 text-green-700"
        />
        <KpiCard
          icon={XCircle}
          iconBg="bg-red-50 text-red-400"
          value={kpis.failed.toLocaleString("fr-FR")}
          label="Échouées"
          valueColor="text-red-500"
          badge={`${kpis.failedPercent}%`}
          badgeBg="bg-red-50 text-red-600"
        />
        <KpiCard
          icon={Banknote}
          iconBg="bg-amber-50 text-amber-500"
          value={formatCurrency(kpis.totalEarnings)}
          label="FCFA gagnés"
          badge={`Moy. ${formatCurrency(kpis.avgEarningsPerDelivery)} F/course`}
          badgeBg="bg-amber-50 text-amber-700"
        />
      </div>

      {/* ════════════ Filter Bar ════════════ */}
      <div className="glass-card flex flex-col gap-3 rounded-2xl px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Status tabs + Date range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          {HISTORY_TABS.map((tab) => {
            const count =
              tab.key === "all"
                ? statusCounts.all
                : statusCounts[tab.key as keyof typeof statusCounts];
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "border-sugu-200 bg-sugu-50 font-semibold text-sugu-600"
                    : "border-gray-200 bg-white/50 text-gray-500 hover:bg-white hover:text-gray-700",
                )}
              >
                <TabIcon className="h-3 w-3" />
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isActive
                      ? "bg-sugu-100 text-sugu-700"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}

          {/* Date range picker — Visual only (MVP) */}
          <button className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50 lg:flex">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
            1 Mars — 8 Mars 2026
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </button>
        </div>

        {/* Right: Period pills + Search */}
        <div className="flex items-center gap-2">
          {/* Period pills */}
          <div className="flex items-center gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() =>
                  handlePeriodChange(opt.key as "7d" | "30d" | "3m" | "all")
                }
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                  period === opt.key
                    ? "border-sugu-200 bg-sugu-50 text-sugu-600"
                    : "border-gray-200 bg-white/50 text-gray-500 hover:bg-gray-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-36 rounded-xl border border-gray-200 bg-white/60 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 lg:w-48"
              id="history-search"
            />
          </div>
        </div>
      </div>

      {/* ════════════ History Table ════════════ */}
      <div className="glass-card overflow-hidden rounded-2xl lg:rounded-3xl">
        {/* Table Header (desktop only) */}
        <div className="hidden border-b border-gray-100/80 bg-gray-50/30 lg:block">
          <div
            className="items-center gap-3 px-5 py-3"
            style={{
              display: "grid",
              gridTemplateColumns:
                "40px 120px 1fr 160px 80px 80px 60px 60px 32px",
            }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              #
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Date
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Itinéraire
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Client
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Status
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Gain
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Durée
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Dist.
            </span>
            <span /> {/* Chevron column */}
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100/60">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Route className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-400">
                Aucune course trouvée pour ces filtres.
              </p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <div key={row.id}>
                {/* Desktop Row */}
                <HistoryRow row={row} index={idx} />
                {/* Mobile Row */}
                <MobileHistoryRow row={row} />
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {rows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100/80 px-4 py-3 sm:flex-row lg:px-6 lg:py-4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  handlePageChange(Math.max(1, currentPage - 1))
                }
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from(
                { length: Math.min(3, pagination.totalPages) },
                (_, i) => i + 1,
              ).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    p === currentPage
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {p}
                </button>
              ))}
              {pagination.totalPages > 3 && (
                <>
                  <span className="px-1 text-gray-400">…</span>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      currentPage === pagination.totalPages
                        ? "bg-sugu-500 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {pagination.totalPages}
                  </button>
                </>
              )}
              <button
                onClick={() =>
                  handlePageChange(
                    Math.min(pagination.totalPages, currentPage + 1),
                  )
                }
                disabled={currentPage >= pagination.totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 lg:text-sm">
              Affichage{" "}
              {(currentPage - 1) * pagination.perPage + 1}-
              {Math.min(
                currentPage * pagination.perPage,
                pagination.totalItems,
              )}{" "}
              sur {pagination.totalItems.toLocaleString("fr-FR")} résultats
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Inline Loading Skeleton (used when data hasn't loaded yet)
// ────────────────────────────────────────────────────────────

function HistoryLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-3 animate-fade-in lg:space-y-5">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 w-64 rounded-lg bg-gray-200 animate-shimmer" />
          <div className="h-4 w-44 rounded bg-gray-200 animate-shimmer" />
        </div>
        <div className="h-9 w-28 rounded-xl bg-gray-200 animate-shimmer" />
      </div>
      {/* KPIs skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card h-20 rounded-2xl animate-shimmer"
          />
        ))}
      </div>
      {/* Filter bar skeleton */}
      <div className="glass-card h-14 rounded-2xl animate-shimmer" />
      {/* Table skeleton */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="h-12 bg-gray-50/30 animate-shimmer" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-gray-50 animate-shimmer"
          />
        ))}
        <div className="h-14 animate-shimmer" />
      </div>
    </div>
  );
}
