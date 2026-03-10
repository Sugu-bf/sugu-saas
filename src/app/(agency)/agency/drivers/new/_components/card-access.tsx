"use client";

import { Key, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCourierFormData } from "@/features/agency/schema";

interface CardAccessProps {
  data: CreateCourierFormData;
  onChange: <K extends keyof CreateCourierFormData>(field: K, value: CreateCourierFormData[K]) => void;
}

const TOGGLES = [
  { field: "autoPassword" as const, label: "Générer un mot de passe automatiquement" },
  { field: "sendSms" as const, label: "Envoyer les identifiants par SMS" },
  { field: "sendEmail" as const, label: "Envoyer par Email aussi" },
];

export function CardAccess({ data, onChange }: CardAccessProps) {
  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-5"
      style={{ animationDelay: "60ms" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-50 to-sugu-100">
          <Key className="h-4 w-4 text-sugu-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Identifiants de connexion</h3>
          <p className="text-[11px] text-gray-400">Le livreur recevra ses identifiants par SMS</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="mt-4 space-y-1">
        {TOGGLES.map((toggle) => (
          <div key={toggle.field} className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">{toggle.label}</span>
            <button
              type="button"
              onClick={() => onChange(toggle.field, !data[toggle.field])}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200",
                data[toggle.field] ? "bg-sugu-500" : "bg-gray-200",
              )}
            >
              <span
                className={cn(
                  "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200",
                  data[toggle.field] ? "translate-x-5" : "translate-x-0.5",
                )}
                style={{ marginTop: "2px" }}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <span className="text-[11px] leading-relaxed text-blue-700">
          Le livreur pourra modifier son mot de passe lors de sa première connexion.
        </span>
      </div>
    </div>
  );
}
