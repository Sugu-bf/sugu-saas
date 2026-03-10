// ============================================================
// EmptyState — contextual empty state per tab
// ============================================================

import { Package, Search, X } from "lucide-react";
import type { DriverStatusTab } from "./status-config";

const MESSAGES: Record<DriverStatusTab, { title: string; sub: string }> = {
  all: {
    title: "Aucune livraison",
    sub: "Vos prochaines livraisons apparaîtront ici.",
  },
  to_accept: {
    title: "Rien à accepter",
    sub: "Aucune nouvelle livraison en attente.",
  },
  en_route: {
    title: "Aucune en cours",
    sub: "Pas de livraison en cours pour le moment.",
  },
  delivered: {
    title: "Aucune livrée",
    sub: "Vos livraisons terminées apparaîtront ici.",
  },
  failed: {
    title: "Aucun échec",
    sub: "Parfait ! Aucune livraison échouée.",
  },
};

export function EmptyState({
  search,
  onClearSearch,
  activeTab,
}: {
  search: string;
  onClearSearch: () => void;
  activeTab: DriverStatusTab;
}) {
  const msg = search
    ? {
        title: "Aucun résultat",
        sub: `Aucune livraison ne correspond à "${search}".`,
      }
    : MESSAGES[activeTab];

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center animate-fade-in">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800">
          <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-md dark:bg-gray-800">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {msg.title}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-[200px]">
          {msg.sub}
        </p>
      </div>
      {search && (
        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-50 px-4 py-2 text-xs font-semibold text-sugu-600 hover:bg-sugu-100 transition-colors dark:bg-sugu-950/30 dark:text-sugu-400"
        >
          <X className="h-3.5 w-3.5" />
          Effacer la recherche
        </button>
      )}
    </div>
  );
}
