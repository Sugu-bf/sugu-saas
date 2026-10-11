import type { ProductDetail } from "../contract";

// ============================================================
// Product form — state, rules and request (create and edit).
//
// Publication is not decided here. The form saves a product, and
// "Soumettre à validation" asks Laravel to queue it for moderation
// (POST sellers/products/{id}/submit). The status `published` is
// never sent.
//
// Pictures follow the contract the storefront reads (Product::
// getCoverMedia, getDisplayableImageMedia): new files go to the
// `images` collection at creation and to `gallery` afterwards,
// existing pictures are removed and promoted by media id, and a
// detoured picture is added next to its original, which is kept.
// ============================================================

export const MAX_PHOTOS = 6;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_VARIANTS = 100;
export const MAX_ORDER_QUANTITY = 500;

export interface PriceTier {
  id: string;
  minQuantity: string;
  price: string;
}

export interface VariantAxis {
  id: string;
  name: string;
  values: string[];
}

export interface VariantDraft {
  /** Stable key in the form; the backend variant id when the variant exists. */
  id: string;
  /** Axis name → value. */
  combination: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
  minOrderQuantity: string;
  lowStockThreshold: string;
  allowBackorder: boolean;
  tiers: PriceTier[];
}

export type DetourState = "idle" | "processing" | "preview" | "accepted" | "error";

export interface PhotoDraft {
  key: string;
  /** Media id of a picture already stored on the product. */
  mediaId: string | null;
  /** File of a picture added in this session. */
  file: File | null;
  /** What to display: the stored picture, the local file, or the detoured preview. */
  url: string;
  /** The picture before detouring, while a detoured version is shown. */
  originalUrl: string | null;
  isMain: boolean;
  /** An existing picture the seller asked to remove; removed on save. */
  removed: boolean;
  detour: DetourState;
  /** Id of the detouring preview held by the backend. */
  previewId: string | null;
  detourError: string | null;
}

export interface ProductForm {
  name: string;
  categoryIds: string[];
  descriptionHtml: string;
  originCountry: string;
  weight: string;
  weightUnit: "g" | "kg";
  price: string;
  compareAtPrice: string;
  stock: string;
  minOrderQuantity: string;
  lowStockThreshold: string;
  trackStock: boolean;
  hasTiers: boolean;
  tiers: PriceTier[];
  hasVariants: boolean;
  axes: VariantAxis[];
  variants: VariantDraft[];
  photos: PhotoDraft[];
}

export const EMPTY_FORM: ProductForm = {
  name: "",
  categoryIds: [],
  descriptionHtml: "",
  originCountry: "BF",
  weight: "",
  weightUnit: "g",
  price: "",
  compareAtPrice: "",
  stock: "",
  minOrderQuantity: "1",
  lowStockThreshold: "10",
  trackStock: true,
  hasTiers: false,
  tiers: [],
  hasVariants: false,
  axes: [],
  variants: [],
  photos: [],
};

/** Countries offered as origin: ISO 3166-1 alpha-2 code → French name. */
export const ORIGIN_COUNTRIES: { value: string; label: string }[] = [
  { value: "BF", label: "Burkina Faso" },
  { value: "BJ", label: "Bénin" },
  { value: "CM", label: "Cameroun" },
  { value: "CI", label: "Côte d'Ivoire" },
  { value: "GH", label: "Ghana" },
  { value: "GN", label: "Guinée" },
  { value: "ML", label: "Mali" },
  { value: "NE", label: "Niger" },
  { value: "SN", label: "Sénégal" },
  { value: "TG", label: "Togo" },
];

let sequence = 0;
/** Key unique within the page, for rows the backend does not know yet. */
export function localKey(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
}

// ── Editing an existing product ─────────────────────────────

const plain = (value: number | null | undefined): string => (value == null ? "" : String(value));

