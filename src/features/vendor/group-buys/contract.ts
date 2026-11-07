import { z } from "zod";

// ============================================================
// Achat groupé — what Laravel answers a seller about group buying
// (`sellers/group-buying/settings`, `sellers/group-buys`,
// `SellerGroupBuyController`).
//
// Units: every amount is in CENTIMES (100 = 1 FCFA). Dates are ISO
// 8601; a countdown is measured against `server_now`, never against
// the clock of the device (`clockOffset`).
//
// Nothing here decides a price or a state: the tiers reached, the
// price of the group and its status are read as answered.
// ============================================================

const int = z.coerce.number().int();
const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

// ── The option of each store ────────────────────────────────

const storeOptionSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: z.string(),
    enabled: z.boolean(),
    shared_moq: z.boolean().catch(false),
    products_with_tiers: int.catch(0),
  })
  .transform((store) => ({
    id: store.id,
    name: store.name,
    enabled: store.enabled,
    sharedMoq: store.shared_moq,
    /** Products of the store that have a price per quantity: only they can be bought as a group. */
    productsWithTiers: store.products_with_tiers,
  }));

export type StoreGroupBuying = z.infer<typeof storeOptionSchema>;

export interface GroupBuyingSettings {
  stores: StoreGroupBuying[];
}

const settingsSchema = z.object({ data: z.object({ stores: z.array(storeOptionSchema) }) });

export const parseGroupBuyingSettings = (payload: unknown): GroupBuyingSettings => settingsSchema.parse(payload).data;

/** What `PUT sellers/group-buying/settings` is sent. */
export interface StoreOptionChange {
  storeId: string;
  enabled: boolean;
  sharedMoq: boolean;
}

export const settingsBody = (change: StoreOptionChange) => ({ store_id: change.storeId, enabled: change.enabled, shared_moq: change.sharedMoq });

const updateSchema = z.object({
  message: text,
  data: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    enabled: z.boolean(),
    shared_moq: z.boolean().catch(false),
  }),
});

export interface StoreOptionSaved {
  /** The server's own sentence, said to the seller as it is. */
  message: string | null;
  store: { id: string; enabled: boolean; sharedMoq: boolean };
}

export function parseSettingsUpdate(payload: unknown): StoreOptionSaved {
  const { message, data } = updateSchema.parse(payload);
  return { message, store: { id: data.id, enabled: data.enabled, sharedMoq: data.shared_moq } };
}

// ── The groups ──────────────────────────────────────────────

/** `App\Domain\GroupBuying\Enums\GroupBuyStatus`. Kept as answered: an unknown code shows as unknown. */
export const GROUP_BUY_STATUSES = ["open", "confirming", "locked", "failed", "finished", "cancelled"] as const;

/** The two lists of the page: `running` (open, confirming, locked), `past` (failed, finished, cancelled). */
export const GROUP_BUY_LISTS = ["running", "past"] as const;
export type GroupBuyList = (typeof GROUP_BUY_LISTS)[number];

