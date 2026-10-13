import { z } from "zod";

// ============================================================
// Sugu Box — what Laravel answers a seller about the stock the
// Sugu warehouse holds for them (`sellers/sugubox/board/*`,
// `SellerSuguBoxBoard`). Read-only: the warehouse receives,
// prepares and ships; the seller follows.
//
// Nothing here is computed: quantities, states, counters and
// the quantity before and after a movement are read as answered.
// ============================================================

const int = z.coerce.number().int();
const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

function pageOf<Row extends z.ZodTypeAny>(row: Row) {
  return z.object({ data: z.array(row), current_page: int, per_page: int, total: int });
}

export interface Page<Row> {
  rows: Row[];
  page: number;
  pageSize: number;
  total: number;
}

const toPage = <Row>(page: { data: Row[]; current_page: number; per_page: number; total: number }): Page<Row> => ({
  rows: page.data,
  page: page.current_page,
  pageSize: page.per_page,
  total: page.total,
});

const warehouseSchema = z.object({ id: z.string(), name: z.string(), code: z.string() }).nullable();

// ── Stock ───────────────────────────────────────────────────

export const STOCK_STATES = ["in_stock", "low_stock", "out_of_stock"] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const MOVEMENT_TYPES = ["inbound", "outbound", "adjustment", "transfer"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

const stockItemSchema = z
  .object({
    variant_id: z.string(),
    product_id: z.string(),
    product_name: z.string(),
    title: text,
    sku: text,
    image_url: text,
    is_fbs: z.boolean(),
    total_qty: int,
    reserved_qty: int,
    available_qty: int,
    low_stock_threshold: int.nullable(),
    // Kept as answered: a state the portal does not know is shown as unknown.
    state: z.string(),
    bins: z.array(z.object({ code: z.string(), warehouse: z.string(), qty: int })),
    last_movement: z.object({ type: text, type_label: text, at: z.string() }).nullable(),
  })
  .transform((item) => ({
    id: item.variant_id,
    productId: item.product_id,
    name: item.product_name,
    variant: variantLabel(item.title),
    sku: item.sku,
    imageUrl: item.image_url,
    fulfilledBySugu: item.is_fbs,
    total: item.total_qty,
    reserved: item.reserved_qty,
    available: item.available_qty,
    threshold: item.low_stock_threshold,
    state: item.state,
    bins: item.bins,
    lastMovement: item.last_movement ? { type: item.last_movement.type, label: item.last_movement.type_label, at: item.last_movement.at } : null,
  }));
export type StockItem = z.infer<typeof stockItemSchema>;

/** A product with a single variant names it "Default Title" or "Standard": that is not worth a line. */
function variantLabel(title: string | null): string | null {
  return title && !/^(default title|standard)$/i.test(title) ? title : null;
}

// ── Receptions ──────────────────────────────────────────────

const inboundShape = {
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  warehouse: warehouseSchema,
  expected_at: text,
  received_at: text,
  lines_count: int,
  units_expected: int,
  units_received: int,
  created_at: z.string(),
};

const toReception = (row: z.infer<z.ZodObject<typeof inboundShape>>) => ({
  id: row.id,
  reference: row.reference,
  status: row.status,
  warehouse: row.warehouse,
  expectedAt: row.expected_at,
  receivedAt: row.received_at,
  lines: row.lines_count,
  unitsExpected: row.units_expected,
  unitsReceived: row.units_received,
  createdAt: row.created_at,
});

const receptionSchema = z.object(inboundShape).transform(toReception);
export type Reception = z.infer<typeof receptionSchema>;

const receptionDetailSchema = z
  .object({
    ...inboundShape,
    notes: text,
    store_name: text,
    created_by: text,
    timeline: z.object({ created_at: z.string(), first_received_at: text, completed_at: text, cancelled_at: text }),
    lines: z.array(
      z.object({ id: z.string(), product_name: z.string(), title: text, sku: text, image_url: text, expected_qty: int, received_qty: int, bin_code: text }),
    ),
  })
  .transform((row) => ({
    ...toReception(row),
    notes: row.notes,
    storeName: row.store_name,
    createdBy: row.created_by,
    timeline: { createdAt: row.timeline.created_at, firstReceivedAt: row.timeline.first_received_at, completedAt: row.timeline.completed_at, cancelledAt: row.timeline.cancelled_at },
    items: row.lines.map((line) => ({
      id: line.id,
      name: line.product_name,
      variant: variantLabel(line.title),
      sku: line.sku,
      imageUrl: line.image_url,
      expected: line.expected_qty,
      received: line.received_qty,
      bin: line.bin_code,
    })),
  }));
export type ReceptionDetail = z.infer<typeof receptionDetailSchema>;
export type ReceptionLine = ReceptionDetail["items"][number];

const inboundCountsSchema = z.object({ pending: int, in_progress: int, completed_last_30_days: int });
export type ReceptionCounts = { pending: number; inProgress: number; completedLast30Days: number };

// ── Expeditions ─────────────────────────────────────────────

const outboundShape = {
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  warehouse: warehouseSchema,
  order: z.object({ id: z.string(), number: z.string(), placed_at: text, customer_name: text }).nullable(),
  destination: z.object({ city: z.string(), zone: text }).nullable(),
  lines_count: int,
  units_requested: int,
  units_picked: int,
  thumbnails: z.array(z.string()),
  expected_ship_at: text,
  packed_at: text,
  shipped_at: text,
  created_at: z.string(),
};

const toExpedition = (row: z.infer<z.ZodObject<typeof outboundShape>>) => ({
  id: row.id,
  reference: row.reference,
  status: row.status,
  warehouse: row.warehouse,
  order: row.order ? { id: row.order.id, number: row.order.number, placedAt: row.order.placed_at, customer: row.order.customer_name } : null,
  destination: row.destination,
  lines: row.lines_count,
  unitsRequested: row.units_requested,
  unitsPicked: row.units_picked,
  thumbnails: row.thumbnails,
  packedAt: row.packed_at,
  shippedAt: row.shipped_at,
  createdAt: row.created_at,
});

const expeditionSchema = z.object(outboundShape).transform(toExpedition);
export type Expedition = z.infer<typeof expeditionSchema>;

const expeditionDetailSchema = z
  .object({
    ...outboundShape,
    recipient: z.object({ name: text, city: text, zone: text }).nullable(),
    timeline: z.object({ created_at: z.string(), picking_started_at: text, packed_at: text, shipped_at: text, cancelled_at: text }),
    lines: z.array(
      z.object({ id: z.string(), product_name: z.string(), title: text, sku: text, image_url: text, requested_qty: int, picked_qty: int, bin_code: text }),
    ),
  })
  .transform((row) => ({
    ...toExpedition(row),
    recipient: row.recipient,
    timeline: { createdAt: row.timeline.created_at, pickingStartedAt: row.timeline.picking_started_at, packedAt: row.timeline.packed_at, shippedAt: row.timeline.shipped_at, cancelledAt: row.timeline.cancelled_at },
    items: row.lines.map((line) => ({
      id: line.id,
      name: line.product_name,
      variant: variantLabel(line.title),
      sku: line.sku,
      imageUrl: line.image_url,
      requested: line.requested_qty,
      picked: line.picked_qty,
      bin: line.bin_code,
    })),
  }));
export type ExpeditionDetail = z.infer<typeof expeditionDetailSchema>;
export type ExpeditionLine = ExpeditionDetail["items"][number];

const outboundCountsSchema = z.object({ to_prepare: int, packed: int, shipped: int, cancelled: int });
export type ExpeditionCounts = { toPrepare: number; packed: number; shipped: number; cancelled: number };

// ── Movements ───────────────────────────────────────────────

const movementSchema = z
  .object({
    id: z.string(),
    movement_type: z.string(),
    type_label: z.string(),
    quantity: int,
    before_qty: int.nullable(),
    after_qty: int.nullable(),
    bin_code: text,
    variant: z.object({ id: z.string(), title: text, sku: text, product_name: z.string() }),
    image_url: text,
    performed_by: text,
    reason: text,
    document: z.object({ kind: z.enum(["inbound", "outbound"]), id: z.string(), reference: z.string() }).nullable(),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    type: row.movement_type,
    typeLabel: row.type_label,
    quantity: row.quantity,
    before: row.before_qty,
    after: row.after_qty,
    bin: row.bin_code,
    name: row.variant.product_name,
    variant: variantLabel(row.variant.title),
    sku: row.variant.sku,
    imageUrl: row.image_url,
    by: row.performed_by,
    reason: row.reason,
    document: row.document,
    at: row.created_at,
  }));
