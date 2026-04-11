"use client";

import { useMemo, useState, useCallback } from "react";
import { Plus, X, Trash2, Banknote, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ProductFormData,
  type FormUpdater,
  type VariantAxis,
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
            ? "bg-sugu-500"
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

/* ── Variant helpers (pure functions) ── */

function cartesian(axes: VariantAxis[]): Record<string, string>[] {
  const filtered = axes.filter((a) => a.values.length > 0);
  if (filtered.length === 0) return [];
  return filtered.reduce<Record<string, string>[]>((acc, axis) => {
    if (acc.length === 0) return axis.values.map((v) => ({ [axis.name]: v.value }));
    const result: Record<string, string>[] = [];
    for (const prev of acc) {
      for (const val of axis.values) {
        result.push({ ...prev, [axis.name]: val.value });
      }
    }
    return result;
  }, []);
}

function variantKey(combo: Record<string, string>): string {
  return Object.entries(combo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
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

  // ── Variant axis/value management ──
  const [newAxisName, setNewAxisName] = useState("");
  const [newValueByAxis, setNewValueByAxis] = useState<Record<string, string>>({});

  const regenerateVariants = useCallback(
    (axes: VariantAxis[]) => {
      const combos = cartesian(axes);
      const existing = new Map(
        (data.generatedVariants ?? []).map((v) => [variantKey(v.combination), v]),
      );
      const variants = combos.map((combo, i) => {
        const key = variantKey(combo);
        const prev = existing.get(key);
        return (
          prev ?? {
            id: `gv-${Date.now()}-${i}`,
            combination: combo,
            price: data.price || "0",
            stock: "0",
            sku: "",
          }
        );
      });
      onChange("generatedVariants", variants);
    },
    [data.generatedVariants, data.price, onChange],
  );

  const addAxis = () => {
    const name = newAxisName.trim();
    if (!name || (data.variantAxes ?? []).some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    const newAxes = [...(data.variantAxes ?? []), { id: `ax-${Date.now()}`, name, values: [] }];
    onChange("variantAxes", newAxes);
    setNewAxisName("");
  };

  const removeAxis = (axisId: string) => {
    const newAxes = (data.variantAxes ?? []).filter((a) => a.id !== axisId);
    onChange("variantAxes", newAxes);
    regenerateVariants(newAxes);
  };

  const addValue = (axisId: string) => {
    const val = (newValueByAxis[axisId] || "").trim();
    if (!val) return;
    const newAxes = (data.variantAxes ?? []).map((a) => {
      if (a.id !== axisId) return a;
      if (a.values.some((v) => v.value.toLowerCase() === val.toLowerCase())) return a;
      return { ...a, values: [...a.values, { id: `val-${Date.now()}`, value: val }] };
    });
    onChange("variantAxes", newAxes);
    regenerateVariants(newAxes);
    setNewValueByAxis((prev) => ({ ...prev, [axisId]: "" }));
  };

  const removeValue = (axisId: string, valueId: string) => {
    const newAxes = (data.variantAxes ?? []).map((a) => {
      if (a.id !== axisId) return a;
      return { ...a, values: a.values.filter((v) => v.id !== valueId) };
    });
    onChange("variantAxes", newAxes);
    regenerateVariants(newAxes);
  };

  const updateVariantField = (variantId: string, field: "price" | "stock" | "sku", value: string) => {
    onChange(
      "generatedVariants",
      (data.generatedVariants ?? []).map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    );
  };

  const applyPriceToAll = () => {
    onChange(
      "generatedVariants",
      (data.generatedVariants ?? []).map((v) => ({ ...v, price: data.price || "0" })),
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
        <Banknote className="h-6 w-6 text-gray-400" />
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
        <div className="mt-3 space-y-4">
          {/* ── Existing axes ── */}
          {(data.variantAxes ?? []).map((axis) => (
            <div
              key={axis.id}
              className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 dark:border-gray-800 dark:bg-gray-900/20"
            >
              {/* Axis header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-sugu-400" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {axis.name}
                  </span>
                  <span className="rounded-full bg-gray-200/80 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {axis.values.length} valeur{axis.values.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAxis(axis.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                  title="Supprimer cet axe"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Value tags */}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {axis.values.map((val) => (
                  <span
                    key={val.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sugu-50 px-3 py-1 text-sm font-medium text-sugu-700 dark:bg-sugu-950/30 dark:text-sugu-300"
                  >
                    {val.value}
                    <button
                      type="button"
                      onClick={() => removeValue(axis.id, val.id)}
                      className="text-sugu-400 transition-colors hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add value input */}
              <div className="mt-2.5 flex gap-2">
                <input
                  type="text"
                  value={newValueByAxis[axis.id] || ""}
                  onChange={(e) =>
                    setNewValueByAxis((prev) => ({ ...prev, [axis.id]: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addValue(axis.id))
                  }
                  placeholder={`Ajouter une valeur (ex: ${
                    axis.name.toLowerCase().includes("couleur")
                      ? "Rouge, Bleu, Vert"
                      : axis.name.toLowerCase().includes("taille")
                        ? "S, M, L, XL"
                        : "valeur"
                  })`}
                  className="flex-1 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => addValue(axis.id)}
                  disabled={!(newValueByAxis[axis.id] || "").trim()}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg bg-sugu-500 text-white transition-all hover:bg-sugu-600 disabled:opacity-40 disabled:hover:bg-sugu-500"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          {/* ── Add new axis ── */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-medium text-gray-500">
                Ajouter un axe de variation
              </label>
              <input
                type="text"
                value={newAxisName}
                onChange={(e) => setNewAxisName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAxis())}
                placeholder="Ex: Couleur, Taille, Poids, Matière"
                className="w-full rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-sugu-400 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700/50 dark:bg-gray-900/50 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={addAxis}
              disabled={!newAxisName.trim()}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {/* ── Generated variants table ── */}
          {(data.generatedVariants ?? []).length > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {data.generatedVariants.length} variante
                  {data.generatedVariants.length !== 1 ? "s" : ""} générée
                  {data.generatedVariants.length !== 1 ? "s" : ""}
                </p>
                <button
                  type="button"
                  onClick={applyPriceToAll}
                  className="text-xs font-medium text-sugu-500 transition-colors hover:text-sugu-600"
                >
                  Appliquer prix par défaut à toutes
                </button>
              </div>

              {/* Table header */}
              <div className="mt-3 grid grid-cols-[1fr_100px_80px_100px] gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <span>Combinaison</span>
                <span>Prix (FCFA)</span>
                <span>Stock</span>
                <span>SKU</span>
              </div>

              {/* Table rows */}
              <div className="mt-1.5 max-h-[280px] space-y-1.5 overflow-y-auto">
                {data.generatedVariants.map((v) => (
                  <div
                    key={v.id}
                    className="grid grid-cols-[1fr_100px_80px_100px] items-center gap-2"
                  >
                    <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                      {Object.values(v.combination).join(" / ")}
                    </span>
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) => updateVariantField(v.id, "price", e.target.value)}
                      className="rounded-lg border border-gray-200/60 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-700 focus:border-sugu-400 focus:outline-none dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300"
                    />
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => updateVariantField(v.id, "stock", e.target.value)}
                      className="rounded-lg border border-gray-200/60 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-700 focus:border-sugu-400 focus:outline-none dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300"
                    />
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => updateVariantField(v.id, "sku", e.target.value)}
                      placeholder="Auto"
                      className="rounded-lg border border-gray-200/60 bg-gray-50/50 px-2 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-sugu-400 focus:outline-none dark:border-gray-700/40 dark:bg-gray-900/20 dark:text-gray-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
