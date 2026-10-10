// Seller order endpoints for the V1 smoke (playwright.orders.config.ts),
// plugged into e2e/shell/mock-api.mjs. Payloads follow SellerOrderService
// (../sugu): amounts in francs, backend status codes, the same guards as the
// real endpoints. One independent data set per session token, so tests can
// mutate orders without seeing each other. Nothing here reaches a real backend.
//
// Tracking (V1.2). The orders the workflow tests mutate answer like a backend
// older than V1.2: `canonical_timeline` only. The `order-track-*` orders carry
// a `tracking` block that is NOT written here: it is read from
// laravel-order-tracking.json, produced by the Laravel projection itself
// (../sugu, tests/Feature/Orders/OrderTrackingProjectionTest.php).

import { readFileSync } from "node:fs";

const LARAVEL_TRACKING = JSON.parse(readFileSync(new URL("./laravel-order-tracking.json", import.meta.url), "utf8")).scenarios;

const STORE_ID = "store-11";
const HOUR = 3600_000;

const CUSTOMERS = [
  { name: "Awa Traoré", phone: "+22670112233", email: "awa@example.test" },
  { name: "Ousmane Zongo", phone: "+22676445566", email: "ousmane@example.test" },
  { name: "Fatoumata Compaoré", phone: "+22665778899", email: null },
  { name: "Ibrahim Sawadogo", phone: "+22670990011", email: "ibrahim@example.test" },
  { name: "Mariam Ouédraogo", phone: null, email: "mariam@example.test" },
];

const CATALOGUE = [
  { id: "prod-pagne", name: "Pagne tissé Faso Dan Fani", sku: "FDF-01", price: 7500, stock: 12, category: "Textile", imageUrl: "" },
  { id: "prod-savon", name: "Savon au beurre de karité", sku: "SAV-02", price: 1250, stock: 3, category: "Beauté", imageUrl: "" },
  { id: "prod-panier", name: "Panier tressé", sku: "PAN-03", price: 4000, stock: 0, category: "Maison", imageUrl: "" },
  // The server finds less stock than the catalogue search announced.
  { id: "prod-miel", name: "Miel de Fada", sku: "MIE-04", price: 3000, stock: 5, serverStock: 0, category: "Épicerie", imageUrl: "" },
];

const AGENCIES = [
  { id: "21", name: "Faso Express", code: "FASO", logoUrl: null, isActive: true },
  { id: "22", name: "Ouaga Livraison", code: "OUAGA", logoUrl: null, isActive: true },
  { id: "23", name: "Agence fermée", code: "OFF", logoUrl: null, isActive: false },
];

const CUSTOMER_FILE = [
  { id: "cust-1", fullName: "Awa Traoré", phone: "+22670112233", email: "awa@example.test" },
  { id: "cust-2", fullName: "Ousmane Zongo", phone: "+22676445566", email: null },
];

function order(sequence, overrides) {
  const customer = CUSTOMERS[sequence % CUSTOMERS.length];
  const unit = 2500 + (sequence % 7) * 1250;
  const quantity = 1 + (sequence % 3);
  const subtotal = unit * quantity;
  return {
    id: `order-${String(sequence).padStart(3, "0")}`,
    number: `SU-2026-${String(sequence).padStart(6, "0")}`,
    storeId: STORE_ID,
    createdAt: new Date(Date.now() - (80 - sequence) * 9 * HOUR).toISOString(),
    customer,
    direct: false,
    status: "delivered",
    paymentStatus: "paid",
    isCod: false,
    codFlow: null,
    codStep: null,
    deliveryFeePaid: false,
    productFeePaid: false,
    items: [{ id: `item-${sequence}-1`, name: "Pagne tissé Faso Dan Fani", variant: "Standard", quantity, price: unit, storeId: STORE_ID }],
    subtotal,
    deliveryFees: 1000,
    discount: 0,
    orderTotal: subtotal + 1000,
    address: { fullName: customer.name, phone: customer.phone, line1: `Secteur ${10 + (sequence % 20)}, rue ${sequence}.12`, line2: null, zone: null, city: "Ouagadougou", state: null, countryCode: "BF" },
    deliveryMethod: null,
    partner: null,
    shipmentStatus: null,
    courier: null,
    verified: false,
    note: null,
    pickup: null,
    timeline: [],
    ...overrides,
  };
}

