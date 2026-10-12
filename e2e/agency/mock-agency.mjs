// Agency endpoints for the V3 smoke (playwright.agency.config.ts), plugged
// into e2e/shell/mock-api.mjs. Payloads and rules follow AgencyShipmentService,
// AgencyShipmentController, CourierManagementController,
// AgencyCourierOverviewService and AgencyDashboardController (../sugu):
// amounts in centimes, the transitions an agency may make, the acceptance
// guard, the refusals with their SUGU codes, the counters that are the size
// of the list their filter returns. One independent data set per session
// token, so tests can mutate deliveries and couriers without seeing each
// other. Nothing here reaches a real backend.

const AGENCY_ID = "21";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * The moment the data set is built around: today at 16:00, whatever the hour
 * the suite runs at. The specs fix the browser clock on the same moment
 * (e2e/agency/helpers.ts), so "today", "late" and "il y a 5 min" hold.
 */
export function fixtureNow() {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now.getTime();
}

const NOT_STARTED = ["pending", "awaiting_fee_payment"];
const ON_THE_WAY = ["assigned", "picked_up", "in_transit", "arrived"];
const REASSIGN_BLOCKED = ["picked_up", "in_transit", "arrived", "delivered", "delivery_failed"];
const STATUSES = ["pending", "awaiting_fee_payment", "assigned", "picked_up", "in_transit", "arrived", "delivery_failed", "delivered"];
const TRANSITIONS = {
  pending: ["assigned", "delivery_failed"],
  assigned: ["in_transit", "pending", "delivery_failed"],
  in_transit: ["delivered", "delivery_failed"],
  delivered: [],
  delivery_failed: ["pending", "assigned"],
};

const iso = (time) => (time === null || time === undefined ? null : new Date(time).toISOString());
const day = (time) => new Date(time).toDateString();

// ── Seed ────────────────────────────────────────────────────

const ZONES = [
  { id: "zone-centre", name: "Centre" },
  { id: "zone-nord", name: "Nord" },
  { id: "zone-sud", name: "Sud" },
  { id: "zone-est", name: "Est" },
];

const COURIERS = [
  // [name, matricule, quartier, vehicle, plate, status, is_active, kyc, total, completed, rating, ratings]
  ["Moussa Kaboré", "LV-001", "Gounghin", "moto", "11 KK 4521", 1, true, true, 584, 566, 4.7, 128],
  ["Fatou Sawadogo", "LV-002", "Dassasgho", "moto", "11 JH 2087", 1, true, true, 312, 296, 4.8, 77],
  ["Ibrahim Ouédraogo", "LV-003", "Tampouy", "motorcycle", "11 LM 9034", 1, true, true, 448, 448, 4.9, 102],
  ["Aminata Traoré", "LV-004", "Pissy", "velo", null, 1, false, true, 120, 108, 4.5, 31],
  ["Salif Compaoré", "LV-005", "Cissin", "tricycle", "11 TR 0412", 1, true, true, 205, 189, 4.4, 40],
  ["Cheick Zongo", "LV-006", "Wemtenga", "moto", "11 GG 7720", 4, false, false, 0, 0, null, 0],
  ["Awa Ilboudo", "LV-007", "Karpala", "voiture", "11 AB 3310", 1, true, true, 96, 70, 3.9, 22],
  ["Mamadou Sanou", "LV-008", "Gounghin", "moto", "11 HH 6105", 2, false, true, 64, 41, 3.6, 15],
];

const RECIPIENTS = [
  ["Amadou Diallo", "+226 70 12 34 56", "Avenue Kwame Nkrumah, immeuble Nabonswendé", "zone-centre"],
  ["Fatoumata Sankara", "+226 76 23 45 67", "Rue 12.34, secteur 12, porte 418", "zone-nord"],
  ["Sophie Martin", "+226 78 34 56 78", "Ouaga 2000, cité Azimmo, villa 27", "zone-sud"],
  ["Cheick Barro", "+226 77 45 67 89", "Boulevard Charles de Gaulle, face à la pharmacie Wend-Kuni", "zone-est"],
  ["Ndèye Sokhna Ba", "+226 70 56 78 90", "Tanghin, rue 23.17, après le maquis Le Verdoyant", "zone-nord"],
  ["Mamadou Bâ", "+226 76 11 22 33", "Patte d'Oie, rue 15.42", "zone-sud"],
  ["Awa Ndiaye", "+226 77 22 33 44", "Zone du Bois, résidence Les Flamboyants", "zone-est"],
  ["Oumar Sy", "+226 78 44 55 66", "Koulouba, avenue de l'Indépendance", "zone-centre"],
  ["Bineta Kané", "+226 70 33 44 55", "Somgandé, cité SOCOGIB, villa 112", "zone-nord"],
  ["Moustapha Dieng", "+226 77 99 88 77", "Dapoya, rue 3.21", "zone-centre"],
  ["Rasmata Zoungrana", "+226 71 20 30 40", "Kossodo, zone industrielle, lot 14", null],
  ["Jean-Baptiste Nikiéma", "+226 75 60 70 80", "Balkuy, non loin du CSPS", "zone-sud"],
];

const STORES = ["Atelier Wend-Kuni", "Boutique Faso Dan Fani", "Karité du Kadiogo", "Maison Sika"];

/**
 * The shipments of the fixture, in the order they were created (oldest last).
 * Each line: [status, courier index or null, minutes since creation, options].
 */
const SHIPMENTS = [
  // Requests the agency has not decided on.
  ["pending", null, 12, { accepted: false }],
  ["pending", null, 41, { accepted: false, cod: [false, false] }],
  ["pending", null, 95, { accepted: false }],
  // Accepted, waiting for a courier.
  ["pending", null, 18, {}],
  ["pending", null, 52, { priority: 20 }],
  ["pending", null, 77, { manual: true }],
  ["pending", null, 130, { etaIn: -25 }],
  ["pending", null, 160, {}],
  ["awaiting_fee_payment", null, 64, { cod: [false, false] }],
  // With a courier.
  ["assigned", 0, 48, {}],
  ["assigned", 1, 70, { etaIn: 40 }],
  ["assigned", 4, 115, { etaIn: -50 }],
  ["assigned", 2, 150, { manual: true }],
  ["picked_up", 1, 88, {}],
  ["picked_up", 4, 102, { cod: [true, false] }],
  ["in_transit", 0, 96, { etaIn: 8, position: true }],
  ["in_transit", 2, 110, { etaIn: 25 }],
  ["in_transit", 4, 140, { etaIn: -15 }],
  ["in_transit", 1, 175, {}],
  ["in_transit", 2, 190, { manual: true }],
  ["arrived", 0, 205, {}],
  // Failed attempts.
  ["delivery_failed", 6, 180, { failedAgo: 35 }],
  ["delivery_failed", 1, 260, { failedAgo: 120 }],
  ["delivery_failed", 4, 30 * 60, { failedAgo: 26 * 60 }],
  // Delivered today.
  ["delivered", 0, 420, { deliveredAgo: 20 }],
  ["delivered", 0, 440, { deliveredAgo: 95 }],
  ["delivered", 1, 400, { deliveredAgo: 150 }],
  ["delivered", 2, 460, { deliveredAgo: 200, cod: [true, true] }],
  ["delivered", 2, 455, { deliveredAgo: 250 }],
  ["delivered", 4, 470, { deliveredAgo: 330 }],
  // Delivered before today.
  ["delivered", 0, 28 * 60, { deliveredAgo: 26 * 60 }],
  ["delivered", 1, 29 * 60, { deliveredAgo: 27 * 60 }],
  ["delivered", 2, 30 * 60, { deliveredAgo: 28 * 60 }],
  ["delivered", 6, 52 * 60, { deliveredAgo: 50 * 60 }],
];

