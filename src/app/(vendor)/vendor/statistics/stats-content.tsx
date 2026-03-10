"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Star,
  ArrowRight,
  MapPin,
  Package,
} from "lucide-react";
import type { VendorStats } from "@/features/vendor/schema";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = ["7j", "30j", "90j", "12m", "Personnalisé"] as const;
const SUB_TABS = ["Vue d'ensemble", "Ventes", "Produits", "Clients", "Trafic"] as const;

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200",
          )}
        />
      ))}
    </span>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export function StatsContent({ data }: { data: VendorStats }) {
  const [period, setPeriod] = useState("30j");
  const [activeTab, setActiveTab] = useState("Vue d'ensemble");

  const maxRevenue = Math.max(1, ...data.revenueChart.map((p) => p.revenue));
  const maxWeekly = Math.max(1, ...data.weeklySales.map((s) => s.value));

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* ════════════ Header ════════════ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Statistiques</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-sm text-gray-600 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
            <Calendar className="h-3.5 w-3.5" />
            1 Fév — 24 Fév 2026
          </div>
          <div className="inline-flex rounded-xl border border-gray-200 bg-white/60 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-2 text-xs font-semibold transition-all first:rounded-l-xl last:rounded-r-xl",
                  period === p
                    ? "bg-sugu-500 text-white"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-2 text-sm font-medium text-gray-600 backdrop-blur-sm hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            <Download className="h-3.5 w-3.5" />
            Exporter PDF
          </button>
        </div>
      </div>

      {/* ════════════ Sub-tabs ════════════ */}
      <div className="flex gap-1 overflow-x-auto">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-sugu-500 text-white"
                : "text-gray-500 hover:bg-white/60 hover:text-gray-900 dark:text-gray-400",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={cn("glass-card rounded-2xl p-4 animate-card-enter")}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{kpi.label}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{kpi.value}</span>
              {kpi.subValue && <span className="text-xs font-semibold text-gray-500">{kpi.subValue}</span>}
            </div>
            <span className={cn("mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold", kpi.change >= 0 ? "text-green-600" : "text-red-500")}>
              {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {kpi.changeLabel}
            </span>
          </div>
        ))}
      </div>

      {/* ════════════ Revenue Chart + Top Products ════════════ */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Chart (3 cols) */}
        <div className="glass-card rounded-3xl p-6 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Évolution des revenus</h2>
          </div>

          {/* SVG area chart */}
          <div className="relative mt-4 h-48 w-full overflow-hidden">
            {/* Y-axis labels */}
            <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[9px] text-gray-400">
              <span>{formatCurrency(maxRevenue)}</span>
              <span>{formatCurrency(Math.round(maxRevenue / 2))}</span>
              <span>0</span>
            </div>

            {/* Grid lines */}
            <div className="absolute inset-0 ml-12 flex flex-col justify-between">
              {[0, 1, 2].map((i) => <div key={i} className="border-t border-gray-100 dark:border-gray-800" />)}
            </div>

            {/* Bars visualization */}
            <div className="ml-12 flex h-full items-end gap-1">
              {data.revenueChart.map((point, i) => {
                const height = (point.revenue / maxRevenue) * 100;
                return (
                  <div key={i} className="group relative flex flex-1 flex-col items-center">
                    <div
                      className="w-full rounded-t-md bg-sugu-400 opacity-80 transition-all hover:opacity-100"
                      style={{ height: `${height}%` }}
                    />
                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-14 z-10 hidden rounded-lg bg-gray-900 px-2.5 py-1.5 text-[9px] text-white shadow-lg group-hover:block">
                      <p className="font-bold">{point.date}</p>
                      <p>Revenus: {formatCurrency(point.revenue)} FCFA</p>
                      <p>Commandes: {point.orders}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-axis labels */}
            <div className="ml-12 mt-1 flex">
              {data.revenueChart.map((point, i) => (
                <span key={i} className="flex-1 text-center text-[8px] text-gray-400 truncate">{point.date}</span>
              ))}
            </div>
          </div>

          {/* Footer comparison */}
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/40 px-4 py-2 dark:bg-white/5">
            <span className="text-xs text-gray-500">Ce mois:</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white">{formatCurrency(data.currentMonthRevenue)} FCFA</span>
            <span className="text-xs text-gray-400">vs Mois précédent:</span>
            <span className="text-xs font-medium text-gray-500">{formatCurrency(data.previousMonthRevenue)} FCFA</span>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600">+{data.revenueChangePercent}%</span>
          </div>
        </div>

        {/* Top 5 Produits (2 cols) */}
        <div className="glass-card rounded-3xl p-6 xl:col-span-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Top 5 Produits</h2>
          <div className="mt-4 space-y-3">
            {data.topProducts.map((p) => (
              <div key={p.rank} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sugu-50 text-xs font-bold text-sugu-600">{p.rank}</span>
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-9 w-9 rounded-lg object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                  />
                ) : null}
                <span className={`text-xl ${p.image ? 'hidden' : ''}`}><Package className="h-5 w-5 text-gray-400" /></span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.sold} vendus</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{formatCurrency(p.revenue)} FCFA</p>
                  <div className="flex items-center justify-end gap-0.5">
                    <StarRating value={p.rating} />
                    <span className="text-[10px] text-gray-400">{p.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-semibold text-sugu-500 hover:text-sugu-600">
            Voir tous les produits <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ════════════ Bottom Row ════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-5">
        {/* ── Category Donut ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Ventes par catégorie</h2>

          <div className="mt-4 flex items-center justify-center">
            {/* Donut */}
            <div className="relative h-32 w-32">
              <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                {(() => {
                  let offset = 0;
                  const colors = ["#f97316", "#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#9ca3af"];
                  return data.categorySales.map((cat, i) => {
                    const dash = cat.percent;
                    const el = (
                      <circle
                        key={cat.name}
                        cx="18" cy="18" r="15.9155"
                        fill="none" stroke={colors[i]} strokeWidth="3"
                        strokeDasharray={`${dash} ${100 - dash}`}
                        strokeDashoffset={`-${offset}`}
                      />
                    );
                    offset += dash;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">{data.totalProducts}</span>
                <span className="text-[9px] text-gray-400">produits</span>
                <span className="text-[9px] text-gray-400">{data.totalCategories} catégories</span>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {data.categorySales.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2 text-[11px]">
                <div className={`h-2.5 w-2.5 rounded-full ${cat.color}`} />
                <span className="flex-1 text-gray-600 dark:text-gray-400">{cat.name}</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{cat.percent}%</span>
                <span className="text-gray-400">{formatCurrency(cat.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Conversion Funnel ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Entonnoir de conversion</h2>
          <div className="mt-4 space-y-2">
            {data.funnel.map((step) => {
              const width = Math.max(step.percent * 1, 30);
              return (
                <div key={step.label}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600 dark:text-gray-400">{step.label}</span>
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{step.value.toLocaleString("fr-FR")}</span>
                  </div>
                  <div className="mt-0.5 h-4 rounded-full bg-gray-100/60 dark:bg-gray-800/40">
                    <div
                      className="h-full rounded-full bg-sugu-500 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <p className="text-right text-[9px] text-gray-400">{step.percent}%</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-white/40 p-2.5 dark:bg-white/5">
            <p className="text-[10px] text-gray-500">
              Taux global: <span className="font-bold text-gray-900 dark:text-white">{data.globalConversionRate}%</span>
            </p>
            <p className="text-[10px] text-gray-400">
              Moyenne du marché: {data.marketAverage}%{" "}
              <span className="font-bold text-green-600">Au-dessus</span>
            </p>
          </div>
        </div>

        {/* ── Weekly Sales ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Ventes par jour</h2>
          <div className="mt-4 flex h-36 items-end gap-2">
            {data.weeklySales.map((s) => {
              const height = (s.value / maxWeekly) * 100;
              return (
                <div key={s.day} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-gray-600 opacity-0 transition-opacity group-hover:opacity-100">{s.value}</span>
                  <div
                    className="w-full rounded-t-lg bg-sugu-400 opacity-80 transition-all hover:opacity-100"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] text-gray-400">{s.day}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-white/40 p-2.5 dark:bg-white/5">
            <p className="text-[10px] text-gray-500">Meilleur jour: <span className="font-bold text-gray-900 dark:text-white">{data.bestDay}</span></p>
            <p className="text-[10px] text-gray-400">Heure de pointe: {data.peakHours}</p>
          </div>
        </div>

        {/* ── City Sales ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Ventes par ville</h2>
          <div className="mt-4 space-y-2.5">
            {data.citySales.map((city) => (
              <div key={city.name}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-sugu-400" />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{city.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatCurrency(city.revenue)} FCFA</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100/60 dark:bg-gray-800/40">
                    <div
                      className="h-full rounded-full bg-sugu-500"
                      style={{ width: `${city.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">{city.percent}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-gray-400">{data.totalCities} villes au total</p>
        </div>

        {/* ── Reviews ── */}
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">Avis clients récents</h2>

          {/* Global rating */}
          <div className="mt-3 flex items-center gap-3">
            <div className="text-center">
              <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{data.globalRating}</span>
              <span className="text-sm text-gray-500">/5</span>
            </div>
            <div>
              <StarRating value={data.globalRating} />
              <p className="text-[10px] text-gray-400">({data.totalReviews.toLocaleString("fr-FR")} avis)</p>
            </div>
          </div>

          {/* Distribution */}
          <div className="mt-2 space-y-1">
            {data.ratingDistribution.map((r) => (
              <div key={r.stars} className="flex items-center gap-1.5">
                <span className="w-4 text-right text-[10px] font-semibold text-gray-500">{r.stars}</span>
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${r.percent}%` }} />
                </div>
                <span className="w-7 text-right text-[10px] text-gray-400">{r.percent}%</span>
              </div>
            ))}
          </div>

          {/* Recent reviews */}
          <h4 className="mt-3 text-[10px] font-bold uppercase text-gray-500">Derniers avis</h4>
          <div className="mt-1.5 space-y-2">
            {data.recentReviews.map((review) => (
              <div key={review.id} className="flex items-start gap-2">
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${review.avatarColor}`}>
                  {review.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-800 dark:text-gray-200">{review.name}</span>
                    <StarRating value={review.rating} />
                  </div>
                  <p className="truncate text-[9px] text-gray-400">{review.text}</p>
                </div>
                <span className="flex-shrink-0 text-[9px] text-gray-400">{review.date}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-sugu-500 hover:text-sugu-600">
            Voir tous les avis <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
