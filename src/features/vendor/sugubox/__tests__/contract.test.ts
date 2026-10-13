import { describe, expect, it } from "vitest";
import { parseExpeditionDetail, parseExpeditionPage, parseFilters, parseMovementPage, parseReceptionDetail, parseReceptionPage, parseStockPage, parseSummary } from "../contract";

// What Laravel answers on `sellers/sugubox/board/*` (SellerSuguBoxBoard), and
// what the screens read of it. The samples are the shapes its Pest tests pin.

const page = <Row,>(rows: Row[], extra: Record<string, unknown> = {}) => ({ success: true, data: { data: rows, current_page: 2, last_page: 3, per_page: 10, total: 25, from: 11, to: 20 }, ...extra });

const stockRow = {
  variant_id: "v1", product_id: "p1", product_name: "QA Baskets urbaines", title: "Standard", sku: "QA-BOX-BASKETS", image_url: null, is_fbs: true,
  total_qty: 58, reserved_qty: 12, available_qty: 46, low_stock_threshold: 10, state: "in_stock",
  bins: [{ code: "A-01-01", warehouse: "QA Entrepôt Ouaga", qty: 58 }],
  last_movement: { type: "outbound", type_label: "Sortie", at: "2026-10-04T10:00:00+00:00" },
};

const receptionRow = {
  id: "r1", reference: "INB-QA-0002", status: "completed", status_label: "Terminée", warehouse: { id: "w1", name: "QA Entrepôt Ouaga", code: "WH-QA-OUAGA" },
  expected_at: "2026-10-01", received_at: "2026-10-01T10:43:00+00:00", lines_count: 3, units_expected: 160, units_received: 156, created_at: "2026-09-30T09:14:00+00:00",
};

const expeditionRow = {
  id: "o1", reference: "OUT-QA-0003", status: "picking", status_label: "En picking", warehouse: null,
  order: { id: "ord1", number: "SU-2099-000703", placed_at: "2026-10-11T08:00:00+00:00", customer_name: "QA Awa Traoré" },
  destination: { city: "Ouagadougou", zone: "Gounghin" }, lines_count: 2, units_requested: 6, units_picked: 2, thumbnails: [],
  expected_ship_at: null, packed_at: null, shipped_at: null, created_at: "2026-10-11T08:06:00+00:00",
};

const movementRow = {
  id: "m1", movement_type: "transfer", type_label: "Transfert", quantity: -10, before_qty: 38, after_qty: 28, bin_code: "A-01-02",
  variant: { id: "v2", title: "Taille M", sku: "QA-BOX-TSHIRT", product_name: "QA T-shirt essentiel" }, image_url: null,
  performed_by: "Aminata S.", reason: "Transfert entre casiers", document: null, created_at: "2026-10-12T12:00:00+00:00",
};

describe("stock", () => {
  it("reads the three quantities and the state as answered, computing none", () => {
    const { rows, page: current, pageSize, total } = parseStockPage(page([stockRow]));
    expect({ current, pageSize, total }).toEqual({ current: 2, pageSize: 10, total: 25 });
    expect(rows[0]).toMatchObject({ id: "v1", productId: "p1", total: 58, reserved: 12, available: 46, threshold: 10, state: "in_stock", fulfilledBySugu: true });
    expect(rows[0].lastMovement).toEqual({ type: "outbound", label: "Sortie", at: "2026-10-04T10:00:00+00:00" });
  });

  it("does not show the name of a single variant as a variant", () => {
    expect(parseStockPage(page([stockRow])).rows[0].variant).toBeNull();
    expect(parseStockPage(page([{ ...stockRow, title: "Taille 42 · Blanc" }])).rows[0].variant).toBe("Taille 42 · Blanc");
  });

  it("keeps a state it does not know, for the screen to show it as unknown", () => {
    expect(parseStockPage(page([{ ...stockRow, state: "quarantined", low_stock_threshold: null, last_movement: null }])).rows[0]).toMatchObject({ state: "quarantined", threshold: null, lastMovement: null });
  });

  it("refuses an answer that is not a page of stock", () => {
    expect(() => parseStockPage({ success: true, data: [] })).toThrow();
    expect(() => parseStockPage(page([{ ...stockRow, total_qty: "many" }]))).toThrow();
  });
});

describe("receptions", () => {
  it("reads a page with the counters of the server", () => {
    const parsed = parseReceptionPage(page([receptionRow], { counts: { pending: 1, in_progress: 1, completed_last_30_days: 3 } }));
    expect(parsed.counts).toEqual({ pending: 1, inProgress: 1, completedLast30Days: 3 });
    expect(parsed.rows[0]).toMatchObject({ reference: "INB-QA-0002", lines: 3, unitsExpected: 160, unitsReceived: 156, expectedAt: "2026-10-01" });
  });

  it("refuses a page without its counters: a figure is never made up", () => {
    expect(() => parseReceptionPage(page([receptionRow]))).toThrow();
  });

  it("reads the lines and the timeline of one reception", () => {
    const detail = parseReceptionDetail({
      data: {
        ...receptionRow, notes: "  Réception partielle  ", store_name: "QA Boutique A", created_by: "Aminata S.",
        timeline: { created_at: "2026-09-30T09:14:00+00:00", first_received_at: "2026-10-01T10:03:00+00:00", completed_at: "2026-10-01T10:43:00+00:00", cancelled_at: null },
        lines: [{ id: "l1", product_name: "QA Sac en toile", title: "Standard", sku: "QA-BOX-SAC", image_url: null, expected_qty: 20, received_qty: 18, bin_code: "C-03-02" }],
      },
    });
    expect(detail.notes).toBe("Réception partielle");
    expect(detail.timeline.cancelledAt).toBeNull();
    expect(detail.items[0]).toEqual({ id: "l1", name: "QA Sac en toile", variant: null, sku: "QA-BOX-SAC", imageUrl: null, expected: 20, received: 18, bin: "C-03-02" });
  });
});

