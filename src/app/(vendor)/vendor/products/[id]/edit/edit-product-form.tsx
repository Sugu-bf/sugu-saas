"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronRight,
  ChevronLeft,
  Save,
  Loader2,
  X,
  Upload,
  Trash2,
  Plus,
  Minus,
  PackageOpen,
} from "lucide-react";
import { toast } from "sonner";

import {
  useUpdateProduct,
  useProductCategories,
  useVendorProductDetail,
} from "@/features/vendor/hooks";
import { StepIndicator } from "../../new/_components/step-indicator";
import { StepInformations } from "../../new/_components/step-informations";
import { StepPrixStock } from "../../new/_components/step-prix-stock";
import { StepRecapitulatif } from "../../new/_components/step-recapitulatif";
import {
  type ProductFormData,
  type FormUpdater,
  STEPS,
} from "../../new/_components/types";
import { LABEL_CLASS } from "../../new/_components/types";

// ── Types ──────────────────────────────────────────────────

interface ExistingPhoto {
  id: string | number;
  url: string;
  alt: string;
  isPrimary: boolean;
  markedForRemoval?: boolean;
}

interface NewPhotoPreview {
  id: string;
  file: File;
  previewUrl: string;
}

// ── Helper: derive weight value + unit from raw string ──────
function parseWeightString(raw: string): { value: string; unit: string } {
  if (!raw || raw === "—") return { value: "", unit: "Gramme" };
  const match = raw.match(/^([\d.]+)\s*(g|kg)$/i);
  if (!match) return { value: "", unit: "Gramme" };
  const [, val, unit] = match;
  return {
    value: val,
    unit: unit.toLowerCase() === "kg" ? "Kilogramme" : "Gramme",
  };
}

// ── Helper: reconstruct variantAxes/generatedVariants from API variants ──
function reconstructVariants(product: Record<string, unknown>): {
  hasVariants: boolean;
  variantAxes: Array<{ id: string; name: string; values: Array<{ id: string; value: string }> }>;
  generatedVariants: Array<{ id: string; combination: Record<string, string>; price: string; stock: string; sku: string }>;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawVariants: any[] = (product as any).variantsSummary?.weight ?? [];
  // Try to get raw API variants through the detail response
  // The detail transformer puts variants in variantsSummary.weight with {label, price, isActive}
  // But we need the original backend data. Let's check for _rawVariants or use variantsSummary.
  // For now, reconstruct from the product detail's variantsSummary.
  
  // Filter out default "Standard" / "Default" variants
  const meaningfulVariants = rawVariants.filter(
    (v: { label: string }) => v.label !== "Default" && v.label !== "Standard",
  );
  
  if (meaningfulVariants.length === 0) {
    return { hasVariants: false, variantAxes: [], generatedVariants: [] };
  }

  // Try to parse structured option data if variant labels contain " / " separators (e.g. "Rouge / L")
  // This is a best-effort reconstruction since the detail API flattens the data
  const axesMap = new Map<string, Set<string>>();
  const generatedVariants: Array<{ id: string; combination: Record<string, string>; price: string; stock: string; sku: string }> = [];

  meaningfulVariants.forEach((v: { label: string; price: number }, i: number) => {
    const parts = v.label.split(" / ").map((p: string) => p.trim());
    const combination: Record<string, string> = {};
    
    // Assign generic axis names if we can't determine them
    parts.forEach((part: string, idx: number) => {
      const axisName = `Option ${idx + 1}`;
      combination[axisName] = part;
      if (!axesMap.has(axisName)) axesMap.set(axisName, new Set());
      axesMap.get(axisName)!.add(part);
    });

    generatedVariants.push({
      id: `gv-loaded-${i}`,
      combination,
      price: String(v.price ?? 0),
      stock: "0",
      sku: "",
    });
  });

  const variantAxes = Array.from(axesMap.entries()).map(([name, values], i) => ({
    id: `ax-loaded-${i}`,
    name,
    values: Array.from(values).map((val, j) => ({ id: `val-loaded-${i}-${j}`, value: val })),
  }));

  return { hasVariants: true, variantAxes, generatedVariants };
}

