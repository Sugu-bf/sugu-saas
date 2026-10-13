import { z } from "zod";

// ============================================================
// Marketing — what Laravel answers a seller about the coupons and
// the product promotions of the store (`sellers/marketing`).
//
// Units: a percentage is a whole number (20 = 20 %). An amount is
// ANSWERED in francs and SENT in centimes, whole francs only: the
// only conversion is in `toCentimes`, when a form is sent.
//
// States (active, scheduled, expired, disabled, exhausted) are the
// server's: nothing here decides that an offer runs.
// ============================================================

const int = z.coerce.number().int();
const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

export const DISCOUNT_TYPES = ["percent_off", "amount_off"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const TYPE_LABELS: Record<string, string> = {
  percent_off: "Pourcentage",
  amount_off: "Montant fixe",
  free_shipping: "Livraison gratuite",
};

const couponSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: text,
  type: z.string(),
  /** A percentage, or francs. */
  value: int,
  minSubtotal: int.nullable(),
  usageLimit: int.nullable(),
  perCustomerLimit: int.nullable(),
  redemptions: int,
  savings: int,
  startsAt: text,
  endsAt: text,
  status: z.string(),
  isActive: z.boolean(),
  /** False for an offer the checkout does not apply (free shipping). */
  appliedAtCheckout: z.boolean().catch(true),
});

export type Coupon = z.infer<typeof couponSchema>;

const promotionSchema = z.object({
  id: z.string(),
  name: text,
  product: z.object({ id: z.string(), name: z.string(), sku: text, image: text, status: z.string(), price: int }),
  type: z.string(),
  value: int,
  promoPrice: int,
  discountPercent: int,
  startsAt: text,
  endsAt: text,
  status: z.string(),
  isActive: z.boolean(),
  orders: int,
  savings: int,
});

export type Promotion = z.infer<typeof promotionSchema>;

const boardSchema = z.object({
  data: z.object({
    summary: z.object({
      coupons: z.object({ total: int, active: int, scheduled: int, expired: int, disabled: int, exhausted: int, redemptions: int, savings: int }),
      promotions: z.object({ total: int, active: int, scheduled: int, expired: int, disabled: int, orders: int, savings: int }),
      truncated: z.boolean().catch(false),
    }),
    couponList: z.array(couponSchema),
    promotionList: z.array(promotionSchema),
  }),
});

export type MarketingBoard = z.infer<typeof boardSchema>["data"];

export const parseMarketingBoard = (payload: unknown): MarketingBoard => boardSchema.parse(payload).data;

// ── Forms ───────────────────────────────────────────────────

/** Francs typed in a form, to the centimes the server stores. */
export const toCentimes = (francs: number) => Math.round(francs) * 100;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Today as `YYYY-MM-DD`, in the seller's own time zone. */
export function today(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** A whole number typed in a field; null for anything else ("12,5", "abc", ""). */
export function wholeNumber(value: string): number | null {
  const trimmed = value.replace(/\s/g, "");
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

export interface CouponDraft {
  code: string;
  type: DiscountType;
  value: string;
  minSubtotal: string;
  usageLimit: string;
  perCustomerLimit: string;
  startsAt: string;
  endsAt: string;
}

export type CouponErrors = Partial<Record<keyof CouponDraft, string>>;

/**
 * What the form can tell before asking the server, which remains the
 * authority (code already taken, limits of the offer).
 */
export function checkCoupon(draft: CouponDraft, now: Date = new Date()): CouponErrors {
  const errors: CouponErrors = {};
  const code = draft.code.trim();
  if (code.length < 3) errors.code = "Le code compte au moins 3 caractères.";
  else if (!/^[A-Za-z0-9_-]+$/.test(code)) errors.code = "Lettres, chiffres et tirets uniquement, sans espace.";

  const value = wholeNumber(draft.value);
  if (value === null || value <= 0) errors.value = draft.type === "percent_off" ? "Indiquez un pourcentage entier." : "Indiquez un montant en francs entiers.";
  else if (draft.type === "percent_off" && value > 100) errors.value = "Le pourcentage ne dépasse pas 100.";

  for (const field of ["minSubtotal", "usageLimit", "perCustomerLimit"] as const) {
    if (draft[field].trim() === "") continue;
    const number = wholeNumber(draft[field]);
    if (number === null) errors[field] = "Indiquez un nombre entier.";
    else if (field !== "minSubtotal" && number < 1) errors[field] = "Au moins 1, ou laissez vide.";
  }

  Object.assign(errors, checkWindow(draft.startsAt, draft.endsAt, now));
  return errors;
}

/** Body of `POST sellers/marketing/coupons`. Amounts leave in centimes. */
export function couponBody(draft: CouponDraft): Record<string, string | number | null> {
  const value = wholeNumber(draft.value) ?? 0;
  const minimum = wholeNumber(draft.minSubtotal);
  return {
    code: draft.code.trim().toUpperCase(),
    discount_type: draft.type,
    discount_value: draft.type === "percent_off" ? value : toCentimes(value),
    ...(minimum ? { min_subtotal: toCentimes(minimum) } : {}),
    ...(wholeNumber(draft.usageLimit) ? { total_usage_limit: wholeNumber(draft.usageLimit) } : {}),
    // Left empty: no limit per customer. The server reads an absent field as "once".
    per_customer_limit: wholeNumber(draft.perCustomerLimit),
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
  };
}

export interface PromotionDraft {
  productId: string;
  type: DiscountType;
  value: string;
  startsAt: string;
  endsAt: string;
}

export type PromotionErrors = Partial<Record<keyof PromotionDraft, string>>;

/** `price` in francs: the reduction must leave something to pay. */
export function checkPromotion(draft: PromotionDraft, price: number | null, now: Date = new Date()): PromotionErrors {
  const errors: PromotionErrors = {};
  if (!draft.productId) errors.productId = "Choisissez le produit à mettre en promotion.";

  const value = wholeNumber(draft.value);
  if (value === null || value <= 0) errors.value = draft.type === "percent_off" ? "Indiquez un pourcentage entier." : "Indiquez un montant en francs entiers.";
  else if (price !== null && promoPrice(price, draft.type, value) <= 0) errors.value = "La réduction doit rester inférieure au prix du produit.";

  Object.assign(errors, checkWindow(draft.startsAt, draft.endsAt, now));
  return errors;
}

/**
 * The price a promotion leaves, in francs: the arithmetic of the server
 * (`SellerMarketingController::formatPromotion`), for the preview of a form.
 * What is charged is what the server computes.
 */
export function promoPrice(price: number, type: string, value: number): number {
  return type === "percent_off" ? Math.round((price * (100 - value)) / 100) : price - value;
}

function checkWindow(startsAt: string, endsAt: string, now: Date): { startsAt?: string; endsAt?: string } {
  const errors: { startsAt?: string; endsAt?: string } = {};
  if (!DAY.test(startsAt)) errors.startsAt = "Indiquez la date de début.";
  if (!DAY.test(endsAt)) errors.endsAt = "Indiquez la date de fin.";
  else if (DAY.test(startsAt) && endsAt < startsAt) errors.endsAt = "La date de fin précède la date de début.";
  else if (endsAt < today(now)) errors.endsAt = "La date de fin est déjà passée.";
  return errors;
}

/** The day of an instant the server gave, as a date field wants it. */
export function dayOf(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : today(date);
}
