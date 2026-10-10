/**
 * Sales Service
 * Handles: product/customer search, order creation
 */
import {
  productSearchResultSchema,
  customerSearchResultSchema,
  createOrderResponseSchema,
  createCustomerResponseSchema,
  deliveryPartnerSchema,
  type ProductSearchResult,
  type CustomerSearchResult,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
  type DeliveryPartner,
} from "../schema";
import { api } from "@/lib/http/client";
import { initials, deriveEmoji } from "./_shared";

// ── Raw API Types ──────────────────────────────────────────

interface RawProductSearchItem {
  id: string; name: string; sku: string; price: number; stock: number; category: string; imageUrl?: string;
}

interface RawCustomerSearchItem {
  id: string; email?: string; fullName?: string; status?: string; phone?: string;
  ordersCount?: number; totalSpentLabel?: string; lastActiveLabel?: string; avatar?: string | null;
}

// ── Public API ─────────────────────────────────────────────

/** Search vendor products (server-side) */
export async function searchVendorProducts(query: string): Promise<ProductSearchResult[]> {
  if (!query.trim()) return [];
  const res = await api.get<{ success: boolean; data: RawProductSearchItem[] }>(
    "sellers/sales/products/search", { params: { q: query } },
  );
  return (res.data ?? []).map((item) =>
    productSearchResultSchema.parse({
      id: item.id, name: item.name, sku: item.sku ?? "",
      emoji: deriveEmoji(item.name, item.category ?? ""),
      price: item.price, stock: item.stock, imageUrl: item.imageUrl || undefined,
    }),
  );
}

/** Fetch ALL vendor products in one call for client-side filtering */
export async function getAllVendorProducts(): Promise<ProductSearchResult[]> {
  const res = await api.get<{ success: boolean; data: RawProductSearchItem[] }>("sellers/sales/products", {
    params: { include_out_of_stock: true },
  });
  return (res.data ?? []).map((item) =>
    productSearchResultSchema.parse({
      id: item.id, name: item.name, sku: item.sku ?? "",
      emoji: deriveEmoji(item.name, item.category ?? ""),
      price: item.price, stock: item.stock, imageUrl: item.imageUrl || undefined,
    }),
  );
}

/** Search vendor customers */
export async function searchVendorCustomers(query: string): Promise<CustomerSearchResult[]> {
  if (!query.trim()) return [];
  const res = await api.get<{ success: boolean; data: RawCustomerSearchItem[] }>(
    "sellers/customers", { params: { search: query, limit: 10 } },
  );
  return (res.data ?? []).map((item) => {
    const name = item.fullName ?? "Client";
    return customerSearchResultSchema.parse({
      id: item.id, name, initials: initials(name), phone: item.phone ?? "",
      email: item.email ?? "", orderCount: item.ordersCount ?? 0, status: item.status ?? "active",
    });
  });
}

/** Create a new customer */
export async function createVendorCustomer(data: CreateCustomerRequest): Promise<CreateCustomerResponse> {
  const res = await api.post<{ success: boolean; data: RawCustomerSearchItem }>("sellers/customers", data);
  return createCustomerResponseSchema.parse({
    id: res.data.id,
    fullName: res.data.fullName ?? `${data.firstName} ${data.lastName}`,
    email: res.data.email ?? data.email ?? null,
    phone: res.data.phone ?? data.phone ?? null,
  });
}

/** Create a new order (sale) with idempotency */
export async function createVendorOrder(data: CreateOrderRequest): Promise<CreateOrderResponse> {
  const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await api.post<{ success: boolean; message: string; data: { id: string; success: boolean } }>(
    "sellers/sales", data, { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return createOrderResponseSchema.parse({ id: res.data.id, success: res.data.success ?? true });
}

/** Raw agency row from GET /v1/agencies (DeliveryPartnerLiteResource). */
export interface RawDeliveryPartnerLite {
  id: string;
  name?: string | null;
  code?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
}

/** Map the canonical agency listing to the shape the sale form consumes. */
export function mapDeliveryPartners(rows: RawDeliveryPartnerLite[]): DeliveryPartner[] {
  return rows
    .filter((row) => row.isActive !== false)
    .map((row) =>
      deliveryPartnerSchema.parse({
        id: String(row.id),
        name: row.name ?? row.code ?? "Agence",
        slug: row.code ?? String(row.id),
        type: "agency",
        logo: row.logoUrl || undefined,
        // The listing carries no delivery modes or prices: none are invented here.
        deliveryModes: [],
      }),
    );
}

/**
 * Fetch the agencies a vendor can hand a manual sale to.
 *
 * Canonical source: GET /v1/agencies (active delivery partners). The id is what
 * POST /sellers/sales expects in `delivery.provider`.
 *
 * Errors are NOT swallowed: an unreachable API must not look like
 * "no agency available".
 */
export async function getDeliveryPartners(): Promise<DeliveryPartner[]> {
  const res = await api.get<{
    success: boolean;
    data: { partners: RawDeliveryPartnerLite[] };
  }>("agencies", { params: { is_active: 1, per_page: 100 } });

  return mapDeliveryPartners(res.data?.partners ?? []);
}