const STATUS_CYCLE = ["delivered", "delivered", "canceled", "delivered", "returned", "delivered", "canceled", "delivered"];

/** 68 orders: 60 of volume, then the eight scenarios the tests act on. */
function seed() {
  const orders = [];
  for (let sequence = 1; sequence <= 60; sequence++) {
    orders.push(order(sequence, { status: STATUS_CYCLE[sequence % STATUS_CYCLE.length] }));
  }

  // The oldest order: only a server-side search can find it from page 1.
  orders[0] = order(1, {
    number: "SU-2026-000001",
    status: "delivered",
    customer: { name: "Salimata Kaboré", phone: "+22601020304", email: null },
  });

  orders.push(
    order(61, { id: "order-pending", status: "pending" }),
    order(62, { id: "order-confirmed", status: "confirmed" }),
    order(63, {
      id: "order-processing",
      status: "processing",
      partner: { id: "21", name: "Faso Express" },
      shipmentStatus: "assigned",
      courier: { name: "Moussa Kaboré", phone: "+22670000001" },
      pickup: { store_id: STORE_ID, pickup_code: "4821", status: "collected", vendor_handoff_at: null },
    }),
    order(64, {
      id: "order-shipped-marketplace",
      status: "shipped",
      partner: { id: "21", name: "Faso Express" },
      shipmentStatus: "in_transit",
      courier: { name: "Moussa Kaboré", phone: "+22670000001" },
    }),
    order(65, {
      id: "order-shipped-mixte",
      status: "shipped",
      isCod: true,
      codFlow: "mixte",
      codStep: "awaiting_product_payment",
      paymentStatus: "partial",
      deliveryFeePaid: true,
      productFeePaid: false,
      partner: { id: "22", name: "Ouaga Livraison" },
      shipmentStatus: "arrived",
    }),
    order(66, {
      id: "order-shipped-direct",
      status: "shipped",
      direct: true,
      isCod: true,
      codFlow: "legacy",
      paymentStatus: "cod_pending",
      deliveryMethod: "shipping",
      deliveryFees: 0,
      partner: { id: "21", name: "Faso Express" },
      shipmentStatus: "in_transit",
      note: "Appeler avant de passer",
    }),
    // The portal believes it can be delivered; the server knows a fee is unpaid.
    order(67, {
      id: "order-stale",
      status: "shipped",
      direct: true,
      deliveryMethod: "shipping",
      deliveryFees: 0,
      staleDelivery: true,
    }),
    order(68, {
      id: "order-counter-sale",
      status: "delivered",
      direct: true,
      deliveryMethod: "pickup",
      deliveryFees: 0,
      discount: 500,
      address: null,
    }),
  );

  for (const item of orders) {
    if (item.direct) item.orderTotal = item.subtotal - item.discount;
    item.timeline = timelineOf(item);
  }

  // An order of another store: must never be listed nor opened.
  orders.push(order(99, { id: "order-foreign", number: "SU-2026-009999", storeId: "store-other", status: "pending" }));
  return orders;
}

/**
 * `canonical_timeline` as OrderTimelineProjection::build answers it: its keys
 * and labels, reached steps only, the latest one `current`.
 */
function timelineOf(item) {
  const steps = [
    ["placed", "Commande reçue"],
    ["vendor_confirmed", "Stock confirmé"],
    ["preparing", "En préparation"],
    ["in_transit", "En livraison"],
    ["delivered", "Livrée"],
  ];
  const reached = ["pending", "confirmed", "processing", "shipped", "delivered"].indexOf(item.status);
  const step = (key, label, last) => ({
    key,
    label,
    status: last ? "current" : "done",
    timestamp: item.createdAt,
    store_id: null,
    actor_type: null,
    description: null,
  });
  if (item.status === "canceled") return [step("placed", "Commande reçue", false), step("canceled", "Annulée", true)];
  return steps.slice(0, Math.max(reached, 0) + 1).map(([key, label], index, all) => step(key, label, index === all.length - 1));
}

