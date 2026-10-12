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

import { ACCEPTED_FILES, DOCUMENT_LABEL, DOCUMENT_TYPES, MAX_FILE_BYTES, VERIFICATION_STATES, documentFileHref, fileRefusal, formatFileSize, parseCourierFile, verificationMessage, type Verification } from "../kyc/contract";

// The `kyc` block of `GET courier/settings` (CourierSettingsController,
// ../sugu), and what the courier is told about where their file stands.

function document(overrides: Record<string, unknown> = {}) {
  return {
    id: "01hdoc",
    type: "cni",
    document_type: "id_card",
    label: "Pièce d'identité (CNI / Passeport)",
    status: "pending",
    file_name: "cni.png",
    file_url: "https://api.sugu.test/api/v1/kyc-files/courier/9?expires=1&signature=abc",
    uploaded_at: "2026-10-10T09:00:00.000000Z",
    rejection_reason: null,
    required: true,
    has_file: true,
    file_available: true,
    mime_type: "image/png",
    file_size: 48213,
    ...overrides,
  };
}

function settings(documents: unknown[], verification: Record<string, unknown> = {}) {
  return {
    profile: { first_name: "Moussa", last_name: "Kaboré", email: "moussa@example.test", phone: "+22676445566", avatar_url: null },
    vehicle: { type: "moto", brand: "Yamaha", license_plate: "11 KK 4521" },
    kyc: {
      documents,
      verification: { state: "pending", can_deliver: false, missing: [], rejection: null, suspended_until: null, verified_at: null, agency_name: "Faso Express", ...verification },
    },
  };
}

const verification = (overrides: Partial<Verification>): Verification => ({ state: "pending", canDeliver: false, missing: [], rejection: null, suspendedUntil: null, verifiedAt: null, agencyName: "Faso Express", ...overrides });

describe("the file of a courier, as the server answers it", () => {
  it("reads a document under the name the agency uses, whichever name `type` still carries", () => {
    const file = parseCourierFile(settings([document(), document({ id: "kyc-permis", type: "permis", document_type: "driver_license", status: "not_uploaded", has_file: false, file_available: false, file_name: null, mime_type: null })]));

    expect(file.documents.map((entry) => entry.type)).toEqual(["id_card", "driver_license"]);
    expect(file.documents[0]).toMatchObject({ id: "01hdoc", status: "pending", required: true, hasFile: true, fileAvailable: true, isImage: true });
    // Nothing was sent: there is no record to open or to replace by its id.
    expect(file.documents[1]).toMatchObject({ id: null, status: "not_uploaded", hasFile: false });
  });

  it("still reads a backend that only answers the older names", () => {
    const file = parseCourierFile(settings([document({ document_type: undefined, type: "cni" }), document({ document_type: undefined, type: "carte_grise" })]));
    expect(file.documents.map((entry) => entry.type)).toEqual(["id_card", "vehicle_registration"]);
  });

  it("drops a type it does not know rather than showing a document nobody can send", () => {
    expect(parseCourierFile(settings([document({ document_type: "other", type: "other" })])).documents).toEqual([]);
  });

  it("never keeps the signed link of the API: a document is opened through the portal", () => {
    const file = parseCourierFile(settings([document()]));
    expect(JSON.stringify(file)).not.toContain("signature");
    expect(JSON.stringify(file)).not.toContain("api.sugu.test");
    expect(documentFileHref("01hdoc")).toBe("/api/proxy/courier/settings/kyc/01hdoc/file");
    // An identifier is a path segment, whatever it holds.
    expect(documentFileHref("../../admin")).toBe("/api/proxy/courier/settings/kyc/..%2F..%2Fadmin/file");
  });

  it("tells a document whose file is gone from one that was never sent", () => {
    const [gone] = parseCourierFile(settings([document({ file_available: false })])).documents;
    expect(gone).toMatchObject({ hasFile: true, fileAvailable: false });
  });

  it("reads where the verification stands, with what is missing and why it was refused", () => {
    const file = parseCourierFile(settings([document()], { state: "rejected", missing: ["driver_license", "passport"], rejection: { reason: "Photo floue", at: "2026-10-11T08:00:00+00:00" } }));
    expect(file.verification).toMatchObject({ state: "rejected", canDeliver: false, missing: ["driver_license"], rejection: { reason: "Photo floue" }, agencyName: "Faso Express" });
    expect(file.profile).toMatchObject({ name: "Moussa Kaboré", phone: "+22676445566" });
    expect(file.vehicle).toEqual({ type: "moto", brand: "Yamaha", plate: "11 KK 4521" });
  });
});

