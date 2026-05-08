"use client";

import { useEffect, useState } from "react";
import { Package, ChevronDown, ChevronUp, MapPin } from "lucide-react";
import {
  getSuguBoxStock,
  type SuguBoxStockItem,
} from "@/features/vendor/services/sugubox.service";

export default function SuguBoxStockPage() {
  const [items, setItems] = useState<SuguBoxStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    getSuguBoxStock()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-sugu-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Mon stock en entrepôt
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-medium dark:text-gray-400">
          Détail par variante et localisation physique en bin
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 dark:bg-gray-800/50 dark:border-gray-800">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-8" />
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Variante
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Stock global
                </th>
                <th className="text-center px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Bins
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-gray-400 font-medium"
                  >
                    <Package className="mx-auto h-12 w-12 text-gray-200 mb-3" />
                    Aucun stock en entrepôt Sugu Box
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <>
                    <tr
                      key={item.variant_id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer dark:border-gray-800 dark:hover:bg-gray-800/30"
                      onClick={() => toggle(item.variant_id)}
                    >
                      <td className="px-6 py-3 text-gray-400">
                        {item.bins.length > 0 &&
                          (expanded.has(item.variant_id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </td>
                      <td className="px-6 py-3 font-semibold text-gray-800 dark:text-gray-200">
                        {item.product_name}
                      </td>
                      <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                        {item.title}
                      </td>
                      <td className="px-6 py-3">
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded dark:bg-gray-800">
                          {item.sku}
                        </code>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-sugu-50 text-sugu-700 text-xs font-bold border border-sugu-200">
                          {item.global_qty}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-center text-xs text-gray-500">
                        {item.bins.length} bin
                        {item.bins.length !== 1 ? "s" : ""}
                      </td>
                    </tr>
                    {expanded.has(item.variant_id) &&
                      item.bins.map((bin) => (
                        <tr
                          key={`${item.variant_id}-${bin.bin_id}`}
                          className="bg-gray-50/30 border-b border-gray-50 dark:bg-gray-800/20 dark:border-gray-800"
                        >
                          <td />
                          <td colSpan={3} className="px-6 py-2.5 pl-12">
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {bin.bin_code}
                              </span>
                              <span>·</span>
                              <span>{bin.zone}</span>
                              <span>·</span>
                              <span>{bin.aisle}</span>
                              <span>·</span>
                              <span className="text-gray-400">
                                {bin.warehouse}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2.5 text-center">
                            <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                              {bin.qty}
                            </span>
                          </td>
                          <td />
                        </tr>
                      ))}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
