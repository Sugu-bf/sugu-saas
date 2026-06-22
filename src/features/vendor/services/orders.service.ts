/**
 * Orders Service
 * Handles: GET/POST /sellers/orders, order mutations, delivery slips, invoices
 */
import {
  vendorOrdersResponseSchema,
  orderDetailSchema,
  pickupCodesResponseSchema,
  type VendorOrdersResponse,
  type OrderDetail,
  type PickupCodesResponse,
} from "../schema";
import { api } from "@/lib/http/client";
import { mapPaymentStatusCode } from "@/lib/utils/payment-status";
import {
  normalizeStatus,
  STATUS_LABELS,
  avatarColor,
  initials,
  formatDateFr,
} from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawOrderItem {
  id?: string;
  displayId?: string;
  date?: string;
  relativeDate?: string;
  time?: string;
  customer?: { name?: string; email?: string; avatar?: string | null };
  channel?: unknown;
  isSugu?: boolean;
  statusCode?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  isPaid?: boolean;
  shippingStatus?: string;
  itemCount?: number;
  totalAmount?: number;
  currency?: string;
  items?: Array<{ name?: string; quantity?: number }>;
  // Trou n°4 — COD fields (snake_case, except paymentStatusCode camelCase per B1 parity).
  paymentStatusCode?: string | null;
  is_cod?: boolean;
  cod_flow_type?: string | null;
  cod_current_step?: string | null;
  delivery_fee_paid?: boolean;
  product_fee_paid?: boolean;
  vendor_confirmed_at?: string | null;
}

interface RawOrderStats {
  success: boolean;
  data: {
    total?: number;
    pending?: number;
    confirmed?: number;
    shipping?: number;
    delivered?: number;
  };
}

interface RawOrderDetail {
  success: boolean;
  data: {
    order: {
      id: string;
      reference?: string;
      createdAt?: string;
      channel?: unknown;
      expiresAt?: string;
      statusCode?: string;
      status?: string;
      step?: number;
      deliveryCode?: string | null;
      parties?: {
        client?: {
          id?: string;
          name?: string;
          role?: string;
          location?: string;
          phone?: string | null;
          email?: string | null;
          orderCount?: number;
        };
        seller?: { id?: string; name?: string; role?: string; location?: string };
        driver?: {
          id?: string;
          name?: string;
          role?: string;
          location?: string;
          phone?: string | null;
        } | null;
      };
      shipmentPartner?: { name?: string; type?: string } | null;
      items?: Array<{
        id?: string;
        name?: string;
        variant?: string;
        quantity?: number;
        price?: number;
        total?: number;
        status?: string;
        image?: string | null;
        storeId?: string | null;
      }>;
      pricing?: {
        subtotal?: number;
        deliveryFees?: number;
        discount?: number;
        tax?: number;
        total?: number;
        currency?: string;
        netRevenue?: number;
        commission?: number;
        paymentStatus?: string;
        paymentMethod?: string;
      };
      timeline?: Array<{
        id?: string;
        title?: string;
        description?: string;
        timestamp?: string;
        status?: string;
      }>;
      // D3b — single canonical timeline projection (vendor role, per-store scoped).
      canonical_timeline?: Array<{
        key: string;
        label: string;
        status: "done" | "current" | "upcoming";
        timestamp: string | null;
        store_id?: string | null;
        actor_type?: string | null;
        description?: string | null;
      }>;
      cod_mixte?: {
        isCodMixte?: boolean;
        currentStep?: string;
        deliveryFeePaid?: boolean;
        productFeePaid?: boolean;
        deliveryFeeAmount?: number;
        productFeeAmount?: number;
        deliveryFeePaidAt?: string | null;
        productFeePaidAt?: string | null;
        vendorConfirmedAt?: string | null;
      } | null;
    };
  };
}

// ── Public API ─────────────────────────────────────────────

/**
 * Fetch the vendor orders (paginated, filterable).
 * Calls GET /v1/sellers/orders + GET /v1/sellers/orders/stats in parallel.
 */