describe("expeditions", () => {
  it("reads the order an expedition serves, and an expedition that serves none", () => {
    const parsed = parseExpeditionPage(page([expeditionRow, { ...expeditionRow, id: "o2", order: null, destination: null }], { counts: { to_prepare: 2, packed: 1, shipped: 1, cancelled: 1 } }));
    expect(parsed.counts).toEqual({ toPrepare: 2, packed: 1, shipped: 1, cancelled: 1 });
    expect(parsed.rows[0].order).toEqual({ id: "ord1", number: "SU-2099-000703", placedAt: "2026-10-11T08:00:00+00:00", customer: "QA Awa Traoré" });
    expect(parsed.rows[1]).toMatchObject({ order: null, destination: null });
  });

  it("reads the lines, the recipient and the timeline of one expedition", () => {
    const detail = parseExpeditionDetail({
      data: {
        ...expeditionRow, recipient: { name: "QA Awa Traoré", city: "Ouagadougou", zone: null },
        timeline: { created_at: "2026-10-11T08:06:00+00:00", picking_started_at: "2026-10-11T12:06:00+00:00", packed_at: null, shipped_at: null, cancelled_at: null },
        lines: [{ id: "l1", product_name: "QA Sac en toile", title: null, sku: "QA-BOX-SAC", image_url: null, requested_qty: 4, picked_qty: 2, bin_code: null }],
      },
    });
    expect(detail.recipient).toEqual({ name: "QA Awa Traoré", city: "Ouagadougou", zone: null });
    expect(detail.timeline.pickingStartedAt).toBe("2026-10-11T12:06:00+00:00");
    expect(detail.items[0]).toMatchObject({ requested: 4, picked: 2, bin: null });
  });
});

describe("movements", () => {
  it("reads the quantity before and after as the server computed them", () => {
    const parsed = parseMovementPage(page([movementRow], { totals: { inbound: { count: 9, units: 400 }, outbound: { count: 5, units: -20 }, adjustment: { count: 4, units: 0 }, transfer: { count: 2, units: 10 } } }));
    expect(parsed.rows[0]).toMatchObject({ type: "transfer", quantity: -10, before: 38, after: 28, bin: "A-01-02", by: "Aminata S.", reason: "Transfert entre casiers", document: null });
    expect(parsed.totals.outbound).toEqual({ count: 5, units: -20 });
  });

  it("reads a movement outside any bin, and the document of one that has one", () => {
    const row = { ...movementRow, before_qty: null, after_qty: null, bin_code: null, performed_by: null, reason: null, document: { kind: "inbound", id: "r1", reference: "INB-QA-0004" } };
    const parsed = parseMovementPage(page([row], { totals: { inbound: { count: 0, units: 0 }, outbound: { count: 0, units: 0 }, adjustment: { count: 0, units: 0 }, transfer: { count: 0, units: 0 } } }));
    expect(parsed.rows[0]).toMatchObject({ before: null, after: null, bin: null, by: null, reason: null, document: { kind: "inbound", id: "r1", reference: "INB-QA-0004" } });
  });
});

describe("overview and filters", () => {
  it("reads the six figures and the four lists", () => {
    const summary = parseSummary({
      data: { stock_units: 398, stock_variants: 7, received_today_units: 12, outbound_to_prepare: 2, orders_this_month: 5, alerts: 3, recent_inbound: [receptionRow], recent_outbound: [expeditionRow], stock_alerts: [stockRow], recent_activity: [movementRow] },
    });
    expect(summary).toMatchObject({ stockUnits: 398, stockVariants: 7, receivedToday: 12, toPrepare: 2, ordersThisMonth: 5, alerts: 3 });
    expect([summary.receptions.length, summary.expeditions.length, summary.stockAlerts.length, summary.activity.length]).toEqual([1, 1, 1, 1]);
  });

  it("refuses an overview with a figure missing", () => {
    expect(() => parseSummary({ data: { stock_units: 1 } })).toThrow();
    expect(() => parseSummary({ data: [] })).toThrow();
  });

  it("reads what the lists can be narrowed by", () => {
    expect(parseFilters({ data: { warehouses: [{ id: "w1", name: "QA Entrepôt Ouaga", code: "WH-QA-OUAGA" }], users: [{ id: "u1", name: "Moussa K." }], cities: ["Koudougou"] } })).toEqual({
      warehouses: [{ id: "w1", name: "QA Entrepôt Ouaga", code: "WH-QA-OUAGA" }],
      users: [{ id: "u1", name: "Moussa K." }],
      cities: ["Koudougou"],
    });
  });
});
