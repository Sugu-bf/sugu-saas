// Sugu Box endpoints for the V6 smoke (playwright.sugubox.config.ts), plugged
// into e2e/shell/mock-api.mjs. Payloads, filters, validation and refusals
// follow SellerSuguBoxBoardController and SellerSuguBoxBoard (../sugu):
// stock held in bins, what open expeditions reserve, counters, the quantity
// a bin held before and after a movement, 422 for a filter the server does
// not know, 404 for a document of another store.
// The legacy routes (sellers/sugubox/overview…) are answered from the same
// data, for the "before" captures of the old screens.
// Nothing here reaches a real backend, and nothing here is a proof that the
// real one behaves so: e2e/staging/sugubox.staging.spec.ts is.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The moment the data set is built around: 12 October 2026 at 16:00 (the specs fix the browser clock on it). */
export function fixtureNow() {
  return new Date(2026, 9, 12, 16, 0, 0, 0).getTime();
}

const iso = (time) => new Date(time).toISOString();
const day = (time) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const picture = (hue) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="hsl(${hue} 30% 92%)"/><rect x="22" y="26" width="36" height="32" rx="6" fill="hsl(${hue} 35% 55%)"/><rect x="30" y="18" width="20" height="12" rx="4" fill="hsl(${hue} 35% 40%)"/></svg>`)}`;

const WAREHOUSES = {
  ouaga: { id: "wh-ouaga", name: "Sugu Ouaga Centre", code: "OUA-CENTRE" },
  bobo: { id: "wh-bobo", name: "Sugu Bobo Nord", code: "BOB-NORD" },
};
const BINS = { "A-01-03": "ouaga", "A-01-07": "ouaga", "B-02-01": "ouaga", "B-02-05": "ouaga", "C-03-02": "ouaga", "C-03-06": "ouaga", "D-04-01": "bobo", "D-04-04": "bobo" };
const USERS = { aminata: { id: "user-aminata", name: "Aminata S." }, moussa: { id: "user-moussa", name: "Moussa K." }, fatou: { id: "user-fatou", name: "Fatou D." } };
const REASONS = { DAMAGE: "Casse ou article défectueux", INVENTORY_COUNT: "Comptage d'inventaire" };
const TYPE_LABELS = { inbound: "Entrée", outbound: "Sortie", transfer: "Transfert", adjustment: "Ajustement" };
const INBOUND_LABELS = { pending: "En attente", in_progress: "En cours", completed: "Terminée", cancelled: "Annulée" };
const OUTBOUND_LABELS = { pending: "En attente", picking: "En picking", packed: "Emballée", shipped: "Expédiée", cancelled: "Annulée" };

// [key, name, variant title, sku, alert level, hue]
const VARIANTS = Object.fromEntries(
  [
    ["baskets", "Baskets urbaines", "Taille 42 · Blanc", "SKU001", 10, 30],
    ["tshirt", "T-shirt essentiel", "Taille M · Noir", "SKU002", 20, 220],
    ["serum", "Sérum hydratant", "30 ml", "SKU003", 5, 340],
    ["casque", "Casque sans fil", "Noir", "SKU004", 8, 260],
    ["sac", "Sac en toile", "Beige", "SKU005", 15, 45],
    ["mug", "Mug Sugu", "Blanc mat · 350 ml", "SKU006", 10, 15],
    ["lunettes", "Lunettes de soleil", "Écaille", "SKU007", 6, 90],
    ["carnet", "Carnet de notes", "A5 · Kraft", "SKU008", null, 25],
  ].map(([key, name, title, sku, threshold, hue]) => [key, { id: `variant-${key}`, productId: `product-${key}`, name, title, sku, threshold, image: picture(hue) }]),
);

