import { describe, expect, it } from "vitest";
import { deliveryPaymentStatus, formatMoneyFromFrancs } from "@/design-system";
import { paymentCodeOf } from "../components/delivery-bits";
import {
  deliveryLabel,
  displayStatusOf,
  parseBulkOutcome,
  parseDeliveryDetail,
  parseDeliveryListPage,
  parseDeliveryRow,
} from "../deliveries/contract";
import { UNDATED_LABEL, buildJourneyView } from "../deliveries/journey";
import {
  EMPTY_NEW_DELIVERY,
  NEW_DELIVERY_FIELDS,
  newDeliveryRequest,
  parseAmount,
  validateNewDelivery,
  type NewDeliveryForm,
} from "../deliveries/new-delivery";
import { codMixteSummaryOf, paymentMethodLabel, paymentWords, priorityLabel } from "../deliveries/payment";
import { parseShopSuggestions } from "../deliveries/shops";
import { rawDetail, rawOverview, rawRow } from "./fixtures";

describe("delivery row", () => {
  it("converts every amount from centimes to francs, once", () => {
    const row = parseDeliveryRow(rawRow({ shipping_amount: 150000 }));
    expect(row.feeFrancs).toBe(1500);
    expect(row.orderTotalFrancs).toBe(15000);
    expect(formatMoneyFromFrancs(row.feeFrancs)).toMatch(/^1\s500\sFCFA$/);
  });

  it("keeps the two ids of a courier apart: his page, and what assignment expects", () => {
    const row = parseDeliveryRow(rawRow());
    expect(row.courier).toMatchObject({ id: "courier-profile-1", userId: "user-1", name: "Moussa Kaboré" });
    // An older backend answers one id only: it is used for both.
    const old = parseDeliveryRow(rawRow({ courier: { id: "user-9", name: "Awa", phone: null, vehicle_type: null } }));
    expect(old.courier).toMatchObject({ id: "user-9", userId: "user-9" });
    expect(parseDeliveryRow(rawRow({ courier: null })).courier).toBeNull();
  });

  it("reads what the agency may do from the server, and nothing when it does not say", () => {
    const row = parseDeliveryRow(rawRow());
    expect(row).toMatchObject({ nextStatuses: ["in_transit", "pending", "delivery_failed"], canAssign: false, canReassign: true, awaitingDecision: false, late: false });

    const silent = parseDeliveryRow(rawRow({ next_statuses: undefined, can_assign: undefined, can_reassign: undefined, awaiting_decision: undefined, late: undefined, zone: undefined, pickup: undefined, source: undefined }));
    expect(silent).toMatchObject({ nextStatuses: [], canAssign: false, canReassign: false, awaitingDecision: false, late: false, zone: null, manual: false });
    // The store of the order stands for the pickup point an older backend does not answer.
    expect(silent.pickup).toEqual({ name: "Atelier Wend-Kuni", address: "Marché Rood-Woko", phone: null });
  });

  it("keeps a status code it does not know, and shows a request as « À accepter » whatever its code", () => {
    expect(parseDeliveryRow(rawRow({ status: "a_status_added_later" })).status).toBe("a_status_added_later");
    expect(displayStatusOf(parseDeliveryRow(rawRow({ status: "pending", awaiting_decision: true })))).toBe("to_accept");
    expect(displayStatusOf(parseDeliveryRow(rawRow({ status: "awaiting_fee_payment", awaiting_decision: true })))).toBe("to_accept");
    expect(displayStatusOf(parseDeliveryRow(rawRow({ status: "pending" })))).toBe("pending");
  });

  it("reads COD Mixte only when the order is one", () => {
    expect(parseDeliveryRow(rawRow()).codMixte).toBeNull();
    const cod = parseDeliveryRow(
      rawRow({ cod_mixte: { isCodMixte: true, deliveryFeePaid: true, productFeePaid: false, deliveryFeeAmount: 150000, productFeeAmount: 1350000 } }),
    ).codMixte;
    expect(cod).toEqual({ deliveryFeePaid: true, productFeePaid: false, deliveryFeeFrancs: 1500, productFeeFrancs: 13500 });
  });

  it("names a delivery without a number, and never builds one from its id", () => {
    const row = parseDeliveryRow(rawRow({ order: null }));
    expect(row.reference).toBeNull();
    expect(deliveryLabel(row.reference)).toBe("Sans numéro");
    expect(row.recipient).toEqual({ name: null, phone: null, address: null, city: null });
  });
});

