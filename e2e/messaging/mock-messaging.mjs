// Messaging and support endpoints for the V8 smoke
// (playwright.messaging.config.ts), plugged into e2e/shell/mock-api.mjs.
//
// Payloads, rules and refusals follow the controllers of ../sugu:
// SellerMessagingController, CourierMessagingController,
// AgencyMessagingController (three GET routes and nothing else),
// MessagingPresenter, MessageService (a send replayed with the same
// `client_message_id` answers the message already written) and
// SellerTicketController. Deliveries, couriers and missions are those of the
// agency and courier stand-ins, which this one hands the other paths to.
//
// It also opens a WebSocket that speaks the Pusher protocol on the port the
// build connects to (Reverb's), so that the browser really subscribes to its
// private channel through /api/broadcasting/auth and really receives events.
//
// Nothing here reaches a real backend, and nothing here is a proof that the
// real one behaves so: e2e/staging/messaging.staging.spec.ts is.
import { WebSocketServer } from "ws";
import agency from "../agency/mock-agency.mjs";
import driver from "../driver/mock-driver.mjs";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const SOCKET_PORT = Number(process.env.MOCK_SOCKET_PORT ?? 8080);

/** Today at 16:00, as the agency and courier stand-ins: the specs fix the browser clock on it. */
export function fixtureNow() {
  const now = new Date();
  now.setHours(16, 0, 0, 0);
  return now.getTime();
}

const iso = (time) => new Date(time).toISOString();

// What is written during a run comes after the fixture, whatever the real
// hour: the time of the fixture, plus what has passed since the last reset.
let startedAt = Date.now();
const clock = () => fixtureNow() + (Date.now() - startedAt) + 1000;

// Identifiers shaped like ULIDs (26 characters of Crockford base 32) that
// sort as they are created: ten characters of time, then a counter.
let sequence = 0;
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function nextId(time) {
  let rest = Math.floor(time);
  let stamp = "";
  for (let index = 0; index < 10; index++) {
    stamp = CROCKFORD[rest % 32] + stamp;
    rest = Math.floor(rest / 32);
  }
  return `${stamp}${String(sequence++).padStart(6, "0")}0000000000`;
}

const picture = (hue, label) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220"><rect width="320" height="220" fill="hsl(${hue} 30% 88%)"/><rect x="70" y="50" width="180" height="120" rx="10" fill="hsl(${hue} 35% 62%)"/><rect x="70" y="50" width="180" height="26" rx="10" fill="hsl(${hue} 35% 48%)"/><text x="160" y="198" font-family="sans-serif" font-size="13" text-anchor="middle" fill="hsl(${hue} 30% 30%)">${label}</text></svg>`;
const thumbnail = (hue) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="hsl(${hue} 30% 92%)"/><path d="M14 52c8-14 22-20 36-16l14 8v8H14z" fill="hsl(${hue} 20% 22%)"/><rect x="14" y="52" width="50" height="6" rx="3" fill="hsl(18 80% 50%)"/></svg>`)}`;

const PRODUCTS = [
  { id: "prod-baskets", name: "Baskets Classic", price: 28000, category: "Chaussures", hue: 20, in_stock: true, status: "active", store: 11 },
  { id: "prod-pagne", name: "Pagne tissé Faso Dan Fani", price: 12500, category: "Textile", hue: 210, in_stock: true, status: "active", store: 11 },
  { id: "prod-sac", name: "Sac en cuir artisanal", price: 35000, category: "Maroquinerie", hue: 30, in_stock: false, status: "active", store: 11 },
  { id: "prod-karite", name: "Beurre de karité 250 g", price: 2500, category: "Beauté", hue: 50, in_stock: true, status: "active", store: 11 },
  { id: "prod-retire", name: "Sandales tressées", price: 9000, category: "Chaussures", hue: 150, in_stock: true, status: "draft", store: 11 },
  { id: "prod-autre", name: "Montre d'une autre boutique", price: 60000, category: "Montres", hue: 280, in_stock: true, status: "active", store: 99 },
];

const BUYERS = [
  ["Aminata Traoré", true], ["Issa Compaoré", false], ["Marie Koné", false], ["Ousmane Diallo", false], ["Fatoumata Kaboré", false], ["Adama Sanou", false], ["Moussa Zongo", false],
  ["Awa Ouédraogo", false], ["Salif Sawadogo", false], ["Rasmata Zerbo", false], ["Cheick Barro", false], ["Mariam Sankara", false], ["Boukary Ilboudo", false], ["Safiatou Nikiema", false],
  ["Idrissa Tiendrébéogo", false], ["Habibou Yaméogo", false], ["Alimata Bado", false], ["Souleymane Kinda", false], ["Pauline Somé", false], ["Yacouba Dao", false], ["Kadiatou Barry", false],
  ["Noufou Rouamba", false], ["Djénéba Coulibaly", false], ["Hamidou Tapsoba", false],
];

const state = { ready: false };

function message(conversation, sender, body, at, extra = {}) {
  const row = {
    id: nextId(at),
    client_message_id: null,
    conversation_id: conversation.id,
    sender_id: sender.id,
    sender_type: sender.type,
    sender_name: sender.name,
    body,
    message_type: "text",
    metadata: null,
    attachments: [],
    is_flagged: false,
    hidden: false,
    created_at: at,
    ...extra,
  };
  conversation.messages.push(row);
  return row;
}

function attachment(name, type, mime, size, hue) {
  return { id: 5000 + sequence++, type, name, size, mime_type: mime, hue };
}

function productCard(product) {
  return { product_id: product.id, product_name: product.name, product_slug: product.id, price: product.price, compare_price: null, currency: "XOF", thumbnail: thumbnail(product.hue), store_name: "Boutique Awa", category: product.category, rating_avg: 0, in_stock: product.in_stock };
}

