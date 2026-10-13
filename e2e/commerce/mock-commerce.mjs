// Clients, Marketing and Statistics endpoints for the V7 smoke
// (playwright.commerce.config.ts), plugged into e2e/shell/mock-api.mjs.
// Payloads, filters, validation and refusals follow the controllers of
// ../sugu: SellerCustomerController and StoreCustomerDirectory (one segment
// per customer, counters of the whole store, 422 for a segment or a sort the
// server does not know, 404 for another store's customer),
// SellerMarketingController (amounts received in centimes and answered in
// francs, computed states, refusals), SellerStatisticsController with a
// period (SellerSalesReport) and AgencyStatisticsController (`report`).
// Nothing here reaches a real backend, and nothing here is a proof that the
// real one behaves so: e2e/staging/commerce.staging.spec.ts is.

const DAY = 86_400_000;

/** The moment the data set is built around: 12 October 2026 at 16:00 (the specs fix the browser clock on it). */
export function fixtureNow() {
  return Date.UTC(2026, 9, 12, 16, 0, 0);
}

const iso = (time) => new Date(time).toISOString();
const day = (time) => new Date(time).toISOString().slice(0, 10);
const picture = (hue) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="hsl(${hue} 30% 92%)"/><rect x="22" y="26" width="36" height="32" rx="6" fill="hsl(${hue} 35% 55%)"/><rect x="30" y="18" width="20" height="12" rx="4" fill="hsl(${hue} 35% 40%)"/></svg>`)}`;

// ── Customers ───────────────────────────────────────────────

const RULES = { vipSpent: 100000, vipOrders: 5, loyalOrders: 2, newDays: 30, inactiveDays: 90 };
const SEGMENTS = ["vip", "loyal", "new", "active", "inactive", "prospect"];
const SORTS = { last_order: "lastOrderAt", spent: "spent", orders: "orders", name: "name", since: "since" };
const CITIES = ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora"];
const FIRST = ["Awa", "Moussa", "Fatou", "Ibrahim", "Mariama", "Issa", "Aminata", "Adama", "Salif", "Fatoumata", "Cheick", "Rasmata"];
const LAST = ["Traoré", "Konaté", "Diallo", "Sawadogo", "Sanou", "Compaoré", "Ouédraogo", "Kaboré", "Zongo", "Zerbo"];

// [orders, delivered, spent in francs, days since last order, days since first]
const SHAPES = {
  vip: [24, 22, 542000, 0, 640],
  loyal: [12, 11, 280000, 2, 300],
  new: [2, 1, 45000, 4, 12],
  active: [1, 1, 22000, 40, 80],
  inactive: [3, 3, 62000, 120, 400],
  prospect: [0, 0, 0, null, 60],
};

