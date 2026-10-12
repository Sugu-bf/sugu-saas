import { describe, expect, it, vi } from "vitest";

// The list states and the invitation code reach the HTTP client; isolate from env validation.
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

import { ApiError } from "@/lib/http/api-error";
import { maskCode } from "../components/invitation-code";
import { tilePosition } from "../components/static-map";
import { describeAgencyFailure, describeRejection } from "../errors";
import {
  formatDay,
  formatDayTime,
  formatDuration,
  formatLongDate,
  formatRate,
  formatTime,
  mapsPointHref,
  mapsSearchHref,
  parseDate,
  relativeTime,
  shortName,
  since,
  telHref,
  whatsappHref,
} from "../format";
import {
  DEFAULT_LIST_STATE,
  filtersOf,
  isNarrowed,
  readListState,
  statusSelectValue,
  withStatusSelect,
  writeListState,
} from "@/app/(agency)/agency/deliveries/list-state";
import * as couriersList from "@/app/(agency)/agency/drivers/list-state";

const now = new Date("2026-10-11T16:00:00");

describe("dates", () => {
  it("prints a dash, never a guess, for a date that is missing or not one", () => {
    expect([formatTime(null), formatDay(undefined), formatDayTime("not a date"), formatLongDate("")]).toEqual(["—", "—", "—", "—"]);
    expect(parseDate("2026-13-45")).toBeNull();
  });

  it("reads a day without an hour as that day here", () => {
    const day = parseDate("2026-03-05");
    expect([day?.getFullYear(), day?.getMonth(), day?.getDate(), day?.getHours()]).toEqual([2026, 2, 5, 0]);
    expect(formatLongDate("2026-03-05")).toBe("5 mars 2026");
  });

  it("gives the year only when it is not the current one", () => {
    expect(formatDay("2026-10-08T09:00:00", now)).toBe("8 oct.");
    expect(formatDay("2025-10-08T09:00:00", now)).toBe("8 oct. 2025");
  });

  it("says how long ago in the largest unit that fits", () => {
    const ago = (minutes: number) => relativeTime(new Date(now.getTime() - minutes * 60_000).toISOString(), now);
    expect([ago(0), ago(5), ago(59), ago(60), ago(150), ago(24 * 60), ago(9 * 24 * 60)]).toEqual(["À l'instant", "Il y a 5 min", "Il y a 59 min", "Il y a 1 h", "Il y a 2 h", "Il y a 1 j", "Il y a 9 j"]);
    expect(relativeTime(null, now)).toBeNull();
  });

  it("prints durations and seniority", () => {
    expect([formatDuration(28), formatDuration(60), formatDuration(65), formatDuration(125)]).toEqual(["28 min", "1 h 00", "1 h 05", "2 h 05"]);
    expect([since("2026-10-01", now), since("2026-03-05", now), since("2023-10-11", now), since("2024-11-01", now), since(null, now)]).toEqual([
      "Depuis moins d'un mois",
      "Depuis 7 mois",
      "Depuis 3 ans",
      "Depuis 1 an",
      null,
    ]);
    expect([formatRate(97), formatRate(96.94)]).toEqual(["97 %", "96,9 %"]);
  });
});

describe("links", () => {
  it("builds a call, a chat and a map from what the record holds", () => {
    expect(telHref("+226 70 12 34 56")).toBe("tel:+22670123456");
    expect(whatsappHref("+226 70 12 34 56")).toBe("https://wa.me/22670123456");
    expect(mapsSearchHref("Avenue Kwame Nkrumah, Ouagadougou")).toBe("https://www.google.com/maps/search/?api=1&query=Avenue%20Kwame%20Nkrumah%2C%20Ouagadougou");
    expect(mapsPointHref(12.3657, -1.5339)).toBe("https://www.google.com/maps/search/?api=1&query=12.3657,-1.5339");
  });
});

