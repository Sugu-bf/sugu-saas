"use client";

import { User, Phone, Calendar } from "lucide-react";
import type { CreateCourierFormData } from "@/features/agency/schema";

interface SectionPersonalProps {
  data: CreateCourierFormData;
  onChange: <K extends keyof CreateCourierFormData>(field: K, value: CreateCourierFormData[K]) => void;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-600";

export function SectionPersonal({ data, onChange }: SectionPersonalProps) {
  return (
    <div className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-50 to-sugu-100">
          <User className="h-4 w-4 text-sugu-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>
          <p className="text-xs text-gray-400">Identité du livreur</p>
        </div>
      </div>

      {/* Fields */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Prénom */}
        <div>
          <label className={LABEL_CLASS}>
            Prénom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            placeholder="Amadou"
            className={INPUT_CLASS}
          />
        </div>

        {/* Nom */}
        <div>
          <label className={LABEL_CLASS}>
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            placeholder="Traoré"
            className={INPUT_CLASS}
          />
        </div>

        {/* Email */}
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="amadou@email.com"
            className={INPUT_CLASS}
          />
        </div>

        {/* Téléphone */}
        <div className="sm:col-span-2">
          <label className={LABEL_CLASS}>
            Téléphone <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <div className="flex items-center rounded-xl border border-gray-200/80 bg-gray-100/50 px-3">
              <span className="text-sm font-medium text-gray-500">{data.phonePrefix}</span>
            </div>
            <input
              type="tel"
              value={data.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="76 45 67 89"
              className={INPUT_CLASS + " flex-1"}
            />
            <div className="flex items-center justify-center rounded-xl border border-gray-200/80 bg-gray-50/50 px-3">
              <Phone className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Date de naissance */}
        <div>
          <label className={LABEL_CLASS}>Date de naissance</label>
          <div className="relative">
            <input
              type="text"
              value={data.dateOfBirth ?? ""}
              onChange={(e) => onChange("dateOfBirth", e.target.value)}
              placeholder="15/03/1995"
              className={INPUT_CLASS + " pr-10"}
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Genre */}
        <div>
          <label className={LABEL_CLASS}>Genre</label>
          <select
            value={data.gender ?? ""}
            onChange={(e) =>
              onChange("gender", (e.target.value || undefined) as CreateCourierFormData["gender"])
            }
            className={INPUT_CLASS + " appearance-none"}
          >
            <option value="">Sélectionner</option>
            <option value="homme">Homme</option>
            <option value="femme">Femme</option>
          </select>
        </div>

        {/* Quartier */}
        <div>
          <label className={LABEL_CLASS}>
            Quartier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.quartier}
            onChange={(e) => onChange("quartier", e.target.value)}
            placeholder="Hamdallaye ACI 2000"
            className={INPUT_CLASS}
          />
        </div>

        {/* Adresse complète */}
        <div>
          <label className={LABEL_CLASS}>Adresse complète</label>
          <input
            type="text"
            value={data.address ?? ""}
            onChange={(e) => onChange("address", e.target.value)}
            placeholder="Rue 305, Porte 112"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
