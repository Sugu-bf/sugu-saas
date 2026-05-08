"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackagePlus, CheckCircle2 } from "lucide-react";
import {
  getSuguBoxInboundDetail,
  type SuguBoxInboundDetail,
} from "@/features/vendor/services/sugubox.service";
import { formatDateFr } from "@/features/vendor/services/_shared";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function SuguBoxInboundShowPage() {
  const params = useParams();
  const [shipment, setShipment] = useState<SuguBoxInboundDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      getSuguBoxInboundDetail(params.id as string)
        .then(setShipment)
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

  if (!shipment) {
    return (
      <div className="p-8 text-center text-gray-500">Réception introuvable</div>
    );
  }

  const totalExpected = shipment.lines.reduce((s, l) => s + l.expected_qty, 0);
  const totalReceived = shipment.lines.reduce((s, l) => s + l.received_qty, 0);
  const progress = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Link
        href="/vendor/sugubox/inbound"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux réceptions
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-green-500 text-white shadow-md">
            <PackagePlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              {shipment.reference}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {shipment.warehouse?.name} · {formatDateFr(shipment.created_at)}
            </p>
          </div>
        </div>
        <span
          className={`self-start inline-flex px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[shipment.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {shipment.status_label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Progression de la réception
          </span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
            {totalReceived} / {totalExpected} unités ({progress}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 dark:bg-gray-800">
          <div
            className="bg-gradient-to-r from-green-400 to-green-500 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
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
                Attendu
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Reçu
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Bin
              </th>
              <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Statut
              </th>
            </tr>
          </thead>
          <tbody>
            {shipment.lines.map((line) => (
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
                  {line.expected_qty}
                </td>
                <td className="px-6 py-3 text-center font-mono text-xs font-bold text-green-600">
                  {line.received_qty}
                </td>
                <td className="px-6 py-3 text-center">
                  <code className="text-xs bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800">
                    {line.bin_code ?? "—"}
                  </code>
                </td>
                <td className="px-6 py-3 text-center">
                  {line.received_qty >= line.expected_qty ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-xs text-gray-400">En attente</span>
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
