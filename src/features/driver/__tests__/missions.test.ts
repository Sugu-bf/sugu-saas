import { describe, expect, it, vi } from "vitest";

// The contracts reach the HTTP client; isolate from env validation.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://api.test/api/v1",
    NEXT_PUBLIC_APP_NAME: "SUGU",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_MARKETPLACE_URL: "https://sugu.pro",
    NEXT_PUBLIC_ENABLE_MSW: false,
    NEXT_PUBLIC_REVERB_APP_KEY: "k",
    NEXT_PUBLIC_REVERB_HOST: "localhost",
    NEXT_PUBLIC_REVERB_PORT: 8080,
    NEXT_PUBLIC_REVERB_SCHEME: "https",
  },
}));

import { formatMoneyFromCents } from "@/design-system";
import { courierMissionStatus } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { describeDriverFailure, isNotOperational } from "../errors";
import { JOURNEY, MISSION_STAGES, can, collectionOf, journeyOf, missionLabel, parseMission, parseMissionDetail, parseMissionList, parseOverview } from "../missions/contract";
import { ACTION_DONE, ACTION_LABEL, blockedReason, failureLabel } from "../missions/wording";
import { parseHistory } from "../history/contract";

// What `courier/deliveries*`, `courier/dashboard` and `courier/history`
// answer (CourierDeliveryService, ../sugu), as Laravel writes it: snake_case,
// centimes, the stage and the actions decided by the server.

/** An amount as it is printed, its narrow no-break spaces written as plain ones. */
const money = (cents: number) => formatMoneyFromCents(cents).replace(/\s/g, " ");