function build(now) {
  const movements = [];
  const receptions = [];
  const expeditions = [];
  let sequence = 0;
  const move = (variant, bin, type, quantity, at, user, extra = {}) =>
    movements.push({ id: `mov-${String(++sequence).padStart(4, "0")}`, variant, bin, type, quantity, at, user, reason: null, document: null, ...extra });

  const reception = (number, status, warehouse, daysAgo, user, lines, notes = null, expectedIn = 0) => {
    const id = `inb-${number}`;
    const reference = `REC-2026-${String(number).padStart(5, "0")}`;
    const created = now - (daysAgo + 1) * DAY - 7 * HOUR;
    const received = now - daysAgo * DAY - 6 * HOUR;
    receptions.push({
      id, reference, status, warehouse, notes, created,
      expected: day(now - daysAgo * DAY + expectedIn * DAY),
      firstReceived: lines.some(([, , got]) => got > 0) ? received : null,
      completed: status === "completed" ? received + 40 * 60_000 : null,
      lines: lines.map(([variant, expected, got, bin], index) => ({ id: `${id}-l${index + 1}`, variant, expected, got, bin: got > 0 ? bin : null })),
    });
    for (const [variant, , got, bin] of lines) if (got > 0) move(variant, bin, "inbound", got, received, user, { document: { kind: "inbound", id, reference } });
  };

  // Volume first (older): the list has a second page, the journal a third.
  for (let index = 0; index < 9; index += 1) {
    reception(101 + index, "completed", "ouaga", 150 - index * 9, index % 2 ? "aminata" : "moussa", [["mug", 4, 4, "C-03-06"], ["carnet", 3, 3, "D-04-04"]].slice(0, 1 + (index % 2)));
  }
  reception(120, "completed", "ouaga", 34, "aminata", [["baskets", 60, 60, "A-01-03"], ["tshirt", 30, 30, "A-01-07"], ["casque", 45, 45, "B-02-05"]]);
  reception(121, "completed", "ouaga", 20, "moussa", [["sac", 20, 18, "C-03-02"], ["mug", 120, 120, "C-03-06"], ["serum", 12, 12, "B-02-01"]], "Réception partielle pour le sac en toile (18/20). À compléter sur le prochain dépôt.");
  reception(122, "completed", "bobo", 12, "fatou", [["lunettes", 10, 10, "D-04-01"], ["carnet", 64, 64, "D-04-04"]]);
  reception(123, "cancelled", "bobo", 9, null, [["mug", 40, 0, null]], "Annulée : dépôt reporté par le vendeur.");
  reception(124, "in_progress", "ouaga", 0, "aminata", [["tshirt", 30, 12, "A-01-07"], ["baskets", 24, 0, null], ["casque", 20, 0, null]], null, 2);
  reception(125, "pending", "ouaga", 0, null, [["serum", 50, 0, null], ["lunettes", 20, 0, null]], null, 4);

  const CUSTOMERS = [["Mamadou Diop", "Ouagadougou", "Ouaga 2000"], ["Fatou Ndiaye", "Bobo-Dioulasso", "Secteur 21"], ["Cheikh Sarr", "Koudougou", "Secteur 5"], ["Aminata Ba", "Ouagadougou", "Gounghin"], ["Ibrahim Diallo", "Ouagadougou", "Cissin"]];
  const expedition = (number, status, daysAgo, user, lines) => {
    const id = `out-${number}`;
    const reference = `EXP-2026-${String(number).padStart(5, "0")}`;
    const [customer, city, zone] = CUSTOMERS[number % CUSTOMERS.length];
    const created = now - daysAgo * DAY - 5 * HOUR;
    const picked = created + 4 * HOUR > now ? now - 30 * 60_000 : created + 4 * HOUR;
    const reached = { pending: 0, picking: 1, packed: 2, shipped: 3, cancelled: 1 }[status];
    expeditions.push({
      id, reference, status, warehouse: "ouaga", created,
      order: { id: `order-${number}`, number: `SU-2026-${String(4500 + number).padStart(6, "0")}`, placed_at: iso(created - 6 * 60_000), customer_name: customer },
      recipient: { name: customer, city, zone },
      pickingStarted: lines.some(([, , got]) => got > 0) ? picked : null,
      packed: reached >= 2 ? picked + 2 * HOUR : null,
      shipped: reached >= 3 ? picked + 20 * HOUR : null,
      cancelled: status === "cancelled" ? picked + 3 * HOUR : null,
      lines: lines.map(([variant, requested, got, bin], index) => ({ id: `${id}-l${index + 1}`, variant, requested, got, bin: got > 0 ? bin : null })),
    });
    for (const [variant, , got, bin] of lines) {
      if (got <= 0) continue;
      move(variant, bin, "outbound", -got, picked, user, { document: { kind: "outbound", id, reference } });
      if (status === "cancelled") move(variant, bin, "adjustment", got, picked + 3 * HOUR, user, { document: { kind: "outbound", id, reference } });
    }
  };

  for (let index = 0; index < 6; index += 1) expedition(60 + index, "shipped", 30 - index * 3, index % 2 ? "moussa" : "fatou", [["mug", 2, 2, "C-03-06"], ["baskets", 1, 1, "A-01-03"]]);
  expedition(81, "shipped", 9, "moussa", [["baskets", 2, 2, "A-01-03"], ["tshirt", 1, 1, "A-01-07"]]);
  expedition(82, "cancelled", 7, "aminata", [["mug", 10, 10, "C-03-06"]]);
  expedition(83, "shipped", 5, "fatou", [["casque", 3, 3, "B-02-05"], ["serum", 9, 9, "B-02-01"]]);
  expedition(84, "packed", 2, "aminata", [["casque", 2, 2, "B-02-05"], ["lunettes", 2, 2, "D-04-01"]]);
  expedition(85, "packed", 1, "moussa", [["mug", 2, 2, "C-03-06"], ["sac", 1, 1, "C-03-02"], ["carnet", 1, 1, "D-04-04"]]);
  expedition(86, "picking", 1, "moussa", [["sac", 4, 2, "C-03-02"], ["lunettes", 2, 0, null]]);
  expedition(87, "pending", 0, null, [["baskets", 12, 0, null], ["tshirt", 5, 0, null], ["serum", 3, 0, null]]);

  move("casque", "B-02-05", "adjustment", -6, now - 6 * DAY, "moussa", { reason: REASONS.DAMAGE });
  move("mug", "C-03-06", "adjustment", 1, now - 4 * DAY, "aminata", { reason: REASONS.INVENTORY_COUNT });
  move("tshirt", "A-01-07", "transfer", -10, now - 2 * DAY, "fatou", { reason: "Transfert entre casiers" });
  move("tshirt", "A-01-03", "transfer", 10, now - 2 * DAY, "fatou", { reason: "Transfert entre casiers" });

  // The quantity each bin held after each movement, over the whole journal.
  const held = new Map();
  for (const movement of [...movements].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))) {
    const key = `${movement.variant}|${movement.bin}`;
    movement.after = (held.get(key) ?? 0) + movement.quantity;
    held.set(key, movement.after);
  }

  const stock = Object.keys(VARIANTS).map((key) => {
    const bins = Object.keys(BINS)
      .map((code) => ({ code, warehouse: WAREHOUSES[BINS[code]].name, qty: held.get(`${key}|${code}`) ?? 0 }))
      .filter((bin) => bin.qty > 0);
    const total = bins.reduce((sum, bin) => sum + bin.qty, 0);
    const reserved = expeditions
      .filter((entry) => entry.status === "pending" || entry.status === "picking")
      .flatMap((entry) => entry.lines)
      .filter((line) => line.variant === key)
      .reduce((sum, line) => sum + Math.max(line.requested - line.got, 0), 0);
    const available = Math.max(total - reserved, 0);
    const threshold = VARIANTS[key].threshold;
    const last = movements.filter((movement) => movement.variant === key).sort((a, b) => b.at - a.at)[0];
    return { key, total, reserved, available, bins, last, state: available <= 0 ? "out_of_stock" : threshold && available <= threshold ? "low_stock" : "in_stock" };
  });

  return { movements: movements.sort((a, b) => b.at - a.at || b.id.localeCompare(a.id)), receptions: receptions.sort((a, b) => b.created - a.created), expeditions: expeditions.sort((a, b) => b.created - a.created), stock };
}