function seed() {
  const now = fixtureNow();

  const couriers = COURIERS.map(([name, employeeId, quartier, vehicleType, plate, status, isActive, kyc, total, completed, rating, ratings], index) => ({
    id: `courier-${index + 1}`,
    user_id: `user-${index + 1}`,
    name,
    email: `${employeeId.toLowerCase()}@faso-express.test`,
    phone: `+226 7${index} ${10 + index} ${20 + index} ${30 + index}`,
    employee_id: employeeId,
    vehicle_type: vehicleType,
    vehicle_plate: plate,
    status,
    is_active: isActive,
    kyc_verified: kyc,
    kyc_verified_at: kyc ? iso(now - (200 + index * 30) * DAY) : null,
    suspended_until: null,
    total_deliveries: total,
    completed_deliveries: completed,
    failed_deliveries: total - completed,
    rating_avg: rating,
    rating_count: ratings,
    hired_at: new Date(now - (220 + index * 130) * DAY).toISOString().slice(0, 10),
    // One courier stopped delivering nine days ago; one never delivered.
    last_delivery_at: total === 0 ? null : new Date(now - (index === 6 ? 9 : 0) * DAY).toISOString().slice(0, 10),
    created_at: iso(now - (220 + index * 130) * DAY),
    commission_rate_override: index === 0 ? 75 : null,
    metadata: {
      quartier,
      address: `${quartier}, Ouagadougou`,
      vehicle_make: vehicleType === "velo" ? null : ["Yamaha YBR 125", "Haojue 115", "Rato 150", null, "Apsonic AP150ZH", "Sanili 125", "Toyota Corolla", "Yamaha Crypton"][index],
      vehicle_color: ["Noir", "Rouge", "Bleu", null, "Vert", "Gris", "Blanc", "Noir"][index],
      vehicle_year: ["2022", "2021", "2023", null, "2020", "2024", "2015", "2019"][index],
      date_of_birth: `199${index}-0${1 + (index % 8)}-1${index}`,
      gender: index % 2 === 0 ? "homme" : "femme",
    },
    documents: kyc
      ? [
          { id: `doc-${index}-1`, document_type: "id_card", document_name: "CNIB", document_number: `B ${1000000 + index * 4321}`, expires_on: new Date(now + (index === 1 ? 5 : 900) * DAY).toISOString().slice(0, 10), status: 1 },
          { id: `doc-${index}-2`, document_type: "driver_license", document_name: "Permis A", document_number: `P-${77000 + index}`, expires_on: new Date(now + (index === 4 ? -3 : index === 2 ? 21 : 700) * DAY).toISOString().slice(0, 10), status: 1 },
        ]
      : [{ id: `doc-${index}-1`, document_type: "id_card", document_name: "CNIB", document_number: `B ${1000000 + index * 4321}`, expires_on: null, status: 0 }],
  }));

  const shipments = SHIPMENTS.map(([status, courierIndex, minutesAgo, options], index) => {
    const [recipient, phone, line1, zoneId] = RECIPIENTS[index % RECIPIENTS.length];
    const createdAt = now - minutesAgo * MIN;
    const fee = (1000 + (index % 7) * 500) * 100;
    const total = (6000 + (index % 9) * 2500) * 100;
    const manual = Boolean(options.manual);
    const courier = courierIndex === null ? null : couriers[courierIndex];
    const deliveredAt = options.deliveredAgo !== undefined ? now - options.deliveredAgo * MIN : null;
    const failedAt = options.failedAgo !== undefined ? now - options.failedAgo * MIN : null;
    const collected = ["picked_up", "in_transit", "arrived", "delivered"].includes(status);
    const statusUpdatedAt = deliveredAt ?? failedAt ?? createdAt + Math.min(minutesAgo - 2, 20) * MIN;

    return {
      id: `ship-${String(index + 1).padStart(2, "0")}`,
      number: manual ? `AG-${(0x4f21 + index * 977).toString(16).toUpperCase().padStart(8, "K")}` : `SU-2026-${String(78452 - index).padStart(6, "0")}`,
      status,
      manual,
      accepted_at: options.accepted === false ? null : createdAt + 4 * MIN,
      courier_user_id: courier?.user_id ?? null,
      recipient,
      phone,
      email: index % 3 === 0 ? `${recipient.toLowerCase().replace(/[^a-z]+/g, ".")}@example.test` : null,
      line1,
      line2: index % 4 === 0 ? "2e étage, porte gauche" : null,
      city: "Ouagadougou",
      zone_id: zoneId,
      store: manual ? null : STORES[index % STORES.length],
      vendor_name: manual ? "Pressing Le Baobab" : null,
      pickup_address: manual ? "Avenue Yennenga, face à la gare routière" : `Marché de ${["Rood-Woko", "Sankaryaré", "Gounghin", "Pissy"][index % 4]}, allée ${1 + (index % 6)}`,
      pickup_phone: manual ? "+226 25 30 40 50" : null,
      shipping_amount: fee,
      total_amount: total,
      items_count: 1 + (index % 3),
      payment_status: options.cod ? "pending" : index % 5 === 3 ? "pending" : "paid",
      payment_method: manual ? "cash" : index % 2 === 0 ? "mobile_money" : "cash",
      cod: options.cod ? { delivery: options.cod[0], product: options.cod[1], deliveryFee: fee } : null,
      priority: options.priority ?? (index % 11 === 5 ? 150 : 100),
      notes: index % 6 === 2 ? "Appeler avant de passer : le portail est fermé." : null,
      instructions: manual ? "À côté de la banque, immeuble beige avec portail noir." : null,
      eta: options.etaIn !== undefined ? now + options.etaIn * MIN : null,
      schedule: manual ? { date: new Date(now).toISOString().slice(0, 10), from: "14:00", to: "17:00" } : null,
      created_at: createdAt,
      status_updated_at: statusUpdatedAt,
      picked_at: collected ? createdAt + Math.round(minutesAgo * 0.4) * MIN : null,
      delivered_at: status === "delivered" ? deliveredAt : null,
      refusal_reason: null,
      position: options.position ? { lat: 12.3657, lng: -1.5339, at: now - 3 * MIN } : null,
      // The agency's own assignment writes no tracking event: only what the courier's phone reported is dated.
      events: status === "in_transit" || status === "arrived" || status === "delivered" ? [{ status: "in_transit", at: createdAt + Math.round(minutesAgo * 0.5) * MIN }] : [],
      internal_notes:
        index === 15
          ? [{ id: "note-1", memo: "Le client préfère un appel dix minutes avant l'arrivée.", noted_at: iso(now - 40 * MIN), author: "Manager" }]
          : [],
    };
  });

  return { couriers, shipments, sequence: 1, received: [] };
}

const sets = new Map();
const setOf = (token) => {
  if (!sets.has(token)) sets.set(token, seed());
  return sets.get(token);
};

// ── Shipments: rows ─────────────────────────────────────────

const courierByUser = (set, userId) => set.couriers.find((courier) => courier.user_id === userId) ?? null;
const isLate = (shipment) => [...NOT_STARTED, ...ON_THE_WAY].includes(shipment.status) && shipment.eta !== null && shipment.eta < fixtureNow();
const awaitingDecision = (shipment) => shipment.accepted_at === null && NOT_STARTED.includes(shipment.status);

/** The code of the refusal an assignment would meet, or null (AgencyShipmentService::assignRefusal). */
function assignRefusal(shipment) {
  if (shipment.accepted_at === null) return "SUGU-AGENCY-NOT-ACCEPTED";
  return ["pending", "awaiting_fee_payment", "delivery_failed"].includes(shipment.status) ? null : "SUGU-ASSIGN-INVALID-STATUS";
}

