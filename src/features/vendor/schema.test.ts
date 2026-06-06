import { describe, expect, it } from "vitest";
import { moderationInfoSchema } from "./schema";

describe("moderationInfoSchema", () => {
  it("accepts a public reviewer without a database id", () => {
    const parsed = moderationInfoSchema.parse({
      status: 1,
      statusLabel: "Approuve",
      statusColor: "green",
      rejectionReason: null,
      notePublic: null,
      reviewedAt: "2026-06-03T00:00:00.000000Z",
      submittedAt: null,
      reviewer: { name: "Sugu" },
      submitter: { id: "01knytp3f8y2r5xk50gxxcn2ec", name: "Watson Simpore" },
      logs: [],
    });

    expect(parsed.reviewer).toEqual({ name: "Sugu" });
  });
});
