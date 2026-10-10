import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http/api-error";
import { describeFailure } from "../errors";

const failure = (status: number, message = `HTTP ${status}`, errors?: Record<string, string[]>) =>
  describeFailure(new ApiError({ status, message, errors }));

describe("describeFailure", () => {
  it.each([
    [0, "network"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "validation"],
    [400, "refused"],
    [500, "server"],
    [503, "server"],
  ] as const)("status %i is %s", (status, kind) => {
    expect(failure(status).kind).toBe(kind);
  });

  it("shows the backend sentence for a refused transition", () => {
    expect(failure(400, "Cette commande ne peut pas être confirmée.").message).toBe(
      "Cette commande ne peut pas être confirmée.",
    );
  });

  it("replaces the COD Mixte code by its sentence, never showing the code", () => {
    const result = failure(
      422,
      "SUGU-COD-MIXTE-FEES-UNPAID: les frais de livraison et de produit doivent être payés avant la livraison.",
    );
    expect(result.message).not.toContain("SUGU-");
    expect(result.message).toContain("frais");
  });

  it("never shows a server or network message as is", () => {
    expect(failure(500, "SQLSTATE[42P01]: relation does not exist").message).not.toContain("SQLSTATE");
    expect(failure(0, "Failed to fetch").message).not.toContain("fetch");
    expect(failure(404, "No query results for model [Order]").message).toBe("Cette commande est introuvable.");
  });

  it("keeps the first message of each field of a 422", () => {
    const result = failure(422, "Le total ne correspond pas.", {
      total: ["Le total ne correspond pas.", "autre"],
      "client.phone": ["Le numéro de téléphone est trop court."],
    });
    expect(result.fields).toEqual({
      total: "Le total ne correspond pas.",
      "client.phone": "Le numéro de téléphone est trop court.",
    });
  });

  it("treats a non-API error as a server problem, without leaking it", () => {
    expect(describeFailure(new TypeError("x is undefined"))).toEqual({
      kind: "server",
      message: expect.not.stringContaining("undefined"),
      fields: {},
    });
  });
});