function reset() {
  sequence = 0;
  startedAt = Date.now();
  const now = fixtureNow();
  const seller = { id: "101", type: "seller", name: "Awa Traoré" };
  const courier = { id: "103", type: "courier", name: "Moussa Kaboré" };
  const conversations = [];

  // ── The store of the seller ──
  const buyerOf = (index) => ({ id: `buyer-${index + 1}`, type: "customer", name: BUYERS[index][0] });
  const shop = (index, extra = {}) => {
    const conversation = {
      id: `conv-shop-${String(index + 1).padStart(2, "0")}`,
      kind: "shop",
      type: "general",
      status: "open",
      store_id: "11",
      buyer: buyerOf(index),
      online: BUYERS[index][1],
      record: index % 3 === 2 ? null : { id: `cust-${String(index + 1).padStart(3, "0")}`, phone: `+226 70 ${String(12 + index).padStart(2, "0")} 34 56` },
      order: null,
      messages: [],
      read: { seller: null, peer: null },
      ...extra,
    };
    conversations.push(conversation);
    return conversation;
  };

  // 1. The conversation of the mock-up: a question, an answer, a product card, two unread.
  const aminata = shop(0, { order: { id: "order-123", number: "SU-2099-00123" } });
  message(aminata, aminata.buyer, "Bonjour, est-ce que ce produit est toujours disponible ?", now - 5 * HOUR - 40 * MIN);
  const answer = message(aminata, seller, "Bonjour ! Oui, il est disponible.", now - 5 * HOUR - 39 * MIN);
  message(aminata, aminata.buyer, "Parfait. Pouvez-vous me dire dans combien de temps je peux le recevoir à Ouagadougou ?", now - 5 * HOUR - 38 * MIN);
  const card = message(aminata, seller, "Baskets Classic", now - 5 * HOUR - 38 * MIN + 20_000, { message_type: "product_card", metadata: productCard(PRODUCTS[0]) });
  aminata.read.peer = card.id;
  aminata.read.seller = card.id;
  message(aminata, aminata.buyer, "Merci ! Je vais passer commande.", now - 5 * HOUR - 36 * MIN);
  message(aminata, aminata.buyer, "Bonjour, est-ce que ce produit est disponible en taille 43 ?", now - 96 * MIN);
  void answer;

  // 2. A picture and a file, one unread.
  const issa = shop(1);
  message(issa, issa.buyer, "Bonjour, voici une photo de l'article que j'ai reçu.", now - DAY - 2 * HOUR, { attachments: [attachment("colis-abime.png", "image", "image/png", 184_320, 28)] });
  const seen = message(issa, seller, "Je vois, merci pour la photo.", now - DAY - 2 * HOUR + MIN);
  message(issa, seller, "Nous allons vous envoyer un remplacement. Je reviens vers vous dès que c'est expédié.", now - DAY - 2 * HOUR + 2 * MIN);
  issa.read.peer = seen.id;
  const pdf = message(issa, issa.buyer, "", now - DAY - 2 * HOUR + 5 * MIN, { attachments: [attachment("Bon de retour.pdf", "file", "application/pdf", 250_880, 0)] });
  issa.read.seller = pdf.id;
  message(issa, issa.buyer, "Merci beaucoup !", now - DAY - 90 * MIN);

  // 3 to 7: one line each, as the mock-up lists them.
  const lines = [
    [2, "Pouvez-vous me confirmer le délai de livraison pour Bobo-Dioulasso ?", now - DAY - 4 * HOUR, false],
    [3, "", now - 2 * DAY - 3 * HOUR, false, [attachment("photo.png", "image", "image/png", 92_160, 200)]],
    [4, "D'accord, merci.", now - 3 * DAY - HOUR, true],
    [5, "Bonjour, j'aimerais plus d'informations sur le sac en cuir.", now - 4 * DAY - 5 * HOUR, false],
    [6, "Parfait, je passe commande.", now - 5 * DAY - 2 * HOUR, false],
  ];
  for (const [index, body, at, fromSeller, files] of lines) {
    const conversation = shop(index);
    const first = message(conversation, conversation.buyer, "Bonjour.", at - 10 * MIN);
    const last = message(conversation, fromSeller ? seller : conversation.buyer, body, at, files ? { attachments: files } : {});
    conversation.read.seller = last.id;
    conversation.read.peer = first.id;
  }

  // Enough rows for a second page of twenty.
  for (let index = 7; index < BUYERS.length; index++) {
    const conversation = shop(index);
    const last = message(conversation, conversation.buyer, `Bonjour, une question sur ma commande n° ${index}.`, now - (6 + index) * DAY);
    conversation.read.seller = last.id;
  }

  // A long history, for reading back.
  const history = conversations.find((conversation) => conversation.id === "conv-shop-05");
  history.messages = [];
  for (let index = 0; index < 75; index++) {
    message(history, index % 3 === 2 ? seller : history.buyer, `Message d'historique n° ${index + 1}`, now - 12 * DAY + index * 20 * MIN);
  }
  const lastHistory = message(history, seller, "D'accord, merci.", now - 3 * DAY - HOUR);
  history.read.seller = lastHistory.id;
  history.read.peer = lastHistory.id;

  // States a seller cannot write in.
  const closed = conversations.find((conversation) => conversation.id === "conv-shop-09");
  closed.status = "closed";
  const blocked = conversations.find((conversation) => conversation.id === "conv-shop-10");
  blocked.status = "blocked";

  // A courier who came to the store: no product to share, nobody to block.
  const pickup = {
    id: "conv-pickup-01",
    kind: "pickup",
    type: "courier_store",
    status: "open",
    store_id: "11",
    courier: { id: "103", type: "courier", name: "Moussa Kaboré" },
    order: { id: "order-205", number: "SU-2026-000205" },
    shipment: { id: "mission-205", status: "in_transit" },
    messages: [],
    read: { seller: null, peer: null },
  };
  const arrived = message(pickup, pickup.courier, "Bonjour, je suis devant la boutique pour le retrait.", now - 6 * HOUR);
  pickup.read.seller = arrived.id;
  conversations.push(pickup);

  // ── The deliveries of the courier (and of the agency that carries them) ──
  const delivery = (id, target, order, shipment, peer, agencyShipment, courierUser = courier) => {
    const conversation = {
      id,
      kind: "delivery",
      type: target,
      status: shipment.status === "delivered" ? "closed" : "open",
      agency_id: "21",
      courier: courierUser,
      peer,
      order,
      shipment,
      agencyShipment,
      messages: [],
      read: { courier: null, peer: null },
    };
    conversations.push(conversation);
    return conversation;
  };

  const client = (name) => ({ id: `client-${name.split(" ")[0].toLowerCase()}`, type: "customer", name });
  const first = delivery("conv-delivery-01", "courier_customer", { id: "order-205", number: "SU-2026-000205" }, { id: "mission-205", status: "in_transit" }, client("Fatoumata Compaoré"), "ship-16");
  message(first, first.peer, "Bonjour, je suis devant votre immeuble ?", now - 7 * HOUR + 15 * MIN);
  const coming = message(first, courier, "Très bien, j'arrive dans 2 minutes.", now - 7 * HOUR + 16 * MIN);
  first.read.peer = coming.id;
  message(first, first.peer, "", now - 7 * HOUR + 17 * MIN, { attachments: [attachment("entree-immeuble.png", "image", "image/png", 143_360, 120)] });
  const thanks = message(first, first.peer, "Merci !", now - 7 * HOUR + 18 * MIN);
  first.read.courier = thanks.id;
  message(first, first.peer, "Rdv à 16 h ?", now - 20 * MIN);
  message(first, first.peer, "Je vous attends à l'accueil.", now - 18 * MIN);

  const second = delivery("conv-delivery-02", "courier_store", { id: "order-206", number: "SU-2026-000206" }, { id: "mission-206", status: "assigned" }, { id: "store-awa", type: "store", name: "Boutique Awa" }, "ship-10");
  const ready = message(second, { id: "101", type: "seller", name: "Awa Traoré" }, "Le colis est prêt, vous pouvez passer.", now - 2 * HOUR);
  void ready;

  const third = delivery("conv-delivery-03", "courier_customer", { id: "order-204", number: "SU-2026-000204" }, { id: "mission-204", status: "arrived" }, client("Mariama Traoré"), "ship-21");
  const here = message(third, courier, "Je suis arrivé, je vous attends en bas.", now - DAY - HOUR);
  third.read.courier = here.id;

  const done = [
    ["conv-delivery-04", "SU-2026-000190", "mission-190", "Ousmane Zongo", "Merci pour la livraison !", 2],
    ["conv-delivery-05", "SU-2026-000189", "mission-189", "Fatoumata Compaoré", "Bien reçu.", 3],
    ["conv-delivery-06", "SU-2026-000188", "mission-188", "Ali Dembélé", "", 4],
  ];
  for (const [id, number, mission, name, body, days] of done) {
    const conversation = delivery(id, "courier_customer", { id: `order-${mission}`, number }, { id: mission, status: "delivered" }, client(name), `ship-${30 + days}`);
    const last = message(conversation, conversation.peer, body, now - days * DAY, body ? {} : { attachments: [attachment("photo.png", "image", "image/png", 80_000, 300)] });
    conversation.read.courier = last.id;
  }

  // Another courier of the same agency, and a delivery of ANOTHER agency
  // held by the first courier: the agency reads the first, never the second.
  const fatou = { id: "user-2", type: "courier", name: "Fatou Sawadogo" };
  const hers = delivery("conv-delivery-07", "courier_customer", { id: "order-439", number: "SU-2026-078439" }, { id: "ship-14", status: "picked_up" }, client("Ndèye Sokhna Ba"), "ship-14", fatou);
  message(hers, fatou, "Bonjour, je viens de récupérer votre colis.", now - 3 * HOUR);
  message(hers, hers.peer, "Merci, je serai à la maison après 17 h.", now - 3 * HOUR + 4 * MIN);

  const elsewhere = delivery("conv-delivery-99", "courier_customer", { id: "order-999", number: "SU-2026-099999" }, { id: "mission-999", status: "in_transit" }, client("Client d'une autre agence"), null);
  elsewhere.agency_id = "77";
  elsewhere.read.courier = message(elsewhere, elsewhere.peer, "Livraison portée par une autre agence.", now - 2 * DAY).id;

  // ── Tickets of the store ──
  const ticket = (number, subject, status, category, createdAgo, extra = {}) => ({
    id: `ticket-${number.slice(-4)}`,
    ticket_number: number,
    subject,
    status,
    priority: "medium",
    category,
    store_id: "11",
    customer: { id: "101", name: "Awa Traoré" },
    is_requester: true,
    created_at: now - createdAgo,
    last_message_at: now - createdAgo,
    description: subject,
    order: null,
    replies: [],
    ...extra,
  });
  const reply = (target, sender, body, at, files = []) => {
    const row = { id: nextId(at), client_message_id: null, sender_type: sender, sender_id: sender === "admin" ? "admin-1" : target.customer.id, sender_name: sender === "admin" ? "Support SUGU" : target.customer.name, body, attachments: files, created_at: at };
    target.replies.push(row);
    target.last_message_at = at;
    return row;
  };

  const payment = ticket("TKT-261012-0045", "Problème de paiement", "open", "payment", 8 * HOUR);
  reply(payment, "customer", "Je n'arrive pas à recevoir le paiement de ma dernière commande. Pouvez-vous vérifier ?", now - 8 * HOUR, [attachment("capture-ecran.png", "image", "image/png", 493_568, 240)]);
  reply(payment, "admin", "Bonjour, nous vérifions votre dossier et revenons vers vous rapidement.", now - 2 * HOUR);

  const catalogue = ticket("TKT-261011-0042", "Question sur le catalogue", "pending_internal", "product", DAY + 2 * HOUR);
  reply(catalogue, "customer", "Comment ajouter des variantes de couleur à un produit déjà en ligne ?", now - DAY - 2 * HOUR);

  const waiting = ticket("TKT-261010-0040", "Livraison non reçue par le client", "pending_customer", "delivery", 2 * DAY);
  reply(waiting, "customer", "Le client dit ne pas avoir reçu son colis.", now - 2 * DAY);
  reply(waiting, "admin", "Pouvez-vous nous donner le numéro de la commande ?", now - 2 * DAY + HOUR);

  const stock = ticket("TKT-261009-0038", "Erreur de stock", "resolved", "product", 3 * DAY, { priority: "high", order: { id: "order-123", number: "SU-2099-00123" } });
  reply(stock, "customer", "Le stock affiché ne correspond pas à mon inventaire.", now - 3 * DAY);
  reply(stock, "admin", "C'est corrigé : le stock a été recalculé.", now - 3 * DAY + 3 * HOUR);

  const feature = ticket("TKT-261004-0035", "Demande de fonctionnalité", "closed", "other", 8 * DAY);
  reply(feature, "customer", "Serait-il possible d'exporter mes ventes en PDF ?", now - 8 * DAY);
  reply(feature, "admin", "Merci pour la suggestion, elle est transmise à l'équipe produit.", now - 8 * DAY + 5 * HOUR);

  // Opened by a buyer about the store: the seller reads and answers it, and cannot close it.
  const complaint = ticket("TKT-261008-0036", "Colis reçu abîmé", "open", "order", 4 * DAY, { customer: { id: "buyer-2", name: "Issa Compaoré" }, is_requester: false });
  reply(complaint, "customer", "Le colis est arrivé ouvert.", now - 4 * DAY);

  const tickets = [payment, catalogue, waiting, stock, feature, complaint];
  for (let index = 0; index < 14; index++) {
    const old = ticket(`TKT-2609${String(10 + index).padStart(2, "0")}-00${String(10 + index)}`, `Ancienne demande n° ${index + 1}`, "closed", "other", (20 + index) * DAY);
    reply(old, "customer", "Demande archivée.", now - (20 + index) * DAY);
    tickets.push(old);
  }

  Object.assign(state, { ready: true, conversations, tickets, received: [], failures: [], typing: 0, reads: 0 });
}