// One order per scenario of the Laravel fixture. They are opened by id only:
// they are not listed and not counted, so the list tests keep their numbers.
const TRACKED_AT = "2026-10-01T08:00:00.000000Z";
const TRACKED = {
  marketplace_pending: { status: "pending" },
  marketplace_collected: {
    status: "processing",
    partner: { id: "21", name: "Faso Express" },
    shipmentStatus: "assigned",
    courier: { name: "Moussa Kaboré", phone: "+22670000001" },
    pickup: { store_id: STORE_ID, pickup_code: "4821", status: "collected", vendor_handoff_at: null },
  },
  marketplace_delivered: { status: "delivered", partner: { id: "21", name: "Faso Express" }, shipmentStatus: "delivered" },
  delivered_without_history: { status: "delivered" },
  cod_mixte_product_unpaid: {
    status: "shipped",
    isCod: true,
    codFlow: "mixte",
    codStep: "awaiting_product_payment",
    paymentStatus: "partial",
    deliveryFeePaid: true,
    productFeePaid: false,
    partner: { id: "22", name: "Ouaga Livraison" },
    shipmentStatus: "arrived",
  },
  canceled: { status: "canceled" },
  delivery_failed: { status: "shipped", partner: { id: "21", name: "Faso Express" }, shipmentStatus: "delivery_failed" },
  counter_sale: { status: "delivered", direct: true, deliveryMethod: "pickup", deliveryFees: 0, address: null },
  direct_delivery: {
    status: "confirmed",
    direct: true,
    isCod: true,
    codFlow: "legacy",
    paymentStatus: "cod_pending",
    deliveryMethod: "shipping",
    deliveryFees: 0,
    partner: { id: "21", name: "Faso Express" },
    shipmentStatus: "pending",
  },
};

function trackedOrders() {
  return Object.entries(TRACKED).map(([scenario, overrides], index) => {
    const item = order(200 + index, { id: `order-track-${scenario}`, createdAt: TRACKED_AT, ...overrides });
    if (item.direct) item.orderTotal = item.subtotal - item.discount;
    item.timeline = timelineOf(item);
    item.tracking = LARAVEL_TRACKING[scenario];
    if (!item.tracking) throw new Error(`laravel-order-tracking.json has no scenario "${scenario}"`);
    return item;
  });
}

const states = new Map();
function stateOf(token) {
  if (!states.has(token)) states.set(token, { orders: seed(), tracked: trackedOrders(), sales: new Map(), nextNumber: 100 });
  return states.get(token);
}

// ── Projections (SellerOrderService::formatOrder / formatOrderDetails) ──

function actionsOf(item) {
  const feesSettled = item.codFlow !== "mixte" || (item.deliveryFeePaid && item.productFeePaid);
  const hasShipment = Boolean(item.shipmentStatus);
  return {
    confirm: item.status === "pending",
    cancel: !["delivered", "canceled", "returned"].includes(item.status),
    requestDelivery: ["confirmed", "processing"].includes(item.status),
    markShipped: ["confirmed", "processing", "packed"].includes(item.status),
    markDelivered: item.status === "shipped" && (item.direct || !hasShipment || item.verified) && feesSettled,
  };
}

const lineTotal = (item) => item.items.reduce((sum, line) => sum + line.price * line.quantity, 0);

function listRow(item) {
  return {
    id: item.id,
    reference: item.number,
    displayId: item.number,
    date: item.createdAt,
    customer: { name: item.customer.name, email: item.customer.email ?? "", phone: item.customer.phone, avatar: null },
    channel: item.direct ? ["direct", "manual"] : null,
    isSugu: !item.direct,
    isDirect: item.direct,
    actions: actionsOf(item),
    statusCode: item.status,
    status: item.status,
    paymentStatusCode: item.paymentStatus,
    is_cod: item.isCod,
    cod_flow_type: item.codFlow,
    cod_current_step: item.codFlow === "mixte" ? item.codStep : null,
    delivery_fee_paid: item.deliveryFeePaid,
    product_fee_paid: item.productFeePaid,
    itemCount: item.items.length,
    totalAmount: item.direct ? item.orderTotal : lineTotal(item),
    currency: "XOF",
    items: item.items.map((line) => ({ name: line.name, quantity: line.quantity, image: null })),
  };
}