describe("what the courier is told", () => {
  it("has a sentence for every state the server can answer", () => {
    for (const state of VERIFICATION_STATES) {
      const message = verificationMessage(verification({ state }));
      expect(message.title, state).toBeTruthy();
      expect(message.body, state).toBeTruthy();
    }
  });

  it("says who is waited for, and never that the courier can deliver while they cannot", () => {
    expect(verificationMessage(verification({ state: "approved", canDeliver: true }))).toMatchObject({ tone: "success", title: "Votre dossier est validé" });
    for (const state of ["incomplete", "pending", "rejected", "paused", "suspended"]) {
      expect(verificationMessage(verification({ state })).body, state).not.toMatch(/Vous pouvez (recevoir|commencer)/);
    }
    expect(verificationMessage(verification({ state: "pending" })).body).toContain("Faso Express");
    expect(verificationMessage(verification({ state: "pending", agencyName: null })).body).toContain("votre agence");
  });

  it("gives the reason of a refusal when the agency wrote one, and says what to do when it did not", () => {
    expect(verificationMessage(verification({ state: "rejected", rejection: { reason: "La photo du permis est floue.", at: null } })).body).toBe("Motif donné par Faso Express : La photo du permis est floue.");
    expect(verificationMessage(verification({ state: "rejected", rejection: { reason: null, at: null } })).body).toContain("Transmettez de nouveau vos pièces");
  });

  it("does not present a state it does not know as an approval", () => {
    expect(verificationMessage(verification({ state: "under_review_by_robot" }))).toMatchObject({ tone: "neutral", title: "État du dossier inconnu" });
  });
});

describe("a file, before it is sent", () => {
  const file = (name: string, type: string, size: number) => new File([new Uint8Array(size)], name, { type });

  it("accepts a picture or a PDF of 5 Mo at most", () => {
    expect(ACCEPTED_FILES).toBe(".jpg,.jpeg,.png,.pdf");
    expect(fileRefusal(file("cni.jpg", "image/jpeg", 1024))).toBeNull();
    expect(fileRefusal(file("permis.PDF", "application/pdf", MAX_FILE_BYTES))).toBeNull();
    // A phone does not always say the type of what it picked.
    expect(fileRefusal(file("photo.png", "", 2048))).toBeNull();
  });

  it("refuses anything else, with the sentence of the server", () => {
    expect(fileRefusal(file("piece.exe", "application/x-msdownload", 10))).toBe("Le fichier doit être une image (JPG, PNG) ou un PDF.");
    // The name says PDF, the content does not.
    expect(fileRefusal(file("piece.pdf", "text/html", 10))).toBe("Le fichier doit être une image (JPG, PNG) ou un PDF.");
    expect(fileRefusal(file("piece.heic", "image/heic", 10))).toBe("Le fichier doit être une image (JPG, PNG) ou un PDF.");
    expect(fileRefusal(file("lourd.pdf", "application/pdf", MAX_FILE_BYTES + 1))).toBe("Le fichier ne doit pas dépasser 5 Mo.");
    expect(fileRefusal(file("vide.pdf", "application/pdf", 0))).toBe("Ce fichier est vide.");
  });

  it("writes a weight a person reads", () => {
    expect(formatFileSize(640 * 1024)).toBe("640 Ko");
    expect(formatFileSize(2.1 * 1024 * 1024)).toMatch(/^2,1\sMo$/);
    expect(formatFileSize(12)).toBe("1 Ko");
  });

  it("names the four documents a courier can send", () => {
    expect(DOCUMENT_TYPES).toEqual(["id_card", "driver_license", "vehicle_registration", "insurance"]);
    for (const type of DOCUMENT_TYPES) expect(DOCUMENT_LABEL[type].title).toBeTruthy();
  });
});
