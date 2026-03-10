"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateProduct, useProductCategories } from "@/features/vendor/hooks";
import { type ProductFormData, type FormUpdater, STEPS, DEFAULT_FORM_DATA } from "./_components/types";
import { StepIndicator } from "./_components/step-indicator";
import { StepInformations } from "./_components/step-informations";
import { StepPhotos } from "./_components/step-photos";
import { StepPrixStock } from "./_components/step-prix-stock";
import { StepRecapitulatif } from "./_components/step-recapitulatif";

export function CreateProductForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProductFormData>({
    ...DEFAULT_FORM_DATA,
    // Start with empty form for real usage
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
    variantOptions: [],
    hasBulkPricing: false,
    bulkTiers: [],
    publishMode: "publish",
    photos: [],
  });

  // ── Hooks ──
  const createProduct = useCreateProduct();
  const { data: categories } = useProductCategories();

  // Generic field updater
  const handleChange: FormUpdater = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Navigation
  const goNext = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // ── Validation ──
  const validateForm = useCallback((): string | null => {
    if (!formData.name.trim()) return "Le nom du produit est obligatoire.";
    if (!formData.price || parseFloat(formData.price) <= 0) return "Le prix de vente est obligatoire.";
    return null;
  }, [formData.name, formData.price]);

  // ── Resolve category ID from label ──
  const resolveCategoryId = useCallback((): string | undefined => {
    if (!categories || !formData.mainCategory) return undefined;
    // Try matching on the main category name first
    const match = categories.find(
      (cat) => cat.name.toLowerCase() === formData.mainCategory.toLowerCase(),
    );
    if (match) return match.id;
    // Try subcategory
    if (formData.subCategory) {
      const subMatch = categories.find(
        (cat) => cat.name.toLowerCase() === formData.subCategory.toLowerCase(),
      );
      if (subMatch) return subMatch.id;
    }
    return undefined;
  }, [categories, formData.mainCategory, formData.subCategory]);

  // ── Submit handler (publish or draft) ──
  const handleSubmit = useCallback(
    (mode: "publish" | "draft") => {
      const error = validateForm();
      if (error) {
        toast.error(error);
        return;
      }

      const categoryId = resolveCategoryId();
      const submissionData = {
        ...formData,
        publishMode: mode,
      };

      // Split photos: detoured (Cloudinary preview IDs) vs raw (File objects)
      const previewIds = formData.photos
        .filter((p) => p.isDetoured && p.previewUuid)
        .map((p) => p.previewUuid!);

      const rawImageFiles = formData.photos
        .filter((p) => !p.isDetoured)
        .map((p) => p.file);

      createProduct.mutate(
        {
          formData: submissionData,
          categoryId,
          images: rawImageFiles.length > 0 ? rawImageFiles : undefined,
          previewIds: previewIds.length > 0 ? previewIds : undefined,
        },
        {
          onSuccess: (data) => {
            // Revoke blob preview URLs to free memory (skip Cloudinary URLs)
            formData.photos.forEach((p) => {
              if (p.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(p.previewUrl);
              }
            });

            toast.success(
              mode === "publish"
                ? `"${data.name}" publié avec succès !`
                : `"${data.name}" sauvegardé comme brouillon.`,
            );
          },
          onError: (err) => {
            toast.error(
              err instanceof Error
                ? err.message
                : "Erreur lors de la création du produit.",
            );
          },
        },
      );
    },
    [formData, validateForm, resolveCategoryId, createProduct],
  );

  const isSubmitting = createProduct.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* ════════════ Breadcrumb ════════════ */}
      <nav
        className="flex items-center gap-1.5 text-sm"
        aria-label="breadcrumb"
      >
        <Link
          href="/vendor/products"
          className="font-medium text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          Produits
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
        <span className="font-semibold text-gray-900 dark:text-white">
          Ajouter un produit
        </span>
      </nav>

      {/* ════════════ Stepper ════════════ */}
      <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

      {/* ════════════ Step Content ════════════ */}
      <div className="min-h-[420px]">
        {currentStep === 1 && (
          <StepInformations data={formData} onChange={handleChange} />
        )}
        {currentStep === 2 && <StepPhotos data={formData} setFormData={setFormData} />}
        {currentStep === 3 && (
          <StepPrixStock data={formData} onChange={handleChange} />
        )}
        {currentStep === 4 && (
          <StepRecapitulatif data={formData} onChange={handleChange} onGoToStep={goToStep} />
        )}
      </div>

      {/* ════════════ Navigation Buttons ════════════ */}
      <div className="flex items-center justify-between pt-2 pb-4">
        {/* Left button */}
        {currentStep === 1 ? (
          <Link
            href="/vendor/products"
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
              {isSubmitting && formData.publishMode === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
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
              {isSubmitting && formData.publishMode === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Publier le produit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