function detail(item) {
  return {
    id: item.id,
    reference: item.number,
    createdAt: item.createdAt,
    channel: item.direct ? ["direct", "manual"] : null,
    isDirect: item.direct,
    statusCode: item.status,
    status: item.status,
    parties: {
      client: { id: "c", name: item.customer.name, role: "client", location: "Adresse inconnue", phone: item.customer.phone, email: item.customer.email },
      seller: { id: "current", name: "Boutique Awa", role: "seller", location: "Siège" },
      driver: null,
    },
    items: item.items.map((line) => ({
      id: line.id,
      name: line.name,
      variant: line.variant,
      quantity: line.quantity,
      price: line.price,
      total: line.price * line.quantity,
      status: "in_stock",
      image: null,
      storeId: line.storeId,
    })),
    pricing: {
      subtotal: lineTotal(item),
      deliveryFees: item.deliveryFees,
      discount: item.discount,
      tax: 0,
      total: lineTotal(item),
      orderTotal: item.orderTotal,
      currency: "XOF",
      paymentStatus: item.paymentStatus,
      paymentMethod: item.isCod ? "Cash (COD)" : "Mobile Money",
    },
    canonical_timeline: item.timeline,
    // Absent on the workflow orders, as on a backend older than V1.2.
    ...(item.tracking ? { tracking: item.tracking } : {}),
    cod_mixte:
      item.codFlow === "mixte"
        ? {
            isCodMixte: true,
            currentStep: item.codStep,
            deliveryFeePaid: item.deliveryFeePaid,
            productFeePaid: item.productFeePaid,
            deliveryFeeAmount: item.deliveryFees,
            productFeeAmount: item.orderTotal - item.deliveryFees,
            deliveryFeePaidAt: item.deliveryFeePaid ? item.createdAt : null,
            productFeePaidAt: null,
            vendorConfirmedAt: item.createdAt,
          }
        : null,
    delivery: {
      method: item.deliveryMethod,
      address: item.address,
      partner: item.partner,
      shipmentStatus: item.shipmentStatus,
      courier: item.courier,
      note: item.note,
    },
    actions: actionsOf(item),
  };
}

// ── Queries ─────────────────────────────────────────────────

const fold = (text) => (text ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function filtered(orders, params) {
  let rows = orders.filter((item) => item.storeId === STORE_ID);
  const status = params.get("status");
  if (status) rows = rows.filter((item) => item.status === status);
  const origin = params.get("origin");
  if (origin) rows = rows.filter((item) => item.direct === (origin === "direct"));
  const from = params.get("date_from");
  if (from) rows = rows.filter((item) => item.createdAt.slice(0, 10) >= from);
  const to = params.get("date_to");
  if (to) rows = rows.filter((item) => item.createdAt.slice(0, 10) <= to);
  const ids = params.getAll("ids[]");
  if (ids.length > 0) rows = rows.filter((item) => ids.includes(item.id));
  const search = fold(params.get("search"));
  if (search) {
    rows = rows.filter((item) =>
      [item.number, item.customer.name, item.customer.phone, item.customer.email].some((value) => fold(value).includes(search)),
    );
  }
  const direction = params.get("direction") === "asc" ? 1 : -1;
  const key = params.get("sort") === "amount" ? (item) => listRow(item).totalAmount : (item) => item.createdAt;
  return [...rows].sort((a, b) => (key(a) > key(b) ? direction : key(a) < key(b) ? -direction : 0));
}

function csvOf(rows) {
  const header = ["Référence", "Date", "Client", "Téléphone", "Statut", "Paiement", "Articles", "Détail", "Montant (FCFA)", "Origine"];
  const lines = rows.map((item) =>
    [
      item.number,
      item.createdAt.slice(0, 16).replace("T", " "),
      item.customer.name,
      item.customer.phone ?? "",
      item.status,
      item.paymentStatus,
      item.items.length,
      item.items.map((line) => `${line.quantity} x ${line.name}`).join(" | "),
      listRow(item).totalAmount,
      item.direct ? "Vente directe" : "Marketplace",
    ].join(";"),
  );
  return `﻿${[header.join(";"), ...lines].join("\n")}\n`;
}

// A valid one-page PDF, enough for a viewer to open.
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1",
);

const TRANSITIONS = {
  confirm: { flag: "confirm", to: "confirmed", refusal: "Cette commande ne peut pas être confirmée." },
  cancel: { flag: "cancel", to: "canceled", refusal: "Cette commande ne peut plus être annulée." },
  "request-delivery": { flag: "requestDelivery", to: "processing", refusal: "Cette commande ne peut pas être expédiée." },
  "mark-shipped": { flag: "markShipped", to: "shipped", refusal: "Cette commande ne peut pas être marquée comme expédiée." },
  "mark-delivered": { flag: "markDelivered", to: "delivered", refusal: "Cette commande ne peut être marquée comme livrée que si elle est expédiée." },
};