function row(set, shipment) {
  const courier = courierByUser(set, shipment.courier_user_id);
  const zone = ZONES.find((entry) => entry.id === shipment.zone_id) ?? null;
  return {
    id: shipment.id,
    order: {
      id: `order-${shipment.id}`,
      order_number: shipment.number,
      items_count: shipment.items_count,
      total: shipment.total_amount,
      payment_status: shipment.payment_status,
      shipping_address: { name: shipment.recipient, phone: shipment.phone, line1: shipment.line1, city: shipment.city },
      store: shipment.store ? { id: "store-1", name: shipment.store, slug: null, address_line1: shipment.pickup_address } : null,
      delivery_notes: shipment.notes,
    },
    courier: courier
      ? {
          id: courier.id,
          user_id: courier.user_id,
          name: courier.name,
          phone: courier.phone,
          vehicle_type: courier.vehicle_type,
          average_rating: courier.rating_avg,
          is_available: courier.is_active,
        }
      : null,
    status: shipment.status,
    shipping_amount: shipment.shipping_amount,
    items_count: shipment.items_count,
    eta: iso(shipment.eta),
    picked_at: iso(shipment.picked_at),
    delivered_at: iso(shipment.delivered_at),
    created_at: iso(shipment.created_at),
    priority: shipment.priority,
    cod_mixte: shipment.cod
      ? {
          isCodMixte: true,
          currentStep: "awaiting_delivery_payment",
          deliveryFeePaid: shipment.cod.delivery,
          productFeePaid: shipment.cod.product,
          deliveryFeeAmount: shipment.cod.deliveryFee,
          productFeeAmount: shipment.total_amount - shipment.cod.deliveryFee,
        }
      : null,
    agency_accepted_at: iso(shipment.accepted_at),
    agency_refused_at: null,
    agency_refusal_reason: shipment.refusal_reason,
    zone: zone ? { id: zone.id, name: zone.name } : null,
    source: shipment.manual ? "agency_manual" : "marketplace",
    pickup: { name: shipment.manual ? shipment.vendor_name : shipment.store, address: shipment.pickup_address, phone: shipment.pickup_phone },
    late: isLate(shipment),
    awaiting_decision: awaitingDecision(shipment),
    next_statuses: TRANSITIONS[shipment.status] ?? [],
    can_assign: assignRefusal(shipment) === null,
    can_reassign: shipment.courier_user_id !== null && !REASSIGN_BLOCKED.includes(shipment.status),
  };
}

const inScope = (shipment, scope) => {
  const today = day(fixtureNow());
  switch (scope) {
    case "awaiting_decision":
      return awaitingDecision(shipment);
    case "to_assign":
      return shipment.accepted_at !== null && shipment.status === "pending";
    case "on_the_way":
      return ON_THE_WAY.includes(shipment.status);
    case "delivered_today":
      return shipment.status === "delivered" && day(shipment.delivered_at) === today;
    case "failed":
      return shipment.status === "delivery_failed";
    case "late":
      return isLate(shipment);
    // What the dashboard counts as pressing: any of its four reasons.
    case "needs_action":
      return ["late", "awaiting_decision", "to_assign", "failed"].some((reason) => inScope(shipment, reason));
    default:
      return true;
  }
};

function overviewOf(set) {
  const count = (scope) => set.shipments.filter((shipment) => inScope(shipment, scope)).length;
  const yesterday = day(fixtureNow() - DAY);
  return {
    awaitingDecision: count("awaiting_decision"),
    toAssign: count("to_assign"),
    onTheWay: count("on_the_way"),
    deliveredToday: count("delivered_today"),
    deliveredYesterday: set.shipments.filter((shipment) => shipment.status === "delivered" && day(shipment.delivered_at) === yesterday).length,
    failed: count("failed"),
    late: count("late"),
  };
}

function filtered(set, params) {
  const now = fixtureNow();
  let rows = [...set.shipments];

  const status = params.get("status");
  if (STATUSES.includes(status)) rows = rows.filter((shipment) => shipment.status === status);
  rows = rows.filter((shipment) => inScope(shipment, params.get("scope")));

  const search = (params.get("search") ?? "").trim().toLowerCase();
  if (search) {
    rows = rows.filter((shipment) =>
      [shipment.number, shipment.recipient, shipment.phone, courierByUser(set, shipment.courier_user_id)?.name ?? ""].some((value) => value.toLowerCase().includes(search)),
    );
  }

  if (params.get("courier_id")) rows = rows.filter((shipment) => shipment.courier_user_id === params.get("courier_id"));
  if (params.get("zone_id")) rows = rows.filter((shipment) => shipment.zone_id === params.get("zone_id"));

  const date = params.get("date");
  if (date === "today") rows = rows.filter((shipment) => day(shipment.created_at) === day(now));
  if (date === "yesterday") rows = rows.filter((shipment) => day(shipment.created_at) === day(now - DAY));
  if (date === "week") rows = rows.filter((shipment) => shipment.created_at >= now - 7 * DAY);

  const priority = params.get("priority");
  if (priority === "urgent") rows = rows.filter((shipment) => shipment.priority <= 30);
  if (priority === "normal") rows = rows.filter((shipment) => shipment.priority > 30 && shipment.priority <= 100);
  if (priority === "low") rows = rows.filter((shipment) => shipment.priority > 100);

  const sort = ["created_at", "status", "eta", "shipping_amount"].includes(params.get("sort")) ? params.get("sort") : "created_at";
  const direction = params.get("direction") === "asc" ? 1 : -1;
  const value = (shipment) => (sort === "status" ? shipment.status : (shipment[sort] ?? 0));
  rows.sort((a, b) => {
    const [left, right] = [value(a), value(b)];
    const order = left < right ? -1 : left > right ? 1 : a.id < b.id ? -1 : 1;
    return order * direction;
  });

  return rows;
}

function listShipments(set, params) {
  const rows = filtered(set, params);
  const perPage = Math.max(1, Math.min(Number(params.get("per_page")) || 12, 50));
  const page = Math.max(1, Number(params.get("page")) || 1);

  const statusCounts = { all: set.shipments.length };
  for (const status of STATUSES) statusCounts[status] = set.shipments.filter((shipment) => shipment.status === status).length;

  const zoneCounts = ZONES.map((zone) => ({ ...zone, count: set.shipments.filter((shipment) => shipment.zone_id === zone.id).length })).filter((zone) => zone.count > 0);

  return {
    summary: {},
    statusCounts,
    overview: overviewOf(set),
    zones: zoneCounts,
    shipments: rows.slice((page - 1) * perPage, page * perPage).map((shipment) => row(set, shipment)),
    pagination: { current_page: page, last_page: Math.max(1, Math.ceil(rows.length / perPage)), per_page: perPage, total: rows.length },
  };
}

/** AgencyShipmentService::journeyOf. */
function journeyOf(shipment) {
  const { status } = shipment;
  const failed = status === "delivery_failed";
  const eventAt = Object.fromEntries(shipment.events.map((event) => [event.status, event.at]));
  const at = (key) => (status === key ? shipment.status_updated_at : (eventAt[key] ?? null));
  const reached =
    status === "delivered"
      ? 4
      : ["in_transit", "arrived"].includes(status) || (failed && eventAt.in_transit)
        ? 3
        : status === "picked_up" || (failed && shipment.picked_at !== null)
          ? 2
          : status === "assigned" || (failed && shipment.courier_user_id !== null)
            ? 1
            : 0;

  let rows = [["received", true, shipment.created_at]];
  if (!shipment.manual) rows.push(["accepted", shipment.accepted_at !== null, shipment.accepted_at]);
  rows.push(["assigned", reached >= 1, at("assigned")]);
  rows.push(["picked_up", reached >= 2, shipment.picked_at ?? at("picked_up")]);
  rows.push(["in_transit", reached >= 3, at("in_transit")]);
  rows.push(failed ? ["delivery_failed", true, shipment.status_updated_at] : ["delivered", reached >= 4, shipment.delivered_at]);
  if (failed) rows = rows.filter((entry) => entry[1]);

  const last = rows.reduce((furthest, entry, index) => (entry[1] ? index : furthest), 0);
  return {
    state: failed ? "failed" : status === "delivered" ? "completed" : "in_progress",
    steps: rows.map(([key, isReached, time], index) => {
      const stepStatus = index < last ? "done" : index === last ? "current" : "upcoming";
      return { key, status: stepStatus, timestamp: stepStatus === "upcoming" || !isReached ? null : iso(time) };
    }),
  };
}

