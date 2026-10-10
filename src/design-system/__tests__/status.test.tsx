import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../status/status-badge";
import { UNKNOWN_STATUS_LABEL } from "../status/registry";
import {
  courierStatus,
  deliveryStatus,
  kycDocumentStatus,
  kycRequestStatus,
  orderPaymentStatus,
  orderStatus,
  paymentStatus,
  payoutStatus,
  productStatus,
  statusRegistries,
  suguBoxInboundStatus,
  suguBoxListingStatus,
  suguBoxOutboundStatus,
} from "../status/domains";

/**
 * Enum values copied from ../sugu at the time of writing. If the backend adds
 * or renames a case, this is the list to update together with the registry.
 */
const BACKEND_ENUMS = [
  ["OrderStatus", orderStatus, ["pending", "awaiting_payment", "confirmed", "processing", "packed", "shipped", "delivered", "canceled", "returned", "failed"]],
  ["PaymentStatus", paymentStatus, ["pending", "authorized", "captured", "failed", "canceled", "partially_refunded", "refunded"]],
  ["paymentStatusCode", orderPaymentStatus, ["paid", "partial", "cod_pending", "pending", "hold", "refunded", "failed"]],
  ["ShipmentStatus", deliveryStatus, ["pending", "awaiting_fee_payment", "assigned", "picked_up", "in_transit", "arrived", "delivery_failed", "delivered"]],
  ["ProductStatus", productStatus, ["draft", "submitted", "active", "rejected", "archived", "changes_requested", "suspended"]],
  ["PayoutStatus", payoutStatus, ["pending", "approved", "processing", "paid", "failed", "rejected", "canceled"]],
  ["KycDocumentStatus", kycDocumentStatus, ["pending", "approved", "rejected"]],
  ["VerificationRequestStatus", kycRequestStatus, ["pending", "approved", "rejected", "needs_more_info"]],
  ["CourierStatus", courierStatus, ["active", "suspended", "inactive", "pending_kyc"]],
  ["SuguBox InboundStatus", suguBoxInboundStatus, ["pending", "in_progress", "completed", "cancelled"]],
  ["SuguBox OutboundStatus", suguBoxOutboundStatus, ["pending", "picking", "packed", "shipped", "cancelled"]],
  ["SuguBox ListingStatus", suguBoxListingStatus, ["draft", "published", "unpublished", "out_of_stock"]],
] as const;

describe("status registries — parity with backend enums", () => {
  it.each(BACKEND_ENUMS)("%s: exactly the backend cases, no invented state", (_name, registry, cases) => {
    expect([...registry.codes].sort()).toEqual([...cases].sort());
  });

  it("every status of every domain has a label, a tone and an icon", () => {
    for (const registry of Object.values(statusRegistries)) {
      for (const code of registry.codes) {
        const status = registry.resolve(code);
        expect(status.known, `${registry.domain}/${code}`).toBe(true);
        expect(status.label.trim()).not.toBe("");
        expect(["success", "warning", "danger", "info", "neutral"]).toContain(status.tone);
        expect(status.icon).toBeTruthy();
      }
    }
  });
});

describe("status registries — unknown codes stay unknown", () => {
  it.each(Object.entries(statusRegistries))("%s never maps an unknown code to a real state", (_domain, registry) => {
    for (const input of ["teleported", "", "   ", null, undefined, 999]) {
      const status = registry.resolve(input);
      expect(status.known).toBe(false);
      expect(status.label).toBe(UNKNOWN_STATUS_LABEL);
      expect(status.label).not.toMatch(/attente/i);
      expect(status.tone).toBe("neutral");
      expect(registry.has(input)).toBe(false);
    }
  });

  it("keeps the raw code for diagnosis", () => {
    const status = orderStatus.resolve("teleported");
    expect(status.code).toBe("teleported");
    expect(status.description).toContain("teleported");
  });
});

describe("status registries — aliases and axes", () => {
  it("reads the courier projection as the canonical shipment status", () => {
    expect(deliveryStatus.resolve("to_accept").code).toBe("pending");
    expect(deliveryStatus.resolve("pickup").code).toBe("assigned");
    expect(deliveryStatus.resolve("en_route").code).toBe("in_transit");
    expect(deliveryStatus.resolve("failed").code).toBe("delivery_failed");
    // Agency and courier therefore show the same label for the same backend state.
    expect(deliveryStatus.resolve("en_route").label).toBe(deliveryStatus.resolve("in_transit").label);
  });

  it("accepts both spellings of cancelled where the backend emits both", () => {
    expect(orderStatus.resolve("cancelled").code).toBe("canceled");
    expect(payoutStatus.resolve("cancelled").code).toBe("canceled");
  });

  it("resolves integer-backed enums from their numeric value", () => {
    expect(productStatus.resolve(2).code).toBe("active");
    expect(productStatus.resolve("5").code).toBe("changes_requested");
    expect(kycDocumentStatus.resolve(0).code).toBe("pending");
    expect(kycRequestStatus.resolve(3).code).toBe("needs_more_info");
    expect(courierStatus.resolve(4).code).toBe("pending_kyc");
    // CourierStatus starts at 1: 0 is not a courier status.
    expect(courierStatus.resolve(0).known).toBe(false);
  });

  it("is case- and whitespace-tolerant, nothing more", () => {
    expect(orderStatus.resolve(" Shipped ").code).toBe("shipped");
    expect(orderStatus.resolve("ship").known).toBe(false);
  });

  it("keeps order, payment and logistics apart", () => {
    // Same word, three different meanings depending on the axis.
    expect(orderStatus.resolve("pending").label).not.toBe(deliveryStatus.resolve("pending").label);
    // A payment code is not an order status, and the reverse.
    expect(orderStatus.resolve("cod_pending").known).toBe(false);
    expect(orderStatus.resolve("paid").known).toBe(false);
    expect(orderPaymentStatus.resolve("shipped").known).toBe(false);
    expect(deliveryStatus.resolve("shipped").known).toBe(false);
    // Cash on delivery is its own state, not a generic pending payment.
    expect(orderPaymentStatus.resolve("cod_pending").label).not.toBe(orderPaymentStatus.resolve("pending").label);
  });

  it("exposes filter options in lifecycle order", () => {
    expect(orderStatus.options().map((option) => option.value).slice(0, 3)).toEqual(["pending", "awaiting_payment", "confirmed"]);
  });
});

describe("<StatusBadge />", () => {
  it("renders label and icon, not colour alone", () => {
    render(<StatusBadge domain="order" code="shipped" />);
    const badge = screen.getByText("Expédiée").parentElement!;
    expect(badge).toHaveAttribute("data-status", "shipped");
    expect(badge.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(badge.className).toContain("bg-info-bg");
  });

  it("renders an unknown code as unknown", () => {
    render(<StatusBadge domain="delivery" code="warp_speed" />);
    const badge = screen.getByText(UNKNOWN_STATUS_LABEL).parentElement!;
    expect(badge).toHaveAttribute("data-status-known", "false");
    expect(badge).toHaveAttribute("title", expect.stringContaining("warp_speed"));
    expect(screen.queryByText(/attente/i)).toBeNull();
  });
});