export type Movement = z.infer<typeof movementSchema>;

const typeTotal = z.object({ count: int, units: int });
const movementTotalsSchema = z.object({ inbound: typeTotal, outbound: typeTotal, adjustment: typeTotal, transfer: typeTotal });
export type MovementTotals = z.infer<typeof movementTotalsSchema>;

// ── Overview and filters ────────────────────────────────────

const summarySchema = z
  .object({
    stock_units: int,
    stock_variants: int,
    received_today_units: int,
    outbound_to_prepare: int,
    orders_this_month: int,
    alerts: int,
    recent_inbound: z.array(receptionSchema),
    recent_outbound: z.array(expeditionSchema),
    stock_alerts: z.array(stockItemSchema),
    recent_activity: z.array(movementSchema),
  })
  .transform((summary) => ({
    stockUnits: summary.stock_units,
    stockVariants: summary.stock_variants,
    receivedToday: summary.received_today_units,
    toPrepare: summary.outbound_to_prepare,
    ordersThisMonth: summary.orders_this_month,
    alerts: summary.alerts,
    receptions: summary.recent_inbound,
    expeditions: summary.recent_outbound,
    stockAlerts: summary.stock_alerts,
    activity: summary.recent_activity,
  }));
export type Summary = z.infer<typeof summarySchema>;