function detail(set, shipment) {
  const base = row(set, shipment);
  const courier = courierByUser(set, shipment.courier_user_id);
  base.courier_phone = courier?.phone ?? null;
  base.order.payment_method = shipment.payment_method;
  base.order.created_at = iso(shipment.created_at);
  base.order.shipping_address_line2 = shipment.line2;
  base.order.items = Array.from({ length: shipment.items_count }, (_, index) => ({
    name: ["Pagne tissé Faso Dan Fani", "Beurre de karité 500 g", "Panier tressé"][index % 3],
    qty: 1 + (index % 2),
    unit_price: Math.round(shipment.total_amount / shipment.items_count / (1 + (index % 2))),
    image: null,
    collected: shipment.picked_at !== null,
  }));
  base.status_updated_at = iso(shipment.status_updated_at);
  base.tracking_events = shipment.events.map((event, index) => ({ seq: index + 1, event_type: "status_updated", status: event.status, memo: null, created_at: iso(event.at), occurred_at: iso(event.at) }));
  base.notes = shipment.internal_notes;
  base.journey = journeyOf(shipment);
  base.schedule = { scheduled_at: null, date: shipment.schedule?.date ?? null, from: shipment.schedule?.from ?? null, to: shipment.schedule?.to ?? null };
  base.delivery_instructions = shipment.instructions;
  if (base.courier && courier) {
    Object.assign(base.courier, {
      employee_id: courier.employee_id,
      vehicle_plate: courier.vehicle_plate,
      total_deliveries: courier.total_deliveries,
      success_rate: courier.total_deliveries > 0 ? Math.round((courier.completed_deliveries / courier.total_deliveries) * 1000) / 10 : null,
      rating_count: courier.rating_count,
    });
  }
  base.recipient = { email: shipment.email, deliveries_count: set.shipments.filter((other) => other.phone === shipment.phone).length };
  base.position = shipment.position ? { lat: shipment.position.lat, lng: shipment.position.lng, recorded_at: iso(shipment.position.at), distance_km: 2.1 } : null;
  return base;
}

// ── Shipments: mutations ────────────────────────────────────

/** Gives a shipment to a courier, or says why not, as assignCourier does. Returns an error code or null. */
function assign(set, shipment, courierUserId) {
  if (shipment.accepted_at === null) return "SUGU-AGENCY-NOT-ACCEPTED";
  if (shipment.status === "assigned" && shipment.courier_user_id !== null) {
    if (shipment.courier_user_id === courierUserId) return null;
    shipment.courier_user_id = courierUserId;
    return null;
  }
  const refusal = assignRefusal(shipment);
  if (refusal) return refusal;
  shipment.courier_user_id = courierUserId;
  shipment.status = "assigned";
  shipment.status_updated_at = fixtureNow();
  return null;
}

/** A transition the agency makes by hand. Returns the code of a refusal, or null. */
function move(shipment, status) {
  if (!(TRANSITIONS[shipment.status] ?? []).includes(status)) return "SUGU-STATUS-TRANSITION-INVALID";
  // The customer confirms the handover with a code: one shipment of the fixture never got it.
  if (status === "delivered" && shipment.id === "ship-19") return "SUGU-DELIVERY-CODE-NOT-VERIFIED";
  if (status === "delivered" && shipment.cod && !(shipment.cod.delivery && shipment.cod.product)) return "SUGU-COD-MIXTE-FEES-UNPAID";

  const now = fixtureNow();
  if (status === "in_transit" && shipment.picked_at === null) shipment.picked_at = now;
  if (status === "in_transit") shipment.events.push({ status: "in_transit", at: now });
  if (status === "delivered") shipment.delivered_at = now;
  if (status === "pending") shipment.courier_user_id = null;
  shipment.status = status;
  shipment.status_updated_at = now;
  return null;
}

const SENTENCES = {
  "SUGU-DELIVERY-CODE-NOT-VERIFIED": "SUGU-DELIVERY-CODE-NOT-VERIFIED: le code de livraison n'a pas été vérifié.",
  "SUGU-COD-MIXTE-FEES-UNPAID": "SUGU-COD-MIXTE-FEES-UNPAID: les frais ne sont pas réglés.",
};

function csvCell(value) {
  let text = String(value ?? "").replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text}"`;
}

const STATUS_LABELS = {
  pending: "À assigner",
  awaiting_fee_payment: "Frais attendus",
  assigned: "À ramasser",
  picked_up: "Colis collecté",
  in_transit: "En livraison",
  arrived: "Chez le client",
  delivery_failed: "Échec",
  delivered: "Livrée",
};

function shipmentsCsv(set, params) {
  let rows = filtered(set, params);
  const ids = params.getAll("ids[]");
  if (ids.length > 0) rows = rows.filter((shipment) => ids.includes(shipment.id));
  const lines = rows.map((shipment) =>
    [
      csvCell(shipment.number),
      csvCell(shipment.recipient),
      csvCell(shipment.phone),
      csvCell(`${shipment.line1}, ${shipment.city}`),
      csvCell(ZONES.find((zone) => zone.id === shipment.zone_id)?.name ?? ""),
      csvCell(courierByUser(set, shipment.courier_user_id)?.name ?? "Non assigné"),
      csvCell(awaitingDecision(shipment) ? "À accepter" : STATUS_LABELS[shipment.status]),
      csvCell(shipment.payment_status === "paid" ? "Payé" : "En attente"),
      Math.trunc(shipment.shipping_amount / 100),
      iso(shipment.created_at),
      iso(shipment.delivered_at) ?? "",
    ].join(","),
  );
  return `﻿Commande,Client,Téléphone,Adresse,Zone,Livreur,Statut,Paiement,Montant (FCFA),Créée le,Livrée le\n${lines.join("\n")}\n`;
}

// ── Couriers ────────────────────────────────────────────────

const STATUS_NAMES = { 1: "active", 2: "suspended", 3: "inactive", 4: "pending_kyc" };
const carrying = (set, courier) => set.shipments.filter((shipment) => shipment.courier_user_id === courier.user_id && ON_THE_WAY.includes(shipment.status));

function activityOf(set, courier) {
  if (courier.status === 2) return "suspended";
  if (courier.status === 4 || !courier.kyc_verified) return "to_verify";
  if (courier.status === 3 || !courier.is_active) return "paused";
  return carrying(set, courier).length > 0 ? "on_delivery" : "available";
}

function figures(set, courier) {
  const today = day(fixtureNow());
  const own = set.shipments.filter((shipment) => shipment.courier_user_id === courier.user_id);
  const deliveredToday = own.filter((shipment) => shipment.status === "delivered" && day(shipment.delivered_at) === today);
  const last = own.reduce((latest, shipment) => Math.max(latest, shipment.status_updated_at), 0);
  return {
    activity: activityOf(set, courier),
    active_shipments: carrying(set, courier).length,
    deliveries_today: deliveredToday.length,
    revenue_today: deliveredToday.reduce((sum, shipment) => sum + shipment.shipping_amount, 0),
    success_rate: courier.total_deliveries > 0 ? Math.round((courier.completed_deliveries / courier.total_deliveries) * 1000) / 10 : null,
    last_activity_at: last ? iso(last) : null,
  };
}

