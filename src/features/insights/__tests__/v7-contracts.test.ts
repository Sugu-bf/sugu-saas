import { describe, expect, it } from "vitest";
import { checkNewClient, parseClientPage, parseClientSheet, parseClientSummary } from "@/features/vendor/clients/contract";
import { checkCoupon, checkPromotion, couponBody, parseMarketingBoard, promoPrice, toCentimes, wholeNumber, type CouponDraft } from "@/features/vendor/marketing/contract";
import { parseSalesReport } from "@/features/vendor/statistics/contract";
import { parseActivityReport } from "@/features/agency/statistics/contract";
import { scaleTop, tickLabel, periodLabel } from "../charts";

// What the V7 screens read of an answer of Laravel, and what they send. The
// payloads are the ones the Pest contract tests of ../sugu assert.

const client = {
  id: "c1", fullName: "Awa Traoré", firstName: "Awa", lastName: "Traoré", phone: "+22670123456", email: null, segment: "vip", city: "Ouagadougou",
  ordersCount: 24, totalSpent: 542000, averageBasket: 22583, lastOrderAt: "2026-10-12T10:00:00.000000Z", since: "2024-01-12T00:00:00.000000Z", source: "marketplace",
  // Keys older clients read: ignored here.
  status: "VIP", totalSpentLabel: "542 000 XOF", lastActiveLabel: "il y a 1 jour", avatar: null,
};

describe("clients", () => {
  it("lit la page que le serveur a filtrée, sans rien recalculer", () => {
    const page = parseClientPage({ data: [client], meta: { current_page: 3, last_page: 9, per_page: 25, total: 213, has_more: true } });
    expect(page).toMatchObject({ page: 3, pageSize: 25, total: 213 });
    expect(page.rows[0]).toMatchObject({ name: "Awa Traoré", segment: "vip", orders: 24, spent: 542000, fromMarketplace: true, email: null });
  });

  it("garde un segment inconnu tel quel plutôt que de le ranger ailleurs", () => {
    const page = parseClientPage({ data: [{ ...client, segment: "ambassadeur" }], meta: { current_page: 1, per_page: 25, total: 1 } });
    expect(page.rows[0].segment).toBe("ambassadeur");
  });

  it("lit les compteurs de toute la boutique et les règles du serveur", () => {
    const summary = parseClientSummary({ data: { total: 7, segments: { vip: 2, loyal: 1, new: 1, active: 1, inactive: 1, prospect: 1 }, cities: ["Ouagadougou"], rules: { vipSpent: 100000, vipOrders: 5, loyalOrders: 2, newDays: 30, inactiveDays: 90 } } });
    expect(summary.segments.vip).toBe(2);
    expect(summary.rules.vipSpent).toBe(100000);
  });

  it("lit la fiche et ses commandes", () => {
    const sheet = parseClientSheet({ data: { ...client, stats: { totalOrders: 24, deliveredOrders: 20, totalSpent: 542000, averageBasket: 27100, lastOrderDate: null }, recentOrders: [{ id: "o1", reference: "SU-2099-00123", amount: 42000, status: "delivered", date: "2026-10-12T10:00:00Z" }] } });
    expect(sheet.deliveredOrders).toBe(20);
    expect(sheet.recentOrders[0]).toMatchObject({ reference: "SU-2099-00123", amount: 42000, status: "delivered" });
  });

  it("demande un nom, et un téléphone ou un e-mail valides", () => {
    expect(checkNewClient({ firstName: "", lastName: "", phone: "", email: "" })).toMatchObject({ firstName: expect.any(String), lastName: expect.any(String), phone: expect.any(String) });
    expect(checkNewClient({ firstName: "Awa", lastName: "T", phone: "appelez-moi", email: "" }).phone).toBeDefined();
    expect(checkNewClient({ firstName: "Awa", lastName: "T", phone: "", email: "awa@" }).email).toBeDefined();
    expect(checkNewClient({ firstName: "Awa", lastName: "T", phone: "70 12 34 56", email: "" })).toEqual({});
    expect(checkNewClient({ firstName: "Awa", lastName: "T", phone: "", email: "awa@example.com" })).toEqual({});
  });
});

