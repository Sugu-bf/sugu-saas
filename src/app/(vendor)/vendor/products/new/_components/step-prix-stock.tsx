"use client";

import { useMemo, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import {
  type ProductFormData,
  type FormUpdater,
  INPUT_CLASS,
  LABEL_CLASS,
} from "./types";

interface StepPrixStockProps {
  data: ProductFormData;
  onChange: FormUpdater;
}

/* ── Premium toggle switch ── */
function Toggle({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="group inline-flex items-center gap-2 focus-visible:outline-none"
    >
      {label && (
        <span
          className={cn(
            "text-[11px] font-bold uppercase tracking-wide transition-colors duration-200",
            checked ? "text-sugu-500" : "text-gray-400",
          )}
        >
          {checked ? "ON" : "OFF"}
        </span>
      )}
      <div
        className={cn(
          "relative h-[26px] w-[46px] rounded-full transition-all duration-300 ease-in-out",
          "shadow-inner",
          "focus-visible:ring-2 focus-visible:ring-sugu-500/30 focus-visible:ring-offset-1",
          checked
            ? "bg-gradient-to-r from-sugu-400 to-sugu-500"
            : "bg-gray-300 dark:bg-gray-600",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-in-out",
            checked && "translate-x-5",
          )}
        >
          {/* Inner dot indicator */}
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors duration-300",
              checked ? "bg-sugu-400" : "bg-gray-300 dark:bg-gray-400",
            )}
          />
        </span>
      </div>
    </button>
  );
}