// ── Answers ─────────────────────────────────────────────────

const stockOut = (row) => {
  const variant = VARIANTS[row.key];
  return {
    variant_id: variant.id, product_id: variant.productId, product_name: variant.name, title: variant.title, sku: variant.sku, image_url: variant.image, is_fbs: true,
    total_qty: row.total, reserved_qty: row.reserved, available_qty: row.available, low_stock_threshold: variant.threshold, state: row.state, bins: row.bins,
    last_movement: row.last ? { type: row.last.type, type_label: TYPE_LABELS[row.last.type], at: iso(row.last.at) } : null,
  };
};

const sum = (lines, field) => lines.reduce((total, line) => total + line[field], 0);

const receptionOut = (row) => ({
  id: row.id, reference: row.reference, status: row.status, status_label: INBOUND_LABELS[row.status], warehouse: WAREHOUSES[row.warehouse],
  expected_at: row.expected, received_at: row.completed ? iso(row.completed) : null, lines_count: row.lines.length,
  units_expected: sum(row.lines, "expected"), units_received: sum(row.lines, "got"), created_at: iso(row.created),
});

const receptionDetail = (row) => ({
  ...receptionOut(row), notes: row.notes, store_name: "Boutique Awa", created_by: "Koffi B.",
  timeline: { created_at: iso(row.created), first_received_at: row.firstReceived ? iso(row.firstReceived) : null, completed_at: row.completed ? iso(row.completed) : null, cancelled_at: row.status === "cancelled" ? iso(row.created + DAY) : null },
  lines: row.lines.map((line) => ({ id: line.id, product_name: VARIANTS[line.variant].name, title: VARIANTS[line.variant].title, sku: VARIANTS[line.variant].sku, image_url: VARIANTS[line.variant].image, expected_qty: line.expected, received_qty: line.got, bin_code: line.bin })),
});

