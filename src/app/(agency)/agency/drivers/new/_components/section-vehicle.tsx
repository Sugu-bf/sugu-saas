"use client";

import { Bike, Car, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateCourierFormData, FormVehicleType } from "@/features/agency/schema";

interface SectionVehicleProps {
  data: CreateCourierFormData;
  onChange: <K extends keyof CreateCourierFormData>(field: K, value: CreateCourierFormData[K]) => void;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-200/80 bg-gray-50/50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-sugu-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sugu-500/20";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-gray-600";

const VEHICLE_TYPES: { id: FormVehicleType; label: string; icon: typeof Bike }[] = [
  { id: "moto", label: "Moto", icon: Bike },
  { id: "velo", label: "Vélo", icon: Bike },
  { id: "voiture", label: "Voiture", icon: Car },
  { id: "tricycle", label: "Tricycle", icon: Truck },
];

export function SectionVehicle({ data, onChange }: SectionVehicleProps) {
  return (
    <div
      className="glass-card animate-card-enter rounded-2xl p-4 lg:rounded-3xl lg:p-6"
      style={{ animationDelay: "60ms" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sugu-50 to-sugu-100">
          <Bike className="h-4 w-4 text-sugu-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Véhicule</h2>
          <p className="text-xs text-gray-400">Informations sur le véhicule du livreur</p>
        </div>
      </div>

      {/* Vehicle type selector */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {VEHICLE_TYPES.map((type) => {
          const isSelected = data.vehicleType === type.id;
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange("vehicleType", type.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                isSelected
                  ? "border-2 border-sugu-500 bg-sugu-50/30 shadow-sm"
                  : "border-gray-200 bg-white/40 hover:border-gray-300",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isSelected
                    ? "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white"
                    : "bg-gray-100 text-gray-400",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold",
                  isSelected ? "text-sugu-600" : "text-gray-500",
                )}
              >
                {type.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vehicle details fields */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Marque & Modèle */}
        <div>
          <label className={LABEL_CLASS}>
            Marque & Modèle <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.vehicleMake}
            onChange={(e) => onChange("vehicleMake", e.target.value)}
            placeholder="Yamaha FZ"
            className={INPUT_CLASS}
          />
        </div>

        {/* Numéro de plaque */}
        <div>
          <label className={LABEL_CLASS}>
            Numéro de plaque <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.vehiclePlate}
            onChange={(e) => onChange("vehiclePlate", e.target.value)}
            placeholder="BKO-1234-ML"
            className={INPUT_CLASS}
          />
        </div>

        {/* Couleur */}
        <div>
          <label className={LABEL_CLASS}>Couleur</label>
          <input
            type="text"
            value={data.vehicleColor ?? ""}
            onChange={(e) => onChange("vehicleColor", e.target.value)}
            placeholder="Noir"
            className={INPUT_CLASS}
          />
        </div>

        {/* Année */}
        <div>
          <label className={LABEL_CLASS}>Année</label>
          <input
            type="text"
            value={data.vehicleYear ?? ""}
            onChange={(e) => onChange("vehicleYear", e.target.value)}
            placeholder="2022"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </div>
  );
}
