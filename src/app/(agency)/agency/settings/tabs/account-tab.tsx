"use client";

import { CheckCircle2, Flag } from "lucide-react";
import { useSession } from "@/features/auth/hooks";
import type { AgencySettingsResponse } from "@/features/agency/schema";

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
            <button className="text-xs font-semibold text-sugu-500 hover:text-sugu-600">
              Changer la photo
            </button>
            <br />
            <button className="text-xs font-semibold text-gray-400 hover:text-gray-500">
              Supprimer
            </button>
            <p className="text-[9px] text-gray-400">JPG, PNG • Max 2MB</p>
          </div>
        </div>
      </section>

      {/* Informations personnelles */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Informations personnelles
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Prénom <span className="text-sugu-500">*</span>
            </label>
            <input type="text" defaultValue={firstName} className="form-input py-2 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Nom <span className="text-sugu-500">*</span>
            </label>
            <input type="text" defaultValue={lastName} className="form-input py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Email <span className="text-sugu-500">*</span>
            </label>
            <div className="relative">
              <input type="email" defaultValue={email} className="form-input py-2 text-sm" />
              {emailVerified && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
                  <CheckCircle2 className="h-3 w-3" />
                  Vérifié
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Téléphone <span className="text-sugu-500">*</span>
            </label>
            <div className="relative">
              <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" defaultValue={phone} className="form-input py-2 text-sm pl-8" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Rôle</label>
            <input type="text" defaultValue={role} disabled className="form-input py-2 text-sm opacity-60 cursor-not-allowed" />
          </div>
          <div className="sm:col-span-2 sm:max-w-xs">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Langue</label>
            <select defaultValue="fr" className="form-input py-2 text-sm">
              <option value="fr">Français (FR)</option>
              <option value="en">English (EN)</option>
              <option value="bm">Bamanankan (ML)</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}