function buildCustomers(now) {
  const plan = [...Array(4).fill("vip"), ...Array(9).fill("loyal"), ...Array(7).fill("new"), ...Array(8).fill("active"), ...Array(5).fill("inactive"), ...Array(3).fill("prospect")];
  return plan.map((segment, index) => {
    const [orders, delivered, spent, last, since] = SHAPES[segment];
    const firstName = FIRST[index % FIRST.length];
    const lastName = LAST[(index * 3) % LAST.length];
    const scale = 1 - (index % 5) * 0.08;
    return {
      id: `cust-${String(index + 1).padStart(3, "0")}`,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      phone: `+2267${String(1234560 + index * 7919).slice(0, 7)}`,
      email: index % 4 === 3 ? null : `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.com",
      segment,
      city: segment === "prospect" ? null : CITIES[index % CITIES.length],
      orders,
      delivered,
      spent: Math.round((spent * scale) / 500) * 500,
      lastOrderAt: last === null ? null : now - (last + (index % 3)) * DAY,
      since: now - (since + index) * DAY,
      source: segment === "prospect" || index % 6 === 5 ? "manual" : "marketplace",
    };
  });
}

function customerOut(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    status: row.segment === "vip" ? "VIP" : row.segment === "inactive" ? "INACTIVE" : row.segment === "prospect" ? "Nouveau" : "ACTIVE",
    segment: row.segment,
    avatar: null,
    city: row.city,
    ordersCount: row.orders,
    totalSpent: row.spent,
    totalSpentLabel: `${row.spent.toLocaleString("fr-FR")} XOF`,
    averageBasket: row.delivered > 0 ? Math.round(row.spent / row.delivered) : 0,
    lastOrderAt: row.lastOrderAt === null ? null : iso(row.lastOrderAt),
    lastActiveLabel: row.lastOrderAt === null ? "Jamais" : "récemment",
    since: iso(row.since),
    source: row.source,
  };
}

const ORDER_STATUSES = ["delivered", "delivered", "shipped", "delivered", "canceled", "delivered", "pending", "delivered", "delivered", "delivered"];
function ordersOf(row, now) {
  return Array.from({ length: Math.min(10, row.orders + (row.segment === "vip" ? 1 : 0)) }, (_, index) => ({
    id: `order-${row.id}-${index + 1}`,
    reference: `SU-2099-${String(123 - index * 11 - Number(row.id.slice(-2))).padStart(5, "0")}`,
    amount: 42000 - index * 3500,
    status: ORDER_STATUSES[index % ORDER_STATUSES.length],
    date: iso((row.lastOrderAt ?? now) - index * 14 * DAY),
  }));
}

function filterCustomers(rows, url) {
  const get = (name) => (url.searchParams.get(name) ?? "").trim();
  const fold = (text) => String(text ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const term = fold(get("search"));
  const digits = get("search").replace(/\D+/g, "");
  let list = rows
    .filter((row) => !get("segment") || row.segment === get("segment"))
    .filter((row) => !get("city") || row.city === get("city"))
    .filter((row) => !term || fold(row.name).includes(term) || fold(row.email).includes(term) || fold(row.phone).includes(term) || (digits.length >= 4 && row.phone.replace(/\D+/g, "").includes(digits)));
  const key = SORTS[get("sort")] ?? "lastOrderAt";
  const direction = get("direction") === "asc" || (get("sort") === "name" && get("direction") !== "desc") ? 1 : -1;
  list = [...list].sort((a, b) => {
    if (a[key] === null) return 1;
    if (b[key] === null) return -1;
    const order = typeof a[key] === "string" ? a[key].localeCompare(b[key], "fr") : a[key] - b[key];
    return order * direction || a.id.localeCompare(b.id);
  });
  return list;
}

function csv(headings, rows) {
  const safe = (value) => (typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
  const cell = (value) => (value === null || value === undefined ? "" : /[;"\n]/.test(String(safe(value))) ? `"${String(safe(value)).replaceAll('"', '""')}"` : String(safe(value)));
  return `﻿${[headings, ...rows].map((row) => row.map(cell).join(";")).join("\n")}\n`;
}

// ── Marketing ───────────────────────────────────────────────

const PRODUCTS = [
  ["baskets", "Baskets Sport", "SKU-001", 25000, 30, "active"],
  ["sac", "Sac à main", "SKU-002", 18000, 25, "active"],
  ["montre", "Montre Homme", "SKU-003", 35000, 210, "active"],
  ["tshirt", "T-shirt Coton", "SKU-004", 8000, 190, "active"],
  ["casque", "Casque Audio", "SKU-005", 22000, 260, "active"],
  ["robe", "Robe Wax", "SKU-006", 30000, 330, "active"],
  ["sandales", "Sandales cuir", "SKU-007", 12000, 45, "draft"],
].map(([key, name, sku, price, hue, status]) => ({ id: `product-${key}`, key, name, sku, price, image: picture(hue), status }));

function statusOf(row, now) {
  if (!row.isActive) return "disabled";
  if (row.startsAt && now < row.startsAt) return "scheduled";
  if (row.endsAt && now > row.endsAt) return "expired";
  if (row.usageLimit && row.redemptions >= row.usageLimit) return "exhausted";
  return "active";
}

function buildMarketing() {
  const at = (month, dayOfMonth, end = false) => Date.UTC(2026, month - 1, dayOfMonth, end ? 23 : 0, end ? 59 : 0, end ? 59 : 0);
  const coupon = (code, type, value, minSubtotal, redemptions, usageLimit, startsAt, endsAt, extra = {}) => ({ id: `coupon-${code.toLowerCase()}`, code, type, value, minSubtotal, redemptions, usageLimit, perCustomerLimit: 1, startsAt, endsAt, isActive: true, savings: redemptions * (type === "percent_off" ? 1200 : value), ...extra });
  const promotion = (key, type, value, startsAt, endsAt, extra = {}) => ({ id: `promo-${key}`, product: key, type, value, startsAt, endsAt, isActive: true, orders: 0, savings: 0, ...extra });
  return {
    coupons: [
      coupon("SUGU10", "percent_off", 10, 10000, 245, 500, at(10, 1), at(12, 31, true)),
      coupon("BIENVENUE", "amount_off", 5000, 20000, 128, 300, at(10, 1), at(11, 30, true)),
      coupon("FIDELITE", "percent_off", 5, null, 562, 1000, at(9, 15), at(12, 31, true), { perCustomerLimit: null }),
      coupon("ETE2026", "percent_off", 15, 25000, 0, 500, at(11, 1), at(12, 31, true)),
      coupon("FLASH20", "percent_off", 20, 15000, 310, 400, at(9, 1), at(9, 30, true)),
      coupon("PAUSE", "amount_off", 2000, null, 12, null, at(8, 1), at(12, 31, true), { isActive: false }),
    ],
    promotions: [
      promotion("baskets", "percent_off", 20, at(10, 1), at(12, 31, true), { orders: 14, savings: 70000 }),
      promotion("sac", "amount_off", 3000, at(10, 1), at(12, 31, true), { orders: 6, savings: 18000 }),
      promotion("montre", "percent_off", 20, at(9, 15), at(11, 30, true)),
      promotion("tshirt", "amount_off", 1500, at(11, 1), at(12, 31, true)),
      promotion("casque", "percent_off", 18, at(9, 1), at(9, 30, true)),
    ],
  };
}

const couponOut = (row, now) => ({
  id: row.id, code: row.code, name: null, type: row.type, value: row.value, minSubtotal: row.minSubtotal, usageLimit: row.usageLimit, perCustomerLimit: row.perCustomerLimit,
  redemptions: row.redemptions, savings: row.savings, startsAt: row.startsAt ? iso(row.startsAt) : null, endsAt: row.endsAt ? iso(row.endsAt) : null,
  status: statusOf(row, now), isActive: row.isActive, appliedAtCheckout: row.type !== "free_shipping",
});

const promoPriceOf = (price, type, value) => (type === "percent_off" ? Math.round((price * (100 - value)) / 100) : price - value);

function promotionOut(row, now) {
  const product = PRODUCTS.find((entry) => entry.key === row.product);
  const promoPrice = promoPriceOf(product.price, row.type, row.value);
  return {
    id: row.id, name: `Promo — ${product.name}`,
    product: { id: product.id, name: product.name, sku: product.sku, image: product.image, status: product.status, price: product.price },
    type: row.type, value: row.value, promoPrice, discountPercent: Math.round(((product.price - promoPrice) / product.price) * 100),
    startsAt: row.startsAt ? iso(row.startsAt) : null, endsAt: row.endsAt ? iso(row.endsAt) : null,
    status: statusOf(row, now), isActive: row.isActive, orders: row.orders, savings: row.savings,
  };
}

function board(state, now) {
  const couponList = state.coupons.map((row) => couponOut(row, now));
  const promotionList = state.promotions.map((row) => promotionOut(row, now));
  const count = (list, status) => list.filter((row) => row.status === status).length;
  return {
    summary: {
      coupons: { total: couponList.length, active: count(couponList, "active"), scheduled: count(couponList, "scheduled"), expired: count(couponList, "expired"), disabled: count(couponList, "disabled"), exhausted: count(couponList, "exhausted"), redemptions: state.coupons.reduce((sum, row) => sum + row.redemptions, 0), savings: state.coupons.reduce((sum, row) => sum + row.savings, 0) },
      promotions: { total: promotionList.length, active: count(promotionList, "active"), scheduled: count(promotionList, "scheduled"), expired: count(promotionList, "expired"), disabled: count(promotionList, "disabled"), orders: state.promotions.reduce((sum, row) => sum + row.orders, 0), savings: state.promotions.reduce((sum, row) => sum + row.savings, 0) },
      truncated: false,
    },
    couponList,
    promotionList,
    // The former answer, still sent by Laravel.
    kpis: { activePromotions: 0, totalPromotions: 0, clientSavings: 0, codesUsed: 0, codesTotal: 0 },
    coupons: [],
    promotedProducts: [],
  };
}

const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const windowOf = (startsAt, endsAt) => [startsAt ? Date.parse(DAY_ONLY.test(startsAt) ? `${startsAt}T00:00:00Z` : startsAt) : null, endsAt ? Date.parse(DAY_ONLY.test(endsAt) ? `${endsAt}T23:59:59Z` : endsAt) : null];

function valueErrors(type, value) {
  if (!["percent_off", "amount_off"].includes(type)) return { discount_type: ["Ce type de réduction n’est pas proposé."] };
  if (!Number.isInteger(value)) return { discount_value: ["Le champ valeur est obligatoire."] };
  if (type === "percent_off" && (value < 1 || value > 100)) return { discount_value: ["La valeur doit être comprise entre 1 et 100."] };
  if (type === "amount_off" && (value < 100 || value % 100 !== 0)) return { discount_value: ["Le montant doit être en francs entiers."] };
  return {};
}

// ── Statistics ──────────────────────────────────────────────

const compared = (value, previous) => ({ value, previous, change: previous > 0 ? Math.round(((value - previous) / previous) * 1000) / 10 : null });

/** A day's sales, the same every run: quieter on Sundays, a little more each week. */
function salesOf(time) {
  const date = new Date(time);
  const index = Math.floor(time / DAY);
  const weekday = date.getUTCDay();
  if (index % 11 === 0) return { orders: 0, revenue: 0 };
  const orders = 4 + ((index * 7) % 6) + (weekday === 6 ? 4 : 0) - (weekday === 0 ? 3 : 0);
  return { orders: Math.max(1, orders), revenue: Math.max(1, orders - 1) * (9000 + ((index * 13) % 7) * 1500) };
}

function salesReport(from, to, key) {
  const days = Math.round((to - from) / DAY) + 1;
  const series = Array.from({ length: days }, (_, index) => ({ date: day(from + index * DAY), ...salesOf(from + index * DAY) }));
  const before = Array.from({ length: days }, (_, index) => salesOf(from - (days - index) * DAY));
  const sum = (list, field) => list.reduce((total, entry) => total + entry[field], 0);
  const revenue = sum(series, "revenue");
  const orders = sum(series, "orders");
  const delivered = Math.max(0, orders - Math.ceil(days / 4));
  const previousRevenue = key === "90j" ? 0 : sum(before, "revenue");
  const previousOrders = key === "90j" ? 0 : sum(before, "orders");
  const split = [["Mode", 42], ["Électronique", 28], ["Maison", 18], ["Beauté", 8], ["Autres", 4]];
  const sold = [["baskets", 0.3], ["tshirt", 0.24], ["montre", 0.2], ["sac", 0.15], ["casque", 0.11]];
  return {
    period: { key, from: day(from), to: day(to), days, previousFrom: day(from - days * DAY), previousTo: day(from - DAY), timezone: "UTC" },
    kpis: {
      revenue: compared(revenue, previousRevenue),
      orders: compared(orders, previousOrders),
      averageBasket: compared(delivered > 0 ? Math.round(revenue / delivered) : 0, previousOrders > 0 ? Math.round(previousRevenue / previousOrders) : 0),
      newCustomers: compared(Math.round(orders * 0.6), Math.round(previousOrders * 0.55)),
      returningCustomers: Math.round(orders * 0.25),
      deliveredOrders: delivered,
      inProgressAmount: Math.ceil(days / 4) * 12500,
      canceledOrders: Math.floor(days / 10),
    },
    series,
    topProducts: sold.map(([productKey, share]) => {
      const product = PRODUCTS.find((entry) => entry.key === productKey);
      const productRevenue = Math.round((revenue * share) / 500) * 500;
      return { productId: product.id, name: product.name, sku: product.sku, image: product.image, quantity: Math.max(1, Math.round(productRevenue / product.price)), revenue: productRevenue };
    }),
    categories: split.map(([name, percent]) => ({ name, revenue: Math.round((revenue * percent) / 100), percent })),
    cities: [["Ouagadougou", 62], ["Bobo-Dioulasso", 21], ["Koudougou", 11], ["Banfora", 6]].map(([city, percent]) => ({ city, orders: Math.max(1, Math.round((orders * percent) / 100)), percent })),
    generatedAt: iso(fixtureNow()),
  };
}

const EMPTY_SALES = (from, to, key) => {
  const report = salesReport(from, to, key);
  const zero = { value: 0, previous: 0, change: null };
  return { ...report, kpis: { revenue: zero, orders: zero, averageBasket: zero, newCustomers: zero, returningCustomers: 0, deliveredOrders: 0, inProgressAmount: 0, canceledOrders: 0 }, series: report.series.map((entry) => ({ ...entry, orders: 0, revenue: 0 })), topProducts: [], categories: [], cities: [] };
};

const COURIERS = [["Moussa Kaboré", 0.32, 2], ["Issa Traoré", 0.25, 1], ["Awa Zongo", 0.18, 0], ["Salif Ouédraogo", 0.16, 3], ["Fatoumata Diallo", 0.09, 1]];

function activityReport(days, key) {
  const to = Date.UTC(2026, 9, 12);
  const from = to - (days - 1) * DAY;
  const series = Array.from({ length: days }, (_, index) => {
    const time = from + index * DAY;
    const created = salesOf(time).orders * 2 + 3;
    const recent = index >= days - 2;
    const failed = (Math.floor(time / DAY) % 9 === 0 ? 1 : 0) + (Math.floor(time / DAY) % 13 === 0 ? 1 : 0);
    return { date: day(time), created, delivered: recent ? Math.round(created * 0.4) : created - failed, failed };
  });
  const sum = (field) => series.reduce((total, entry) => total + entry[field], 0);
  const created = sum("created");
  const delivered = sum("delivered");
  const failed = sum("failed");
  const open = created - delivered - failed;
  const inProgress = Math.round(open * 0.7);
  const states = { delivered, in_progress: inProgress, pending: open - inProgress, failed };
  return {
    period: { key, from: day(from), to: day(to), days, previousFrom: day(from - days * DAY), previousTo: day(from - DAY), timezone: "UTC" },
    kpis: {
      created: compared(created, Math.round(created * 0.88)),
      delivered: compared(delivered, Math.round(delivered * 0.9)),
      inProgress,
      pending: open - inProgress,
      failed: compared(failed, failed + 2),
      successRate: Math.round((delivered / (delivered + failed)) * 1000) / 10,
      averageMinutes: 47,
      timedDeliveries: delivered - 3,
    },
    series,
    statuses: Object.entries(states).map(([state, count]) => ({ key: state, count, percent: Math.round((count / created) * 1000) / 10 })),
    couriers: COURIERS.map(([name, share, lost], index) => {
      const done = Math.max(1, Math.round(delivered * share));
      return { id: `courier-${index + 1}`, name, deliveries: done, failed: lost, assigned: done + lost + 1, successRate: Math.round((done / (done + lost)) * 1000) / 10 };
    }),
    failureReasons: [["NO_ANSWER", "Client absent", 0.6], ["WRONG_ADDRESS", "Adresse incorrecte", 0.25], ["CLIENT_REFUSED", "Colis refusé", 0.15]].map(([code, label, share]) => ({ code, label, count: Math.max(1, Math.round(failed * share)), percent: share * 100 })),
    generatedAt: iso(fixtureNow()),
  };
}

// ── State, per test run ─────────────────────────────────────

const state = { customers: null, marketing: null, received: [], created: 0 };
function reset(now) {
  state.customers = buildCustomers(now);
  state.marketing = buildMarketing();
  state.received = [];
  state.created = 0;
}

export default async function commerce({ req, res, url, path, method, profile, send, readJson }) {
  const answer = (status, body) => (send(res, status, body), true);
  const ok = (data, extra = {}) => answer(200, { success: true, data, ...extra });
  const invalid = (errors) => answer(422, { success: false, message: Object.values(errors)[0][0], error_code: "VALIDATION_ERROR", errors });
  const now = fixtureNow();
  if (!state.customers) reset(now);

  // What the stand-in received, and a clean slate, for the specs.
  if (path === "/__commerce/received") return ok(state.received);
  if (path === "/__commerce/reset") return reset(now), ok(true);

  // ── Agency statistics ──
  const agency = /^\/agencies\/([^/]+)\/statistics$/.exec(path);
  if (agency) {
    if (method !== "GET") return answer(405, { message: "Method not allowed." });
    if (profile.user_type !== "delivery_partner" || String(profile.agency?.id) !== agency[1]) return answer(403, { success: false, message: "Accès non autorisé." });
    const key = ["7j", "30j", "90j"].includes(url.searchParams.get("period")) ? url.searchParams.get("period") : "30j";
    state.received.push({ path, period: url.searchParams.get("period") });
    return ok({ totalDeliveries: 0, totalRevenue: "", failureReasons: [], failureTip: "", report: activityReport({ "7j": 7, "30j": 30, "90j": 90 }[key], key) });
  }

  const seller = ["/sellers/customers", "/sellers/marketing", "/sellers/statistics"].some((prefix) => path.startsWith(prefix)) || (path === "/sellers/products" && method === "GET");
  if (!seller) return false;
  if (profile.user_type !== "seller" || !profile.store) return answer(404, { success: false, message: "Aucune boutique trouvée pour ce vendeur." });
  // The store of the fixture has customers and offers; any other seller starts from nothing.
  const mine = profile.store.id === 11;
  const customers = mine ? state.customers : [];
  const marketing = mine ? state.marketing : { coupons: [], promotions: [] };
  const get = (name) => url.searchParams.get(name);

  // ── Products on sale, for the promotion form ──
  if (path === "/sellers/products") {
    const term = (get("search") ?? "").toLowerCase();
    const rows = PRODUCTS.filter((row) => !get("status") || row.status === get("status")).filter((row) => !term || row.name.toLowerCase().includes(term) || row.sku.toLowerCase().includes(term));
    return ok({ data: rows.map((row) => ({ id: row.id, name: row.name, sku: row.sku, image: row.image, main_image: row.image, price: row.price, statusCode: row.status, status: row.status === "active" ? "published" : row.status, stock: 12, stockStatus: "in_stock", category: null, hasVariants: false, variants: [] })), total: rows.length, page: 1, totalPages: 1 });
  }

  // ── Customers ──
  if (path === "/sellers/customers" && method === "GET") {
    if (get("segment") && !SEGMENTS.includes(get("segment"))) return invalid({ segment: ["Le segment sélectionné est invalide."] });
    if (get("sort") && !SORTS[get("sort")]) return invalid({ sort: ["Le tri sélectionné est invalide."] });
    if ((get("search") ?? "").includes("panne")) return answer(500, { success: false, message: "SQLSTATE[HY000]: General error" });
    const rows = filterCustomers(customers, url);
    const limit = Math.max(1, Math.min(100, Number(get("limit")) || 20));
    const page = Math.max(1, Number(get("page")) || 1);
    const last = Math.max(1, Math.ceil(rows.length / limit));
    return ok(rows.slice((page - 1) * limit, page * limit).map(customerOut), { meta: { current_page: page, last_page: last, total: rows.length, per_page: limit, has_more: page < last } });
  }
  if (path === "/sellers/customers/summary") {
    const segments = Object.fromEntries(SEGMENTS.map((segment) => [segment, customers.filter((row) => row.segment === segment).length]));
    const cities = CITIES.filter((city) => customers.some((row) => row.city === city));
    return ok({ total: customers.length, segments, cities, rules: RULES });
  }
  if (path === "/sellers/customers/export" && method === "POST") {
    const body = await readJson(req);
    state.received.push({ path, body });
    const asUrl = new URL(url);
    for (const [key, value] of Object.entries(body ?? {})) if (typeof value === "string") asUrl.searchParams.set(key, value);
    const rows = filterCustomers(customers, asUrl);
    res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="clients.csv"', "X-Export-Truncated": "0" });
    res.end(csv(["Nom", "Téléphone", "E-mail", "Ville", "Statut", "Commandes", "Total dépensé (FCFA)", "Panier moyen (FCFA)", "Dernière commande", "Client depuis"], rows.map((row) => [row.name, row.phone, row.email, row.city, row.segment, row.orders, row.spent, row.delivered ? Math.round(row.spent / row.delivered) : 0, row.lastOrderAt ? day(row.lastOrderAt) : "", day(row.since)])));
    return true;
  }
  if (path === "/sellers/customers" && method === "POST") {
    const body = (await readJson(req)) ?? {};
    state.received.push({ path, body });
    const errors = {};
    if (!String(body.firstName ?? "").trim()) errors.firstName = ["Le champ prénom est obligatoire."];
    if (!String(body.lastName ?? "").trim()) errors.lastName = ["Le champ nom est obligatoire."];
    const digits = String(body.phone ?? "").replace(/[^\d+]/g, "");
    const phone = !digits ? null : digits.startsWith("+") ? digits : `+226${digits.replace(/^0/, "")}`;
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    if (!phone && !email) errors.phone = ["Indiquez un téléphone ou un e-mail."];
    if (phone && customers.some((row) => row.phone === phone)) errors.phone = ["Un client de votre boutique a déjà ce numéro."];
    if (email && customers.some((row) => row.email === email)) errors.email = ["Un client de votre boutique a déjà cet e-mail."];
    if (Object.keys(errors).length > 0) return invalid(errors);
    state.created += 1;
    const row = { id: `cust-new-${state.created}`, firstName: body.firstName.trim(), lastName: body.lastName.trim(), name: `${body.firstName.trim()} ${body.lastName.trim()}`, phone, email, segment: "new", city: null, orders: 0, delivered: 0, spent: 0, lastOrderAt: null, since: now, source: "manual" };
    state.customers.unshift(row);
    return answer(201, { success: true, data: customerOut(row) });
  }
  const sheet = /^\/sellers\/customers\/([^/]+)$/.exec(path);
  if (sheet && method === "GET") {
    const row = customers.find((entry) => entry.id === sheet[1]);
    if (!row) return answer(404, { success: false, message: "Client non trouvé." });
    return ok({
      ...customerOut(row),
      createdAt: iso(row.since),
      stats: { totalOrders: row.orders, deliveredOrders: row.delivered, totalSpent: row.spent, averageBasket: row.delivered ? Math.round(row.spent / row.delivered) : 0, lastOrderDate: row.lastOrderAt ? iso(row.lastOrderAt) : null, daysInactive: 0 },
      recentOrders: ordersOf(row, now),
    });
  }

  // ── Marketing ──
  if (path === "/sellers/marketing" && method === "GET") return ok(board(marketing, now));

  if (path === "/sellers/marketing/coupons" && method === "POST") {
    const body = (await readJson(req)) ?? {};
    state.received.push({ path, body });
    const code = String(body.code ?? "").trim().toUpperCase();
    const errors = {};
    if (code.length < 3 || !/^[A-Z0-9_-]+$/.test(code)) errors.code = ["Le code ne contient que des lettres, des chiffres, des tirets ou des tirets bas."];
    else if (marketing.coupons.some((row) => row.code === code)) errors.code = ["Ce code est déjà utilisé. Choisissez-en un autre."];
    Object.assign(errors, valueErrors(body.discount_type, body.discount_value));
    if (body.min_subtotal !== undefined && (!Number.isInteger(body.min_subtotal) || body.min_subtotal % 100 !== 0)) errors.min_subtotal = ["Le minimum de commande doit être en francs entiers."];
    const [startsAt, endsAt] = windowOf(body.starts_at, body.ends_at);
    if (startsAt && endsAt && endsAt < startsAt) errors.ends_at = ["La date de fin doit suivre la date de début."];
    else if (endsAt && endsAt < now) errors.ends_at = ["La date de fin est déjà passée."];
    if (Object.keys(errors).length > 0) return invalid(errors);
    // Amounts arrive in centimes and are answered in francs.
    const row = { id: `coupon-${code.toLowerCase()}`, code, type: body.discount_type, value: body.discount_type === "percent_off" ? body.discount_value : body.discount_value / 100, minSubtotal: body.min_subtotal ? body.min_subtotal / 100 : null, redemptions: 0, usageLimit: body.total_usage_limit ?? null, perCustomerLimit: "per_customer_limit" in body ? body.per_customer_limit : 1, startsAt, endsAt, isActive: body.is_active ?? true, savings: 0 };
    marketing.coupons.unshift(row);
    return answer(201, { success: true, message: "Code promo créé avec succès.", data: { id: row.id, code, coupon: couponOut(row, now) } });
  }

  const toggle = /^\/sellers\/marketing\/coupons\/([^/]+)\/toggle$/.exec(path);
  if (toggle && method === "PUT") {
    const row = marketing.coupons.find((entry) => entry.id === toggle[1]);
    if (!row) return answer(404, { success: false, message: "Not found." });
    row.isActive = !row.isActive;
    state.received.push({ path });
    return ok({ id: row.id, is_active: row.isActive, status: statusOf(row, now) }, { message: row.isActive ? "Code promo activé." : "Code promo désactivé." });
  }

  if (path === "/sellers/marketing/promotions" && method === "POST") {
    const body = (await readJson(req)) ?? {};
    state.received.push({ path, body });
    const product = PRODUCTS.find((entry) => entry.id === body.product_id);
    const errors = valueErrors(body.discount_type, body.discount_value);
    if (!product) return answer(403, { success: false, message: "Ce produit ne vous appartient pas." });
    if (product.status !== "active") errors.product_id = ["Ce produit n’est pas en vente : publiez-le avant de le mettre en promotion."];
    const value = body.discount_type === "percent_off" ? body.discount_value : body.discount_value / 100;
    if (!errors.discount_value && promoPriceOf(product.price, body.discount_type, value) <= 0) errors.discount_value = [`La réduction doit rester inférieure au prix du produit (${product.price.toLocaleString("fr-FR")} FCFA).`];
    const [startsAt, endsAt] = windowOf(body.starts_at, body.ends_at);
    if (endsAt && endsAt < now) errors.ends_at = ["La date de fin est déjà passée."];
    if (Object.keys(errors).length > 0) return invalid(errors);
    if (marketing.promotions.some((row) => row.product === product.key && row.isActive && (!row.endsAt || row.endsAt >= now))) {
      return answer(422, { success: false, message: "Ce produit a déjà une promotion active. Supprimez-la d'abord avant d'en créer une nouvelle." });
    }
    const row = { id: `promo-new-${++state.created}`, product: product.key, type: body.discount_type, value, startsAt: startsAt ?? now, endsAt, isActive: true, orders: 0, savings: 0 };
    marketing.promotions.unshift(row);
    return answer(201, { success: true, message: "Promotion créée avec succès.", data: { id: row.id, product_id: product.id } });
  }

  const promotion = /^\/sellers\/marketing\/promotions\/([^/]+)$/.exec(path);
  if (promotion && (method === "PUT" || method === "DELETE")) {
    const row = marketing.promotions.find((entry) => entry.id === promotion[1]);
    if (!row) return answer(404, { success: false, message: "Promotion introuvable." });
    if (method === "DELETE") {
      marketing.promotions = marketing.promotions.filter((entry) => entry !== row);
      state.marketing.promotions = marketing.promotions;
      state.received.push({ path, method });
      return ok(null, { message: "Promotion supprimée avec succès." });
    }
    const body = (await readJson(req)) ?? {};
    state.received.push({ path, body });
    const product = PRODUCTS.find((entry) => entry.key === row.product);
    const errors = {};
    if ("discount_value" in body) {
      const type = body.discount_type ?? row.type;
      Object.assign(errors, valueErrors(type, body.discount_value));
      const value = type === "percent_off" ? body.discount_value : body.discount_value / 100;
      if (!errors.discount_value && promoPriceOf(product.price, type, value) <= 0) errors.discount_value = [`La réduction doit rester inférieure au prix du produit (${product.price.toLocaleString("fr-FR")} FCFA).`];
      if (Object.keys(errors).length === 0) Object.assign(row, { type, value });
    }
    const [startsAt, endsAt] = windowOf(body.starts_at, body.ends_at);
    if ("ends_at" in body && endsAt && endsAt < now) errors.ends_at = ["La date de fin est déjà passée."];
    if (body.is_active === true && !row.isActive && (("ends_at" in body ? endsAt : row.endsAt) ?? Infinity) < now) errors.ends_at = ["Cette promotion est terminée : donnez-lui une nouvelle date de fin pour la réactiver."];
    if (Object.keys(errors).length > 0) return invalid(errors);
    if ("starts_at" in body && startsAt) row.startsAt = startsAt;
    if ("ends_at" in body) row.endsAt = endsAt;
    if ("is_active" in body) row.isActive = Boolean(body.is_active);
    return ok({ id: row.id, status: statusOf(row, now) }, { message: "Promotion mise à jour avec succès." });
  }

  // ── Statistics ──
  if (path === "/sellers/statistics" && method === "GET") {
    const period = get("period");
    const from = get("from");
    const to = get("to");
    state.received.push({ path, period, from, to });
    if (period && !["7j", "30j", "90j"].includes(period)) return invalid({ period: ["La période sélectionnée est invalide."] });
    const today = Date.UTC(2026, 9, 12);
    let range;
    if (from || to) {
      if (!DAY_ONLY.test(from ?? "") || !DAY_ONLY.test(to ?? "") || to < from || Date.parse(`${to}T00:00:00Z`) > today) return invalid({ to: ["La date de fin n’est pas valide."] });
      range = [Date.parse(`${from}T00:00:00Z`), Date.parse(`${to}T00:00:00Z`), "custom"];
    } else {
      const key = period ?? "30j";
      range = [today - ({ "7j": 7, "30j": 30, "90j": 90 }[key] - 1) * DAY, today, key];
    }
    return ok({ report: mine ? salesReport(...range) : EMPTY_SALES(...range) });
  }

  return answer(404, { success: false, message: "Not found." });
}
