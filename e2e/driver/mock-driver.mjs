// Courier endpoints for the V4 smoke (playwright.driver.config.ts), plugged
// into e2e/shell/mock-api.mjs. Payloads and rules follow
// CourierDeliveryService, CourierDeliveriesController, CourierController,
// CourierHistoryController, CourierDashboardController,
// CourierSettingsController and EnsureCourierOperational (../sugu): amounts
// in centimes, the stage of a mission and what the courier may do with it,
// the refusals with their sentences, the codes a boutique or a customer
// tells — which are checked here and never answered. One independent data
// set per session token, so tests can progress missions and send documents
// without seeing each other. Nothing here reaches a real backend.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** The moment the data set is built around: today at 16:00 (the specs fix the browser clock on it). */
export function fixtureNow() {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now.getTime();
}

const iso = (time) => (time === null || time === undefined ? null : new Date(time).toISOString());

/** What each QA account is, for the server: who can work, and where the file stands. */
const ACCOUNTS = {
  "coursier@qa.test": { operational: true, state: "approved" },
  "coursier-attente@qa.test": { operational: false, state: "incomplete", refusal: "COURIER_KYC_PENDING" },
  "coursier-refuse@qa.test": { operational: false, state: "rejected", refusal: "COURIER_NOT_ACTIVE" },
  "coursier-suspendu@qa.test": { operational: false, state: "suspended", refusal: "COURIER_NOT_ACTIVE" },
};

const REFUSAL_MESSAGE = {
  COURIER_KYC_PENDING: "Votre dossier est en cours de validation. Vous pourrez livrer dès son approbation.",
  COURIER_NOT_ACTIVE: "Votre compte livreur est suspendu ou inactif.",
};

// ── Seed ────────────────────────────────────────────────────

const STORES = {
  awa: { id: "store-awa", name: "Boutique Awa", address: "Secteur 16, Ouagadougou", lat: 12.3569, lng: -1.5352 },
  zongo: { id: "store-zongo", name: "Épicerie Zongo", address: "Secteur 12, Ouagadougou", lat: 12.3801, lng: -1.5104 },
  sante: { id: "store-sante", name: "Pharmacie Santé+", address: "Avenue Kadiogo, Gounghin", lat: null, lng: null },
  cedre: { id: "store-cedre", name: "Restaurant Le Cèdre", address: "Avenue Kwame Nkrumah, Ouagadougou", lat: 12.3657, lng: -1.5221 },
};

/**
 * The missions of the fixture. `mine: false` is a mission that is free in the
 * agency. `pay`: online, cod, cod_prepaid, or mixte with what is paid of it.
 * Amounts in centimes.
 */
