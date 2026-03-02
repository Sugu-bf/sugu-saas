/**
 * Dashboard Service
 * Handles: GET /sellers/dashboard
 */
import {
  vendorDashboardSchema,
  type VendorDashboardData,
} from "../schema";
import { api } from "@/lib/http/client";
import { normalizeStatus, STATUS_LABELS, PRODUCT_EMOJIS } from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawDashboardResponse {
  success: boolean;
  data: {
    revenues: Array<{
      id: string;
      label: string;
      amount: number;
      currency: string;
      type: string;
      period?: string;
    }>;
    quickActions: Array<{
      id: string;
      label: string;
      description: string;
      path: string;
      icon: string;
      badge?: string;
    }>;
    recentOrders: Array<{
      id: string;
      reference: string;
      customer: { name: string };
      amount: number;
      status: string;
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
    performance: Array<{
      label: string;
      value: number;
      unit: string;
    }>;
    stock: Array<{
      status: string;
      count: number;
      label: string;
    }>;
    revenueChart?: Array<{ day: string; value: number }>;
  };
}

/** Revenue type → KPI card UI config */
const KPI_CONFIG: Record<string, {
  icon: string;
  gradient: string;
  iconBg: string;
  subValue?: string;
}> = {
  total: {
    icon: "trending-up",
    gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
    iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    subValue: "FCFA",
  },
  orders: {
    icon: "shopping-bag",
    gradient: "from-blue-50 via-cyan-50/60 to-teal-50/40",
    iconBg: "bg-gradient-to-br from-blue-400 to-cyan-500 text-white",
  },
  products: {
    icon: "package",
    gradient: "from-purple-50 via-violet-50/60 to-fuchsia-50/40",
    iconBg: "bg-gradient-to-br from-purple-400 to-violet-500 text-white",
  },
};

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch the vendor dashboard data.
 * Calls GET /v1/sellers/dashboard.
 */
export async function getVendorDashboard(vendorName?: string): Promise<VendorDashboardData> {
  const res = await api.get<RawDashboardResponse>("sellers/dashboard");
  return vendorDashboardSchema.parse(_transformDashboardResponse(res.data, vendorName));
}

// ── Transformers ───────────────────────────────────────────

function _transformDashboardResponse(
  raw: RawDashboardResponse["data"],
  vendorName?: string,
): unknown {
  const kpis = (raw.revenues ?? []).map((rev) => {
    const config = KPI_CONFIG[rev.type] ?? KPI_CONFIG.total;
    const formattedValue =
      rev.type === "total"
        ? rev.amount.toLocaleString("fr-FR")
        : String(rev.amount);
    return {
      id: rev.id,
      label: rev.label,
      value: formattedValue,
      subValue: config.subValue,
      icon: config.icon,
      gradient: config.gradient,
      iconBg: config.iconBg,
    };
  });

  const ratingPerf = (raw.performance ?? []).find((p) => p.unit === "/5");
  if (ratingPerf) {
    kpis.push({
      id: "avg-rating",
      label: ratingPerf.label,
      value: String(ratingPerf.value),
      subValue: "/5",
      icon: "star",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    });
  } else if (kpis.length < 4) {
    kpis.push({
      id: "avg-rating",
      label: "Note moyenne",
      value: "—",
      subValue: "/5",
      icon: "star",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg: "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    });
  }

  const revenueChart = (raw.revenueChart ?? []).map((point) => ({
    day: point.day,
    value: point.value,
  }));

  const recentOrders = (raw.recentOrders ?? []).map((order) => {
    const ns = normalizeStatus(order.status);
    return {
      id: order.id,
      reference: order.reference,
      client: order.customer?.name ?? "Client",
      total: order.amount,
      status: ns,
      statusLabel: STATUS_LABELS[ns] ?? STATUS_LABELS[order.status] ?? order.status,
    };
  });

  const topProducts = (raw.topProducts ?? []).map((product, i) => ({
    id: product.id,
    name: product.name,
    emoji: PRODUCT_EMOJIS[i % PRODUCT_EMOJIS.length],
    salesCount: product.sales,
    revenue: product.revenue,
  }));

  const stockAlerts = (raw.stock ?? [])
    .filter((s) => s.status !== "in_stock" && s.count > 0)
    .map((s, i) => ({
      id: `stock-alert-${i + 1}`,
      name: s.label,
      emoji: s.status === "out_of_stock" ? "🚨" : "⚠️",
      remaining: s.count,
      level: s.status === "out_of_stock" ? ("critical" as const) : ("low" as const),
    }));

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return {
    vendorName: vendorName ?? "Vendeur",
    date: formattedDate,
    kpis,
    revenueChart,
    recentOrders,
    topProducts,
    stockAlerts,
  };
}