export function formFromProduct(product: ProductDetail): ProductForm {
  const tiersOf = (tiers: { id: string; minQuantity: number; priceFrancs: number }[]): PriceTier[] =>
    tiers.map((tier) => ({ id: tier.id, minQuantity: String(tier.minQuantity), price: String(tier.priceFrancs) }));

  const withOptions = product.hasVariants ? product.variants.filter((variant) => Object.keys(variant.options).length > 0) : [];
  const axes: VariantAxis[] = [];
  for (const variant of withOptions) {
    for (const [name, value] of Object.entries(variant.options)) {
      let axis = axes.find((candidate) => candidate.name === name);
      if (!axis) {
        axis = { id: localKey("axis"), name, values: [] };
        axes.push(axis);
      }
      if (!axis.values.includes(value)) axis.values.push(value);
    }
  }

  const simple = product.variants.find((variant) => variant.isDefault) ?? product.variants[0];
  // Weight is stored in grams: whole kilograms are shown as kilograms.
  const grams = product.weightGrams;
  const inKilograms = grams != null && grams >= 1000 && grams % 100 === 0;

  return {
    ...EMPTY_FORM,
    name: product.name,
    categoryIds: product.categoryIds,
    descriptionHtml: product.descriptionHtml ?? "",
    originCountry: product.originCountry ?? "",
    weight: grams == null ? "" : String(inKilograms ? grams / 1000 : grams),
    weightUnit: inKilograms ? "kg" : "g",
    price: plain(product.priceFrancs),
    compareAtPrice: plain(product.compareAtFrancs),
    stock: withOptions.length > 0 ? "0" : plain(simple?.stock ?? product.stock ?? 0),
    minOrderQuantity: String(product.minOrderQuantity),
    lowStockThreshold: plain(simple?.lowStockThreshold ?? 10),
    trackStock: simple?.trackStock ?? true,
    hasTiers: product.bulkPrices.length > 0,
    tiers: tiersOf(product.bulkPrices),
    hasVariants: withOptions.length > 0,
    axes,
    variants: withOptions.map((variant) => ({
      id: variant.id,
      combination: variant.options,
      price: plain(variant.priceFrancs),
      stock: String(variant.stock),
      sku: variant.sku ?? "",
      minOrderQuantity: plain(variant.minOrderQuantity ?? product.minOrderQuantity),
      lowStockThreshold: plain(variant.lowStockThreshold ?? 10),
      allowBackorder: variant.allowBackorder,
      tiers: tiersOf(variant.bulkPrices),
    })),
    photos: product.pictures.map((picture) => ({
      key: `media-${picture.id}`,
      mediaId: picture.id,
      file: null,
      url: picture.url,
      originalUrl: null,
      isMain: picture.isMain,
      removed: false,
      detour: "idle",
      previewId: null,
      detourError: null,
    })),
  };
}

// ── Variants: axes → combinations ───────────────────────────

/** "Couleur:Rouge|Taille:M": identity of a combination, whatever the axis order. */
export function combinationKey(combination: Record<string, string>): string {
  return Object.entries(combination)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([axis, value]) => `${axis}:${value}`)
    .join("|");
}

export function combinationLabel(combination: Record<string, string>): string {
  return Object.values(combination).join(" / ");
}

function cartesian(axes: VariantAxis[]): Record<string, string>[] {
  return axes
    .filter((axis) => axis.name.trim() && axis.values.length > 0)
    .reduce<Record<string, string>[]>(
      (combinations, axis) => combinations.flatMap((combination) => axis.values.map((value) => ({ ...combination, [axis.name]: value }))),
      [{}],
    )
    .filter((combination) => Object.keys(combination).length > 0);
}

/**
 * The variants the axes describe. A combination that already exists keeps
 * everything the seller typed (price, stock, SKU…); a new one starts from the
 * product's price and rules, with no stock.
 */
