"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const VEHICLES = [
  { type: "Moto", icon: "🏍️", count: 12, base: "1,500 FCFA", perKm: "200 FCFA/km", maxWeight: "15 kg" },
  { type: "Voiture", icon: "🚗", count: 4, base: "2,500 FCFA", perKm: "300 FCFA/km", maxWeight: "50 kg" },
  { type: "Vélo", icon: "🚲", count: 1, base: "800 FCFA", perKm: "150 FCFA/km", maxWeight: "10 kg" },
  { type: "Camionnette", icon: "🛻", count: 1, base: "5,000 FCFA", perKm: "500 FCFA/km", maxWeight: "200 kg" },
];

export function VehiclesTab() {
  const [accepted, setAccepted] = useState([true, true, true, true]);
  const [sameBase, setSameBase] = useState(false);

  return (
    <div className="space-y-4">
      {/* Résumé de la flotte */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Résumé de la flotte
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {VEHICLES.map((v) => (
            <div key={v.type} className="rounded-xl bg-white/60 border border-gray-100 p-3 text-center dark:bg-gray-900/40 dark:border-gray-800">
              <span className="text-xl">{v.icon}</span>
              <p className="text-lg font-extrabold text-gray-900 dark:text-white">{v.count}</p>
              <p className="text-[10px] text-gray-400">{v.type}s</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Total : <span className="font-semibold text-gray-600 dark:text-gray-300">18 véhicules</span>
        </p>
      </section>

      {/* Types acceptés */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Types de véhicules acceptés
        </h3>
        <div className="flex flex-wrap gap-2">
          {VEHICLES.map((v, i) => (
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
              <span>{v.icon}</span>
              {v.type}
            </button>
          ))}
        </div>
      </section>

      {/* Tarifs */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Tarifs par type de véhicule
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="pb-2 text-left">Véhicule</th>
                <th className="pb-2 text-left">Tarif de base</th>
                <th className="pb-2 text-left">Par km supp.</th>
                <th className="pb-2 text-left">Poids max</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {VEHICLES.map((v) => (
                <tr key={v.type}>
                  <td className="py-2.5 font-semibold text-gray-700 dark:text-gray-300">
                    <span className="mr-1.5">{v.icon}</span>{v.type}
                  </td>
                  <td className="py-2.5">
                    <input type="text" defaultValue={v.base} className="form-input py-1.5 text-xs w-28" />
                  </td>
                  <td className="py-2.5">
                    <input type="text" defaultValue={v.perKm} className="form-input py-1.5 text-xs w-28" />
                  </td>
                  <td className="py-2.5">
                    <input type="text" defaultValue={v.maxWeight} className="form-input py-1.5 text-xs w-20" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={sameBase}
            onChange={() => setSameBase(!sameBase)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-sugu-500 focus:ring-sugu-500"
          />
          Appliquer le même tarif de base à tous
        </label>
      </section>
    </div>
  );
}
