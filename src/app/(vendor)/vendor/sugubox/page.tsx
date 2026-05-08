"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  PackagePlus,
  PackageMinus,
  ScrollText,
  Boxes,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  getSuguBoxOverview,
  type SuguBoxOverviewData,
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

export default function SuguBoxOverviewPage() {
  const [data, setData] = useState<SuguBoxOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuguBoxOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-sugu-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Boxes className="h-16 w-16 text-gray-200" />
        <p className="text-gray-500 font-medium">
          Impossible de charger les données Sugu Box.
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: "Variantes en stock",
      value: data.total_variants_in_box,
      icon: <Package className="h-5 w-5" />,
      gradient: "from-blue-50 to-blue-100/60",
      iconBg: "bg-gradient-to-br from-blue-400 to-blue-500 text-white",
    },
    {
      label: "Unités totales",
      value: data.total_units_in_box.toLocaleString("fr-FR"),
      icon: <Boxes className="h-5 w-5" />,
      gradient: "from-sugu-50 to-sugu-100/60",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
    {
      label: "Réceptions actives",
      value: data.pending_inbound_count,
      icon: <PackagePlus className="h-5 w-5" />,
      gradient: "from-green-50 to-green-100/60",
      iconBg: "bg-gradient-to-br from-green-400 to-green-500 text-white",
    },
    {
      label: "Expéditions en cours",
      value: data.active_outbound_count,
      icon: <PackageMinus className="h-5 w-5" />,
      gradient: "from-purple-50 to-purple-100/60",
      iconBg: "bg-gradient-to-br from-purple-400 to-purple-500 text-white",
    },
  ];

  return (
    <div className="space-y-8 p-6 md:p-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Mon espace Sugu Box
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-sugu-50 to-sugu-100 text-sugu-600 text-xs font-bold border border-sugu-200">
            <Boxes className="h-3.5 w-3.5" />
            Vendu et expédié par Sugu
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1 font-medium dark:text-gray-400">
          Suivi de votre stock confié à l&#39;entrepôt Sugu
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.gradient} border border-gray-100 p-5 transition-all hover:shadow-md dark:border-gray-800/50`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  {s.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
                  {s.value}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} shadow-md`}
              >
                {s.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            href: "/vendor/sugubox/stock",
            label: "Mon stock",
            icon: <Package className="h-5 w-5" />,
          },
          {
            href: "/vendor/sugubox/inbound",
            label: "Réceptions",
            icon: <PackagePlus className="h-5 w-5" />,
          },
          {
            href: "/vendor/sugubox/outbound",
            label: "Expéditions",
            icon: <PackageMinus className="h-5 w-5" />,
          },
          {
            href: "/vendor/sugubox/movements",
            label: "Mouvements",
            icon: <ScrollText className="h-5 w-5" />,
          },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 transition-all hover:border-sugu-300 hover:bg-sugu-50/50 hover:text-sugu-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-sugu-600 dark:hover:text-sugu-400"
          >
            <span className="text-gray-400">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Recent Movements */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            5 derniers mouvements
          </h2>
          <Link
            href="/vendor/sugubox/movements"
            className="text-xs font-semibold text-sugu-500 hover:text-sugu-600 transition-colors"
          >
            Voir tout →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Bin
                </th>
                <th className="text-center px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recent_movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-gray-400 font-medium"
                  >
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                data.recent_movements.map((m: SuguBoxMovement) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors dark:border-gray-800 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-6 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "numeric",
                        month: "short",
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
                        className={`font-mono text-xs font-bold ${m.quantity > 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {m.quantity > 0 ? (
                          <TrendingUp className="inline h-3 w-3 mr-0.5" />
                        ) : (
                          <TrendingDown className="inline h-3 w-3 mr-0.5" />
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
      </div>
    </div>
  );
}
