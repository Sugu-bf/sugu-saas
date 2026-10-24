import { describe, expect, it } from "vitest";
import { meResponseSchema, userSchema } from "../schema";
import { sellerSeesLanaya } from "@/lib/auth/session-user";

const seller = {
  id: "01J0000000000000000000000",
  name: "QA Vendeur B",
  email: "qa-vendeur-b@qa.sugu.test",
  role: "vendor",
  avatar_url: null,
  email_verified_at: null,
  created_at: "2026-10-01T00:00:00Z",
  delivery_partner_id: null,
  business_name: "QA Boutique B",
};

describe("userSchema", () => {
  // Zod drops the keys it does not declare: the flag never reached the menu.
  it("keeps the Lanaya link of a seller through /api/auth/me", () => {
    const user = meResponseSchema.parse({ data: { ...seller, lanaya_seller: true } }).data;

    expect(user.lanaya_seller).toBe(true);
    expect(sellerSeesLanaya(user)).toBe(true);
  });

  it("treats a session without the flag as a seller who is not linked", () => {
    const user = userSchema.parse(seller);

    expect(user.lanaya_seller).toBe(false);
    expect(sellerSeesLanaya(user)).toBe(false);
  });
});