describe("delivery list", () => {
  const payload = { summary: {}, statusCounts: { all: 34, pending: 8 }, overview: rawOverview, zones: [{ id: "zone-centre", name: "Centre", count: 9 }], shipments: [rawRow()], pagination: { total: 34 } };

  it("keeps the total of the server and the page that was asked", () => {
    const page = parseDeliveryListPage(payload, { page: 2, pageSize: 10 });
    expect(page).toMatchObject({ total: 34, page: 2, pageSize: 10, overview: rawOverview });
    expect(page.rows).toHaveLength(1);
    expect(page.zones).toEqual([{ id: "zone-centre", name: "Centre", count: 9 }]);
  });

  it("shows no group and no zone on a backend that does not count them, instead of zeros", () => {
    const page = parseDeliveryListPage({ ...payload, overview: undefined, zones: undefined }, { page: 1, pageSize: 10 });
    expect(page.overview).toBeNull();
    expect(page.zones).toBeNull();
  });

  it("refuses a payload that is not a list", () => {
    expect(() => parseDeliveryListPage({ data: [] }, { page: 1, pageSize: 10 })).toThrow();
  });
});

describe("delivery page", () => {
  it("reads the record of the courier, the notes, the items and the journey", () => {
    const detail = parseDeliveryDetail(rawDetail());
    expect(detail.courier).toMatchObject({ employeeId: "LV-001", vehiclePlate: "11 KK 4521", totalDeliveries: 125, successRate: 96, ratingCount: 28 });
    expect(detail.notes).toEqual([{ id: "n1", text: "Le client préfère un appel.", author: "Manager", at: "2026-10-11T15:20:00+00:00" }]);
    expect(detail.items).toEqual([{ name: "Pagne tissé", quantity: 2, unitPriceFrancs: 7500, image: null }]);
    expect(detail.journey?.steps.map((step) => `${step.key}:${step.status}`)).toEqual(["received:done", "accepted:done", "assigned:current", "picked_up:upcoming", "in_transit:upcoming", "delivered:upcoming"]);
    expect(detail.paymentMethod).toBe("mobile_money");
    expect(detail.addressLine2).toBe("2e étage");
  });

  it("tells a position that was not recorded from one that was not answered to this user", () => {
    expect(parseDeliveryDetail(rawDetail()).position).toEqual({ lat: 12.3657, lng: -1.5339, recordedAt: "2026-10-11T15:57:00+00:00", distanceKm: 2.1 });
    expect(parseDeliveryDetail(rawDetail({ position: null })).position).toBeNull();
    // A courier reading a delivery of his agency: the key is absent.
    const forCourier = parseDeliveryDetail(rawDetail({ position: undefined, recipient: undefined }));
    expect(forCourier.position).toBeUndefined();
    expect(forCourier.recipientRecord).toBeNull();
  });

  it("has a schedule only when something was promised", () => {
    expect(parseDeliveryDetail(rawDetail()).schedule).toBeNull();
    expect(parseDeliveryDetail(rawDetail({ schedule: { scheduled_at: null, date: "2026-10-11", from: "14:00", to: "17:00" } })).schedule).toEqual({ date: "2026-10-11", from: "14:00", to: "17:00" });
  });

  it("draws no journey on a backend that sends none", () => {
    const detail = parseDeliveryDetail(rawDetail({ journey: undefined }));
    expect(detail.journey).toBeNull();
    expect(buildJourneyView(detail)).toBeNull();
  });
});