describe("failures", () => {
  it("shows the sentence of a bare code, never the code", () => {
    const failure = describeAgencyFailure(new ApiError({ message: "SUGU-AGENCY-NOT-ACCEPTED", status: 422 }));
    expect(failure.message).toBe("Acceptez d'abord cette livraison : elle ne peut être ni assignée ni modifiée avant.");
    expect(describeAgencyFailure(new ApiError({ message: "SUGU-ADDED-LATER", status: 422 })).message).not.toContain("SUGU");
  });

  it("words what the backend does not word for the agency", () => {
    expect(describeAgencyFailure(new ApiError({ message: "HTTP 404", status: 404 }))).toMatchObject({ kind: "not_found", message: "Cet élément est introuvable, ou n'appartient pas à votre agence." });
    expect(describeAgencyFailure(new ApiError({ message: "SQLSTATE[23505]", status: 500 })).message).toBe("Le serveur a rencontré un problème. Réessayez dans un instant.");
    expect(describeAgencyFailure(new ApiError({ message: "Network error", status: 0 })).kind).toBe("network");
  });

  it("keeps the sentence of a refusal written for the user, and its field errors", () => {
    const failure = describeAgencyFailure(new ApiError({ message: "Erreur de validation.", status: 422, errors: { phone: ["Ce numéro de téléphone est déjà associé à un compte."] } }));
    expect(failure).toMatchObject({ kind: "validation", fields: { phone: "Ce numéro de téléphone est déjà associé à un compte." } });
    expect(describeAgencyFailure(new ApiError({ message: "Cette livraison a déjà été acceptée ou refusée.", status: 409 })).message).toBe("Cette livraison a déjà été acceptée ou refusée.");
  });

  // The refusals the API holds by itself since V3.1: a courier who cannot work, a COD Mixte parcel whose fee is not paid.
  it("has a sentence for each refusal of the rules, whether its code comes alone, with its sentence, or as a bulk reason", () => {
    const sentences = {
      "SUGU-COURIER-SUSPENDED": "Le compte de ce livreur est suspendu : aucune course ne peut lui être confiée.",
      "SUGU-COURIER-NOT-VERIFIED": "Les pièces de ce livreur ne sont pas encore validées : aucune course ne peut lui être confiée.",
      "SUGU-COURIER-PAUSED": "Ce livreur est en pause : aucune course ne peut lui être confiée.",
      "SUGU-COD-MIXTE-DELIVERY-FEE-UNPAID": "Le client doit régler les frais de livraison avant le départ du livreur.",
    };
    for (const [code, sentence] of Object.entries(sentences)) {
      expect(describeAgencyFailure(new ApiError({ message: code, status: 422 })).message, code).toBe(sentence);
      expect(describeAgencyFailure(new ApiError({ message: `${code}: une phrase du serveur`, status: 422 })).message, code).toBe(sentence);
      expect(describeRejection(code), code).toBe(sentence);
    }
  });

  // Laravel words a rate limit in English (« Too Many Attempts. »): it was shown as it came.
  it("asks to wait when requests come too fast, in its own words", () => {
    const failure = describeAgencyFailure(new ApiError({ message: "Too Many Attempts.", status: 429 }));
    expect(failure).toMatchObject({ kind: "throttled", message: "Trop de demandes en peu de temps. Patientez une minute, puis réessayez." });
  });

  it("turns the reason of a bulk refusal into a sentence", () => {
    expect(describeRejection("SUGU-STATUS-TRANSITION-INVALID")).toBe("Ce changement de statut n'est pas possible depuis l'état actuel de la livraison.");
    expect(describeRejection("SUGU-SOMETHING-NEW")).not.toContain("SUGU");
  });
});

