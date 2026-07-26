"use client";

import { useAgencyDashboard } from "@/features/agency/hooks";
import { cn } from "@/lib/utils";
import {
  Truck,
  CheckCircle,
  Clock,
  Banknote,
  AlertTriangle,
  User,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Navigation,
  Sparkles,
  Eye,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  AgencyKpi,
  ActiveDelivery,
  DriverPerformance,
  Complaint,
  DeliveryStatus,
} from "@/features/agency/schema";
import Link from "next/link";

// --- Icon mapping ---
const KPI_ICONS: Record<string, ReactNode> = {
  truck: <Truck className="h-5 w-5" />,
  "check-circle": <CheckCircle className="h-5 w-5" />,
  clock: <Clock className="h-5 w-5" />,
  banknote: <Banknote className="h-5 w-5" />,
};

// --- Delivery status badge styles ---
const DELIVERY_STATUS: Record<
  DeliveryStatus,
  { bg: string; text: string; dot: string; border: string }
> = {
  pending: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    border: "border-amber-200/80 dark:border-amber-900/40",
  },
  pickup: {
    bg: "bg-sugu-50 dark:bg-sugu-950/30",
    text: "text-sugu-700 dark:text-sugu-400",
    dot: "bg-sugu-500",
    border: "border-sugu-200/80 dark:border-sugu-900/40",
  },
  en_route: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500 animate-pulse",
    border: "border-blue-200/80 dark:border-blue-900/40",
  },
  delivered: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80 dark:border-emerald-900/40",
  },
  delayed: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500 animate-pulse",
    border: "border-rose-200/80 dark:border-rose-900/40",
  },
  returned: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    dot: "bg-gray-400",
    border: "border-gray-200 dark:border-gray-700",
  },
};

// ════════════════════════════════════════════════════════════
// Client Component — Ultra Premium Dashboard
// ════════════════════════════════════════════════════════════