describe("journey view", () => {
  it("words the delivery as a whole from its status, and each step from its key", () => {
    const view = buildJourneyView(parseDeliveryDetail(rawDetail()));
    expect(view).toMatchObject({ headline: "Colis à ramasser", tone: "info" });
    expect(view?.summary).toBe("Moussa Kaboré doit collecter le colis auprès de Atelier Wend-Kuni.");
    expect(view?.steps.map((step) => step.title)).toEqual(["Demande reçue", "Acceptée par l'agence", "Livreur assigné", "Colis collecté", "En livraison", "Livrée"]);
    // The banner leaves the agency's own decision out.
    expect(view?.milestones.map((step) => step.key)).toEqual(["received", "assigned", "picked_up", "in_transit", "delivered"]);
  });

  it("prints a step reached at a moment nothing recorded as such, and dates nothing that has not happened", () => {
    const view = buildJourneyView(parseDeliveryDetail(rawDetail()));
    const [received, , assigned, pickedUp] = view!.steps;
    expect(received.dateTime).toBe("2026-10-11T14:24:00+00:00");
    expect(assigned).toMatchObject({ status: "current", dateTime: null, dateLabel: UNDATED_LABEL });
    expect(pickedUp).toMatchObject({ status: "upcoming", dateTime: null, dateLabel: null, tone: "neutral" });
  });

  it("is a warning while the delivery waits for the agency or is late, and a danger once failed", () => {
    const awaiting = parseDeliveryDetail(rawDetail({ status: "pending", awaiting_decision: true, courier: null }));
    expect(buildJourneyView(awaiting)).toMatchObject({ headline: "Demande à accepter", tone: "warning" });

    const late = parseDeliveryDetail(rawDetail({ status: "in_transit", late: true }));
    expect(buildJourneyView(late)).toMatchObject({ headline: "Colis en route", tone: "warning" });

    const failed = parseDeliveryDetail(
      rawDetail({
        status: "delivery_failed",
        journey: { state: "failed", steps: [{ key: "received", status: "done", timestamp: "2026-10-11T14:24:00+00:00" }, { key: "delivery_failed", status: "current", timestamp: "2026-10-11T15:00:00+00:00" }] },
      }),
    );
    const view = buildJourneyView(failed);
    expect(view).toMatchObject({ headline: "Livraison échouée", tone: "danger" });
    expect(view?.steps.at(-1)).toMatchObject({ key: "delivery_failed", title: "Livraison échouée", tone: "danger" });
  });

  it("calls a delivery the agency entered itself a course it created", () => {
    const manual = parseDeliveryDetail(rawDetail({ source: "agency_manual" }));
    expect(buildJourneyView(manual)?.steps[0]).toMatchObject({ title: "Course créée", summary: "Saisie par votre agence." });
  });
});

describe("bulk outcome", () => {
  it("lists what was refused with the code of each reason", () => {
    expect(parseBulkOutcome({ updated_count: 2, updated: ["a", "b"], rejected: [{ shipment_id: "c", reason: "SUGU-AGENCY-NOT-ACCEPTED" }] })).toEqual({
      updatedCount: 2,
      rejected: [{ id: "c", reason: "SUGU-AGENCY-NOT-ACCEPTED" }],
    });
    // An older bulk assignment answered a count only.
    expect(parseBulkOutcome({ updated_count: 3 })).toEqual({ updatedCount: 3, rejected: [] });
  });
});