function seedMissions(now) {
  const at = (minutesAgo) => now - minutesAgo * MIN;
  const mission = (number, store, recipient, state) => ({
    id: `mission-${number}`,
    reference: `SU-2026-000${number}`,
    store: STORES[store],
    recipient,
    status: "assigned",
    mine: true,
    accepted: true,
    accepted_at: at(345),
    picked_at: null,
    delivered_at: null,
    updated_at: at(30),
    pay: "cod",
    total: 1250000,
    fee: 150000,
    mixte: null,
    pickup_code: `BTQ0${number}`,
    pickup_collected_at: null,
    delivery_code: `DLV0${number}`,
    failure: null,
    note: null,
    distance_km: 0,
    duration_min: 0,
    dropoff: null,
    products: [{ id: `item-${number}`, name: "Pagne tissé Faso Dan Fani", variant: "Bleu indigo", quantity: 1 }],
    ...state,
  });

  const zongo = { name: "Ousmane Zongo", line1: "Secteur 22, rue 22.14", city: "Ouagadougou", phone: "+226 76 44 55 66" };
  const compaore = { name: "Fatoumata Compaoré", line1: "Secteur 24, face au marché", city: "Ouagadougou", phone: "+226 70 12 34 56" };
  const dembele = { name: "Ali Dembélé", line1: "Secteur 18, porte 204", city: "Ouagadougou", phone: "+226 71 22 33 44" };
  const traore = { name: "Mariama Traoré", line1: "Secteur 23, cité An III", city: "Ouagadougou", phone: "+226 78 98 76 54" };
  const kone = { name: "Ibrahim Koné", line1: "Tampouy, rue 3.21", city: "Ouagadougou", phone: null };

  const open = [
    // Free in the agency: nobody carries them yet.
    mission(209, "awa", compaore, { status: "pending", mine: false, accepted: false, accepted_at: null, total: 850000, updated_at: at(12), distance_km: 3.2, duration_min: 25 }),
    mission(210, "zongo", dembele, { status: "pending", mine: false, accepted: false, accepted_at: null, total: 500000, updated_at: at(20) }),
    // Given by the agency, not accepted yet.
    mission(208, "cedre", kone, { accepted: false, accepted_at: null, pay: "online", total: 320000, updated_at: at(8) }),
    mission(207, "sante", traore, { accepted: false, accepted_at: null, pay: "mixte", total: 900000, mixte: { delivery: false, product: false }, updated_at: at(15) }),
    // In hand.
    mission(206, "awa", zongo, { updated_at: at(5), dropoff: { lat: 12.3482, lng: -1.5046 }, note: "Sonner au portail bleu, 2e étage." }),
    mission(203, "zongo", dembele, { picked_at: at(95), pickup_collected_at: at(95), pay: "mixte", total: 650000, mixte: { delivery: false, product: false }, updated_at: at(40) }),
    mission(205, "cedre", compaore, { status: "in_transit", picked_at: at(330), pickup_collected_at: at(330), total: 850000, updated_at: at(25), dropoff: { lat: 12.3701, lng: -1.5183 }, distance_km: 2.1, duration_min: 18 }),
    mission(204, "sante", traore, { status: "arrived", picked_at: at(405), pickup_collected_at: at(405), total: 750000, updated_at: at(10) }),
  ];

  // Over: enough for two pages of history, two of them failed.
  const names = [zongo, compaore, dembele, traore, kone];
  const stores = ["awa", "zongo", "sante", "cedre"];
  const done = Array.from({ length: 14 }, (_, index) => {
    const failed = index === 2 || index === 9;
    const finished = now - (index + 1) * 7 * HOUR;
    return mission(190 - index, stores[index % 4], names[index % 5], {
      status: failed ? "delivery_failed" : "delivered",
      picked_at: finished - HOUR,
      pickup_collected_at: finished - HOUR,
      delivered_at: failed ? null : finished,
      updated_at: finished,
      pay: index % 3 === 0 ? "online" : "cod",
      total: 500000 + index * 75000,
      failure: failed ? { code: index === 2 ? "NO_ANSWER" : "WRONG_ADDRESS", reason: index === 2 ? "Le client ne répond pas" : "Adresse introuvable", at: finished } : null,
    });
  });

  return [...open, ...done];
}

const DOCUMENT_TYPES = ["id_card", "driver_license", "vehicle_registration", "insurance"];
const LEGACY = { id_card: "cni", driver_license: "permis", vehicle_registration: "carte_grise", insurance: "assurance" };
const REQUIRED = ["id_card", "driver_license"];

function seedDocuments(state, now) {
  const document = (type, status, file, extra = {}) => ({ id: `doc-${type}`, type, status, file, uploaded_at: now - 2 * DAY, rejection_reason: null, available: true, ...extra });
  switch (state) {
    case "incomplete":
      return [document("id_card", "pending", "cni.png")];
    case "rejected":
      return [document("id_card", "verified", "cni.png"), document("driver_license", "rejected", "permis.pdf", { rejection_reason: "Photo floue : le numéro du permis est illisible." })];
    case "suspended":
      return [document("id_card", "verified", "cni.png"), document("driver_license", "verified", "permis.pdf")];
    default:
      return [
        document("id_card", "verified", "cni.png"),
        document("driver_license", "pending", "permis.pdf", { uploaded_at: now - 4 * HOUR }),
        // A record that outlived its file (a storage replaced by a deployment).
        document("vehicle_registration", "verified", "carte-grise.png", { available: false }),
      ];
  }
}

const sets = new Map();

function setOf(token, profile) {
  if (!sets.has(token)) {
    const now = fixtureNow();
    const account = ACCOUNTS[profile.email] ?? ACCOUNTS["coursier@qa.test"];
    sets.set(token, {
      account,
      state: account.state,
      rejection: account.state === "rejected" ? { reason: "La photo du permis est floue.", at: iso(now - DAY) } : null,
      missions: seedMissions(now),
      documents: seedDocuments(account.state, now),
      received: [],
      outage: false,
      sequence: 1,
    });
  }
  return sets.get(token);
}

// ── Rules (CourierDeliveryService) ──────────────────────────