export default function AgencyDashboardClient() {
  const { data, isLoading, isError } = useAgencyDashboard();

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-sugu-200 border-t-sugu-500" />
            <p className="text-xs font-semibold text-gray-400 animate-pulse">
              Chargement du tableau de bord…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 dark:bg-amber-950/30 mb-3">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            Impossible de charger le tableau de bord
          </p>
          <p className="mt-1 text-xs text-gray-500 max-w-md">
            Une erreur s&apos;est produite lors de la récupération des métriques de l&apos;agence. Veuillez vérifier votre connexion ou réactualiser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/60">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sugu-500 via-orange-500 to-amber-500 text-white shadow-lg shadow-sugu-500/25 ring-4 ring-sugu-50 dark:ring-sugu-950/40">
              <Truck className="h-6 w-6" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white lg:text-2xl">
                {data.agencyName}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                En service
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Responsable : <span className="font-semibold text-gray-700 dark:text-gray-200">{data.managerName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/agency/deliveries"
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200/80 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Toutes les livraisons
            <ArrowRight className="h-3.5 w-3.5 text-sugu-500" />
          </Link>
          <Link
            href="/agency/drivers"
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sugu-500 to-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sugu-500/20 transition-all hover:from-sugu-600 hover:to-orange-700 hover:shadow-lg active:scale-[0.98]"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Gérer les livreurs
          </Link>
        </div>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 lg:gap-5">
        {data.kpis.map((kpi, i) => (
          <KpiCard key={kpi.id} kpi={kpi} delay={i} />
        ))}
      </div>

      {/* ════════════ Main Section: Active Deliveries + Driver Performance ════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Active Deliveries (8 Columns) */}
        <section
          className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/60 lg:col-span-8 lg:p-6 space-y-4"
          aria-labelledby="active-deliveries-title"
        >
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sugu-50 text-sugu-500 dark:bg-sugu-950/30">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="active-deliveries-title"
                  className="text-base font-bold text-gray-900 dark:text-white"
                >
                  Livraisons en cours
                </h2>
                <p className="text-[11px] text-gray-400">
                  Suivi en temps réel des courses de l&apos;agence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                {data.activeDeliveries.length} en direct
              </span>
            </div>
          </div>

          {/* Table Headers */}
          <div className="hidden grid-cols-12 items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 sm:grid">
            <span className="col-span-4">Commande &amp; Livreur</span>
            <span className="col-span-4">Itinéraire</span>
            <span className="col-span-2 text-center">Statut</span>
            <span className="col-span-2 text-right">Temps estimé</span>
          </div>

          <div className="space-y-2.5">
            {data.activeDeliveries.length === 0 ? (
              <div className="py-14 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
                <Truck className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Aucune livraison en cours pour le moment
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Les nouvelles courses attribuées à l&apos;agence apparaîtront ici automatiquement.
                </p>
              </div>
            ) : (
              data.activeDeliveries.map((delivery) => (
                <DeliveryRow key={delivery.id} delivery={delivery} />
              ))
            )}
          </div>
        </section>

        {/* Driver Performance (4 Columns) */}
        <section
          className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/60 lg:col-span-4 lg:p-6 space-y-4"
          aria-labelledby="performance-title"
        >
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-950/30">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="performance-title"
                  className="text-base font-bold text-gray-900 dark:text-white"
                >
                  Top Livreurs
                </h2>
                <p className="text-[11px] text-gray-400">
                  Taux de réussite des livreurs
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.driverPerformance.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
                <User className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Aucun livreur enregistré
                </p>
              </div>
            ) : (
              data.driverPerformance.map((driver, index) => (
                <DriverBar key={driver.id} driver={driver} rank={index + 1} />
              ))
            )}
          </div>
        </section>
      </div>

      {/* ════════════ Bottom Row: Complaints & Support Tickets ════════════ */}
      <section
        className="rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/60 lg:p-6 space-y-4"
        aria-labelledby="complaints-title"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-950/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="complaints-title"
                className="text-base font-bold text-gray-900 dark:text-white"
              >
                Réclamations récentes &amp; Incidents
              </h2>
              <p className="text-[11px] text-gray-400">
                Tickets de support associés aux livraisons de l&apos;agence
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {data.complaints.length} ticket(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.complaints.length === 0 ? (
            <div className="col-span-full py-10 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/30">
              <ShieldAlert className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Aucune réclamation récente enregistrée
              </p>
            </div>
          ) : (
            data.complaints.map((complaint) => (
              <ComplaintRow key={complaint.id} complaint={complaint} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════

/** Premium KPI Card */
function KpiCard({ kpi, delay }: { kpi: AgencyKpi; delay: number }) {
  const isRing = kpi.ringPercent !== undefined;

  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-white/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-sugu-200/80 dark:border-gray-800 dark:bg-gray-900/60 dark:hover:border-sugu-900/50 animate-card-enter"
      style={{ animationDelay: `${delay * 80}ms` }}
    >
      {/* Background glow decorator */}
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br from-sugu-400/10 to-transparent blur-xl transition-all group-hover:scale-150" />

      <div className="flex items-start justify-between relative z-10">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${kpi.iconBg} shadow-md transition-transform group-hover:scale-105`}
        >
          {KPI_ICONS[kpi.icon] ?? <Truck className="h-5 w-5" />}
        </div>

        {/* Circular ring for success rate */}
        {isRing && (
          <div className="relative h-11 w-11">
            <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                className="text-gray-200/60 dark:text-gray-700/40"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeDasharray={`${kpi.ringPercent}, 100`}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-1000"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-800 dark:text-gray-200">
              {kpi.ringPercent}%
            </span>
          </div>
        )}

        {kpi.badge && !isRing && (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${kpi.badgeColor ?? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"}`}
          >
            {kpi.badge}
          </span>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
          {kpi.label}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-2xl font-black tracking-tight text-gray-900 dark:text-white lg:text-3xl">
            {kpi.value}
          </span>
          {kpi.subValue && (
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
              {kpi.subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Active delivery row — Ultra Modern & Elegant */
function DeliveryRow({ delivery }: { delivery: ActiveDelivery }) {
  const st = DELIVERY_STATUS[delivery.status] ?? DELIVERY_STATUS.pending;

  // Clean up route addresses from redundant "Ramassage: " / "Livraison: " prefixes
  const cleanRoute = delivery.routeAddresses
    .replace(/Ramassage:\s*/gi, "")
    .replace(/Livraison:\s*/gi, "");

  const parts = cleanRoute.split(" → ");
  const pickupAddr = parts[0] || cleanRoute;
  const deliveryAddr = parts[1] || "";

  const isUnassigned = delivery.driver.name === "Non assigné";

  return (
    <div className="group flex flex-col gap-2.5 rounded-2xl border border-gray-100/90 bg-white/60 p-3.5 backdrop-blur-md transition-all hover:bg-white hover:shadow-md hover:border-sugu-200/60 dark:border-gray-800/40 dark:bg-gray-900/40 dark:hover:bg-gray-900/80 sm:grid sm:grid-cols-12 sm:items-center sm:gap-3">
      {/* Order ID & Driver */}
      <div className="flex items-center gap-3 sm:col-span-4">
        <span className="font-mono text-xs font-extrabold text-sugu-600 bg-sugu-50/90 px-2.5 py-1 rounded-xl border border-sugu-200/60 dark:bg-sugu-950/40 dark:border-sugu-900/40 dark:text-sugu-400 flex-shrink-0">
          {delivery.orderId}
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-xs",
              isUnassigned ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : delivery.driver.avatarColor,
            )}
          >
            {delivery.driver.initials}
          </div>
          <span
            className={cn(
              "truncate text-xs font-bold",
              isUnassigned ? "text-amber-600 dark:text-amber-400 italic" : "text-gray-800 dark:text-gray-200",
            )}
          >
            {delivery.driver.name}
          </span>
        </div>
      </div>

      {/* Route Addresses */}
      <div className="sm:col-span-4 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
          <MapPin className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
          <span className="truncate text-[11px] font-medium">{pickupAddr}</span>
        </div>
        {deliveryAddr && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Navigation className="h-3.5 w-3.5 text-sugu-500 flex-shrink-0" />
            <span className="truncate text-[11px] font-semibold text-gray-800 dark:text-gray-200">
              {deliveryAddr}
            </span>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex items-center sm:col-span-2 sm:justify-center">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold shadow-2xs",
            st.bg,
            st.text,
            st.border,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
          {delivery.statusLabel}
        </span>
      </div>

      {/* ETA & Action */}
      <div className="flex items-center justify-between gap-3 sm:col-span-2 sm:justify-end text-xs font-bold text-gray-700 dark:text-gray-300">
        <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-400 font-medium">
          <Clock className="h-3 w-3 text-gray-400" />
          <span>{delivery.eta === "N/A" ? "—" : delivery.eta}</span>
        </div>
        <Link
          href={`/agency/deliveries?selected=${delivery.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sugu-200/80 bg-sugu-50/80 px-3 py-1 text-xs font-bold text-sugu-600 shadow-2xs transition-all hover:bg-sugu-500 hover:text-white hover:border-sugu-500 dark:border-sugu-900/40 dark:bg-sugu-950/40 dark:text-sugu-400 dark:hover:bg-sugu-600 dark:hover:text-white"
          title="Consulter les détails de la livraison"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir
        </Link>
      </div>
    </div>
  );
}

/** Driver performance bar */
function DriverBar({ driver, rank }: { driver: DriverPerformance; rank: number }) {
  const rankColors = [
    "bg-amber-400 text-amber-950",
    "bg-slate-300 text-slate-900",
    "bg-amber-700 text-amber-100",
  ];

  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-black flex-shrink-0 shadow-2xs",
          rank <= 3 ? rankColors[rank - 1] : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
        )}
      >
        #{rank}
      </span>
      <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${driver.avatarColor}`}>
        {driver.initials}
      </div>
      <span className="w-24 truncate text-xs font-bold text-gray-800 dark:text-gray-200">
        {driver.name}
      </span>
      <div className="flex-1 min-w-0">
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sugu-500 to-amber-500 transition-all duration-1000 shadow-xs"
            style={{ width: `${driver.score}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-xs font-black text-gray-900 dark:text-white">
        {driver.score}%
      </span>
    </div>
  );
}

/** Complaint row */
function ComplaintRow({ complaint }: { complaint: Complaint }) {
  const isUrgent = complaint.severity === "urgent";

  return (
    <div className="rounded-2xl border border-gray-100/90 bg-white/60 p-4 shadow-2xs backdrop-blur-md transition-all hover:bg-white hover:shadow-md dark:border-gray-800/50 dark:bg-gray-900/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
            {complaint.title}
          </p>
          <p className="mt-1 text-[11px] text-gray-400 font-medium">{complaint.date}</p>
        </div>
        <span
          className={cn(
            "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold shadow-2xs",
            isUrgent
              ? "bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/40 dark:text-rose-400"
              : "bg-gray-100 text-gray-600 border border-gray-200/80 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300",
          )}
        >
          {isUrgent ? "Urgent" : "Normal"}
        </span>
      </div>
    </div>
  );
}
