"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, MapPin, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse, AgencyZone } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";
import { Toggle } from "../components/toggle";



interface ZonesTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function ZonesTab({ data, onSave, isSaving }: ZonesTabProps) {
  // Use strictly API data — no fallback mock zones
  const [zones, setZones] = useState<AgencyZone[]>(data.zones ?? []);

  // Zone rules from API or empty defaults
  const initialRules = data.zoneRules ?? {
    maxRadius: "",
    acceptOutside: false,
    outsideSurcharge: "",
    freeAbove: false,
    freeAboveAmount: "",
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
    const newId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `z-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

        {zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 mb-1">Aucune zone configurée</p>
            <p className="text-[10px] text-gray-400 max-w-xs">
              Ajoutez des zones de couverture pour définir vos tarifs et délais de livraison par secteur.
            </p>
          </div>
        ) : (
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
                  placeholder="Tarif (FCFA)"
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
        )}

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
              placeholder="Ex: 50"
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
                  placeholder="Ex: 2,000 FCFA"
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
                  placeholder="Ex: 25,000 FCFA"
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
