import { z } from "zod";
import { ApiError } from "@/lib/http/api-error";
import { API_PROXY_PREFIX, api, apiFetch } from "@/lib/http/client";

// ============================================================
// The file of a courier — `GET courier/settings` (its `kyc` block)
// and `POST courier/settings/kyc/upload`.
//
// These routes stay open to a courier who cannot work yet: that is
// how the file gets completed. Whether the courier may take a
// mission is decided by the server alone (`courier.operational`).
// ============================================================

/** `CourierSettingsController::verificationOf`. */
export const VERIFICATION_STATES = ["approved", "incomplete", "pending", "rejected", "paused", "suspended"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

export const DOCUMENT_TYPES = ["id_card", "driver_license", "vehicle_registration", "insurance"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** What a courier sends, in the words of the form. */
export const DOCUMENT_LABEL: Record<DocumentType, { title: string; hint: string }> = {
  id_card: { title: "Pièce d'identité", hint: "Carte nationale ou passeport" },
  driver_license: { title: "Permis de conduire", hint: "En cours de validité" },
  vehicle_registration: { title: "Carte grise", hint: "Du véhicule utilisé pour livrer" },
  insurance: { title: "Attestation d'assurance", hint: "Du véhicule utilisé pour livrer" },
};

export type DocumentStatus = "not_uploaded" | "pending" | "verified" | "rejected";

const text = z
  .string()
  .nullish()
  .transform((value) => (value && value.trim() !== "" ? value.trim() : null));

const documentSchema = z.object({
  id: z.string(),
  type: z.string(),
  // The name the agency and the sign-up use; `type` keeps the older one for the clients that read it.
  document_type: text,
  status: z.enum(["not_uploaded", "pending", "verified", "rejected"]).catch("pending"),
  file_name: text,
  uploaded_at: text,
  rejection_reason: text,
  required: z.boolean().catch(false),
  has_file: z.boolean().catch(false),
  file_available: z.boolean().catch(false),
  mime_type: text,
  file_size: z.coerce.number().nullish().catch(null),
});

const kycSchema = z.object({
  documents: z.array(documentSchema),
  verification: z.object({
    state: z.string(),
    can_deliver: z.boolean().catch(false),
    missing: z.array(z.string()).catch([]),
    rejection: z
      .object({ reason: text, at: text })
      .nullish()
      .transform((value) => value ?? null),
    suspended_until: text,
    verified_at: text,
    agency_name: text,
  }),
});

const profileSchema = z.object({
  first_name: text,
  last_name: text,
  email: text,
  phone: text,
  avatar_url: text,
});

const vehicleSchema = z.object({ type: text, brand: text, license_plate: text });

export interface KycDocument {
  /** Identifier of the record, once something was sent. */
  id: string | null;
  type: DocumentType;
  status: DocumentStatus;
  required: boolean;
  fileName: string | null;
  uploadedAt: string | null;
  rejectionReason: string | null;
  /** A file was sent for this document… */
  hasFile: boolean;
  /** …and is still on the server. A record can outlive its file. */
  fileAvailable: boolean;
  isImage: boolean;
}

export interface Verification {
  state: VerificationState | string;
  canDeliver: boolean;
  missing: DocumentType[];
  rejection: { reason: string | null; at: string | null } | null;
  suspendedUntil: string | null;
  verifiedAt: string | null;
  agencyName: string | null;
}

export interface CourierFile {
  profile: { name: string; email: string | null; phone: string | null; avatarUrl: string | null };
  vehicle: { type: string | null; brand: string | null; plate: string | null };
  documents: KycDocument[];
  verification: Verification;
}

/** The names `courier/settings` answered before V4, for a backend that has no `document_type` yet. */
const LEGACY_TYPES: Record<string, DocumentType> = { cni: "id_card", permis: "driver_license", carte_grise: "vehicle_registration", assurance: "insurance" };

const isDocumentType = (value: string): value is DocumentType => (DOCUMENT_TYPES as readonly string[]).includes(value);

export function parseCourierFile(raw: unknown): CourierFile {
  const data = z.object({ profile: profileSchema, vehicle: vehicleSchema.catch({ type: null, brand: null, license_plate: null }), kyc: kycSchema }).parse(raw);
  return {
    profile: {
      name: [data.profile.first_name, data.profile.last_name].filter(Boolean).join(" "),
      email: data.profile.email,
      phone: data.profile.phone,
      avatarUrl: data.profile.avatar_url,
    },
    vehicle: { type: data.vehicle.type, brand: data.vehicle.brand, plate: data.vehicle.license_plate },
    documents: data.kyc.documents
      .map((document) => ({ ...document, type: document.document_type ?? LEGACY_TYPES[document.type] ?? document.type }))
      .filter((document) => isDocumentType(document.type))
      .map((document) => ({
        id: document.status === "not_uploaded" ? null : document.id,
        type: document.type as DocumentType,
        status: document.status,
        required: document.required,
        fileName: document.file_name,
        uploadedAt: document.uploaded_at,
        rejectionReason: document.rejection_reason,
        hasFile: document.has_file,
        fileAvailable: document.file_available,
        isImage: document.mime_type?.startsWith("image/") ?? false,
      })),
    verification: {
      state: data.kyc.verification.state,
      canDeliver: data.kyc.verification.can_deliver,
      missing: data.kyc.verification.missing.filter(isDocumentType),
      rejection: data.kyc.verification.rejection,
      suspendedUntil: data.kyc.verification.suspended_until,
      verifiedAt: data.kyc.verification.verified_at,
      agencyName: data.kyc.verification.agency_name,
    },
  };
}

// ── Calls ───────────────────────────────────────────────────

export async function fetchCourierFile(): Promise<CourierFile> {
  const response = await api.get<{ data: unknown }>("courier/settings");
  return parseCourierFile(response.data);
}

/**
 * Address of the file of a document, on the portal's own origin: the relay
 * adds the session, Laravel checks the document is the courier's own. No
 * link to the host of the API, no address of the storage.
 */
export const documentFileHref = (documentId: string): string => `${API_PROXY_PREFIX}courier/settings/kyc/${encodeURIComponent(documentId)}/file`;

/** What the server takes: JPG, PNG or PDF, 5 Mo at most. Checked here to answer at once; the server checks again. */
export const ACCEPTED_FILES = ".jpg,.jpeg,.png,.pdf";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function fileRefusal(file: File): string | null {
  const named = /\.(jpe?g|png|pdf)$/i.test(file.name);
  if (!named || (file.type !== "" && !ACCEPTED_TYPES.includes(file.type))) return "Le fichier doit être une image (JPG, PNG) ou un PDF.";
  if (file.size > MAX_FILE_BYTES) return "Le fichier ne doit pas dépasser 5 Mo.";
  if (file.size === 0) return "Ce fichier est vide.";
  return null;
}

export async function uploadDocument(type: DocumentType, file: File): Promise<void> {
  const body = new FormData();
  body.append("document_type", type);
  body.append("file", file);

  let response: Response;
  try {
    response = await apiFetch("courier/settings/kyc/upload", { method: "POST", body });
  } catch {
    throw new ApiError({ message: "Network error", status: 0, code: "NETWORK" });
  }
  if (response.ok) return;

  let json: { message?: string; errors?: Record<string, string[]>; error_code?: string } = {};
  try {
    json = await response.json();
  } catch {
    // Not JSON (a gateway page): the status says enough.
  }
  throw new ApiError({ message: json.message ?? `HTTP ${response.status}`, status: response.status, code: json.error_code, errors: json.errors });
}

// ── Reading the file ────────────────────────────────────────

/** "2,1 Mo", "640 Ko". */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("fr-FR")} Ko`;
}

/** What the courier is told about where their file stands, and what to do. */
export function verificationMessage(verification: Verification): { tone: "success" | "warning" | "danger" | "info" | "neutral"; title: string; body: string } {
  const agency = verification.agencyName ?? "votre agence";
  switch (verification.state) {
    case "approved":
      return { tone: "success", title: "Votre dossier est validé", body: "Vous pouvez recevoir et effectuer des livraisons." };
    case "incomplete":
      return { tone: "warning", title: "Dossier incomplet", body: "Transmettez les pièces demandées : votre agence ne peut pas vérifier votre dossier sans elles." };
    case "pending":
      return { tone: "info", title: "Dossier en cours de vérification", body: `Vos pièces sont transmises. Vous pourrez livrer dès que ${agency} les aura validées.` };
    case "rejected":
      return {
        tone: "danger",
        title: "Dossier refusé",
        body: verification.rejection?.reason ? `Motif donné par ${agency} : ${verification.rejection.reason}` : `${agency} a refusé votre dossier. Transmettez de nouveau vos pièces, ou contactez-la.`,
      };
    case "paused":
      return { tone: "neutral", title: "Compte en pause", body: `${agency} a mis votre compte en pause : aucune mission ne vous est proposée pour le moment.` };
    case "suspended":
      return { tone: "danger", title: "Compte suspendu", body: `${agency} a suspendu votre compte. Contactez-la pour en savoir plus.` };
    default:
      return { tone: "neutral", title: "État du dossier inconnu", body: "Actualisez la page. Si le message reste, contactez votre agence." };
  }
}
