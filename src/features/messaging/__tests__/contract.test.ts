import { describe, expect, it, vi } from "vitest";

// The screens reach the HTTP client through `../api`; isolate from env validation.
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1", NEXT_PUBLIC_REVERB_APP_KEY: "key", NEXT_PUBLIC_REVERB_HOST: "localhost", NEXT_PUBLIC_REVERB_PORT: 8080, NEXT_PUBLIC_REVERB_SCHEME: "http" } }));

import { attachmentHref, basePath, channelOf, scopeKey } from "../api";
import { MESSAGE_LIMITS, fileRefusal, parseConversation, parseConversationPage, parseCreatedEvent, parseMessagePage, parsePresence, parseReadEvent, parseTypingEvent, type Conversation, type Message } from "../contract";
import { agencyRowDetail, closedNotice, formatDayHeading, formatFileSize, formatListDate, formatSince, presenceLabel, previewOf, threadTitleOf, titleOf } from "../format";
import { mergeMessages, newClientId, sentStateOf, stillPending, type PendingMessage } from "../outbox";

// What the messaging screens read of an answer of Laravel, and the rules of
// the thread. The payloads are the ones ProPortalMessagingTest (../sugu) asserts.

const sellerRow = {
  id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  type: "general",
  status: "open",
  store: { id: "s1", name: "Boutique Awa" },
  customer: { id: "u1", name: "Aminata Traoré", is_online: true, avatar_url: null, store_customer_id: "c1", phone: "+22670123456" },
  peer: { type: "customer", id: "u1", name: "Aminata Traoré", avatar_url: null, is_online: true },
  order_id: "o1",
  order_number: "SU-2099-00123",
  shipment_id: null,
  last_message: { id: "m9", body: "Est-ce disponible ?", sender_type: "customer", sender_id: "u1", message_type: "text", attachment_kind: null, is_hidden: false, created_at: "2026-10-12T10:24:00.000000Z" },
  unread_count: 2,
  peer_last_read_message_id: "m7",
  can: { send: true, share_product: true, close: true, block: true, report: true },
  updated_at: "2026-10-12T10:24:00.000000Z",
  created_at: "2026-10-01T08:00:00.000000Z",
  participants: [],
};

const conversation = (overrides: Record<string, unknown> = {}): Conversation => parseConversation({ success: true, data: { ...sellerRow, ...overrides } });

describe("la liste des conversations", () => {
  it("lit une page à curseur et rend le curseur suivant tel que le serveur l'a donné", () => {
    const page = parseConversationPage({ data: [sellerRow], meta: { has_more: true, next_cursor: "eyJpZCI6MX0", counts: { all: 25, unread: 3 } } });
    expect(page.next).toBe("eyJpZCI6MX0");
    expect(page.counts).toEqual({ all: 25, unread: 3 });
    expect(page.rows[0]).toMatchObject({ unread: 2, orderNumber: "SU-2099-00123", peerLastReadId: "m7" });
    expect(page.rows[0].peer).toMatchObject({ type: "customer", name: "Aminata Traoré", online: true });
    expect(page.rows[0].customerRecord).toEqual({ id: "c1", phone: "+22670123456" });
  });

  it("n'invente pas de page suivante quand le serveur dit que c'est la fin", () => {
    expect(parseConversationPage({ data: [], meta: { has_more: false, next_cursor: "reste" } }).next).toBeNull();
    expect(parseConversationPage({ data: [] }).next).toBeNull();
  });

  it("lit une page numérotée (agence) et demande la suivante par son numéro", () => {
    const page = parseConversationPage({ data: [], meta: { current_page: 2, last_page: 5, per_page: 20, total: 87 } });
    expect(page).toMatchObject({ next: "3", total: 87, counts: null });
    expect(parseConversationPage({ data: [], meta: { current_page: 5, last_page: 5, total: 87 } }).next).toBeNull();
  });

  it("laisse de côté une ligne illisible plutôt que de casser la liste", () => {
    const page = parseConversationPage({ data: [{ pas: "une conversation" }, sellerRow, null], meta: { has_more: false } });
    expect(page.rows).toHaveLength(1);
  });

  it("ne donne aucun droit que le serveur n'a pas donné", () => {
    expect(conversation({ can: undefined }).can).toEqual({ send: false, shareProduct: false, close: false, block: false, report: false });
    expect(conversation({ can: { send: true } }).can).toMatchObject({ send: true, close: false, block: false });
  });
});