describe("payment", () => {
  it("sums what is paid and what is left for COD Mixte, and nothing for the rest", () => {
    const cod = codMixteSummaryOf(parseDeliveryRow(rawRow({ cod_mixte: { isCodMixte: true, deliveryFeePaid: true, productFeePaid: false, deliveryFeeAmount: 150000, productFeeAmount: 1350000 } })));
    expect(cod).toMatchObject({ totalFrancs: 15000, paidFrancs: 1500, dueFrancs: 13500 });
    expect(codMixteSummaryOf(parseDeliveryRow(rawRow()))).toBeNull();
  });

  // Found on the real API (V3.1): it answered the raw status of the order, `unpaid` for a COD Mixte
  // delivery, which no screen knew: the list read « Statut inconnu ».
  it("reads where the payment stands from the code the backend derives, and the raw status before it does", () => {
    const order = (payment: Record<string, unknown>) => parseDeliveryRow(rawRow({ order: { ...(rawRow().order as object), ...payment } }));
    const labelOfPayment = (code: string) => deliveryPaymentStatus.resolve(code).label;

    expect(order({ payment_status: "unpaid", payment_status_code: "cod_pending" }).paymentStatus).toBe("cod_pending");
    expect(order({ payment_status: "paid", payment_status_code: "paid" }).paymentStatus).toBe("paid");
    // A backend older than V3.1 answers the raw column only: it is kept, and has a label.
    expect(order({ payment_status: "unpaid" }).paymentStatus).toBe("unpaid");
    expect(labelOfPayment("unpaid")).toBe("Non réglé");
    // Every raw status of an order, and every code the backend derives, is one the badge knows.
    for (const code of ["unpaid", "pending", "paid", "failed", "refunded", "hold", "partial", "cod_pending"]) {
      expect(labelOfPayment(code), code).not.toBe(labelOfPayment("a_code_added_later"));
    }
  });

  it("shows the payment of a COD Mixte delivery by its two fees, and cash to collect for a delivery the agency typed as such", () => {
    const mixte = (deliveryFeePaid: boolean, productFeePaid: boolean) =>
      parseDeliveryRow(rawRow({ cod_mixte: { isCodMixte: true, deliveryFeePaid, productFeePaid, deliveryFeeAmount: 150000, productFeeAmount: 1350000 } }));
    expect([mixte(false, false), mixte(true, false), mixte(false, true), mixte(true, true)].map(paymentCodeOf)).toEqual(["cod_pending", "partial", "partial", "paid"]);

    const order = { ...(rawRow().order as object), payment_status: "pending", payment_status_code: "pending" };
    // « À encaisser à la livraison » in the form of a new delivery is stored as a pending payment.
    expect(paymentCodeOf(parseDeliveryRow(rawRow({ source: "agency_manual", order })))).toBe("cod_pending");
    // For a marketplace order it is a payment that has not come in.
    expect(paymentCodeOf(parseDeliveryRow(rawRow({ order })))).toBe("pending");
    expect(paymentCodeOf(parseDeliveryRow(rawRow({ source: "agency_manual" })))).toBe("paid");
  });

  it("says the payment in words on the printed slip, and guesses nothing for a code it does not know", () => {
    expect(["paid", "partial", "cod_pending", "pending", "unpaid", "hold", "refunded", "failed"].map(paymentWords)).toEqual([
      "payée",
      "payée en partie",
      "à encaisser à la livraison",
      "paiement en attente",
      "non réglée",
      "paiement en vérification",
      "remboursée",
      "non payée",
    ]);
    expect([paymentWords("a_code_added_later"), paymentWords(null)]).toEqual(["paiement à confirmer", "paiement à confirmer"]);
  });
  it("names the payment methods it knows and shows the others as they are", () => {
    expect(paymentMethodLabel("cash")).toBe("Espèces");
    expect(paymentMethodLabel("Orange_Money")).toBe("Orange Money");
    expect(paymentMethodLabel("crypto")).toBe("crypto");
    expect(paymentMethodLabel(null)).toBeNull();
  });

  it("reads the priority thresholds of the backend", () => {
    expect([20, 30, 31, 100, 101, 150].map(priorityLabel)).toEqual(["Urgente", "Urgente", "Normale", "Normale", "Basse", "Basse"]);
  });
});

