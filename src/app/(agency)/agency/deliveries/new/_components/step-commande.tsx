"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Store, Package, Search, ChevronDown, CheckCircle2 } from "lucide-react";
import {
  type DeliveryFormData,
  type FormUpdater,
  INPUT_CLASS,
  LABEL_CLASS,
  MOCK_VENDORS,
} from "./types";

interface StepCommandeProps {
  data: DeliveryFormData;
  onChange: FormUpdater;
}

export function StepCommande({ data, onChange }: StepCommandeProps) {
  const [vendorSearch, setVendorSearch] = useState(data.vendorName);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter vendors
  const filteredVendors = useMemo(() => {
    if (!vendorSearch.trim()) return MOCK_VENDORS;
    const q = vendorSearch.toLowerCase();
    return MOCK_VENDORS.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q),
    );
  }, [vendorSearch]);

  return (
    <div className="glass-card rounded-2xl p-5 lg:p-6">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Package className="h-6 w-6 text-gray-400" />
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

        {/* ── Vendeur / Boutique ── */}
        <div className="relative" ref={dropdownRef}>
          <label className={LABEL_CLASS}>
            Vendeur / Boutique <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className={`${INPUT_CLASS} pl-10 pr-10`}
              placeholder="Nom de la boutique ou du vendeur"
              value={vendorSearch}
              onChange={(e) => {
                setVendorSearch(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
            />
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Dropdown */}
          {showDropdown && filteredVendors.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200/80 bg-white/95 shadow-lg backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95">
              {filteredVendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  onClick={() => {
                    setVendorSearch(vendor.name);
                    onChange("vendorName", vendor.name);
                    onChange("vendorId", vendor.id);
                    onChange("pickupAddress", vendor.address);
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-sugu-50/60 dark:hover:bg-gray-800"
                >
                  <Store className="h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {vendor.name}
                    </p>
                    <p className="text-xs text-gray-500">{vendor.address}</p>
                  </div>
                </button>
              ))}
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