describe("les titres et les aperçus", () => {
  const delivery = conversation({ type: "courier_customer", peer: { type: "customer", id: "u1", name: "Fatoumata Compaoré" }, courier: { id: "k1", name: "Moussa Kaboré" }, order_number: "SU-2026-000205", shipment: { id: "sh1", status: "in_transit", is_active: true } });

  it("nomme la conversation selon qui la lit", () => {
    expect(titleOf(conversation(), "vendor")).toBe("Aminata Traoré");
    expect(titleOf(conversation({ peer: { type: "courier", id: "k1", name: "Moussa Kaboré" } }), "vendor")).toBe("Coursier · Moussa Kaboré");
    expect(titleOf(delivery, "courier")).toBe("Client – SU-2026-000205");
    expect(titleOf(conversation({ peer: { type: "store", id: "s1", name: "Boutique Awa" }, order_number: "SU-1" }), "courier")).toBe("Boutique – SU-1");
    expect(titleOf(delivery, "agency")).toBe("SU-2026-000205");
    expect(threadTitleOf(delivery, "agency")).toBe("Client – SU-2026-000205");
    expect(agencyRowDetail(delivery)).toBe("Client · Moussa Kaboré");
    // Without an order number, the name of the other side.
    expect(titleOf(conversation({ peer: { type: "customer", id: "u1", name: "Awa" }, order_number: null }), "courier")).toBe("Awa");
  });

  it("dit ce qu'est le dernier message, et à qui il est", () => {
    expect(previewOf(conversation(), "vendor")).toEqual({ text: "Est-ce disponible ?", kind: "text" });
    expect(previewOf(conversation({ last_message: { ...sellerRow.last_message, sender_type: "seller", body: "Oui." } }), "vendor").text).toBe("Vous : Oui.");
    // The same message is not "yours" for the agency, which wrote nothing.
    expect(previewOf(conversation({ last_message: { ...sellerRow.last_message, sender_type: "courier", body: "J'arrive." } }), "agency").text).toBe("J'arrive.");
    expect(previewOf(conversation({ last_message: { ...sellerRow.last_message, body: "", attachment_kind: "image" } }), "vendor")).toEqual({ text: "Photo", kind: "image" });
    expect(previewOf(conversation({ last_message: { ...sellerRow.last_message, body: "", attachment_kind: "file" } }), "vendor")).toEqual({ text: "Pièce jointe", kind: "file" });
    expect(previewOf(conversation({ last_message: { ...sellerRow.last_message, message_type: "product_card", body: "Baskets" } }), "vendor").kind).toBe("product");
    expect(previewOf(conversation({ last_message: null }), "vendor")).toEqual({ text: "Aucun message", kind: "none" });
  });

  it("ne montre rien d'un message masqué par la modération", () => {
    const hidden = previewOf(conversation({ last_message: { ...sellerRow.last_message, body: "", is_hidden: true } }), "vendor");
    expect(hidden).toEqual({ text: "Message masqué par la modération", kind: "none" });
  });

  it("dit pourquoi on ne peut pas écrire, d'après le serveur", () => {
    expect(closedNotice(conversation())).toBeNull();
    expect(closedNotice(conversation({ status: "closed", can: { send: false } }))).toContain("fermée");
    expect(closedNotice(conversation({ status: "blocked", can: { send: false } }))).toContain("bloquée");
    // Open for the server but not writable: said, without inventing a reason.
    expect(closedNotice(conversation({ status: "open", can: { send: false } }))).toBe("Vous ne pouvez pas écrire dans cette conversation.");
  });
});

