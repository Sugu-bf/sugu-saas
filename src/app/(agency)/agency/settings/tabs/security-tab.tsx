"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone } from "lucide-react";

export function SecurityTab() {
  const [pwStrength, setPwStrength] = useState(0); // 0=empty, 1=weak, 2=medium, 3=strong
  const [twoFa, setTwoFa] = useState(false);

  return (
    <div className="space-y-4">
      {/* Mot de passe */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Mot de passe
        </h3>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Mot de passe actuel</label>
            <input type="password" placeholder="••••••••" className="form-input py-2 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              className="form-input py-2 text-sm"
              onChange={(e) => {
                const len = e.target.value.length;
                setPwStrength(len === 0 ? 0 : len < 6 ? 1 : len < 10 ? 2 : 3);
              }}
            />
            {/* Strength bar */}
            {pwStrength > 0 && (
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors",
                      pwStrength >= level
                        ? level === 1 ? "bg-red-500" : level === 2 ? "bg-amber-500" : "bg-green-500"
                        : "bg-gray-200 dark:bg-gray-700",
                    )}
                  />
                ))}
              </div>
            )}
            {pwStrength > 0 && (
              <p className={cn(
                "mt-0.5 text-[10px] font-medium",
                pwStrength === 1 ? "text-red-500" : pwStrength === 2 ? "text-amber-500" : "text-green-500",
              )}>
                {pwStrength === 1 ? "Faible" : pwStrength === 2 ? "Moyen" : "Fort"}
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">Confirmer le mot de passe</label>
            <input type="password" placeholder="••••••••" className="form-input py-2 text-sm" />
          </div>
          <button className="rounded-full border border-sugu-300 bg-white px-5 py-2 text-xs font-semibold text-sugu-600 hover:bg-sugu-50 dark:border-sugu-700 dark:bg-gray-900">
            Mettre à jour
          </button>
          <p className="text-[10px] text-gray-400">Dernière modification : il y a 2 mois</p>
        </div>
      </section>

      {/* 2FA */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Authentification à deux facteurs (2FA)
        </h3>
        {!twoFa ? (
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/30">
              🔴 Désactivé
            </span>
            <p className="text-xs text-gray-500">
              Protégez votre compte avec une vérification SMS.
            </p>
            <button
              onClick={() => setTwoFa(true)}
              className="rounded-full bg-sugu-500 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sugu-600"
            >
              Activer la 2FA
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold text-green-600 dark:bg-green-950/30">
              🟢 Activé
            </span>
            <p className="text-xs text-gray-500">
              Vérification via ****3456
            </p>
            <button
              onClick={() => setTwoFa(false)}
              className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20"
            >
              Désactiver
            </button>
          </div>
        )}
      </section>

      {/* Sessions */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Sessions actives
        </h3>
        <div className="space-y-2.5">
          {/* Current */}
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50/40 p-3 dark:border-green-900/40 dark:bg-green-950/10">
            <Monitor className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white">Chrome sur Windows</span>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-600 dark:bg-green-950/30">
                  Session actuelle
                </span>
              </div>
              <p className="text-[10px] text-gray-400">Bamako, Mali · Depuis 2h</p>
            </div>
          </div>
          {/* Other */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-900/40">
            <Smartphone className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white">Safari sur iPhone</p>
              <p className="text-[10px] text-gray-400">Bamako · Il y a 3 jours</p>
            </div>
            <button className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/20">
              Déconnecter
            </button>
          </div>
        </div>
        <button className="mt-3 text-xs font-semibold text-red-500 hover:text-red-600">
          Déconnecter toutes les autres sessions
        </button>
      </section>
    </div>
  );
}
