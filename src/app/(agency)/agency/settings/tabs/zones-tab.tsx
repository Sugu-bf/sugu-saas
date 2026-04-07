"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Trash2, MapPin, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAgencyZones, useCreateAgencyZone, useUpdateAgencyZone, useDeleteAgencyZone } from "@/features/agency/hooks";
import type { AgencyZoneData } from "@/features/agency/services/zones.service";
import { Toggle } from "../components/toggle";

export function ZonesTab() {
  // Fetch real zones from the API (delivery_zones + delivery_rates)
  const { data: zones, isLoading, isError } = useAgencyZones();
  const createMutation = useCreateAgencyZone();
  const updateMutation = useUpdateAgencyZone();
  const deleteMutation = useDeleteAgencyZone();

  // New zone form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newZone, setNewZone] = useState({ name: "", tarif: "", delay: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Success/error toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddZone = () => {
    const errors: Record<string, string> = {};
    if (!newZone.name.trim()) errors.name = "Nom requis";
    if (!newZone.tarif.trim() || isNaN(Number(newZone.tarif))) errors.tarif = "Tarif valide requis";
    if (!newZone.delay.trim()) errors.delay = "Délai requis";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createMutation.mutate(
      {
        name: newZone.name.trim(),
        tarif: Number(newZone.tarif),
        delay: newZone.delay.trim(),
        countryCode: "BF",
        enabled: true,
      },
      {
        onSuccess: () => {
          setNewZone({ name: "", tarif: "", delay: "" });
          setShowAddForm(false);
          setFormErrors({});
          showToast("success", "Zone créée avec succès");
        },
        onError: (err) => {
          showToast("error", (err as Error).message || "Erreur lors de la création");
        },
      },
    );
  };

  const handleToggleZone = (zone: AgencyZoneData) => {
    updateMutation.mutate(
      { zoneId: zone.id, enabled: !zone.enabled },
      {
        onSuccess: () => showToast("success", `Zone ${zone.enabled ? "désactivée" : "activée"}`),
        onError: () => showToast("error", "Erreur lors de la mise à jour"),
      },
    );
  };

  const handleDeleteZone = (zone: AgencyZoneData) => {
    if (!confirm(`Supprimer la zone "${zone.name}" ? Cette action est irréversible.`)) return;

    deleteMutation.mutate(zone.id, {
      onSuccess: () => showToast("success", "Zone supprimée"),
      onError: () => showToast("error", "Erreur lors de la suppression"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-sugu-500" />
        <span className="ml-2 text-sm text-gray-500">Chargement des zones…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-400 mb-2" />
        <p className="text-sm text-gray-500">Erreur lors du chargement des zones</p>
        <p className="text-xs text-gray-400 mt-1">Vérifiez votre connexion et réessayez.</p>
      </div>
    );
  }

  const zonesList = zones ?? [];

  return (
    <div className="space-y-4">
      {/* Zones actives */}
      <section className="glass-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
          Zones de couverture
        </h3>
        <p className="text-[11px] text-gray-400 mb-4">
          Les zones configurées ici déterminent les secteurs où votre agence apparaît au checkout. Chaque zone crée un tarif de livraison.
        </p>

        {zonesList.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MapPin className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-xs text-gray-400 mb-1">Aucune zone configurée</p>
            <p className="text-[10px] text-gray-400 max-w-xs">
              Ajoutez des zones de couverture pour que votre agence apparaisse au checkout et puisse recevoir des commandes.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {zonesList.map((zone) => (
              <div
                key={zone.id}
                className={cn(
                  "flex flex-col gap-2 sm:flex-row sm:items-center rounded-xl border p-3 transition-all",
                  zone.enabled
                    ? "border-gray-100 bg-white/60 dark:border-gray-800 dark:bg-gray-900/40"
                    : "border-gray-100/50 bg-gray-50/40 opacity-60 dark:border-gray-800/50 dark:bg-gray-900/20",
                )}
              >
                <Toggle
                  checked={zone.enabled}
                  onChange={() => handleToggleZone(zone)}
                  label={`Zone ${zone.name}`}
                />
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white min-w-[140px]">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-sugu-500" />
                  {zone.name}
                  <span className="text-[10px] font-normal text-gray-400">
                    ({zone.countryCode})
                  </span>
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[80px]">
                  {zone.tarif} FCFA
                </span>
                <span className="text-xs text-gray-500 min-w-[60px]">
                  {zone.delay || "—"}
                </span>
                <button
                  onClick={() => handleDeleteZone(zone)}
                  disabled={deleteMutation.isPending}
                  className="ml-auto rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                  aria-label={`Supprimer ${zone.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add zone form */}
        {showAddForm && (
          <div className="mt-3 rounded-xl border border-sugu-200 bg-sugu-50/30 p-4 dark:border-sugu-800 dark:bg-sugu-950/20">
            <h4 className="text-xs font-bold text-gray-800 dark:text-white mb-3">
              Nouvelle zone
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Nom de la zone *
                </label>
                <input
                  type="text"
                  value={newZone.name}
                  onChange={(e) => {
                    setNewZone((prev) => ({ ...prev, name: e.target.value }));
                    setFormErrors((prev) => { const n = { ...prev }; delete n.name; return n; });
                  }}
                  className={cn("form-input py-1.5 text-xs", formErrors.name && "border-red-400 ring-1 ring-red-400")}
                  placeholder="Ex: Ouagadougou Centre"
                />
                {formErrors.name && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Tarif (FCFA) *
                </label>
                <input
                  type="number"
                  value={newZone.tarif}
                  onChange={(e) => {
                    setNewZone((prev) => ({ ...prev, tarif: e.target.value }));
                    setFormErrors((prev) => { const n = { ...prev }; delete n.tarif; return n; });
                  }}
                  className={cn("form-input py-1.5 text-xs", formErrors.tarif && "border-red-400 ring-1 ring-red-400")}
                  placeholder="Ex: 1000"
                  min="0"
                />
                {formErrors.tarif && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.tarif}</p>}
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">
                  Délai *
                </label>
                <input
                  type="text"
                  value={newZone.delay}
                  onChange={(e) => {
                    setNewZone((prev) => ({ ...prev, delay: e.target.value }));
                    setFormErrors((prev) => { const n = { ...prev }; delete n.delay; return n; });
                  }}
                  className={cn("form-input py-1.5 text-xs", formErrors.delay && "border-red-400 ring-1 ring-red-400")}
                  placeholder="Ex: 24h"
                />
                {formErrors.delay && <p className="text-[10px] text-red-500 mt-0.5">{formErrors.delay}</p>}
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setShowAddForm(false); setNewZone({ name: "", tarif: "", delay: "" }); setFormErrors({}); }}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
              >
                Annuler
              </button>
              <button
                onClick={handleAddZone}
                disabled={createMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg bg-sugu-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sugu-600",
                  createMutation.isPending && "opacity-50 cursor-not-allowed",
                )}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                {createMutation.isPending ? "Création…" : "Créer la zone"}
              </button>
            </div>
          </div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-sugu-300 bg-white px-4 py-2 text-xs font-semibold text-sugu-600 hover:bg-sugu-50 dark:border-sugu-700 dark:bg-gray-900 dark:text-sugu-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter une zone
          </button>
        )}
      </section>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 animate-card-enter inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-lg",
            toast.type === "success" ? "bg-green-500" : "bg-red-500",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
