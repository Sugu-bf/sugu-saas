/**
 * Sales Service
 * Handles: product/customer search, order creation
 */
import {
  productSearchResultSchema,
  customerSearchResultSchema,
  createOrderResponseSchema,
  createCustomerResponseSchema,
  type ProductSearchResult,
  type CustomerSearchResult,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type CreateCustomerRequest,
  type CreateCustomerResponse,
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
  const res = await api.get<{ success: boolean; data: RawProductSearchItem[] }>("sellers/sales/products");
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
