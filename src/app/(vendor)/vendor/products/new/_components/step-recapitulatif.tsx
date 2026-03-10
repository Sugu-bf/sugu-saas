"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Pencil, Star, CheckCircle2, Package } from "lucide-react";
import { type ProductFormData, type FormUpdater, ORIGINS } from "./types";

interface StepRecapitulatifProps {
  data: ProductFormData;
  onChange: FormUpdater;
  onGoToStep: (step: number) => void;
}

/* ── Small edit link ── */
function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600"
    >
      <Pencil className="h-3 w-3" />
      Modifier
    </button>
  );
}

/* ── Recap info row ── */
function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1">
      <span className="w-20 shrink-0 text-xs text-gray-400">{label}:</span>
      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
        {children}
      </span>
    </div>
  );
}

export function StepRecapitulatif({ data, onChange, onGoToStep }: StepRecapitulatifProps) {
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

  const originObj = ORIGINS.find((o) => o.label === data.origin);
  const bulkSummary = data.bulkTiers
    .filter((t) => parseInt(t.minQty) > 1)
    .map((t) => `${t.minQty}+ → ${formatCurrency(parseInt(t.price) || 0)} FCFA`)
    .join(", ");

  return (
    <div className="animate-slide-in-right space-y-5">
      {/* Header */}
      <div className="glass-card rounded-3xl p-5 sm:p-8">
        <div className="flex items-center justify-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Récapitulatif
            </h2>
            <p className="text-sm text-gray-400">
              Étape 4 sur 4 — Vérifiez les informations avant de publier
            </p>
          </div>
        </div>
      </div>

      {/* ── Grid of recap cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* ─ Informations ─ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Informations
            </h3>
            <EditLink onClick={() => onGoToStep(1)} />
          </div>
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            <InfoRow label="Nom">
              <span className="font-semibold">{data.name}</span>
            </InfoRow>
            <InfoRow label="Catégorie">
              {data.mainCategory} &gt; {data.subCategory}
            </InfoRow>
            <InfoRow label="Tags">
              <div className="flex flex-wrap gap-1">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </InfoRow>
            <InfoRow label="Origine">
              {data.origin} {originObj?.flag}
            </InfoRow>
            <InfoRow label="Poids">
              {data.weightValue} {data.weightUnit}
            </InfoRow>
          </div>
        </div>

        {/* ─ Photos ─ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Photos
            </h3>
            <EditLink onClick={() => onGoToStep(2)} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {data.photos.length > 0
              ? data.photos.slice(0, 3).map((photo, i) => (
                  <div
                    key={photo.id}
                    className={cn(
                      "relative flex h-20 items-center justify-center overflow-hidden rounded-xl",
                      photo.isMain
                        ? "border-2 border-sugu-400"
                        : "border border-gray-200/60 dark:border-gray-700/40",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.previewUrl}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {photo.isMain && (
                      <span className="absolute left-1 top-1 rounded bg-sugu-500 p-0.5">
                        <Star className="h-2 w-2 fill-white text-white" />
                      </span>
                    )}
                  </div>
                ))
              : [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex h-20 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/30 text-gray-400 dark:border-gray-700"
                  >
                    <span className="text-xs">Aucune</span>
                  </div>
                ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {data.photos.length > 0
              ? `${data.photos.length} photo${data.photos.length > 1 ? "s" : ""} ajoutée${data.photos.length > 1 ? "s" : ""}`
              : "Aucune photo ajoutée"}
          </p>
        </div>

        {/* ─ Prix & Stock ─ */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">
              Prix & Stock
            </h3>
            <EditLink onClick={() => onGoToStep(3)} />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-baseline gap-3">
              <div>
                <span className="text-[10px] text-gray-400">Prix:</span>
                <p className="text-base font-bold text-sugu-500">
                  {formatCurrency(priceNum)} FCFA
                </p>
              </div>
              <div>
                <span className="text-[10px] text-gray-400">Prix barré:</span>
                <p className="text-sm text-gray-400 line-through">
                  {formatCurrency(originalPriceNum)} FCFA
                </p>
              </div>
              {discount > 0 && (
                <div>
                  <span className="text-[10px] text-gray-400">Remise:</span>
                  <p>
                    <span className="rounded-md bg-sugu-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      -{discount}%
                    </span>
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
              <span>
                Stock:{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {data.stock} unités
                </span>
              </span>
              <span>
                Seuil:{" "}
                <span className="font-semibold text-gray-800 dark:text-gray-200">
                  {data.alertThreshold} unités
                </span>
              </span>
            </div>
            {data.hasVariants && (
              <p className="text-[11px] text-gray-400">
                Variantes:{" "}
                {data.variantOptions
                  .map(
                    (v) =>
                      `${v.label} (${formatCurrency(parseInt(v.price) || 0)})`,
                  )
                  .join(", ")}
              </p>
            )}
            {data.hasBulkPricing && bulkSummary && (
              <p className="text-[11px] text-gray-400">
                Tarifs de gros: {bulkSummary}
              </p>
            )}
          </div>
        </div>

        {/* ─ Aperçu marketplace ─ */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Aperçu marketplace
          </h3>
          <div className="mt-3 rounded-xl border border-gray-200/60 bg-white p-3 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/80">
            <div className="flex gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-amber-50 text-3xl dark:bg-amber-950/20">
                {data.photos.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(data.photos.find((p) => p.isMain) ?? data.photos[0]).previewUrl}
                    alt={data.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-sugu-500">
                    SUGU
                  </span>
                  <span className="rounded bg-green-100 px-1 py-0.5 text-[8px] font-bold text-green-600 dark:bg-green-950/30">
                    Nouveau
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm font-bold text-gray-900 dark:text-white">
                  {data.name}
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-sugu-500">
                    {formatCurrency(priceNum)} FCFA
                  </span>
                  {discount > 0 && (
                    <>
                      <span className="text-[10px] text-gray-400 line-through">
                        {formatCurrency(originalPriceNum)}
                      </span>
                      <span className="rounded bg-sugu-100 px-1 py-0.5 text-[8px] font-bold text-sugu-600">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─ Publication ─ */}
        <div className="glass-card rounded-2xl p-5 sm:col-span-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            Publication
          </h3>
          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
              <input
                type="radio"
                name="publishMode"
                value="publish"
                checked={data.publishMode === "publish"}
                onChange={() => onChange("publishMode", "publish")}
                className="mt-0.5 h-4 w-4 accent-sugu-500"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Publier immédiatement
                </p>
                <p className="text-[11px] text-gray-400">
                  Le produit sera visible sur la marketplace dès maintenant
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
              <input
                type="radio"
                name="publishMode"
                value="draft"
                checked={data.publishMode === "draft"}
                onChange={() => onChange("publishMode", "draft")}
                className="mt-0.5 h-4 w-4 accent-sugu-500"
              />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Sauvegarder comme brouillon
                </p>
                <p className="text-[11px] text-gray-400">
                  Vous pourrez publier plus tard
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