function courierRow(set, courier, { documents = true, detailed = false } = {}) {
  const data = {
    id: courier.id,
    user_id: courier.user_id,
    delivery_partner_id: AGENCY_ID,
    branch_id: null,
    employee_id: courier.employee_id,
    vehicle_type: courier.vehicle_type,
    vehicle_plate: courier.vehicle_plate,
    phone_e164: courier.phone,
    emergency_contact_name: courier.emergency_contact_name ?? null,
    emergency_contact_phone: courier.emergency_contact_phone ?? null,
    status: STATUS_NAMES[courier.status],
    is_active: courier.is_active,
    kyc_verified: courier.kyc_verified,
    suspended_until: courier.suspended_until,
    kyc_verified_at: courier.kyc_verified_at,
    total_deliveries: courier.total_deliveries,
    completed_deliveries: courier.completed_deliveries,
    failed_deliveries: courier.failed_deliveries,
    rating_avg: courier.rating_avg,
    rating_count: courier.rating_count,
    hired_at: courier.hired_at,
    last_delivery_at: courier.last_delivery_at,
    metadata: courier.metadata,
    created_at: courier.created_at,
    ...figures(set, courier),
    user: { id: courier.user_id, name: courier.name, email: courier.email, phone_e164: courier.phone },
    branch: null,
  };
  if (documents) {
    data.kyc_documents = courier.documents.map((document) => ({
      id: document.id,
      document_type: document.document_type,
      ...(detailed ? { document_number: document.document_number, expires_on: document.expires_on } : {}),
      status: document.status,
      reviewed_at: null,
      // As the real API: a signed link to its own host. The portal never sends anyone there.
      file_url: document.file_name ? `https://api.invalid/api/v1/kyc-files/courier/${document.id}?expires=1791789219&signature=stand-in` : null,
    }));
  }
  return data;
}

function courierOverview(set) {
  const count = (activity) => set.couriers.filter((courier) => activityOf(set, courier) === activity).length;
  return {
    total: set.couriers.length,
    active: set.couriers.filter((courier) => courier.status === 1).length,
    onDelivery: count("on_delivery"),
    available: count("available"),
    paused: count("paused"),
    toVerify: count("to_verify"),
    suspended: count("suspended"),
  };
}

function courierAlerts(set) {
  const now = fixtureNow();
  const who = (courier) => ({ courier_id: courier.id, name: courier.name, employee_id: courier.employee_id });
  const documents = set.couriers
    .flatMap((courier) => courier.documents.map((document) => ({ courier, document })))
    .filter(({ document }) => document.status !== 2 && document.expires_on && new Date(document.expires_on).getTime() <= now + 30 * DAY)
    .sort((a, b) => (a.document.expires_on < b.document.expires_on ? -1 : 1))
    .map(({ courier, document }) => ({
      ...who(courier),
      document_type: document.document_type,
      expires_on: document.expires_on,
      days_left: Math.round((new Date(document.expires_on).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / DAY),
    }));
  const low = set.couriers
    .filter((courier) => courier.status !== 2 && courier.total_deliveries >= 10 && courier.completed_deliveries * 100 < courier.total_deliveries * 80)
    .map((courier) => ({ ...who(courier), success_rate: Math.round((courier.completed_deliveries / courier.total_deliveries) * 1000) / 10, total_deliveries: courier.total_deliveries }));
  const inactive = set.couriers
    .filter((courier) => courier.status === 1 && courier.kyc_verified && courier.last_delivery_at && new Date(courier.last_delivery_at).getTime() < now - 7 * DAY)
    .map((courier) => ({ ...who(courier), last_delivery_at: courier.last_delivery_at, days: Math.round((now - new Date(courier.last_delivery_at).getTime()) / DAY) }));
  return {
    documents: { total: documents.length, items: documents.slice(0, 3) },
    lowPerformance: { total: low.length, items: low.slice(0, 3) },
    inactive: { total: inactive.length, items: inactive.slice(0, 3) },
  };
}

function filteredCouriers(set, params) {
  let rows = [...set.couriers];
  const activity = params.get("activity");
  if (activity) rows = rows.filter((courier) => activityOf(set, courier) === activity);
  if (params.get("quartier")) rows = rows.filter((courier) => courier.metadata.quartier === params.get("quartier"));
  const search = (params.get("search") ?? "").trim().toLowerCase();
  if (search) rows = rows.filter((courier) => [courier.name, courier.phone, courier.employee_id, courier.email].some((value) => (value ?? "").toLowerCase().includes(search)));

  const sortBy = ["created_at", "hired_at", "total_deliveries", "completed_deliveries", "rating_avg", "last_delivery_at", "name"].includes(params.get("sort_by")) ? params.get("sort_by") : "created_at";
  const direction = params.get("sort_order") === "asc" ? 1 : -1;
  const value = (courier) => (sortBy === "name" ? courier.name.toLowerCase() : (courier[sortBy] ?? 0));
  rows.sort((a, b) => (value(a) < value(b) ? -1 : value(a) > value(b) ? 1 : a.id < b.id ? -1 : 1) * direction);
  return rows;
}

function listCouriers(set, params) {
  const rows = filteredCouriers(set, params);
  const perPage = Math.max(1, Math.min(Number(params.get("per_page")) || 20, 100));
  const page = Math.max(1, Number(params.get("page")) || 1);
  const quartiers = [...new Set(set.couriers.map((courier) => courier.metadata.quartier).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "fr"))
    .map((name) => ({ name, count: set.couriers.filter((courier) => courier.metadata.quartier === name).length }));
  return {
    couriers: rows.slice((page - 1) * perPage, page * perPage).map((courier) => courierRow(set, courier)),
    overview: courierOverview(set),
    quartiers,
    alerts: courierAlerts(set),
    pagination: { current_page: page, last_page: Math.max(1, Math.ceil(rows.length / perPage)), per_page: perPage, total: rows.length },
  };
}

function courierDetail(set, courier) {
  const now = fixtureNow();
  const own = set.shipments.filter((shipment) => shipment.courier_user_id === courier.user_id);
  const delivered = own.filter((shipment) => shipment.status === "delivered");
  const mission = carrying(set, courier).sort((a, b) => b.status_updated_at - a.status_updated_at)[0] ?? null;
  const rate = courier.commission_rate_override ?? 70;
  const sum = (rows) => rows.reduce((total, shipment) => total + shipment.shipping_amount, 0);
  const share = (rows) => {
    const revenue = sum(rows);
    const courierShare = rows.reduce((total, shipment) => total + Math.round(shipment.shipping_amount * (rate / 100)), 0);
    return { revenue, courier_share: courierShare, agency_share: revenue - courierShare };
  };
  const today = day(now);
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  const hours = [];
  for (const shipment of delivered) {
    const moment = new Date(shipment.delivered_at);
    weekdays[(moment.getDay() + 6) % 7] += 1;
    hours.push(moment.getHours());
  }
  const located = own.find((shipment) => shipment.position);
  const events = own
    .flatMap((shipment) => [
      shipment.picked_at && day(shipment.picked_at) === today ? { at: shipment.picked_at, event_type: "picked_up", status: "picked_up", shipment } : null,
      ...shipment.events.filter((event) => day(event.at) === today).map((event) => ({ at: event.at, event_type: "status_updated", status: event.status, shipment })),
      shipment.delivered_at && day(shipment.delivered_at) === today ? { at: shipment.delivered_at, event_type: "status_updated", status: "delivered", shipment } : null,
      shipment.status === "delivery_failed" && day(shipment.status_updated_at) === today ? { at: shipment.status_updated_at, event_type: "status_updated", status: "delivery_failed", shipment } : null,
    ])
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)
    .slice(0, 12);

  return {
    courier: courierRow(set, courier, { detailed: true }),
    stats: { total_deliveries: courier.total_deliveries, completed_deliveries: courier.completed_deliveries },
    activity: {
      last_position: located ? { lat: located.position.lat, lng: located.position.lng, recorded_at: iso(located.position.at), shipment_id: located.id } : null,
      current_mission: mission ? row(set, mission) : null,
      recent_deliveries: [...own].sort((a, b) => b.created_at - a.created_at).slice(0, 5).map((shipment) => row(set, shipment)),
      performance: {
        average_delivery_minutes: delivered.length > 0 ? 28 + (courier.total_deliveries % 9) : null,
        // The fixture holds a few days of shipments: the totals of his whole record come from his counters.
        revenue_total: courier.completed_deliveries * 180000,
        revenue_this_month: sum(delivered),
        revenue_last_month: Math.round(sum(delivered) * 0.85),
        deliveries_this_month: delivered.length,
        deliveries_last_month: Math.max(0, delivered.length - 1),
      },
      earnings: {
        commission_rate: rate,
        rate_is_own: courier.commission_rate_override !== null,
        this_month: share(delivered),
        last_month: share(delivered.slice(1)),
      },
      rhythm: { window_days: 30, deliveries_by_weekday: weekdays, first_hour: hours.length ? Math.min(...hours) : null, last_hour: hours.length ? Math.max(...hours) : null },
      today_events: events.map((event) => ({
        at: iso(event.at),
        event_type: event.event_type,
        status: event.status,
        memo: null,
        shipment_id: event.shipment.id,
        order_number: event.shipment.number,
      })),
    },
  };
}

