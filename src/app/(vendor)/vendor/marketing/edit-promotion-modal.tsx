"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { X, Pencil, Percent, DollarSign, Loader2, Calendar, Package } from "lucide-react";
import type { PromotedProduct } from "@/features/vendor/schema";
import type { UpdatePromotionRequest } from "@/features/vendor/service";

interface EditPromotionModalProps {
  open: boolean;
  product: PromotedProduct | null;
  onClose: () => void;
  onSubmit: (data: UpdatePromotionRequest) => void;
  isPending: boolean;
}

export function EditPromotionModal({
  open,
  product,
  onClose,
  onSubmit,
  isPending,
}: EditPromotionModalProps) {
  const [discountType, setDiscountType] = useState<"percent_off" | "amount_off">("percent_off");
  const [discountValue, setDiscountValue] = useState("");
  const [endsAt, setEndsAt] = useState("");

  // Sync form with product when opened
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (product && open) {
      // Guess type from the product data
      if (product.discountPercent > 0 && product.discountPercent <= 100) {
        setDiscountType("percent_off");
        setDiscountValue(String(product.discountPercent));
      } else {
        setDiscountType("amount_off");
        setDiscountValue(String(product.originalPrice - product.promoPrice));
      }
      setEndsAt("");
    }
  }, [product, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!open || !product) return null;

  const handleSubmit = () => {
    const value = parseFloat(discountValue);
    if (!value || value <= 0) return;

    // Validate: discount cannot exceed product price
    if (discountType === "percent_off" && value > 100) return;
    if (discountType === "amount_off" && product && value > product.originalPrice) return;

    const data: UpdatePromotionRequest = {
      discount_type: discountType,
      discount_value: discountType === "amount_off" ? value * 100 : value, // amount_off in centimes
    };
    if (endsAt) data.ends_at = endsAt;

    onSubmit(data);
  };

  const numValue = parseFloat(discountValue) || 0;
  const isValid = numValue > 0
    && (discountType !== "percent_off" || numValue <= 100)
    && (discountType !== "amount_off" || !product || numValue <= product.originalPrice);

  const errorMessage = discountType === "percent_off" && numValue > 100
    ? "Le pourcentage ne peut pas dépasser 100%"
    : discountType === "amount_off" && product && numValue > product.originalPrice
      ? `La réduction ne peut pas dépasser ${product.originalPrice.toLocaleString("fr-FR")} FCFA`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-scale-in rounded-3xl border border-white/20 bg-white p-6 shadow-2xl dark:border-gray-700/50 dark:bg-gray-900">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Pencil className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Modifier la promotion
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {product.name}
            </p>
          </div>
        </div>

        {/* Current info */}
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/30">
          {product.image ? (
            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-white dark:bg-gray-800">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400">
              <Package className="h-4 w-4 text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
              {product.name}
            </p>
            <p className="text-xs text-gray-500">
              Prix: <strong>{product.originalPrice.toLocaleString("fr-FR")} FCFA</strong>
              {" → "}
              <strong className="text-sugu-600">{product.promoPrice.toLocaleString("fr-FR")} FCFA</strong>
              {" "}
              <span className="text-sugu-500">(-{product.discountPercent}%)</span>
            </p>
          </div>
        </div>

        {/* Discount Type */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Type de remise
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDiscountType("percent_off")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                discountType === "percent_off"
                  ? "border-sugu-300 bg-sugu-50 text-sugu-700 dark:border-sugu-700 dark:bg-sugu-950/30 dark:text-sugu-400"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
              )}
            >
              <Percent className="h-3.5 w-3.5" />
              Pourcentage
            </button>
            <button
              type="button"
              onClick={() => setDiscountType("amount_off")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all",
                discountType === "amount_off"
                  ? "border-sugu-300 bg-sugu-50 text-sugu-700 dark:border-sugu-700 dark:bg-sugu-950/30 dark:text-sugu-400"
                  : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
              )}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Montant fixe
            </button>
          </div>
        </div>

        {/* Discount Value */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Valeur de la remise
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={discountType === "percent_off" ? 100 : product?.originalPrice}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent_off" ? "Ex: 20" : "Ex: 5000"}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-16 text-sm text-gray-900 placeholder:text-gray-400 focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
              {discountType === "percent_off" ? "%" : "FCFA"}
            </span>
          </div>
          {errorMessage && (
            <p className="mt-1 text-[11px] text-red-500">{errorMessage}</p>
          )}
        </div>

        {/* End Date */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            <Calendar className="mr-1 inline h-3 w-3" />
            Date de fin (optionnel)
          </label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-sugu-300 focus:outline-none focus:ring-2 focus:ring-sugu-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Laissez vide pour garder la date actuelle
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !isValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sugu-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Modification…
              </>
            ) : (
              <>
                <Pencil className="h-4 w-4" />
                Modifier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
