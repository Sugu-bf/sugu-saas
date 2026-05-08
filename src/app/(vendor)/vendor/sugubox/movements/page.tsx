"use client";

import { useEffect, useState } from "react";
import { ScrollText, TrendingUp, TrendingDown } from "lucide-react";
import {
  getSuguBoxMovements,
  type SuguBoxMovement,
} from "@/features/vendor/services/sugubox.service";

const MOVEMENT_COLORS: Record<string, string> = {
  inbound: "bg-green-50 text-green-700 border-green-200",
  outbound: "bg-red-50 text-red-600 border-red-200",
  transfer: "bg-blue-50 text-blue-700 border-blue-200",
  adjustment: "bg-orange-50 text-orange-700 border-orange-200",
};

const DOT_COLORS: Record<string, string> = {
  inbound: "bg-green-500",
  outbound: "bg-red-500",
  transfer: "bg-blue-500",
  adjustment: "bg-orange-500",
};

const TYPE_OPTIONS = [
  { value: "", label: "Tous les types" },
  { value: "inbound", label: "Entrées" },
  { value: "outbound", label: "Sorties" },
  { value: "transfer", label: "Transferts" },
  { value: "adjustment", label: "Ajustements" },
];

export default function SuguBoxMovementsPage() {
  const [movements, setMovements] = useState<SuguBoxMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    getSuguBoxMovements({
      page,
      type: typeFilter || undefined,
    })
      .then((res) => {
        setMovements(res.data);
        setTotal(res.total);
        setLastPage(res.last_page);
      })
      .finally(() => setLoading(false));
  }, [page, typeFilter]);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Mes mouvements de stock
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold">
            {total}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-medium dark:text-gray-400">
          Historique des mouvements de vos produits en entrepôt Sugu
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setLoading(true);
              setTypeFilter(opt.value);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              typeFilter === opt.value
                ? "bg-gray-800 text-white shadow-sm dark:bg-gray-200 dark:text-gray-900"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-sugu-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 dark:bg-gray-800/50 dark:border-gray-800">
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Bin
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-16 text-gray-400 font-medium"
                    >
                      <ScrollText className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                      Aucun mouvement trouvé
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr
                      key={m.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Intl.DateTimeFormat("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(m.created_at))}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${MOVEMENT_COLORS[m.movement_type] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[m.movement_type] ?? "bg-gray-400"}`}
                          />
                          {m.type_label}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {m.variant ? (
                          <span className="text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {m.variant.product_name}
                            </span>{" "}
                            · {m.variant.title}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800">
                          {m.bin_code ?? "—"}
                        </code>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-500"}`}
                        >
                          {m.quantity > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {m.quantity > 0 ? "+" : ""}
                          {m.quantity}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {lastPage > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between dark:border-gray-800">
            <p className="text-xs text-gray-500">{total} mouvements</p>
            <div className="flex gap-1">
              <button
                disabled={page <= 1}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p - 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                ← Préc.
              </button>
              <span className="px-3 py-1.5 text-xs font-semibold text-gray-500">
                {page} / {lastPage}
              </span>
              <button
                disabled={page >= lastPage}
                onClick={() => {
                  setLoading(true);
                  setPage((p) => p + 1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
