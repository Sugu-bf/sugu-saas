"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageMinus, Eye } from "lucide-react";
import {
  getSuguBoxOutbound,
  type SuguBoxOutboundOrder,
} from "@/features/vendor/services/sugubox.service";
import { formatDateFr } from "@/features/vendor/services/_shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  picking: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function SuguBoxOutboundPage() {
  const [orders, setOrders] = useState<SuguBoxOutboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    getSuguBoxOutbound({ page })
      .then((res) => {
        setOrders(res.data);
        setTotal(res.total);
        setLastPage(res.last_page);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Mes expéditions
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-600 border border-purple-200 text-xs font-bold">
            {total}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-medium dark:text-gray-400">
          Commandes préparées et expédiées depuis l&#39;entrepôt Sugu
        </p>
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
                    Référence
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Entrepôt
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Lignes
                  </th>
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-16 text-gray-400 font-medium"
                    >
                      <PackageMinus className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                      Aucune expédition
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-6 py-3 font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {o.reference}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {o.status_label}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-600 dark:text-gray-400">
                        {o.warehouse?.name ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-center text-xs text-gray-600 dark:text-gray-400">
                        {o.lines_count}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        {formatDateFr(o.created_at)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <Link
                          href={`/vendor/sugubox/outbound/${o.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Détail
                        </Link>
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
            <p className="text-xs text-gray-500">{total} expéditions</p>
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
