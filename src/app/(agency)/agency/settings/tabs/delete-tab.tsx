"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDeleteAgency } from "@/features/agency/hooks";
import { useRouter } from "next/navigation";

export function DeleteTab() {
  const [checks, setChecks] = useState([false, false, false]);
  const [confirmText, setConfirmText] = useState("");
  const router = useRouter();
  const deleteMutation = useDeleteAgency();

  const allChecked = checks.every(Boolean) && confirmText === "SUPPRIMER";

  const toggle = (i: number) => {
    const next = [...checks];
    next[i] = !next[i];
    setChecks(next);
  };

  const handleDelete = () => {
    if (!allChecked) return;

    deleteMutation.mutate(confirmText, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  return (
    <section className="rounded-2xl bg-red-50/50 border border-red-200/60 p-6 dark:bg-red-950/10 dark:border-red-900/30">
      <div className="flex flex-col items-center text-center mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/30">
          <AlertTriangle className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-red-600">Supprimer mon agence</h3>
        <p className="mt-2 text-xs text-gray-500 max-w-md">
          Cette action est irréversible. Toutes vos données, livreurs, historique de livraisons et revenus en attente seront supprimés définitivement.
        </p>
      </div>

      <div className="space-y-3 max-w-lg mx-auto">
        {[
          "Je comprends que cette action est irréversible",
          "J'ai retiré tous mes fonds disponibles",
          "Je confirme vouloir supprimer mon agence et toutes les données",
        ].map((label, i) => (
          <label key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={() => toggle(i)}
              disabled={deleteMutation.isPending}
              className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            {label}
          </label>
        ))}

        <div className="mt-4">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            Tapez <span className="font-bold text-red-500">SUPPRIMER</span> pour confirmer
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            disabled={deleteMutation.isPending}
            className="form-input py-2 text-sm border-red-200 focus:border-red-400 focus:ring-red-400 dark:border-red-900/40"
          />
        </div>

        {deleteMutation.isError && (
          <p className="text-[11px] font-medium text-red-500">
            {(deleteMutation.error as Error).message ?? "Erreur lors de la suppression."}
          </p>
        )}

        <div className="flex items-center gap-3 mt-4 justify-center">
          <button
            disabled={!allChecked || deleteMutation.isPending}
            onClick={handleDelete}
            className={cn(
              "rounded-full px-6 py-2.5 text-xs font-semibold transition-all",
              allChecked && !deleteMutation.isPending
                ? "bg-red-600 text-white shadow-md hover:bg-red-700"
                : "bg-red-200 text-red-400 cursor-not-allowed",
            )}
          >
            {deleteMutation.isPending ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Suppression…
              </span>
            ) : (
              "Supprimer définitivement"
            )}
          </button>
          <button
            className="text-xs font-semibold text-gray-400 hover:text-gray-500"
            onClick={() => {
              setChecks([false, false, false]);
              setConfirmText("");
            }}
            disabled={deleteMutation.isPending}
          >
            Annuler
          </button>
        </div>
      </div>
    </section>
  );
}