function stageOf(m) {
  switch (m.status) {
    case "delivered":
      return "delivered";
    case "delivery_failed":
      return "failed";
    case "arrived":
      return "arrived";
    case "in_transit":
      return "in_transit";
    case "picked_up":
      return "collected";
    case "pending":
      return m.mine ? "to_accept" : "available";
    default:
      if (!m.accepted) return "to_accept";
      return m.picked_at !== null ? "collected" : "to_collect";
  }
}

const toCollect = (m) => m.pickup_code !== null && m.pickup_collected_at === null;

function refusalOf(m, action) {
  const stage = stageOf(m);
  const mixte = m.pay === "mixte";
  switch (action) {
    case "accept":
      return ["to_accept", "available"].includes(stage) ? null : "NOT_AVAILABLE";
    case "refuse":
      if (!["to_accept", "to_collect"].includes(stage)) return "ALREADY_STARTED";
      return m.pickup_collected_at !== null ? "ALREADY_COLLECTED" : null;
    case "confirm_collection":
      return ["to_collect", "in_transit"].includes(stage) && toCollect(m) ? null : "NOTHING_TO_COLLECT";
    case "start_transit":
      if (stage === "to_accept" && m.status === "assigned") return "NOT_ACCEPTED";
      if (!["to_collect", "collected"].includes(stage)) return "WRONG_STAGE";
      if (toCollect(m)) return "COLLECTION_PENDING";
      return mixte && !m.mixte.delivery ? "DELIVERY_FEE_UNPAID" : null;
    case "mark_arrived":
      return stage === "in_transit" ? null : "WRONG_STAGE";
    case "mark_delivered":
      if (stage !== "arrived") return "WRONG_STAGE";
      return mixte && !(m.mixte.delivery && m.mixte.product) ? "FEES_UNPAID" : null;
    case "signal_delay":
      return ["assigned", "picked_up", "in_transit"].includes(m.status) ? null : "WRONG_STAGE";
    case "mark_failed":
      return ["assigned", "picked_up", "in_transit", "arrived"].includes(m.status) ? null : "WRONG_STAGE";
    default:
      return "UNKNOWN_ACTION";
  }
}

const ACTIONS = ["accept", "refuse", "confirm_collection", "start_transit", "mark_arrived", "mark_delivered", "signal_delay", "mark_failed"];
const SILENT = ["WRONG_STAGE", "NOT_ACCEPTED", "NOT_AVAILABLE", "ALREADY_STARTED", "NOTHING_TO_COLLECT", "UNKNOWN_ACTION"];
const SENTENCE = {
  NOT_AVAILABLE: "Cette mission ne peut plus être acceptée.",
  ALREADY_STARTED: "Cette livraison ne peut plus être refusée.",
  ALREADY_COLLECTED: "Vous avez déjà collecté un colis de cette mission : elle ne peut plus être refusée. Signalez un échec si vous ne pouvez pas la terminer.",
  NOT_ACCEPTED: "Acceptez la mission avant de démarrer la course.",
  COLLECTION_PENDING: "Confirmez la collecte auprès de chaque boutique avant de partir.",
  DELIVERY_FEE_UNPAID: "Le client n'a pas encore réglé les frais de livraison : la course ne peut pas démarrer.",
};

/** Raw centimes, like Laravel. Never a code. */
function row(m, { detail = false } = {}) {
  const allowed = [];
  const blocked = {};
  for (const action of ACTIONS) {
    const refusal = refusalOf(m, action);
    if (refusal === null) allowed.push(action);
    else if (!SILENT.includes(refusal)) blocked[action] = refusal;
  }
  const mixte = m.pay === "mixte";
  const phone = m.recipient.phone;
  return {
    id: m.id,
    order_id: `#${m.reference}`,
    reference: m.reference,
    status: m.status,
    stage: stageOf(m),
    next_actions: allowed,
    blocked_actions: blocked,
    pickup: { name: m.store.name, address: m.store.address },
    delivery: { name: m.recipient.name, address: `${m.recipient.line1}, ${m.recipient.city}` },
    recipient: { name: m.recipient.name, line1: m.recipient.line1, city: m.recipient.city },
    // SEC-HIGH-04: masked in a list, whole in the page of the mission.
    client: { name: m.recipient.name, phone: phone ? (detail ? phone : `${phone.slice(0, -4)}****`) : "", address: `${m.recipient.line1}, ${m.recipient.city}`, note: m.note },
    amount: m.fee,
    order_total: m.total,
    order_payment: m.pay === "online" ? "paid" : "cod",
    payment_mode: mixte ? "cod_mixte" : m.pay,
    cash_to_collect: m.pay === "cod" ? m.total : 0,
    distance_km: m.distance_km,
    duration_min: m.duration_min,
    parcel_count: 1,
    assigned_to_me: m.mine,
    accepted_at: iso(m.accepted_at),
    picked_at: iso(m.picked_at),
    delivered_at: iso(m.delivered_at),
    scheduled_at: null,
    updated_at: iso(m.updated_at),
    failure: m.failure ? { ...m.failure, at: iso(m.failure.at) } : null,
    codMixte: mixte
      ? {
          isCodMixte: true,
          currentStep: m.mixte.delivery ? (m.mixte.product ? "completed" : "awaiting_product_payment") : "awaiting_delivery_payment",
          deliveryFeePaid: m.mixte.delivery,
          productFeePaid: m.mixte.product,
          deliveryFeeAmount: m.fee,
          productFeeAmount: m.total - m.fee,
          deliveryFeePaidAt: m.mixte.delivery ? iso(m.updated_at) : null,
          productFeePaidAt: m.mixte.product ? iso(m.updated_at) : null,
        }
      : null,
  };
}

