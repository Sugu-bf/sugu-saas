import { describe, expect, it } from "vitest";
import { formatMoneyFromFrancs } from "@/design-system";
import {
  deriveActionsFromRules,
  parseOrderCounts,
  parseOrderDetail,
  parseOrderListItem,
  parseOrderListPage,
  parsePickupCodes,
} from "../contract";
import { detailPayload, listRow } from "./fixtures";

describe("list row", () => {
  it("keeps the backend reference and never builds one from the id", () => {
    expect(parseOrderListItem(listRow()).reference).toBe("SU-2026-000042");
    // Older backend: the number travels in displayId.
    expect(parseOrderListItem(listRow({ reference: undefined, displayId: "SU-2026-000007" })).reference).toBe(
      "SU-2026-000007",
    );
    expect(parseOrderListItem(listRow({ reference: undefined, displayId: undefined })).reference).toBeNull();
  });

  it("reads the amount as francs, without conversion", () => {
    const row = parseOrderListItem(listRow({ totalAmount: 12500 }));
    expect(row.totalFrancs).toBe(12500);
    expect(formatMoneyFromFrancs(row.totalFrancs)).toMatch(/^12\s500\sFCFA$/);
  });

  it.each([
    ["canceled"],
    ["awaiting_payment"],
    ["returned"],
    ["failed"],
    ["packed"],
    ["a_status_added_later"],
  ])("keeps the status code %s as sent, never folded into pending", (code) => {
    expect(parseOrderListItem(listRow({ statusCode: code })).status).toBe(code);
  });

  it("separates the three payment situations", () => {
    const mixte = parseOrderListItem(
      listRow({ is_cod: true, cod_flow_type: "mixte", cod_current_step: "awaiting_delivery_payment", paymentStatusCode: "cod_pending" }),
    );
    expect(mixte).toMatchObject({ codFlow: "mixte", codStep: "awaiting_delivery_payment", paymentStatus: "cod_pending" });

    const cash = parseOrderListItem(listRow({ is_cod: true, cod_flow_type: "legacy", paymentStatusCode: "cod_pending" }));
    expect(cash.codFlow).toBe("legacy");

    const prepaid = parseOrderListItem(listRow({ is_cod: false, cod_flow_type: "mixte", paymentStatusCode: "paid" }));
    expect(prepaid.codFlow).toBeNull();
  });

  it("recognises a manual sale from the flag or from the channel", () => {
    expect(parseOrderListItem(listRow({ isDirect: true })).isDirect).toBe(true);
    expect(parseOrderListItem(listRow({ isDirect: undefined, channel: ["direct", "manual"] })).isDirect).toBe(true);
    expect(parseOrderListItem(listRow({ isDirect: undefined, channel: { device: "web" } })).isDirect).toBe(false);
  });

  it("summarises the items with their quantities", () => {
    const row = parseOrderListItem(
      listRow({
        items: [
          { name: "Pagne tissé", quantity: 2 },
          { name: "Savon", quantity: 1 },
          { name: "Beurre de karité", quantity: 3 },
        ],
      }),
    );
    expect(row.itemsSummary).toBe("2 × Pagne tissé + 2 autres");
  });

  it("rejects a row without id or amount instead of inventing one", () => {
    expect(() => parseOrderListItem(listRow({ id: "" }))).toThrow();
    expect(() => parseOrderListItem(listRow({ totalAmount: undefined }))).toThrow();
  });
});

describe("list page", () => {
  it("uses the server total, whatever the number of rows loaded", () => {
    const page = parseOrderListPage({ data: [listRow()], total: 137 }, { page: 3, pageSize: 25 });
    expect(page).toMatchObject({ total: 137, page: 3, pageSize: 25 });
    expect(page.rows).toHaveLength(1);
  });
});

describe("counters", () => {
  it("takes every status from byStatus", () => {
    const counts = parseOrderCounts({
      total: 12,
      byStatus: { pending: 3, confirmed: 1, processing: 2, shipped: 1, delivered: 2, canceled: 2, returned: 1 },
    });
    expect(counts.byStatus.canceled).toBe(2);
    expect(counts.byStatus.returned).toBe(1);
  });

  it("does not compute canceled by subtraction when the backend does not count it", () => {
    // total 12, known 3 + 1 + 4 + 2 = 10: the old code answered "2 canceled",
    // although the two missing orders could be returned or failed.
    const counts = parseOrderCounts({ total: 12, pending: 3, confirmed: 1, shipping: 4, delivered: 2 });
    expect(counts.byStatus.canceled).toBeUndefined();
    // "shipping" merges shipped and processing: neither gets a number.
    expect(counts.byStatus.shipped).toBeUndefined();
    expect(counts.byStatus.processing).toBeUndefined();
    expect(counts.byStatus.pending).toBe(3);
  });
});