describe("les messages", () => {
  const raw = {
    id: "01ARZ3NDEKTSV4RRFFQ69G5FB0",
    client_message_id: "7e0d3c1e-2b0a-4a5e-9f0c-1d2e3f4a5b6c",
    sender_id: "u9",
    sender_type: "seller",
    sender_name: "Awa Traoré",
    body: "Baskets Classic",
    message_type: "product_card",
    metadata: { product_id: "p1", product_name: "Baskets Classic", price: 28000, thumbnail: "https://cdn.example/p1.jpg", category: "Chaussures" },
    product: { available: true, name: "Baskets Classic", price: 30000, in_stock: false },
    is_own: true,
    attachments: [{ id: 12, type: "image", path: "seller/conversations/c1/messages/m1/attachments/12", url: "https://cdn.example/secret.png", thumb_url: null, name: "photo.png", size: 2048, mime_type: "image/png" }],
    is_flagged: false,
    created_at: "2026-10-12T10:22:00.000000Z",
  };

  it("lit une carte produit : ce qui était vrai à l'envoi, et ce qui l'est maintenant", () => {
    const page = parseMessagePage({ success: true, data: { messages: [raw], has_more: true, peer_last_read_message_id: "01ARZ3NDEKTSV4RRFFQ69G5FB0" } });
    expect(page.hasMore).toBe(true);
    expect(page.messages[0].product).toEqual({ id: "p1", name: "Baskets Classic", thumbnail: "https://cdn.example/p1.jpg", category: "Chaussures", sentPrice: 28000, current: { available: true, price: 30000, inStock: false } });
    expect(page.messages[0].clientId).toBe("7e0d3c1e-2b0a-4a5e-9f0c-1d2e3f4a5b6c");
  });

  it("garde le chemin protégé d'une pièce jointe, jamais l'adresse du stockage", () => {
    const [message] = parseMessagePage({ data: { messages: [raw], has_more: false } }).messages;
    expect(message.attachments[0]).toEqual({ id: "12", kind: "image", path: "seller/conversations/c1/messages/m1/attachments/12", name: "photo.png", size: 2048, mime: "image/png" });
    expect(JSON.stringify(message)).not.toContain("secret.png");
  });

  it("pour une agence, qui n'est d'aucun côté, range à droite ce que son coursier a écrit", () => {
    const page = parseMessagePage({ data: { messages: [{ ...raw, is_own: undefined, sender_type: "courier", message_type: "text" }, { ...raw, id: "m2", is_own: undefined, sender_type: "customer", message_type: "text" }], has_more: false } });
    expect(page.messages.map((message) => message.own)).toEqual([true, false]);
  });

  it("ignore un message illisible", () => {
    expect(parseMessagePage({ data: { messages: [{ id: 3 }, raw], has_more: false } }).messages).toHaveLength(1);
  });
});

