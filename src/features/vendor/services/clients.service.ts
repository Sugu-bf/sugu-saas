/**
 * Clients Service
 * Handles: GET/POST /sellers/customers, client detail, export, create
 */
import {
  vendorClientsResponseSchema,
  vendorClientSchema,
  createCustomerResponseSchema,
  type VendorClientsResponse,
  type VendorClient,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
} from "../schema";
import { api } from "@/lib/http/client";
import {
  normalizeStatus,
  STATUS_LABELS,
  avatarColor,
  initials,
  formatDateFr,
  parseAmountFromLabel,
} from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawClientListItem {
  id: string;
  email?: string | null;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  avatar?: string | null;
  lastActiveLabel?: string;
  totalSpentLabel?: string;
  ordersCount?: number;
  phone?: string;
}

interface RawClientStatsItem {
  label: string;
  value: number;
  trend: string;
}

interface RawClientDetail extends RawClientListItem {
  createdAt?: string;
  stats?: {
    totalOrders?: number;
    totalSpent?: number;
    averageBasket?: number;
    lastOrderDate?: string | null;
    daysInactive?: number;
  };
  recentOrders?: Array<{
    id: string;
    amount?: number;
    status?: string;
    date?: string;
  }>;
}

const CLIENT_STATUS_MAP: Record<string, string> = {
  VIP: "vip", vip: "vip",
  ACTIVE: "active", active: "active",
  INACTIVE: "inactive", inactive: "inactive",
  Nouveau: "new", nouveau: "new", new: "new",
};

const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: "Actif", loyal: "Fidèle", vip: "VIP", new: "Nouveau", inactive: "Inactif",
};

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch vendor clients (paginated, filterable) with KPI stats.
 */
export async function getVendorClients(
  status?: string,
  page?: number,
  search?: string,
): Promise<VendorClientsResponse> {
  const params: Record<string, string | number | undefined> = {
    page: page ?? 1,
    limit: 20,
  };
  if (search) params.search = search;

  const [listRes, statsRes] = await Promise.all([
    api.get<{
      success: boolean;
      data: RawClientListItem[];
      meta?: {
        current_page?: number;
        last_page?: number;
        total?: number;
        per_page?: number;
        has_more?: boolean;
      };
    }>("sellers/customers", { params }),
    api.get<{ success: boolean; data: RawClientStatsItem[] }>("sellers/customers/stats"),
  ]);

  const rawClients = listRes.data ?? [];
  const rawStats = statsRes.data ?? [];
  const meta = listRes.meta ?? {};

  const kpis = _transformClientStats(rawStats);
  const clients = rawClients.map((raw) => _transformClientListItem(raw));
  const statusCounts = _buildClientStatusCounts(rawStats, kpis);

  const filteredClients =
    status && status !== "all"
      ? clients.filter((c) => {
          if (status === "loyal") return c.status === "vip" || c.status === "loyal";
          return c.status === status;
        })
      : clients;

  const totalItems = meta.total ?? rawClients.length;
  const perPage = meta.per_page ?? 20;
  const totalPages = meta.last_page ?? Math.max(1, Math.ceil(totalItems / perPage));

  return vendorClientsResponseSchema.parse({
    kpis,
    statusCounts,
    clients: filteredClients,
    pagination: {
      currentPage: meta.current_page ?? page ?? 1,
      totalPages,
      perPage,
      totalItems,
    },
  });
}

/** Fetch a single client's detail */
export async function getVendorClientDetail(id: string): Promise<VendorClient> {
  const res = await api.get<{ success: boolean; data: RawClientDetail }>(`sellers/customers/${id}`);
  return vendorClientSchema.parse(_transformClientDetailItem(res.data));
}

/** Create a new client */
export async function createClientFromClientsPage(
  data: CreateCustomerRequest,
): Promise<CreateCustomerResponse> {
  const res = await api.post<{ success: boolean; data: RawClientListItem }>("sellers/customers", data);
  return createCustomerResponseSchema.parse({
    id: res.data.id,
    fullName: res.data.fullName ?? `${data.firstName} ${data.lastName}`,
    email: res.data.email ?? data.email ?? null,
    phone: res.data.phone ?? data.phone ?? null,
  });
}

/** Export clients data */
export async function exportVendorClients(): Promise<{
  format: string;
  rows: number;
  data: Array<Record<string, unknown>>;
}> {
  const res = await api.post<{
    success: boolean;
    data: { format: string; rows: number; columns: string[]; data: Array<Record<string, unknown>> };
  }>("sellers/customers/export");
  return { format: res.data.format, rows: res.data.rows, data: res.data.data };
}

// ── Transformers ───────────────────────────────────────────

