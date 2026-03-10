"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { X, Flame, Percent, DollarSign, Loader2, Search, Package } from "lucide-react";
import type { CreatePromotionRequest } from "@/features/vendor/service";
import type { ProductSearchResult } from "@/features/vendor/schema";
import { useAllVendorProducts } from "@/features/vendor/hooks";

// ────────────────────────────────────────────────────────────
// Create Product Promotion Modal
// ────────────────────────────────────────────────────────────

interface CreatePromotionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePromotionRequest) => void;
  isPending?: boolean;
}

type DiscountType = "percent_off" | "amount_off";

/**
 * Normalize a string for fuzzy matching: lowercase, remove accents, trim.
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function CreatePromotionModal({ open, onClose, onSubmit, isPending }: CreatePromotionModalProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent_off");
  const [discountValue, setDiscountValue] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load ALL vendor products at once — cached for 5 min
  const { data: allProducts, isLoading: isLoadingProducts } = useAllVendorProducts();

  // Client-side fuzzy filter
  const filteredProducts = useMemo(() => {
    if (!allProducts) return [];
    if (!searchQuery.trim()) return allProducts.slice(0, 20); // Show first 20 when empty

    const query = normalize(searchQuery);
    const words = query.split(/\s+/).filter(Boolean);

    return allProducts
      .filter((p) => {
        const name = normalize(p.name);
        const sku = normalize(p.sku || "");
        // Every word must match in name OR sku
        return words.every((w) => name.includes(w) || sku.includes(w));
      })
      .slice(0, 20); // Limit results
  }, [allProducts, searchQuery]);

  const resetForm = useCallback(() => {
    setSelectedProduct(null);
    setSearchQuery("");
    setDiscountType("percent_off");
    setDiscountValue("");
    setEndsAt("");
    setErrors({});
    setShowDropdown(false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedProduct) newErrors.product = "Sélectionnez un produit";

    const numValue = Number(discountValue);
    if (!discountValue || numValue <= 0) {
      newErrors.discountValue = "La valeur doit être supérieure à 0";
    } else if (discountType === "percent_off" && numValue > 100) {
      newErrors.discountValue = "Le pourcentage ne peut pas dépasser 100%";
    } else if (discountType === "amount_off" && selectedProduct && numValue > selectedProduct.price) {
      newErrors.discountValue = `La réduction ne peut pas dépasser le prix du produit (${selectedProduct.price.toLocaleString("fr-FR")} FCFA)`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !selectedProduct) return;

    const data: CreatePromotionRequest = {
      product_id: selectedProduct.id,
      discount_type: discountType,
      discount_value: discountType === "percent_off"
        ? Number(discountValue)
        : Number(discountValue) * 100, // Convert FCFA → centimes for amount_off
      ends_at: endsAt || undefined,
    };

    onSubmit(data);
  };

  const handleSelectProduct = (product: ProductSearchResult) => {
    setSelectedProduct(product);
    setSearchQuery(product.name);
    setShowDropdown(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-lg animate-scale-in rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Promouvoir un produit
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Appliquez une remise sur un produit de votre boutique
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Search */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Produit à promouvoir *
            </label>

            {selectedProduct ? (
              <div className="flex items-center gap-3 rounded-xl border border-sugu-200 bg-sugu-50/40 p-3 dark:border-sugu-900/40 dark:bg-sugu-950/20">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Package className="h-5 w-5 text-gray-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProduct.price ? `${selectedProduct.price.toLocaleString()} FCFA` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setSearchQuery("");
                  }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Rechercher un produit…"
                    className={cn(
                      "w-full rounded-xl border bg-white/50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sugu-500 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-600",
                      errors.product ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700",
                    )}
                  />
                  {isLoadingProducts && (
                    <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>

                {/* Dropdown — client-side filtered */}
                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    {isLoadingProducts ? (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                        Chargement des produits…
                      </div>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="h-full w-full object-contain" />
                            ) : (
                              <Package className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {product.price ? `${product.price.toLocaleString()} FCFA` : ""}
                              {product.stock !== undefined && (
                                <span className="ml-2">• Stock: {product.stock}</span>
                              )}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-gray-400">
                        Aucun produit trouvé pour &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {errors.product && (
              <p className="mt-1 text-[11px] text-red-500">{errors.product}</p>
            )}
          </div>

          {/* Discount Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Type de réduction *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "percent_off" as const, label: "Pourcentage", icon: <Percent className="h-5 w-5" />, desc: "Ex: -25%" },
                { value: "amount_off" as const, label: "Montant fixe", icon: <DollarSign className="h-5 w-5" />, desc: "Ex: -1 500 FCFA" },
              ]).map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => setDiscountType(dt.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                    discountType === dt.value
                      ? "border-amber-500 bg-amber-50/60 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
                      : "border-gray-100 bg-white text-gray-400 hover:border-gray-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700",
                  )}
                >
                  {dt.icon}
                  <div>
                    <span className="block text-sm font-semibold">{dt.label}</span>
                    <span className="block text-[11px] opacity-60">{dt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Valeur de la réduction *
            </label>
            <div className="relative">
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percent_off" ? "25" : "1500"}
                min="1"
                max={discountType === "percent_off" ? "100" : selectedProduct ? String(selectedProduct.price) : undefined}
                className={cn(
                  "w-full rounded-xl border bg-white/50 px-3.5 py-2.5 pr-16 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800/50 dark:text-white dark:placeholder:text-gray-600",
                  errors.discountValue ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-700",
                )}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                {discountType === "percent_off" ? "%" : "FCFA"}
              </span>
            </div>
            {errors.discountValue && (
              <p className="mt-1 text-[11px] text-red-500">{errors.discountValue}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Date de fin (optionnel)
            </label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-gray-200 bg-white/50 px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création…
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4" />
                  Promouvoir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