// ── Reading a conversation as someone ───────────────────────

const lastOf = (conversation) => conversation.messages[conversation.messages.length - 1] ?? null;

function lastMessage(conversation) {
  const last = lastOf(conversation);
  if (!last) return null;
  const kinds = last.attachments.map((file) => file.type);
  return {
    id: last.id,
    body: last.hidden ? "" : last.body.slice(0, 100),
    sender_type: last.sender_type,
    sender_id: last.sender_id,
    message_type: last.message_type,
    attachment_kind: last.hidden || kinds.length === 0 ? null : kinds.every((kind) => kind === "image") ? "image" : "file",
    is_hidden: last.hidden,
    created_at: iso(last.created_at),
  };
}

function unreadFor(conversation, viewerId, readId) {
  return conversation.messages.filter((row) => !row.hidden && row.sender_id !== viewerId && (!readId || row.id > readId)).length;
}

function messageOut(row, conversation, viewerId, base) {
  const product = row.message_type === "product_card" ? PRODUCTS.find((candidate) => candidate.id === row.metadata.product_id) : null;
  return {
    id: row.id,
    client_message_id: row.client_message_id,
    sender_id: row.sender_id,
    sender_type: row.sender_type,
    sender_name: row.sender_name,
    body: row.body,
    message_type: row.message_type,
    metadata: row.metadata,
    attachments: row.attachments.map((file) => ({ id: file.id, type: file.type, path: `${base}/messages/${row.id}/attachments/${file.id}`, url: "https://cdn.invalid/not-used-by-the-portal", thumb_url: null, name: file.name, size: file.size, mime_type: file.mime_type })),
    is_flagged: row.is_flagged,
    created_at: iso(row.created_at),
    ...(viewerId ? { is_own: row.sender_id === viewerId } : {}),
    ...(row.message_type === "product_card" ? { product: product ? { available: product.status === "active", name: product.name, slug: product.id, price: product.price, currency: "XOF", in_stock: product.in_stock, store_id: String(product.store) } : { available: false } } : {}),
  };
}