const expeditionOut = (row) => ({
  id: row.id, reference: row.reference, status: row.status, status_label: OUTBOUND_LABELS[row.status], warehouse: WAREHOUSES[row.warehouse],
  order: row.order, destination: { city: row.recipient.city, zone: row.recipient.zone }, lines_count: row.lines.length,
  units_requested: sum(row.lines, "requested"), units_picked: sum(row.lines, "got"), thumbnails: row.lines.slice(0, 4).map((line) => VARIANTS[line.variant].image),
  expected_ship_at: null, packed_at: row.packed ? iso(row.packed) : null, shipped_at: row.shipped ? iso(row.shipped) : null, created_at: iso(row.created),
});

const expeditionDetail = (row) => ({
  ...expeditionOut(row), recipient: row.recipient,
  timeline: { created_at: iso(row.created), picking_started_at: row.pickingStarted ? iso(row.pickingStarted) : null, packed_at: row.packed ? iso(row.packed) : null, shipped_at: row.shipped ? iso(row.shipped) : null, cancelled_at: row.cancelled ? iso(row.cancelled) : null },
  lines: row.lines.map((line) => ({ id: line.id, product_name: VARIANTS[line.variant].name, title: VARIANTS[line.variant].title, sku: VARIANTS[line.variant].sku, image_url: VARIANTS[line.variant].image, requested_qty: line.requested, picked_qty: line.got, bin_code: line.bin })),
});

const movementReason = (row) => row.reason ?? (row.document?.kind === "inbound" ? "Réception à l'entrepôt" : row.type === "outbound" ? "Préparation de commande" : row.document ? "Expédition annulée, stock remis en casier" : null);

const movementOut = (row) => {
  const variant = VARIANTS[row.variant];
  return {
    id: row.id, movement_type: row.type, type_label: TYPE_LABELS[row.type], quantity: row.quantity, before_qty: row.after - row.quantity, after_qty: row.after, bin_code: row.bin,
    variant: { id: variant.id, title: variant.title, sku: variant.sku, product_name: variant.name }, image_url: variant.image,
    performed_by: row.user ? USERS[row.user].name : null, reason: movementReason(row), document: row.document, created_at: iso(row.at),
  };
};

function paginate(rows, url, fallback) {
  const perPage = Math.max(1, Math.min(100, Number(url.searchParams.get("per_page")) || fallback));
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const total = rows.length;
  const slice = rows.slice((page - 1) * perPage, page * perPage);
  return { data: slice, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage, total, from: total ? (page - 1) * perPage + 1 : null, to: total ? (page - 1) * perPage + slice.length : null };
}

const invalid = (field) => [422, { message: `Le champ ${field} est invalide.`, errors: { [field]: [`Le champ ${field} est invalide.`] } }];
const isDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Laravel's validation of the filters every list shares; `null` when they pass. */
function refusal(url, rules) {
  const get = (name) => url.searchParams.get(name);
  for (const name of ["date_from", "date_to"]) if (get(name) && !isDay(get(name))) return invalid(name);
  if (get("date_from") && get("date_to") && get("date_to") < get("date_from")) return invalid("date_to");
  if (get("per_page") && !(Number(get("per_page")) >= 1 && Number(get("per_page")) <= 100)) return invalid("per_page");
  for (const [name, allowed] of Object.entries(rules)) if (get(name) && !allowed.includes(get(name))) return invalid(name);
  return null;
}