// ── Helper: price display → form string (handle cents) ─────
function priceToFormString(price: number | undefined): string {
  if (!price) return "";
  // Backend returns cents sometimes — heuristic: if > 100000 it's likely cents
  // But our service already normalises, so pass through as is
  return String(price);
}

// ══════════════════════════════════════════════════════════════
// Photos step for edit (different from create: shows existing)
// ══════════════════════════════════════════════════════════════

interface EditStepPhotosProps {
  existingPhotos: ExistingPhoto[];
  newPhotos: NewPhotoPreview[];
  onToggleRemove: (id: string | number) => void;
  onAddPhotos: (files: File[]) => void;
  onRemoveNew: (id: string) => void;
}

function EditStepPhotos({
  existingPhotos,
  newPhotos,
  onToggleRemove,
  onAddPhotos,
  onRemoveNew,
}: EditStepPhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onAddPhotos(files);
    e.target.value = "";
  };

  return (
    <section className="glass-card animate-slide-in-right rounded-3xl p-5 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <PackageOpen className="h-6 w-6 text-gray-400" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Photos du produit
          </h2>
          <p className="text-sm text-gray-400">Étape 2 sur 4</p>
        </div>
      </div>

      {/* Existing photos */}
      {existingPhotos.length > 0 && (
        <div>
          <p className={LABEL_CLASS}>Photos actuelles</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {existingPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`relative overflow-hidden rounded-xl border-2 transition-all ${
                  photo.markedForRemoval
                    ? "border-red-400/70 opacity-40"
                    : "border-gray-200/60 dark:border-gray-700/50"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  width={160}
                  height={160}
                  className="aspect-square w-full object-cover"
                  unoptimized
                />
                {photo.isPrimary && !photo.markedForRemoval && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-sugu-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    Principale
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onToggleRemove(photo.id)}
                  className={`absolute right-1.5 top-1.5 rounded-full p-1 text-white shadow transition-colors ${
                    photo.markedForRemoval
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-red-500 hover:bg-red-600"
                  }`}
                  title={photo.markedForRemoval ? "Restaurer" : "Supprimer"}
                >
                  {photo.markedForRemoval ? (
                    <Plus className="h-3 w-3" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
          {existingPhotos.some((p) => p.markedForRemoval) && (
            <p className="mt-2 text-xs text-red-400">
              Les photos grisées seront supprimées à la sauvegarde.
            </p>
          )}
        </div>
      )}

      {/* New photos preview */}
      {newPhotos.length > 0 && (
        <div>
          <p className={LABEL_CLASS}>Nouvelles photos à ajouter</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {newPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border-2 border-sugu-300/60"
              >
                <Image
                  src={photo.previewUrl}
                  alt="Nouveau"
                  width={160}
                  height={160}
                  className="aspect-square w-full object-cover"
                  unoptimized
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-sugu-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  Nouveau
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveNew(photo.id)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200/80 bg-gray-50/30 px-6 py-8 text-sm font-medium text-gray-500 transition-all hover:border-sugu-400 hover:bg-sugu-50/20 hover:text-sugu-500 dark:border-gray-700/50 dark:bg-gray-900/20 dark:hover:border-sugu-500"
        >
          <Upload className="h-5 w-5" />
          Ajouter des photos
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="mt-2 text-center text-xs text-gray-400">
          JPEG, PNG, WebP — max 10 Mo par image
        </p>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Edit Form
// ══════════════════════════════════════════════════════════════

interface EditProductFormProps {
  id: string;
}

export function EditProductForm({ id }: EditProductFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // ── Form data state ──
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    mainCategory: "",
    subCategory: "",
    tags: [],
    origin: "Mali",
    weightValue: "",
    weightUnit: "Gramme",
    price: "",
    originalPrice: "",
    stock: "",
    alertThreshold: "10",
    autoTrackStock: true,
    hasVariants: false,
    variantAxes: [],
    generatedVariants: [],
    hasBulkPricing: false,
    bulkTiers: [],
    publishMode: "publish",
    photos: [],
  });

  // ── Photo state ──
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhotoPreview[]>([]);
  const [initialized, setInitialized] = useState(false);

  // ── Hooks ──
  const { data: product, isLoading, isError } = useVendorProductDetail(id);
  const { data: categories } = useProductCategories();
  const updateProduct = useUpdateProduct();

  // ── Pre-populate form from fetched product ──
  useEffect(() => {
    if (!product || initialized) return;

    const { value: wVal, unit: wUnit } = parseWeightString(product.weight ?? "");

    // Detect category from product.category string
    const mainCategory =
      categories?.find(
        (c) => c.name.toLowerCase() === (product.category ?? "").toLowerCase(),
      )?.name ?? product.category ?? "";

    // Reconstruct bulk pricing tiers from volumeDiscounts
    const bulkTiers =
      product.volumeDiscounts?.length > 0
        ? product.volumeDiscounts.map((vd, i) => ({
            id: `tier-${i}`,
            minQty: String(vd.minQty),
            price: String(vd.price),
          }))
        : [];

    // Decide publishMode from status
    const publishMode: "publish" | "draft" =
      product.status === "active" || product.status === "out_of_stock"
        ? "publish"
        : "draft";

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData((prev) => ({
      ...prev,
      name: product.name ?? "",
      description: product.description ?? "",
      mainCategory,
      subCategory: "",
      tags: product.tags ?? [],
      weightValue: wVal,
      weightUnit: wUnit,
      price: priceToFormString(product.price),
      originalPrice: priceToFormString(product.originalPrice),
      stock: product.kpis?.stock?.value != null ? String(product.kpis.stock.value) : "",
      hasBulkPricing: bulkTiers.length > 0,
      bulkTiers,
      publishMode,
      ...reconstructVariants(product),
    }));

    // Load existing photos
    if (product.photos?.length > 0) {
      setExistingPhotos(
        product.photos.map((p: { id: string; url: string; alt: string; isPrimary: boolean }) => ({
          id: p.id,
          url: p.url,
          alt: p.alt,
          isPrimary: p.isPrimary,
          markedForRemoval: false,
        })),
      );
    }

    setInitialized(true);
  }, [product, categories, initialized]);

  // ── Handlers ──
  const handleChange: FormUpdater = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const toggleRemoveExisting = useCallback((photoId: string | number) => {
    setExistingPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, markedForRemoval: !p.markedForRemoval } : p,
      ),
    );
  }, []);

  const addNewPhotos = useCallback((files: File[]) => {
    const previews: NewPhotoPreview[] = files.map((file) => ({
      id: `new-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setNewPhotos((prev) => [...prev, ...previews]);
  }, []);

  const removeNewPhoto = useCallback((photoId: string) => {
    setNewPhotos((prev) => {
      const found = prev.find((p) => p.id === photoId);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
  }, []);

  // ── Resolve category ID ──
  const resolveCategoryId = useCallback((): string | undefined => {
    if (!categories || !formData.mainCategory) return undefined;
    const match = categories.find(
      (cat) => cat.name.toLowerCase() === formData.mainCategory.toLowerCase(),
    );
    if (match) return match.id;
    if (formData.subCategory) {
      const subMatch = categories.find(
        (cat) => cat.name.toLowerCase() === formData.subCategory.toLowerCase(),
      );
      if (subMatch) return subMatch.id;
    }
    return undefined;
  }, [categories, formData.mainCategory, formData.subCategory]);

  // ── Validation ──
  const validateForm = useCallback((): string | null => {
    if (!formData.name.trim()) return "Le nom du produit est obligatoire.";
    if (!formData.price || parseFloat(formData.price) <= 0)
      return "Le prix de vente est obligatoire.";
    return null;
  }, [formData.name, formData.price]);

  // ── Submit ──
  const handleSubmit = useCallback(
    (mode: "publish" | "draft") => {
      const error = validateForm();
      if (error) {
        toast.error(error);
        return;
      }

      const categoryId = resolveCategoryId();
      const removeMediaIds = existingPhotos
        .filter((p) => p.markedForRemoval)
        .map((p) => p.id);
      const newImageFiles = newPhotos.map((p) => p.file);

      updateProduct.mutate(
        {
          id,
          formData: { ...formData, publishMode: mode },
          categoryId,
          newImages: newImageFiles.length > 0 ? newImageFiles : undefined,
          removeMediaIds: removeMediaIds.length > 0 ? removeMediaIds : undefined,
        },
        {
          onSuccess: () => {
            // Revoke new photo object URLs
            newPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
            toast.success(
              mode === "publish"
                ? "Produit mis à jour et publié !"
                : "Produit sauvegardé comme brouillon.",
            );
          },
          onError: (err) => {
            toast.error(
              err instanceof Error
                ? err.message
                : "Erreur lors de la mise à jour du produit.",
            );
          },
        },
      );
    },
    [formData, validateForm, resolveCategoryId, existingPhotos, newPhotos, updateProduct, id],
  );

  const isSubmitting = updateProduct.isPending;

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 animate-pulse">
        <div className="h-4 w-48 rounded bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="h-10 w-full rounded-2xl bg-gray-200/50 dark:bg-gray-700/50" />
        <div className="glass-card rounded-3xl p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-gray-200/40 dark:bg-gray-700/40" />
          ))}
        </div>
        <span className="sr-only">Chargement du produit…</span>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="text-5xl">😕</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Produit introuvable
        </h2>
        <p className="text-sm text-gray-400">
          Impossible de charger ce produit. Il a peut-être été supprimé.
        </p>
        <Link
          href="/vendor/products"
          className="rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sugu-600"
        >
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ════════════ Breadcrumb ════════════ */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="breadcrumb">
        <Link
          href="/vendor/products"
          className="font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          Produits
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <Link
          href={`/vendor/products/${id}`}
          className="max-w-[200px] truncate font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          {product.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-white">
          Modifier
        </span>
      </nav>

      {/* ════════════ Page header ════════════ */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sugu-100 text-xl dark:bg-sugu-950/40">
          ✏️
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            Modifier le produit
          </h1>
          <p className="text-sm text-gray-400">
            Les modifications seront soumises à modération avant publication.
          </p>
        </div>
      </div>

      {/* ════════════ Stepper ════════════ */}
      <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

      {/* ════════════ Step Content ════════════ */}
      <div className="min-h-[420px]">
        {currentStep === 1 && (
          <StepInformations data={formData} onChange={handleChange} />
        )}

        {currentStep === 2 && initialized && (
          <EditStepPhotos
            existingPhotos={existingPhotos}
            newPhotos={newPhotos}
            onToggleRemove={toggleRemoveExisting}
            onAddPhotos={addNewPhotos}
            onRemoveNew={removeNewPhoto}
          />
        )}

        {currentStep === 3 && (
          <StepPrixStock data={formData} onChange={handleChange} />
        )}

        {currentStep === 4 && (
          <StepRecapitulatif
            data={formData}
            onChange={handleChange}
            onGoToStep={goToStep}
          />
        )}
      </div>

      {/* ════════════ Navigation Buttons ════════════ */}
      <div className="flex items-center justify-between pt-2 pb-4">
        {/* Left button */}
        {currentStep === 1 ? (
          <Link
            href={`/vendor/products/${id}`}
            className="rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-white"
          >
            Annuler
          </Link>
        ) : (
          <button
            type="button"
            onClick={goPrev}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
        )}

        {/* Right button(s) */}
        <div className="flex items-center gap-2">
          {currentStep === STEPS.length && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("draft")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/60 px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-400"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
              Sauvegarder brouillon
            </button>
          )}

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5"
            >
              Continuer
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("publish")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Sauvegarder les modifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
