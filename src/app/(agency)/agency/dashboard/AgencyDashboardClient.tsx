"use client";

import { useAgencyDashboard } from "@/features/agency/hooks";
import { cn } from "@/lib/utils";
import {
  Truck,
  CheckCircle,
  Clock,
  Banknote,
  Bell,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import type {
  AgencyKpi,
  ActiveDelivery,
  DriverPerformance,
  Complaint,
  DeliveryStatus,
  AgencyEarningsPoint,
} from "@/features/agency/schema";

// --- Icon mapping ---
const KPI_ICONS: Record<string, ReactNode> = {
  truck: <Truck className="h-5 w-5" />,
  "check-circle": <CheckCircle className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  banknote: <Banknote className="h-5 w-5" />,
};

// --- Delivery status badge styles ---
const DELIVERY_STATUS: Record<DeliveryStatus, string> = {
  pending:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  pickup:
    "bg-sugu-50 text-sugu-600 border-sugu-200 dark:bg-sugu-950/30 dark:text-sugu-400",
  en_route:
    "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  delivered:
    "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400",
  delayed:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400",
  returned:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
};

// ════════════════════════════════════════════════════════════
// Client Component — uses useAgencyDashboard() hook
// ════════════════════════════════════════════════════════════

export default function AgencyDashboardClient() {
  const { data, isLoading, isError } = useAgencyDashboard();

  // While loading, the loading.tsx skeleton is shown by Next.js Suspense.
  // But since this is now client-side, we handle loading state here too.
  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sugu-200 border-t-sugu-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Erreur de chargement
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Impossible de charger le tableau de bord. Veuillez réessayer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sugu-500 lg:h-11 lg:w-11 lg:rounded-2xl">
            <Truck className="h-4 w-4 text-white lg:h-5 lg:w-5" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
            {data.agencyName}
          </h1>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-gray-500 shadow-sm backdrop-blur-md transition-all active:scale-95 lg:h-10 lg:w-10 lg:rounded-2xl dark:border-gray-700/50 dark:bg-gray-900/50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse-dot lg:right-2 lg:top-2" />
          </button>
        </div>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.id} kpi={kpi} delay={i} />
        ))}
      </div>

      {/* ════════════ Middle Row: Map + Active Deliveries ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Map placeholder */}
        <section className="glass-card overflow-hidden rounded-2xl lg:rounded-3xl" aria-label="Carte des livraisons">
          <div className="relative h-56 bg-green-50/80 dark:bg-green-950/20 lg:h-80">
            {/* Stylized map placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="mx-auto h-10 w-10 text-sugu-400/60" />
                <p className="mt-2 text-lg font-bold text-gray-700/80 dark:text-gray-300/60">
                  Burkina Faso
                </p>
              </div>
            </div>

            {/* Delivery pins — positioned from real data coordinates */}
            {data.mapPins.map((pin, i) => {
              const colors: Record<string, string> = {
                en_route: "bg-sugu-500",
                pickup: "bg-green-500",
                pending: "bg-yellow-500",
                delayed: "bg-red-500",
                delivered: "bg-blue-500",
                returned: "bg-gray-400",
              };
              // Bounding box: lat ~12.33–12.41, lng ~-1.56–-1.48 (Ouagadougou area)
              const latMin = 12.33, latMax = 12.41;
              const lngMin = -1.56, lngMax = -1.48;
              const topPct = 10 + (1 - (pin.lat - latMin) / (latMax - latMin)) * 70; // 10–80%
              const leftPct = 10 + ((pin.lng - lngMin) / (lngMax - lngMin)) * 75;   // 10–85%

              return (
                <div
                  key={pin.id}
                  className={cn(
                    "absolute h-3.5 w-3.5 rounded-full shadow-md ring-2 ring-white dark:ring-gray-900 animate-card-enter",
                    colors[pin.status] || "bg-gray-400",
                  )}
                  style={{
                    top: `${Math.max(10, Math.min(80, topPct))}%`,
                    left: `${Math.max(10, Math.min(85, leftPct))}%`,
                    animationDelay: `${i * 100}ms`,
                  }}
                  aria-label={`Livreur ${pin.status}`}
                />
              );
            })}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 rounded-xl bg-white/80 px-3 py-2 backdrop-blur-md dark:bg-gray-900/80">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full bg-sugu-500" /> en route
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> pickup
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> delayed
              </div>
            </div>
          </div>
        </section>

        {/* Active Deliveries */}
        <section
          className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6"
          aria-labelledby="active-deliveries-title"
        >
          <h2
            id="active-deliveries-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Livraisons en cours
          </h2>

          {/* Column headers */}
          <div className="mt-4 hidden grid-cols-12 items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:grid">
            <span className="col-span-4">Livreur</span>
            <span className="col-span-4">Route addresses</span>
            <span className="col-span-2 text-center">Status</span>
            <span className="col-span-2 text-right">ETA</span>
          </div>

          <div className="mt-2 space-y-0">
            {data.activeDeliveries.map((delivery) => (
              <DeliveryRow key={delivery.id} delivery={delivery} />
            ))}
          </div>
        </section>
      </div>

      {/* ════════════ Bottom Row: Performance + Complaints + Earnings ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Earnings Chart */}
        <EarningsChart
          data={data.earningsChart ?? []}
          total={data.earningsTotal ?? 0}
          previous={data.earningsPrevious ?? 0}
        />

        {/* Driver Performance */}
        <section
          className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6"
          aria-labelledby="performance-title"
        >
          <h2
            id="performance-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Performance livreurs
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            Taux de {data.driverPerformance.length} livreurs
          </p>
          <div className="mt-4 space-y-3">
            {data.driverPerformance.map((driver) => (
              <DriverBar key={driver.id} driver={driver} />
            ))}
          </div>
        </section>

        {/* Complaints */}
        <section
          className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6"
          aria-labelledby="complaints-title"
        >
          <h2
            id="complaints-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Réclamations récentes
          </h2>
          <div className="mt-4 space-y-3">
            {data.complaints.map((complaint) => (
              <ComplaintRow key={complaint.id} complaint={complaint} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

/** KPI Card */
function KpiCard({ kpi, delay }: { kpi: AgencyKpi; delay: number }) {
  const isRing = kpi.ringPercent !== undefined;

  return (
    <div
      className={`kpi-card glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:rounded-3xl lg:p-5 lg:hover:-translate-y-1 animate-card-enter`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl ${kpi.iconBg} shadow-sm`}
        >
          {KPI_ICONS[kpi.icon] ?? <Truck className="h-4 w-4 lg:h-5 lg:w-5" />}
        </div>

        {/* Circular ring for success rate */}
        {isRing && (
          <div className="relative h-10 w-10 lg:h-12 lg:w-12">
            <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90 lg:h-12 lg:w-12">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-200/60 dark:text-gray-700/40"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${kpi.ringPercent}, 100`}
                strokeLinecap="round"
                className="text-green-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-700 dark:text-gray-300">
              {kpi.ringPercent}%
            </span>
          </div>
        )}

        {kpi.badge && !isRing && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${kpi.badgeColor ?? "text-gray-600 bg-gray-100"}`}
          >
            {kpi.badge}
          </span>
        )}
      </div>

      <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
        {kpi.label}
      </p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-gray-900 dark:text-white lg:text-2xl">
          {kpi.value}
        </span>
        {kpi.subValue && (
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {kpi.subValue}
          </span>
        )}
      </div>
    </div>
  );
}

/** Active delivery row */
function DeliveryRow({ delivery }: { delivery: ActiveDelivery }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/30 px-3 py-3 transition-colors active:bg-white/50 dark:bg-white/5 dark:active:bg-white/10 lg:grid lg:grid-cols-12 lg:items-center lg:gap-2 lg:bg-transparent lg:px-2">
      {/* Driver */}
      <div className="flex items-center gap-2.5 lg:col-span-4">
        <div className="text-[10px] font-bold text-gray-400">{delivery.orderId}</div>
        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${delivery.driver.avatarColor}`}>
          {delivery.driver.initials}
        </div>
        <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300 lg:text-sm">
          {delivery.driver.name}
        </span>
      </div>

      {/* Route + Status + ETA — stacked on mobile */}
      <div className="flex items-center justify-between gap-2 lg:contents">
        <p className="flex-1 truncate text-[11px] text-gray-500 dark:text-gray-400 lg:col-span-4 lg:text-xs">
          {delivery.routeAddresses}
        </p>
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold lg:col-span-2 lg:text-center",
            DELIVERY_STATUS[delivery.status],
          )}
        >
          {delivery.statusLabel}
        </span>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 lg:col-span-2 lg:text-right lg:text-xs">
          {delivery.eta}
        </span>
      </div>
    </div>
  );
}

