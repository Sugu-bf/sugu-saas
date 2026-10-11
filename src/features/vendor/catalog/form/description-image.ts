// ============================================================
// Pictures placed inside a product description.
//
// The description travels as HTML with its new pictures inlined (data
// URIs). On save, Laravel stores each of them on the media disk and puts
// its address in the markup (`DescriptionImageService`): the storefront only
// ever shows pictures it hosts. The limits below are that service's.
//
// A phone photo weighs several megabytes: it is brought down to a size a
// product page needs before it is inlined, so a description with pictures
// stays sendable on a slow connection.
// ============================================================

/** What `DescriptionImageService` stores; SVG is left out (it can carry scripts). */
export const DESCRIPTION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const DESCRIPTION_IMAGE_ACCEPT = DESCRIPTION_IMAGE_TYPES.join(",");
export const DESCRIPTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Longest side kept, in pixels. */
const MAX_SIDE = 1600;
/** A picture lighter than this, and no larger than `MAX_SIDE`, is sent as it is. */
const LIGHT_BYTES = 400 * 1024;
const QUALITY = 0.86;

export interface DescriptionImage {
  src: string;
  alt: string;
}

/** A picture that cannot go in a description; the message is shown to the seller. */
export class DescriptionImageError extends Error {}

/** "IMG_2024-03.photo-1.jpg" → "IMG 2024 03 photo 1": a starting point the seller can rewrite. */
export function altFromFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("unreadable")));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsDataURL(blob);
  });
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/**
 * The picture, redrawn no larger than `MAX_SIDE`. `null` when it is already
 * light, when this browser cannot redraw it, or when redrawing would not help:
 * the caller then keeps the file as it is.
 */
async function lighter(file: File): Promise<Blob | null> {
  // An animated GIF would lose its animation; a browser without these APIs keeps the file.
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return null;

  const bitmap = await createImageBitmap(file);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_SIDE && file.size <= LIGHT_BYTES) return null;

    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP keeps transparency; a browser that cannot write it answers with another type.
    const blob = await encode(canvas, "image/webp");
    return blob && blob.type === "image/webp" && blob.size < file.size ? blob : null;
  } finally {
    bitmap.close();
  }
}

/** Checks a file and turns it into what the editor inserts. Throws `DescriptionImageError`. */
export async function prepareDescriptionImage(file: File): Promise<DescriptionImage> {
  const name = file.name || "Cette image";
  if (!DESCRIPTION_IMAGE_TYPES.includes(file.type)) {
    throw new DescriptionImageError(`« ${name} » n'est pas une image JPG, PNG, WEBP ou GIF.`);
  }

  let blob: Blob = file;
  try {
    blob = (await lighter(file)) ?? file;
  } catch {
    throw new DescriptionImageError(`« ${name} » n'a pas pu être lue. Essayez avec une autre image.`);
  }

  if (blob.size > DESCRIPTION_IMAGE_MAX_BYTES) {
    throw new DescriptionImageError(`« ${name} » dépasse 5 Mo. Choisissez une image plus légère.`);
  }

  try {
    return { src: await readAsDataUrl(blob), alt: altFromFilename(file.name) };
  } catch {
    throw new DescriptionImageError(`« ${name} » n'a pas pu être lue. Essayez avec une autre image.`);
  }
}