/** A row of the list, as `transformRow` answers it. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "01hmission206",
    order_id: "#SU-2026-000206",
    reference: "SU-2026-000206",
    status: "assigned",
    stage: "to_collect",
    next_actions: ["refuse", "confirm_collection", "signal_delay", "mark_failed"],
    blocked_actions: { start_transit: "COLLECTION_PENDING" },
    pickup: { name: "Boutique Awa", address: "Secteur 16, Ouagadougou" },
    delivery: { name: "Ousmane Zongo", address: "Secteur 22, Ouagadougou" },
    recipient: { name: "Ousmane Zongo", line1: "Secteur 22, rue 22.14", city: "Ouagadougou" },
    client: { name: "Ousmane Zongo", phone: "+226 76 44 ****", address: "Secteur 22", note: null },
    amount: 150000,
    order_total: 1250000,
    order_payment: "cod",
    payment_mode: "cod",
    cash_to_collect: 1250000,
    distance_km: 0,
    duration_min: 0,
    parcel_count: 1,
    assigned_to_me: true,
    accepted_at: "2026-10-12T10:15:00+00:00",
    picked_at: null,
    delivered_at: null,
    scheduled_at: null,
    updated_at: "2026-10-12T10:20:00+00:00",
    failure: null,
    codMixte: null,
    ...overrides,
  };
}

const mixte = (delivery: boolean, product: boolean) => ({
  isCodMixte: true,
  currentStep: "awaiting_delivery_payment",
  deliveryFeePaid: delivery,
  productFeePaid: product,
  deliveryFeeAmount: 150000,
  productFeeAmount: 500000,
  deliveryFeePaidAt: delivery ? "2026-10-12T10:30:00+00:00" : null,
  productFeePaidAt: null,
});

describe("a mission, as the server answers it", () => {
  it("keeps the stage and the actions the server decided, and copies no rule", () => {
    const mission = parseMission(row());

    expect(mission.stage).toBe("to_collect");
    expect(mission.status).toBe("assigned");
    expect(mission.actions).toEqual(["refuse", "confirm_collection", "signal_delay", "mark_failed"]);
    expect(mission.blocked).toEqual({ start_transit: "COLLECTION_PENDING" });
    expect(can(mission, "confirm_collection")).toBe(true);
    // Not in the answer: not offered, whatever the status looks like.
    expect(can(mission, "start_transit")).toBe(false);
    expect(can(mission, "mark_delivered")).toBe(false);
  });

  it("drops an action it does not know instead of offering a button for it", () => {
    expect(parseMission(row({ next_actions: ["accept", "teleport", "mark_failed"] })).actions).toEqual(["accept", "mark_failed"]);
  });

  it("keeps a stage it does not know as it is: it is shown as unknown, never as something else", () => {
    const mission = parseMission(row({ stage: "returned_to_sender" }));
    expect(mission.stage).toBe("returned_to_sender");
    expect(courierMissionStatus.resolve(mission.stage)).toMatchObject({ known: false, label: "Statut inconnu" });
  });

  it("names every stage the server can answer", () => {
    for (const stage of MISSION_STAGES) {
      expect(courierMissionStatus.resolve(stage).known, stage).toBe(true);
    }
    // A COD Mixte waiting for its fee is not « En attente »: it says what is awaited.
    expect(courierMissionStatus.resolve("awaiting_fee_payment").label).toBe("Frais attendus");
    expect(courierMissionStatus.resolve("to_collect").label).toBe("À collecter");
    // The history answers the raw status of the shipment.
    expect(courierMissionStatus.resolve("delivery_failed").label).toBe("Échec");
  });

  it("reads the reference with or without the number sign, and says so when there is none", () => {
    expect(parseMission(row({ reference: null })).reference).toBe("SU-2026-000206");
    expect(parseMission(row({ reference: null, order_id: null })).reference).toBeNull();
    expect(missionLabel("SU-2026-000206")).toBe("Mission SU-2026-000206");
    expect(missionLabel(null)).toBe("Mission");
  });

  it("never turns an unknown distance or duration into a zero", () => {
    const unknown = parseMission(row());
    expect(unknown.distanceKm).toBeNull();
    expect(unknown.durationMin).toBeNull();

    const measured = parseMission(row({ distance_km: 3.2, duration_min: 25 }));
    expect(measured.distanceKm).toBe(3.2);
    expect(measured.durationMin).toBe(25);
  });

  it("tells a mission that is free in the agency from the courier's own", () => {
    expect(parseMission(row()).mine).toBe(true);
    expect(parseMission(row({ stage: "available", assigned_to_me: false })).mine).toBe(false);
  });
});

describe("money of a mission: centimes, and what is taken at the door", () => {
  it("reads amounts as centimes: 1 250 000 is 12 500 FCFA", () => {
    const mission = parseMission(row());
    expect(money(mission.cashToCollect)).toBe("12 500 FCFA");
    expect(money(mission.fee)).toBe("1 500 FCFA");
    expect(money(mission.orderTotal)).toBe("12 500 FCFA");
  });

  it("says cash is to be collected only for a plain cash-on-delivery order", () => {
    expect(collectionOf(parseMission(row()))).toEqual({ amount: 1250000, label: "À encaisser (COD)" });
  });

  it("asks for no cash on an order paid online or in advance, and writes no amount that would look like one", () => {
    expect(collectionOf(parseMission(row({ payment_mode: "online", cash_to_collect: 0 })))).toEqual({ amount: null, label: "Payée en ligne : rien à encaisser" });
    expect(collectionOf(parseMission(row({ payment_mode: "cod_prepaid", cash_to_collect: 0 })))).toEqual({ amount: null, label: "Déjà payée : rien à encaisser" });
  });

  it("never asks the courier to collect a COD Mixte: the customer pays by mobile money", () => {
    const unpaid = parseMission(row({ payment_mode: "cod_mixte", cash_to_collect: 0, codMixte: mixte(false, false) }));
    expect(collectionOf(unpaid).amount).toBeNull();
    expect(collectionOf(unpaid).label).toContain("COD Mixte");
    expect(collectionOf(unpaid).label).not.toContain("encaisser");

    const paid = parseMission(row({ payment_mode: "cod_mixte", cash_to_collect: 0, codMixte: { ...mixte(true, true), productFeePaid: true } }));
    expect(collectionOf(paid)).toEqual({ amount: null, label: "Payée par mobile money" });
  });

  it("keeps the two fees of a COD Mixte apart, each in centimes, and null for another order", () => {
    const mission = parseMission(row({ payment_mode: "cod_mixte", codMixte: mixte(true, false) }));
    expect(mission.codMixte).toMatchObject({ deliveryFeePaid: true, productFeePaid: false });
    expect(money(mission.codMixte!.deliveryFeeAmount)).toBe("1 500 FCFA");
    expect(money(mission.codMixte!.productFeeAmount)).toBe("5 000 FCFA");
    expect(parseMission(row()).codMixte).toBeNull();
    expect(parseMission(row({ codMixte: { isCodMixte: false } })).codMixte).toBeNull();
  });

  it("an unknown payment mode is not read as cash to collect", () => {
    const mission = parseMission(row({ payment_mode: "barter", cash_to_collect: 0 }));
    expect(mission.paymentMode).toBe("online");
    expect(collectionOf(mission).amount).toBeNull();
  });
});

describe("the four steps of a mission", () => {
  const at = (stage: string, extra: Record<string, unknown> = {}) => journeyOf(parseMission(row({ stage, ...extra })));

  it("makes the step reached last the current one", () => {
    expect(JOURNEY.map((step) => step.label)).toEqual(["Assignée", "Collectée", "En transit", "Livrée"]);
    expect(at("to_accept")).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(at("to_collect")).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(at("collected")).toEqual(["done", "current", "upcoming", "upcoming"]);
    expect(at("in_transit")).toEqual(["done", "done", "current", "upcoming"]);
    expect(at("arrived")).toEqual(["done", "done", "current", "upcoming"]);
  });

  it("has every step done once delivered, and none current once failed", () => {
    expect(at("delivered")).toEqual(["done", "done", "done", "done"]);
    // Failed before the collection, then after it: what was reached stays, nothing is in progress.
    expect(at("failed")).toEqual(["done", "upcoming", "upcoming", "upcoming"]);
    expect(at("failed", { picked_at: "2026-10-12T10:30:00+00:00" })).toEqual(["done", "done", "upcoming", "upcoming"]);
  });

  it("starts nothing for a mission that is not the courier's yet, or in a stage it does not know", () => {
    expect(at("available")).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
    expect(at("returned_to_sender")).toEqual(["upcoming", "upcoming", "upcoming", "upcoming"]);
  });
});

describe("page of a mission", () => {
  const detail = (overrides: Record<string, unknown> = {}) =>
    parseMissionDetail({
      ...row(),
      security_code: "N/A",
      delivery_code_issued: true,
      stops: [
        { id: "pickup-1", store_id: "store-awa", type: "pickup", name: "Boutique Awa", address: "Secteur 16", products: [{ id: "item-1", name: "Pagne", variant: "Bleu", quantity: 2, collected: false }], pickup_code: null, pickup_code_required: true, collected_at: null, is_completed: false },
        { id: "delivery-main", type: "delivery", name: "Ousmane Zongo", address: "Secteur 22", products: [], is_completed: false },
      ],
      canonical_timeline: [{ key: "order_confirmed", label: "Commande confirmée", status: "done", timestamp: "2026-10-12T09:55:00+00:00", store_id: null }],
      positions: { pickup: { lat: 12.35, lng: -1.53 }, dropoff: null },
      ...overrides,
    });

  it("keeps the boutiques to collect apart from the destination, with what each asks for", () => {
    const mission = detail();
    expect(mission.pickups).toHaveLength(1);
    expect(mission.pickups[0]).toMatchObject({ storeId: "store-awa", name: "Boutique Awa", collected: false, codeRequired: true });
    expect(mission.pickups[0].products[0]).toMatchObject({ id: "item-1", quantity: 2 });
  });

  it("holds no code: neither the customer's nor a boutique's", () => {
    // What an older backend still answered is not read at all.
    const mission = detail({ security_code: "DLV48291", stops: [{ id: "p", type: "pickup", name: "B", address: null, products: [], pickup_code: "BTQ12345", pickup_code_required: true, is_completed: false }] });
    expect(JSON.stringify(mission)).not.toContain("DLV48291");
    expect(JSON.stringify(mission)).not.toContain("BTQ12345");
  });

  it("says when no delivery code was issued, and draws only the places the server located", () => {
    expect(detail().deliveryCodeIssued).toBe(true);
    expect(detail({ delivery_code_issued: false }).deliveryCodeIssued).toBe(false);
    expect(detail().positions).toEqual({ pickup: { lat: 12.35, lng: -1.53 }, dropoff: null });
    expect(detail({ positions: undefined }).positions).toEqual({ pickup: null, dropoff: null });
  });

  it("reads the timeline of the order as the server projects it, and invents no step", () => {
    expect(detail().timeline).toEqual([expect.objectContaining({ key: "order_confirmed", status: "done", timestamp: "2026-10-12T09:55:00+00:00" })]);
    expect(detail({ canonical_timeline: undefined }).timeline).toEqual([]);
  });
});

describe("lists, home and history", () => {
  it("reads a page of a list with the counters of the three lists", () => {
    const page = parseMissionList({ counts: { offered: 4, in_progress: 3, done: 28 }, rows: [row(), row({ id: "b" })], pagination: { current_page: 2, total_pages: 3, per_page: 10, total_items: 28 } });
    expect(page.counts).toEqual({ offered: 4, in_progress: 3, done: 28 });
    expect(page.rows.map((mission) => mission.id)).toEqual(["01hmission206", "b"]);
    expect(page).toMatchObject({ page: 2, pageSize: 10, total: 28 });
  });

  it("reads the figures of the home from the server, and no mission when there is none", () => {
    const home = parseOverview({ driver_name: "Moussa Kaboré", agency_name: "Faso Express", is_online: true, counts: { to_accept: 3, in_progress: 2, delivered: 12, failed: 1, week_total: 8 }, next_mission: row(), recent_activity: [{ id: "act-1", type: "delivery_completed", title: "Livraison #SU-1 réussie", subtitle: "O. Zongo · Ouagadougou", time: "il y a 2 heures" }] });
    expect(home.counts).toEqual({ toAccept: 3, inProgress: 2, delivered: 12, failed: 1, weekTotal: 8 });
    expect(home.nextMission?.reference).toBe("SU-2026-000206");
    expect(home.activity).toEqual([{ id: "act-1", type: "delivery_completed", title: "Livraison #SU-1 réussie", detail: "O. Zongo · Ouagadougou", when: "il y a 2 heures" }]);

    const quiet = parseOverview({ driver_name: null, is_online: false, counts: { to_accept: 0, in_progress: 0, delivered: 0, failed: 0, week_total: 0 }, next_mission: null });
    expect(quiet).toMatchObject({ nextMission: null, active: false, activity: [] });
  });

  it("reads the history in centimes, and a reason only for a failure", () => {
    const history = parseHistory({
      status_counts: { all: 2, delivered: 1, failed: 1 },
      rows: [
        { id: "a", reference: "SU-2026-000190", order_id: "#SU-2026-000190", status: "delivered", finished_at: "2026-10-12T14:20:00+00:00", client_name: "Ousmane Zongo", pickup_name: "Boutique Awa", delivery_name: "Ouagadougou", amount: 150000, cash_collected: 575000, fail_reason: null },
        { id: "b", reference: "SU-2026-000188", status: "delivery_failed", finished_at: "2026-10-11T16:40:00+00:00", client_name: "Ali Dembélé", amount: 150000, cash_collected: 0, fail_reason: "Le client ne répond pas" },
      ],
      pagination: { current_page: 1, per_page: 10, total_items: 2 },
    });
    expect(money(history.rows[0].cashCollected)).toBe("5 750 FCFA");
    expect(history.rows[0].failReason).toBeNull();
    expect(history.rows[1]).toMatchObject({ status: "delivery_failed", failReason: "Le client ne répond pas", cashCollected: 0 });
    expect(history.counts).toEqual({ all: 2, delivered: 1, failed: 1 });
  });
});

describe("words and refusals", () => {
  it("has a button and a confirmation for every action the server can allow", () => {
    for (const action of ["accept", "refuse", "confirm_collection", "start_transit", "mark_arrived", "mark_delivered", "signal_delay", "mark_failed"] as const) {
      expect(ACTION_LABEL[action]).toBeTruthy();
      expect(ACTION_DONE[action]).toBeTruthy();
    }
  });

  it("says what holds an action, with a sentence even for a code it does not know", () => {
    expect(blockedReason("DELIVERY_FEE_UNPAID")).toContain("frais de livraison");
    expect(blockedReason("FEES_UNPAID")).toContain("pas encore tout réglé");
    expect(blockedReason("COLLECTION_PENDING")).toContain("collecte");
    expect(blockedReason("SOMETHING_NEW")).toBe("Cette étape n'est pas possible pour le moment.");
    expect(blockedReason(undefined)).toBeNull();
  });

  it("names the reasons of a failure a courier can give", () => {
    expect(failureLabel("CLIENT_REFUSED")).toBe("Le client refuse le colis");
    expect(failureLabel("STATUS_CHANGE")).toBeNull();
    expect(failureLabel(null)).toBeNull();
  });

  it("shows the sentence of a refusal by the server, and a neutral one for what it did not write for the user", () => {
    expect(describeDriverFailure(new ApiError({ status: 422, message: "Le code de sécurité est invalide." })).message).toBe("Le code de sécurité est invalide.");
    expect(describeDriverFailure(new ApiError({ status: 404, message: "Livraison introuvable." }))).toMatchObject({ kind: "not_found", message: "Cette mission est introuvable, ou n'est plus la vôtre." });
    expect(describeDriverFailure(new ApiError({ status: 500, message: "SQLSTATE[23505]" })).message).not.toContain("SQLSTATE");
    expect(describeDriverFailure(new ApiError({ status: 429, message: "Too Many Attempts." })).message).toContain("Patientez");
  });

  it("tells a courier who cannot work from an expired session", () => {
    expect(isNotOperational(new ApiError({ status: 403, code: "COURIER_KYC_PENDING", message: "…" }))).toBe(true);
    expect(isNotOperational(new ApiError({ status: 403, code: "COURIER_NOT_ACTIVE", message: "…" }))).toBe(true);
    expect(isNotOperational(new ApiError({ status: 403, code: "HTTP_403", message: "…" }))).toBe(false);
    expect(isNotOperational(new ApiError({ status: 401, message: "Unauthenticated." }))).toBe(false);
  });
});
