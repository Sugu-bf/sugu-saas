"use client";

import { useAgencySettings } from "@/features/agency/hooks";
import { SettingsContent } from "./settings-content";
import SettingsLoading from "./loading";
import { AlertTriangle } from "lucide-react";

export default function AgencySettingsPage() {
  const { data, isLoading, isError, error, refetch } = useAgencySettings();

  if (isLoading) return <SettingsLoading />;

  if (isError) {
    // Re-use the existing error boundary component shape
    const err = error as Error & { digest?: string };
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Impossible de charger les paramètres
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {err.message || "Une erreur est survenue lors du chargement des paramètres."}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sugu-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sugu-500"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return null;

  return <SettingsContent data={data} />;
}
