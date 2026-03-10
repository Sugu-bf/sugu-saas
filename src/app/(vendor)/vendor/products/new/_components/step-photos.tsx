"use client";

import { useRef, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";
import { Camera, X, Star, Plus, ImagePlus, Loader2, AlertTriangle, CheckCircle2, Wand2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type ProductFormData, type ProductPhoto } from "./types";
import { usePreviewImage } from "@/features/vendor/hooks";

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

interface StepPhotosProps {
  data: ProductFormData;
  /** Direct access to setFormData for functional state updates (async-safe). */
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
}

export function StepPhotos({ data, setFormData }: StepPhotosProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const previewMutation = usePreviewImage();
  // Track abort controllers for in-flight detourage requests
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach((controller) => {
        controller.abort();
      });
      abortControllersRef.current.clear();
    };
  }, []);

  /**
   * Trigger background removal for a single photo (on-demand).
   * Uses setFormData functional form to avoid stale closure issues.
   */
  const triggerDetourage = useCallback(
    async (photoId: string, file: File) => {
      // Create abort controller for this request
      const controller = new AbortController();
      abortControllersRef.current.set(photoId, controller);

      // Mark as processing
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.map((p) =>
          p.id === photoId ? { ...p, isProcessing: true, processingError: null } : p,
        ),
      }));

      try {
        const result = await previewMutation.mutateAsync(file);

        // Check if aborted (photo removed during processing)
        if (controller.signal.aborted) return;

        // Success — update with detoured preview URL
        setFormData((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
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
        }));

        toast.success("Image détourée avec succès !");
      } catch (error) {
        // Check if aborted
        if (controller.signal.aborted) return;

        const errorMessage =
          error instanceof Error ? error.message : "Erreur de détourage";

        // Failure — keep original preview, mark error
        setFormData((prev) => ({
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  isProcessing: false,
                  processingError: errorMessage,
                  isDetoured: false,
                }
              : p,
          ),
        }));

        toast.error("Échec du détourage. L'image originale sera utilisée.");
      } finally {
        abortControllersRef.current.delete(photoId);
      }
    },
    [previewMutation, setFormData],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const currentCount = data.photos.length;
      const remaining = MAX_PHOTOS - currentCount;

      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_PHOTOS} photos autorisées.`);
        return;
      }

      const validFiles: File[] = [];
      for (const file of fileArray.slice(0, remaining)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error(`"${file.name}" : format non supporté. Utilisez PNG, JPG ou WEBP.`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`"${file.name}" : fichier trop volumineux (max 5 Mo).`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      const newPhotos: ProductPhoto[] = validFiles.map((file, i) => ({
        id: `photo_${Date.now()}_${i}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isMain: currentCount === 0 && i === 0,
        // NOT processing — detourage is manual
        isProcessing: false,
        isDetoured: false,
        processingError: null,
      }));

      // Use functional update to safely append photos
      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos],
      }));
    },
    [data.photos.length, setFormData],
  );

  const removePhoto = useCallback(
    (id: string) => {
      // Abort any in-flight detourage for this photo
      const controller = abortControllersRef.current.get(id);
      if (controller) {
        controller.abort();
        abortControllersRef.current.delete(id);
      }

      // Revoke blob URL if it's a local blob
      const photo = data.photos.find((p) => p.id === id);
      if (photo && photo.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      setFormData((prev) => {
        const updated = prev.photos.filter((p) => p.id !== id);
        // If we removed the main photo, set the first remaining as main
        if (updated.length > 0 && !updated.some((p) => p.isMain)) {
          updated[0] = { ...updated[0], isMain: true };
        }
        return { ...prev, photos: updated };
      });
    },
    [data.photos, setFormData],
  );

  const setMainPhoto = useCallback(
    (id: string) => {
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.map((p) => ({
          ...p,
          isMain: p.id === id,
        })),
      }));
    },
    [setFormData],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const emptySlots = Math.max(0, 4 - data.photos.length);

  return (
    <section className="glass-card animate-slide-in-right rounded-3xl p-5 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Camera className="h-6 w-6 text-gray-400" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Photos du produit
          </h2>
          <p className="text-sm text-gray-400">
            Étape 2 sur 4 — Ajoutez au moins 1 photo ({data.photos.length}/{MAX_PHOTOS})
          </p>
        </div>
      </div>

      {/* ── Drop zone ── */}
      <div
        ref={dropZoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="mt-6 flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/30 px-6 py-10 text-center transition-all hover:border-sugu-300 hover:bg-sugu-50/10 dark:border-gray-700 dark:bg-gray-900/20"
      >
        <Camera className="h-12 w-12 text-sugu-400" />
        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
          Glissez vos images ici
        </p>
        <p className="text-sm text-gray-400">ou</p>
        <span className="text-sm font-semibold text-sugu-500 underline decoration-sugu-300 underline-offset-2 transition-colors hover:text-sugu-600">
          Parcourir les fichiers
        </span>
        <p className="text-xs text-gray-400">
          PNG, JPG, WEBP • Max 5 MB par image • Jusqu&apos;à {MAX_PHOTOS} photos
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = ""; // Reset so same file can be re-selected
        }}
      />

      {/* ── Photo grid ── */}
      {(data.photos.length > 0 || emptySlots > 0) && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {data.photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              onSetMain={setMainPhoto}
              onRemove={removePhoto}
              onDetour={triggerDetourage}
            />
          ))}

          {/* Empty add slots */}
          {data.photos.length < MAX_PHOTOS &&
            Array.from({ length: Math.min(emptySlots, MAX_PHOTOS - data.photos.length) }).map(
              (_, i) => (
                <button
                  key={`empty-${i}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/20 text-gray-400 transition-all hover:border-sugu-300 hover:text-sugu-500 sm:h-36 dark:border-gray-700"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Ajouter</span>
                </button>
              ),
            )}
        </div>
      )}

      {/* ── Add more button ── */}
      {data.photos.length > 0 && data.photos.length < MAX_PHOTOS && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sugu-500 transition-colors hover:text-sugu-600"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          Ajouter d&apos;autres photos
        </button>
      )}

      {/* ── Tip ── */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-amber-50/50 px-4 py-3 dark:bg-amber-950/20">
        <Sparkles className="h-4 w-4" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <span className="font-semibold">Détourage optionnel :</span> Cliquez
          sur le bouton <Wand2 className="inline h-3 w-3" /> sous une image pour
          supprimer l&apos;arrière-plan et appliquer un fond blanc professionnel.
        </p>
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">
        {data.photos.length > 0
          ? `${data.photos.length} photo${data.photos.length > 1 ? "s" : ""} ajoutée${data.photos.length > 1 ? "s" : ""}`
          : "Aucune photo ajoutée"}
      </p>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// PhotoCard — Renders a single photo with actions
// ─────────────────────────────────────────────────────────────

interface PhotoCardProps {
  photo: ProductPhoto;
  onSetMain: (id: string) => void;
  onRemove: (id: string) => void;
  onDetour: (photoId: string, file: File) => void;
}

function PhotoCard({ photo, onSetMain, onRemove, onDetour }: PhotoCardProps) {
  return (
    <div className="group relative">
      {/* Image container */}
      <div
        className={cn(
          "relative flex h-32 items-center justify-center overflow-hidden rounded-xl sm:h-36",
          photo.isMain
            ? "ring-2 ring-sugu-400 ring-offset-1"
            : "border border-gray-200/60 dark:border-gray-700/40",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt="Photo produit"
          className={cn(
            "h-full w-full object-cover transition-all duration-500",
            photo.isProcessing && "scale-[1.02] opacity-50 blur-[1px]",
          )}
        />

        {/* Processing overlay — spinner */}
        {photo.isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-1.5 rounded-lg bg-black/40 px-3 py-2">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
              <span className="text-[10px] font-semibold text-white">
                Détourage en cours...
              </span>
            </div>
          </div>
        )}

        {/* Set as main overlay (only when not processing) */}
        {!photo.isMain && !photo.isProcessing && (
          <button
            type="button"
            onClick={() => onSetMain(photo.id)}
            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/20 group-hover:opacity-100"
            title="Définir comme photo principale"
          >
            <Star className="h-5 w-5 text-white drop-shadow" />
          </button>
        )}
      </div>

      {/* Main badge */}
      {photo.isMain && (
        <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded bg-sugu-500 px-1.5 py-0.5 text-[7px] font-bold text-white shadow sm:text-[8px]">
          <Star className="h-2 w-2 fill-white" /> Principale
        </span>
      )}

      {/* Detoured success badge */}
      {photo.isDetoured && !photo.isProcessing && (
        <span className="absolute right-1 top-1 inline-flex items-center gap-0.5 rounded bg-emerald-500 px-1.5 py-0.5 text-[7px] font-bold text-white shadow">
          <CheckCircle2 className="h-2.5 w-2.5" /> Détouré
        </span>
      )}

      {/* Error badge */}
      {photo.processingError && !photo.isProcessing && (
        <span
          className="absolute left-1 bottom-8 inline-flex items-center gap-0.5 rounded bg-amber-500 px-1 py-0.5 text-[7px] font-semibold text-white shadow"
          title={photo.processingError}
        >
          <AlertTriangle className="h-2.5 w-2.5" /> Échec
        </span>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(photo.id)}
        className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-white shadow-sm transition-colors hover:bg-red-500"
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {/* ── Action bar below the image ── */}
      <div className="mt-1.5 flex items-center justify-center">
        {photo.isDetoured ? (
          // Already detoured — show static label
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Fond blanc appliqué
          </span>
        ) : photo.isProcessing ? (
          // Processing — show disabled state
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Traitement...
          </span>
        ) : (
          // Not detoured — show "Détourer" button
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
    </div>
  );
}