export function generateVariants(form: Pick<ProductForm, "axes" | "variants" | "price" | "minOrderQuantity" | "lowStockThreshold">): VariantDraft[] {
  const existing = new Map(form.variants.map((variant) => [combinationKey(variant.combination), variant]));
  return cartesian(form.axes).map(
    (combination) =>
      existing.get(combinationKey(combination)) ?? {
        id: localKey("variant"),
        combination,
        price: form.price,
        stock: "0",
        sku: "",
        minOrderQuantity: form.minOrderQuantity || "1",
        lowStockThreshold: form.lowStockThreshold || "10",
        allowBackorder: false,
        tiers: [],
      },
  );
}

/** Applies a change of axes and regenerates the combinations. */
export function withAxes(form: ProductForm, axes: VariantAxis[]): ProductForm {
  return { ...form, axes, variants: generateVariants({ ...form, axes }) };
}

// ── Validation ──────────────────────────────────────────────

/** `draft`: what the server needs to store the product. `submit`: what moderation needs to approve it. */
export type SaveIntent = "draft" | "submit";

/** Field key → message. Variant fields are keyed `variant.<id>.<field>`. */
export type FormErrors = Record<string, string>;

const isInteger = (text: string, min: number, max = Number.MAX_SAFE_INTEGER) => /^\d+$/.test(text.trim()) && Number(text) >= min && Number(text) <= max;
const isAmount = (text: string) => /^\d+([.,]\d+)?$/.test(text.trim());
const amountOf = (text: string) => Number(text.trim().replace(",", "."));

function tiersError(tiers: PriceTier[]): string | null {
  if (tiers.length === 0) return "Ajoutez au moins un palier, ou désactivez les prix par quantité.";
  const seen = new Set<number>();
  for (const tier of tiers) {
    if (!isInteger(tier.minQuantity, 1, MAX_ORDER_QUANTITY)) return `Chaque quantité est un entier entre 1 et ${MAX_ORDER_QUANTITY}.`;
    if (!isAmount(tier.price) || amountOf(tier.price) <= 0) return "Chaque prix doit être supérieur à zéro.";
    if (seen.has(Number(tier.minQuantity))) return "Deux paliers ne peuvent pas avoir la même quantité.";
    seen.add(Number(tier.minQuantity));
  }
  const sorted = [...tiers].sort((a, b) => Number(a.minQuantity) - Number(b.minQuantity));
  for (let index = 1; index < sorted.length; index += 1) {
    if (amountOf(sorted[index].price) >= amountOf(sorted[index - 1].price)) return "Le prix doit baisser quand la quantité augmente.";
  }
  return null;
}

/** The pictures the product will have once saved. */
export function keptPhotos(form: Pick<ProductForm, "photos">): PhotoDraft[] {
  return form.photos.filter((photo) => !photo.removed);
}

