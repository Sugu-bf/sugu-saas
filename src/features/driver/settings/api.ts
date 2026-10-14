import { z } from "zod";
import { api, apiRequest } from "@/lib/http/client";
import type { AccountSession, PasswordValues } from "@/features/settings";

// ============================================================
// A courier's settings (GET courier/settings) and the calls that
// change them. The documents (KYC) have their own screen; only
// where the file stands is read here, to lead to it.
// ============================================================

const BASE = "courier/settings";
const str = z.string().nullish().transform((value) => value ?? "");

const rawSchema = z.object({
  profile: z.object({
    first_name: str,
    last_name: str,
    email: str,
    phone: str,
    city: str,
    quarter: str,
    full_address: str,
    avatar_url: z.string().nullish(),
  }),
  vehicle: z.object({
    type: str,
    brand: str,
    model: str.optional().transform((value) => value ?? ""),
    license_plate: str,
  }),
  kyc: z.object({ can_deliver: z.boolean().nullish(), submitted_count: z.number().nullish(), required_count: z.number().nullish() }).partial().nullish(),
  notifications: z.object({ mission_email: z.boolean().nullish() }).partial().nullish(),
  security: z
    .object({
      sessions: z.array(
        z.object({
          id: z.union([z.string(), z.number()]).transform(String),
          device: z.string().nullish(),
          location: z.string().nullish(),
          last_activity: z.string().nullish(),
          current: z.boolean().nullish(),
        }),
      ),
      password_changed_at: z.string().nullish(),
    })
    .partial()
    .nullish(),
  locks: z.object({ identity: z.boolean(), vehicle: z.boolean(), email: z.boolean() }).partial().nullish(),
});

export type VehicleType = "moto" | "velo" | "voiture" | "tricycle";
export const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: "moto", label: "Moto" },
  { value: "velo", label: "Vélo" },
  { value: "voiture", label: "Voiture" },
  { value: "tricycle", label: "Tricycle" },
];

export interface DriverSettingsModel {
  profile: { firstName: string; lastName: string; email: string; phone: string; city: string; quarter: string; address: string; avatarUrl: string | null };
  vehicle: { type: string; brand: string; model: string; plate: string };
  kyc: { canDeliver: boolean; submitted: number; required: number };
  missionEmail: boolean;
  sessions: AccountSession[];
  passwordChangedAt: string | null;
  locks: { identity: boolean; vehicle: boolean };
}

export function parseDriverSettings(raw: unknown): DriverSettingsModel {
  const data = rawSchema.parse((raw as { data?: unknown })?.data ?? raw);
  return {
    profile: {
      firstName: data.profile.first_name,
      lastName: data.profile.last_name,
      email: data.profile.email,
      phone: data.profile.phone,
      city: data.profile.city,
      quarter: data.profile.quarter,
      address: data.profile.full_address,
      avatarUrl: data.profile.avatar_url ?? null,
    },
    vehicle: {
      // Older forms wrote the same vehicles in English.
      type: ({ car: "voiture", motorcycle: "moto", bike: "velo" } as Record<string, string>)[data.vehicle.type] ?? data.vehicle.type,
      brand: data.vehicle.brand,
      model: data.vehicle.model,
      plate: data.vehicle.license_plate,
    },
    kyc: { canDeliver: Boolean(data.kyc?.can_deliver), submitted: data.kyc?.submitted_count ?? 0, required: data.kyc?.required_count ?? 0 },
    missionEmail: data.notifications?.mission_email ?? true,
    sessions: (data.security?.sessions ?? []).map((session) => ({
      id: session.id,
      device: session.device || "Appareil inconnu",
      // The server says the activity in words ("il y a 3 minutes"), not as a date.
      location: [session.location, session.last_activity ? `active ${session.last_activity}` : null].filter(Boolean).join(" · ") || null,
      lastActive: null,
      current: Boolean(session.current),
    })),
    passwordChangedAt: data.security?.password_changed_at ?? null,
    locks: { identity: Boolean(data.locks?.identity), vehicle: Boolean(data.locks?.vehicle) },
  };
}

export async function fetchDriverSettings(): Promise<DriverSettingsModel> {
  return parseDriverSettings(await api.get<unknown>(BASE));
}

/** Identity fields are sent only when they may be changed: the server refuses a locked one. */
export const saveDriverProfile = (values: { firstName: string; lastName: string; phone: string; city: string; quarter: string; address: string }, identityLocked: boolean) =>
  api.put(`${BASE}/profile`, {
    ...(identityLocked ? {} : { first_name: values.firstName, last_name: values.lastName, phone: values.phone }),
    city: values.city,
    quarter: values.quarter,
    full_address: values.address,
  });

export const saveDriverVehicle = (values: { type: string; brand: string; model: string; plate: string }, vehicleLocked: boolean) =>
  api.put(`${BASE}/vehicle`, {
    ...(vehicleLocked ? {} : { type: values.type, license_plate: values.plate }),
    brand: values.brand,
    model: values.model,
  });

export const saveMissionEmail = (on: boolean) => api.put(`${BASE}/notifications`, { mission_email: on });

export const changeDriverPassword = (values: PasswordValues) =>
  api.put(`${BASE}/security/password`, { current_password: values.current, password: values.next, password_confirmation: values.confirmation });

export const DRIVER_PASSWORD_FIELDS: Record<string, keyof PasswordValues> = {
  current_password: "current",
  password: "next",
  password_confirmation: "confirmation",
};

export const revokeDriverSession = (id: string) => apiRequest(`${BASE}/security/sessions/${encodeURIComponent(id)}`, { method: "DELETE" });
export const revokeOtherDriverSessions = () => apiRequest(`${BASE}/security/sessions/others`, { method: "DELETE" });

export const DRIVER_DELETION_CHECK = `${BASE}/account/deletion-check`;
export const deleteDriverAccount = (password: string) => apiRequest(`${BASE}/account`, { method: "DELETE", body: { password, confirm_text: "SUPPRIMER" } });
