"use client";

import { useState } from "react";
import Link from "next/link";
import { useDriverEarnings } from "@/features/driver/hooks";
import { formatCurrency } from "@/lib/utils";
import {
  Wallet,
  Clock,
  ArrowDownToLine,
  TrendingUp,
  ArrowUpRight,
  Package,
  Calendar,
  ChevronRight,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  DriverEarningsKpi,
  DriverTransaction,
  EarningsChartPoint,
  DriverNextPayout,
} from "@/features/driver/schema";
import DriverEarningsLoading from "./loading";
import { ErrorState } from "@/components/feedback";

// ── Icon mapping ──
const EARNINGS_ICONS: Record<string, ReactNode> = {
  wallet: <Wallet className="h-4 w-4 lg:h-5 lg:w-5" />,
  clock: <Clock className="h-4 w-4 lg:h-5 lg:w-5" />,
  "arrow-down-to-line": <ArrowDownToLine className="h-4 w-4 lg:h-5 lg:w-5" />,
  "trending-up": <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />,
};

// ── Transaction type config ──
const ENTRY_TYPE_CONFIG: Record<
  string,
  { label: string; style: string; prefix: string; color: string }
> = {
  delivery: {
    label: "Gain",
    style: "bg-green-50 text-green-700 border-green-200",
    prefix: "+",
    color: "text-green-600",
  },
  withdrawal: {
    label: "Retrait",
    style: "bg-blue-50 text-blue-700 border-blue-200",
    prefix: "-",
    color: "text-blue-600",
  },
  fee: {
    label: "Frais",
    style: "bg-gray-50 text-gray-600 border-gray-200",
    prefix: "-",
    color: "text-red-500",
  },
  pending: {
    label: "En attente",
    style: "bg-amber-50 text-amber-700 border-amber-200",
    prefix: "+",
    color: "text-amber-600",
  },
};

// ── Status rendering ──
const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmé", color: "text-green-600" },
  completed: { label: "Effectué", color: "text-green-600" },
  pending: { label: "En attente", color: "text-amber-600" },
};

/** Derive the transaction category from DriverTransaction */
function getEntryCategory(entry: DriverTransaction): string {
  if (entry.status === "pending") return "pending";
  if (entry.referenceType === "delivery") return "delivery";
  if (entry.referenceType === "payout") return "withdrawal";
  if (entry.referenceType === "commission") return "fee";
  return entry.type === "debit" ? "withdrawal" : "delivery";
}

// ── Period pills ──
const PERIOD_OPTIONS = [
  { label: "7j", value: "7d" },
  { label: "30j", value: "30d" },
  { label: "90j", value: "90d" },
  { label: "1an", value: "1y" },
] as const;

// ── Filter pills ──
const FILTER_OPTIONS = [
  { label: "Tout", value: "all" },
  { label: "Gains", value: "delivery" },
  { label: "Retraits", value: "withdrawal" },
  { label: "Frais", value: "fee" },
] as const;

// ════════════════════════════════════════════════════════════
// Main Page Component
// ════════════════════════════════════════════════════════════