function sellerOut(conversation) {
  const writable = !["closed", "blocked"].includes(conversation.status);
  const buyer = conversation.kind === "shop" ? conversation.buyer : null;
  const courier = conversation.kind === "pickup" ? conversation.courier : null;
  return {
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    store: { id: "11", name: "Boutique Awa" },
    customer: buyer ? { id: buyer.id, name: buyer.name, is_online: conversation.online, avatar_url: null, store_customer_id: conversation.record?.id ?? null, phone: conversation.record?.phone ?? null } : null,
    peer: buyer ? { type: "customer", id: buyer.id, name: buyer.name, avatar_url: null, is_online: conversation.online } : { type: "courier", id: courier.id, name: courier.name, avatar_url: null, is_online: false },
    order_id: conversation.order?.id ?? null,
    order_number: conversation.order?.number ?? null,
    shipment_id: conversation.shipment?.id ?? null,
    last_message: lastMessage(conversation),
    unread_count: unreadFor(conversation, "101", conversation.read.seller),
    peer_last_read_message_id: conversation.read.peer,
    can: { send: writable, share_product: Boolean(buyer) && writable, close: conversation.status === "open", block: Boolean(buyer) && conversation.status !== "blocked", report: true },
    updated_at: iso(lastOf(conversation)?.created_at ?? fixtureNow()),
    created_at: iso(conversation.messages[0]?.created_at ?? fixtureNow()),
    participants: [],
  };
}

const ACTIVE = (status) => !["delivered", "delivery_failed"].includes(status);
/**
 * The agency stand-in has its own recipients: what the agency reads beside a
 * conversation (the mission) names the same person as the conversation.
 */
const AGENCY_RECIPIENTS = { "ship-16": "Cheick Barro", "ship-21": "Bineta Kané", "ship-14": "Fatoumata Sankara" };
const peerName = (conversation, as) => (as === "agency" && conversation.peer.type === "customer" ? (AGENCY_RECIPIENTS[conversation.agencyShipment] ?? conversation.peer.name) : conversation.peer.name);
/** `ship-16` is the sixteenth shipment of e2e/agency/mock-agency.mjs, numbered from SU-2026-078452 down. */
const agencyNumber = (shipment) => (/^ship-\d+$/.test(shipment ?? "") ? `SU-2026-${String(78452 - (Number(shipment.slice(5)) - 1)).padStart(6, "0")}` : null);

function deliveryOut(conversation, as) {
  const writable = as === "courier" && !["closed", "blocked"].includes(conversation.status);
  // Through the seller's door a courier's conversation with the store is a "pickup" one; handled apart.
  return {
    id: conversation.id,
    type: conversation.type,
    status: conversation.status,
    customer: conversation.peer.type === "customer" ? { id: conversation.peer.id, name: peerName(conversation, as) } : null,
    store: conversation.peer.type === "store" ? { id: conversation.peer.id, name: conversation.peer.name } : null,
    peer: { type: conversation.peer.type, id: conversation.peer.id, name: peerName(conversation, as), avatar_url: null },
    ...(as === "agency" ? { courier: { id: conversation.courier.id, name: conversation.courier.name } } : {}),
    shipment_id: as === "agency" ? conversation.agencyShipment : conversation.shipment.id,
    shipment: { id: as === "agency" ? conversation.agencyShipment : conversation.shipment.id, status: conversation.shipment.status, is_active: ACTIVE(conversation.shipment.status) },
    order_id: conversation.order.id,
    // The agency stand-in numbers its own shipments: its reader sees that number.
    order_number: as === "agency" ? agencyNumber(conversation.agencyShipment) ?? conversation.order.number : conversation.order.number,
    subject: null,
    last_message: lastMessage(conversation),
    ...(as === "courier" ? { unread_count: unreadFor(conversation, conversation.courier.id, conversation.read.courier), peer_last_read_message_id: conversation.read.peer } : {}),
    can: { send: writable, share_product: false, close: false, block: false, report: as === "courier" },
    updated_at: iso(lastOf(conversation)?.created_at ?? fixtureNow()),
    created_at: iso(conversation.messages[0]?.created_at ?? fixtureNow()),
    participants: [],
  };
}

const byRecent = (a, b) => (lastOf(b)?.created_at ?? 0) - (lastOf(a)?.created_at ?? 0) || (a.id < b.id ? 1 : -1);
const fold = (text) => text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function searched(rows, term, words) {
  const wanted = fold((term ?? "").trim());
  return wanted ? rows.filter((row) => words(row).some((word) => fold(word ?? "").includes(wanted))) : rows;
}

/** A page of messages, oldest first, just before `beforeId`. */
function page(conversation, beforeId, limit) {
  const visible = conversation.messages.filter((row) => !row.hidden).sort((a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : 1));
  const end = beforeId ? visible.findIndex((row) => row.id === beforeId) : visible.length;
  const upTo = end < 0 ? visible.length : end;
  const start = Math.max(0, upTo - limit);
  return { rows: visible.slice(start, upTo), hasMore: start > 0 };
}

// ── The socket ──────────────────────────────────────────────

const sockets = new Set();
let refusing = false;
let socketServer = null;