function detail(m) {
  const collected = m.pickup_collected_at !== null;
  const stage = stageOf(m);
  const step = (key, label, done, timestamp) => ({ key, label, status: done ? "done" : "upcoming", timestamp: iso(timestamp), store_id: null, actor_type: null, description: null });
  const timeline = [
    step("order_confirmed", "Commande confirmée", true, (m.accepted_at ?? m.updated_at) - 20 * MIN),
    step("courier_assigned", "Livreur assigné", m.accepted, m.accepted_at),
    step("picked_up", "Colis collecté", collected, m.pickup_collected_at),
    step("in_transit", "En cours de livraison", ["in_transit", "arrived", "delivered"].includes(stage), null),
    step("delivered", "Livrée", stage === "delivered", m.delivered_at),
  ];
  const current = timeline.find((entry) => entry.status === "upcoming");
  if (current && stage !== "failed") current.status = "current";

  return {
    ...row(m, { detail: true }),
    // Kept for older clients, with the value they took for "no code".
    security_code: "N/A",
    delivery_code_required: true,
    delivery_code_issued: m.delivery_code !== null,
    stops: [
      {
        id: `pickup-${m.id}`,
        store_id: m.store.id,
        letter: "A",
        type: "pickup",
        name: m.store.name,
        address: m.store.address,
        products: m.products.map((item) => ({ ...item, price: m.total - m.fee, image_url: null, collected })),
        pickup_code: null,
        pickup_code_required: toCollect(m),
        collected_at: iso(m.pickup_collected_at),
        is_completed: collected,
      },
      { id: "delivery-main", letter: "B", type: "delivery", name: m.recipient.name, address: `${m.recipient.line1}, ${m.recipient.city}`, products: [], is_completed: stage === "delivered" },
    ],
    canonical_timeline: timeline,
    positions: { pickup: m.store.lat !== null ? { lat: m.store.lat, lng: m.store.lng } : null, dropoff: m.dropoff },
  };
}

// ── Lists ───────────────────────────────────────────────────

const inScope = {
  offered: (m) => ["to_accept", "available"].includes(stageOf(m)),
  in_progress: (m) => m.mine && ["to_collect", "collected", "in_transit", "arrived", "awaiting_fee_payment"].includes(stageOf(m)),
  done: (m) => m.mine && ["delivered", "failed"].includes(stageOf(m)),
};

const matches = (m, search) => {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [m.reference, m.recipient.name, m.recipient.line1, m.recipient.city, m.store.name].some((value) => value.toLowerCase().includes(needle));
};

const byRecent = (a, b) => b.updated_at - a.updated_at;

function paginate(rows, page, perPage) {
  const current = Math.max(1, Number(page) || 1);
  return {
    rows: rows.slice((current - 1) * perPage, current * perPage),
    pagination: { current_page: current, total_pages: Math.max(1, Math.ceil(rows.length / perPage)), per_page: perPage, total_items: rows.length },
  };
}