const filtersSchema = z.object({
  warehouses: z.array(z.object({ id: z.string(), name: z.string(), code: z.string() })),
  users: z.array(z.object({ id: z.string(), name: text })),
  cities: z.array(z.string()),
});
export type BoardFilters = z.infer<typeof filtersSchema>;

// ── Parsers ─────────────────────────────────────────────────

const enveloped = <Schema extends z.ZodTypeAny>(data: Schema) => z.object({ data });

export const parseSummary = (body: unknown): Summary => enveloped(summarySchema).parse(body).data;
export const parseFilters = (body: unknown): BoardFilters => enveloped(filtersSchema).parse(body).data;
export const parseStockPage = (body: unknown): Page<StockItem> => toPage(enveloped(pageOf(stockItemSchema)).parse(body).data);
export const parseReceptionDetail = (body: unknown): ReceptionDetail => enveloped(receptionDetailSchema).parse(body).data;
export const parseExpeditionDetail = (body: unknown): ExpeditionDetail => enveloped(expeditionDetailSchema).parse(body).data;

export function parseReceptionPage(body: unknown): Page<Reception> & { counts: ReceptionCounts } {
  const parsed = z.object({ data: pageOf(receptionSchema), counts: inboundCountsSchema }).parse(body);
  return { ...toPage(parsed.data), counts: { pending: parsed.counts.pending, inProgress: parsed.counts.in_progress, completedLast30Days: parsed.counts.completed_last_30_days } };
}

export function parseExpeditionPage(body: unknown): Page<Expedition> & { counts: ExpeditionCounts } {
  const parsed = z.object({ data: pageOf(expeditionSchema), counts: outboundCountsSchema }).parse(body);
  return { ...toPage(parsed.data), counts: { toPrepare: parsed.counts.to_prepare, packed: parsed.counts.packed, shipped: parsed.counts.shipped, cancelled: parsed.counts.cancelled } };
}

export function parseMovementPage(body: unknown): Page<Movement> & { totals: MovementTotals } {
  const parsed = z.object({ data: pageOf(movementSchema), totals: movementTotalsSchema }).parse(body);
  return { ...toPage(parsed.data), totals: parsed.totals };
}