function startSocket() {
  if (socketServer) return;
  socketServer = new WebSocketServer({ port: SOCKET_PORT, host: "127.0.0.1" });
  socketServer.on("error", (error) => console.error(`mock socket: ${error.message}`));
  socketServer.on("connection", (socket) => {
    if (refusing) return socket.terminate();
    socket.channels = new Set();
    sockets.add(socket);
    socket.send(JSON.stringify({ event: "pusher:connection_established", data: JSON.stringify({ socket_id: `${1000 + sockets.size}.${Date.now() % 100000}`, activity_timeout: 30 }) }));
    socket.on("message", (raw) => {
      let frame;
      try {
        frame = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (frame.event === "pusher:ping") return socket.send(JSON.stringify({ event: "pusher:pong", data: "{}" }));
      if (frame.event === "pusher:subscribe") {
        // Only a channel this stand-in signed is joined.
        if (!String(frame.data?.auth ?? "").endsWith(`:${frame.data.channel}`)) {
          return socket.send(JSON.stringify({ event: "pusher:subscription_error", channel: frame.data?.channel, data: JSON.stringify({ status: 403 }) }));
        }
        socket.channels.add(frame.data.channel);
        socket.send(JSON.stringify({ event: "pusher_internal:subscription_succeeded", channel: frame.data.channel, data: "{}" }));
      }
      if (frame.event === "pusher:unsubscribe") socket.channels.delete(frame.data?.channel);
    });
    socket.on("close", () => sockets.delete(socket));
  });
}

function broadcast(channel, event, data) {
  const frame = JSON.stringify({ event, channel: `private-${channel}`, data: JSON.stringify(data) });
  for (const socket of sockets) if (socket.channels.has(`private-${channel}`)) socket.send(frame);
}

/** Everyone who follows the conversation hears about a message. */
function announce(conversation, row) {
  const payload = { message_id: row.id, client_message_id: row.client_message_id, conversation_id: conversation.id, sender_type: row.sender_type, sender_id: row.sender_id, sender_name: row.sender_name, body_snippet: row.body.slice(0, 100), message_type: row.message_type, has_attachments: row.attachments.length > 0, has_metadata: Boolean(row.metadata), created_at: iso(row.created_at) };
  if (conversation.store_id) broadcast(`messaging.store.${conversation.store_id}`, "message.created", payload);
  if (conversation.kind === "delivery") {
    broadcast(`messaging.courier.${conversation.courier.id}`, "message.created", payload);
    if (conversation.agency_id) broadcast(`messaging.agency.${conversation.agency_id}`, "message.created", payload);
    if (conversation.peer.type === "store") broadcast("messaging.store.11", "message.created", payload);
  }
  if (conversation.kind === "pickup") broadcast(`messaging.courier.${conversation.courier.id}`, "message.created", payload);
}

// ── Multipart, as the portal sends a message ────────────────

async function readForm(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("latin1");
  const type = req.headers["content-type"] ?? "";
  if (type.includes("application/json")) {
    try {
      return { fields: JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"), files: [] };
    } catch {
      return { fields: {}, files: [] };
    }
  }
  const boundary = /boundary=(.+)$/.exec(type)?.[1];
  const fields = {};
  const files = [];
  if (!boundary) return { fields, files };
  for (const part of raw.split(`--${boundary}`)) {
    const head = /name="([^"]+)"(?:; filename="([^"]*)")?/.exec(part);
    if (!head) continue;
    const body = part.slice(part.indexOf("\r\n\r\n") + 4).replace(/\r\n$/, "");
    if (head[2] !== undefined) {
      const mime = /Content-Type: ([^\r\n]+)/i.exec(part)?.[1] ?? "application/octet-stream";
      files.push({ name: Buffer.from(head[2], "latin1").toString("utf8"), mime, size: body.length });
    } else {
      fields[head[1]] = Buffer.from(body, "latin1").toString("utf8");
    }
  }
  return { fields, files };
}

const ALLOWED = ["jpeg", "jpg", "png", "gif", "webp", "pdf", "doc", "docx"];
const TICKET_ALLOWED = [...ALLOWED, "txt", "csv", "zip", "xls", "xlsx"];
const extension = (name) => (name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "");
const strip = (text) => String(text ?? "").replace(/<[^>]*>/g, "").trim();

// ── The endpoints ───────────────────────────────────────────

export default async function messaging(context) {
  const { req, res, url, path, method, profile, send } = context;
  const answer = (status, body) => (send(res, status, body), true);
  const ok = (data, extra = {}) => answer(200, { success: true, data, ...extra });
  const invalid = (errors) => answer(422, { message: Object.values(errors)[0][0], errors });
  const notFound = () => answer(404, { message: "No query results for model." });
  const get = (name) => url.searchParams.get(name);
  const now = fixtureNow();
  if (!state.ready) reset();
  startSocket();

  // ── Test plumbing ──
  if (path === "/__messaging/reset") return reset(), ok(true);
  if (path === "/__messaging/received") return ok({ received: state.received, typing: state.typing, reads: state.reads });
  if (path === "/__messaging/fail" && method === "POST") {
    // What the next sends answer: `error` (nothing written), `lost` (written, answer lost), `refused` (a rule).
    state.failures = (await context.readJson(req)).next ?? [];
    return ok(true);
  }
  if (path === "/__messaging/incoming" && method === "POST") {
    // The other side writes: a message appears on the server, and the event leaves on the socket.
    const body = await context.readJson(req);
    const conversation = state.conversations.find((candidate) => candidate.id === body.conversation);
    if (!conversation) return notFound();
    const sender = conversation.kind === "shop" ? conversation.buyer : conversation.kind === "pickup" ? conversation.courier : conversation.peer;
    const row = message(conversation, body.from === "courier" ? conversation.courier : sender, body.body ?? "Nouveau message", clock());
    if (conversation.status === "closed" && body.reopen) conversation.status = "open";
    if (body.silent !== true) announce(conversation, row);
    return ok({ id: row.id });
  }
  if (path === "/__messaging/peer-read" && method === "POST") {
    const body = await context.readJson(req);
    const conversation = state.conversations.find((candidate) => candidate.id === body.conversation);
    const last = lastOf(conversation);
    conversation.read.peer = last.id;
    const payload = { conversation_id: conversation.id, user_id: "peer", last_read_message_id: last.id, read_at: iso(clock()) };
    if (conversation.store_id) broadcast(`messaging.store.${conversation.store_id}`, "message.read", payload);
    if (conversation.kind === "delivery") broadcast(`messaging.courier.${conversation.courier.id}`, "message.read", payload);
    return ok(true);
  }
  if (path === "/__messaging/peer-typing" && method === "POST") {
    const body = await context.readJson(req);
    const conversation = state.conversations.find((candidate) => candidate.id === body.conversation);
    const payload = { conversation_id: conversation.id, user_id: "peer", user_name: (conversation.buyer ?? conversation.peer).name, participant_type: "customer" };
    if (conversation.store_id) broadcast(`messaging.store.${conversation.store_id}`, "user.typing", payload);
    if (conversation.kind === "delivery") broadcast(`messaging.courier.${conversation.courier.id}`, "user.typing", payload);
    return ok(true);
  }
  if (path === "/__messaging/socket" && method === "POST") {
    // Cut every connection and refuse new ones, or accept them again.
    refusing = (await context.readJson(req)).down === true;
    if (refusing) for (const socket of sockets) socket.terminate();
    return ok({ refusing });
  }

  // ── Channel authorisation, as routes/channels.php decides it ──
  if (url.pathname === "/api/broadcasting/auth") {
    const body = await context.readJson(req);
    const channel = String(body.channel_name ?? "");
    const mine =
      (profile.user_type === "seller" && channel === `private-messaging.store.${profile.store?.id}`) ||
      (profile.user_type === "courier" && channel === `private-messaging.courier.${profile.id}`) ||
      (profile.user_type === "delivery_partner" && channel === `private-messaging.agency.${profile.agency?.id}`);
    return mine ? answer(200, { auth: `stand-in:${channel}` }) : answer(403, { message: "Forbidden" });
  }

  // ── Seller conversations ──
  const sellerRoute = /^\/seller\/conversations(?:\/([^/]+))?(?:\/(.+))?$/.exec(path);
  if (sellerRoute) {
    if (profile.user_type !== "seller" || String(profile.store?.id) !== "11") {
      return sellerRoute[1] ? notFound() : ok([], { meta: { has_more: false, next_cursor: null, counts: { all: 0, unread: 0 } } });
    }
    const mine = state.conversations.filter((conversation) => conversation.store_id === "11" && conversation.messages.length > 0);
    const [, id, rest] = sellerRoute;

    if (!id) {
      if (method !== "GET") return answer(405, { message: "Method not allowed." });
      const all = [...mine].sort(byRecent);
      const unread = all.filter((conversation) => unreadFor(conversation, "101", conversation.read.seller) > 0);
      const rows = searched(get("unread") === "1" ? unread : all, get("q"), (conversation) => [conversation.buyer?.name, conversation.courier?.name, conversation.order?.number]);
      const size = Math.max(1, Math.min(Number(get("per_page")) || 20, 50));
      const offset = get("cursor") ? Number(Buffer.from(get("cursor"), "base64").toString()) || 0 : 0;
      const slice = rows.slice(offset, offset + size);
      const more = offset + size < rows.length;
      state.received.push({ path, q: get("q"), unread: get("unread"), cursor: get("cursor") });
      return ok(slice.map(sellerOut), { meta: { has_more: more, next_cursor: more ? Buffer.from(String(offset + size)).toString("base64") : null, counts: { all: all.length, unread: unread.length } } });
    }

    const conversation = mine.find((candidate) => candidate.id === id);
    if (!conversation) return notFound();
    const base = `seller/conversations/${id}`;
    return conversationRoutes({ context, conversation, rest, base, viewer: { id: "101", type: "seller", name: profile.name }, out: sellerOut, readKey: "seller", answer, ok, invalid, notFound, now });
  }

  // ── Courier conversations ──
  const courierRoute = /^\/courier\/conversations(?:\/([^/]+))?(?:\/(.+))?$/.exec(path);
  if (courierRoute) {
    if (profile.user_type !== "courier") return answer(403, { message: "Accès réservé aux livreurs." });
    const userId = String(profile.id);
    const mine = state.conversations.filter((conversation) => (conversation.kind === "delivery" || conversation.kind === "pickup") && conversation.courier.id === userId && conversation.messages.length > 0);
    const [, id, rest] = courierRoute;
    const out = (conversation) => (conversation.kind === "pickup" ? deliveryOut({ ...conversation, peer: { id: "store-awa", type: "store", name: "Boutique Awa" }, read: { courier: conversation.read.peer, peer: conversation.read.seller } }, "courier") : deliveryOut(conversation, "courier"));

    if (!id) {
      if (method !== "GET") return answer(405, { message: "Method not allowed." });
      const all = [...mine].sort(byRecent);
      const unreadRows = all.filter((conversation) => out(conversation).unread_count > 0);
      const rows = searched(get("unread") === "1" ? unreadRows : all, get("q"), (conversation) => [conversation.peer?.name, conversation.order?.number]);
      state.received.push({ path, q: get("q"), unread: get("unread") });
      return ok(rows.map(out), { meta: { has_more: false, next_cursor: null, counts: { all: all.length, unread: unreadRows.length } } });
    }
    if (id === "start") return false;

    const conversation = mine.find((candidate) => candidate.id === id);
    if (!conversation) return notFound();
    if (["product-card", "close", "block"].includes(rest ?? "")) return answer(404, { message: "Not found." });
    return conversationRoutes({ context, conversation, rest, base: `courier/conversations/${id}`, viewer: { id: userId, type: "courier", name: profile.name }, out, readKey: conversation.kind === "pickup" ? "peer" : "courier", answer, ok, invalid, notFound, now });
  }

  // ── Agency conversations: three reads, and nothing else ──
  const agencyRoute = /^\/agency\/([^/]+)\/conversations(?:\/([^/]+))?(?:\/(.+))?$/.exec(path);
  if (agencyRoute) {
    const [, agencyId, id, rest] = agencyRoute;
    if (profile.user_type !== "delivery_partner" || String(profile.agency?.id) !== agencyId) return answer(403, { message: "Vous n'avez pas accès à cette agence." });
    const mine = state.conversations.filter((conversation) => conversation.kind === "delivery" && conversation.agency_id === agencyId && conversation.messages.length > 0);

    if (!id) {
      if (method !== "GET") return answer(405, { message: "Method not allowed." });
      const rows = searched(
        [...mine].sort(byRecent).filter((conversation) => !get("courier_id") || conversation.courier.id === get("courier_id")),
        get("q"),
        (conversation) => [conversation.peer.name, conversation.courier.name, conversation.order.number],
      );
      const size = Math.max(1, Math.min(Number(get("per_page")) || 20, 50));
      const current = Math.max(1, Number(get("page")) || 1);
      state.received.push({ path, q: get("q"), courier: get("courier_id"), page: get("page") });
      return ok(rows.slice((current - 1) * size, current * size).map((conversation) => deliveryOut(conversation, "agency")), { meta: { current_page: current, last_page: Math.max(1, Math.ceil(rows.length / size)), per_page: size, total: rows.length } });
    }

    const conversation = mine.find((candidate) => candidate.id === id);
    if (!conversation) return notFound();
    const base = `agency/${agencyId}/conversations/${id}`;
    const file = /^messages\/([^/]+)\/attachments\/(\d+)$/.exec(rest ?? "");
    if (method !== "GET") {
      // No route writes: recorded, so that a spec can show nothing was tried.
      state.received.push({ path, method, refused: true });
      return answer(405, { message: "Method not allowed." });
    }
    if (!rest) return ok(deliveryOut(conversation, "agency"));
    if (rest === "messages") {
      const { rows, hasMore } = page(conversation, get("before_id"), Math.max(1, Math.min(Number(get("limit")) || 30, 50)));
      return ok({ messages: rows.map((row) => ({ ...messageOut(row, conversation, null, base), ...(row.sender_type === "customer" ? { sender_name: peerName(conversation, "agency") } : {}) })), has_more: hasMore });
    }
    if (file) return fileOf(conversation, file[1], file[2], res) || notFound();
    return answer(404, { message: "Not found." });
  }

  // ── Products a store may share ──
  const products = /^\/conversations\/([^/]+)\/recommended-products$/.exec(path);
  if (products) {
    const conversation = state.conversations.find((candidate) => candidate.id === products[1] && candidate.store_id === String(profile.store?.id));
    if (!conversation) return notFound();
    const rows = searched(PRODUCTS.filter((product) => product.store === 11 && product.status === "active"), get("q"), (product) => [product.name]);
    return ok(rows.map((product) => ({ id: product.id, name: product.name, slug: product.id, price: product.price, currency: "XOF", thumbnail: thumbnail(product.hue), store: { name: "Boutique Awa" }, in_stock: product.in_stock })));
  }

  // ── Tickets of the seller ──
  const ticketRoute = /^\/sellers\/support\/tickets(?:\/([^/]+))?(?:\/(.+))?$/.exec(path);
  if (ticketRoute) return tickets({ context, ticketRoute, answer, invalid, now });

  // Everything else of an agency or a courier is their own stand-in's.
  if (path.startsWith("/agencies/") || path.startsWith("/__agency/")) return agency(context);
  if (path.startsWith("/courier/") || path.startsWith("/__driver/")) return driver(context);
  return false;
}

function fileOf(conversation, messageId, fileId, res) {
  const row = conversation.messages.find((candidate) => candidate.id === messageId && !candidate.hidden);
  const file = row?.attachments.find((candidate) => String(candidate.id) === fileId);
  if (!file) return false;
  if (file.type === "image") {
    res.writeHead(200, { "Content-Type": "image/svg+xml", "Content-Disposition": `inline; filename="${file.name}"` });
    res.end(picture(file.hue, file.name));
  } else {
    res.writeHead(200, { "Content-Type": file.mime_type === "application/pdf" ? "application/pdf" : "application/octet-stream", "Content-Disposition": `${file.mime_type === "application/pdf" ? "inline" : "attachment"}; filename="${file.name}"` });
    res.end(`%PDF-1.4\n% stand-in for ${file.name}\n%%EOF\n`);
  }
  return true;
}

/** What a participant (seller or courier) does in a conversation. */
async function conversationRoutes({ context, conversation, rest, base, viewer, out, readKey, answer, ok, invalid, notFound }) {
  const { req, res, url, method } = context;
  const get = (name) => url.searchParams.get(name);
  const writable = !["closed", "blocked"].includes(conversation.status);

  if (!rest) return method === "GET" ? ok(out(conversation)) : answer(405, { message: "Method not allowed." });

  if (rest === "messages" && method === "GET") {
    const { rows, hasMore } = page(conversation, get("before_id"), Math.max(1, Math.min(Number(get("limit")) || 30, 50)));
    return ok({ messages: rows.map((row) => messageOut(row, conversation, viewer.id, base)), has_more: hasMore, peer_last_read_message_id: out(conversation).peer_last_read_message_id ?? null });
  }

  const file = /^messages\/([^/]+)\/attachments\/(\d+)$/.exec(rest);
  if (file && method === "GET") return fileOf(conversation, file[1], file[2], res) || notFound();

  if ((rest === "messages" || rest === "product-card") && method === "POST") {
    const { fields, files } = await readForm(req);
    const clientId = fields.client_message_id ?? null;
    state.received.push({ path: `${base}/${rest}`, clientId, body: fields.body ?? null, product: fields.product_id ?? null, files: files.map((entry) => entry.name) });

    // A replay: the message already written is the answer.
    const already = clientId ? conversation.messages.find((row) => row.client_message_id === clientId && row.sender_id === viewer.id) : null;
    if (already) return answer(200, { success: true, data: messageOut(already, conversation, viewer.id, base) });

    const failure = state.failures.shift();
    if (failure === "error") return answer(500, { message: "Server Error" });
    if (failure === "throttled") return answer(429, { message: "Trop de messages envoyés. Veuillez patienter." });
    if (!writable) return answer(403, { message: conversation.status === "blocked" ? "Cette conversation est bloquée." : "Cette conversation est fermée." });

    let row;
    if (rest === "product-card") {
      const product = PRODUCTS.find((candidate) => candidate.id === fields.product_id);
      if (conversation.kind !== "shop") return invalid({ product_id: ["Un produit se partage avec un client, pas avec un coursier."] });
      if (!product || product.store !== 11) return invalid({ product_id: ["Ce produit ne fait pas partie de votre boutique."] });
      if (product.status !== "active") return notFound();
      row = message(conversation, viewer, product.name, clock(), { message_type: "product_card", metadata: productCard(product), client_message_id: clientId });
    } else {
      const body = strip(fields.body);
      if (body.length > 5000) return invalid({ body: ["Le message ne doit pas dépasser 5000 caractères."] });
      if (files.length > 5) return invalid({ attachments: ["5 fichiers au plus."] });
      const bad = files.find((entry) => !ALLOWED.includes(extension(entry.name)));
      if (bad) return invalid({ "attachments.0": ["Ce type de fichier n'est pas accepté."] });
      if (!body && files.length === 0) return invalid({ body: ["Le message ne peut pas être vide."] });
      row = message(conversation, viewer, body, clock(), {
        client_message_id: clientId,
        attachments: files.map((entry) => attachment(entry.name, entry.mime.startsWith("image/") ? "image" : "file", entry.mime, entry.size, 40)),
      });
    }

    announce(conversation, row);
    // Written, but the answer never reaches the browser.
    if (failure === "lost") return req.socket.destroy(), true;
    return answer(201, { success: true, data: messageOut(row, conversation, viewer.id, base) });
  }

  if (rest === "read" && method === "POST") {
    const body = await context.readJson(req);
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(String(body.last_read_message_id ?? ""))) return invalid({ last_read_message_id: ["Identifiant invalide."] });
    state.reads += 1;
    if (!conversation.read[readKey] || body.last_read_message_id > conversation.read[readKey]) conversation.read[readKey] = body.last_read_message_id;
    return answer(200, { success: true, message: "Marqué comme lu." });
  }

  if (rest === "typing" && method === "POST") {
    state.typing += 1;
    return answer(200, { success: true });
  }

  if (rest === "presence" && method === "GET") {
    const peer = conversation.buyer ?? conversation.peer ?? conversation.courier;
    return ok([{ user_id: peer.id, name: peer.name, participant_type: peer.type, is_online: conversation.online === true, last_active: conversation.online ? "now" : "today" }]);
  }

  if (rest === "close" && method === "POST") {
    if (conversation.status === "blocked") return answer(422, { success: false, message: "Cette conversation est bloquée." });
    conversation.status = "closed";
    return answer(200, { success: true, message: "Conversation fermée." });
  }

  if (rest === "block" && method === "POST") {
    if (conversation.kind !== "shop") return answer(422, { success: false, message: "Cette conversation ne peut pas être bloquée." });
    conversation.status = "blocked";
    return answer(200, { success: true, message: "Conversation bloquée." });
  }

  const report = /^messages\/([^/]+)\/report$/.exec(rest);
  if (report && method === "POST") {
    const body = await context.readJson(req);
    const row = conversation.messages.find((candidate) => candidate.id === report[1]);
    if (!row) return notFound();
    if (!["spam", "harassment", "inappropriate", "fraud", "other"].includes(body.reason_code)) return invalid({ reason_code: ["La raison est obligatoire."] });
    if (row.sender_id === viewer.id) return answer(422, { success: false, message: "Vous ne pouvez pas signaler votre propre message." });
    row.is_flagged = true;
    state.received.push({ path: `${base}/${rest}`, reason: body.reason_code, note: body.note ?? null });
    return answer(201, { success: true, data: { report_id: `report-${row.id}` } });
  }

  return answer(404, { message: "Not found." });
}

