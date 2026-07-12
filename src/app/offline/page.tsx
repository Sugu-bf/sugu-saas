"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="animate-fade-in">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <WifiOff className="h-9 w-9 text-gray-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vous êtes hors ligne</h1>
        <p className="mt-3 max-w-md text-gray-500 dark:text-gray-400">
          Impossible de charger cette page sans connexion internet. Vérifiez votre connexion et réessayez.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-sugu-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sugu-500/25 transition-all hover:bg-sugu-600"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
