"use client";

import { useVendorDashboard } from "@/features/vendor/hooks";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Star,
  Bell,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import React, { useState } from "react";
import type { ReactNode } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Image from "next/image";
import type {
  KpiCard,
  RecentOrder,
  TopProduct,
  StockAlert,
  RevenuePoint,
  OrderStatus,
} from "@/features/vendor/schema";
import VendorDashboardLoading from "./loading";
import { ErrorState } from "@/components/feedback";

// --- Icon mapping ---
const KPI_ICONS: Record<string, ReactNode> = {
  "trending-up": <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />,
  "shopping-bag": <ShoppingBag className="h-4 w-4 lg:h-5 lg:w-5" />,
  package: <Package className="h-4 w-4 lg:h-5 lg:w-5" />,
  star: <Star className="h-4 w-4 lg:h-5 lg:w-5" />,
};

// --- Status badge styles ---
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  confirmed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  processing:
    "bg-sugu-50 text-sugu-600 border-sugu-200 dark:bg-sugu-950/30 dark:text-sugu-400 dark:border-sugu-800",
  packed:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800",
  shipped:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800",
  delivered:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  cancelled:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
  refunded:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
};

export default function VendorDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useVendorDashboard();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  if (isLoading) return <VendorDashboardLoading />;

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title="Erreur du tableau de bord"
          description={error?.message || "Impossible de charger le tableau de bord. Veuillez réessayer."}
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
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white lg:text-2xl">
            Bienvenue, {data.vendorName}
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 lg:text-sm">
            {data.date}
          </p>
        </div>

        <div className="relative flex items-center gap-2 lg:gap-3">
          {/* Notifications */}
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            onBlur={() => setTimeout(() => setIsNotifOpen(false), 200)}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-500 ring-1 ring-inset ring-gray-900/5 transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md active:scale-95 dark:bg-gray-900/50 dark:text-gray-400 dark:ring-white/10 dark:hover:bg-gray-800 dark:hover:text-white lg:h-11 lg:w-11 lg:rounded-2xl"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 transition-all duration-300 group-hover:rotate-[15deg] group-hover:scale-110 lg:h-5 lg:w-5" />
            <span className="absolute right-2 top-2 flex h-2.5 w-2.5 lg:right-2.5 lg:top-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-gray-900"></span>
            </span>
          </button>

          {/* Fake Dropdown */}
          <div
            className={`absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-2xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5 transition-all duration-200 dark:border-gray-800 dark:bg-gray-900 sm:w-80 lg:mt-3 ${
              isNotifOpen
                ? "visible scale-100 opacity-100"
                : "invisible scale-95 opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 dark:border-gray-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Notifications
              </h3>
              <span className="rounded-full bg-sugu-50 px-2 py-0.5 text-[10px] font-bold text-sugu-600 dark:bg-sugu-500/10 dark:text-sugu-400">
                1 Nouvelle
              </span>
            </div>
            
            <div className="p-2">
              <div className="flex cursor-pointer gap-3 rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800/80">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sugu-100 text-sugu-600 dark:bg-sugu-500/20 dark:text-sugu-400">
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex flex-col text-left">
                  <p className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                    Bienvenue sur Sugu !
                  </p>
                  <p className="mt-0.5 text-xs font-medium leading-relaxed text-gray-500 dark:text-gray-400">
                    Ravi de vous compter parmi nos vendeurs premium.
                  </p>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-sugu-500">
                    À l'instant
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-50 p-2 dark:border-gray-800">
              <button className="w-full rounded-lg bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:hover:bg-gray-800">
                Tout marquer comme lu
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {data.kpis.map((kpi, i) => (
          <KpiCardComponent key={kpi.id} kpi={kpi} delay={i} />
        ))}
      </div>

      {/* ════════════ Middle Row: Chart + Recent Orders ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Revenue Chart */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
          aria-labelledby="revenue-chart-title"
        >
          <h2
            id="revenue-chart-title"
            className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg"
          >
            Revenus 7 jours
          </h2>
          <div className="mt-3 lg:mt-4">
            <RevenueChart data={data.revenueChart} />
          </div>
        </section>

        {/* Recent Orders */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
          aria-labelledby="recent-orders-title"
        >
          <h2
            id="recent-orders-title"
            className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg"
          >
            Commandes récentes
          </h2>
          <div className="mt-3 space-y-1 lg:mt-4 lg:space-y-0">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Aucune commande récente
              </p>
            )}
          </div>
        </section>
      </div>

      {/* ════════════ Bottom Row: Top Products + Stock Alerts ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        {/* Top Products */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
          aria-labelledby="top-products-title"
        >
          <h2
            id="top-products-title"
            className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg"
          >
            Top produits
          </h2>
          <div className="mt-3 space-y-1 lg:mt-4 lg:space-y-0">
            {data.topProducts.length > 0 ? (
              data.topProducts.map((product) => (
                <TopProductRow key={product.id} product={product} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Aucun produit vendu
              </p>
            )}
          </div>
        </section>

        {/* Stock Alerts */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:rounded-3xl lg:p-6"
          aria-labelledby="stock-alerts-title"
        >
          <h2
            id="stock-alerts-title"
            className="text-base font-semibold text-gray-900 dark:text-white lg:text-lg"
          >
            Alertes stock
          </h2>
          <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-3">
            {data.stockAlerts.length > 0 ? (
              data.stockAlerts.map((alert) => (
                <StockAlertRow key={alert.id} alert={alert} />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
                Aucune alerte de stock
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

/** KPI Card with gradient background */
function KpiCardComponent({ kpi, delay }: { kpi: KpiCard; delay: number }) {
  const isRating = kpi.id === "avg-rating";

  return (
    <div
      className={`kpi-card glass-card rounded-2xl p-3 transition-all duration-300 active:scale-[0.98] lg:rounded-3xl lg:p-5 lg:hover:-translate-y-1 animate-card-enter`}
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Top row: icon + badge */}
      <div className="flex items-center justify-between">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg lg:h-10 lg:w-10 lg:rounded-xl ${kpi.iconBg} shadow-sm`}
        >
          {KPI_ICONS[kpi.icon] ?? <Package className="h-4 w-4 lg:h-5 lg:w-5" />}
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
      <p className="mt-2 text-[10px] font-medium text-gray-500 dark:text-gray-400 lg:mt-3 lg:text-xs">
        {kpi.label}
      </p>

      {/* Value */}
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-lg font-extrabold text-gray-900 dark:text-white lg:text-2xl">
          {kpi.value}
        </span>
        {kpi.subValue && (
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 lg:text-sm">
            {kpi.subValue}
          </span>
        )}
      </div>

      {/* Stars for rating card */}
      {isRating && kpi.value !== "—" && (
        <div className="mt-1 flex gap-0.5 lg:mt-1.5" aria-label={`Note ${kpi.value} sur 5`}>
          {[1, 2, 3, 4].map((s) => (
            <Star
              key={s}
              className="h-3 w-3 fill-amber-400 text-amber-400 lg:h-4 lg:w-4"
            />
          ))}
          <Star className="h-3 w-3 fill-amber-400/40 text-amber-400/40 lg:h-4 lg:w-4" />
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white/95 p-3 shadow-xl backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-bold text-sugu-600 dark:text-sugu-500">
          {formatCurrency(payload[0].value)} FCFA
        </p>
      </div>
    );
  }
  return null;
};

