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
  PackageOpen,
  Wand2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import {
  useUpdateProduct,
  useProductCategories,
  useVendorProductDetail,
  usePreviewImage,
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
  url: string;                      // display URL (original, or detoured preview once processed)
  alt: string;
  isPrimary: boolean;
  markedForRemoval?: boolean;
  // Re-detourage workflow (Approach A: refetch the stored image → preview endpoint):
  originalUrl?: string;             // kept so the user can revert the detourage
  detouredUuid?: string;            // Cloudinary preview uuid once detoured
  isProcessing?: boolean;           // true during the detourage API call
  isDetoured?: boolean;             // true if successfully detoured
  processingError?: string | null;  // error message if detourage failed
}

interface NewPhotoPreview {
  id: string;
  file: File;
  previewUrl: string;
  // Detourage workflow fields (mirrors create wizard's ProductPhoto):
  previewUuid?: string;             // UUID returned by backend after detourage
  isProcessing?: boolean;           // true during the detourage API call
  isDetoured?: boolean;             // true if successfully detoured
  processingError?: string | null;  // error message if detourage failed
}

// Map a blob mime type to a file extension for the re-uploaded preview file.
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

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
  onDetour: (id: string, file: File) => void;
  onDetourExisting: (id: string | number, url: string) => void;
  onRevertExisting: (id: string | number) => void;
  onSetPrimary: (id: string | number) => void;
}

