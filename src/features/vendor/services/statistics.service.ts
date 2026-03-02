/**
 * Statistics Service
 * Handles: GET /sellers/statistics
 */
import { vendorStatsSchema, type VendorStats } from "../schema";
import { api } from "@/lib/http/client";

// ── Raw API Types ──────────────────────────────────────────

interface RawStatisticsOverview { totalRevenue: number; revenueGrowth: number; totalOrders: number; ordersGrowth: number; averageOrderValue: number; aovGrowth: number; conversionRate: number; conversionGrowth: number; }
interface RawMonthlySale { month: string; revenue: number; orders: number; }
interface RawStatTopProduct { id: string; name: string; sku: string; soldCount: number; revenue: number; stock: number; image: string; }
interface RawTopLocation { city: string; count: number; percentage: number; }
interface RawDemographics { newCustomers: number; returningCustomers: number; topLocations: RawTopLocation[]; }
interface RawStatisticsResponse { success: boolean; data: { overview: RawStatisticsOverview; monthlySales: RawMonthlySale[]; topProducts: RawStatTopProduct[]; demographics: RawDemographics; lastUpdated: string; }; }

// ── Public API ─────────────────────────────────────────────

/** Fetch vendor statistics */
export async function getVendorStats(): Promise<VendorStats> {
  const response = await api.get<RawStatisticsResponse>("sellers/statistics");
  return vendorStatsSchema.parse(_transformStatisticsResponse(response.data));
}

// ── Transformers ───────────────────────────────────────────

function _transformStatisticsResponse(raw: RawStatisticsResponse["data"]): unknown {
  const overview = raw.overview;
  const kpis = _buildStatsKpis(overview, raw.demographics.newCustomers);
  const revenueChart = (raw.monthlySales ?? []).map((m) => ({ date: m.month, revenue: m.revenue, orders: m.orders }));

  const currentMonthRevenue = overview.totalRevenue;
  const growthDivisor = 1 + overview.revenueGrowth / 100;
  const previousMonthRevenue =
    growthDivisor !== 0 && overview.revenueGrowth !== 0
      ? Math.round(currentMonthRevenue / growthDivisor)
      : currentMonthRevenue;

  const topProducts = (raw.topProducts ?? []).map((p, index) => ({
    rank: index + 1, name: p.name, image: p.image || "", sold: p.soldCount, revenue: p.revenue, rating: 4.5,
  }));
  while (topProducts.length < 5) {
    topProducts.push({ rank: topProducts.length + 1, name: "—", image: "", sold: 0, revenue: 0, rating: 0 });
  }

  const citySales = (raw.demographics.topLocations ?? []).map((loc) => ({
    name: loc.city, percent: loc.percentage, revenue: Math.round((loc.percentage / 100) * currentMonthRevenue),
  }));

  return {
    kpis, revenueChart, currentMonthRevenue, previousMonthRevenue,
    revenueChangePercent: overview.revenueGrowth,
    topProducts: topProducts.slice(0, 5),
    categorySales: [{ name: "Catégorie 1", percent: 0, revenue: 0, color: "bg-sugu-500" }],
    totalProducts: 0, totalCategories: 0,
    funnel: [
      { label: "Ajouts au panier", value: 0, percent: 0 },
      { label: "Commandes initiées", value: 0, percent: 0 },
      { label: "Commandes complétées", value: 0, percent: 0 },
      { label: "Clients récurrents", value: 0, percent: 0 },
    ],
    globalConversionRate: overview.conversionRate, marketAverage: 0,
    weeklySales: [
      { day: "Lun", value: 0 }, { day: "Mar", value: 0 }, { day: "Mer", value: 0 },
      { day: "Jeu", value: 0 }, { day: "Ven", value: 0 }, { day: "Sam", value: 0 }, { day: "Dim", value: 0 },
    ],
    bestDay: "—", peakHours: "—", citySales, totalCities: citySales.length,
    globalRating: 0, totalReviews: 0,
    ratingDistribution: [
      { stars: 5, percent: 0 }, { stars: 4, percent: 0 }, { stars: 3, percent: 0 },
      { stars: 2, percent: 0 }, { stars: 1, percent: 0 },
    ],
    recentReviews: [],
  };
}

function _buildStatsKpis(overview: RawStatisticsOverview, newCustomers: number) {
  const formatNum = (n: number): string => n >= 1000 ? n.toLocaleString("fr-FR") : String(n);
  const formatChange = (n: number): string => `${n >= 0 ? "+" : ""}${n}%`;

  return [
    { label: "Chiffre d'affaires", value: formatNum(overview.totalRevenue), subValue: "FCFA", change: overview.revenueGrowth, changeLabel: formatChange(overview.revenueGrowth), icon: "banknote", gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40" },
    { label: "Commandes", value: formatNum(overview.totalOrders), change: overview.ordersGrowth, changeLabel: formatChange(overview.ordersGrowth), icon: "shopping-cart", gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40" },
    { label: "Panier moyen", value: formatNum(overview.averageOrderValue), subValue: "FCFA", change: overview.aovGrowth, changeLabel: formatChange(overview.aovGrowth), icon: "wallet", gradient: "from-emerald-50 via-green-50/60 to-teal-50/40" },
    { label: "Nouveaux clients", value: String(newCustomers), change: newCustomers > 0 ? 100 : 0, changeLabel: newCustomers > 0 ? `+${newCustomers}` : "0", icon: "users", gradient: "from-purple-50 via-violet-50/60 to-fuchsia-50/40" },
    { label: "Taux de conversion", value: String(overview.conversionRate), subValue: "%", change: overview.conversionGrowth, changeLabel: formatChange(overview.conversionGrowth), icon: "target", gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40" },
    { label: "Note moyenne", value: "4.7", subValue: "/5", change: 0, changeLabel: "—", icon: "star", gradient: "from-pink-50 via-rose-50/60 to-red-50/40" },
  ];
}