describe("detail", () => {
  it("reads every amount as francs, COD Mixte fees included", () => {
    const order = parseOrderDetail(
      detailPayload({
        pricing: { subtotal: 10000, deliveryFees: 1500, discount: 500, tax: 0, total: 10000, orderTotal: 11000, paymentStatus: "partial" },
        cod_mixte: {
          isCodMixte: true,
          currentStep: "awaiting_product_payment",
          deliveryFeePaid: true,
          productFeePaid: false,
          deliveryFeeAmount: 1500,
          productFeeAmount: 9500,
        },
      }),
    );
    expect(order.amounts).toMatchObject({
      itemsFrancs: 10000,
      deliveryFrancs: 1500,
      discountFrancs: 500,
      orderTotalFrancs: 11000,
      vendorTotalFrancs: 10000,
    });
    expect(order.codMixte).toMatchObject({ deliveryFeeFrancs: 1500, productFeeFrancs: 9500 });
    expect(formatMoneyFromFrancs(order.codMixte?.productFeeFrancs)).toMatch(/^9\s500\sFCFA$/);
  });

  it("leaves what the backend does not send empty: no carrier, no delay, no country", () => {
    const order = parseOrderDetail(detailPayload({ delivery: undefined, parties: { client: { name: "Awa Traoré" } } }));
    expect(order.delivery).toEqual({
      method: null,
      address: null,
      partnerName: null,
      shipmentStatus: null,
      courier: null,
      note: null,
    });
    expect(order.customer).toEqual({ name: "Awa Traoré", phone: null, email: null });
    expect(order.amounts.orderTotalFrancs).toBe(11000);
    expect(JSON.stringify(order)).not.toMatch(/Sugu Express|Mobile Money|Burkina Faso|2-4/);
  });

  it("prints a legacy free-text address as received, without splitting it", () => {
    const order = parseOrderDetail(
      detailPayload({
        delivery: undefined,
        parties: { client: { name: "Awa", location: "Ouagadougou, Secteur 15" } },
      }),
    );
    expect(order.delivery.address?.lines).toEqual(["Ouagadougou, Secteur 15"]);

    const unknown = parseOrderDetail(
      detailPayload({ delivery: undefined, parties: { client: { name: "Awa", location: "Adresse inconnue" } } }),
    );
    expect(unknown.delivery.address).toBeNull();
  });

  it("builds the address lines from stored fields only", () => {
    const order = parseOrderDetail(detailPayload());
    expect(order.delivery.address).toEqual({
      fullName: "Awa Traoré",
      phone: "+22670112233",
      lines: ["Secteur 15, rue 15.42", "Patte d'Oie, Ouagadougou"],
    });
  });

  it("does not show « Standard » as a variant", () => {
    const order = parseOrderDetail(detailPayload());
    expect(order.items[0].variant).toBeNull();
    expect(order.items[1].variant).toBe("Rouge, L");
  });

  it("uses the server's action flags when present", () => {
    const order = parseOrderDetail(
      detailPayload({
        statusCode: "shipped",
        actions: { confirm: false, cancel: true, requestDelivery: false, markShipped: false, markDelivered: false },
      }),
    );
    expect(order.actionsSource).toBe("server");
    expect(order.actions.markDelivered).toBe(false);
  });
});

describe("display rules without server flags", () => {
  const base = { isDirect: false, hasShipment: true, codMixte: null };

  it.each([
    ["pending", { confirm: true, cancel: true, requestDelivery: false, markShipped: false, markDelivered: false }],
    ["confirmed", { confirm: false, cancel: true, requestDelivery: true, markShipped: true, markDelivered: false }],
    ["packed", { confirm: false, cancel: true, requestDelivery: false, markShipped: true, markDelivered: false }],
    ["delivered", { confirm: false, cancel: false, requestDelivery: false, markShipped: false, markDelivered: false }],
    ["canceled", { confirm: false, cancel: false, requestDelivery: false, markShipped: false, markDelivered: false }],
    ["returned", { confirm: false, cancel: false, requestDelivery: false, markShipped: false, markDelivered: false }],
  ])("%s", (status, expected) => {
    expect(deriveActionsFromRules({ ...base, status })).toEqual(expected);
  });

  it("never offers delivery on a shipped marketplace order: the customer's code closes it", () => {
    expect(deriveActionsFromRules({ ...base, status: "shipped" }).markDelivered).toBe(false);
  });

  it("offers delivery on a shipped manual sale", () => {
    expect(deriveActionsFromRules({ ...base, status: "shipped", isDirect: true }).markDelivered).toBe(true);
  });

  it.each([
    [false, false],
    [true, false],
    [false, true],
  ])("never offers delivery on COD Mixte with unpaid fees (delivery %s, product %s)", (deliveryFeePaid, productFeePaid) => {
    const actions = deriveActionsFromRules({
      status: "shipped",
      isDirect: true,
      hasShipment: true,
      codMixte: { deliveryFeePaid, productFeePaid },
    });
    expect(actions.markDelivered).toBe(false);
  });

  it("is what the detail falls back to on a backend without flags", () => {
    const order = parseOrderDetail(
      detailPayload({
        actions: undefined,
        statusCode: "shipped",
        cod_mixte: { isCodMixte: true, currentStep: "awaiting_product_payment", deliveryFeePaid: true, productFeePaid: false },
      }),
    );
    expect(order.actionsSource).toBe("rules");
    expect(order.actions.markDelivered).toBe(false);
  });
});

describe("pickup codes", () => {
  it("parses the codes of the seller's stores", () => {
    const codes = parsePickupCodes({
      codes: [{ store_id: "s1", pickup_code: "4821", status: "collected", vendor_handoff_at: null }],
    });
    expect(codes).toEqual([{ store_id: "s1", pickup_code: "4821", status: "collected", vendor_handoff_at: null }]);
  });
});