const draft = (fields: Partial<CouponDraft> = {}): CouponDraft => ({ code: "SUGU10", type: "percent_off", value: "10", minSubtotal: "", usageLimit: "", perCustomerLimit: "1", startsAt: "2026-10-12", endsAt: "2026-12-31", ...fields });
const NOW = new Date("2026-10-12T16:00:00");

describe("marketing", () => {
  it("envoie un montant en centimes et un pourcentage tel quel", () => {
    expect(toCentimes(5000)).toBe(500_000);
    expect(couponBody(draft())).toMatchObject({ code: "SUGU10", discount_type: "percent_off", discount_value: 10, per_customer_limit: 1, starts_at: "2026-10-12", ends_at: "2026-12-31" });
    expect(couponBody(draft({ type: "amount_off", value: "5 000", minSubtotal: "20000", usageLimit: "300" }))).toMatchObject({ discount_value: 500_000, min_subtotal: 2_000_000, total_usage_limit: 300 });
  });

  it("n'envoie ni minimum ni limite laissés vides, et dit au serveur qu'il n'y a pas de limite par client", () => {
    const body = couponBody(draft({ code: " ete2026 ", perCustomerLimit: "" }));
    expect(body.code).toBe("ETE2026");
    expect(body).not.toHaveProperty("min_subtotal");
    expect(body).not.toHaveProperty("total_usage_limit");
    expect(body.per_customer_limit).toBeNull();
  });

  it("refuse avant l'envoi ce que le serveur refuserait", () => {
    expect(checkCoupon(draft(), NOW)).toEqual({});
    expect(checkCoupon(draft({ code: "AB" }), NOW).code).toBeDefined();
    expect(checkCoupon(draft({ code: "PROMO ETE" }), NOW).code).toBeDefined();
    expect(checkCoupon(draft({ value: "0" }), NOW).value).toBeDefined();
    expect(checkCoupon(draft({ value: "101" }), NOW).value).toBeDefined();
    expect(checkCoupon(draft({ value: "12,5" }), NOW).value).toBeDefined();
    expect(checkCoupon(draft({ type: "amount_off", value: "-500" }), NOW).value).toBeDefined();
    expect(checkCoupon(draft({ usageLimit: "0" }), NOW).usageLimit).toBeDefined();
    expect(checkCoupon(draft({ minSubtotal: "abc" }), NOW).minSubtotal).toBeDefined();
    expect(checkCoupon(draft({ endsAt: "2026-10-01" }), NOW).endsAt).toBeDefined();
    expect(checkCoupon(draft({ startsAt: "2026-11-01", endsAt: "2026-10-20" }), NOW).endsAt).toBeDefined();
    expect(checkCoupon(draft({ endsAt: "" }), NOW).endsAt).toBeDefined();
  });

  it("calcule l'aperçu d'une promotion comme le serveur, et refuse un prix nul", () => {
    expect(promoPrice(25000, "percent_off", 20)).toBe(20000);
    expect(promoPrice(24990, "percent_off", 15)).toBe(21242);
    expect(promoPrice(25000, "amount_off", 5000)).toBe(20000);
    const promotion = { productId: "p1", type: "amount_off" as const, value: "25000", startsAt: "2026-10-12", endsAt: "2026-12-31" };
    expect(checkPromotion(promotion, 25000, NOW).value).toBeDefined();
    expect(checkPromotion({ ...promotion, type: "percent_off", value: "100" }, 25000, NOW).value).toBeDefined();
    expect(checkPromotion({ ...promotion, value: "5000" }, 25000, NOW)).toEqual({});
    expect(checkPromotion({ ...promotion, productId: "", value: "10" }, null, NOW).productId).toBeDefined();
  });

  it("ne prend pour un nombre que des chiffres", () => {
    expect(wholeNumber("5 000")).toBe(5000);
    expect(wholeNumber("12.5")).toBeNull();
    expect(wholeNumber("")).toBeNull();
    expect(wholeNumber("1e3")).toBeNull();
  });

  it("lit le tableau, états du serveur compris", () => {
    const board = parseMarketingBoard({
      data: {
        summary: {
          coupons: { total: 2, active: 1, scheduled: 0, expired: 0, disabled: 0, exhausted: 1, redemptions: 245, savings: 3000 },
          promotions: { total: 1, active: 1, scheduled: 0, expired: 0, disabled: 0, orders: 4, savings: 20000 },
          truncated: false,
        },
        couponList: [
          { id: "k1", code: "SUGU10", name: null, type: "percent_off", value: 10, minSubtotal: 10000, usageLimit: 500, perCustomerLimit: 1, redemptions: 245, savings: 3000, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-12-31T23:59:59Z", status: "active", isActive: true, appliedAtCheckout: true },
          { id: "k2", code: "FRAISOFF", name: null, type: "free_shipping", value: 0, minSubtotal: null, usageLimit: null, perCustomerLimit: null, redemptions: 0, savings: 0, startsAt: null, endsAt: null, status: "exhausted", isActive: true, appliedAtCheckout: false },
        ],
        promotionList: [
          { id: "p1", name: "Promo", product: { id: "pr1", name: "Baskets Sport", sku: "SKU-001", image: null, status: "active", price: 25000 }, type: "percent_off", value: 20, promoPrice: 20000, discountPercent: 20, startsAt: "2026-10-01T00:00:00Z", endsAt: null, status: "active", isActive: true, orders: 4, savings: 20000 },
        ],
        // Former keys, still answered: ignored.
        kpis: {}, coupons: [], promotedProducts: [],
      },
    });
    expect(board.couponList[1]).toMatchObject({ status: "exhausted", appliedAtCheckout: false });
    expect(board.promotionList[0].promoPrice).toBe(20000);
  });
});

describe("statistiques", () => {
  const compared = (value: number, previous = 0, change: number | null = null) => ({ value, previous, change });
  const period = { key: "7j", from: "2026-10-06", to: "2026-10-12", days: 7, previousFrom: "2026-09-29", previousTo: "2026-10-05", timezone: "UTC" };

  it("lit le rapport de ventes, sans taux quand le serveur n'en donne pas", () => {
    const report = parseSalesReport({
      data: {
        report: {
          period,
          kpis: { revenue: compared(30000, 20000, 50), orders: compared(1, 0, null), averageBasket: compared(30000), newCustomers: compared(1), returningCustomers: 0, deliveredOrders: 1, inProgressAmount: 5000, canceledOrders: 0 },
          series: [{ date: "2026-10-06", orders: 0, revenue: 0 }],
          topProducts: [{ productId: null, name: "Article retiré", sku: null, image: null, quantity: 1, revenue: 9000 }],
          categories: [{ name: "Chaussures", revenue: 75000, percent: 75 }],
          cities: [],
        },
      },
    });
    expect(report.kpis.revenue.change).toBe(50);
    expect(report.kpis.orders.change).toBeNull();
    expect(report.topProducts[0].productId).toBeNull();
    // Nothing the old screen made up exists in the contract.
    expect(Object.keys(report)).toEqual(["period", "kpis", "series", "topProducts", "categories", "cities"]);
    expect(Object.keys(report.kpis)).not.toContain("conversionRate");
  });

  it("lit le rapport d'activité d'une agence, sans montant", () => {
    const report = parseActivityReport({
      data: {
        totalRevenue: "2.5K FCFA",
        report: {
          period: { ...period, key: "30j" },
          kpis: { created: compared(8, 1, 700), delivered: compared(3), inProgress: 2, pending: 2, failed: compared(1), successRate: 75, averageMinutes: null, timedDeliveries: 0 },
          series: [{ date: "2026-10-12", created: 4, delivered: 0, failed: 0 }],
          statuses: [{ key: "delivered", count: 3, percent: 37.5 }],
          couriers: [{ id: "c1", name: "Moussa Kaboré", deliveries: 3, failed: 1, assigned: 4, successRate: 75 }],
          failureReasons: [],
        },
      },
    });
    expect(report.kpis.averageMinutes).toBeNull();
    expect(report.couriers[0].deliveries).toBe(3);
    expect(JSON.stringify(report)).not.toContain("FCFA");
  });

  it("gradue une échelle ronde et nomme une période", () => {
    expect(scaleTop(0)).toBe(4);
    expect(scaleTop(3)).toBe(4);
    expect(scaleTop(47)).toBe(50);
    expect(scaleTop(240_000)).toBe(250_000);
    expect(tickLabel(250_000)).toBe("250 k");
    expect(tickLabel(1_500_000)).toBe("1,5 M");
    expect(periodLabel("2026-10-06", "2026-10-12")).toBe("6 oct. – 12 oct. 2026");
  });
});
