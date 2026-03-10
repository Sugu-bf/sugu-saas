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
import type { ReactNode } from "react";
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

        <div className="flex items-center gap-2 lg:gap-3">
          {/* Notifications */}
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/50 text-gray-500 shadow-sm backdrop-blur-md transition-all active:scale-95 lg:h-10 lg:w-10 lg:rounded-2xl dark:border-gray-700/50 dark:bg-gray-900/50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sugu-500 animate-pulse-dot lg:right-2 lg:top-2" />
          </button>
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

/** SVG Area Chart — pure CSS, no JS library */
function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Aucune donnée de revenus
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

  // Build SVG path for smooth curve (catmull-rom-like)
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
        aria-label="Graphique des revenus sur 7 jours"
      >
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f15412" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f15412" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#fb8a3c" />
            <stop offset="100%" stopColor="#f15412" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaPath} fill="url(#chart-gradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#line-gradient)"
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
  );
}

/** Recent order row */
function OrderRow({ order }: { order: RecentOrder }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white/30 px-3 py-3 transition-colors active:bg-white/50 dark:bg-white/5 dark:active:bg-white/10 lg:flex-row lg:items-center lg:gap-3 lg:bg-transparent lg:px-2">
      {/* Top row: ref + status */}
      <div className="flex items-center justify-between lg:contents">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 lg:w-14 lg:text-sm">
          {order.reference}
        </span>
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium lg:min-w-[90px] lg:px-3 lg:py-1 lg:text-xs ${STATUS_STYLES[order.status]}`}
        >
          {order.statusLabel}
        </span>
      </div>

      {/* Bottom row: client + total */}
      <div className="flex items-center justify-between lg:contents">
        <span className="text-xs text-gray-600 dark:text-gray-400 lg:flex-1 lg:text-sm">
          {order.client}
        </span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 lg:text-sm">
          {formatCurrency(order.total)} FCFA
        </span>
      </div>
    </div>
  );
}

/** Top product row */
function TopProductRow({ product }: { product: TopProduct }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-2 py-2.5 transition-colors active:bg-white/40 dark:active:bg-white/5 lg:gap-3 lg:py-3 lg:hover:bg-white/40 lg:dark:hover:bg-white/5">
      {/* Product image */}
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          className="h-8 w-8 rounded-lg object-cover lg:h-10 lg:w-10 lg:rounded-xl"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-gray-800/50 lg:h-10 lg:w-10 lg:rounded-xl">
          <Package className="h-4 w-4 text-gray-500 dark:text-gray-400 lg:h-5 lg:w-5" />
        </div>
      )}

      {/* Name + sales */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate lg:text-sm">
          {product.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {product.salesCount.toLocaleString("fr-FR")} ventes
        </p>
      </div>

      {/* Revenue */}
      <span className="text-xs font-bold text-gray-800 dark:text-gray-200 lg:text-sm">
        {formatCurrency(product.revenue)} FCFA
      </span>
    </div>
  );
}

/** Stock alert row */
function StockAlertRow({ alert }: { alert: StockAlert }) {
  const isCritical = alert.level === "critical";

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/40 px-3 py-2.5 dark:bg-white/5 lg:gap-3 lg:px-4 lg:py-3">
      {/* Icon */}
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-gray-800/50 lg:h-10 lg:w-10 lg:rounded-xl">
        {alert.icon === "alert-circle" ? (
          <AlertCircle className="h-4 w-4 text-red-500 lg:h-5 lg:w-5" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-500 lg:h-5 lg:w-5" />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-white truncate lg:text-sm">
          {alert.name}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isCritical ? "bg-red-500 animate-pulse-dot" : "bg-amber-500"}`}
          />
          <span className={`text-xs font-medium ${isCritical ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
            {isCritical ? "Critical Stock" : "Low Stock"} · {alert.remaining} left
          </span>
        </div>
      </div>

      {/* CTA */}
      <button className="flex-shrink-0 rounded-full border border-sugu-200 bg-sugu-50/80 px-2.5 py-1 text-[10px] font-semibold text-sugu-600 transition-all active:scale-95 lg:px-3 lg:py-1.5 lg:text-xs lg:hover:bg-sugu-100 lg:hover:border-sugu-300 dark:border-sugu-800 dark:bg-sugu-950/30 dark:text-sugu-400 dark:hover:bg-sugu-950/50">
        Réapprovisionner
      </button>
    </div>
  );
}
