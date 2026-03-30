"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Users,
  Truck,
  Star,
  Target,
  Search,
  ChevronDown,
  Plus,
  RefreshCw,
  X,
  Phone,
  MessageCircle,
  AlertTriangle,
  Bike,
  Pencil,
  Ban,
  UserMinus,
  CircleDot,
  Wifi,
  WifiOff,
  Loader2,
  PlayCircle,
} from "lucide-react";
import type {
  DriverCard,
  DriverDetail,
  DriverStatusVal,
} from "@/features/agency/schema";
import {
  useAgencyDrivers,
  useDriverDetail as useDriverDetailHook,
  useSuspendCourier,
  useActivateCourier,
  useRemoveCourier,
} from "@/features/agency/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { InvitationCodeCard } from "./_components/invitation-code-card";
import { queryKeys } from "@/lib/query";

// ────────────────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────────────────

const DRIVER_STATUS_CFG: Record<
  DriverStatusVal,
  { label: string; bg: string; text: string; dot: string }
> = {
  online: {
    label: "En ligne",
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-600 dark:text-green-400",
    dot: "bg-green-500",
  },
  offline: {
    label: "Hors ligne",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    dot: "bg-red-400",
  },
  suspended: {
    label: "Suspendu",
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ────────────────────────────────────────────────────────────
// KPI Card
// ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  children,
  delay,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Driver Grid Card
// ────────────────────────────────────────────────────────────

function DriverGridCard({
  driver,
  isSelected,
  onClick,
}: {
  driver: DriverCard;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusCfg = DRIVER_STATUS_CFG[driver.status];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-center rounded-2xl border bg-white/80 p-5 text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 dark:bg-gray-900/60",
        isSelected
          ? "border-sugu-400 ring-2 ring-sugu-200 shadow-md dark:ring-sugu-900/50"
          : "border-gray-200/70 dark:border-gray-800",
      )}
      aria-label={`Voir le profil de ${driver.name}`}
    >
      {/* Status dot */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <span className={cn("h-2 w-2 rounded-full", statusCfg.dot)} />
        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
          {statusCfg.label}
        </span>
      </div>

      {/* Avatar + rank */}
      <div className="relative mt-2">
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ring-2 ring-white dark:ring-gray-900",
            driver.avatarColor,
          )}
        >
          {driver.initials}
        </div>
        {driver.rank && (
          <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-sugu-500 text-[9px] font-black text-white">
            {driver.rank}er
          </span>
        )}
      </div>

      {/* Name + phone */}
      <h3 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
        {driver.name}
      </h3>
      <p className="text-[10px] text-gray-400">{driver.phone}</p>

      {/* Vehicle badge */}
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <Bike className="h-3 w-3" />
        {driver.vehicle.charAt(0).toUpperCase() + driver.vehicle.slice(1)}
      </span>

      {/* Stats row */}
      <div className="mt-3 flex w-full items-center justify-center gap-4 text-center">
        <div>
          <p className="text-base font-extrabold text-gray-900 dark:text-white">
            {driver.totalDeliveries}
          </p>
          <p className="text-[9px] text-gray-400">livraisons</p>
        </div>
        <div className="flex items-center gap-0.5">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="text-base font-extrabold text-gray-900 dark:text-white">
            {driver.rating}
          </span>
          <span className="text-[9px] text-gray-400 ml-0.5">{driver.ratingLabel}</span>
        </div>
      </div>

      {/* Footer badges */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
        {driver.todayDeliveries > 0 && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-400">
            {driver.todayDeliveries} aujourd&apos;hui
          </span>
        )}
        {driver.currentActivityLabel && (
          <span className="rounded-full bg-sugu-50 px-2 py-0.5 text-[9px] font-semibold text-sugu-600 dark:bg-sugu-950/30 dark:text-sugu-400">
            {driver.currentActivityLabel}
          </span>
        )}
        {driver.warningLabel && (
          <span className="flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <AlertTriangle className="h-2.5 w-2.5" />
            {driver.successRate}% réussite
          </span>
        )}
        {!driver.warningLabel && (
          <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[9px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {driver.successRate}% réussite
          </span>
        )}
      </div>

      {/* Last seen for offline */}
      {driver.lastSeen && (
        <p className="mt-1 text-[9px] italic text-gray-400">{driver.lastSeen}</p>
      )}

      {/* View profile link */}
      <Link
        href={`/agency/drivers/${driver.id}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-sugu-500 opacity-70 group-hover:opacity-100 transition-opacity hover:underline"
      >
        Voir le profil →
      </Link>
    </button>
  );
}

// ────────────────────────────────────────────────────────────
// Add Driver Placeholder Card
// ────────────────────────────────────────────────────────────

function AddDriverCard() {
  return (
    <Link
      href="/agency/drivers/new"
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/40 p-8 text-gray-400 transition-all hover:border-sugu-300 hover:text-sugu-500 dark:border-gray-800 dark:bg-gray-900/20 dark:hover:border-sugu-700"
      aria-label="Ajouter un livreur"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current">
        <Plus className="h-6 w-6" />
      </div>
      <span className="text-sm font-semibold">Ajouter un livreur</span>
    </Link>
  );
}

// ────────────────────────────────────────────────────────────
// Detail Panel
// ────────────────────────────────────────────────────────────

function DriverDetailPanel({
  detail,
  onClose,
  isLoading,
}: {
  detail: DriverDetail | null;
  onClose: () => void;
  isLoading?: boolean;
}) {
  const suspendMutation = useSuspendCourier();
  const activateMutation = useActivateCourier();
  const removeMutation = useRemoveCourier();

  if (isLoading || !detail) {
    return (
      <aside className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col items-center justify-center border-l border-gray-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/95",
        "lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:w-[360px] lg:flex-shrink-0 lg:shadow-none",
      )}>
        <Loader2 className="h-6 w-6 animate-spin text-sugu-500" />
        <p className="mt-2 text-xs text-gray-400">Chargement…</p>
      </aside>
    );
  }
  const statusCfg = DRIVER_STATUS_CFG[detail.status];
  const progressBarWidth = Math.min(detail.monthlyProgress, 100);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-gray-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-950/95",
        "lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:w-[360px] lg:flex-shrink-0 lg:shadow-none",
      )}
    >
      {/* Panel header */}
      <div className="relative flex flex-col items-center border-b border-gray-100 px-5 pb-5 pt-4 dark:border-gray-800">
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Avatar */}
        <div className="relative">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ring-3 ring-white dark:ring-gray-900",
              detail.avatarColor,
            )}
          >
            {detail.initials}
          </div>
          {detail.rank && (
            <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-sugu-500 text-[10px] font-black text-white">
              #{detail.rank}
            </span>
          )}
        </div>
        <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">
          {detail.name}
        </h2>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", statusCfg.dot)} />
          <span className={cn("text-xs font-semibold", statusCfg.text)}>
            {statusCfg.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          {detail.phone} · {detail.email}
        </p>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {/* ── Informations ── */}
        <section aria-labelledby="detail-info-heading">
          <h3
            id="detail-info-heading"
            className="mb-2 text-xs font-bold text-gray-900 dark:text-white"
          >
            Informations
          </h3>
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            {[
              { label: "Age", value: detail.age },
              { label: "Quartier", value: detail.quartier },
              { label: "Véhicule", value: detail.vehicle.charAt(0).toUpperCase() + detail.vehicle.slice(1) },
              { label: "Joined", value: detail.vehicleId },
              { label: "Permis", value: detail.permis },
              { label: "Joined date", value: detail.joinedDate },
              {
                label: "Vérifié",
                value: detail.verified ? "CNI OK" : "Non",
              },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-[10px] font-medium text-gray-400">{item.label}</p>
                <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Performance ── */}
        <section aria-labelledby="detail-perf-heading">
          <h3
            id="detail-perf-heading"
            className="mb-2 text-xs font-bold text-gray-900 dark:text-white"
          >
            Performance
          </h3>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {detail.totalDeliveries}
                </p>
                <p className="text-[9px] text-gray-400">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-green-600">
                  {detail.successRate}%
                </p>
                <p className="text-[9px] text-gray-400">Taux réussite</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {detail.rating}
                </p>
                <p className="text-[9px] text-gray-400">Note</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {detail.avgTime}
                </p>
                <p className="text-[9px] text-gray-400">Temps moyen</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[9px] text-gray-400">
                <span>Menthul progress</span>
                <span>{progressBarWidth}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
                <div
                  className="h-full rounded-full bg-sugu-500 transition-all duration-700"
                  style={{ width: `${progressBarWidth}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Activité aujourd'hui ── */}
        <section aria-labelledby="detail-activity-heading">
          <h3
            id="detail-activity-heading"
            className="mb-2 text-xs font-bold text-gray-900 dark:text-white"
          >
            Activité aujourd&apos;hui
          </h3>
          <div className="rounded-xl bg-gray-50/80 p-3 dark:bg-gray-900/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {detail.todayDeliveries} livraisons
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-green-600 font-semibold">
                  {detail.todayCompleted} complètes
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-red-500 font-semibold">
                  {detail.todayFailed} failes
                </span>
              </div>
            </div>
            {/* Mini progress bar */}
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200/60 dark:bg-gray-700/40">
              <div className="flex h-full">
                <div
                  className="bg-green-500 rounded-l-full"
                  style={{
                    width: detail.todayDeliveries > 0
                      ? `${(detail.todayCompleted / detail.todayDeliveries) * 100}%`
                      : "0%",
                  }}
                />
                <div
                  className="bg-red-500 rounded-r-full"
                  style={{
                    width: detail.todayDeliveries > 0
                      ? `${(detail.todayFailed / detail.todayDeliveries) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {detail.todayRevenue}
                </p>
                <p className="text-[9px] text-gray-400">Revenus</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {detail.todayHours}
                </p>
                <p className="text-[9px] text-gray-400">Heures travaillées</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dernières livraisons ── */}
        <section aria-labelledby="detail-recent-heading">
          <div className="mb-2 flex items-center justify-between">
            <h3
              id="detail-recent-heading"
              className="text-xs font-bold text-gray-900 dark:text-white"
            >
              Dernières livraisons
            </h3>
            <button className="text-[10px] font-semibold text-sugu-500 hover:text-sugu-600">
              Voir tout →
            </button>
          </div>
          <div className="space-y-1.5">
            {detail.recentDeliveries.map((del) => (
              <div
                key={del.id}
                className="flex items-center gap-2 rounded-xl bg-gray-50/80 px-3 py-2 dark:bg-gray-900/60"
              >
                <CircleDot className="h-3 w-3 flex-shrink-0 text-sugu-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                      {del.orderId}
                    </span>
                    <span className="truncate text-[10px] text-gray-400">
                      {del.route}
                    </span>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-bold",
                    del.statusColor,
                  )}
                >
                  {del.status}
                </span>
                <span className="text-[10px] font-medium text-gray-400">
                  {del.time}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Action buttons ── */}
      <div className="space-y-2 border-t border-gray-100 p-4 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { const phone = detail.phone.replace(/\s/g, ""); window.open(`tel:${phone}`); }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-sugu-500 py-2.5 text-xs font-semibold text-white transition-all hover:bg-sugu-600"
          >
            <Phone className="h-3.5 w-3.5" />
            Appeler
          </button>
          <button
            onClick={() => { const phone = detail.phone.replace(/[\s+]/g, ""); window.open(`https://wa.me/${phone}`); }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {detail.status === "suspended" ? (
            <button
              onClick={() => activateMutation.mutate({ courierId: detail.id })}
              disabled={activateMutation.isPending}
              className="flex items-center justify-center gap-1 rounded-xl border border-green-200 bg-green-50 py-2 text-[11px] font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400 disabled:opacity-50"
            >
              {activateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Réactiver
            </button>
          ) : (
            <button
              onClick={() => suspendMutation.mutate({ courierId: detail.id })}
              disabled={suspendMutation.isPending}
              className="flex items-center justify-center gap-1 rounded-xl border border-amber-200 bg-amber-50 py-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-50"
            >
              {suspendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
              Suspendre
            </button>
          )}
          <Link
            href={`/agency/drivers/${detail.id}`}
            className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <Pencil className="h-3 w-3" />
            Modifier
          </Link>
          <button
            onClick={() => { if (confirm("Êtes-vous sûr de vouloir retirer ce livreur ?")) removeMutation.mutate({ courierId: detail.id }); }}
            disabled={removeMutation.isPending}
            className="flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 py-2 text-[11px] font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-50"
          >
            {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
            Retirer
          </button>
        </div>
      </div>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

type StatusFilter = "all" | "online" | "offline" | "suspended";

type StatusTabItem = {
  key: StatusFilter;
  label: string;
  icon: ReactNode;
  iconClass: string;
};

const STATUS_TABS: StatusTabItem[] = [
  { key: "all", label: "Tous", icon: <Users className="h-3.5 w-3.5" />, iconClass: "text-sugu-500" },
  { key: "online", label: "En ligne", icon: <Wifi className="h-3.5 w-3.5" />, iconClass: "text-green-500" },
  { key: "offline", label: "Hors ligne", icon: <WifiOff className="h-3.5 w-3.5" />, iconClass: "text-red-400" },
  { key: "suspended", label: "Suspendus", icon: <Ban className="h-3.5 w-3.5" />, iconClass: "text-gray-400" },
];

export function DriversContent() {
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch drivers via React Query hook
  const { data, isLoading, isError } = useAgencyDrivers();

  // Fetch selected driver detail dynamically
  const { data: detailData, isLoading: detailLoading } = useDriverDetailHook(selectedDriverId);

  // Auto-select first driver when data loads
  const drivers = data?.drivers ?? [];
  const summary = data?.summary ?? { totalDrivers: 0, activeDrivers: 0, inProgressDeliveries: 0, averageRating: 0, totalReviews: 0, successRate: 0, successTarget: 95 };
  const statusCounts = data?.statusCounts ?? { all: 0, online: 0, offline: 0, suspended: 0 };
  const lastUpdated = data?.lastUpdated ?? "—";

  // Filter drivers client-side
  const filteredDrivers = drivers.filter((d) => {
    const matchesTab = activeTab === "all" || d.status === activeTab;
    const matchesSearch =
      !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    return matchesTab && matchesSearch;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-500">Erreur lors du chargement des livreurs.</p>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() })}
          className="text-sm font-semibold text-sugu-500 hover:text-sugu-600"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* ════ Main area ════ */}
      <div className="flex min-w-0 flex-1 flex-col space-y-4">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Livreurs{" "}
            <span className="text-base font-normal text-gray-400">
              ({summary.totalDrivers} livreurs)
            </span>
          </h1>
          <Link
            href="/agency/drivers/new"
            id="btn-add-driver"
            className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-sugu-600 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Ajouter un livreur
          </Link>
        </div>

        {/* ── Invitation Code Card ── */}
        <InvitationCodeCard />

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Active drivers */}
          <KpiCard
            icon={<Users className="h-4 w-4 text-green-500" />}
            label="Livreurs actifs"
            delay={0}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {summary.activeDrivers}
              </span>
              <span className="text-sm text-gray-400">/ {summary.totalDrivers}</span>
            </div>
            <p className="text-[10px] text-gray-400">En service maintenant</p>
            {/* Mini bar chart placeholder */}
            <div className="mt-1.5 flex items-end gap-0.5 h-4">
              {[40, 60, 80, 50, 90, 70, 95].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm bg-green-400"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </KpiCard>

          {/* In-progress deliveries */}
          <KpiCard
            icon={<Truck className="h-4 w-4 text-sugu-500" />}
            label="Livraisons en cours"
            delay={60}
          >
            <p className="text-2xl font-black text-sugu-600">
              {summary.inProgressDeliveries}
            </p>
            <p className="text-[10px] text-gray-400">Assignées maintenant</p>
          </KpiCard>

          {/* Average rating */}
          <KpiCard
            icon={<Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
            label="Note moyenne"
            delay={120}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {summary.averageRating}
              </span>
              <span className="text-sm text-gray-400">/ 5</span>
              <div className="ml-1 flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "h-3 w-3",
                      s <= Math.round(summary.averageRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-200 dark:text-gray-700",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Basé sur {summary.totalReviews.toLocaleString("fr-FR")} avis
            </p>
          </KpiCard>

          {/* Success rate */}
          <KpiCard
            icon={<Target className="h-4 w-4 text-sugu-500" />}
            label="Taux de réussite"
            delay={180}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {summary.successRate}%
              </span>
              {/* Mini ring */}
              <div className="relative h-10 w-10">
                <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-gray-200/60 dark:text-gray-700/40"
                  />
                  <circle
                    cx="18" cy="18" r="15.9155"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${summary.successRate}, 100`}
                    strokeLinecap="round"
                    className="text-green-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-gray-300">
                  {Math.round(summary.successRate)}%
                </span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Objectif: {summary.successTarget}%{" "}
              {summary.successRate >= summary.successTarget ? "" : ""}
            </p>
          </KpiCard>
        </div>

        {/* ── Status Tabs + Search ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {STATUS_TABS.map((tab) => {
              const count = statusCounts[tab.key];
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150",
                    isActive
                      ? "bg-sugu-500 text-white shadow-sm"
                      : "bg-white/60 text-gray-600 hover:bg-white/80 dark:bg-gray-900/40 dark:text-gray-400 dark:hover:bg-gray-900/60",
                  )}
                >
                  <span className={cn("flex items-center", isActive ? "text-white" : tab.iconClass)}>
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
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + sort */}
          <div className="flex flex-1 items-center gap-2 sm:ml-auto sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un livreur…"
                aria-label="Rechercher un livreur"
                className="form-input pl-9 py-2"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
              Véhicule
              <ChevronDown className="h-3 w-3" />
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
              Trier: Performance
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* ── Drivers Grid ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDrivers.map((driver) => (
            <DriverGridCard
              key={driver.id}
              driver={driver}
              isSelected={selectedDriverId === driver.id}
              onClick={() => setSelectedDriverId(driver.id)}
            />
          ))}
          <AddDriverCard />
        </div>

        {/* ── Footer status bar ── */}
        <div className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 backdrop-blur-sm dark:bg-gray-900/40">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-semibold text-green-600">
                {statusCounts.online} ligne livreurs ({statusCounts.online}/{statusCounts.all})
              </span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">
              Dernière actualisé: {lastUpdated}
            </span>
          </div>
          <button
            id="btn-refresh-drivers"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.agency.drivers() })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <RefreshCw className="h-3 w-3" />
            Actualiser
          </button>
        </div>
      </div>

      {/* ════ Detail Panel (desktop) ════ */}
      {selectedDriverId && (
        <div className="ml-4 hidden lg:flex">
          <DriverDetailPanel
            detail={detailData ?? null}
            isLoading={detailLoading}
            onClose={() => setSelectedDriverId(null)}
          />
        </div>
      )}

      {/* Mobile detail overlay */}
      {selectedDriverId && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setSelectedDriverId(null)}
            aria-hidden="true"
          />
          <DriverDetailPanel
            detail={detailData ?? null}
            isLoading={detailLoading}
            onClose={() => setSelectedDriverId(null)}
          />
        </div>
      )}
    </div>
  );
}
