import { describe, expect, it } from "vitest";
import { parseOrderDetail, type OrderActions } from "../contract";
import { TRANSITIONS, orderGuidance, primaryTransition, secondaryTransitions } from "../workflow";
import { detailPayload } from "./fixtures";

const NONE: OrderActions = { confirm: false, cancel: false, requestDelivery: false, markShipped: false, markDelivered: false };
const order = (overrides: Record<string, unknown>) => parseOrderDetail(detailPayload(overrides));

describe("main button", () => {
  it("is the confirmation on a pending order", () => {
    expect(primaryTransition(order({ actions: { ...NONE, confirm: true, cancel: true } }))).toBe("confirm");
  });

  it("is the delivery request on a confirmed order without shipment, shipping stays available", () => {
    const confirmed = order({ statusCode: "confirmed", actions: { ...NONE, cancel: true, requestDelivery: true, markShipped: true } });
    expect(primaryTransition(confirmed)).toBe("requestDelivery");
    expect(secondaryTransitions(confirmed)).toEqual(["markShipped"]);
  });

  it("is the shipping once a shipment exists", () => {
    const withShipment = order({
      statusCode: "confirmed",
      actions: { ...NONE, cancel: true, requestDelivery: true, markShipped: true },
      delivery: { method: "shipping", address: null, partner: { id: "21", name: "Faso Express" }, shipmentStatus: "pending", courier: null, note: null },
    });
    expect(primaryTransition(withShipment)).toBe("markShipped");
  });

  it("is absent when the server allows no forward step", () => {
    const shipped = order({ statusCode: "shipped", actions: { ...NONE, cancel: true } });
    expect(primaryTransition(shipped)).toBeNull();
    expect(secondaryTransitions(shipped)).toEqual([]);
  });

  it("never proposes cancelling as the main step", () => {
    expect(primaryTransition(order({ actions: { ...NONE, cancel: true } }))).toBeNull();
  });
});

describe("wording of the transitions", () => {
  it("names what the endpoint does: confirming is not preparing", () => {
    expect(TRANSITIONS.confirm.label).toBe("Confirmer la commande");
    expect(TRANSITIONS.confirm.consequence).toContain("Confirmée");
    expect(TRANSITIONS.requestDelivery.consequence).toContain("En préparation");
    expect(TRANSITIONS.markShipped.consequence).toContain("Expédiée");
    expect(TRANSITIONS.markDelivered.consequence).toContain("Livrée");
    expect(TRANSITIONS.cancel.tone).toBe("danger");
  });
});

describe("guidance", () => {
  it("asks for the confirmation of a pending order", () => {
    expect(orderGuidance(order({}))?.title).toContain("confirmation");
  });

  it("explains that a shipped marketplace order is closed by the customer's code", () => {
    const guidance = orderGuidance(order({ statusCode: "shipped", actions: { ...NONE, cancel: true } }));
    expect(guidance?.body).toContain("code de livraison");
  });

  it("names the unpaid fees of a shipped COD Mixte order", () => {
    const guidance = orderGuidance(
      order({
        statusCode: "shipped",
        actions: { ...NONE, cancel: true },
        cod_mixte: { isCodMixte: true, currentStep: "awaiting_product_payment", deliveryFeePaid: true, productFeePaid: false },
      }),
    );
    expect(guidance?.tone).toBe("warning");
    expect(guidance?.body).toContain("le produit");
    expect(guidance?.body).not.toContain("frais de livraison et");
  });

  it("says nothing on a closed order", () => {
    expect(orderGuidance(order({ statusCode: "delivered", actions: NONE }))).toBeNull();
    expect(orderGuidance(order({ statusCode: "canceled", actions: NONE }))).toBeNull();
  });
});