export async function getVendorOrders(
  status?: string,
  page?: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _search?: string,
): Promise<VendorOrdersResponse> {
  const params: Record<string, string | number | boolean | undefined> = {
    page: page ?? 1,
    limit: 25,
  };
  if (status && status !== "all") {
    const statusMap: Record<string, string> = {
      pending: "pending",
      confirmed: "confirmed",
      processing: "confirmed",
      packed: "packed",
      shipped: "shipped",
      delivered: "delivered",
      cancelled: "canceled",
    };
    params.status = statusMap[status] ?? status;
  }

  const [ordersRes, statsRes] = await Promise.all([
    api.get<{ success: boolean; data: { data: RawOrderItem[]; total: number } }>(
      "sellers/orders",
      { params },
    ),
    api.get<RawOrderStats>("sellers/orders/stats"),
  ]);

  const rawOrders = ordersRes.data?.data ?? [];
  const rawTotal = ordersRes.data?.total ?? 0;
  const orders = rawOrders.map((raw) => _transformOrderListItem(raw));

  const statsData = statsRes.data ?? {};
  const statusCounts = {
    all: statsData.total ?? 0,
    pending: statsData.pending ?? 0,
    processing: statsData.confirmed ?? 0,
    shipped: statsData.shipping ?? 0,
    delivered: statsData.delivered ?? 0,
    cancelled: Math.max(
      0,
      (statsData.total ?? 0) -
        (statsData.pending ?? 0) -
        (statsData.confirmed ?? 0) -
        (statsData.shipping ?? 0) -
        (statsData.delivered ?? 0),
    ),
  };

  const perPage = 25;
  const totalPages = Math.max(1, Math.ceil(rawTotal / perPage));

  return vendorOrdersResponseSchema.parse({
    orders,
    statusCounts,
    pagination: {
      currentPage: page ?? 1,
      totalPages,
      perPage,
      totalItems: rawTotal,
    },
  });
}

/** Fetch a single order detail. */
export async function getVendorOrderDetail(id: string): Promise<OrderDetail> {
  const res = await api.get<RawOrderDetail>(`sellers/orders/${id}`);
  return orderDetailSchema.parse(_transformOrderDetailResponse(res.data.order));
}

// ── Order Mutations ────────────────────────────────────────

export async function confirmOrder(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/orders/${id}/confirm`);
}

export async function cancelOrder(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/orders/${id}/cancel`);
}

export async function requestOrderDelivery(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/orders/${id}/request-delivery`);
}

export async function markOrderShipped(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/orders/${id}/mark-shipped`);
}

export async function markOrderDelivered(id: string): Promise<{ success: boolean; message: string }> {
  return api.post<{ success: boolean; message: string }>(`sellers/orders/${id}/mark-delivered`);
}

