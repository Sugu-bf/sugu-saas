import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock("@/lib/http/client", () => ({
  api: {
    put: (...args: unknown[]) => {
      state.calls.push(args);
      return Promise.resolve({ success: true });
    },
  },
}));

import { toPartnerPasswordBody, updatePassword } from "./settings.service";

describe("agency password change", () => {
  beforeEach(() => {
    state.calls = [];
  });

  const form = { current_password: "old-secret", password: "new-secret", password_confirmation: "new-secret" };

  it("uses the delivery-partner contract, not the non-existent /auth/password", async () => {
    await updatePassword(form);
    expect(state.calls).toEqual([
      [
        "partners/settings/security/password",
        { currentPassword: "old-secret", newPassword: "new-secret", newPassword_confirmation: "new-secret" },
      ],
    ]);
  });

  it("maps the form fields to the names the API validates", () => {
    expect(Object.keys(toPartnerPasswordBody(form))).toEqual([
      "currentPassword",
      "newPassword",
      "newPassword_confirmation",
    ]);
  });
});