/** Recharts Area Chart for a realistic and premium look */
function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Aucune donnée de revenus
      </p>
    );
  }

  return (
    <div className="h-48 w-full lg:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f15412" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#f15412" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af" strokeOpacity={0.2} />
          <XAxis 
            dataKey="day" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            dy={10}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
          />
          <Tooltip 
            content={<CustomTooltip />} 
            cursor={{ stroke: '#f15412', strokeWidth: 1, strokeDasharray: '5 5' }} 
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#f15412"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorValue)"
            activeDot={{ r: 6, fill: '#f15412', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Recent order row */
function OrderRow({ order }: { order: RecentOrder }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800/60">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/50">
          <ShoppingBag className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {order.reference}
          </span>
          <span className="text-xs font-medium text-gray-500 line-clamp-1">
            {order.client}
          </span>
        </div>
      </div>
      
      <div className="flex flex-1 sm:flex-none items-center justify-between sm:justify-end gap-4 ml-13 sm:ml-0">
        <span
          className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[order.status]}`}
        >
          {order.statusLabel}
        </span>
        <span className="whitespace-nowrap text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white sm:min-w-[100px] lg:text-base">
          {formatCurrency(order.total)} <span className="text-[10px] uppercase text-gray-400">FCFA</span>
        </span>
      </div>
    </div>
  );
}

/** Top product row */
function TopProductRow({ product }: { product: TopProduct }) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800/60">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {product.image ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            <Image src={product.image} alt={product.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200/50 dark:bg-gray-800/50 dark:ring-gray-700/50">
            <Package className="h-4 w-4" />
          </div>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
            {product.name}
          </span>
          <span className="text-xs font-medium text-gray-500">
            <span className="font-bold text-gray-700 dark:text-gray-300">{product.salesCount.toLocaleString("fr-FR")}</span> ventes
          </span>
        </div>
      </div>

      <div className="flex flex-1 sm:flex-none items-center justify-end ml-13 sm:ml-0">
        <span className="whitespace-nowrap text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white sm:min-w-[100px] lg:text-base">
          {formatCurrency(product.revenue)} <span className="text-[10px] uppercase text-gray-400">FCFA</span>
        </span>
      </div>
    </div>
  );
}

/** Stock alert row */
function StockAlertRow({ alert }: { alert: StockAlert }) {
  const isCritical = alert.level === "critical";

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-y-2 py-3 border-b border-gray-100 last:border-0 dark:border-gray-800/60">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${isCritical ? "bg-red-50 text-red-500 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" : "bg-amber-50 text-amber-500 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"}`}>
          {alert.icon === "alert-circle" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
            {alert.name}
          </span>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${isCritical ? "animate-pulse-dot bg-red-500" : "bg-amber-500"}`} />
            <span className={`text-xs font-medium ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
               <span className="font-bold">{alert.remaining}</span> restants
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 sm:flex-none justify-end ml-13 sm:ml-0">
        <button className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-gray-800 active:scale-95 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white">
          Remplir
        </button>
      </div>
    </div>
  );
}