function listMissions(set, params) {
  const scope = params.get("scope");
  let rows = set.missions.filter(inScope[scope]);
  const phase = params.get("phase");
  if (scope === "in_progress" && phase) rows = rows.filter((m) => (stageOf(m) === "to_collect") === (phase === "pickup"));
  rows = rows.filter((m) => matches(m, params.get("search") ?? "")).sort(byRecent);
  const page = paginate(rows, params.get("page"), Math.min(Number(params.get("per_page")) || 10, 50));
  return {
    counts: { offered: set.missions.filter(inScope.offered).length, in_progress: set.missions.filter(inScope.in_progress).length, done: set.missions.filter(inScope.done).length },
    rows: page.rows.map((m) => row(m)),
    pagination: page.pagination,
  };
}

function overview(set, profile) {
  const mine = set.missions.filter((m) => m.mine);
  const weekStart = new Date(fixtureNow());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const next = set.missions.filter(inScope.in_progress).sort(byRecent)[0] ?? set.missions.filter(inScope.offered).sort(byRecent)[0] ?? null;
  return {
    driver_name: profile.name,
    agency_name: "Faso Express",
    is_online: true,
    counts: {
      to_accept: set.missions.filter(inScope.offered).length,
      in_progress: set.missions.filter(inScope.in_progress).length,
      delivered: mine.filter((m) => m.status === "delivered").length,
      failed: mine.filter((m) => m.status === "delivery_failed").length,
      week_total: mine.filter((m) => inScope.done(m) && m.updated_at >= weekStart.getTime()).length,
    },
    next_mission: next ? row(next) : null,
    // As CourierDashboardService words it: the last movements, dated in words.
    recent_activity: mine
      .slice()
      .sort(byRecent)
      .slice(0, 5)
      .map((m) => {
        const type = { delivered: "delivery_completed", delivery_failed: "delivery_failed", in_transit: "pickup_done" }[m.status] ?? "assigned";
        const title = { delivery_completed: "réussie", delivery_failed: "échouée" }[type];
        const minutes = Math.round((fixtureNow() - m.updated_at) / MIN);
        return {
          id: `act-${m.id}`,
          type,
          title: title ? `Livraison #${m.reference} ${title}` : type === "pickup_done" ? `Collecte #${m.reference} effectuée` : `Nouvelle assignation #${m.reference}`,
          subtitle: `${m.recipient.name.split(" ").map((part, index) => (index === 0 ? `${part[0]}.` : part)).join(" ")} · ${m.recipient.city}`,
          time: minutes < 60 ? `il y a ${minutes} minutes` : `il y a ${Math.round(minutes / 60)} heures`,
        };
      }),
  };
}

function history(set, params) {
  const day = (value, end) => (value ? new Date(`${value}T${end ? "23:59:59.999" : "00:00:00"}`).getTime() : null);
  const [from, to] = [day(params.get("from"), false), day(params.get("to"), true)];
  const base = set.missions
    .filter(inScope.done)
    .filter((m) => (from === null || m.updated_at >= from) && (to === null || m.updated_at <= to))
    .filter((m) => matches(m, params.get("search") ?? ""))
    .sort(byRecent);
  const status = params.get("status");
  const rows = base.filter((m) => !status || (status === "delivered" ? m.status === "delivered" : m.status === "delivery_failed"));
  const page = paginate(rows, params.get("page"), Math.min(Number(params.get("per_page")) || 8, 50));
  return {
    status_counts: { all: base.length, delivered: base.filter((m) => m.status === "delivered").length, failed: base.filter((m) => m.status === "delivery_failed").length },
    rows: page.rows.map((m) => ({
      id: m.id,
      order_id: `#${m.reference}`,
      reference: m.reference,
      status: m.status,
      finished_at: iso(m.updated_at),
      client_name: m.recipient.name,
      pickup_name: m.store.name,
      delivery_name: `${m.recipient.city}, ${m.recipient.line1}`,
      amount: m.fee,
      cash_collected: m.status === "delivered" && m.pay === "cod" ? m.total : 0,
      fail_reason: m.failure?.reason ?? null,
    })),
    pagination: page.pagination,
  };
}

// ── The file of the courier (CourierSettingsController) ─────