/** Text of the rich description, for "is there a description" checks. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateForm(form: ProductForm, intent: SaveIntent): FormErrors {
  const errors: FormErrors = {};
  const submit = intent === "submit";
  const name = form.name.trim();

  if (!name) errors.name = "Donnez un nom au produit.";
  else if (name.length > 200) errors.name = "Le nom ne peut pas dépasser 200 caractères.";
  else if (submit && name.length < 3) errors.name = "Le nom doit compter au moins 3 caractères.";

  if (submit && form.categoryIds.length === 0) errors.categoryIds = "Choisissez une catégorie.";
  if (submit && !plainText(form.descriptionHtml)) errors.descriptionHtml = "Décrivez le produit : la validation le demande.";
  if (submit && keptPhotos(form).length === 0) errors.photos = "Ajoutez au moins une photo : la validation le demande.";
  if (form.photos.some((photo) => photo.detour === "processing")) errors.photos = "Un détourage est en cours. Attendez qu'il se termine.";

  if (form.price.trim() === "") {
    if (submit) errors.price = "Indiquez le prix de vente.";
  } else if (!isAmount(form.price)) errors.price = "Le prix est un nombre, sans espace ni devise.";
  else if (submit && amountOf(form.price) <= 0) errors.price = "Le prix doit être supérieur à zéro.";

  if (form.compareAtPrice.trim() !== "") {
    if (!isAmount(form.compareAtPrice)) errors.compareAtPrice = "Le prix barré est un nombre, sans espace ni devise.";
    else if (isAmount(form.price) && amountOf(form.compareAtPrice) < amountOf(form.price)) {
      errors.compareAtPrice = "Le prix barré doit être supérieur ou égal au prix de vente.";
    }
  }

  if (form.weight.trim() !== "" && (!isAmount(form.weight) || amountOf(form.weight) <= 0)) errors.weight = "Le poids est un nombre supérieur à zéro.";
  if (!isInteger(form.minOrderQuantity, 1, MAX_ORDER_QUANTITY)) errors.minOrderQuantity = `Un entier entre 1 et ${MAX_ORDER_QUANTITY}.`;
  if (!isInteger(form.lowStockThreshold, 0)) errors.lowStockThreshold = "Un entier positif ou nul.";

  if (form.hasTiers) {
    const error = tiersError(form.tiers);
    if (error) errors.tiers = error;
  }

  if (!form.hasVariants) {
    if (form.stock.trim() !== "" && !isInteger(form.stock, 0)) errors.stock = "Le stock est un entier positif ou nul.";
    return errors;
  }

  const names = form.axes.map((axis) => axis.name.trim().toLocaleLowerCase("fr"));
  if (form.axes.length === 0) errors.axes = "Ajoutez une option, par exemple Taille ou Couleur.";
  else if (names.some((axisName) => !axisName) || new Set(names).size !== names.length) errors.axes = "Chaque option doit avoir un nom différent.";
  else if (form.axes.some((axis) => axis.values.length === 0)) errors.axes = "Chaque option doit avoir au moins une valeur.";
  else if (form.variants.length > MAX_VARIANTS) errors.axes = `Un produit ne peut pas dépasser ${MAX_VARIANTS} variantes (${form.variants.length} ici).`;

  const skus = new Map<string, string>();
  for (const variant of form.variants) {
    const key = (field: string) => `variant.${variant.id}.${field}`;
    if (!isAmount(variant.price) || amountOf(variant.price) <= 0) errors[key("price")] = "Prix supérieur à zéro.";
    if (!isInteger(variant.stock, 0)) errors[key("stock")] = "Entier positif ou nul.";
    if (!isInteger(variant.minOrderQuantity, 1, MAX_ORDER_QUANTITY)) errors[key("minOrderQuantity")] = `Entre 1 et ${MAX_ORDER_QUANTITY}.`;
    if (!isInteger(variant.lowStockThreshold, 0)) errors[key("lowStockThreshold")] = "Entier positif ou nul.";
    if (variant.sku.trim().length > 64) errors[key("sku")] = "64 caractères au plus.";

    const sku = variant.sku.trim().toLocaleLowerCase("fr");
    if (sku) {
      if (skus.has(sku)) errors[key("sku")] = "Cette référence est déjà utilisée par une autre variante.";
      skus.set(sku, variant.id);
    }
    if (variant.tiers.length > 0) {
      const error = tiersError(variant.tiers);
      if (error) errors[key("tiers")] = error;
    }
  }

  return errors;
}

/** Errors of one variant, for its row. */
export function variantErrors(errors: FormErrors, variantId: string): Record<string, string> {
  const prefix = `variant.${variantId}.`;
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message]),
  );
}

// ── Request ─────────────────────────────────────────────────

const flag = (value: boolean) => (value ? "1" : "0");

function appendTiers(body: FormData, prefix: string, tiers: PriceTier[]) {
  tiers.forEach((tier, index) => {
    body.append(`${prefix}[${index}][minQty]`, tier.minQuantity.trim());
    body.append(`${prefix}[${index}][price]`, String(amountOf(tier.price)));
  });
}

/**
 * Multipart body of `POST sellers/products` (create) and of its update.
 *
 * `mode: "create"` saves a draft. `mode: "update"` leaves the status alone:
 * it only changes through moderation.
 */
