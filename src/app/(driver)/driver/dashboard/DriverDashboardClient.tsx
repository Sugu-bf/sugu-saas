"use client";

import { useState } from "react";
import Link from "next/link";
import { useDriverDashboard } from "@/features/driver/hooks";
import {
  Package,
  CheckCircle,
  Banknote,
  Timer,
  Bike,
  Bell,
  Phone,
  Check,
  AlertTriangle,
  ChevronRight,
  Truck,
  Clock,
  ClipboardList,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  DriverKpi,
  CurrentDelivery,
  QueuedDelivery,
  EarningsPoint,
  ActivityEvent,
} from "@/features/driver/schema";
import { ErrorState } from "@/components/feedback";
import DriverDashboardLoading from "./loading";

// --- Icon mapping ---
const KPI_ICONS: Record<string, ReactNode> = {
  package: <Package className="h-5 w-5" />,
  "check-circle": <CheckCircle className="h-5 w-5" />,
  banknote: <Banknote className="h-5 w-5" />,
  timer: <Timer className="h-5 w-5" />,
};

// ════════════════════════════════════════════════════════════
// Client Component — uses useDriverDashboard() hook
// ════════════════════════════════════════════════════════════

export default function DriverDashboardClient() {
  const { data, isLoading, isError, error, refetch } = useDriverDashboard();

  if (isLoading) return <DriverDashboardLoading />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title="Erreur du tableau de bord"
          description={
            error?.message ||
            "Impossible de charger le tableau de bord. Veuillez réessayer."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 lg:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sugu-500 lg:h-11 lg:w-11 lg:rounded-2xl">
            <Bike className="h-4 w-4 text-white lg:h-5 lg:w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
              Bonjour, {data.driverName}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 lg:text-sm">
              {data.date} · {data.city}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Online badge */}
          {data.isOnline && (
            <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50/60 px-3 py-1.5 dark:border-green-800 dark:bg-green-950/30">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse-dot" />
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                En ligne
              </span>
            </div>
          )}

          {/* Notifications bell */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-gray-500 backdrop-blur-md transition-all active:scale-95 lg:h-10 lg:w-10 lg:rounded-2xl dark:border-gray-700/50 dark:bg-gray-900/50"
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

      {/* ════════════ Middle Row: Current Delivery + Queue ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        {/* Current Delivery — 3 cols */}
        <div className="lg:col-span-3">
          {data.currentDelivery ? (
            <CurrentDeliveryCard delivery={data.currentDelivery} />
          ) : (
            <div className="glass-card flex h-56 items-center justify-center rounded-2xl lg:rounded-3xl">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Aucune livraison en cours
              </p>
            </div>
          )}
        </div>

        {/* Delivery Queue — 2 cols */}
        <div className="lg:col-span-2">
          <DeliveryQueueCard deliveries={data.queuedDeliveries} />
        </div>
      </div>

      {/* ════════════ Bottom Row: Earnings Chart + Activity ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <EarningsChart
          data={data.earningsChart}
          total={data.earningsTotal}
          previous={data.earningsPrevious}
        />
        <ActivityTimeline events={data.recentActivity} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

/** KPI Card — single-line horizontal layout */
function KpiCard({ kpi, delay }: { kpi: DriverKpi; delay: number }) {
  return (
    <div
      className={`kpi-card glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:rounded-3xl lg:p-4 lg:hover:-translate-y-1 animate-card-enter`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl ${kpi.iconBg}`}
        >
          {KPI_ICONS[kpi.icon] ?? <Package className="h-4 w-4 lg:h-5 lg:w-5" />}
        </div>

        {/* Label + Value inline */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
            {kpi.label}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-gray-900 dark:text-white lg:text-xl">
              {kpi.value}
            </span>
            {kpi.subValue && (
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {kpi.subValue}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Current delivery card */
function CurrentDeliveryCard({ delivery }: { delivery: CurrentDelivery }) {
  const statusStyles: Record<string, string> = {
    en_route:
      "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
    pickup:
      "bg-sugu-50 text-sugu-600 border-sugu-200 dark:bg-sugu-950/30 dark:text-sugu-400",
    pending:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <section
      className="glass-card h-full rounded-2xl p-4 lg:rounded-3xl lg:p-6"
      aria-label="Livraison en cours"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
          <Truck className="h-4 w-4 mr-1.5 inline" /> Livraison en cours
        </h2>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusStyles[delivery.status]}`}
        >
          {delivery.statusLabel}
        </span>
      </div>

      {/* Inner card */}
      <div className="mt-3 rounded-xl bg-white/40 p-4 dark:bg-white/5">
        {/* Order ID + Priority */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {delivery.orderId}
          </span>
          {delivery.priority === "urgent" && (
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              Urgent
            </span>
          )}
        </div>

        {/* Addresses */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Pickup
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">
              {delivery.pickup.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {delivery.pickup.address}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Delivery
            </p>
            <p className="mt-0.5 text-sm font-medium text-gray-800 dark:text-gray-200">
              {delivery.delivery.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {delivery.delivery.address}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-sugu-500 transition-all duration-700"
              style={{ width: `${delivery.progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {delivery.progressPercent}%
          </span>
        </div>
        <p className="mt-1 text-center text-xs text-gray-400">
          ~{delivery.etaMinutes} min restantes
        </p>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-white/80 active:scale-[0.97] dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          <Phone className="h-3.5 w-3.5" />
          Appeler client
        </button>
        <button className="flex items-center gap-1.5 rounded-xl bg-green-500 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-green-600 active:scale-[0.97]">
          <Check className="h-3.5 w-3.5" />
          Marquer livré
        </button>
        <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-white/80 active:scale-[0.97] dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
          <AlertTriangle className="h-3.5 w-3.5" />
          Signaler
        </button>
      </div>
    </section>
  );
}

/** Delivery queue card */
function DeliveryQueueCard({
  deliveries,
}: {
  deliveries: QueuedDelivery[];
}) {
  return (
    <section
      className="glass-card flex h-full flex-col rounded-2xl p-4 lg:rounded-3xl lg:p-6"
      aria-label="File d'attente des livraisons"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
          Prochaines livraisons
        </h2>
        <span className="text-xs font-medium text-gray-400">
          {deliveries.length} en attente
        </span>
      </div>

      {/* Queue list */}
      <div className="mt-3 flex-1 space-y-2">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="rounded-xl bg-white/40 p-3 transition-colors hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {d.orderId}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  d.priority === "urgent"
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                    : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {d.priority === "urgent" ? "Urgent" : "Normal"}
              </span>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-gray-600 dark:text-gray-400">
              {d.route}
            </p>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {d.itemCount} colis</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {d.timeSlot}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer link */}
      <Link
        href="/driver/deliveries"
        className="mt-auto flex items-center justify-end gap-1 border-t border-gray-100/60 pt-3 text-sm font-medium text-sugu-500 transition hover:text-sugu-600 dark:border-gray-800/60"
      >
        Voir toutes mes livraisons
        <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** Earnings SVG area chart — adapted from VendorDashboardPage */
function EarningsChart({
  data,
  total,
  previous,
}: {
  data: EarningsPoint[];
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
  const chartW = 400;
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
      className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
      aria-labelledby="earnings-chart-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          id="earnings-chart-title"
          className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg"
        >
          <Banknote className="h-4 w-4 mr-1.5 inline" /> Gains de la semaine
        </h2>
        <div className="flex gap-1">
          {(["7j", "30j"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                period === p
                  ? "bg-sugu-500 text-white"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 lg:mt-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="h-32 w-full lg:h-40"
            preserveAspectRatio="none"
            role="img"
            aria-label="Graphique des gains sur 7 jours"
          >
            <defs>
              <linearGradient
                id="driver-chart-gradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f15412" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient
                id="driver-line-gradient"
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
            <path d={areaPath} fill="url(#driver-chart-gradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="url(#driver-line-gradient)"
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
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/40 px-4 py-2.5 dark:bg-white/5">
        <div>
          <p className="text-[10px] font-medium text-gray-400">Total semaine</p>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {total.toLocaleString("fr-FR")} FCFA
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium text-gray-400">
            vs semaine précédente
          </p>
          <p
            className={`text-sm font-bold ${growthPercent >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            {growthPercent >= 0 ? "+" : ""}
            {growthPercent}%
          </p>
        </div>
      </div>
    </section>
  );
}

/** Activity timeline */
function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  const EVENT_ICONS: Record<string, ReactNode> = {
    delivery_completed: <Check className="h-3 w-3 text-green-600" />,
    pickup_done: <Package className="h-3 w-3 text-sugu-600" />,
    assigned: <Bike className="h-3 w-3 text-blue-600" />,
    delivery_failed: <AlertTriangle className="h-3 w-3 text-red-600" />,
  };

  return (
    <section
      className="glass-card rounded-2xl p-4 lg:rounded-3xl lg:p-6"
      aria-label="Activité récente"
    >
      <h2 className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg">
        <ClipboardList className="h-4 w-4 mr-1.5 inline" /> Activité récente
      </h2>

      <div className="mt-4 space-y-0">
        {events.map((event, i) => (
          <div key={event.id} className="flex gap-3 py-2.5">
            {/* Timeline dot + vertical line */}
            <div className="flex flex-col items-center">
              <div
                className={`mt-1.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${event.dotColor} bg-opacity-20`}
              >
                {EVENT_ICONS[event.type] ?? (
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${event.dotColor}`}
                  />
                )}
              </div>
              {i < events.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {event.title}
              </p>
              <p className="truncate text-xs text-gray-400">
                {event.subtitle}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">{event.time}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
