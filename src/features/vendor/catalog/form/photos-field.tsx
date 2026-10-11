"use client";

import { useEffect, useId, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, MoreHorizontal, RotateCcw, Sparkles, Star, Trash2, Undo2 } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, IconButton, cn } from "@/design-system";
import { queryKeys } from "@/lib/query";
import {
  cancelProductBackgroundRemoval,
  getImageProcessingCapabilities,
  previewProductBackgroundRemoval,
} from "@/features/vendor/services/products.service";
import { describeFailure } from "../errors";
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTOS, MAX_PHOTO_BYTES, keptPhotos, localKey, type PhotoDraft, type ProductForm } from "./model";

// Pictures of a product. Nothing is sent before the form is saved, except
// the detouring previews, which the backend holds until they are accepted
// with the save or cancelled.

interface PhotosFieldProps {
  photos: PhotoDraft[];
  setForm: Dispatch<SetStateAction<ProductForm>>;
  /** Id of the product being edited; absent at creation. */
  productId?: string;
  error?: string;
}

/** Light checkerboard: shows what a detoured picture has made transparent. */
const TRANSPARENCY = "bg-[image:repeating-conic-gradient(var(--color-surface-hover)_0_25%,var(--color-surface)_0_50%)] bg-[length:16px_16px]";

