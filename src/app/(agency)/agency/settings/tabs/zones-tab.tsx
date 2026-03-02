"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const INITIAL_ZONES = [
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

export function ZonesTab() {
  const [zones, setZones] = useState(INITIAL_ZONES);
  const [acceptOutside, setAcceptOutside] = useState(false);
  const [freeAbove, setFreeAbove] = useState(false);

  const toggleZone = (id: string) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)));
  };
  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
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
                📍 {zone.name}
              </span>
              <input type="text" defaultValue={zone.tarif} className="form-input py-1.5 text-xs w-28" />
              <input type="text" defaultValue={zone.delay} className="form-input py-1.5 text-xs w-20" />
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
        <button className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sugu-300 bg-white px-4 py-2 text-xs font-semibold text-sugu-600 hover:bg-sugu-50 dark:border-sugu-700 dark:bg-gray-900 dark:text-sugu-400">
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
            <input type="text" defaultValue="50" className="form-input py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Accepter les livraisons hors zone</span>
              <Toggle checked={acceptOutside} onChange={() => setAcceptOutside(!acceptOutside)} label="Hors zone" />
            </div>
            {acceptOutside && (
              <div className="max-w-xs ml-6">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Surcharge hors zone</label>
                <input type="text" defaultValue="2,000 FCFA" className="form-input py-2 text-sm" />
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
                <input type="text" defaultValue="25,000 FCFA" className="form-input py-2 text-sm" />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