export function StepPrixStock({ data, onChange }: StepPrixStockProps) {
  const priceNum = parseInt(data.price) || 0;
  const originalPriceNum = parseInt(data.originalPrice) || 0;
  const discount = useMemo(() => {
    if (originalPriceNum > priceNum && priceNum > 0) {
      return Math.round(
        ((originalPriceNum - priceNum) / originalPriceNum) * 100,
      );
    }
    return 0;
  }, [priceNum, originalPriceNum]);

  // ── Variant state for the inline "add variant" form ──
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newVariantPrice, setNewVariantPrice] = useState("");

  const addVariant = () => {
    const label = newVariantLabel.trim();
    const price = newVariantPrice.trim();
    if (!label) return;
    onChange("variantOptions", [
      ...data.variantOptions,
      { id: `v${Date.now()}`, label, price: price || "0" },
    ]);
    setNewVariantLabel("");
    setNewVariantPrice("");
  };

  const removeVariant = (id: string) => {
    onChange(
      "variantOptions",
      data.variantOptions.filter((v) => v.id !== id),
    );
  };

  // ── Bulk tier handlers ──
  const addTier = () => {
    onChange("bulkTiers", [
      ...data.bulkTiers,
      { id: `t${Date.now()}`, minQty: "", price: "" },
    ]);
  };

  const removeTier = (id: string) => {
    onChange(
      "bulkTiers",
      data.bulkTiers.filter((t) => t.id !== id),
    );
  };

  const updateTier = (id: string, field: "minQty" | "price", value: string) => {
    onChange(
      "bulkTiers",
      data.bulkTiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );
  };

  return (
    <section className="glass-card animate-slide-in-right rounded-3xl p-5 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">💰</span>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Prix &amp; Stock
          </h2>
          <p className="text-sm text-gray-400">Étape 3 sur 4</p>
        </div>
      </div>

      {/* ══════════ Tarification ══════════ */}
      <h3 className="mt-6 text-base font-bold text-gray-900 dark:text-white">
        Tarification
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>
            Prix de vente <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.price}
              onChange={(e) => onChange("price", e.target.value)}
              placeholder="0"
              className={cn(INPUT_CLASS, "pr-16 font-semibold")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
              FCFA
            </span>
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Prix barré{" "}
            <span className="font-normal text-gray-400">(ancien prix)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.originalPrice}
              onChange={(e) => onChange("originalPrice", e.target.value)}
              placeholder="0"
              className={cn(INPUT_CLASS, "pr-16")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
              FCFA
            </span>
          </div>
        </div>
      </div>

      {discount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-600 dark:bg-green-950/30 dark:text-green-400">
            Remise: -{discount}%
          </span>
          <span className="text-xs text-gray-400">
            Le client verra le prix barré sur la boutique
          </span>
        </div>
      )}

      {/* ══════════ Stock ══════════ */}
      <h3 className="mt-7 text-base font-bold text-gray-900 dark:text-white">
        Stock
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS}>
            Stock disponible <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.stock}
              onChange={(e) => onChange("stock", e.target.value)}
              placeholder="0"
              className={cn(INPUT_CLASS, "pr-16")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
              unités
            </span>
          </div>
        </div>
        <div>
          <label className={LABEL_CLASS}>
            Seuil d&apos;alerte <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={data.alertThreshold}
              onChange={(e) => onChange("alertThreshold", e.target.value)}
              placeholder="10"
              className={cn(INPUT_CLASS, "pr-16")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
              unités
            </span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Vous serez alerté quand le stock descend sous ce seuil
          </p>
        </div>
      </div>

      {/* Auto-track stock */}
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50/50 px-4 py-3 dark:bg-gray-900/30">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Suivi de stock automatique
          </p>
          <p className="text-[11px] text-gray-400">
            Décrémenter le stock automatiquement à chaque vente
          </p>
        </div>
        <Toggle
          checked={data.autoTrackStock}
          onToggle={() => onChange("autoTrackStock", !data.autoTrackStock)}
          label="toggle"
        />
      </div>

      {/* ══════════ Variantes ══════════ */}
      <div className="mt-7 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Variantes{" "}
          <span className="font-normal text-gray-400">(optionnel)</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Ce produit a des variantes
          </span>
          <Toggle
            checked={data.hasVariants}
            onToggle={() => onChange("hasVariants", !data.hasVariants)}
            label="toggle"
          />
        </div>
      </div>

      {data.hasVariants && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/30 p-4 dark:border-gray-800 dark:bg-gray-900/20">
          <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            Options de variante
          </p>

          {/* Existing variants */}
          <div className="flex flex-wrap items-start gap-3">
            {data.variantOptions.map((v) => (
              <div key={v.id} className="flex flex-col items-center gap-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-200/80 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {v.label}
                  <button
                    type="button"
                    onClick={() => removeVariant(v.id)}
                    className="text-gray-400 transition-colors hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
                <span className="text-[11px] text-gray-400">
                  {formatCurrency(parseInt(v.price) || 0)} FCFA
                </span>
              </div>
            ))}
          </div>

          {/* Add new variant inline form */}
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500">
                Nom (ex: 250g, Rouge)
              </label>
              <input
                type="text"
                value={newVariantLabel}
                onChange={(e) => setNewVariantLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariant())}
                placeholder="Ex: 500g"
                className="w-full rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />
            </div>
            <div className="w-28">
              <label className="mb-1 block text-[11px] font-medium text-gray-500">
                Prix (FCFA)
              </label>
              <input
                type="number"
                value={newVariantPrice}
                onChange={(e) => setNewVariantPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVariant())}
                placeholder="0"
                className="w-full rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={addVariant}
              disabled={!newVariantLabel.trim()}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-sugu-500 text-white transition-all hover:bg-sugu-600 disabled:opacity-40 disabled:hover:bg-sugu-500"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════ Tarifs de gros ══════════ */}
      <div className="mt-7 flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          Tarifs de gros{" "}
          <span className="font-normal text-gray-400">(optionnel)</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-gray-500 sm:inline">
            Proposer des remises par quantité
          </span>
          <Toggle
            checked={data.hasBulkPricing}
            onToggle={() => onChange("hasBulkPricing", !data.hasBulkPricing)}
            label="toggle"
          />
        </div>
      </div>

      {data.hasBulkPricing && (
        <div className="mt-3">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_36px] gap-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <span>Quantité minimum</span>
            <span>Prix unitaire (FCFA)</span>
            <span />
          </div>
          {/* Rows */}
          <div className="mt-2 space-y-2">
            {data.bulkTiers.map((tier) => (
              <div key={tier.id} className="grid grid-cols-[1fr_1fr_36px] items-center gap-3">
                <input
                  type="number"
                  value={tier.minQty}
                  onChange={(e) => updateTier(tier.id, "minQty", e.target.value)}
                  placeholder="Qté min"
                  className="rounded-xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300"
                />
                <input
                  type="number"
                  value={tier.price}
                  onChange={(e) => updateTier(tier.id, "price", e.target.value)}
                  placeholder="Prix unitaire"
                  className="rounded-xl border border-gray-200/60 bg-white px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300"
                />
                <button
                  type="button"
                  onClick={() => removeTier(tier.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                  title="Supprimer ce palier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTier}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un palier
          </button>
        </div>
      )}
    </section>
  );
}
