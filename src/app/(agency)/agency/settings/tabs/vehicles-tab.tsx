"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Bike, Car, Truck, Save, Loader2 } from "lucide-react";
import type { AgencySettingsResponse } from "@/features/agency/schema";
import type { UpdateAgencySettingsPayload } from "@/features/agency/service";

const VEHICLE_ICONS: Record<string, ReactNode> = {
  Moto: <Bike className="h-5 w-5 text-sugu-500" />,
  Voiture: <Car className="h-5 w-5 text-blue-500" />,
  "Vélo": <Bike className="h-5 w-5 text-green-500" />,
  Camionnette: <Truck className="h-5 w-5 text-amber-500" />,
};

// Default fleet data used when API returns no fleet info
const DEFAULT_FLEET = [
  { type: "Moto", count: 0, base: "1,500 FCFA", perKm: "200 FCFA/km", maxWeight: "15 kg" },
  { type: "Voiture", count: 0, base: "2,500 FCFA", perKm: "300 FCFA/km", maxWeight: "50 kg" },
  { type: "Vélo", count: 0, base: "800 FCFA", perKm: "150 FCFA/km", maxWeight: "10 kg" },
  { type: "Camionnette", count: 0, base: "5,000 FCFA", perKm: "500 FCFA/km", maxWeight: "200 kg" },
];

interface VehiclesTabProps {
  data: AgencySettingsResponse;
  onSave: (payload: UpdateAgencySettingsPayload) => void;
  isSaving: boolean;
}

export function VehiclesTab({ data, onSave, isSaving }: VehiclesTabProps) {
  // Use fleet from API if available, otherwise fall back to defaults
  const fleetFromApi = data.fleet?.vehicles ?? DEFAULT_FLEET;
  const [fleetVehicles, setFleetVehicles] = useState(fleetFromApi);

  // Build accepted list from data.vehicles (the vehicle type selections)
  const [accepted, setAccepted] = useState(() =>
    (data.vehicles ?? []).map((v) => v.selected),
  );

  const totalVehicles = fleetVehicles.reduce((sum, v) => sum + v.count, 0);

  const handleSave = () => {
    // Persist fleet pricing + accepted vehicle types
    onSave({
      fleet: {
        vehicles: fleetVehicles,
        totalVehicles,
      },
      vehicles: (data.vehicles ?? []).map((v, i) => ({
        ...v,
        selected: accepted[i] ?? v.selected,
      })),
    });
  };

  return (
    <div className="space-y-4">
      {/* Résumé de la flotte */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Résumé de la flotte
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {fleetVehicles.map((v, i) => (
            <div key={v.type} className="rounded-xl bg-white/60 border border-gray-100 p-3 text-center dark:bg-gray-900/40 dark:border-gray-800">
              {VEHICLE_ICONS[v.type] ?? <Truck className="h-5 w-5 text-gray-400" />}
              <div className="mt-1">
                <input
                  type="number"
                  min={0}
                  value={v.count}
                  onChange={(e) => {
                    const next = [...fleetVehicles];
                    next[i] = { ...next[i], count: parseInt(e.target.value) || 0 };
                    setFleetVehicles(next);
                  }}
                  className="w-16 mx-auto text-center text-lg font-extrabold text-gray-900 dark:text-white bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-sugu-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-gray-400">{v.type}s</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Total : <span className="font-semibold text-gray-600 dark:text-gray-300">{totalVehicles} véhicules</span>
        </p>
      </section>

      {/* Types acceptés */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Types de véhicules acceptés
        </h3>
        <div className="flex flex-wrap gap-2">
          {(data.vehicles ?? []).map((v, i) => (
            <button
              key={v.type}
              onClick={() => {
                const next = [...accepted];
                next[i] = !next[i];
                setAccepted(next);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                accepted[i]
                  ? "border-sugu-400 bg-sugu-500 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400",
              )}
            >
              <span>{VEHICLE_ICONS[v.type] ?? <Truck className="h-5 w-5" />}</span>
              {v.type}
            </button>
          ))}
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
          {isSaving ? "Sauvegarde…" : "Sauvegarder la flotte"}
        </button>
      </div>
    </div>
  );
}