describe("le fil affiché", () => {
  const message = (id: string, at: string, clientId: string | null = null): Message => ({ id, clientId, senderId: "u1", senderType: "seller", senderName: "Awa", body: id, type: "text", product: null, attachments: [], own: true, flagged: false, at });
  const pending = (clientId: string): PendingMessage => ({ clientId, kind: "message", body: "…", files: [], productId: null, productName: null, state: "sending", error: null, retryable: true, createdAt: "2026-10-12T10:00:00Z" });

  it("montre chaque message une fois, dans l'ordre du serveur, quelles que soient les pages", () => {
    const newest = [message("03", "2026-10-12T10:02:00Z"), message("04", "2026-10-12T10:03:00Z")];
    const older = [message("01", "2026-10-12T10:00:00Z"), message("02", "2026-10-12T10:01:00Z"), message("03", "2026-10-12T10:02:00Z")];
    expect(mergeMessages([newest, older]).map((entry) => entry.id)).toEqual(["01", "02", "03", "04"]);
  });

  it("départage deux messages de la même seconde par leur identifiant", () => {
    const same = "2026-10-12T10:00:00Z";
    expect(mergeMessages([[message("B", same), message("A", same)]]).map((entry) => entry.id)).toEqual(["A", "B"]);
  });

  it("retire un message en attente dès que le serveur en rend un portant son identifiant", () => {
    const waiting = [pending("aaa"), pending("bbb")];
    // The answer to the send was lost; a later read of the thread brings the message.
    expect(stillPending(waiting, [message("01", "2026-10-12T10:00:00Z", "aaa")]).map((entry) => entry.clientId)).toEqual(["bbb"]);
    expect(stillPending(waiting, [message("01", "2026-10-12T10:00:00Z")])).toHaveLength(2);
  });

  it("ne dit « lu » que si l'autre côté a lu jusque-là, et ne connaît pas « délivré »", () => {
    expect(sentStateOf(message("05", "x"), null)).toBe("sent");
    expect(sentStateOf(message("05", "x"), "04")).toBe("sent");
    expect(sentStateOf(message("05", "x"), "05")).toBe("read");
    expect(sentStateOf(message("05", "x"), "09")).toBe("read");
  });

  it("nomme chaque message d'un identifiant unique au format UUID", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newClientId()));
    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("les fichiers", () => {
  it("n'ouvre une pièce que par le relais du portail, et seulement un chemin de messagerie", () => {
    expect(attachmentHref("seller/conversations/c1/messages/m1/attachments/12")).toBe("/api/proxy/seller/conversations/c1/messages/m1/attachments/12");
    expect(attachmentHref("/agency/a1/conversations/c1/messages/m1/attachments/3")).toBe("/api/proxy/agency/a1/conversations/c1/messages/m1/attachments/3");
    expect(attachmentHref("sellers/support/tickets/t1/messages/m1/attachments/7")).toBe("/api/proxy/sellers/support/tickets/t1/messages/m1/attachments/7");

    for (const path of ["https://cdn.example/secret.png", "//evil.example/x/attachments/1", "sellers/kyc/documents/attachments/1", "seller/conversations/c1/../../web-auth/me", "seller/conversations/c1/messages/m1/attachments/1?x=1", "javascript:alert(1)"]) {
      expect(attachmentHref(path), path).toBeNull();
    }
  });

  it("refuse avant l'envoi ce que le serveur refuserait à coup sûr", () => {
    expect(fileRefusal({ name: "photo.PNG", size: 1000 }, 0)).toBeNull();
    expect(fileRefusal({ name: "outil.exe", size: 1000 }, 0)).toContain("n'est pas accepté");
    expect(fileRefusal({ name: "page.html", size: 1000 }, 0)).toContain("n'est pas accepté");
    expect(fileRefusal({ name: "image.svg", size: 1000 }, 0)).toContain("n'est pas accepté");
    expect(fileRefusal({ name: "sans-extension", size: 1000 }, 0)).toContain("n'est pas accepté");
    expect(fileRefusal({ name: "lourd.pdf", size: MESSAGE_LIMITS.fileBytes + 1 }, 0)).toContain("dépasse 10 Mo");
    expect(fileRefusal({ name: "vide.pdf", size: 0 }, 0)).toContain("est vide");
    expect(fileRefusal({ name: "six.png", size: 1000 }, 5)).toBe("5 fichiers au plus par message.");
  });

  it("dit la taille d'un fichier", () => {
    expect(formatFileSize(512)).toBe("512 o");
    expect(formatFileSize(250_880)).toBe("245 Ko");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3 Mo");
  });
});

describe("le temps réel", () => {
  it("ne croit pas ce qui vient du socket : un événement illisible est ignoré", () => {
    expect(parseCreatedEvent({ message_id: "m1", conversation_id: "c1", client_message_id: null, sender_id: "u1", sender_name: "Awa", body_snippet: "Bonjour" })).toEqual({ messageId: "m1", clientId: null, conversationId: "c1", senderId: "u1", senderName: "Awa" });
    expect(parseCreatedEvent({ conversation_id: 12 })).toBeNull();
    expect(parseCreatedEvent("<script>")).toBeNull();
    expect(parseReadEvent({ conversation_id: "c1", user_id: "u2", last_read_message_id: "m5", read_at: "x" })).toEqual({ conversationId: "c1", userId: "u2", lastReadId: "m5" });
    expect(parseReadEvent({ conversation_id: "c1" })).toBeNull();
    expect(parseTypingEvent({ conversation_id: "c1", user_id: "u2", user_name: "Awa", participant_type: "customer" })).toEqual({ conversationId: "c1", userId: "u2", userName: "Awa" });
    expect(parseTypingEvent(null)).toBeNull();
  });

  it("nomme le canal privé de celui qui lit, et rien quand on ne sait pas qui lit", () => {
    expect(channelOf({ profile: "vendor", storeId: "11" })).toBe("messaging.store.11");
    expect(channelOf({ profile: "courier", userId: "103" })).toBe("messaging.courier.103");
    expect(channelOf({ profile: "agency", agencyId: "21" })).toBe("messaging.agency.21");
    expect(channelOf({ profile: "vendor", storeId: null })).toBeNull();
    expect(channelOf({ profile: "agency", agencyId: null })).toBeNull();
  });

  it("adresse chaque profil à ses propres routes, et sépare les comptes dans le cache", () => {
    expect(basePath({ profile: "vendor", storeId: "11" })).toBe("seller/conversations");
    expect(basePath({ profile: "courier", userId: "103" })).toBe("courier/conversations");
    expect(basePath({ profile: "agency", agencyId: "21" })).toBe("agency/21/conversations");
    expect(basePath({ profile: "agency", agencyId: null })).toBeNull();
    expect(() => basePath({ profile: "agency", agencyId: "21/../../web-auth" })).toThrow();
    expect(scopeKey({ profile: "vendor", storeId: "11" })).not.toBe(scopeKey({ profile: "vendor", storeId: "12" }));
  });

  it("dit la présence telle que le serveur la connaît, et rien quand il ne dit rien", () => {
    expect(presenceLabel(parsePresence({ data: [{ user_id: "u1", is_online: true, last_active: "now" }] }))).toEqual({ text: "En ligne", online: true });
    expect(presenceLabel(parsePresence({ data: [{ user_id: "u1", is_online: false, last_active: "today" }] }))).toEqual({ text: "Actif aujourd'hui", online: false });
    expect(presenceLabel(parsePresence({ data: [{ user_id: "u1", is_online: false, last_active: "never" }] }))).toEqual({ text: "Hors ligne", online: false });
    expect(presenceLabel(parsePresence({ data: [] }))).toBeNull();
    expect(presenceLabel(undefined)).toBeNull();
  });
});

describe("les dates", () => {
  const now = new Date(2026, 9, 12, 16, 0, 0);
  const at = (day: number, hour: number, minute = 0, year = 2026) => new Date(year, 9, day, hour, minute).toISOString();

  it("date une ligne : l'heure aujourd'hui, « Hier », puis le jour", () => {
    expect(formatListDate(at(12, 10, 24), now)).toBe("10:24");
    expect(formatListDate(at(11, 23, 59), now)).toBe("Hier");
    expect(formatListDate(at(9, 8), now)).toBe("9 oct.");
    expect(formatListDate(at(9, 8, 0, 2025), now)).toBe("9 oct. 2025");
    expect(formatListDate(null, now)).toBe("");
    expect(formatListDate("pas une date", now)).toBe("");
  });

  it("intitule un jour dans un fil", () => {
    expect(formatDayHeading(at(12, 9), now)).toBe("Aujourd'hui");
    expect(formatDayHeading(at(11, 9), now)).toBe("Hier");
    expect(formatDayHeading(at(9, 9), now)).toBe("Vendredi 9 octobre");
  });

  it("dit depuis quand", () => {
    expect(formatSince(at(12, 15, 59, 2026), now)).toBe("Il y a 1 min");
    expect(formatSince(at(12, 14), now)).toBe("Il y a 2 h");
    expect(formatSince(at(11, 14), now)).toBe("Hier");
    expect(formatSince(new Date(now.getTime() - 20_000).toISOString(), now)).toBe("À l'instant");
  });
});
