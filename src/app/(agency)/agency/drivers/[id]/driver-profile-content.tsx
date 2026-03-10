"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Star,
  Truck,
  Clock,
  CheckCircle2,
  Bike,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Pencil,
  Ban,
  UserMinus,
  DollarSign,
  ChevronUp,
  Calendar,
  MoreHorizontal,
  Loader2,
  PlayCircle,
  User,
  BarChart3,
  Banknote,
  Package,
} from "lucide-react";
import {
  useDriverProfileData,
  useSuspendCourier,
  useActivateCourier,
  useRemoveCourier,
} from "@/features/agency/hooks";

// ────────────────────────────────────────────────────────────
// Status Badge config
// ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  online: { label: "En ligne", dot: "bg-green-500", text: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
  offline: { label: "Hors ligne", dot: "bg-red-400", text: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
  suspended: { label: "Suspendu", dot: "bg-red-500", text: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

const DOC_STATUS_ICON = {
  verified: <ShieldCheck className="h-3.5 w-3.5 text-green-500" />,
  pending: <Shield className="h-3.5 w-3.5 text-amber-500" />,
  expires_soon: <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />,
  expired: <ShieldAlert className="h-3.5 w-3.5 text-red-500" />,
};

const DOC_STATUS_LABEL_CLR = {
  verified: "text-green-600 bg-green-50 dark:bg-green-950/30",
  pending: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  expires_soon: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  expired: "text-red-600 bg-red-50 dark:bg-red-950/30",
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function DriverProfileContent({ courierId }: { courierId: string }) {
  const router = useRouter();
  const { data, isLoading, isError } = useDriverProfileData(courierId);
  const suspendMutation = useSuspendCourier();
  const activateMutation = useActivateCourier();
  const removeMutation = useRemoveCourier();

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sugu-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm text-gray-500">Erreur lors du chargement du profil.</p>
      </div>
    );
  }
  const sCfg = STATUS_CFG[data.status];

  const maxBar = Math.max(...data.perfBars.map((b) => b.value), 1);

  return (
    <div className="space-y-4">
      {/* ════════════ Header Bar ════════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/agency/drivers"
            className="flex items-center gap-1.5 text-sm font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux livreurs
          </Link>
          <div className="hidden sm:block h-5 w-px bg-gray-200 dark:bg-gray-700" />
          <h1 className="hidden sm:block text-lg font-bold text-gray-900 dark:text-white">
            {data.name}
          </h1>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", sCfg.bg, sCfg.text)}>
            <span className={cn("h-2 w-2 rounded-full", sCfg.dot)} />
            {sCfg.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Bike className="h-3 w-3" />
            {data.vehicle.charAt(0).toUpperCase() + data.vehicle.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const phone = data.phone.replace(/\s/g, ""); window.open(`tel:${phone}`); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300"
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </button>
          {data.status === "suspended" ? (
            <button
              onClick={() => activateMutation.mutate({ courierId: data.id })}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400 disabled:opacity-50"
            >
              {activateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
              Réactiver
            </button>
          ) : (
            <button
              onClick={() => suspendMutation.mutate({ courierId: data.id })}
              disabled={suspendMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-50"
            >
              {suspendMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
              Suspendre
            </button>
          )}
          <button className="rounded-xl border border-gray-200 bg-white/70 p-2 text-gray-400 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ════════════ Hero Card ════════════ */}
      <section className="glass-card animate-card-enter rounded-2xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
          {/* Avatar + Name block */}
          <div className="flex items-center gap-5">
            <div className="relative">
              <div
                className={cn(
                  "flex h-28 w-28 items-center justify-center rounded-full text-3xl font-bold ring-4 ring-white shadow-lg dark:ring-gray-900",
                  data.avatarColor,
                )}
              >
                {data.initials}
              </div>
              {data.rank && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-sugu-500 px-2.5 py-0.5 text-[10px] font-black text-white">
                  Livreur #{data.rank}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", sCfg.dot)} />
                <span className="text-sm text-gray-500 dark:text-gray-400">140px</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.name}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <span className={cn("h-2 w-2 rounded-full", sCfg.dot)} />
                {data.statusSince}
              </p>
              <div className="mt-3 flex gap-2">
              <button
                onClick={() => { const phone = data.phone.replace(/\s/g, ""); window.open(`tel:${phone}`); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                  <Phone className="h-3 w-3" />
                  Appeler
                </button>
                <button
                  onClick={() => { const phone = data.phone.replace(/[\s+]/g, ""); window.open(`https://wa.me/${phone}`); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                >
                  <MessageCircle className="h-3 w-3" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
            {/* Total livraisons */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Truck className="h-3 w-3 text-sugu-400" />
                Total livraisons
              </div>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {data.totalDeliveries}
              </p>
              <p className="text-[10px] text-gray-400">ce mois: {data.monthDeliveries}</p>
            </div>

            {/* Taux réussite */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                Taux de réussite
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.successRate}%
                </p>
                <div className="relative h-8 w-8">
                  <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200/60 dark:text-gray-700/40" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${data.successRate}, 100`} strokeLinecap="round" className="text-green-500" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Note clients */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Note clients
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  {data.rating}
                </p>
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={cn("h-3 w-3", s <= Math.round(data.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700")} />
                ))}
                <span className="ml-1 text-[10px] text-gray-400">{data.totalReviews} avis</span>
              </div>
            </div>

            {/* Temps moyen */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Clock className="h-3 w-3 text-gray-400" />
                Temps moyen
              </div>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {data.avgDeliveryTime}
              </p>
              <p className="text-[10px] text-gray-400">
                Objectif: {data.avgTimeTarget}{" "}
                <CheckCircle2 className="inline h-3 w-3 text-green-500" />
              </p>
            </div>

            {/* Revenus ce mois */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <DollarSign className="h-3 w-3 text-sugu-400" />
                Revenus ce mois
              </div>
              <p className="mt-1 text-xl font-black text-green-600">
                {data.monthRevenue}
              </p>
            </div>

            {/* Ancienneté */}
            <div className="rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                <Calendar className="h-3 w-3 text-gray-400" />
                Ancienneté
              </div>
              <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                {data.seniority}
              </p>
              <p className="text-[10px] text-gray-400">{data.seniorityDetail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ Middle 4-Column Row ════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* ── Informations personnelles ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "0ms" }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-3">
            <User className="h-4 w-4 text-gray-500" />
            Informations personnelles
          </h3>
          <dl className="space-y-2">
            {[
              { dt: "Full Nome", dd: data.fullName },
              { dt: "Phéphone", dd: data.phone },
              { dt: "Email", dd: data.email },
              { dt: "Date of Birth", dd: data.dateOfBirth },
              { dt: "Adresse", dd: data.address },
              { dt: "Emergency Contact", dd: data.emergencyContact || "—" },
              { dt: "Joined Date", dd: data.joinedDate },
              { dt: "Added By", dd: data.addedBy },
            ].map((item) => (
              <div key={item.dt} className="flex items-start justify-between gap-2">
                <dt className="text-[11px] text-gray-400 flex-shrink-0">{item.dt}</dt>
                <dd className="text-[11px] font-semibold text-gray-700 text-right dark:text-gray-300">
                  {item.dd}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Performance mensuelle ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <BarChart3 className="h-4 w-4 text-gray-500" />
              Performance mensuelle
            </h3>
            <div className="flex gap-1">
              <button className="rounded-lg bg-sugu-50 px-2 py-0.5 text-[10px] font-semibold text-sugu-600 dark:bg-sugu-950/30">
                Ce mois
              </button>
              <button className="rounded-lg px-2 py-0.5 text-[10px] font-medium text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                active
              </button>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1 h-24 mb-2">
            {data.perfBars.map((bar, i) => (
              <div key={i} className="flex flex-1 flex-col items-center">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all",
                    i === data.perfBars.length - 5
                      ? "bg-sugu-500"
                      : "bg-green-400/60",
                  )}
                  style={{ height: `${(bar.value / maxBar) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-0.5 text-[8px] text-gray-400 mb-3">
            {data.perfBars.map((bar, i) => (
              <span key={i} className="flex-1 text-center truncate">{bar.hour}</span>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800">
            <div className="pr-2 text-center">
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{data.perfDeliveries}</p>
              <p className="text-[8px] text-gray-400 leading-tight">{data.perfVsLastMonth}</p>
            </div>
            <div className="px-2 text-center">
              <p className="text-lg font-extrabold text-green-600">{data.perfVsTeamAvg}</p>
              <p className="text-[8px] text-gray-400 leading-tight">vs moyenge urs tquipe</p>
            </div>
            <div className="pl-2 text-center">
              <p className="text-lg font-extrabold text-sugu-600">{data.perfRank}</p>
              <p className="text-[8px] text-gray-400">Rank</p>
            </div>
          </div>
        </section>

        {/* ── Revenus ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "120ms" }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-3">
            <Banknote className="h-4 w-4 text-gray-500" />
            Revenus
          </h3>
          <p className="text-xl font-black text-gray-900 dark:text-white mb-2">{data.revTotal}</p>
          <p className="text-[10px] text-gray-400 mb-3">Total mensuels</p>

          <dl className="space-y-1.5">
            {[
              { dt: "Fees de livraison", dd: data.revFees },
              { dt: "Performance bonus", dd: data.revBonus },
              { dt: "Tips", dd: data.revTips },
            ].map((item) => (
              <div key={item.dt} className="flex justify-between">
                <dt className="text-[10px] text-gray-400">{item.dt}</dt>
                <dd className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{item.dd}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex justify-between">
              <span className="text-[10px] font-medium text-green-600">Paid</span>
              <span className="text-[10px] font-bold text-green-600">{data.revPaid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-medium text-amber-600">Pending</span>
              <span className="text-[10px] font-bold text-amber-600">{data.revPending}</span>
            </div>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Next payment date</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{data.revNextPayment}</span>
            </div>
            <button className="mt-1 text-[10px] font-semibold text-sugu-500 hover:text-sugu-600">
              Voir statements →
            </button>
          </div>
        </section>

        {/* ── Avis clients ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "180ms" }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            Avis clients
          </h3>

          <p className="text-2xl font-black text-gray-900 dark:text-white">{data.reviewAvg}/5</p>

          {/* Distribution bars */}
          <div className="mt-2 space-y-1">
            {data.reviewDistribution.map((row) => {
              const maxCount = Math.max(...data.reviewDistribution.map((r) => r.count), 1);
              return (
                <div key={row.stars} className="flex items-center gap-1.5">
                  <span className="w-3 text-right text-[9px] font-medium text-gray-400">{row.stars}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${(row.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent reviews */}
          <div className="mt-3 space-y-2">
            {data.recentReviews.map((rev) => (
              <div key={rev.id} className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-2.5 w-2.5", s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 dark:text-gray-700")} />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{rev.name}</span>
                <span className="ml-auto text-[9px] text-gray-400">{rev.timeAgo}</span>
              </div>
            ))}
          </div>
          <button className="mt-2 text-[10px] font-semibold text-sugu-500 hover:text-sugu-600">
            Voir tous les avies →
          </button>
        </section>
      </div>

      {/* ════════════ Bottom Row ════════════ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ── Véhicule & Documents ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "240ms" }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white mb-3">
            <Bike className="h-4 w-4 text-gray-500" />
            Véhicule &amp; Documents
          </h3>
          <dl className="space-y-1.5 mb-4">
            {[
              { dt: "Vehicle Type", dd: data.vehicleType },
              { dt: "Make / Model", dd: data.vehicleMake },
              { dt: "License Plate", dd: data.licensePlate || "—" },
            ].map((item) => (
              <div key={item.dt} className="flex justify-between">
                <dt className="text-[11px] text-gray-400">{item.dt}</dt>
                <dd className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{item.dd}</dd>
              </div>
            ))}
          </dl>

          <p className="text-[11px] font-bold text-gray-900 dark:text-white mb-2">Documents</p>
          <div className="space-y-2">
            {data.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2">
                {DOC_STATUS_ICON[doc.status]}
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{doc.label}</span>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold",
                    DOC_STATUS_LABEL_CLR[doc.status],
                  )}
                >
                  {doc.value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-gray-400 italic">{data.documentsStatus}</p>
        </section>

        {/* ── Dernières livraisons ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 dark:text-white">
              <Package className="h-4 w-4 text-gray-500" />
              Dernières livraisons
            </h3>
            <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="pb-2 text-left">Cordemndre</th>
                  <th className="pb-2 text-left">Route</th>
                  <th className="pb-2 text-right">Montant</th>
                  <th className="pb-2 text-right">Timp</th>
                  <th className="pb-2 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {data.recentDeliveriesTable.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-2 w-2 rounded-full flex-shrink-0", row.dotColor)} />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{row.orderId}</span>
                      </div>
                    </td>
                    <td className="py-1.5 text-gray-500">{row.route}</td>
                    <td className="py-1.5 text-right font-bold text-gray-700 dark:text-gray-300">{row.amount}</td>
                    <td className="py-1.5 text-right text-gray-400">{row.time}</td>
                    <td className="py-1.5 text-right text-gray-400">{row.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <div>
              <p className="text-[9px] font-medium text-gray-400">Tojourdoihi</p>
              <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{data.tableTodayTotal}</p>
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-400">aujourd{"\u0027"}dj</p>
              <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{data.tableTodayCount}</p>
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-400">vs moyen en équipe</p>
              <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{data.tableAvgPerTeam}</p>
            </div>
            <div>
              <p className="text-[9px] font-medium text-gray-400">rank</p>
              <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">{data.tableRank}</p>
            </div>
          </div>
        </section>

        {/* ── Incidents ── */}
        <section className="glass-card animate-card-enter rounded-2xl p-5" style={{ animationDelay: "360ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Incidents</h3>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Incidents est cte mois: <span className="font-bold text-gray-900 dark:text-white">{data.incidentCount}</span>
          </p>

          <div className="space-y-3">
            {data.incidents.map((inc) => (
              <div key={inc.id} className="rounded-xl bg-red-50/60 p-3 dark:bg-red-950/20">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-gray-900 dark:text-white">{inc.title}</p>
                    {inc.description && (
                      <p className="text-[10px] text-gray-500">{inc.description}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-gray-400">{inc.orderId}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              Taux de incidents <span className="font-bold text-gray-700 dark:text-gray-300">{data.incidentRate}</span>
            </p>
            <button className="text-[10px] font-semibold text-sugu-500 hover:text-sugu-600">
              Histoire du full histoire →
            </button>
          </div>
        </section>
      </div>

      {/* ════════════ Footer Action Bar ════════════ */}
      <footer className="glass-card rounded-2xl px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-bold text-gray-700 dark:text-gray-300">Livreur</span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", sCfg.dot)} />
            <span className={cn("font-semibold", sCfg.text)}>{sCfg.label}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-400">{data.membershipSince}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { const phone = data.phone.replace(/\s/g, ""); window.open(`tel:${phone}`); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <Phone className="h-3 w-3" />
            Appeler
          </button>
          <button
            onClick={() => { const phone = data.phone.replace(/[\s+]/g, ""); window.open(`https://wa.me/${phone}`); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-sugu-600">
            <Pencil className="h-3 w-3" />
            Modifier le profil
          </button>
          {data.status === "suspended" ? (
            <button
              onClick={() => activateMutation.mutate({ courierId: data.id })}
              disabled={activateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-400 disabled:opacity-50"
            >
              {activateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
              Réactiver le livreur
            </button>
          ) : (
            <button
              onClick={() => suspendMutation.mutate({ courierId: data.id })}
              disabled={suspendMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400 disabled:opacity-50"
            >
              {suspendMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
              Suspendre le livreur
            </button>
          )}
          <button
            onClick={() => { if (confirm("Êtes-vous sûr de vouloir retirer ce livreur ?")) { removeMutation.mutate({ courierId: data.id }, { onSuccess: () => router.push("/agency/drivers") }); } }}
            disabled={removeMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400 disabled:opacity-50"
          >
            {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
            Retirer
          </button>
        </div>
      </footer>
    </div>
  );
}
