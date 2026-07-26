"use client";

import { useState, useRef, useEffect } from "react";
import { Store, Package, Search, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { useVendorsList } from "@/features/agency/hooks";
import {
  type DeliveryFormData,
  type FormUpdater,
  INPUT_CLASS,
  LABEL_CLASS,
} from "./types";

interface StepCommandeProps {
  data: DeliveryFormData;
  onChange: FormUpdater;
}

export function StepCommande({ data, onChange }: StepCommandeProps) {
  const [vendorSearch, setVendorSearch] = useState(data.vendorName);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hook: Fetch real DB vendors with search
  const { data: dbVendors = [], isLoading: isLoadingVendors } = useVendorsList(vendorSearch);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="glass-card rounded-2xl p-5 lg:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Package className="h-6 w-6 text-sugu-500" />
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Informations commande
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Renseignez les détails de la commande
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* ── Toggle: Lier à une commande SUGU ── */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            Lier à une commande existante{" "}
            <span className="text-gray-400">(optionnel)</span>
          </p>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={data.linkExistingOrder}
                onChange={(e) => onChange("linkExistingOrder", e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-sugu-500 dark:bg-gray-700 transition-colors" />
              <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Lier à une commande SUGU
            </span>
          </label>
        </div>

        {/* ── Order ID search (when linked) ── */}
        {data.linkExistingOrder && (
          <div>
            <label className={LABEL_CLASS}>Rechercher une commande</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className={`${INPUT_CLASS} pl-10`}
                placeholder="Rechercher par #ORD..."
                value={data.orderId}
                onChange={(e) => onChange("orderId", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ── Vendeur / Boutique (DB Searchable) ── */}
        <div className="relative" ref={dropdownRef}>
          <label className={LABEL_CLASS}>
            Vendeur / Boutique <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${INPUT_CLASS} pl-10 pr-10`}
              placeholder="Rechercher une boutique dans la base de données..."
              value={vendorSearch}
              onChange={(e) => {
                const val = e.target.value;
                setVendorSearch(val);
                onChange("vendorName", val);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            {isLoadingVendors ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-sugu-500" />
            ) : (
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            )}
          </div>

          {/* Dropdown with real DB Vendors */}
          {showDropdown && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
              {isLoadingVendors ? (
                <div className="flex items-center justify-center gap-2 p-4 text-xs font-semibold text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin text-sugu-500" />
                  Recherche des boutiques en cours…
                </div>
              ) : dbVendors.length === 0 ? (
                <div className="p-4 text-center text-xs italic text-gray-500">
                  {vendorSearch.trim()
                    ? "Aucune boutique trouvée"
                    : "Saisissez un nom pour rechercher une boutique"}
                </div>
              ) : (
                dbVendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => {
                      setVendorSearch(vendor.name);
                      onChange("vendorName", vendor.name);
                      onChange("vendorId", vendor.id);
                      if (vendor.address) {
                        onChange("pickupAddress", vendor.address);
                      }
                      setShowDropdown(false);
                    }}
                    className="flex w-full items-center gap-3 border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-sugu-50/60 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    {vendor.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vendor.logoUrl}
                        alt={vendor.name}
                        className="h-7 w-7 flex-shrink-0 rounded-full border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-sugu-50 text-sugu-500 dark:bg-sugu-950/30">
                        <Store className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {vendor.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {vendor.address || "Adresse non spécifiée"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Nombre d'articles + Montant ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>
              Nombre d&apos;articles <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                min="1"
                className={`${INPUT_CLASS} pl-10`}
                placeholder="3"
                value={data.itemCount}
                onChange={(e) => onChange("itemCount", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>
              Montant commande (FCFA) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                className={`${INPUT_CLASS} pr-16`}
                placeholder="44 350"
                value={data.orderAmount}
                onChange={(e) => onChange("orderAmount", e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800">
                FCFA
              </span>
            </div>
          </div>
        </div>

        {/* ── Statut paiement (pill toggle) ── */}
        <div>
          <label className={LABEL_CLASS}>Statut paiement</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange("paymentStatus", "paid")}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                data.paymentStatus === "paid"
                  ? "border-green-300 bg-green-50 text-green-700 shadow-sm"
                  : "border-gray-200 bg-white/60 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Payé
            </button>
            <button
              type="button"
              onClick={() => onChange("paymentStatus", "pending")}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                data.paymentStatus === "pending"
                  ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                  : "border-gray-200 bg-white/60 text-gray-500 hover:bg-gray-50"
              }`}
            >
              <span className="h-3 w-3 rounded-full border-2 border-current" />
              En attente
            </button>
          </div>
        </div>

        {/* ── Notes commande ── */}
        <div>
          <label className={LABEL_CLASS}>
            Notes commande{" "}
            <span className="text-gray-400">(optionnel)</span>
          </label>
          <textarea
            rows={2}
            className={INPUT_CLASS}
            placeholder="Description des articles, instructions spéciales..."
            value={data.orderNotes}
            onChange={(e) => onChange("orderNotes", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