export default async function ordersExtension({ req, res, url, path, method, token, send, readJson }) {
  const state = stateOf(token);
  const own = (id) => [...state.orders, ...state.tracked].find((item) => item.id === id && item.storeId === STORE_ID);
  const notFound = () => send(res, 404, { success: false, message: "Commande non trouvée." });

  // ── Manual sale ──
  if (method === "GET" && path === "/sellers/sales/products/search") {
    const query = fold(url.searchParams.get("q"));
    const data = CATALOGUE.filter((product) => fold(`${product.name} ${product.sku}`).includes(query)).map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: product.stock,
      category: product.category,
      imageUrl: product.imageUrl,
    }));
    return send(res, 200, { success: true, data }), true;
  }
  if (method === "GET" && path === "/sellers/customers") {
    const query = fold(url.searchParams.get("search"));
    const data = CUSTOMER_FILE.filter((customer) => fold(`${customer.fullName} ${customer.phone} ${customer.email}`).includes(query));
    return send(res, 200, { success: true, data }), true;
  }
  if (method === "GET" && path === "/agencies") {
    return send(res, 200, { success: true, data: { partners: AGENCIES, pagination: { total: AGENCIES.length } } }), true;
  }
  if (method === "POST" && path === "/sellers/sales") {
    const body = await readJson(req);
    const key = req.headers["idempotency-key"];
    if (key && state.sales.has(key)) {
      const existing = state.sales.get(key);
      return send(res, 200, { success: true, data: { id: existing.id, reference: existing.number, status: existing.status, success: true } }), true;
    }

    const errors = {};
    const lines = (body.products ?? []).reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    if (!body.products?.length) errors.products = ["Au moins un produit est requis."];
    if (Math.abs(lines - body.subtotal) > 0.01) errors.subtotal = ["Le sous-total ne correspond pas aux articles."];
    if ((body.discount ?? 0) > body.subtotal) errors.discount = ["La remise ne peut pas dépasser le sous-total."];
    if (Math.abs(body.subtotal + (body.tax ?? 0) - (body.discount ?? 0) - body.total) > 0.01) {
      errors.total = ["Le total ne correspond pas au sous-total, à la taxe et à la remise."];
    }
    const phone = (body.client?.phone ?? "").replace(/\D/g, "");
    if (body.client && phone.length !== 8) {
      errors["client.phone"] = ["Le numéro de téléphone pour le Burkina Faso doit comporter exactement 8 chiffres."];
    }
    if (body.delivery?.method === "shipping" && !body.delivery.provider) errors["delivery.provider"] = ["L'agence est requise."];
    if (Object.keys(errors).length > 0) {
      return send(res, 422, { message: Object.values(errors)[0][0], errors }), true;
    }

    for (const line of body.products) {
      const product = CATALOGUE.find((candidate) => candidate.id === line.productId);
      const available = product?.serverStock ?? product?.stock ?? 0;
      if (available < line.quantity) {
        return (
          send(res, 400, {
            success: false,
            message: `Stock insuffisant pour '${product?.name}' (disponible: ${available}, demandé: ${line.quantity}).`,
          }),
          true
        );
      }
    }

    const sequence = state.nextNumber++;
    const shipping = body.delivery?.method === "shipping";
    const customer = body.customerId
      ? CUSTOMER_FILE.find((candidate) => candidate.id === body.customerId)
      : { fullName: body.client.fullName, phone: `+226${phone}`, email: body.client.email ?? null };
    const created = order(sequence, {
      id: `order-sale-${sequence}`,
      createdAt: new Date().toISOString(),
      customer: { name: customer.fullName, phone: customer.phone, email: customer.email },
      direct: true,
      status: shipping ? "confirmed" : "delivered",
      paymentStatus: shipping ? "cod_pending" : "paid",
      isCod: shipping,
      codFlow: shipping ? "legacy" : null,
      items: body.products.map((line, index) => ({
        id: `sale-${sequence}-${index}`,
        name: CATALOGUE.find((candidate) => candidate.id === line.productId).name,
        variant: "Standard",
        quantity: line.quantity,
        price: line.unitPrice,
        storeId: STORE_ID,
      })),
      subtotal: body.subtotal,
      deliveryFees: 0,
      discount: body.discount ?? 0,
      orderTotal: body.total,
      deliveryMethod: body.delivery?.method ?? null,
      partner: shipping ? AGENCIES.find((agency) => agency.id === body.delivery.provider) : null,
      shipmentStatus: shipping ? "pending" : null,
      address: shipping
        ? { fullName: customer.fullName, phone: customer.phone, line1: body.delivery.address.line1, line2: null, zone: null, city: body.delivery.address.city ?? null, state: null, countryCode: "BF" }
        : null,
      note: body.note ?? null,
    });
    created.timeline = timelineOf(created);
    state.orders.push(created);
    if (key) state.sales.set(key, created);
    return send(res, 201, { success: true, data: { id: created.id, reference: created.number, status: created.status, success: true } }), true;
  }

  if (!path.startsWith("/sellers/orders")) return false;

  // ── List, counters, export ──
  if (method === "GET" && path === "/sellers/orders") {
    const rows = filtered(state.orders, url.searchParams);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(url.searchParams.get("limit") ?? 10));
    const data = rows.slice((page - 1) * limit, page * limit).map(listRow);
    return send(res, 200, { success: true, data: { data, total: rows.length, page, perPage: limit } }), true;
  }
  if (method === "GET" && path === "/sellers/orders/stats") {
    const mine = state.orders.filter((item) => item.storeId === STORE_ID);
    const byStatus = Object.fromEntries(
      ["pending", "awaiting_payment", "confirmed", "processing", "packed", "shipped", "delivered", "canceled", "returned", "failed"].map(
        (code) => [code, mine.filter((item) => item.status === code).length],
      ),
    );
    return send(res, 200, { success: true, data: { total: mine.length, canceled: byStatus.canceled, byStatus } }), true;
  }
  if (method === "POST" && path === "/sellers/orders/export") {
    const body = await readJson(req);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) value.forEach((entry) => params.append(`${key}[]`, entry));
      else if (value !== undefined && value !== null) params.set(key, String(value));
    }
    res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": 'attachment; filename="commandes.csv"' });
    res.end(csvOf(filtered(state.orders, params)));
    return true;
  }

  // ── One order ──
  const match = path.match(/^\/sellers\/orders\/([^/]+)(?:\/(.+))?$/);
  if (!match) return false;
  const [, id, rest] = match;
  const item = own(id);
  if (!item) return notFound(), true;

  if (method === "GET" && !rest) return send(res, 200, { success: true, data: { order: detail(item) } }), true;

  if (method === "GET" && rest === "pickup-code") {
    if (!item.pickup) return send(res, 404, { success: false, message: "Code disponible après acceptation coursier." }), true;
    return send(res, 200, { success: true, data: { codes: [item.pickup] } }), true;
  }
  if (method === "GET" && rest === "delivery-slip") {
    res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="bon-livraison-${item.number}.pdf"` });
    res.end(PDF);
    return true;
  }
  if (method === "GET" && rest === "invoice") {
    return send(res, 200, { success: true, access_token: `tok-${item.id}`, invoice_number: `FAC-${item.number}` }), true;
  }

  const handoff = rest?.match(/^items\/([^/]+)\/confirm-handoff$/);
  if (method === "POST" && handoff) {
    if (!item.pickup || item.pickup.status !== "collected") {
      return send(res, 409, { success: false, message: "SUGU-HANDOFF-SEQUENCE: Le coursier doit d'abord confirmer la collecte avant que vous puissiez confirmer la remise.", error_code: "SUGU-HANDOFF-SEQUENCE" }), true;
    }
    item.pickup.vendor_handoff_at = new Date().toISOString();
    return send(res, 200, { success: true, data: { vendor_handoff_at: item.pickup.vendor_handoff_at } }), true;
  }

  const transition = method === "POST" ? TRANSITIONS[rest] : null;
  if (transition) {
    if (rest === "mark-delivered" && item.staleDelivery) {
      return send(res, 422, { success: false, message: "SUGU-COD-MIXTE-FEES-UNPAID: les frais de livraison et de produit doivent être payés avant la livraison." }), true;
    }
    if (!actionsOf(item)[transition.flag]) return send(res, 400, { success: false, message: transition.refusal }), true;
    item.status = transition.to;
    if (rest === "request-delivery" && !item.shipmentStatus) item.shipmentStatus = "pending";
    if (rest === "mark-delivered" && item.paymentStatus === "cod_pending") item.paymentStatus = "paid";
    item.timeline = timelineOf(item);
    return send(res, 200, { success: true, message: "OK" }), true;
  }

  return false;
}