// ── Tickets ─────────────────────────────────────────────────

const STATUSES = ["open", "pending_customer", "pending_internal", "escalated", "resolved", "closed"];
const CATEGORIES = ["order", "payment", "delivery", "refund", "account", "vendor", "product", "other"];

function ticketOut(ticket) {
  const closed = ticket.status === "closed";
  return {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    store_id: ticket.store_id,
    store: { id: "11", name: "Boutique Awa" },
    customer_id: ticket.customer.id,
    customer: ticket.customer,
    is_requester: ticket.is_requester,
    can: { reply: !closed, close: ticket.is_requester && !closed },
    last_message_at: iso(ticket.last_message_at),
    created_at: iso(ticket.created_at),
    resolved_at: null,
    closed_at: null,
  };
}

function replyOut(ticket, row) {
  const base = `sellers/support/tickets/${ticket.id}/messages/${row.id}/attachments`;
  return {
    id: row.id,
    client_message_id: row.client_message_id,
    sender_type: row.sender_type,
    sender_name: row.sender_name,
    is_own: row.sender_id === "101",
    body: row.body,
    attachments: row.attachments.map((file) => ({ id: file.id, name: file.name, path: `${base}/${file.id}`, url: "https://cdn.invalid/not-used-by-the-portal", size: file.size, mime: file.mime_type })),
    created_at: iso(row.created_at),
  };
}