describe("new delivery form", () => {
  const filled: NewDeliveryForm = {
    ...EMPTY_NEW_DELIVERY,
    vendorName: " Pressing Le Baobab ",
    itemsCount: "2",
    orderTotal: "6 000",
    pickupAddress: "Avenue Yennenga",
    deliveryAddress: "Ouaga 2000, villa 27",
    clientName: "Awa Ndiaye",
    clientPhone: "+226 70 12 34 56",
  };

  it("reads amounts as people type them", () => {
    expect([parseAmount("6 000"), parseAmount("1500,5"), parseAmount("0"), parseAmount(""), parseAmount("abc"), parseAmount("-5")]).toEqual([6000, 1500.5, 0, null, null, null]);
  });

  it("checks one step at a time, and everything before sending", () => {
    expect(Object.keys(validateNewDelivery(EMPTY_NEW_DELIVERY, "parcel"))).toEqual(["vendorName", "orderTotal"]);
    expect(Object.keys(validateNewDelivery(EMPTY_NEW_DELIVERY, "addresses"))).toEqual(["pickupAddress", "deliveryAddress", "clientName", "clientPhone"]);
    expect(validateNewDelivery(EMPTY_NEW_DELIVERY, "courier")).toEqual({});
    expect(validateNewDelivery(filled)).toEqual({});
    // Every field that can be wrong belongs to a step: none is lost between two.
    for (const field of Object.keys(validateNewDelivery(EMPTY_NEW_DELIVERY))) expect(NEW_DELIVERY_FIELDS[field as keyof NewDeliveryForm]).toBeDefined();
  });

  it("refuses a slot without a date, or one that ends before it starts", () => {
    expect(validateNewDelivery({ ...filled, timeFrom: "14:00", timeTo: "16:00" })).toEqual({ deliveryDate: "Un créneau demande une date de livraison." });
    expect(validateNewDelivery({ ...filled, deliveryDate: "2026-10-12", timeFrom: "16:00", timeTo: "14:00" })).toEqual({ timeTo: "La fin du créneau doit suivre son début." });
    expect(validateNewDelivery({ ...filled, deliveryDate: "2026-10-12", timeFrom: "14:00", timeTo: "16:00" })).toEqual({});
  });

  it("refuses a phone too short and an e-mail that is not one", () => {
    expect(validateNewDelivery({ ...filled, clientPhone: "70 12", clientEmail: "awa@" })).toEqual({ clientPhone: "Ce numéro est trop court.", clientEmail: "Cette adresse e-mail n'est pas valide." });
  });

  it("becomes the request of the endpoint: francs, trimmed, and nothing for what is empty", () => {
    const request = newDeliveryRequest({ ...filled, courierUserId: "user-1", priority: "urgent", shippingAmount: "1 500", deliveryDate: "2026-10-12", timeFrom: "14:00", timeTo: "16:00" });
    expect(request).toEqual({
      vendor_name: "Pressing Le Baobab",
      items_count: 2,
      order_total: 6000,
      payment_status: "pending",
      payment_method: "cash",
      order_notes: undefined,
      pickup_address: "Avenue Yennenga",
      pickup_phone: undefined,
      delivery_address: "Ouaga 2000, villa 27",
      delivery_instructions: undefined,
      client_name: "Awa Ndiaye",
      client_phone: "+226 70 12 34 56",
      client_email: undefined,
      courier_id: "user-1",
      priority: 20,
      shipping_amount: 1500,
      delivery_date: "2026-10-12",
      time_slot_from: "14:00",
      time_slot_to: "16:00",
    });
    // Assigning later sends no courier at all, and an unpriced delivery no price.
    const later = newDeliveryRequest(filled);
    expect(later.courier_id).toBeUndefined();
    expect(later.shipping_amount).toBeUndefined();
    expect(later.priority).toBe(100);
  });
});

describe("shop suggestions", () => {
  // A shop as the public listing answers it: its logo and its cover are objects.
  const card = (overrides: Record<string, unknown> = {}) => ({
    id: "01HSHOP",
    slug: "maison-sika",
    name: "Maison Sika",
    logo: { url: "https://cdn.example.test/logo.jpg", alt: "Maison Sika" },
    cover_image: { url: "https://cdn.example.test/cover.jpg", alt: "Maison Sika" },
    rating: { avg: 4.6, count: 12 },
    contact: { address_line: "Avenue Kwame Nkrumah, Ouagadougou, Kadiogo", zip: "", email: "", phone: "+22625301122" },
    ...overrides,
  });

  it("reads the name, the address and the phone of each shop of the listing", () => {
    expect(parseShopSuggestions({ success: true, items: [card()], facets: { rating: [] }, meta: {} })).toEqual([
      { id: "01HSHOP", name: "Maison Sika", address: "Avenue Kwame Nkrumah, Ouagadougou, Kadiogo", phone: "+22625301122" },
    ]);
  });

  it("has no address for a shop that gave none: the sentence of the listing is not one", () => {
    const [shop] = parseShopSuggestions({ items: [card({ contact: { address_line: "Adresse non renseignée", phone: "" } })] });
    expect(shop.address).toBeNull();
    expect(shop.phone).toBeNull();
    expect(parseShopSuggestions({ items: [card({ contact: undefined })] })[0]).toMatchObject({ address: null, phone: null });
  });

  it("leaves out a shop it cannot read, not the whole list, and answers nothing for anything else", () => {
    expect(parseShopSuggestions({ items: [card({ name: "" }), card({ id: 7, name: "Faso Tissus" })] })).toMatchObject([{ id: "7", name: "Faso Tissus" }]);
    expect(parseShopSuggestions({ success: false, message: "Erreur" })).toEqual([]);
    expect(parseShopSuggestions(null)).toEqual([]);
  });
});