function _transformClientStats(rawStats: RawClientStatsItem[]): {
  totalClients: number;
  newThisMonth: number;
  activeClients: number;
  activePercent: number;
  avgBasket: number;
  loyaltyRate: number;
} {
  const totalObj = rawStats.find((s) => s.label.toLowerCase().includes("total"));
  const vipObj = rawStats.find((s) => s.label.toLowerCase().includes("vip"));
  const activeObj = rawStats.find((s) => s.label.toLowerCase().includes("actif"));

  const total = totalObj?.value ?? 0;
  const vip = vipObj?.value ?? 0;
  const active = activeObj?.value ?? 0;

  let newThisMonth = 0;
  if (totalObj?.trend) {
    const match = totalObj.trend.match(/([+-]?\d+\.?\d*)/);
    if (match) {
      const pct = parseFloat(match[1]);
      if (pct > 0 && total > 0) {
        newThisMonth = Math.round((total * pct) / (100 + pct));
      }
    }
  }

  const activePercent = total > 0 ? Math.round((active / total) * 1000) / 10 : 0;
  const loyaltyRate = total > 0 ? Math.round((vip / total) * 1000) / 10 : 0;

  return { totalClients: total, newThisMonth, activeClients: active, activePercent, avgBasket: 0, loyaltyRate };
}

function _buildClientStatusCounts(
  rawStats: RawClientStatsItem[],
  kpis: { totalClients: number; activeClients: number; newThisMonth: number },
): { all: number; active: number; loyal: number; inactive: number; new: number } {
  const vipObj = rawStats.find((s) => s.label.toLowerCase().includes("vip"));
  const dormantObj = rawStats.find((s) => s.label.toLowerCase().includes("dormant"));
  return {
    all: kpis.totalClients,
    active: kpis.activeClients,
    loyal: vipObj?.value ?? 0,
    inactive: dormantObj?.value ?? 0,
    new: kpis.newThisMonth,
  };
}

function _transformClientListItem(raw: RawClientListItem): Record<string, unknown> & { status: string } {
  const name = raw.fullName ?? (`${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim() || "Client");
  const normalizedStatus = CLIENT_STATUS_MAP[raw.status ?? ""] ?? "active";
  const totalSpent = parseAmountFromLabel(raw.totalSpentLabel);
  const ordersCount = raw.ordersCount ?? 0;

  return {
    id: raw.id,
    name,
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    initials: initials(name),
    avatarColor: avatarColor(name),
    city: "",
    orderCount: ordersCount,
    totalSpent,
    avgBasket: ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0,
    lastOrder: raw.lastActiveLabel ?? "Jamais",
    memberSince: "",
    status: normalizedStatus,
    statusLabel: CLIENT_STATUS_LABELS[normalizedStatus] ?? normalizedStatus,
    recentOrders: [],
    favoriteProducts: [],
  };
}

function _transformClientDetailItem(raw: RawClientDetail): Record<string, unknown> {
  const base = _transformClientListItem(raw);

  if (raw.stats) {
    base.totalSpent = raw.stats.totalSpent ?? (base.totalSpent as number);
    base.orderCount = raw.stats.totalOrders ?? (base.orderCount as number);
    base.avgBasket = raw.stats.averageBasket ?? (base.avgBasket as number);
  }

  if (raw.createdAt) {
    try {
      const date = new Date(raw.createdAt);
      let ms = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
      ms = ms.charAt(0).toUpperCase() + ms.slice(1);
      base.memberSince = ms;
    } catch {
      base.memberSince = "";
    }
  }

  if (raw.recentOrders && raw.recentOrders.length > 0) {
    base.recentOrders = raw.recentOrders.map((order) => {
      const orderStatus = normalizeStatus(order.status ?? "pending");
      const orderStatusLabel = STATUS_LABELS[orderStatus] ?? order.status ?? "En attente";
      const statusColorMap: Record<string, string> = {
        delivered: "bg-green-50 text-green-600 border-green-200",
        processing: "bg-sugu-50 text-sugu-600 border-sugu-200",
        pending: "bg-amber-50 text-amber-600 border-amber-200",
        shipped: "bg-blue-50 text-blue-600 border-blue-200",
        cancelled: "bg-red-50 text-red-600 border-red-200",
      };
      return {
        id: order.id,
        reference: `#CMD-${order.id.slice(0, 6).toUpperCase()}`,
        date: order.date ? formatDateFr(order.date) : "",
        total: order.amount ?? 0,
        statusLabel: orderStatusLabel,
        statusColor: statusColorMap[orderStatus] ?? statusColorMap.pending,
      };
    });
  }

  return base;
}
