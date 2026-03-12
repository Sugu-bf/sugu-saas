"use client";

import { useState } from "react";
import type { DriverSettings } from "@/features/driver/schema";
import { useUpdateDriverVehicle } from "@/features/driver/hooks";
import { SectionCard, Field, PillInput, PillSelect, PillBadge, PillButton } from "./settings-ui";
import { toast } from "sonner";
import {
  Bike,
  Pencil,
  Palette,
  Calendar,
  Weight,
  RectangleHorizontal,
  Save,
  Loader2,
  Plus,
  X,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Onglet 2 — Véhicule
// ────────────────────────────────────────────────────────────

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  moto: "Moto",
  velo: "Vélo",
  voiture: "Voiture",
  tricycle: "Tricycle",
  car: "Voiture",
};

interface TabVehicleProps {
  data: DriverSettings;
}

export function TabVehicle({ data }: TabVehicleProps) {
  const v = data.vehicle;

  const [type, setType] = useState(v.type);
  const [brand, setBrand] = useState(v.brand);
  const [licensePlate, setLicensePlate] = useState(v.licensePlate);
  const [color, setColor] = useState(v.color);
  const [maxCapacity, setMaxCapacity] = useState(String(v.maxCapacityKg));
  const [year, setYear] = useState(String(v.year));
  const [notes, setNotes] = useState(v.notes ?? "");

  const updateVehicleMutation = useUpdateDriverVehicle();

  const handleSave = async () => {
    try {
      await updateVehicleMutation.mutateAsync({
        type,
        brand,
        licensePlate,
        color,
        maxCapacityKg: Number(maxCapacity),
        year: Number(year),
        notes: notes || null,
      });
      toast.success("Véhicule mis à jour avec succès");
    } catch {
      toast.error("Erreur lors de la mise à jour du véhicule");
    }
  };

  // All 3 photo slots
  const photoSlots = [
    { label: "Vue avant", photo: v.photos.find((p) => p.label === "Vue avant") },
    { label: "Vue côté", photo: v.photos.find((p) => p.label === "Vue côté") },
    { label: "Vue arrière", photo: v.photos.find((p) => p.label === "Vue arrière") },
  ];

  return (
    <div className="space-y-6">
      {/* Card 1: Mon véhicule actuel */}
      <SectionCard title="Mon véhicule actuel" id="vehicle-current" className="animate-card-enter">
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-white/40 p-4 dark:bg-white/5">
          {/* Icon */}
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-sugu-50 text-sugu-500 dark:bg-sugu-950/30">
            <Bike className="h-6 w-6" />
          </div>
          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {VEHICLE_TYPE_LABELS[v.type] ?? v.type} — {v.brand}
            </p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Plaque: {v.licensePlate} • Couleur: {v.color}
            </p>
          </div>
          {/* Badge */}
          {v.isActive && <PillBadge variant="green">Actif</PillBadge>}
          {/* Edit link */}
          <button className="flex items-center gap-1 text-xs font-medium text-sugu-500 hover:text-sugu-600 dark:text-sugu-400">
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </button>
        </div>
      </SectionCard>

      {/* Card 2: Détails du véhicule */}
      <SectionCard title="Détails du véhicule" id="vehicle-details" className="animate-card-enter" style={{ animationDelay: "60ms" } as React.CSSProperties}>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type de véhicule" required>
            <PillSelect
              value={type}
              onChange={(v) => setType(v as typeof type)}
              prefix={<Bike className="h-3.5 w-3.5 text-gray-400" />}
              options={[
                { value: "moto", label: "Moto" },
                { value: "velo", label: "Vélo" },
                { value: "voiture", label: "Voiture" },
                { value: "car", label: "Voiture (Car)" },
                { value: "tricycle", label: "Tricycle" },
              ]}
            />
          </Field>
          <Field label="Marque & Modèle" required>
            <PillInput value={brand} onChange={setBrand} />
          </Field>
          <Field label="Numéro de plaque" required>
            <PillInput value={licensePlate} onChange={setLicensePlate} prefix={<RectangleHorizontal className="h-3.5 w-3.5 text-gray-400" />} />
          </Field>
          <Field label="Couleur">
            <PillInput value={color} onChange={setColor} prefix={<Palette className="h-3.5 w-3.5 text-gray-400" />} />
          </Field>
          <Field label="Capacité maximale">
            <PillInput value={maxCapacity} onChange={setMaxCapacity} prefix={<Weight className="h-3.5 w-3.5 text-gray-400" />} suffix={<span className="text-xs font-medium text-gray-400">kg</span>} />
          </Field>
          <Field label="Année">
            <PillInput value={year} onChange={setYear} prefix={<Calendar className="h-3.5 w-3.5 text-gray-400" />} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes supplémentaires">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Caisse isotherme installée, GPS intégré..."
              className="w-full rounded-2xl border border-white/60 bg-white/50 px-4 py-2.5 text-sm text-gray-700 backdrop-blur placeholder:text-gray-400 transition-all focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200 resize-none"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Card 3: Photos du véhicule */}
      <SectionCard title="Photos du véhicule" id="vehicle-photos" className="animate-card-enter" style={{ animationDelay: "120ms" } as React.CSSProperties}>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">(3 photos recommandées)</p>
        <div className="mt-4 flex flex-wrap gap-4">
          {photoSlots.map((slot) => (
            <div key={slot.label} className="flex flex-col items-center gap-1.5">
              {slot.photo ? (
                <div className="relative h-24 w-32 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-500 dark:bg-gray-700">
                    {slot.label}
                  </div>
                  <button className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-white transition-all hover:bg-red-600" aria-label={`Supprimer ${slot.label}`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button className="flex h-24 w-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-all hover:border-sugu-300 hover:text-sugu-500 dark:border-gray-700 dark:hover:border-sugu-600">
                  <Plus className="h-5 w-5" />
                  <span className="mt-1 text-[10px]">Ajouter</span>
                </button>
              )}
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{slot.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">JPG, PNG • Max 5MB par photo</p>
      </SectionCard>

      {/* Footer buttons */}
      <div className="flex items-center justify-end gap-3">
        <PillButton variant="outline">Annuler</PillButton>
        <PillButton variant="primary" onClick={handleSave} disabled={updateVehicleMutation.isPending}>
          {updateVehicleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer les modifications
        </PillButton>
      </div>
    </div>
  );
}
