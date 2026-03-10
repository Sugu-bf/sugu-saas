"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, MapPin, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse, AgencyZone } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";

// Default zones used when API returns no zone data
const DEFAULT_ZONES: AgencyZone[] = [
  { id: "z1", name: "Bamako Centre", tarif: "2,500 FCFA", delay: "1-2h", enabled: true },
  { id: "z2", name: "Bamako Périphérie", tarif: "3,500 FCFA", delay: "2-4h", enabled: true },
  { id: "z3", name: "Kati", tarif: "5,000 FCFA", delay: "3-5h", enabled: true },
  { id: "z4", name: "Koulikoro", tarif: "7,500 FCFA", delay: "4-6h", enabled: false },
  { id: "z5", name: "Sikasso", tarif: "12,000 FCFA", delay: "24-48h", enabled: false },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-sugu-500" : "bg-gray-300 dark:bg-gray-600",
      )}
    >
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

interface ZonesTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function ZonesTab({ data, onSave, isSaving }: ZonesTabProps) {
  // Use zones from API or fall back to defaults
  const initialZones = data.zones?.length ? data.zones : DEFAULT_ZONES;
  const [zones, setZones] = useState(initialZones);

  // Zone rules from API or defaults
  const initialRules = data.zoneRules ?? {
    maxRadius: "50",
    acceptOutside: false,
    outsideSurcharge: "2,000 FCFA",
    freeAbove: false,
    freeAboveAmount: "25,000 FCFA",
  };
  const [maxRadius, setMaxRadius] = useState(initialRules.maxRadius);
  const [acceptOutside, setAcceptOutside] = useState(initialRules.acceptOutside);
  const [outsideSurcharge, setOutsideSurcharge] = useState(initialRules.outsideSurcharge);
  const [freeAbove, setFreeAbove] = useState(initialRules.freeAbove);
  const [freeAboveAmount, setFreeAboveAmount] = useState(initialRules.freeAboveAmount);

  const toggleZone = (id: string) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)));
  };
  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };
  const addZone = () => {
    const newId = `z-${Date.now()}`;
    setZones((prev) => [...prev, { id: newId, name: "", tarif: "", delay: "", enabled: true }]);
  };

  const handleSave = () => {
    onSave({
      zones,
      zoneRules: {
        maxRadius,
        acceptOutside,
        outsideSurcharge,
        freeAbove,
        freeAboveAmount,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Zones actives */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Zones actives
        </h3>
        <div className="space-y-2">
          {zones.map((zone) => (
            <div
              key={zone.id}
              className={cn(
                "flex flex-col gap-2 sm:flex-row sm:items-center rounded-xl border p-3 transition-all",
                zone.enabled
                  ? "border-gray-100 bg-white/60 dark:border-gray-800 dark:bg-gray-900/40"
                  : "border-gray-100/50 bg-gray-50/40 opacity-60 dark:border-gray-800/50 dark:bg-gray-900/20",
              )}
            >
              <Toggle checked={zone.enabled} onChange={() => toggleZone(zone.id)} label={`Zone ${zone.name}`} />
              <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white min-w-[140px]">
                <MapPin className="h-3.5 w-3.5 text-sugu-500 flex-shrink-0" />
                <input
                  type="text"
                  value={zone.name}
                  onChange={(e) => setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, name: e.target.value } : z))}
                  className="bg-transparent border-none p-0 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-0 min-w-[100px]"
                  placeholder="Nom de la zone"
                />
              </span>
              <input
                type="text"
                value={zone.tarif}
                onChange={(e) => setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, tarif: e.target.value } : z))}
                className="form-input py-1.5 text-xs w-28"
                placeholder="Tarif"
              />
              <input
                type="text"
                value={zone.delay}
                onChange={(e) => setZones((prev) => prev.map((z) => z.id === zone.id ? { ...z, delay: e.target.value } : z))}
                className="form-input py-1.5 text-xs w-20"
                placeholder="Délai"
              />
              <button
                onClick={() => removeZone(zone.id)}
                className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                aria-label={`Supprimer ${zone.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addZone}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sugu-300 bg-white px-4 py-2 text-xs font-semibold text-sugu-600 hover:bg-sugu-50 dark:border-sugu-700 dark:bg-gray-900 dark:text-sugu-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter une zone
        </button>
      </section>

      {/* Règles de livraison */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Règles de livraison
        </h3>
        <div className="space-y-4">
          <div className="max-w-xs">
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              Rayon maximum de livraison (km)
            </label>
            <input
              type="text"
              value={maxRadius}
              onChange={(e) => setMaxRadius(e.target.value)}
              className="form-input py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Accepter les livraisons hors zone</span>
              <Toggle checked={acceptOutside} onChange={() => setAcceptOutside(!acceptOutside)} label="Hors zone" />
            </div>
            {acceptOutside && (
              <div className="max-w-xs ml-6">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Surcharge hors zone</label>
                <input
                  type="text"
                  value={outsideSurcharge}
                  onChange={(e) => setOutsideSurcharge(e.target.value)}
                  className="form-input py-2 text-sm"
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Livraison gratuite au-dessus de</span>
              <Toggle checked={freeAbove} onChange={() => setFreeAbove(!freeAbove)} label="Livraison gratuite" />
            </div>
            {freeAbove && (
              <div className="max-w-xs ml-6">
                <input
                  type="text"
                  value={freeAboveAmount}
                  onChange={(e) => setFreeAboveAmount(e.target.value)}
                  className="form-input py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-5 py-2.5 text-xs font-semibold text-white transition-all hover:bg-sugu-600",
            isSaving && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {isSaving ? "Sauvegarde…" : "Sauvegarder les zones"}
        </button>
      </div>
    </div>
  );
}