function couriersCsv(set, params) {
  const labels = { on_delivery: "En livraison", available: "Disponible", paused: "En pause", to_verify: "À vérifier", suspended: "Suspendu" };
  const lines = filteredCouriers(set, params).map((courier) =>
    [
      csvCell(courier.employee_id),
      csvCell(courier.name),
      csvCell(courier.phone),
      csvCell(courier.email),
      csvCell(labels[activityOf(set, courier)]),
      csvCell(courier.metadata.quartier ?? ""),
      csvCell(courier.vehicle_type ?? ""),
      csvCell(courier.vehicle_plate ?? ""),
      courier.total_deliveries,
      courier.completed_deliveries,
      figures(set, courier).success_rate ?? "",
      courier.rating_avg ?? "",
      courier.hired_at ?? "",
      courier.last_delivery_at ?? "",
    ].join(","),
  );
  return `﻿Matricule,Nom,Téléphone,E-mail,Statut,Quartier,Véhicule,Immatriculation,Livraisons,Réussies,Taux de réussite (%),Note,Inscrit le,Dernière livraison\n${lines.join("\n")}\n`;
}

// ── Dashboard ───────────────────────────────────────────────

function dashboard(set) {
  const now = fixtureNow();
  const [today, yesterday] = [day(now), day(now - DAY)];
  const createdOn = (date) => set.shipments.filter((shipment) => day(shipment.created_at) === date).length;
  const deliveredOn = (date) => set.shipments.filter((shipment) => shipment.status === "delivered" && day(shipment.delivered_at) === date);
  const failedOn = (date) => set.shipments.filter((shipment) => shipment.status === "delivery_failed" && day(shipment.status_updated_at) === date);
  const sum = (rows) => rows.reduce((total, shipment) => total + shipment.shipping_amount, 0);

  // priorityShipments: late first, then to accept, to assign, failed; a late one is listed as late only.
  const priority = [];
  let total = 0;
  for (const reason of ["late", "awaiting_decision", "to_assign", "failed"]) {
    const rows = set.shipments.filter((shipment) => inScope(shipment, reason) && (reason === "late" || !isLate(shipment))).sort((a, b) => a.created_at - b.created_at);
    total += rows.length;
    for (const shipment of rows) if (priority.length < 8) priority.push({ ...row(set, shipment), priority_reason: reason });
  }

  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, delivered: 0, failed: 0 }));
  for (const shipment of deliveredOn(today)) hours[new Date(shipment.delivered_at).getHours()].delivered += 1;
  for (const shipment of failedOn(today)) hours[new Date(shipment.status_updated_at).getHours()].failed += 1;

  const working = set.couriers.filter((courier) => ["on_delivery", "available"].includes(activityOf(set, courier)));
  const live = [...working.filter((courier) => activityOf(set, courier) === "on_delivery"), ...working.filter((courier) => activityOf(set, courier) === "available")].slice(0, 6).map((courier) => {
    const heading = carrying(set, courier).sort((a, b) => b.status_updated_at - a.status_updated_at)[0] ?? null;
    return {
      courier_id: courier.id,
      user_id: courier.user_id,
      name: courier.name,
      phone: courier.phone,
      activity: activityOf(set, courier),
      last_activity_at: figures(set, courier).last_activity_at,
      shipment: heading
        ? { id: heading.id, order_number: heading.number, status: heading.status, zone: ZONES.find((zone) => zone.id === heading.zone_id)?.name ?? null, address: `${heading.line1}, ${heading.city}` }
        : null,
    };
  });

  return {
    agencyName: "Faso Express",
    managerName: "Issa Ouédraogo",
    kpis: {},
    activeDeliveries: [],
    driverPerformance: [],
    recentComplaints: [],
    overview: overviewOf(set),
    today: {
      created: createdOn(today),
      createdYesterday: createdOn(yesterday),
      delivered: deliveredOn(today).length,
      deliveredYesterday: deliveredOn(yesterday).length,
      failed: failedOn(today).length,
      failedYesterday: failedOn(yesterday).length,
      revenue: sum(deliveredOn(today)),
      revenueYesterday: sum(deliveredOn(yesterday)),
    },
    priority: { total, shipments: priority },
    activityByHour: hours,
    couriers: { overview: courierOverview(set), live },
  };
}

// ── Shops of the marketplace ────────────────────────────────

/** A shop as the public listing answers it (VendorsListService::formatVendorCard): logo and cover are objects. */
const shop = (id, name, address_line, phone) => ({
  id,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  name,
  cover_image: { url: "https://cdn.sugu.pro/s/assets/store-cover-default.jpg", alt: name },
  logo: { url: "https://cdn.sugu.pro/s/assets/store-logo-default.jpg", alt: name },
  rating: { avg: 4.6, count: 12 },
  contact: { address_line, zip: "", email: "", phone },
  stats: { total_products: 24, total_sales: 310 },
  member_since: "2024",
  is_followed: false,
});

const SHOPS = [
  shop("store-sika", "Maison Sika", "Avenue Kwame Nkrumah, Ouagadougou, Kadiogo", "+22625301122"),
  // A shop that gave no address: the listing answers a sentence in its place.
  shop("store-karite", "Maison du Karité", "Adresse non renseignée", ""),
  shop("store-tissus", "Faso Tissus", "Rue de la Chance, Bobo-Dioulasso, Houet", "+22620981234"),
];

// ── Router ──────────────────────────────────────────────────

