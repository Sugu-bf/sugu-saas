/**
 * Sales Service
 * Product list for pickers (promotions). The manual sale itself lives in
 * `features/vendor/orders/sale.ts`.
 */
import { productSearchResultSchema, type ProductSearchResult } from "../schema";
import { api } from "@/lib/http/client";
import { deriveEmoji } from "./_shared";

interface RawProductSearchItem {
  id: string; name: string; sku: string; price: number; stock: number; category: string; imageUrl?: string;
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