export function buildProductBody(form: ProductForm, mode: "create" | "update"): FormData {
  const body = new FormData();
  if (mode === "update") body.append("_method", "PUT");
  else body.append("status", "draft");

  body.append("name", form.name.trim());
  body.append("description", form.descriptionHtml);
  body.append("price", String(isAmount(form.price) ? amountOf(form.price) : 0));
  // Sent empty to clear a crossed-out price.
  body.append("compareAtPrice", isAmount(form.compareAtPrice) ? String(amountOf(form.compareAtPrice)) : "");
  body.append("currency", "XOF");
  body.append("minOrderQuantity", form.minOrderQuantity.trim());
  body.append("trackStock", flag(form.trackStock));
  body.append("lowStockThreshold", form.lowStockThreshold.trim());
  body.append("allowBackorder", flag(false));

  if (form.categoryIds.length > 0) body.append("primary_category_id", form.categoryIds[0]);
  form.categoryIds.forEach((id) => body.append("category[]", id));
  if (form.originCountry) body.append("country_of_origin", form.originCountry);
  if (isAmount(form.weight)) {
    body.append("weight", String(amountOf(form.weight)));
    body.append("weightUnit", form.weightUnit);
  }

  body.append("hasBulkPricing", flag(form.hasTiers));
  if (form.hasTiers) appendTiers(body, "bulkPrices", form.tiers);

  const hasVariants = form.hasVariants && form.variants.length > 0;
  body.append("hasVariants", flag(hasVariants));
  if (hasVariants) {
    form.variants.forEach((variant, index) => {
      const prefix = `variants[${index}]`;
      for (const [axis, value] of Object.entries(variant.combination)) body.append(`${prefix}[options][${axis}]`, value);
      body.append(`${prefix}[price]`, String(amountOf(variant.price)));
      body.append(`${prefix}[stock]`, variant.stock.trim());
      if (variant.sku.trim()) body.append(`${prefix}[sku]`, variant.sku.trim());
      body.append(`${prefix}[minOrderQuantity]`, variant.minOrderQuantity.trim());
      body.append(`${prefix}[lowStockThreshold]`, variant.lowStockThreshold.trim());
      body.append(`${prefix}[trackStock]`, flag(form.trackStock));
      body.append(`${prefix}[allowBackorder]`, flag(variant.allowBackorder));
      appendTiers(body, `${prefix}[bulkPrices]`, variant.tiers);
    });
  } else {
    body.append("stock", isInteger(form.stock, 0) ? form.stock.trim() : "0");
  }

  // ── Pictures ──
  const kept = keptPhotos(form);
  // A detoured version the seller accepted: the backend adds it next to the
  // original, which it keeps.
  const detoured = kept.filter((photo) => photo.detour === "accepted" && photo.previewId);
  detoured.forEach((photo) => body.append("background_removal_preview_ids[]", photo.previewId as string));
  const mainDetoured = detoured.find((photo) => photo.isMain);
  if (mainDetoured) body.append("background_removal_main_preview_id", mainDetoured.previewId as string);

  // New files sent as they are. The cover comes first: at creation the
  // storefront takes the first picture of the collection.
  const files = kept
    .filter((photo) => photo.file && !(photo.detour === "accepted" && photo.previewId))
    .sort((a, b) => Number(b.isMain) - Number(a.isMain));
  files.forEach((photo) => body.append(mode === "create" ? "images[]" : "gallery[]", photo.file as File));

  if (mode === "update") {
    form.photos.filter((photo) => photo.removed && photo.mediaId).forEach((photo) => body.append("remove_media_ids[]", photo.mediaId as string));
    const mainStored = kept.find((photo) => photo.isMain && photo.mediaId && !(photo.detour === "accepted" && photo.previewId));
    if (mainStored) body.append("main_media_id", mainStored.mediaId as string);
  }

  return body;
}
