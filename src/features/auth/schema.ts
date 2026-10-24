import { z } from "zod";

// ============================================================
// Auth Zod Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export type LoginPayload = z.infer<typeof loginSchema>;

export const userSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(["vendor", "agency", "courier", "lanabaga"]),
  avatar_url: z.string().nullable(),
  email_verified_at: z.string().nullable(),
  created_at: z.string(),
  delivery_partner_id: z.string().nullable(),
  business_name: z.string().nullable(),
  store_id: z.string().nullable().optional().default(null),
  // CourierStatus from the API (4 = KYC pending). Without this key Zod strips
  // the field and the KYC barrier in RoleGuard can never fire.
  courier_status: z.number().nullable().optional().default(null),
  // Whether the courier can take missions, as the server enforces it.
  courier_operational: z.boolean().nullable().optional().default(null),
  // Spaces of the account (a seller who is also a Lanabaga has two).
  spaces: z.array(z.enum(["vendor", "agency", "courier", "lanabaga"])).optional(),
  lanaya: z
    .object({
      profile_id: z.string(),
      public_code: z.string(),
      application_status: z.string(),
      account_status: z.string(),
      can_work: z.boolean(),
    })
    .nullable()
    .optional()
    .default(null),
  // A seller linked to the Lanaya programme (DEC-38). Without this key Zod
  // stripped the flag from /api/auth/me and no seller ever saw "Lanaya".
  lanaya_seller: z.boolean().optional().default(false),
});

export const loginResponseSchema = z.object({
  data: z.union([
    z.object({
      user: userSchema,
      courier_id: z.string().optional(),
      email_verification_required: z.boolean().optional(),
    }),
    z.object({
      verification_required: z.literal(true),
      identifier: z.string(),
      expires_in: z.number().optional(),
      reason: z.string().optional(),
    }),
  ]),
  message: z.string().optional(),
});

export type LoginResultData = z.infer<typeof loginResponseSchema>["data"];

export const meResponseSchema = z.object({
  data: userSchema,
});

export const verifyOtpSchema = z.object({
  identifier: z.string(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
  type: z.number(),
});

export type VerifyOtpPayload = z.infer<typeof verifyOtpSchema>;