export function PhotosField({ photos, setForm, productId, error }: PhotosFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const capabilities = useQuery({
    queryKey: queryKeys.vendor.imageProcessingCapabilities(),
    queryFn: getImageProcessingCapabilities,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const canDetour = Boolean(capabilities.data?.enabled) && !capabilities.data?.temporarily_unavailable;
  const preview = useMutation({ mutationFn: previewProductBackgroundRemoval, retry: 0 });

  const update = (key: string, patch: Partial<PhotoDraft>) =>
    setForm((form) => ({ ...form, photos: form.photos.map((photo) => (photo.key === key ? { ...photo, ...patch } : photo)) }));

  // Local previews are released when the form goes away.
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);
  useEffect(
    () => () => {
      for (const photo of latest.current) {
        if (photo.file) URL.revokeObjectURL(photo.originalUrl ?? photo.url);
      }
    },
    [],
  );

  const kept = keptPhotos({ photos });
  const removed = photos.filter((photo) => photo.removed);
  const room = MAX_PHOTOS - kept.length;
  const numberOf = (photo: PhotoDraft) => kept.indexOf(photo) + 1;

  function addFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    if (room <= 0) {
      toast.error(`Un produit a ${MAX_PHOTOS} photos au plus.`);
      return;
    }

    const accepted: PhotoDraft[] = [];
    for (const file of files.slice(0, room)) {
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        toast.error(`« ${file.name} » : utilisez une image JPG, PNG ou WEBP.`);
      } else if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`« ${file.name} » dépasse 5 Mo.`);
      } else {
        accepted.push({
          key: localKey("photo"),
          mediaId: null,
          file,
          url: URL.createObjectURL(file),
          originalUrl: null,
          isMain: false,
          removed: false,
          detour: "idle",
          previewId: null,
          detourError: null,
        });
      }
    }
    if (files.length > room) {
      toast.error(`${MAX_PHOTOS} photos au plus par produit : ${room > 1 ? `seules les ${room} premières ont été ajoutées` : "seule la première a été ajoutée"}.`);
    }
    if (input.current) input.current.value = "";
    if (accepted.length === 0) return;

    setForm((form) => {
      const next = [...form.photos, ...accepted];
      // The first picture of a product is its cover until another is chosen.
      const hasMain = keptPhotos({ photos: next }).some((photo) => photo.isMain);
      return { ...form, photos: hasMain ? next : next.map((photo) => ({ ...photo, isMain: photo.key === accepted[0].key })) };
    });
  }

  /** Drops the detouring preview the backend holds for this picture. */
  function forget(photo: PhotoDraft) {
    if (photo.previewId) void cancelProductBackgroundRemoval(photo.previewId).catch(() => undefined);
  }

  function remove(photo: PhotoDraft) {
    forget(photo);
    if (photo.file) URL.revokeObjectURL(photo.originalUrl ?? photo.url);
    setForm((form) => {
      const next = photo.mediaId
        ? // A stored picture is only removed when the form is saved.
          form.photos.map((candidate) =>
            candidate.key === photo.key
              ? { ...candidate, removed: true, isMain: false, detour: "idle" as const, previewId: null, url: candidate.originalUrl ?? candidate.url, originalUrl: null }
              : candidate,
          )
        : form.photos.filter((candidate) => candidate.key !== photo.key);

      const remaining = keptPhotos({ photos: next });
      if (remaining.length > 0 && !remaining.some((candidate) => candidate.isMain)) {
        return { ...form, photos: next.map((candidate) => ({ ...candidate, isMain: candidate.key === remaining[0].key })) };
      }
      return { ...form, photos: next };
    });
  }

  function restore(photo: PhotoDraft) {
    if (room <= 0) {
      toast.error(`Un produit a ${MAX_PHOTOS} photos au plus.`);
      return;
    }
    setForm((form) => {
      const hasMain = keptPhotos(form).some((candidate) => candidate.isMain);
      return { ...form, photos: form.photos.map((candidate) => (candidate.key === photo.key ? { ...candidate, removed: false, isMain: !hasMain } : candidate)) };
    });
  }

  const makeMain = (photo: PhotoDraft) =>
    setForm((form) => ({ ...form, photos: form.photos.map((candidate) => ({ ...candidate, isMain: candidate.key === photo.key })) }));

  async function detour(photo: PhotoDraft) {
    update(photo.key, { detour: "processing", detourError: null });
    try {
      const result = await preview.mutateAsync(photo.file ? { file: photo.file } : { productId, mediaId: photo.mediaId ?? undefined });
      update(photo.key, { detour: "preview", previewId: result.preview_id, originalUrl: photo.originalUrl ?? photo.url, url: result.preview_url });
    } catch (failure) {
      update(photo.key, { detour: "error", detourError: describeFailure(failure).message });
    }
  }

  function keepOriginal(photo: PhotoDraft) {
    forget(photo);
    update(photo.key, { detour: "idle", previewId: null, url: photo.originalUrl ?? photo.url, originalUrl: null, detourError: null });
  }

  const reviewing = kept.filter((photo) => photo.detour === "preview");
  const failed = kept.filter((photo) => photo.detour === "error");

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        addFiles(event.dataTransfer.files);
      }}
    >
      <ul className="grid grid-cols-3 gap-2 @md:grid-cols-4 @2xl:grid-cols-6" aria-label="Photos du produit">
        {kept.map((photo) => {
          const number = numberOf(photo);
          return (
            <li
              key={photo.key}
              className={cn(
                "relative aspect-square overflow-hidden rounded-control border bg-surface-subtle",
                photo.isMain ? "border-primary ring-1 ring-primary" : "border-border",
                photo.detour === "accepted" && TRANSPARENCY,
              )}
            >
              {/* Local blobs and signed previews are not for the image optimiser. */}
              <Image src={photo.url} alt={`Photo ${number}${photo.isMain ? ", principale" : ""}${photo.detour === "accepted" ? ", détourée" : ""}`} fill unoptimized sizes="160px" className="object-cover" />

              <span className="pointer-events-none absolute inset-x-1 bottom-1 flex flex-wrap gap-1">
                {photo.isMain && (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-primary px-1.5 py-0.5 text-meta font-medium text-primary-foreground">
                    <Star className="size-3" aria-hidden="true" />
                    Principale
                  </span>
                )}
                {photo.detour === "accepted" && (
                  <span className="inline-flex items-center gap-1 rounded-pill border border-success-border bg-success-bg px-1.5 py-0.5 text-meta font-medium text-success-fg">
                    <Sparkles className="size-3" aria-hidden="true" />
                    Détourée
                  </span>
                )}
              </span>

              {photo.detour === "processing" ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface/85 text-meta text-foreground" role="status">
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  Détourage…
                </span>
              ) : (
                <span className="absolute top-1 right-1">
                  <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour la photo ${number}`} variant="secondary" size="compact" tooltip={false} />}>
                    {!photo.isMain && (
                      <DropdownMenuItem icon={Star} onSelect={() => makeMain(photo)}>
                        Définir comme photo principale
                      </DropdownMenuItem>
                    )}
                    {photo.detour === "accepted" || photo.detour === "preview" ? (
                      <DropdownMenuItem icon={Undo2} onSelect={() => keepOriginal(photo)}>
                        Revenir à l&apos;original
                      </DropdownMenuItem>
                    ) : (
                      canDetour && (
                        <DropdownMenuItem icon={Sparkles} onSelect={() => detour(photo)}>
                          {photo.detour === "error" ? "Réessayer le détourage" : "Détourer le fond"}
                        </DropdownMenuItem>
                      )
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => remove(photo)}>
                      Retirer la photo
                    </DropdownMenuItem>
                  </DropdownMenu>
                </span>
              )}
            </li>
          );
        })}

        {room > 0 && (
          <li className="aspect-square">
            <label
              htmlFor={inputId}
              className={cn(
                "flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-dashed px-1 text-center",
                "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring hover:bg-surface-subtle",
                dragging ? "border-primary bg-brand-subtle" : error ? "border-danger-solid" : "border-border-strong",
              )}
            >
              <ImagePlus className="size-5 text-foreground-muted" aria-hidden="true" />
              <span className="text-meta font-medium text-foreground">{kept.length === 0 ? "Ajouter des photos" : "Ajouter"}</span>
              <input
                ref={input}
                id={inputId}
                type="file"
                multiple
                accept={ACCEPTED_PHOTO_TYPES.join(",")}
                className="sr-only"
                aria-describedby={`${inputId}-hint${error ? ` ${errorId}` : ""}`}
                aria-invalid={error ? true : undefined}
                onChange={(event) => addFiles(event.target.files)}
              />
            </label>
          </li>
        )}
      </ul>

      <p id={`${inputId}-hint`} className="text-meta text-foreground-muted">
        {kept.length} photo{kept.length > 1 ? "s" : ""} sur {MAX_PHOTOS}. JPG, PNG ou WEBP, 5 Mo au plus par photo.
        {capabilities.data?.temporarily_unavailable && " Le détourage est momentanément indisponible."}
      </p>

      {error && (
        <p id={errorId} className="text-meta text-danger-fg" role="alert">
          {error}
        </p>
      )}

      {failed.map((photo) => (
        <p key={photo.key} className="text-meta text-danger-fg" role="alert">
          Photo {numberOf(photo)} : le détourage a échoué. {photo.detourError} L&apos;original est conservé.
        </p>
      ))}

      {/* A detoured version is compared with its original before it is kept. */}
      {reviewing.map((photo) => (
        <div key={photo.key} className="flex flex-col gap-3 rounded-control border border-border bg-surface-subtle p-3" role="group" aria-label={`Détourage de la photo ${numberOf(photo)}`}>
          <p className="text-label font-medium text-foreground">Détourage de la photo {numberOf(photo)}</p>
          <div className="grid grid-cols-2 gap-2">
            <figure className="flex flex-col gap-1">
              <span className="relative block aspect-square overflow-hidden rounded-control border border-border bg-surface">
                <Image src={photo.originalUrl ?? photo.url} alt="Photo d'origine" fill unoptimized sizes="240px" className="object-contain" />
              </span>
              <figcaption className="text-meta text-foreground-muted">Original</figcaption>
            </figure>
            <figure className="flex flex-col gap-1">
              <span className={cn("relative block aspect-square overflow-hidden rounded-control border border-border", TRANSPARENCY)}>
                <Image src={photo.url} alt="Photo détourée" fill unoptimized sizes="240px" className="object-contain" />
              </span>
              <figcaption className="text-meta text-foreground-muted">Fond retiré</figcaption>
            </figure>
          </div>
          <p className="text-meta text-foreground-muted">Si vous gardez le détourage, l&apos;original reste enregistré avec le produit.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={Check} onClick={() => update(photo.key, { detour: "accepted" })}>
              Garder le détourage
            </Button>
            <Button icon={Undo2} onClick={() => keepOriginal(photo)}>
              Revenir à l&apos;original
            </Button>
          </div>
        </div>
      ))}

      {removed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-control border border-warning-border bg-warning-bg p-3" role="status">
          <p className="text-label font-medium text-warning-fg">
            {removed.length > 1 ? `${removed.length} photos seront retirées à l'enregistrement` : "1 photo sera retirée à l'enregistrement"}
          </p>
          <ul className="flex flex-wrap gap-2">
            {removed.map((photo) => (
              <li key={photo.key} className="flex items-center gap-2">
                <span className="relative size-10 overflow-hidden rounded-compact border border-border bg-surface">
                  <Image src={photo.url} alt="" fill unoptimized sizes="40px" className="object-cover opacity-60" />
                </span>
                <Button size="compact" icon={RotateCcw} onClick={() => restore(photo)}>
                  Garder
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
