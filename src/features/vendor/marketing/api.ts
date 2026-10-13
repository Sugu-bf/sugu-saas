import { api } from "@/lib/http/client";
import { couponBody, parseMarketingBoard, toCentimes, wholeNumber, type CouponDraft, type PromotionDraft } from "./contract";

// ============================================================
// Marketing — HTTP calls, all through the BFF. Laravel checks that
// a coupon, a promotion or a product belongs to the seller's store
// and answers 404 or 403 for what belongs to another one.
// ============================================================

const BASE = "sellers/marketing";

export const fetchMarketing = async () => parseMarketingBoard(await api.get<unknown>(BASE));

export const createCoupon = (draft: CouponDraft) => api.post<unknown>(`${BASE}/coupons`, couponBody(draft));

/** Switches a coupon on or off; the server answers the state it is in then. */
export const toggleCoupon = (id: string) => api.put<unknown>(`${BASE}/coupons/${encodeURIComponent(id)}/toggle`);

function promotionBody(draft: PromotionDraft): Record<string, string | number> {
  const value = wholeNumber(draft.value) ?? 0;
  return {
    discount_type: draft.type,
    discount_value: draft.type === "percent_off" ? value : toCentimes(value),
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
  };
}

export const createPromotion = (draft: PromotionDraft) => api.post<unknown>(`${BASE}/promotions`, { product_id: draft.productId, ...promotionBody(draft) });

export const updatePromotion = (id: string, draft: PromotionDraft) => api.put<unknown>(`${BASE}/promotions/${encodeURIComponent(id)}`, promotionBody(draft));

export const setPromotionActive = (id: string, active: boolean) => api.put<unknown>(`${BASE}/promotions/${encodeURIComponent(id)}`, { is_active: active });

export const deletePromotion = (id: string) => api.delete<unknown>(`${BASE}/promotions/${encodeURIComponent(id)}`);