/** Driver performance bar */
function DriverBar({ driver }: { driver: DriverPerformance }) {
  return (
    <div className="flex items-center gap-2.5 lg:gap-3">
      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${driver.avatarColor}`}>
        {driver.initials}
      </div>
      <span className="w-16 truncate text-xs font-medium text-gray-700 dark:text-gray-300 lg:w-20 lg:text-sm">
        {driver.name}
      </span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40 lg:h-2.5">
          <div
            className="h-full rounded-full bg-sugu-500 transition-all duration-700"
            style={{ width: `${driver.score}%` }}
          />
        </div>
      </div>
      <span className="w-9 text-right text-xs font-bold text-gray-700 dark:text-gray-300 lg:w-10 lg:text-sm">
        {driver.score}%
      </span>
    </div>
  );
}

/** Complaint row */
function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const isUrgent = complaint.severity === "urgent";

  return (
    <div className="rounded-xl bg-white/40 px-3 py-3 dark:bg-white/5 lg:px-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {complaint.title}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">{complaint.date}</p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
            isUrgent
              ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
              : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400",
          )}
        >
          {isUrgent ? "Urgent" : "Normal"}
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="rounded-lg border border-sugu-200 bg-sugu-50/80 px-3 py-1 text-xs font-semibold text-sugu-600 transition-all hover:bg-sugu-100 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400">
          Traiter
        </button>
        <button className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
          Détails
        </button>
      </div>
    </div>
  );
}

/** Earnings SVG area chart */
function EarningsChart({
  data,
  total,
  previous,
}: {
  data: AgencyEarningsPoint[];
  total: number;
  previous: number;
}) {
  const [period, setPeriod] = useState<"7j" | "30j">("7j");

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6">
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          Aucune donnée de gains
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartW = 340;
  const chartH = 160;
  const padding = 20;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (chartW - padding * 2),
    y: chartH - padding - (d.value / maxVal) * (chartH - padding * 2),
  }));

  // Build SVG path for smooth curve
  const linePath = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area path (close to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x},${chartH - padding} L ${points[0].x},${chartH - padding} Z`;

  const growthPercent =
    previous > 0 ? Math.round(((total - previous) / previous) * 100) : 0;

  return (
    <section
      className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6 flex flex-col h-full"
      aria-labelledby="earnings-chart-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between shadow-sm">
        <h2
          id="earnings-chart-title"
          className="text-base font-semibold text-gray-900 dark:text-white"
        >
          <Banknote className="h-4 w-4 mr-1.5 inline" /> Gains
        </h2>
        <div className="flex gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-0.5 rounded-lg">
          {(["7j", "30j"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                period === p
                  ? "bg-white text-sugu-600 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 flex-1 flex flex-col justify-center">
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-32 w-full lg:h-36"
            preserveAspectRatio="none"
            role="img"
            aria-label="Graphique des gains sur 7 jours"
          >
            <defs>
              <linearGradient
                id="agency-chart-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f15412" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient
                id="agency-line-gradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#fb8a3c" />
                <stop offset="100%" stopColor="#f15412" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill="url(#agency-chart-gradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#agency-line-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="chart-path"
            />

            {/* Dots */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="white"
                stroke="#f15412"
                strokeWidth="2"
                className="animate-card-enter"
                style={{ animationDelay: `${i * 80 + 400}ms` }}
              />
            ))}
          </svg>

          {/* Day labels */}
          <div className="mt-1.5 flex justify-between px-2 lg:mt-2 lg:px-5">
            {data.map((d) => (
              <span
                key={d.day}
                className="text-[9px] font-medium text-gray-400 dark:text-gray-500 lg:text-[11px]"
              >
                {d.day}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats below chart */}
      <div className="mt-auto pt-3 flex items-center justify-between rounded-xl bg-white/40 px-4 py-3 dark:bg-white/5">
        <div>
          <p className="text-[10px] uppercase font-bold text-gray-400">Total Période</p>
          <p className="text-[15px] font-extrabold text-gray-900 dark:text-white">
            {total.toLocaleString("fr-FR")} <span className="text-[10px] text-gray-500 font-medium">FCFA</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-gray-400">
            vs précédente
          </p>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-green-50/80 px-2 py-0.5 dark:bg-green-900/20">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <p className="text-xs font-bold text-green-600 dark:text-green-400">
              {growthPercent >= 0 ? "+" : ""}
              {growthPercent}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