function settings(set, profile) {
  const documents = DOCUMENT_TYPES.map((type) => {
    const document = set.documents.find((entry) => entry.type === type);
    const base = { type: LEGACY[type], document_type: type, label: type, required: REQUIRED.includes(type) };
    if (!document) return { ...base, id: `kyc-${LEGACY[type]}`, status: "not_uploaded", file_name: null, file_url: null, uploaded_at: null, rejection_reason: null, has_file: false, file_available: false, mime_type: null, file_size: null };
    return {
      ...base,
      id: document.id,
      status: document.status,
      file_name: document.file,
      // The signed link of the API: the portal never uses it.
      file_url: `https://api.invalid/api/v1/kyc-files/courier/${document.id}?expires=1791789219&signature=stand-in`,
      uploaded_at: iso(document.uploaded_at),
      rejection_reason: document.rejection_reason,
      has_file: true,
      file_available: document.available,
      mime_type: document.file.endsWith(".pdf") ? "application/pdf" : "image/png",
      file_size: 48_213,
    };
  });
  const verified = ["approved", "suspended", "paused"].includes(set.state);
  const missing = verified ? [] : documents.filter((entry) => entry.required && (entry.status === "not_uploaded" || entry.status === "rejected" || !entry.file_available)).map((entry) => entry.document_type);
  const [first, ...rest] = profile.name.split(" ");

  return {
    profile: { first_name: first, last_name: rest.join(" "), email: profile.email, email_verified: true, phone: "+226 76 44 55 66", phone_secondary: null, avatar_url: null, city: "Ouagadougou", quarter: "Gounghin", full_address: "", action_radius: 15, language: "fr", timezone: "Africa/Ouagadougou", rating: 4.7, total_deliveries: 42, success_rate: 95, avg_delivery_minutes: 0 },
    vehicle: { id: "31", type: "moto", brand: "Yamaha YBR 125", license_plate: "11 KK 4521", color: "Noir", max_capacity_kg: 30, year: 2022, notes: null, is_active: set.account.operational, photos: [] },
    kyc: {
      documents,
      submitted_count: documents.filter((entry) => entry.status !== "not_uploaded").length,
      required_count: 4,
      progress_percent: 50,
      can_deliver: set.account.operational,
      recent_activity: [],
      verification: {
        state: set.state,
        can_deliver: set.account.operational,
        missing,
        rejection: set.state === "rejected" ? set.rejection : null,
        suspended_until: null,
        verified_at: verified ? iso(fixtureNow() - 30 * DAY) : null,
        agency_name: "Faso Express",
      },
    },
    notifications: { channels: [], events: [], quiet_hours: { enabled: false, from: "22:00", to: "07:00" } },
    security: { two_factor_enabled: false, sessions: [] },
    last_saved_at: iso(fixtureNow() - DAY),
  };
}

/** A real one-page PDF and a real picture: what the browser is given must open. */
const PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 58>>stream\nBT /F1 14 Tf 30 110 Td (Piece factice de recette SUGU) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  "latin1",
);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAIAAAACgCAMAAADzTJTPAAAADFBMVEXJwrLz8OizrZyLhnYx3WOCAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlElEQVR42u3ZMQrAIBAEwIv+/88p0yhoAvHQ2V6YZm8L41qcAAAAAAAASAWIwQAAPC/qqwAA7ARwBwAAAMpEAADUEADAFrSvAQCAGgIAAAAAAOQC+DMCAAAAAAAAKD8FAEANAQAATlxDAAA1BAAAsIb9iwgAoIYAAAAAAAAAuQD1QwAAAAAA9gBYQwAAAAAAAIAjATe7mlfjkc9dQgAAAABJRU5ErkJggg==", "base64");