const within = (time, url) => {
  const from = url.searchParams.get("date_from");
  const to = url.searchParams.get("date_to");
  return (!from || day(time) >= from) && (!to || day(time) <= to);
};
const has = (text, term) => String(text ?? "").toLowerCase().includes(term);
const termOf = (url) => (url.searchParams.get("search") ?? "").trim().toLowerCase();
const variantMatches = (key, term) => has(VARIANTS[key].name, term) || has(VARIANTS[key].sku, term) || has(VARIANTS[key].title, term);

function csv(headings, rows) {
  const cell = (value) => (value === null || value === undefined ? "" : /[;"\n]/.test(String(value)) ? `"${String(value).replaceAll('"', '""')}"` : String(value));
  return `﻿${[headings, ...rows].map((row) => row.map(cell).join(";")).join("\n")}\n`;
}

const EMPTY = { movements: [], receptions: [], expeditions: [], stock: [] };

export default async function sugubox({ res, url, path, method, profile, send }) {
  if (!path.startsWith("/sellers/sugubox")) return false;
  const answer = (status, body) => (send(res, status, body), true);
  if (method !== "GET") return answer(405, { message: "Method not allowed." });
  if (profile.user_type !== "seller" || !profile.store) return answer(403, { message: "Aucune boutique associée à votre compte." });

  const now = fixtureNow();
  // The store of the fixture has a Sugu Box; any other seller has an empty one.
  const data = profile.store.id === 11 ? build(now) : EMPTY;
  const rest = path.slice("/sellers/sugubox".length);
  const term = termOf(url);
  const get = (name) => url.searchParams.get(name);
  const ok = (body, extra = {}) => answer(200, { success: true, data: body, ...extra });

  // ── Legacy routes, as SellerSuguBoxController answers them ──
  const legacyMovement = (row) => ({ id: row.id, movement_type: row.type, type_label: TYPE_LABELS[row.type], quantity: row.quantity, bin_code: row.bin, variant: { title: VARIANTS[row.variant].title, sku: VARIANTS[row.variant].sku, product_name: VARIANTS[row.variant].name }, reason_code: null, note: null, created_at: iso(row.at) });
  if (rest === "/overview") {
    return ok({
      total_variants_in_box: data.stock.filter((row) => row.total > 0).length, total_units_in_box: data.stock.reduce((total, row) => total + row.total, 0),
      pending_inbound_count: data.receptions.filter((row) => ["pending", "in_progress"].includes(row.status)).length,
      active_outbound_count: data.expeditions.filter((row) => ["picking", "packed"].includes(row.status)).length, recent_movements: data.movements.slice(0, 5).map(legacyMovement),
    });
  }
  if (rest === "/stock") return ok(data.stock.map((row) => ({ variant_id: VARIANTS[row.key].id, product_name: VARIANTS[row.key].name, title: VARIANTS[row.key].title, sku: VARIANTS[row.key].sku, global_qty: row.total, bins: row.bins.map((bin) => ({ bin_id: bin.code, bin_code: bin.code, zone: "Stockage", aisle: "Allée 1", warehouse: bin.warehouse, warehouse_id: "wh", qty: bin.qty })), fulfillment_type: "sugu_box", is_fbs: true })));
  if (rest === "/inbound") return ok(paginate(data.receptions.map(receptionOut), url, 10));
  if (rest === "/outbound") return ok(paginate(data.expeditions.map(expeditionOut), url, 10));
  if (rest === "/movements") return ok(paginate(data.movements.filter((row) => !get("type") || row.type === get("type")).map(legacyMovement), url, 25));
  const legacyInbound = /^\/inbound\/([^/]+)$/.exec(rest);
  if (legacyInbound) {
    const row = data.receptions.find((entry) => entry.id === legacyInbound[1]);
    return row ? ok({ ...receptionOut(row), notes: row.notes, lines: row.lines.map((line) => ({ id: line.id, variant: { id: VARIANTS[line.variant].id, title: VARIANTS[line.variant].title, sku: VARIANTS[line.variant].sku, product_name: VARIANTS[line.variant].name, price_amount: 0, currency: "XOF" }, expected_qty: line.expected, received_qty: line.got, bin_code: line.bin })) }) : answer(404, { message: "Not found." });
  }
  const legacyOutbound = /^\/outbound\/([^/]+)$/.exec(rest);
  if (legacyOutbound) {
    const row = data.expeditions.find((entry) => entry.id === legacyOutbound[1]);
    return row ? ok({ ...expeditionOut(row), notes: null, lines: row.lines.map((line) => ({ id: line.id, variant: { id: VARIANTS[line.variant].id, title: VARIANTS[line.variant].title, sku: VARIANTS[line.variant].sku, product_name: VARIANTS[line.variant].name }, requested_qty: line.requested, picked_qty: line.got, source_bin_code: null })) }) : answer(404, { message: "Not found." });
  }

  if (!rest.startsWith("/board/")) return answer(404, { message: "Not found." });
  const board = rest.slice("/board".length);

  if (board === "/summary") {
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);
    const startOfMonth = new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
    return ok({
      stock_units: data.stock.reduce((total, row) => total + row.total, 0),
      stock_variants: data.stock.filter((row) => row.total > 0).length,
      received_today_units: data.movements.filter((row) => row.type === "inbound" && row.at >= startOfDay).reduce((total, row) => total + row.quantity, 0),
      outbound_to_prepare: data.expeditions.filter((row) => ["pending", "picking"].includes(row.status)).length,
      orders_this_month: data.expeditions.filter((row) => row.created >= startOfMonth).length,
      alerts: data.stock.filter((row) => row.state !== "in_stock").length,
      recent_inbound: data.receptions.slice(0, 5).map(receptionOut),
      recent_outbound: data.expeditions.slice(0, 5).map(expeditionOut),
      stock_alerts: data.stock.filter((row) => row.state !== "in_stock").sort((a, b) => a.available - b.available).slice(0, 5).map(stockOut),
      recent_activity: data.movements.slice(0, 5).map(movementOut),
    });
  }

  if (board === "/filters") {
    const cities = [...new Set(data.expeditions.map((row) => row.recipient.city))].sort();
    const users = [...new Set(data.movements.map((row) => row.user).filter(Boolean))].map((key) => USERS[key]).sort((a, b) => a.name.localeCompare(b.name));
    return ok({ warehouses: data === EMPTY ? [] : Object.values(WAREHOUSES), users, cities });
  }

  if (board === "/stock" || board === "/stock/export") {
    const refused = refusal(url, { state: ["in_stock", "low_stock", "out_of_stock", "alerts"], sort: ["name", "-name", "available", "-available", "-last_movement"] });
    if (refused) return answer(...refused);
    const state = get("state");
    const warehouse = get("warehouse_id");
    const rows = data.stock
      .filter((row) => !term || variantMatches(row.key, term))
      .filter((row) => !state || (state === "alerts" ? row.state !== "in_stock" : row.state === state))
      .filter((row) => !warehouse || row.bins.some((bin) => Object.values(WAREHOUSES).find((entry) => entry.id === warehouse)?.name === bin.warehouse));
    const by = { "-name": (a, b) => VARIANTS[b.key].name.localeCompare(VARIANTS[a.key].name), available: (a, b) => a.available - b.available, "-available": (a, b) => b.available - a.available, "-last_movement": (a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0) };
    rows.sort(by[get("sort")] ?? ((a, b) => VARIANTS[a.key].name.localeCompare(VARIANTS[b.key].name)));
    if (board === "/stock/export") {
      res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="sugu-box-stock.csv"' });
      res.end(csv(["Produit", "Variante", "SKU", "Casiers", "Disponible", "Réservé", "Total", "Seuil d'alerte", "État"], rows.map((row) => [VARIANTS[row.key].name, VARIANTS[row.key].title, VARIANTS[row.key].sku, row.bins.map((bin) => `${bin.code} (${bin.qty})`).join(", "), row.available, row.reserved, row.total, VARIANTS[row.key].threshold, row.state])));
      return true;
    }
    return ok(paginate(rows.map(stockOut), url, 25));
  }

  if (board === "/inbound") {
    const refused = refusal(url, { status: Object.keys(INBOUND_LABELS), sort: ["created_at", "-created_at", "expected_at", "-expected_at"] });
    if (refused) return answer(...refused);
    const rows = data.receptions
      .filter((row) => !get("status") || row.status === get("status"))
      .filter((row) => !get("warehouse_id") || WAREHOUSES[row.warehouse].id === get("warehouse_id"))
      .filter((row) => within(row.created, url))
      .filter((row) => !term || has(row.reference, term) || row.lines.some((line) => variantMatches(line.variant, term)));
    const by = { created_at: (a, b) => a.created - b.created, expected_at: (a, b) => a.expected.localeCompare(b.expected), "-expected_at": (a, b) => b.expected.localeCompare(a.expected) };
    if (by[get("sort")]) rows.sort(by[get("sort")]);
    const month = now - 30 * DAY;
    return ok(paginate(rows.map(receptionOut), url, 10), {
      counts: { pending: data.receptions.filter((row) => row.status === "pending").length, in_progress: data.receptions.filter((row) => row.status === "in_progress").length, completed_last_30_days: data.receptions.filter((row) => row.status === "completed" && row.completed >= month).length },
    });
  }

  if (board === "/outbound") {
    const refused = refusal(url, { status: [...Object.keys(OUTBOUND_LABELS), "to_prepare"] });
    if (refused) return answer(...refused);
    const status = get("status");
    const rows = data.expeditions
      .filter((row) => !status || (status === "to_prepare" ? ["pending", "picking"].includes(row.status) : row.status === status))
      .filter((row) => !get("city") || row.recipient.city === get("city"))
      .filter((row) => within(row.created, url))
      .filter((row) => !term || has(row.reference, term) || has(row.order.number, term) || row.lines.some((line) => variantMatches(line.variant, term)));
    const count = (...statuses) => data.expeditions.filter((row) => statuses.includes(row.status)).length;
    return ok(paginate(rows.map(expeditionOut), url, 10), { counts: { to_prepare: count("pending", "picking"), packed: count("packed"), shipped: count("shipped"), cancelled: count("cancelled") } });
  }

  if (board === "/movements" || board === "/movements/export") {
    const refused = refusal(url, { type: Object.keys(TYPE_LABELS) });
    if (refused) return answer(...refused);
    const narrowed = data.movements
      .filter((row) => !get("warehouse_id") || WAREHOUSES[BINS[row.bin]]?.id === get("warehouse_id"))
      .filter((row) => !get("user_id") || (row.user && USERS[row.user].id === get("user_id")))
      .filter((row) => within(row.at, url))
      .filter((row) => !term || variantMatches(row.variant, term) || has(row.bin, term));
    const rows = narrowed.filter((row) => !get("type") || row.type === get("type"));
    if (board === "/movements/export") {
      res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="sugu-box-mouvements.csv"' });
      res.end(csv(["Date", "Produit", "Variante", "SKU", "Type", "Quantité", "Avant", "Après", "Casier", "Utilisateur", "Motif", "Document"], rows.map(movementOut).map((row) => [row.created_at, row.variant.product_name, row.variant.title, row.variant.sku, row.type_label, row.quantity, row.before_qty, row.after_qty, row.bin_code, row.performed_by, row.reason, row.document?.reference])));
      return true;
    }
    const totals = {};
    for (const type of Object.keys(TYPE_LABELS)) {
      const of = narrowed.filter((row) => row.type === type);
      totals[type] = { count: of.length, units: type === "transfer" ? of.reduce((total, row) => total + Math.max(row.quantity, 0), 0) : of.reduce((total, row) => total + row.quantity, 0) };
    }
    return ok(paginate(rows.map(movementOut), url, 25), { totals });
  }

  const inbound = /^\/inbound\/([^/]+)$/.exec(board);
  if (inbound) {
    const row = data.receptions.find((entry) => entry.id === inbound[1]);
    return row ? ok(receptionDetail(row)) : answer(404, { message: "Réception introuvable." });
  }
  const outbound = /^\/outbound\/([^/]+)$/.exec(board);
  if (outbound) {
    const row = data.expeditions.find((entry) => entry.id === outbound[1]);
    return row ? ok(expeditionDetail(row)) : answer(404, { message: "Expédition introuvable." });
  }

  return answer(404, { message: "Not found." });
}
