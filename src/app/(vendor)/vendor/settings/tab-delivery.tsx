"use client";

import { useState } from "react";
import { SectionCard, Toggle, PillInput, PillButton, PillSelect, Field } from "./settings-ui";
import { Star, Plus, MapPin } from "lucide-react";
import { useVendorSettings } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Onglet 3 — Livraison
// ────────────────────────────────────────────────────────────

const AGENCIES = [
  { id: "ag1", name: "Express Bamako", rating: 4.8, reviews: 234, types: ["🏍️ Moto", "🚗 Voiture"], zones: "Bamako, Kati, Koulikoro", enabled: true },
  { id: "ag2", name: "Bamako Rapid", rating: 4.5, reviews: 156, types: ["🏍️ Moto"], zones: "Bamako Centre", enabled: true },
  { id: "ag3", name: "SafeDelivery ML", rating: 4.2, reviews: 89, types: ["🚗 Voiture", "🚛 Camion"], zones: "Bamako, Sikasso, Ségou", enabled: false },
];

const ZONES_INIT = [
  { name: "Bamako Centre", price: "2 500", enabled: true },
  { name: "Bamako Périphérie", price: "3 500", enabled: true },
  { name: "Kati", price: "5 000", enabled: true },
  { name: "Koulikoro", price: "7 500", enabled: false },
  { name: "Sikasso", price: "12 000", enabled: false },
];

export function TabDelivery() {
  const { data: settingsData } = useVendorSettings();
  const apiDelivery = settingsData?.operations?.delivery;

  const [agencies, setAgencies] = useState(AGENCIES);
  const [zones, setZones] = useState(ZONES_INIT);
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(true);
  const [freeShippingMin, setFreeShippingMin] = useState("25 000");
  const [prepDelay, setPrepDelay] = useState("24h");
  const [maxWeight, setMaxWeight] = useState("30");
  const [instructions, setInstructions] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(apiDelivery?.pickup ?? false);
  const [pickupAddress, setPickupAddress] = useState(
    settingsData ? `${settingsData.shop.fullAddress}, ${settingsData.shop.city}`.replace(/^, |, $/g, "") : ""
  );

  const toggleAgency = (id: string) =>
    setAgencies((a) => a.map((ag) => (ag.id === id ? { ...ag, enabled: !ag.enabled } : ag)));

  const toggleZone = (idx: number) =>
    setZones((z) => z.map((zone, i) => (i === idx ? { ...zone, enabled: !zone.enabled } : zone)));

  const updateZonePrice = (idx: number, price: string) =>
    setZones((z) => z.map((zone, i) => (i === idx ? { ...zone, price } : zone)));

  return (
    <div className="space-y-6">
      {/* ─── Card 1: Agences partenaires ─── */}
      <SectionCard title="Agences de livraison partenaires" id="delivery-agencies">
        <div className="mt-5 space-y-3">
          {agencies.map((ag) => (
            <div key={ag.id} className="rounded-2xl border border-white/60 bg-white/30 p-4 backdrop-blur transition-all dark:border-gray-700/50 dark:bg-gray-800/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-100 to-sugu-200 text-lg font-bold text-sugu-600 dark:from-sugu-900/30 dark:to-sugu-800/30">
                    {ag.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ag.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{ag.rating} ({ag.reviews} avis)</span>
                    </div>
                  </div>
                </div>
                <Toggle checked={ag.enabled} onChange={() => toggleAgency(ag.id)} label={`Activer ${ag.name}`} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {ag.types.map((t) => (
                  <span key={t} className="rounded-full bg-gray-100/80 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">{t}</span>
                ))}
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{ag.zones}</span>
              </div>
              <button className="mt-2 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">
                Voir les tarifs →
              </button>
            </div>
          ))}
        </div>
        <PillButton variant="outline" size="sm" className="mt-4">
          <Plus className="h-3.5 w-3.5" />
          Ajouter une agence partenaire
        </PillButton>
      </SectionCard>

      {/* ─── Card 2: Zones de livraison ─── */}
      <SectionCard title="Zones de livraison" id="delivery-zones">
        <div className="mt-4 space-y-2">
          {zones.map((zone, idx) => (
            <div key={zone.name} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/30 px-4 py-3 backdrop-blur dark:bg-white/5">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                📍 {zone.name}
              </span>
              <div className="ml-auto flex items-center gap-3">
                <Toggle checked={zone.enabled} onChange={() => toggleZone(idx)} label={`${zone.name} active`} />
                <PillInput
                  value={zone.price}
                  onChange={(v) => updateZonePrice(idx, v)}
                  className="!w-28 text-center"
                  suffix={<span className="text-[10px] text-gray-400">FCFA</span>}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600 dark:text-sugu-400">
          ➕ Ajouter une zone
        </button>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50/80 px-4 py-3 dark:bg-gray-800/30">
          <Toggle checked={freeShippingEnabled} onChange={() => setFreeShippingEnabled(!freeShippingEnabled)} label="Livraison gratuite" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Livraison gratuite au-dessus de</span>
          <PillInput value={freeShippingMin} onChange={setFreeShippingMin} className="!w-28" suffix={<span className="text-[10px] text-gray-400">FCFA</span>} />
        </div>
      </SectionCard>

      {/* ─── Card 3: Préférences ─── */}
      <SectionCard title="Préférences de livraison" id="delivery-prefs">
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Délai de préparation par défaut">
            <PillSelect
              value={prepDelay}
              onChange={setPrepDelay}
              options={[
                { value: "same_day", label: "Même jour" },
                { value: "24h", label: "24h" },
                { value: "48h", label: "48h" },
                { value: "3_5days", label: "3-5 jours" },
              ]}
            />
          </Field>
          <Field label="Poids maximum par colis (kg)">
            <PillInput value={maxWeight} onChange={setMaxWeight} suffix={<span className="text-xs text-gray-400">kg</span>} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Instructions de ramassage">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Instructions pour le livreur lors du ramassage..."
              className="w-full rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur placeholder:text-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 resize-none"
            />
          </Field>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Toggle checked={pickupEnabled} onChange={() => setPickupEnabled(!pickupEnabled)} label="Retrait en boutique" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Autoriser le retrait en boutique</span>
          </div>
          {pickupEnabled && (
            <div className="ml-14">
              <Field label="Adresse de retrait">
                <PillInput value={pickupAddress} onChange={setPickupAddress} prefix={<MapPin className="h-3.5 w-3.5" />} />
              </Field>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