/** Download the delivery slip PDF for an order (opens in new tab). */
export async function downloadDeliverySlip(orderId: string): Promise<void> {
  const { env } = await import("@/lib/env");
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
    ? env.NEXT_PUBLIC_API_BASE_URL
    : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
  const url = new URL(`sellers/orders/${orderId}/delivery-slip`, baseUrl).toString();

  const tokenMatch = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
  const token = tokenMatch ? decodeURIComponent(tokenMatch[1]) : null;

  const headers: Record<string, string> = { Accept: "application/pdf" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  const printWindow = window.open(blobUrl, "_blank");
  if (printWindow) {
    printWindow.addEventListener("load", () => { printWindow.print(); });
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

/** Get or create an invoice for an order, returns the shareable public URL. */
export async function getOrderInvoiceLink(
  orderId: string,
): Promise<{ url: string; invoiceNumber: string }> {
  const { env } = await import("@/lib/env");

  const res = await api.get<{
    success: boolean;
    url: string;
    public_url: string;
    access_token: string;
    invoice_id: string;
    invoice_number: string;
  }>(`sellers/orders/${orderId}/invoice`);

  const marketplaceBase = env.NEXT_PUBLIC_MARKETPLACE_URL.replace(/\/+$/, "");
  const invoiceUrl = res.access_token
    ? `${marketplaceBase}/invoices/${res.access_token}`
    : res.public_url ?? res.url;

  return {
    url: invoiceUrl,
    invoiceNumber: res.invoice_number ?? "—",
  };
}

/** Fetch pickup codes for an order (available after courier accepts). */
export async function getOrderPickupCodes(orderId: string): Promise<PickupCodesResponse> {
  const res = await api.get<{ success: boolean; data: { codes: unknown[] } }>(
    `sellers/orders/${orderId}/pickup-code`,
  );
  return pickupCodesResponseSchema.parse(res.data);
}

/** Vendor confirms handoff of a specific item to the courier. Idempotent. */
export async function confirmItemHandoff(
  orderId: string,
  itemId: string,
): Promise<{ success: boolean; vendor_handoff_at?: string }> {
  const res = await api.post<{ success: boolean; data?: { vendor_handoff_at?: string } }>(
    `sellers/orders/${orderId}/items/${itemId}/confirm-handoff`,
  );
  return { success: res.success, vendor_handoff_at: res.data?.vendor_handoff_at };
}

// ── Transformers ───────────────────────────────────────────

function _transformOrderListItem(raw: RawOrderItem): Record<string, unknown> {
  const customerName = raw.customer?.name ?? "Client";
  const ns = normalizeStatus(raw.statusCode ?? raw.status ?? "pending");
  const statusLabel = STATUS_LABELS[ns] ?? STATUS_LABELS[raw.statusCode ?? ""] ?? "En attente";
  const items = raw.items ?? [];
  const firstItemName = items[0]?.name ?? "Produit";

  return {
    id: raw.id ?? "",
    reference: raw.displayId ?? `CMD-${(raw.id ?? "").slice(0, 8)}`,
    client: {
      name: customerName,
      phone: raw.customer?.email ?? "",
      email: raw.customer?.email ?? "",
      initials: initials(customerName),
      avatarColor: avatarColor(customerName),
    },
    products: items.map((item, idx) => ({
      id: `item-${idx}`,
      name: item.name ?? "Produit",
      quantity: item.quantity ?? 1,
      price: 0,
      image: null,
    })),
    productSummary: items.length > 1 ? `${firstItemName} +${items.length - 1}` : firstItemName,
    total: raw.totalAmount ?? 0,
    status: ns,
    statusLabel,
    agency: raw.isSugu ? "Sugu" : "Direct",
    date: raw.date ? formatDateFr(raw.date) : "",
    deliveryAddress: { street: "", city: "", country: "" },
    timeline: [],
    // Trou n°4 — COD fields (normalized to camelCase; flow type clamped to the enum).
    isCod: Boolean(raw.is_cod),
    codFlowType:
      raw.cod_flow_type === "mixte" || raw.cod_flow_type === "legacy"
        ? raw.cod_flow_type
        : "none",
    codCurrentStep: raw.cod_current_step ?? null,
    deliveryFeePaid: Boolean(raw.delivery_fee_paid),
    productFeePaid: Boolean(raw.product_fee_paid),
    paymentStatusCode: raw.paymentStatusCode ?? null,
    vendorConfirmedAt: raw.vendor_confirmed_at ?? null,
  };
}

function _transformOrderDetailResponse(
  raw: RawOrderDetail["data"]["order"],
): Record<string, unknown> {
  const clientName = raw.parties?.client?.name ?? "Client";
  const ns = normalizeStatus(raw.statusCode ?? raw.status ?? "pending");
  const statusLabel = STATUS_LABELS[ns] ?? "En attente";

  const items = (raw.items ?? []).map((item, idx) => ({
    id: item.id ?? `item-${idx}`,
    name: item.name ?? "Produit",
    image: item.image ?? null,
    quantity: item.quantity ?? 1,
    unitPrice: item.price ?? 0,
    lineTotal: item.total ?? (item.price ?? 0) * (item.quantity ?? 1),
    ready: item.status === "ready" || item.status === "in_stock",
    storeId: item.storeId ?? null,
  }));

  const subtotal = raw.pricing?.subtotal ?? 0;
  const total = raw.pricing?.total ?? 0;
  const discount = raw.pricing?.discount ?? 0;
  const discountPercent = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
  // B1 closure: pricing.paymentStatus carries the backend status CODE
  // (cod_pending / partial / paid / …), not a raw label — map it through the
  // shared helper so COD orders read "Paiement à la livraison", not the
  // misleading generic "En attente de paiement".
  const paymentStatusLabel =
    mapPaymentStatusCode(raw.pricing?.paymentStatus).label || "En attente de paiement";

  const clientLocation = raw.parties?.client?.location ?? "";
  const locationParts = clientLocation.split(",").map((s) => s.trim());

  // D3b — the vendor view consumes the canonical projection. raw.timeline (the
  // legacy field) is NO LONGER read here. The legacy-shaped `timeline` below is
  // still produced for the orders LIST mini-view (out of scope this commit) but
  // is now DERIVED from canonical_timeline — same single source.
  const canonicalTimeline = raw.canonical_timeline ?? [];
  const canonicalToLegacyStatus = {
    done: "completed",
    current: "current",
    upcoming: "pending",
  } as const;
  const timeline = canonicalTimeline.map((step, idx) => ({
    id: `${step.key}-${step.store_id ?? ""}-${idx}`,
    label: step.label,
    date: step.timestamp ? formatDateFr(step.timestamp) : "En attente",
    description: step.description ?? undefined,
    status: canonicalToLegacyStatus[step.status],
  }));

  const finalTimeline =
    timeline.length > 0
      ? timeline
      : [
          {
            id: "tl-1",
            label: "Commande reçue",
            date: raw.createdAt ? formatDateFr(raw.createdAt) : "",
            description: `Commande ${raw.reference ?? raw.id} créée`,
            status: "completed" as const,
          },
          {
            id: "tl-2",
            label: statusLabel,
            date: "En cours",
            status: "current" as const,
          },
        ];

  const driverStatus = raw.parties?.driver
    ? `${raw.parties.driver.name} — ${raw.parties.driver.location ?? "En route"}`
    : "En attente d'assignation";

  // ── INFO-02 FIX: Map client order count from backend ──
  const clientOrderCount = raw.parties?.client?.orderCount ?? 0;
  const isLoyal = clientOrderCount >= 5;

  // ── INFO-03 FIX: Map delivery provider from shipment/channel data ──
  const channel = raw.channel;
  const isDirectOrder = Array.isArray(channel) && channel.includes("direct");
  const deliveryProvider = raw.shipmentPartner?.name
    ?? (isDirectOrder ? "Vente directe" : "Sugu Express");
  const deliveryType = raw.shipmentPartner?.type
    ?? (isDirectOrder ? "Retrait en boutique" : "Livraison standard");
  const estimatedTime = isDirectOrder ? "Immédiat" : "Estimée 2-4h";

  return {
    id: raw.id,
    reference: raw.reference ?? `CMD-${raw.id.slice(0, 8)}`,
    status: ns,
    statusLabel,
    client: {
      name: clientName,
      initials: initials(clientName),
      avatarColor: avatarColor(clientName),
      phone: raw.parties?.client?.phone ?? "",
      email: raw.parties?.client?.email ?? "",
      orderCount: clientOrderCount,
      isLoyal,
    },
    products: items,
    readyCount: items.filter((i) => i.ready).length,
    totalCount: items.length,
    financial: {
      subtotal,
      deliveryCost: raw.pricing?.deliveryFees ?? 0,
      deliveryLabel: deliveryType,
      discountPercent,
      discountAmount: discount,
      total,
      paymentMethod: raw.pricing?.paymentMethod ?? "Mobile Money",
      paymentStatus: paymentStatusLabel,
    },
    delivery: {
      provider: deliveryProvider,
      type: deliveryType,
      estimatedTime,
      driverStatus,
      address: {
        line1: locationParts[0] ?? "",
        line2: locationParts[1] ?? "",
        city: locationParts[2] ?? locationParts[1] ?? "",
        country: locationParts[3] ?? "Burkina Faso",
      },
    },
    timeline: finalTimeline,
    canonicalTimeline,
    codMixte: raw.cod_mixte ? {
      isCodMixte: Boolean(raw.cod_mixte.isCodMixte),
      currentStep: raw.cod_mixte.currentStep ?? "awaiting_delivery_payment",
      deliveryFeePaid: Boolean(raw.cod_mixte.deliveryFeePaid),
      productFeePaid: Boolean(raw.cod_mixte.productFeePaid),
      deliveryFeeAmount: raw.cod_mixte.deliveryFeeAmount ?? 0,
      productFeeAmount: raw.cod_mixte.productFeeAmount ?? 0,
      deliveryFeePaidAt: raw.cod_mixte.deliveryFeePaidAt ?? null,
      productFeePaidAt: raw.cod_mixte.productFeePaidAt ?? null,
      vendorConfirmedAt: raw.cod_mixte.vendorConfirmedAt ?? null,
    } : undefined,
  };
}