export default function DriverEarningsPage() {
  const { data, isLoading, isError, error, refetch } = useDriverEarnings();
  const [activePeriod, setActivePeriod] = useState("30d");
  const [activeFilter, setActiveFilter] = useState("all");

  if (isLoading) return <DriverEarningsLoading />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title="Erreur des gains"
          description={
            error?.message ||
            "Impossible de charger vos gains. Veuillez réessayer."
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  // Filter transactions
  const filteredTransactions =
    activeFilter === "all"
      ? data.transactions
      : data.transactions.filter(
          (t) => getEntryCategory(t) === activeFilter,
        );

  // Revenue chart stats
  const totalRevenue = data.revenueChart.reduce((s, d) => s + d.value, 0);
  const previousWeekRevenue = 40600;

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sugu-500 text-white">
            <Banknote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
              Mes Gains
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 lg:text-[13px]">
              Suivez vos revenus et demandez des retraits
            </p>
          </div>
        </div>

        <Link
          href="/driver/earnings/withdraw"
          className="flex items-center gap-2 rounded-2xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-sugu-600 lg:hover:-translate-y-0.5"
          id="request-payout-btn"
        >
          <ArrowUpRight className="h-4 w-4" />
          Demander un retrait
        </Link>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {data.kpis.map((kpi, i) => (
          <KpiCardComponent key={kpi.id} kpi={kpi} delay={i} />
        ))}
      </div>

      {/* ════════════ Middle Row: Chart + Next Payout ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        {/* Revenue Chart (3 cols) */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:col-span-3 lg:rounded-3xl lg:p-6"
          aria-labelledby="earnings-chart-title"
        >
          <div className="flex items-center justify-between">
            <h2
              id="earnings-chart-title"
              className="text-base font-semibold text-gray-900 lg:text-lg"
            >
              Évolution des gains
            </h2>
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActivePeriod(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    activePeriod === opt.value
                      ? "bg-sugu-500 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 lg:mt-4">
            <EarningsChart data={data.revenueChart} />
          </div>

          {/* Bottom stats */}
          <div className="mt-3 flex flex-col gap-1 px-1 sm:flex-row sm:justify-between lg:mt-4">
            <span className="text-xs text-gray-500">
              Gains cette semaine:{" "}
              <strong className="text-gray-700">
                {formatCurrency(totalRevenue)} FCFA
              </strong>
            </span>
            <span className="text-xs text-gray-500">
              vs semaine précédente:{" "}
              <strong className="text-gray-700">
                {formatCurrency(previousWeekRevenue)} FCFA
              </strong>{" "}
              <span className="font-semibold text-green-600">(+12.7%)</span>
            </span>
          </div>
        </section>

        {/* Next Payout Card (2 cols) */}
        <section className="lg:col-span-2">
          <NextPayoutCard payout={data.nextPayout} />
        </section>
      </div>

      {/* ════════════ Transactions Table ════════════ */}
      <section
        className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
        aria-labelledby="transactions-title"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            id="transactions-title"
            className="text-base font-semibold text-gray-900 lg:text-lg"
          >
            Historique des transactions
          </h2>

          {/* Filter pills */}
          <div className="flex gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  activeFilter === opt.value
                    ? "border-sugu-200 bg-sugu-50 text-sugu-600"
                    : "border-gray-200 bg-white/50 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table header */}
        <div className="mt-4 hidden items-center gap-4 border-b border-gray-200/60 px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider lg:flex">
          <span className="w-24">Date</span>
          <span className="flex-1">Description</span>
          <span className="w-20 text-center">Type</span>
          <span className="w-28 text-right">Montant</span>
          <span className="w-24 text-right">Statut</span>
        </div>

        {/* Transaction rows */}
        <div className="mt-2 space-y-0 lg:mt-0">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((entry) => (
              <TransactionRow key={entry.id} entry={entry} />
            ))
          ) : (
            <p className="py-12 text-center text-sm text-gray-400">
              Aucune transaction trouvée
            </p>
          )}
        </div>

        {/* Footer link */}
        <div className="mt-4 flex justify-center border-t border-gray-100/60 pt-4">
          <button className="flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-sugu-500">
            Voir tout l&apos;historique
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

/** KPI Card with gradient background */
function KpiCardComponent({ kpi, delay }: { kpi: DriverEarningsKpi; delay: number }) {
  return (
    <div
      className={`kpi-card glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:rounded-3xl lg:p-5 lg:hover:-translate-y-1 animate-card-enter`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl ${kpi.iconBg}`}
        >
          {EARNINGS_ICONS[kpi.icon] ?? (
            <Package className="h-4 w-4 lg:h-5 lg:w-5" />
          )}
        </div>
        {kpi.badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold lg:px-2.5 lg:text-xs ${kpi.badgeColor ?? "text-gray-600 bg-gray-100"}`}
          >
            {kpi.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <p className="mt-2 text-[10px] font-medium text-gray-500 lg:mt-3 lg:text-xs">
        {kpi.label}
      </p>

      {/* Value */}
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-gray-900 lg:text-2xl">
          {kpi.value}
        </span>
        {kpi.subValue && (
          <span className="text-xs font-semibold text-gray-500 lg:text-sm">
            {kpi.subValue}
          </span>
        )}
      </div>
    </div>
  );
}

/** SVG Area Chart — pure CSS, no JS library */
function EarningsChart({ data }: { data: EarningsChartPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        Aucune donnée de gains
      </p>
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

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="h-32 w-full lg:h-40"
        preserveAspectRatio="none"
        role="img"
        aria-label="Graphique d'évolution des gains"
      >
        <defs>
          <linearGradient id="driver-earnings-chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f15412" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="driver-earnings-line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb8a3c" />
            <stop offset="100%" stopColor="#f15412" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#driver-earnings-chart-gradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#driver-earnings-line-gradient)"
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
            className="text-[9px] font-medium text-gray-400 lg:text-[11px]"
          >
            {d.day}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Next Payout Card */
function NextPayoutCard({ payout }: { payout: DriverNextPayout }) {
  return (
    <div className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6 h-full flex flex-col">
      <h2 className="text-base font-semibold text-gray-900 lg:text-lg">
        Prochain versement
      </h2>

      {/* Amount */}
      <div className="mt-3 lg:mt-4">
        <span className="text-3xl font-black text-gray-900 lg:text-4xl">
          {formatCurrency(payout.amount)}
        </span>
        <span className="ml-1.5 text-sm font-semibold text-gray-500">FCFA</span>
      </div>

      {/* Scheduled date */}
      <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          Prévu le{" "}
          <strong className="text-gray-700">{payout.scheduledDate}</strong>
        </span>
      </div>

      {/* Payment method */}
      <div className="mt-4 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Méthode de paiement
        </p>
        {payout.method ? (
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
              OM
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">
                {payout.method.providerLabel}
              </p>
              <p className="text-xs text-gray-500">
                {payout.method.accountMasked}
              </p>
            </div>
            <button className="text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600">
              Modifier
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">Aucune méthode configurée</p>
        )}
      </div>

      {/* Min threshold */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100/60 pt-3">
        <span className="text-xs text-gray-500">Seuil minimum de retrait</span>
        <span className="text-sm font-bold text-gray-800">
          {formatCurrency(payout.minThreshold)} FCFA
        </span>
      </div>
    </div>
  );
}

/** Single transaction row */
function TransactionRow({ entry }: { entry: DriverTransaction }) {
  const category = getEntryCategory(entry);
  const config = ENTRY_TYPE_CONFIG[category] ?? ENTRY_TYPE_CONFIG.delivery;
  const statusInfo = STATUS_DISPLAY[entry.status] ?? STATUS_DISPLAY.confirmed;

  return (
    <div className="flex flex-col gap-2 border-b border-gray-100/60 px-2 py-3.5 transition-colors active:bg-white/40 lg:flex-row lg:items-center lg:gap-4 lg:hover:bg-white/40">
      {/* Date */}
      <span className="hidden text-xs text-gray-500 lg:block lg:w-24">
        {entry.date}
      </span>

      {/* Description */}
      <div className="flex items-center justify-between lg:contents">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">
            {entry.description}
          </p>
          <p className="text-xs text-gray-400 lg:hidden">{entry.date}</p>
        </div>
      </div>

      {/* Type pill */}
      <div className="hidden lg:flex lg:w-20 lg:justify-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.style}`}
        >
          {config.label}
        </span>
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between lg:contents">
        {/* Mobile type pill */}
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold lg:hidden ${config.style}`}
        >
          {config.label}
        </span>

        <span
          className={`text-sm font-bold lg:w-28 lg:text-right ${config.color}`}
        >
          {config.prefix}
          {formatCurrency(entry.amount)} FCFA
        </span>
      </div>

      {/* Status */}
      <span
        className={`hidden text-xs font-medium lg:flex lg:items-center lg:gap-1 lg:w-24 lg:justify-end ${statusInfo.color}`}
      >
        {entry.status === "pending" ? (
          <Clock className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        {statusInfo.label}
      </span>
    </div>
  );
}