/** A multipart body is only recorded: its field names and file names. */
async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function agency({ req, res, url, path, method, token, send, readJson }) {
  // Test plumbing: what the stand-in received, and an outage on demand.
  const set = setOf(token);
  if (path === "/__agency/received") {
    send(res, 200, { received: set.received });
    return true;
  }
  if (path === "/__agency/outage" && method === "POST") {
    set.outage = (await readJson(req)).on === true;
    send(res, 200, { success: true });
    return true;
  }

  // The code a courier types at sign-up to join the agency; `refresh` replaces it.
  if (path === "/partners/drivers/referral-code" && method === "GET") {
    if (url.searchParams.get("refresh") === "true") set.referral = `FASO${3000 + set.sequence++}`;
    const code = set.referral ?? "FASO2026";
    send(res, 200, { code, link: `https://pro.sugu.pro/signup/driver?code=${code}` });
    return true;
  }

  // The public listing of the marketplace shops, searched by name or city.
  if (path === "/vendors" && method === "GET") {
    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Math.min(Number(url.searchParams.get("limit")) || 12, 60);
    const items = SHOPS.filter((entry) => !q || entry.name.toLowerCase().includes(q) || entry.contact.address_line.toLowerCase().includes(q)).slice(0, limit);
    send(res, 200, { success: true, items, facets: { rating: [] }, meta: { limit, next_cursor: null, has_more: false } });
    return true;
  }

  const match = path.match(/^\/agencies\/([^/]+)(\/.*)?$/);
  if (!match) return false;
  const [, agencyId, rest = ""] = match;
  // Another agency's data is not this account's to read.
  if (agencyId !== AGENCY_ID) {
    send(res, 403, { success: false, message: "Accès non autorisé à cette agence." });
    return true;
  }
  if (set.outage && method === "GET") {
    send(res, 500, { success: false, message: "Erreur lors du chargement." });
    return true;
  }

  const params = url.searchParams;
  const ok = (data, message) => (send(res, 200, { success: true, ...(message ? { message } : {}), data }), true);
  const refuse = (status, message, extra = {}) => (send(res, status, { success: false, message, ...extra }), true);
  const csv = (body, filename) => {
    res.writeHead(200, { "Content-Type": "text/csv; charset=UTF-8", "Content-Disposition": `attachment; filename="${filename}"` });
    res.end(body);
    return true;
  };

  if (rest === "/dashboard" && method === "GET") return ok(dashboard(set));

  // ── Shipments ──
  if (rest === "/shipments" && method === "GET") return ok(listShipments(set, params));
  if (rest === "/shipments/export" && method === "GET") return csv(shipmentsCsv(set, params), "livraisons-export.csv");

  if (rest === "/shipments" && method === "POST") {
    const body = await readJson(req);
    set.received.push({ path: rest, body });
    const errors = {};
    for (const field of ["vendor_name", "pickup_address", "delivery_address", "client_name", "client_phone"]) {
      if (!String(body[field] ?? "").trim()) errors[field] = ["Ce champ est obligatoire."];
    }
    if (!(Number(body.items_count) >= 1)) errors.items_count = ["Le nombre d'articles doit être d'au moins 1."];
    if (body.client_email && !/^\S+@\S+\.\S+$/.test(body.client_email)) errors.client_email = ["L'adresse e-mail n'est pas valide."];
    if (Object.keys(errors).length > 0) return refuse(422, "Validation échouée.", { errors });
    if (body.courier_id && !courierByUser(set, body.courier_id)) return refuse(404, "Livreur non trouvé dans cette agence.");

    const now = fixtureNow();
    const sequence = set.sequence++;
    const date = body.delivery_date ? new Date(`${body.delivery_date}T00:00:00`) : null;
    const at = (time, fallback) => {
      const parts = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(String(time ?? ""));
      return parts && date ? new Date(date).setHours(Number(parts[1]), Number(parts[2]), 0, 0) : fallback;
    };
    const shipment = {
      id: `ship-new-${sequence}`,
      number: `AG-NEW${String(sequence).padStart(5, "0")}`,
      status: body.courier_id ? "assigned" : "pending",
      manual: true,
      accepted_at: now,
      courier_user_id: body.courier_id ?? null,
      recipient: body.client_name,
      phone: body.client_phone,
      email: body.client_email ?? null,
      line1: body.delivery_address,
      line2: null,
      city: "",
      zone_id: null,
      store: null,
      vendor_name: body.vendor_name,
      pickup_address: body.pickup_address,
      pickup_phone: body.pickup_phone ?? null,
      shipping_amount: Math.round(Number(body.shipping_amount ?? 0) * 100),
      total_amount: Math.round(Number(body.order_total ?? 0) * 100),
      items_count: Number(body.items_count),
      payment_status: body.payment_status === "paid" ? "paid" : "pending",
      payment_method: body.payment_method ?? "cash",
      cod: null,
      priority: Number(body.priority ?? 100),
      notes: body.order_notes ?? null,
      instructions: body.delivery_instructions ?? null,
      eta: date ? at(body.time_slot_to, new Date(date).setHours(23, 59, 59, 0)) : null,
      schedule: date ? { date: body.delivery_date, from: body.time_slot_from ?? null, to: body.time_slot_to ?? null } : null,
      created_at: now,
      status_updated_at: now,
      picked_at: null,
      delivered_at: null,
      refusal_reason: null,
      position: null,
      events: [],
      internal_notes: [],
    };
    set.shipments.unshift(shipment);
    send(res, 201, { success: true, message: "Livraison créée.", data: row(set, shipment) });
    return true;
  }

  if (rest === "/shipments/bulk-assign" && method === "POST") {
    const body = await readJson(req);
    if (!courierByUser(set, body.courier_id)) return refuse(404, "Livreur non trouvé dans cette agence.");
    const updated = [];
    const rejected = [];
    for (const id of body.shipment_ids ?? []) {
      const shipment = set.shipments.find((entry) => entry.id === id);
      const reason = shipment ? assign(set, shipment, body.courier_id) : "SUGU-SHIPMENT-NOT-FOUND";
      if (reason) rejected.push({ shipment_id: id, reason });
      else updated.push(id);
    }
    return ok({ updated_count: updated.length, updated, rejected }, `${updated.length} livraison(s) assignée(s).`);
  }

  if (rest === "/shipments/bulk-status" && method === "POST") {
    const body = await readJson(req);
    if (!STATUSES.includes(body.status)) return refuse(422, "Validation échouée.", { errors: { status: ["Statut inconnu."] } });
    const updated = [];
    const rejected = [];
    for (const id of body.shipment_ids ?? []) {
      const shipment = set.shipments.find((entry) => entry.id === id);
      const reason = shipment ? move(shipment, body.status) : "SUGU-SHIPMENT-NOT-FOUND";
      if (reason) rejected.push({ shipment_id: id, reason });
      else updated.push(id);
    }
    return ok({ updated_count: updated.length, updated, rejected }, `${updated.length} livraison(s) mise(s) à jour.`);
  }

  const one = rest.match(/^\/shipments\/([^/]+)(?:\/(assign|status|notes|accept|refuse|price|reassign))?$/);
  if (one) {
    const shipment = set.shipments.find((entry) => entry.id === one[1]);
    if (!shipment) return refuse(404, "Livraison non trouvée.");
    const action = one[2];

    if (!action && method === "GET") return ok(detail(set, shipment));
    const body = await readJson(req);
    set.received.push({ path: rest, body });

    if (action === "accept" && method === "POST") {
      if (!awaitingDecision(shipment)) return refuse(409, "Cette livraison a déjà été acceptée ou refusée.", { error_code: "SUGU-AGENCY-ALREADY-PROCESSED" });
      shipment.accepted_at = fixtureNow();
      return ok(row(set, shipment), "Livraison acceptée.");
    }
    if (action === "refuse" && method === "POST") {
      if (!String(body.reason ?? "").trim()) return refuse(422, "Le motif de refus est obligatoire.", { error_code: "SUGU-REFUSE-REASON-REQUIRED" });
      if (!awaitingDecision(shipment)) return refuse(409, "Cette livraison a déjà été acceptée ou refusée.", { error_code: "SUGU-AGENCY-ALREADY-PROCESSED" });
      // A refused request leaves the agency: it is no longer one of its shipments.
      set.shipments = set.shipments.filter((entry) => entry !== shipment);
      return ok({ ...row(set, shipment), agency_refusal_reason: body.reason }, "Livraison refusée.");
    }
    if ((action === "assign" || action === "reassign") && method === "POST") {
      if (!courierByUser(set, body.courier_id)) return refuse(404, "Livraison ou livreur non trouvé.");
      const reason = assign(set, shipment, body.courier_id);
      // The endpoint answers the bare code as its whole message.
      if (reason) return refuse(422, reason, { error_code: reason });
      return ok(row(set, shipment), "Livreur assigné.");
    }
    if (action === "status" && method === "POST") {
      const reason = move(shipment, body.status);
      if (reason === "SUGU-STATUS-TRANSITION-INVALID") return refuse(422, `Transition de statut non autorisée: ${shipment.status} → ${body.status}`);
      if (reason) return refuse(422, SENTENCES[reason]);
      if (body.memo) shipment.internal_notes.unshift({ id: `note-${set.sequence++}`, memo: body.memo, noted_at: iso(fixtureNow()), author: "Manager" });
      return ok(row(set, shipment), "Statut mis à jour.");
    }
    if (action === "notes" && method === "POST") {
      if (!String(body.memo ?? "").trim()) return refuse(422, "Validation échouée.", { errors: { memo: ["La note est obligatoire."] } });
      shipment.internal_notes.unshift({ id: `note-${set.sequence++}`, memo: body.memo, noted_at: iso(fixtureNow()), author: "Manager" });
      return ok({ id: shipment.internal_notes[0].id }, "Note ajoutée.");
    }
    if (action === "price" && method === "PUT") {
      const amount = Number(body.amount);
      if (!(amount > 0)) return refuse(422, "Le montant doit être positif.");
      if (shipment.payment_status === "paid" && shipment.status === "delivered") return refuse(409, "Le prix est verrouillé (livraison déjà financée).", { error_code: "SUGU-PRICE-LOCKED" });
      if (amount > shipment.shipping_amount * 3) return refuse(422, "SUGU-PRICE-CEILING-EXCEEDED");
      shipment.shipping_amount = amount;
      return ok(row(set, shipment), "Prix mis à jour.");
    }
    return false;
  }

  // ── Couriers ──
  if (rest === "/couriers" && method === "GET") return ok(listCouriers(set, params), "Livreurs récupérés avec succès.");
  if (rest === "/couriers/export" && method === "GET") return csv(couriersCsv(set, params), "livreurs-export.csv");

  if (rest === "/couriers/register" && method === "POST") {
    const body = await readJson(req);
    set.received.push({ path: rest, body });
    const errors = {};
    if (String(body.first_name ?? "").trim().length < 2) errors.first_name = ["Le prénom doit contenir au moins 2 caractères."];
    if (String(body.last_name ?? "").trim().length < 2) errors.last_name = ["Le nom doit contenir au moins 2 caractères."];
    if (String(body.phone ?? "").trim().length < 8) errors.phone = ["Le numéro de téléphone doit contenir au moins 8 caractères."];
    else if (set.couriers.some((courier) => courier.phone.replace(/\s/g, "") === String(body.phone).replace(/\s/g, ""))) errors.phone = ["Ce numéro de téléphone est déjà associé à un compte."];
    if (!["moto", "velo", "voiture", "tricycle"].includes(body.vehicle_type)) errors.vehicle_type = ["Le type de véhicule est requis."];
    if (Object.keys(errors).length > 0) return refuse(422, "Erreur de validation.", { errors });

    const sequence = set.couriers.length + 1;
    const courier = {
      id: `courier-${sequence}`,
      user_id: `user-${sequence}`,
      name: `${body.first_name} ${body.last_name}`.trim(),
      email: body.email ?? `${String(body.first_name).toLowerCase()}@courier.sugu.pro`,
      phone: body.phone,
      employee_id: `LV-${String(sequence).padStart(3, "0")}`,
      vehicle_type: body.vehicle_type,
      vehicle_plate: body.vehicle_plate ?? null,
      // addCourier: waiting for his documents to be verified.
      status: 4,
      is_active: false,
      kyc_verified: false,
      kyc_verified_at: null,
      suspended_until: null,
      total_deliveries: 0,
      completed_deliveries: 0,
      failed_deliveries: 0,
      rating_avg: null,
      rating_count: 0,
      hired_at: new Date(fixtureNow()).toISOString().slice(0, 10),
      last_delivery_at: null,
      created_at: iso(fixtureNow()),
      commission_rate_override: null,
      metadata: {
        quartier: body.quartier ?? null,
        address: body.address ?? null,
        vehicle_make: body.vehicle_make ?? null,
        vehicle_color: body.vehicle_color ?? null,
        vehicle_year: body.vehicle_year ?? null,
        date_of_birth: body.date_of_birth ?? null,
        gender: body.gender ?? null,
      },
      documents: [],
    };
    set.couriers.push(courier);
    send(res, 201, { success: true, message: "Livreur enregistré avec succès.", data: { courier_id: courier.id } });
    return true;
  }

  // The file of a document, behind the session.
  const file = rest.match(/^\/couriers\/([^/]+)\/kyc-documents\/([^/]+)\/file$/);
  if (file && method === "GET") {
    const document = set.couriers.find((entry) => entry.id === file[1])?.documents.find((entry) => entry.id === file[2]);
    if (!document) return refuse(404, "Pièce, livreur ou agence introuvable.");
    if (!document.file_name) return refuse(404, "Aucun fichier n'a été transmis pour cette pièce.");
    res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${document.file_name}"` });
    res.end(`%PDF-1.4\n% stand-in for ${document.file_name}\n%%EOF\n`);
    return true;
  }

  const person = rest.match(/^\/couriers\/([^/]+)(?:\/(suspend|activate|verify-kyc|kyc-documents|commission-rate))?$/);
  if (person) {
    const courier = set.couriers.find((entry) => entry.id === person[1]);
    if (!courier) return refuse(404, "Livreur non trouvé.");
    const action = person[2];

    if (!action && method === "GET") return ok(courierDetail(set, courier), "Livreur récupéré avec succès.");

    if (action === "kyc-documents" && method === "POST") {
      const raw = await readRaw(req);
      const field = (name) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(raw)?.[1] ?? null;
      const files = [...raw.matchAll(/name="files\[\]"; filename="([^"]*)"/g)].map((part) => part[1]);
      set.received.push({ path: rest, fields: { document_type: field("document_type"), document_name: field("document_name"), document_number: field("document_number"), expires_on: field("expires_on") }, files });
      if (files.length === 0) return refuse(422, "Erreur de validation.", { errors: { files: ["Au moins un fichier est requis."] } });
      courier.documents.push({ id: `doc-new-${set.sequence++}`, document_type: field("document_type"), document_name: field("document_name"), document_number: field("document_number"), expires_on: field("expires_on"), status: 0, file_name: files[0] });
      send(res, 201, { success: true, message: "Document ajouté." });
      return true;
    }

    const body = await readJson(req);
    set.received.push({ path: rest, body });

    if (!action && method === "PUT") {
      const errors = {};
      if (body.first_name !== undefined && String(body.first_name).trim().length < 2) errors.first_name = ["Le prénom doit contenir au moins 2 caractères."];
      if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) errors.email = ["L'adresse e-mail n'est pas valide."];
      if (Object.keys(errors).length > 0) return refuse(422, "Erreur de validation.", { errors });
      if (body.first_name || body.last_name) {
        const [first, ...others] = courier.name.split(" ");
        courier.name = `${body.first_name ?? first} ${body.last_name ?? others.join(" ")}`.trim();
      }
      if (body.email) courier.email = body.email;
      if (body.phone) courier.phone = body.phone;
      if (body.vehicle_type) courier.vehicle_type = { moto: "motorcycle", velo: "bike", voiture: "car", tricycle: "tricycle" }[body.vehicle_type] ?? body.vehicle_type;
      if (body.vehicle_plate !== undefined) courier.vehicle_plate = body.vehicle_plate || null;
      for (const key of ["emergency_contact_name", "emergency_contact_phone"]) if (body[key] !== undefined) courier[key] = body[key] || null;
      for (const key of ["quartier", "address", "vehicle_make", "vehicle_color", "vehicle_year"]) if (body[key]) courier.metadata[key] = body[key];
      if (typeof body.is_active === "boolean") courier.is_active = body.is_active;
      return ok(courierRow(set, courier), "Livreur mis à jour.");
    }
    if (action === "suspend" && method === "POST") {
      courier.status = 2;
      courier.is_active = false;
      return ok(courierRow(set, courier), "Livreur suspendu.");
    }
    if (action === "activate" && method === "POST") {
      courier.status = 1;
      courier.is_active = true;
      return ok(courierRow(set, courier), "Livreur réactivé.");
    }
    if (action === "verify-kyc" && method === "POST") {
      const approved = body.approved !== false;
      courier.kyc_verified = approved;
      courier.kyc_verified_at = approved ? iso(fixtureNow()) : null;
      // CourierService::verifyCourierKyc: a refusal suspends the account.
      courier.status = approved ? 1 : 2;
      courier.is_active = approved;
      for (const document of courier.documents) document.status = approved ? 1 : 2;
      return ok(courierRow(set, courier), approved ? "KYC approuvé." : "KYC rejeté.");
    }
    if (action === "commission-rate" && method === "PUT") {
      if (body.rate !== null && !(Number(body.rate) >= 0 && Number(body.rate) <= 100)) return refuse(422, "Le taux doit être compris entre 0 et 100.", { errors: { rate: ["Le taux doit être compris entre 0 et 100."] } });
      courier.commission_rate_override = body.rate === null ? null : Number(body.rate);
      return ok({ commission_rate_override: courier.commission_rate_override, effective_rate: courier.commission_rate_override ?? 70, agency_default_rate: 70 });
    }
    return false;
  }

  return false;
}