async function tickets({ context, ticketRoute, answer, invalid, now }) {
  const { req, res, url, method, profile } = context;
  const get = (name) => url.searchParams.get(name);
  const [, id, rest] = ticketRoute;
  const mine = profile.user_type === "seller" && String(profile.store?.id) === "11" ? state.tickets : [];
  const counts = () => {
    const result = { all: mine.length };
    for (const status of STATUSES) result[status] = mine.filter((ticket) => ticket.status === status).length;
    return result;
  };

  if (!id) {
    if (method === "GET") {
      const wanted = (get("status") ?? "").split(",").filter((status) => STATUSES.includes(status));
      const rows = searched(
        [...mine].sort((a, b) => b.last_message_at - a.last_message_at).filter((ticket) => wanted.length === 0 || wanted.includes(ticket.status)),
        get("search"),
        (ticket) => [ticket.ticket_number, ticket.subject],
      );
      const size = Math.max(1, Math.min(Number(get("per_page")) || 15, 50));
      const current = Math.max(1, Number(get("page")) || 1);
      state.received.push({ path: "/sellers/support/tickets", status: get("status"), search: get("search"), page: get("page") });
      return answer(200, { data: rows.slice((current - 1) * size, current * size).map(ticketOut), current_page: current, last_page: Math.max(1, Math.ceil(rows.length / size)), per_page: size, total: rows.length, counts: counts() });
    }
    if (method === "POST") {
      const body = await context.readJson(req);
      state.received.push({ path: "/sellers/support/tickets", method, body });
      const errors = {};
      const subject = strip(body.subject);
      const description = strip(body.description);
      if (!subject) errors.subject = ["Le sujet est obligatoire."];
      else if (subject.length > 255) errors.subject = ["Le sujet ne doit pas dépasser 255 caractères."];
      if (!description) errors.description = ["La description est obligatoire."];
      else if (description.length > 5000) errors.description = ["La description ne doit pas dépasser 5000 caractères."];
      if (body.category && !CATEGORIES.includes(body.category)) errors.category = ["La catégorie sélectionnée est invalide."];
      if (Object.keys(errors).length > 0) return invalid(errors);
      if (String(body.store_id) !== "11") return answer(403, { message: "Accès non autorisé à cette boutique." });
      // Said by the stand-in on demand, as the server would on a bad day.
      if (subject === "Panne") return answer(500, { message: "Server Error" });

      const twin = mine.find((ticket) => ticket.subject === subject && ticket.description === description && Date.now() - ticket.createdReal < 2 * MIN);
      const created = (ticket) => ({ id: ticket.id, ticket_number: ticket.ticket_number, subject: ticket.subject, status: ticket.status, category: ticket.category, created_at: iso(ticket.created_at) });
      if (twin) return answer(200, { message: "Ticket déjà créé.", duplicate: true, ticket: created(twin) });

      const number = `TKT-NEW-${String(100 + state.tickets.length).padStart(4, "0")}`;
      const ticket = { id: `ticket-new-${state.tickets.length}`, ticket_number: number, subject, status: "open", priority: "medium", category: body.category ?? "other", store_id: "11", customer: { id: "101", name: profile.name }, is_requester: true, created_at: clock(), last_message_at: clock(), createdReal: Date.now(), description, order: null, replies: [] };
      ticket.replies.push({ id: nextId(clock()), client_message_id: null, sender_type: "customer", sender_id: "101", sender_name: profile.name, body: description, attachments: [], created_at: now });
      state.tickets.push(ticket);
      return answer(201, { message: "Ticket créé avec succès.", ticket: created(ticket) });
    }
    return answer(405, { message: "Method not allowed." });
  }

  const ticket = mine.find((candidate) => candidate.id === id);
  if (!ticket) return answer(state.tickets.some((candidate) => candidate.id === id) ? 403 : 404, { message: "Accès non autorisé." });

  if (!rest && method === "GET") return answer(200, { ticket: { ...ticketOut(ticket), description: ticket.description, order: ticket.order } });

  if (rest === "messages" && method === "GET") {
    return answer(200, { messages: ticket.replies.map((row) => replyOut(ticket, row)), has_more: false });
  }

  if (rest === "messages" && method === "POST") {
    const { fields, files } = await readForm(req);
    const clientId = fields.client_message_id ?? null;
    state.received.push({ path: `/sellers/support/tickets/${id}/messages`, clientId, body: fields.body ?? null, files: files.map((entry) => entry.name) });

    const already = clientId ? ticket.replies.find((row) => row.client_message_id === clientId) : null;
    if (already) return answer(200, { message: "Message envoyé.", data: replyOut(ticket, already) });

    const failure = state.failures.shift();
    if (failure === "error") return answer(500, { message: "Server Error" });
    if (ticket.status === "closed") return answer(422, { message: "Impossible de répondre à un ticket fermé." });
    const body = strip(fields.body);
    if (!body) return invalid({ body: ["Le message ne peut pas être vide."] });
    if (files.length > 3) return invalid({ attachments: ["3 fichiers au plus."] });
    if (files.some((entry) => !TICKET_ALLOWED.includes(extension(entry.name)))) return invalid({ "attachments.0": ["Ce type de fichier n'est pas accepté."] });

    const at = clock();
    const row = { id: nextId(at), client_message_id: clientId, sender_type: "seller", sender_id: "101", sender_name: profile.name, body, attachments: files.map((entry) => attachment(entry.name, entry.mime.startsWith("image/") ? "image" : "file", entry.mime, entry.size, 240)), created_at: at };
    ticket.replies.push(row);
    ticket.last_message_at = at;
    // The author's reply brings the ticket back from waiting and from resolved.
    if (ticket.is_requester && ["pending_customer", "resolved"].includes(ticket.status)) ticket.status = "open";
    if (failure === "lost") return req.socket.destroy(), true;
    return answer(200, { message: "Message envoyé.", data: replyOut(ticket, row) });
  }

  if (rest === "close" && method === "POST") {
    state.received.push({ path: `/sellers/support/tickets/${id}/close` });
    if (!ticket.is_requester) return answer(403, { message: "Seul l'auteur du ticket peut le fermer." });
    if (ticket.status === "closed") return answer(422, { message: "Ce ticket est déjà fermé." });
    ticket.status = "closed";
    return answer(200, { message: "Ticket fermé." });
  }

  const file = /^messages\/([^/]+)\/attachments\/(\d+)$/.exec(rest ?? "");
  if (file && method === "GET") {
    const row = ticket.replies.find((candidate) => candidate.id === file[1]);
    const found = row?.attachments.find((candidate) => String(candidate.id) === file[2]);
    if (!found) return answer(404, { message: "Not found." });
    res.writeHead(200, { "Content-Type": found.type === "image" ? "image/svg+xml" : "application/octet-stream", "Content-Disposition": `inline; filename="${found.name}"` });
    res.end(found.type === "image" ? picture(found.hue, found.name) : "stand-in");
    return true;
  }

  return answer(404, { message: "Not found." });
}
