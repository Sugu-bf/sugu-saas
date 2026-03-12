"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DriverSettings } from "@/features/driver/schema";
import { SectionCard, Field, PillInput, PillSelect } from "./settings-ui";
import {
  Camera,
  Phone,
  Check,
  Globe,
  Star,
  CheckCircle,
  Clock,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 1 — Mon profil
// ────────────────────────────────────────────────────────────

interface TabProfileProps {
  data: DriverSettings;
}

export function TabProfile({ data }: TabProfileProps) {
  const p = data.profile;

  const [firstName, setFirstName] = useState(p.firstName);
  const [lastName, setLastName] = useState(p.lastName);
  const [email, setEmail] = useState(p.email);
  const [phone, setPhone] = useState(p.phone);
  const [phoneSecondary, setPhoneSecondary] = useState(p.phoneSecondary ?? "");
  const [city, setCity] = useState(p.city);
  const [quarter, setQuarter] = useState(p.quarter);
  const [fullAddress, setFullAddress] = useState(p.fullAddress);
  const [actionRadius, setActionRadius] = useState(String(p.actionRadius));
  const [language, setLanguage] = useState(p.language);
  const [timezone, setTimezone] = useState(p.timezone);

  // Star rendering
  const fullStars = Math.floor(p.rating);
  const hasHalfStar = p.rating - fullStars >= 0.5;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      {/* ──── Main column (xl:col-span-7) ──── */}
      <main className="space-y-6 xl:col-span-7">
        {/* Card 1: Photo de profil & Identité */}
        <SectionCard title="Photo de profil & Identité" id="profile-identity" className="animate-card-enter">
          {/* Avatar */}
          <div className="mt-5 flex items-center gap-5">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sugu-500 text-2xl font-bold text-white">
                {firstName.charAt(0)}{lastName.charAt(0)}
              </div>
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sugu-500 text-white transition-all hover:bg-sugu-600 dark:border-gray-900" aria-label="Changer la photo">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <button className="text-sm font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">Changer la photo</button>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Supprimer</p>
              <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">JPG, PNG • Max 2MB</p>
            </div>
          </div>

          {/* Name */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Prénom" required><PillInput value={firstName} onChange={setFirstName} /></Field>
            <Field label="Nom" required><PillInput value={lastName} onChange={setLastName} /></Field>
          </div>

          {/* Email */}
          <div className="mt-4">
            <Field label="Email" required>
              <PillInput
                value={email}
                onChange={setEmail}
                suffix={p.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:bg-green-950/30 dark:text-green-400">
                    <Check className="h-3 w-3" /> Vérifié
                  </span>
                ) : undefined}
              />
            </Field>
          </div>

          {/* Phones */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Téléphone" required>
              <PillInput value={phone} onChange={setPhone} prefix={<Phone className="h-3.5 w-3.5 text-gray-400" />} />
            </Field>
            <Field label="Téléphone secondaire">
              <PillInput value={phoneSecondary} onChange={setPhoneSecondary} placeholder="Optionnel" />
            </Field>
          </div>
        </SectionCard>

        {/* Card 2: Zone de livraison */}
        <SectionCard title="Zone de livraison" id="profile-location" className="animate-card-enter" style={{ animationDelay: "60ms" } as React.CSSProperties}>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ville" required>
              <PillSelect
                value={city}
                onChange={setCity}
                options={[
                  { value: "Bamako", label: "Bamako" },
                  { value: "Ouagadougou", label: "Ouagadougou" },
                  { value: "Dakar", label: "Dakar" },
                  { value: "Abidjan", label: "Abidjan" },
                ]}
              />
            </Field>
            <Field label="Quartier" required>
              <PillInput value={quarter} onChange={setQuarter} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Adresse complète">
              <PillInput value={fullAddress} onChange={setFullAddress} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Rayon d'action">
              <PillInput
                value={actionRadius}
                onChange={setActionRadius}
                suffix={<span className="text-xs font-medium text-gray-400">km</span>}
              />
            </Field>
          </div>
        </SectionCard>
      </main>

      {/* ──── Aside column (xl:col-span-5) ──── */}
      <aside className="space-y-6 xl:col-span-5" aria-label="Aperçu et préférences">
        {/* Card 3: Aperçu du profil */}
        <SectionCard title="" id="profile-preview" className="animate-card-enter" style={{ animationDelay: "120ms" } as React.CSSProperties}>
          <div className="flex flex-col items-center text-center">
            {/* Avatar large */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-sugu-500 text-3xl font-bold text-white">
              {firstName.charAt(0)}{lastName.charAt(0)}
            </div>
            <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">{firstName} {lastName}</h3>
            <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Coursier • {city}</p>

            {/* Star rating */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{p.rating}</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < fullStars
                        ? "fill-amber-400 text-amber-400"
                        : i === fullStars && hasHalfStar
                          ? "fill-amber-400/50 text-amber-400"
                          : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700",
                    )}
                  />
                ))}
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{p.totalDeliveries} livraisons</p>

            {/* Divider */}
            <div className="my-4 w-full border-t border-gray-100 dark:border-gray-800" />

            {/* Mini stats */}
            <div className="grid w-full grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/40 p-3 dark:bg-white/5">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">{p.successRate}%</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">réussite</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/40 p-3 dark:bg-white/5">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">{p.avgDeliveryMinutes}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">min moy.</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl bg-white/40 p-3 dark:bg-white/5">
                <Star className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">{p.rating}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">note</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Card 4: Langue & Préférences */}
        <SectionCard title="Langue & Préférences" id="profile-prefs" className="animate-card-enter" style={{ animationDelay: "180ms" } as React.CSSProperties}>
          <div className="mt-4 space-y-4">
            <Field label="Langue">
              <PillSelect
                value={language}
                onChange={setLanguage}
                prefix={<Globe className="h-3.5 w-3.5 text-gray-400" />}
                options={[
                  { value: "Français", label: "Français" },
                  { value: "English", label: "English" },
                ]}
              />
            </Field>
            <Field label="Fuseau horaire">
              <PillSelect
                value={timezone}
                onChange={setTimezone}
                options={[
                  { value: "Africa/Bamako (GMT+0)", label: "Africa/Bamako (GMT+0)" },
                  { value: "Africa/Ouagadougou (GMT+0)", label: "Africa/Ouagadougou (GMT+0)" },
                  { value: "Africa/Dakar (GMT+0)", label: "Africa/Dakar (GMT+0)" },
                  { value: "Africa/Lagos (GMT+1)", label: "Africa/Lagos (GMT+1)" },
                ]}
              />
            </Field>
          </div>
        </SectionCard>
      </aside>
    </div>
  );
}