/** Only a web address is a link; anything else is not offered. */
const webAddress = text.transform((value) => (value && /^https?:\/\//i.test(value) ? value : null));

const groupSchema = z
  .object({
    code: z.string(),
    status: z.string(),
    reserved_qty: int,
    members_count: int,
    max_qty: int.catch(0),
    current_unit_price: int,
    current_tier_min_qty: int.nullish().transform((value) => value ?? null),
    saving_percent: int.catch(0),
    next_tier: z
      .object({ min_qty: int, unit_price: int, missing_qty: int, saving_percent: int.catch(0) })
      .nullish()
      .transform((tier) => (tier ? { minQty: tier.min_qty, unitPrice: tier.unit_price, missingQty: tier.missing_qty, savingPercent: tier.saving_percent } : null)),
    closes_at: text,
    order_deadline_at: text,
    // Set while the large reservations pay first (status `confirming`).
    confirm_deadline_at: text.optional().transform((value) => value ?? null),
    opens_at: text,
    delivery_mode: z.string().catch("individual"),
    base_unit_price: int,
    tiers: z
      .array(z.object({ min_qty: int, unit_price: int, saving_percent: int.catch(0), reached: z.boolean().catch(false) }))
      .catch([])
      .transform((tiers) => tiers.map((tier) => ({ minQty: tier.min_qty, unitPrice: tier.unit_price, savingPercent: tier.saving_percent, reached: tier.reached }))),
    product: z
      .object({ id: z.union([z.string(), z.number()]).transform(String), name: z.string(), image_url: text })
      .nullish()
      .transform((product) => (product ? { id: product.id, name: product.name, imageUrl: product.image_url } : null)),
    store: z.object({ name: z.string() }).nullish().catch(null),
    initiator_name: text,
    city: text,
    share_url: webAddress,
    ordered_count: int.catch(0),
    locked_unit_price: int.nullish().transform((value) => value ?? null),
  })
  .transform((group) => ({
    code: group.code,
    status: group.status,
    reservedQty: group.reserved_qty,
    membersCount: group.members_count,
    /** Members who placed their order at the group price. */
    orderedCount: group.ordered_count,
    maxQty: group.max_qty,
    /** Centimes. The frozen price once the group is locked, else the price of the tier reached. */
    currentUnitPrice: group.current_unit_price,
    /** Centimes, set once the price is frozen. */
    lockedUnitPrice: group.locked_unit_price,
    /** Centimes: the price of one unit without the group. */
    baseUnitPrice: group.base_unit_price,
    currentTierMinQty: group.current_tier_min_qty,
    savingPercent: group.saving_percent,
    /** The next tier of an open group; null once the best is reached or the group is closed. */
    nextTier: group.next_tier,
    tiers: group.tiers,
    closesAt: group.closes_at,
    orderDeadlineAt: group.order_deadline_at,
    /** While `confirming`: the large reservations pay first, before this moment. */
    confirmDeadlineAt: group.confirm_deadline_at,
    opensAt: group.opens_at,
    /** `grouped`: the person who started the group orders the whole quantity, once. */
    grouped: group.delivery_mode === "grouped",
    product: group.product,
    storeName: group.store?.name ?? null,
    initiatorName: group.initiator_name,
    city: group.city,
    shareUrl: group.share_url,
  }));

export type GroupBuy = z.infer<typeof groupSchema>;

/** The server's "now" as a page gave it, and the device's clock at that moment (ms). */
export interface ServerClock {
  serverNow: number;
  receivedAt: number;
}

export interface GroupBuyPage {
  items: GroupBuy[];
  hasMore: boolean;
  clock: ServerClock;
}

const pageSchema = z.object({
  data: z.object({ items: z.array(groupSchema), has_more: z.boolean().catch(false) }),
  server_now: text,
});

/** `receivedAt`: the device's clock when the answer arrived. Without `server_now`, the device's clock stands in. */
export function parseGroupBuyPage(payload: unknown, receivedAt: number): GroupBuyPage {
  const page = pageSchema.parse(payload);
  const serverNow = page.server_now ? Date.parse(page.server_now) : Number.NaN;
  return {
    items: page.data.items,
    hasMore: page.data.has_more,
    clock: { serverNow: Number.isFinite(serverNow) ? serverNow : receivedAt, receivedAt },
  };
}

/**
 * The server's "now" at a moment of the device: what it said, plus the time
 * gone since. A device clock read before the answer came counts as nothing
 * gone, so a countdown never starts longer than the server's.
 */
export function serverNowAt(clock: ServerClock, deviceNow: number): number {
  return clock.serverNow + Math.max(0, deviceNow - clock.receivedAt);
}

// ── The last 30 days ────────────────────────────────────────

const summarySchema = z
  .object({
    data: z.object({ groups_started: int, groups_locked: int, running: int, orders: int, units: int, revenue: int }),
  })
  .transform(({ data }) => ({
    groupsStarted: data.groups_started,
    /** Groups that reached a tier, hence a group price. */
    groupsLocked: data.groups_locked,
    /** Open or locked now, whatever their age. */
    running: data.running,
    orders: data.orders,
    units: data.units,
    /** Centimes, at the group prices, cancelled orders left out. */
    revenue: data.revenue,
  }));

export type GroupBuySummary = z.infer<typeof summarySchema>;

export const parseGroupBuySummary = (payload: unknown): GroupBuySummary => summarySchema.parse(payload);

// ── Countdown ───────────────────────────────────────────────

/**
 * What is left before a deadline, in words: "45 min", "2 h 30 min",
 * "3 jours 4 h". Counted up to the next minute, so that a group never
 * reads as over while it still runs. Null when the deadline is passed.
 */
export function formatRemaining(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days} jour${days > 1 ? "s" : ""}${hours > 0 ? ` ${hours} h` : ""}`;
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Milliseconds left before an ISO date, at the server's "now"; null without a date. */
export function remainingUntil(deadline: string | null, serverNow: number): number | null {
  if (!deadline) return null;
  const at = Date.parse(deadline);
  return Number.isFinite(at) ? at - serverNow : null;
}
