"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackageMinus, CheckCircle2 } from "lucide-react";
import {
  getSuguBoxOutboundDetail,
  type SuguBoxOutboundDetail,
} from "@/features/vendor/services/sugubox.service";
import { formatDateFr } from "@/features/vendor/services/_shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  picking: "bg-blue-50 text-blue-700 border-blue-200",
  packed: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function SuguBoxOutboundShowPage() {
  const params = useParams();
  const [order, setOrder] = useState<SuguBoxOutboundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      getSuguBoxOutboundDetail(params.id as string)
        .then(setOrder)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-sugu-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-gray-500">Expédition introuvable</div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/vendor/sugubox/outbound"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux expéditions
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-md">
            <PackageMinus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {order.reference}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {order.warehouse?.name} · {formatDateFr(order.created_at)}
              {order.shipped_at && (
                <span className="ml-2 text-green-600">
                  · Expédié le{" "}
                  {formatDateFr(order.shipped_at)}
                </span>
              )}
            </p>
          </div>
        </div>
        <span
          className={`self-start inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {order.status_label}
        </span>
      </div>

      {/* Lines */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 dark:bg-gray-800/50 dark:border-gray-800">
              <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Produit
              </th>
              <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Demandé
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pické
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((line) => (
              <tr
                key={line.id}
                className="border-b border-gray-50 dark:border-gray-800"
              >
                <td className="px-6 py-3">
                  {line.variant ? (
                    <span className="text-xs">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {line.variant.product_name}
                      </span>{" "}
                      · {line.variant.title}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs italic">—</span>
                  )}
                </td>
                <td className="px-6 py-3">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800">
                    {line.variant?.sku ?? "—"}
                  </code>
                </td>
                <td className="px-6 py-3 text-center font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                  {line.requested_qty}
                </td>
                <td className="px-6 py-3 text-center font-mono text-xs font-bold text-purple-600">
                  {line.picked_qty}
                </td>
                <td className="px-6 py-3 text-center">
                  {line.picked_qty >= line.requested_qty ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-gray-400">En cours</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