async function readRaw(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── Router ──────────────────────────────────────────────────

export default async function driver({ req, res, url, path, method, profile, token, send, readJson }) {
  const plumbing = path.startsWith("/__driver/");
  if (!plumbing && !path.startsWith("/courier/")) return false;
  if (profile.user_type !== "courier") {
    send(res, 403, { message: "Accès réservé aux livreurs." });
    return true;
  }

  const set = setOf(token, profile);
  const params = url.searchParams;
  const ok = (data, message) => (send(res, 200, { success: true, ...(message ? { message } : {}), data }), true);
  const refuse = (status, message, extra = {}) => (send(res, status, { success: false, message, ...extra }), true);

  // Test plumbing: what the stand-in received, an outage on demand, a payment made by the customer.
  if (path === "/__driver/received") return (send(res, 200, { received: set.received }), true);
  if (path === "/__driver/outage" && method === "POST") {
    set.outage = (await readJson(req)).on === true;
    return ok({});
  }
  if (path === "/__driver/pay" && method === "POST") {
    const body = await readJson(req);
    const target = set.missions.find((m) => m.id === body.id);
    if (target?.mixte) target.mixte = { delivery: true, product: body.product === true };
    return ok({});
  }

  const rest = path.slice("/courier".length);
  if (set.outage && method === "GET") return refuse(500, "Erreur lors du chargement.");

  // ── The file: open to every courier, whatever their status ──
  if (rest === "/settings" && method === "GET") return ok(settings(set, profile));

  if (rest === "/settings/kyc/upload" && method === "POST") {
    const raw = await readRaw(req);
    const text = raw.toString("latin1");
    const type = text.match(/name="document_type"\r\n\r\n([^\r]*)/)?.[1] ?? null;
    const file = text.match(/name="file"; filename="([^"]*)"/)?.[1] ?? null;
    set.received.push({ path: rest, fields: { document_type: type }, files: file ? [file] : [] });
    const canonical = Object.keys(LEGACY).find((key) => key === type || LEGACY[key] === type);
    if (!canonical) return refuse(422, "Type de document invalide.", { errors: { document_type: ["Type de document invalide."] } });
    if (!file) return refuse(422, "Joignez le fichier de la pièce.", { errors: { file: ["Joignez le fichier de la pièce."] } });
    if (!/\.(jpe?g|png|pdf)$/i.test(file)) return refuse(422, "Le fichier doit être une image (JPG, PNG) ou un PDF.", { errors: { file: ["Le fichier doit être une image (JPG, PNG) ou un PDF."] } });
    if (raw.length > 5 * 1024 * 1024) return refuse(422, "Le fichier ne doit pas dépasser 5 Mo.", { errors: { file: ["Le fichier ne doit pas dépasser 5 Mo."] } });

    set.documents = set.documents.filter((entry) => entry.type !== canonical);
    set.documents.push({ id: `doc-${canonical}-${set.sequence++}`, type: canonical, status: "pending", file, uploaded_at: fixtureNow(), rejection_reason: null, available: true });
    // A refused file sent again goes back to the agency; one that was incomplete may now be complete.
    if (set.state === "rejected" || set.state === "incomplete") {
      const sent = (required) => set.documents.some((entry) => entry.type === required && entry.status !== "rejected" && entry.available);
      set.state = REQUIRED.every(sent) ? "pending" : "incomplete";
      set.rejection = null;
    }
    return ok({}, "Document soumis avec succès.");
  }

  const file = rest.match(/^\/settings\/kyc\/([^/]+)\/file$/);
  if (file && method === "GET") {
    const document = set.documents.find((entry) => entry.id === file[1]);
    // Somebody else's document does not exist for this courier.
    if (!document) return refuse(404, "Pièce introuvable.");
    if (!document.available) return refuse(404, "Le fichier de cette pièce n'est plus sur le serveur. Transmettez-la de nouveau.", { error_code: "SUGU-KYC-FILE-MISSING" });
    const pdf = document.file.endsWith(".pdf");
    res.writeHead(200, {
      "Content-Type": pdf ? "application/pdf" : "image/png",
      "Content-Disposition": `inline; filename="${document.file}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(pdf ? PDF : PNG);
    return true;
  }

  if (rest.startsWith("/settings") && method !== "GET") {
    set.received.push({ path: rest, body: await readJson(req) });
    return ok({});
  }

  // ── History: open to a courier who cannot work any more ──
  if (rest === "/history" && method === "GET") {
    const [from, to] = [params.get("from"), params.get("to")];
    if (from && to && to < from) return refuse(422, "Paramètres de requête invalides.", { errors: { to: ["La date de fin est avant la date de début."] } });
    return ok(history(set, params));
  }

  // ── Missions: for a courier who can work (courier.operational, and the same rule on the home) ──
  const mission = rest === "/dashboard" || rest === "/deliveries" || rest.startsWith("/deliveries/");
  if (!mission) return false;
  if (!set.account.operational) return refuse(403, REFUSAL_MESSAGE[set.account.refusal], { error_code: set.account.refusal });

  if (rest === "/dashboard" && method === "GET") return ok(overview(set, profile));

  if (rest === "/deliveries" && method === "GET") {
    if (!Object.hasOwn(inScope, params.get("scope") ?? "")) return refuse(422, "The selected scope is invalid.", { errors: { scope: ["The selected scope is invalid."] } });
    return ok(listMissions(set, params));
  }

  const [, id, action, productId] = rest.match(/^\/deliveries\/([^/]+)(?:\/([a-z-]+))?(?:\/([^/]+))?$/) ?? [];
  const target = set.missions.find((m) => m.id === id);
  // Not theirs, or not there: the same answer.
  const visible = target && (target.mine || (action === "accept" && stageOf(target) === "available"));
  if (!visible) return refuse(404, "Livraison introuvable.");

  if (!action && method === "GET") return ok(detail(target));
  if (method !== "POST") return false;

  const body = await readJson(req);
  set.received.push({ path: rest, body });
  const now = fixtureNow();
  const touch = () => {
    target.updated_at = now;
  };

  switch (action) {
    case "accept": {
      if (target.mine && target.accepted && target.status === "assigned") return ok({ mission: row(target), delivery_code: null, pickup_codes: [] }, "Livraison acceptée.");
      if (refusalOf(target, "accept")) return refuse(422, SENTENCE.NOT_AVAILABLE);
      Object.assign(target, { mine: true, accepted: true, accepted_at: now, status: "assigned" });
      touch();
      return ok({ mission: row(target), delivery_code: null, pickup_codes: [] }, "Livraison acceptée.");
    }
    case "refuse": {
      const refusal = refusalOf(target, "refuse");
      if (refusal) return refuse(422, SENTENCE[refusal]);
      Object.assign(target, { mine: false, accepted: false, accepted_at: null, status: "pending" });
      touch();
      return ok(null, "Livraison refusée.");
    }
    case "confirm-collection": {
      if (!["assigned", "in_transit"].includes(target.status)) return refuse(422, "La collecte n'est plus possible pour cette livraison.");
      if (!target.products.some((item) => item.id === productId)) return refuse(404, "Produit introuvable dans cette commande.");
      if (target.pickup_collected_at === null) {
        if (!body.pickup_code) return refuse(422, "Code de collecte requis pour valider la collecte de cette boutique.");
        if (body.pickup_code !== target.pickup_code) return refuse(422, "Code de collecte invalide pour cette boutique.");
        target.pickup_collected_at = now;
        target.picked_at = now;
        touch();
      }
      return ok(null, "Produit collecté avec succès.");
    }
    case "start-transit": {
      if (!["assigned", "picked_up"].includes(target.status)) return refuse(422, "La livraison n'est pas au statut approprié pour démarrer l'itinéraire.");
      const refusal = refusalOf(target, "start_transit");
      if (refusal) return refuse(422, SENTENCE[refusal] ?? "La course ne peut pas démarrer maintenant.");
      Object.assign(target, { status: "in_transit", picked_at: target.picked_at ?? now });
      touch();
      return ok(null, "L'itinéraire a commencé.");
    }
    case "mark-arrived": {
      if (target.status !== "in_transit") return refuse(422, "La livraison n'est pas au statut approprié pour signaler l'arrivée.");
      target.status = "arrived";
      touch();
      return ok(null, "Arrivée signalée avec succès.");
    }
    case "mark-delivered": {
      if (!body.code || String(body.code).length < 4) return refuse(422, "Le code de sécurité du client est obligatoire pour marquer une commande comme livrée.", { errors: { code: ["Le code de sécurité du client est obligatoire pour marquer une commande comme livrée."] } });
      if (target.status !== "arrived") return refuse(422, "Cette livraison ne peut pas être marquée comme livrée avant d'avoir signalé l'arrivée.");
      if (body.code !== target.delivery_code) return refuse(422, "Le code de sécurité est invalide.");
      if (refusalOf(target, "mark_delivered") === "FEES_UNPAID") return refuse(422, "SUGU-COD-FEES-UNPAID: les frais de livraison et de produit doivent être payés avant la livraison.");
      Object.assign(target, { status: "delivered", delivered_at: now });
      touch();
      return ok(null, "Livraison marquée comme livrée.");
    }
    case "signal-delay": {
      if (refusalOf(target, "signal_delay")) return refuse(422, "Impossible de signaler un retard pour cette livraison.");
      return ok(null, "Retard signalé avec succès.");
    }
    case "mark-failed": {
      if (body.code && !["NO_ANSWER", "WRONG_ADDRESS", "CLIENT_REFUSED", "OUT_OF_COVERAGE", "RESCHEDULED"].includes(body.code)) return refuse(422, "The selected code is invalid.", { errors: { code: ["The selected code is invalid."] } });
      if (refusalOf(target, "mark_failed")) return refuse(422, "Cette livraison ne peut pas être marquée comme échouée.");
      Object.assign(target, { status: "delivery_failed", failure: { code: body.code ?? "NO_ANSWER", reason: body.reason ?? "Livraison échouée", at: now } });
      touch();
      return ok(null, "Livraison marquée comme échouée.");
    }
    default:
      return false;
  }
}