function EditStepPhotos({
  existingPhotos,
  newPhotos,
  onToggleRemove,
  onAddPhotos,
  onRemoveNew,
  onDetour,
  onDetourExisting,
  onRevertExisting,
  onSetPrimary,
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
              <ExistingPhotoCard
                key={photo.id}
                photo={photo}
                onToggleRemove={onToggleRemove}
                onDetour={onDetourExisting}
                onRevert={onRevertExisting}
                onSetPrimary={onSetPrimary}
              />
            ))}
          </div>
          {existingPhotos.some((p) => p.markedForRemoval) && (
            <p className="mt-2 text-xs text-red-400">
              Les photos grisées seront supprimées à la sauvegarde.
            </p>
          )}
          {existingPhotos.some((p) => p.isDetoured) && (
            <p className="mt-1 text-xs text-emerald-500">
              Les photos détourées remplaceront l&apos;originale à la sauvegarde.
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
              <NewPhotoCard
                key={photo.id}
                photo={photo}
                onRemove={onRemoveNew}
                onDetour={onDetour}
              />
            ))}
          </div>

          {/* Détourage tip */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-50/50 px-4 py-3 dark:bg-amber-950/20">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Détourage optionnel :</span> Cliquez
              sur le bouton <Wand2 className="inline h-3 w-3" /> sous une nouvelle
              image pour supprimer l&apos;arrière-plan et appliquer un fond blanc
              professionnel.
            </p>
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
// ExistingPhotoCard — a stored photo with remove + re-detourage
// ══════════════════════════════════════════════════════════════

interface ExistingPhotoCardProps {
  photo: ExistingPhoto;
  onToggleRemove: (id: string | number) => void;
  onDetour: (id: string | number, url: string) => void;
  onRevert: (id: string | number) => void;
  onSetPrimary: (id: string | number) => void;
}

function ExistingPhotoCard({
  photo,
  onToggleRemove,
  onDetour,
  onRevert,
  onSetPrimary,
}: ExistingPhotoCardProps) {
  return (
    <div className="group relative">
      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-xl border-2 transition-all ${
          photo.markedForRemoval
            ? "border-red-400/70 opacity-40"
            : photo.isDetoured
              ? "border-emerald-300/70"
              : "border-gray-200/60 dark:border-gray-700/50"
        }`}
      >
        <Image
          src={photo.url}
          alt={photo.alt}
          width={160}
          height={160}
          className={`aspect-square w-full object-cover transition-all duration-500 ${
            photo.isProcessing ? "scale-[1.02] opacity-50 blur-[1px]" : ""
          }`}
          unoptimized
        />

        {/* Processing overlay */}
        {photo.isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-1.5 rounded-lg bg-black/40 px-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-[10px] font-semibold text-white">
                Détourage…
              </span>
            </div>
          </div>
        )}

        {photo.isPrimary && !photo.markedForRemoval && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-sugu-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Principale
          </span>
        )}

        {photo.isDetoured && !photo.isProcessing && (
          <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
            <CheckCircle2 className="h-2.5 w-2.5" /> Détouré
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

      {/* Action bar below the image — hidden when the photo is being removed */}
      {!photo.markedForRemoval && (
        <div className="mt-1.5 flex items-center justify-center">
          {photo.isDetoured ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Fond blanc appliqué
              </span>
              <button
                type="button"
                onClick={() => onRevert(photo.id)}
                className="text-[10px] font-medium text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline dark:hover:text-gray-200"
              >
                Annuler
              </button>
            </div>
          ) : photo.isProcessing ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Traitement…
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onDetour(photo.id, photo.url)}
              className="inline-flex items-center gap-1 rounded-md bg-violet-500 px-2.5 py-1 text-[10px] font-semibold text-white transition-all hover:bg-violet-600 active:scale-95"
            >
              <Wand2 className="h-3 w-3" />
              Détourer
            </button>
          )}
        </div>
      )}

      {/* Cover / main image control */}
      {!photo.markedForRemoval && (
        <div className="mt-1 flex items-center justify-center">
          {photo.isPrimary ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sugu-600 dark:text-sugu-400">
              <Star className="h-3 w-3 fill-sugu-500 text-sugu-500" />
              Photo principale
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetPrimary(photo.id)}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 transition-colors hover:text-sugu-600 dark:hover:text-sugu-400"
            >
              <Star className="h-3 w-3" />
              Définir principale
            </button>
          )}
        </div>
      )}

      {photo.processingError && !photo.isProcessing && (
        <p
          className="mt-1 text-center text-[9px] text-amber-500"
          title={photo.processingError}
        >
          <AlertTriangle className="inline h-2.5 w-2.5" /> Échec du détourage
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NewPhotoCard — a freshly-added photo with on-demand detourage
// ══════════════════════════════════════════════════════════════

interface NewPhotoCardProps {
  photo: NewPhotoPreview;
  onRemove: (id: string) => void;
  onDetour: (id: string, file: File) => void;
}

function NewPhotoCard({ photo, onRemove, onDetour }: NewPhotoCardProps) {
  return (
    <div className="group relative">
      {/* Image container */}
      <div
        className={`relative overflow-hidden rounded-xl border-2 transition-colors ${
          photo.isDetoured ? "border-emerald-300/70" : "border-sugu-300/60"
        }`}
      >
        <Image
          src={photo.previewUrl}
          alt="Nouveau"
          width={160}
          height={160}
          className={`aspect-square w-full object-cover transition-all duration-500 ${
            photo.isProcessing ? "scale-[1.02] opacity-50 blur-[1px]" : ""
          }`}
          unoptimized
        />

        {/* Processing overlay */}
        {photo.isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-1.5 rounded-lg bg-black/40 px-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-[10px] font-semibold text-white">
                Détourage…
              </span>
            </div>
          </div>
        )}

        {!photo.isProcessing && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-sugu-500 px-2 py-0.5 text-[10px] font-bold text-white">
            Nouveau
          </span>
        )}

        {photo.isDetoured && !photo.isProcessing && (
          <span className="absolute right-9 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
            <CheckCircle2 className="h-2.5 w-2.5" /> Détouré
          </span>
        )}

        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          className="absolute right-1.5 top-1.5 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Action bar below the image */}
      <div className="mt-1.5 flex items-center justify-center">
        {photo.isDetoured ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Fond blanc appliqué
          </span>
        ) : photo.isProcessing ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Traitement…
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onDetour(photo.id, photo.file)}
            className="inline-flex items-center gap-1 rounded-md bg-violet-500 px-2.5 py-1 text-[10px] font-semibold text-white transition-all hover:bg-violet-600 active:scale-95"
          >
            <Wand2 className="h-3 w-3" />
            Détourer
          </button>
        )}
      </div>

      {photo.processingError && !photo.isProcessing && (
        <p
          className="mt-1 text-center text-[9px] text-amber-500"
          title={photo.processingError}
        >
          <AlertTriangle className="inline h-2.5 w-2.5" /> Échec — image originale
          utilisée
        </p>
      )}
    </div>
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
    categoryIds: [],
  });

  // ── Photo state ──
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhotoPreview[]>([]);
  const [initialized, setInitialized] = useState(false);
  // Whether the user explicitly changed the cover photo (so we only send it then)
  const [mainPhotoChanged, setMainPhotoChanged] = useState(false);

  // ── Hooks ──
  const { data: product, isLoading, isError } = useVendorProductDetail(id);
  const { data: categories } = useProductCategories();
  const updateProduct = useUpdateProduct();
  const previewMutation = usePreviewImage();

  // Track abort controllers for in-flight detourage requests
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    const controllers = abortControllersRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

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
      origin: product.origin ?? "",
      weightValue: wVal,
      weightUnit: wUnit,
      price: priceToFormString(product.price),
      originalPrice: priceToFormString(product.originalPrice),
      stock: product.kpis?.stock?.value != null ? String(product.kpis.stock.value) : "",
      hasBulkPricing: bulkTiers.length > 0,
      bulkTiers,
      publishMode,
      categoryIds: product.category_ids ?? [],
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

  /** Set an existing photo as the cover/main image. */
  const setPrimaryExisting = useCallback((photoId: string | number) => {
    setExistingPhotos((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.id === photoId })),
    );
    setMainPhotoChanged(true);
  }, []);

  const addNewPhotos = useCallback((files: File[]) => {
    const previews: NewPhotoPreview[] = files.map((file) => ({
      id: `new-${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      // Detourage is manual/on-demand — start untouched
      isProcessing: false,
      isDetoured: false,
      processingError: null,
    }));
    setNewPhotos((prev) => [...prev, ...previews]);
  }, []);

  const removeNewPhoto = useCallback((photoId: string) => {
    // Abort any in-flight detourage for this photo
    const controller = abortControllersRef.current.get(photoId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(photoId);
    }

    setNewPhotos((prev) => {
      const found = prev.find((p) => p.id === photoId);
      if (found && found.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(found.previewUrl);
      }
      return prev.filter((p) => p.id !== photoId);
    });
  }, []);

  /** Trigger background removal for a single new photo (on-demand). */
  const triggerDetourage = useCallback(
    async (photoId: string, file: File) => {
      const controller = new AbortController();
      abortControllersRef.current.set(photoId, controller);

      // Mark as processing
      setNewPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, isProcessing: true, processingError: null }
            : p,
        ),
      );

      try {
        const result = await previewMutation.mutateAsync(file);
        if (controller.signal.aborted) return;

        // Success — swap preview to the detoured Cloudinary URL + keep its UUID
        setNewPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  previewUrl: result.preview_url,
                  previewUuid: result.uuid,
                  isProcessing: false,
                  isDetoured: true,
                  processingError: null,
                }
              : p,
          ),
        );

        toast.success("Image détourée avec succès !");
      } catch (error) {
        if (controller.signal.aborted) return;

        const errorMessage =
          error instanceof Error ? error.message : "Erreur de détourage";

        // Failure — keep the original file, mark error
        setNewPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  isProcessing: false,
                  processingError: errorMessage,
                  isDetoured: false,
                }
              : p,
          ),
        );

        toast.error("Échec du détourage. L'image originale sera utilisée.");
      } finally {
        abortControllersRef.current.delete(photoId);
      }
    },
    [previewMutation],
  );

  /**
   * Re-detoure an EXISTING (stored) photo.
   * Approach A: refetch the image from the CDN (CORS-enabled), wrap it as a File,
   * and run it through the same preview endpoint as new photos.
   */
  const triggerDetourageExisting = useCallback(
    async (photoId: string | number, url: string) => {
      const key = `existing:${photoId}`;
      const controller = new AbortController();
      abortControllersRef.current.set(key, controller);

      // Mark as processing
      setExistingPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, isProcessing: true, processingError: null }
            : p,
        ),
      );

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(
            `Téléchargement de l'image impossible (HTTP ${response.status})`,
          );
        }
        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const ext = MIME_EXT[blob.type] ?? "jpg";
        const file = new File([blob], `photo-${photoId}.${ext}`, {
          type: blob.type || "image/jpeg",
        });

        const result = await previewMutation.mutateAsync(file);
        if (controller.signal.aborted) return;

        // Success — display the detoured preview, keep its UUID + the original URL
        setExistingPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  originalUrl: p.originalUrl ?? p.url,
                  url: result.preview_url,
                  detouredUuid: result.uuid,
                  isProcessing: false,
                  isDetoured: true,
                  processingError: null,
                }
              : p,
          ),
        );

        toast.success("Image détourée avec succès !");
      } catch (error) {
        if (controller.signal.aborted) return;

        const errorMessage =
          error instanceof Error ? error.message : "Erreur de détourage";

        setExistingPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  isProcessing: false,
                  processingError: errorMessage,
                  isDetoured: false,
                }
              : p,
          ),
        );

        toast.error("Échec du détourage de cette photo.");
      } finally {
        abortControllersRef.current.delete(key);
      }
    },
    [previewMutation],
  );

  /** Revert a detoured existing photo back to its original (before saving). */
  const revertDetourageExisting = useCallback((photoId: string | number) => {
    setExistingPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId && p.isDetoured
          ? {
              ...p,
              url: p.originalUrl ?? p.url,
              originalUrl: undefined,
              detouredUuid: undefined,
              isDetoured: false,
              processingError: null,
            }
          : p,
      ),
    );
  }, []);

  // ── Validation ──
  // Drafts can be saved incomplete — only the name is required. Price and
  // category are enforced when actually publishing.
  const validateForm = useCallback(
    (mode: "publish" | "draft"): string | null => {
      if (!formData.name.trim()) return "Le nom du produit est obligatoire.";
      if (mode === "publish") {
        if (!formData.price || parseFloat(formData.price) <= 0)
          return "Le prix de vente est obligatoire.";
        if (!formData.categoryIds || formData.categoryIds.length === 0)
          return "Sélectionnez au moins une catégorie.";
      }
      return null;
    },
    [formData.name, formData.price, formData.categoryIds],
  );

  // ── Submit ──
  const handleSubmit = useCallback(
    (mode: "publish" | "draft") => {
      const error = validateForm(mode);
      if (error) {
        toast.error(error);
        return;
      }

      const categoryIds = formData.categoryIds;

      // Existing photos that were re-detoured: replace original (remove old media +
      // attach detoured preview). Skip any also flagged for removal.
      const detouredExisting = existingPhotos.filter(
        (p) => p.isDetoured && p.detouredUuid && !p.markedForRemoval,
      );

      const removeMediaIds = [
        ...existingPhotos.filter((p) => p.markedForRemoval).map((p) => p.id),
        ...detouredExisting.map((p) => p.id), // remove the original being replaced
      ];

      // previewIds = detoured new photos + detoured existing photos
      const previewIds = [
        ...newPhotos
          .filter((p) => p.isDetoured && p.previewUuid)
          .map((p) => p.previewUuid!),
        ...detouredExisting.map((p) => p.detouredUuid!),
      ];

      // Only non-detoured new photos are uploaded as raw files
      const newImageFiles = newPhotos
        .filter((p) => !p.isDetoured)
        .map((p) => p.file);

      // Cover/main image: only send when the user explicitly changed it, and only
      // for a stable existing photo (real media id, not removed/detoured).
      const primaryPhoto = existingPhotos.find(
        (p) => p.isPrimary && !p.markedForRemoval && !p.isDetoured,
      );
      const mainMediaId =
        mainPhotoChanged && primaryPhoto && /^\d+$/.test(String(primaryPhoto.id))
          ? primaryPhoto.id
          : undefined;

      updateProduct.mutate(
        {
          id,
          formData: { ...formData, publishMode: mode },
          categoryIds,
          newImages: newImageFiles.length > 0 ? newImageFiles : undefined,
          previewIds: previewIds.length > 0 ? previewIds : undefined,
          removeMediaIds: removeMediaIds.length > 0 ? removeMediaIds : undefined,
          mainMediaId,
        },
        {
          onSuccess: () => {
            // Revoke local blob URLs (detoured photos now hold a Cloudinary URL)
            newPhotos.forEach((p) => {
              if (p.previewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(p.previewUrl);
              }
            });
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
    [formData, validateForm, existingPhotos, newPhotos, mainPhotoChanged, updateProduct, id],
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
            onDetour={triggerDetourage}
            onDetourExisting={triggerDetourageExisting}
            onRevertExisting={revertDetourageExisting}
            onSetPrimary={setPrimaryExisting}
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

        {/* Right button — on the recap step it follows the Publication choice */}
        <div className="flex items-center gap-2">
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
              onClick={() => handleSubmit(formData.publishMode)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sugu-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sugu-600 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {formData.publishMode === "draft"
                ? "Enregistrer le brouillon"
                : "Publier les modifications"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
