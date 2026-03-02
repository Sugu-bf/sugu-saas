/**
 * Marketing Service
 * Handles: GET/POST/PUT/DELETE /sellers/marketing — coupons, promotions
 */
import { vendorMarketingSchema, type VendorMarketing } from "../schema";
import { api } from "@/lib/http/client";

// ── Raw API Types ──────────────────────────────────────────

interface RawMarketingResponse {
  success: boolean;
  data: {
    kpis: { activePromotions: number; totalPromotions: number; clientSavings: number; codesUsed: number; codesTotal: number };
    coupons: Array<{ id: string; code: string; discount: string; conditions: string; usages: number; usagesMax: number; expiresAt: string; expiresLabel: string; status: string; statusLabel: string }>;
    promotedProducts: Array<{ id: string; promotionId?: string; name: string; image: string; originalPrice: number; promoPrice: number; discountPercent: number; expiresLabel: string; active: boolean }>;
  };
}

/** Request body for creating a new coupon */
export interface CreateCouponRequest {
  code: string;
  name?: string;
  discount_type: "percent_off" | "amount_off" | "free_shipping";
  discount_value: number;
  min_subtotal?: number;
  total_usage_limit?: number;
  per_customer_limit?: number;
  starts_at?: string;
  ends_at?: string;
}

/** Request body for creating a new product promotion */
export interface CreatePromotionRequest {
  product_id: string;
  name?: string;
  discount_type: "percent_off" | "amount_off";
  discount_value: number;
  starts_at?: string;
  ends_at?: string;
}

/** Request body for updating a promotion */
export interface UpdatePromotionRequest {
  discount_type?: "percent_off" | "amount_off";
  discount_value?: number;
  ends_at?: string | null;
  is_active?: boolean;
}

// ── Public API ─────────────────────────────────────────────

/** Fetch vendor marketing data (promo codes, promoted products) */
export async function getVendorMarketing(): Promise<VendorMarketing> {
  const response = await api.get<RawMarketingResponse>("sellers/marketing");
  return vendorMarketingSchema.parse(_transformMarketingResponse(response.data));
}

/** Toggle a coupon's active/inactive status */
export async function toggleCouponStatus(couponId: string): Promise<{ id: string; is_active: boolean }> {
  const res = await api.put<{ success: boolean; message: string; data: { id: string; is_active: boolean } }>(
    `sellers/marketing/coupons/${couponId}/toggle`,
  );
  return res.data;
}

/** Create a new coupon code */
export async function createCoupon(data: CreateCouponRequest): Promise<{ id: string; code: string }> {
  const res = await api.post<{ success: boolean; message: string; data: { id: string; code: string } }>(
    "sellers/marketing/coupons", data,
  );
  return res.data;
}

/** Create a new product promotion */
export async function createPromotion(data: CreatePromotionRequest): Promise<{ id: string; product_id: string }> {
  const res = await api.post<{ success: boolean; message: string; data: { id: string; product_id: string } }>(
    "sellers/marketing/promotions", data,
  );
  return res.data;
}

/** Update a promotion (discount, expiry, toggle active) */
export async function updatePromotion(
  promotionId: string,
  data: UpdatePromotionRequest,
): Promise<{ success: boolean; message: string; id: string }> {
  const res = await api.put<{ success: boolean; message: string; data: { id: string } }>(
    `sellers/marketing/promotions/${promotionId}`,
    data,
  );
  return { success: res.success, message: res.message, id: res.data.id };
}

/** Delete (deactivate) a promotion */
export async function deletePromotion(promotionId: string): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(`sellers/marketing/promotions/${promotionId}`);
}

// ── Transformers ───────────────────────────────────────────

function _transformMarketingResponse(raw: RawMarketingResponse["data"]): unknown {
  return {
    kpis: {
      activePromotions: raw.kpis.activePromotions,
      totalPromotions: raw.kpis.totalPromotions,
      clientSavings: raw.kpis.clientSavings,
      codesUsed: raw.kpis.codesUsed,
      codesTotal: Math.max(raw.kpis.codesTotal, 1),
    },
    promoCodes: (raw.coupons ?? []).map((c) => ({
      id: c.id, code: c.code, discount: c.discount,
      conditions: c.conditions || "Sans conditions",
      usages: c.usages, usagesMax: c.usagesMax,
      expiresAt: c.expiresAt || "", expiresLabel: c.expiresLabel || "∞",
      status: _mapCouponStatus(c.status),
      statusLabel: c.statusLabel || _couponStatusLabel(c.status),
    })),
    promotedProducts: (raw.promotedProducts ?? []).map((p) => ({
      id: p.id, promotionId: p.promotionId, name: p.name, image: p.image || "",
      originalPrice: p.originalPrice, promoPrice: p.promoPrice,
      discountPercent: p.discountPercent, expiresLabel: p.expiresLabel || "∞", active: p.active,
    })),
  };
}

function _mapCouponStatus(status: string): "active" | "expired" | "disabled" {
  if (status === "active") return "active";
  if (status === "expired") return "expired";
  return "disabled";
}

function _couponStatusLabel(status: string): string {
  if (status === "active") return "Actif";
  if (status === "expired") return "Expiré";
  return "Désactivé";
}
