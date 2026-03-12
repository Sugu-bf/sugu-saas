"use client";

import { CheckCircle2, Flag } from "lucide-react";
import { useSession } from "@/features/auth/hooks";
import type { AgencySettingsResponse } from "@/features/agency/schema";

function ReadOnlyField({
  label,
  value,
  required,
  children,
}: {
  label: string;
  value?: string;
  required?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-gray-500 mb-1">
        {label}
        {required && <span className="text-sugu-500 ml-0.5">*</span>}
      </label>
      {children ?? (
        <input
          type="text"
          value={value ?? ""}
          readOnly
          tabIndex={-1}
          className="form-input py-2 text-sm opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900/30"
        />
      )}
    </div>
  );
}

export function AccountTab({ data }: { data: AgencySettingsResponse }) {
  const { data: user } = useSession();

  // Extract user data from session, with fallbacks
  const firstName = user?.name?.split(" ")[0] ?? "";
  const lastName = user?.name?.split(" ").slice(1).join(" ") ?? "";
  const email = user?.email ?? "";
  const emailVerified = !!user?.email_verified_at;
  const role = user?.role === "agency" ? "Administrateur" : "Utilisateur";

  // Phone comes from the agency settings (phonePrimary) as the user model
  // doesn't expose phone_e164 in the session yet
  const phone = data.phonePrimary ?? "";

  return (
    <div className="space-y-4">
      {/* Photo de profil */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Photo de profil
        </h3>
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700 ring-4 ring-white dark:ring-gray-900 shadow-lg">
            {firstName[0] ?? ""}{lastName[0] ?? ""}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400">
              La modification de la photo de profil sera bientôt disponible.
            </p>
          </div>
        </div>
      </section>

      {/* Informations personnelles — lecture seule */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Informations personnelles
          </h3>
          <span className="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            Lecture seule
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField label="Prénom" value={firstName} required />
          <ReadOnlyField label="Nom" value={lastName} required />
          <div className="sm:col-span-2">
            <ReadOnlyField label="Email" required>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  readOnly
                  tabIndex={-1}
                  className="form-input py-2 text-sm opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900/30 w-full"
                />
                {emailVerified && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3" />
                    Vérifié
                  </span>
                )}
              </div>
            </ReadOnlyField>
          </div>
          <ReadOnlyField label="Téléphone" required>
            <div className="relative">
              <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={phone}
                readOnly
                tabIndex={-1}
                className="form-input py-2 text-sm pl-8 opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900/30 w-full"
              />
            </div>
          </ReadOnlyField>
          <ReadOnlyField label="Rôle" value={role} />
          <div className="sm:col-span-2 sm:max-w-xs">
            <ReadOnlyField label="Langue" value="Français (FR)" />
          </div>
        </div>
      </section>
    </div>
  );
}