describe("deliveries list state", () => {
  const read = (query: string) => readListState(new URLSearchParams(query));

  it("has a clean address for the plain list", () => {
    expect(writeListState(DEFAULT_LIST_STATE).toString()).toBe("");
    expect(isNarrowed(DEFAULT_LIST_STATE)).toBe(false);
  });

  it("survives a round trip through the address", () => {
    const query = "status=in_transit&scope=late&q=awa&date=today&zone=zone-centre&courier=user-1&priority=urgent&sort=shipping_amount&dir=asc&page=3&size=25";
    expect(writeListState(read(query)).toString()).toBe(query);
    expect(filtersOf(read(query))).toEqual({ status: "in_transit", scope: "late", search: "awa", date: "today", zoneId: "zone-centre", courierId: "user-1", priority: "urgent", sort: "shipping_amount", direction: "asc" });
  });

  it("drops what it does not recognise, so a hand-edited address cannot send an invalid filter", () => {
    expect(read("status=nope&scope=everything&date=1999&priority=max&sort=id&page=-2&size=1000&zone=a b&courier=<x>")).toEqual(DEFAULT_LIST_STATE);
  });

  it("shows « À accepter » in the status filter, though it is a group and not a status", () => {
    expect(statusSelectValue(read("scope=awaiting_decision"))).toBe("to_accept");
    expect(withStatusSelect("to_accept", { scope: "" })).toEqual({ status: "", scope: "awaiting_decision" });
    // Leaving it leaves its group; another group chosen above the list stays.
    expect(withStatusSelect("assigned", { scope: "awaiting_decision" })).toEqual({ status: "assigned", scope: "" });
    expect(withStatusSelect("assigned", { scope: "late" })).toEqual({ status: "assigned", scope: "late" });
  });

  // Found on real data (V3.1): by its status alone, « À assigner » also listed the requests the agency
  // had not accepted, which read « À accepter »: four rows under a figure that said two.
  it("lists under « À assigner » what waits for a courier, as the figure above the list counts it", () => {
    expect(withStatusSelect("pending", { scope: "" })).toEqual({ status: "", scope: "to_assign" });
    expect(filtersOf({ ...DEFAULT_LIST_STATE, ...withStatusSelect("pending", { scope: "" }) })).toMatchObject({ scope: "to_assign", status: undefined });
    // The figure « À assigner » and the choice of the filter are one and the same list.
    expect(statusSelectValue(read("scope=to_assign"))).toBe("pending");
    expect(withStatusSelect("in_transit", { scope: "to_assign" })).toEqual({ status: "in_transit", scope: "" });
  });

  it("shows « À traiter en priorité » there too: what the dashboard lists first, as a filter of the list", () => {
    expect(read("scope=needs_action").scope).toBe("needs_action");
    expect(filtersOf(read("scope=needs_action")).scope).toBe("needs_action");
    expect(statusSelectValue(read("scope=needs_action"))).toBe("needs_action");
    // Choosing it replaces a status and a group; « Tous les statuts » leaves it.
    expect(withStatusSelect("needs_action", { scope: "late" })).toEqual({ status: "", scope: "needs_action" });
    expect(withStatusSelect("", { scope: "needs_action" })).toEqual({ status: "", scope: "" });
  });
});

describe("couriers list state", () => {
  it("round-trips and drops what it does not recognise", () => {
    const read = (query: string) => couriersList.readListState(new URLSearchParams(query));
    expect(couriersList.writeListState(couriersList.DEFAULT_LIST_STATE).toString()).toBe("");
    expect(couriersList.writeListState(read("activity=available&quartier=Gounghin&q=moussa&dir=desc&page=2")).toString()).toBe("activity=available&quartier=Gounghin&q=moussa&dir=desc&page=2");
    expect(read("activity=sleeping&sort=password&page=0")).toEqual(couriersList.DEFAULT_LIST_STATE);
    expect(couriersList.filtersOf(read("activity=paused"))).toEqual({ activity: "paused", quartier: undefined, search: undefined, sort: "name", direction: "asc" });
  });
});

describe("small pieces", () => {
  it("names a courier in a narrow column by his first name and an initial", () => {
    expect(shortName("Moussa Kaboré")).toBe("Moussa K.");
    expect(shortName("  Jean-Baptiste   Nikiéma ")).toBe("Jean-Baptiste N.");
    expect(shortName("Awa Marie ilboudo")).toBe("Awa I.");
    // A single name is nobody's initial.
    expect(shortName("Salif")).toBe("Salif");
  });

  it("hides the middle of the recruitment code", () => {
    expect(maskCode("FASO2026")).toBe("FASO••26");
    expect(maskCode("AB12")).toBe("••••");
  });

  it("places a point on the tile grid of the map", () => {
    // Greenwich on the equator is the middle of the grid at any zoom.
    expect(tilePosition(0, 0, 1)).toEqual({ x: 1, y: 1 });
    const ouaga = tilePosition(12.3657, -1.5339, 15);
    expect(Math.floor(ouaga.x)).toBe(16244);
    expect(Math.floor(ouaga.y)).toBe(15249);
  });
});
