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
  role: z.enum(["vendor", "agency"]),
  avatar_url: z.string().nullable(),
  email_verified_at: z.string().nullable(),
  created_at: z.string(),
  delivery_partner_id: z.string().nullable(),
  business_name: z.string().nullable(),
});

export const loginResponseSchema = z.object({
  data: z.object({
    user: userSchema,
    token: z.string(),
  }),
  message: z.string().optional(),
});

export const meResponseSchema = z.object({
  data: userSchema,
});
