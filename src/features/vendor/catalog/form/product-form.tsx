"use client";

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Circle, Pencil, Save, Send, X } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  FormActions,
  FormField,
  IconButton,
  Input,
  Money,
  PageHeader,
  Section,
  Select,
  StatusBadge,
  Stepper,
  Switch,
  asFrancs,
  cn,
  formatMoneyFromFrancs,
  type StepDefinition,
} from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import type { ProductCategoryOption } from "../api";
import { ProductImage, formatUnits } from "../components/product-bits";
import type { ProductDetail } from "../contract";
import { describeFailure } from "../errors";
import { useProductCategoryOptions, useSaveProduct, useSubmitProduct } from "../hooks";
import {
  EMPTY_FORM,
  ORIGIN_COUNTRIES,
  buildProductBody,
  combinationLabel,
  formFromProduct,
  keptPhotos,
  plainText,
  validateForm,
  type FormErrors,
  type ProductForm as FormState,
  type SaveIntent,
} from "./model";
import { PhotosField } from "./photos-field";
import { RichText } from "./rich-text";
import { RichTextEditor } from "./rich-text-editor";
import { TiersEditor, VariantsField } from "./variants-field";

// ============================================================
// Product form, in four steps (creation and edition):
//   1. Informations   2. Photos   3. Prix et stock   4. Récapitulatif
//
// The steps are a way through the form, not a gate: a draft can be saved
// from any of them, and the steps of an existing product are all a tap away.
// Publication is not decided here: "Soumettre à validation" queues the
// product for moderation.
// ============================================================

const STEPS: StepDefinition[] = [
  { id: "informations", label: "Informations" },
  { id: "photos", label: "Photos" },
  { id: "pricing", label: "Prix et stock" },
  { id: "review", label: "Récapitulatif" },
];
const REVIEW = STEPS.length - 1;

/** Label, control id and step of each field, for the error summary. */
const FIELDS: Record<string, { label: string; id: string; step: number }> = {
  name: { label: "Nom du produit", id: "product-name", step: 0 },
  categoryIds: { label: "Catégorie", id: "product-category", step: 0 },
  descriptionHtml: { label: "Description", id: "product-description", step: 0 },
  weight: { label: "Poids", id: "product-weight", step: 0 },
  photos: { label: "Photos", id: "product-photos", step: 1 },
  price: { label: "Prix de vente", id: "product-price", step: 2 },
  compareAtPrice: { label: "Prix barré", id: "product-compare-price", step: 2 },
  stock: { label: "Stock", id: "product-stock", step: 2 },
  minOrderQuantity: { label: "Quantité minimale", id: "product-min-quantity", step: 2 },
  lowStockThreshold: { label: "Seuil d'alerte", id: "product-threshold", step: 2 },
  tiers: { label: "Prix par quantité", id: "product-tiers", step: 2 },
  axes: { label: "Options des variantes", id: "product-variants", step: 2 },
  variants: { label: "Variantes", id: "product-variants", step: 2 },
};

/** Field of a Laravel validation error → field of the form. */
const SERVER_FIELD: Record<string, string> = {
  name: "name",
  description: "descriptionHtml",
  price: "price",
  compareAtPrice: "compareAtPrice",
  stock: "stock",
  stockQuantity: "stock",
  minOrderQuantity: "minOrderQuantity",
  lowStockThreshold: "lowStockThreshold",
  weight: "weight",
  primary_category_id: "categoryIds",
  category: "categoryIds",
  images: "photos",
  gallery: "photos",
  bulkPrices: "tiers",
  variants: "variants",
};

/** What saving changes for a product that is not waiting for the seller. */
const STATUS_NOTE: Record<string, { title: string; body: string }> = {
  active: { title: "Ce produit est en ligne", body: "Vos modifications sont visibles par les acheteurs dès l'enregistrement." },
  submitted: { title: "En cours de validation", body: "Vous pouvez encore corriger ce produit : l'équipe SUGU verra la version enregistrée." },
  suspended: { title: "Ce produit est suspendu", body: "Vous pouvez le corriger, mais seule l'équipe SUGU peut le remettre en vente." },
  archived: { title: "Ce produit est archivé", body: "Il n'est plus proposé aux acheteurs. Vos modifications sont enregistrées sans le remettre en vente." },
};

/** A product moderation sent back to the seller. */
const CORRECTION: Record<string, { tone: "warning" | "danger"; title: string }> = {
  rejected: { tone: "danger", title: "Ce produit a été rejeté" },
  changes_requested: { tone: "warning", title: "Des corrections sont demandées" },
};

const stepOfError = (key: string) => (key.startsWith("variant.") ? 2 : (FIELDS[key]?.step ?? 0));

/** Variant errors are shown on their rows; the summary counts them once. */
function summarised(errors: FormErrors): FormErrors {
  const summary: FormErrors = {};
  let variantCount = 0;
  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith("variant.")) variantCount += 1;
    else summary[key] = message;
  }
  if (variantCount > 0 && !summary.variants) {
    summary.variants = variantCount > 1 ? `${variantCount} valeurs à corriger dans les variantes.` : "Une valeur à corriger dans les variantes.";
  }
  return summary;
}

function serverErrors(error: unknown): FormErrors {
  if (!(error instanceof ApiError)) return {};
  const mapped: FormErrors = {};
  for (const [key, messages] of Object.entries(error.errors ?? {})) {
    const field = SERVER_FIELD[key.split(".")[0]];
    if (field && messages[0] && !mapped[field]) mapped[field] = messages[0];
  }
  return mapped;
}

/** What moderation needs, and the step where each is filled. */
function readiness(form: FormState) {
  return [
    { label: "Un nom d'au moins 3 caractères", done: form.name.trim().length >= 3, step: 0 },
    { label: "Une catégorie", done: form.categoryIds.length > 0, step: 0 },
    { label: "Une description", done: plainText(form.descriptionHtml).length > 0, step: 0 },
    { label: "Au moins une photo", done: keptPhotos(form).length > 0, step: 1 },
    { label: "Un prix de vente", done: Number(form.price.replace(",", ".")) > 0, step: 2 },
  ];
}

type SetForm = Dispatch<SetStateAction<FormState>>;
type SetField = <K extends keyof FormState>(field: K, value: FormState[K]) => void;

export function ProductForm({ product }: { product?: ProductDetail }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [form, setForm] = useState<FormState>(() => (product ? formFromProduct(product) : EMPTY_FORM));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [running, setRunning] = useState<SaveIntent | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const steps = useRef<HTMLDivElement>(null);
  // Counts the moves between steps and the refusals: each one brings the
  // reader back to the top of the step.
  const [moves, setMoves] = useState(0);

  const categories = useProductCategoryOptions();
  const save = useSaveProduct();
  const submit = useSubmitProduct();

  // A new product, or one the workflow allows to submit again.
  const canSubmit = product ? product.canSubmit : true;
  const set: SetField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const summary = useMemo(() => summarised(errors), [errors]);
  // A step is ticked once nothing moderation asks for is missing from it.
  const completedSteps = useMemo(() => {
    const checks = readiness(form);
    return STEPS.slice(0, REVIEW)
      .filter((_, index) => checks.filter((check) => check.step === index).every((check) => check.done))
      .map((item) => item.id);
  }, [form]);
  const errorSteps = useMemo(() => [...new Set(Object.keys(errors).map(stepOfError))].map((index) => STEPS[index].id), [errors]);
  const busy = running !== null;
  const last = step === REVIEW;

  const note = product && !canSubmit ? STATUS_NOTE[product.status] : undefined;
  const correction = product ? CORRECTION[product.status] : undefined;
  // Saving never changes the status: only a draft is saved "as a draft".
  const isDraft = !product || product.status === "draft";
  const saveLabel = isDraft ? "Enregistrer le brouillon" : "Enregistrer les modifications";
  const cancelHref = product ? `/vendor/products/${product.id}` : "/vendor/products";

  // A new step starts at its top, under the steps that say where it stands,
  // and with its title announced.
  useEffect(() => {
    if (moves === 0) return;
    steps.current?.scrollIntoView({ block: "start" });
    heading.current?.focus({ preventScroll: true });
  }, [moves]);

  /** Shows errors and goes to the first step that holds one. */
  function refuse(found: FormErrors, message: string | null = null) {
    setErrors(found);
    setFailure(message);
    const steps = Object.keys(found).map(stepOfError);
    if (steps.length > 0 && !steps.includes(step)) setStep(Math.min(...steps));
    setMoves((count) => count + 1);
  }

  /**
   * Going back is free. Going forward checks what was filled on the way: a
   * malformed value is fixed where it is, not discovered at the end.
   */
  function goTo(target: number) {
    if (busy || target === step) return;
    if (target > step) {
      const found = Object.fromEntries(Object.entries(validateForm(form, "draft")).filter(([key]) => stepOfError(key) < target));
      if (Object.keys(found).length > 0) {
        refuse(found);
        return;
      }
    }
    setErrors({});
    setFailure(null);
    setStep(target);
    setMoves((count) => count + 1);
  }

  async function run(intent: SaveIntent) {
    if (busy) return;
    const found = validateForm(form, intent);
    if (Object.keys(found).length > 0) {
      refuse(found);
      return;
    }

    setRunning(intent);
    setErrors({});
    setFailure(null);

    let id: string;
    try {
      id = await save.mutateAsync({ body: buildProductBody(form, editing ? "update" : "create"), id: product?.id });
    } catch (error) {
      setRunning(null);
      const fields = serverErrors(error);
      refuse(fields, Object.keys(fields).length > 0 ? null : `Le produit n'a pas été enregistré. ${describeFailure(error).message}`);
      return;
    }

    if (intent === "draft") {
      toast.success(editing ? "Modifications enregistrées." : "Brouillon enregistré.");
      router.push(`/vendor/products/${id}`);
      return;
    }

    try {
      await submit.mutateAsync(id);
      toast.success("Produit soumis à validation.");
    } catch (error) {
      // Saved, but not queued: the product page says why and offers to retry.
      toast.error(`Le produit est enregistré, mais n'a pas pu être soumis. ${describeFailure(error).message}`);
    }
    router.push(`/vendor/products/${id}`);
  }

  const errorCount = Object.keys(summary).length;

  return (
    <form
      className="sugu-ui mx-auto flex w-full max-w-3xl flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        // Enter in a field moves on; it never saves by surprise.
        event.preventDefault();
        if (!last) goTo(step + 1);
      }}
    >
      <PageHeader
        title={product ? `Modifier « ${product.name} »` : "Nouveau produit"}
        breadcrumbs={
          product
            ? [{ label: "Produits", href: "/vendor/products" }, { label: product.name, href: `/vendor/products/${product.id}` }, { label: "Modifier" }]
            : [{ label: "Produits", href: "/vendor/products" }, { label: "Nouveau produit" }]
        }
        titleAddon={product ? <StatusBadge domain="product" code={product.status} /> : undefined}
      />

      {/* Why the product was sent back: read before correcting it. */}
      {product && correction && (
        <Alert tone={correction.tone} title={correction.title}>
          {product.moderation?.reason ? <span className="block font-medium">Motif : {product.moderation.reason}</span> : null}
          {product.moderation?.note && product.moderation.note !== product.moderation.reason ? <span className="block">{product.moderation.note}</span> : null}
          <span className="block">Corrigez le produit, puis soumettez-le à nouveau.</span>
        </Alert>
      )}
      {note && (
        <Alert tone="info" title={note.title}>
          {note.body}
        </Alert>
      )}

      <div ref={steps} className="scroll-mt-4">
        <Stepper
          steps={STEPS}
          currentStep={step}
          errorSteps={errorSteps}
          completedSteps={completedSteps}
          label={product ? "Étapes de la modification du produit" : "Étapes de la création du produit"}
          onStepSelect={goTo}
        />
      </div>

      <h2 ref={heading} tabIndex={-1} className="sr-only">
        Étape {step + 1} sur {STEPS.length} : {STEPS[step].label}
      </h2>

      {(failure || errorCount > 0) && (
        <div className="flex flex-col gap-3" role="alert">
          {failure && (
            <Alert tone="danger" title="Enregistrement impossible">
              {failure}
            </Alert>
          )}
          {errorCount > 0 && (
            <Alert tone="danger" title={errorCount === 1 ? "1 champ à corriger" : `${errorCount} champs à corriger`}>
              <ul className="mt-1 flex flex-col gap-1">
                {Object.entries(summary).map(([key, message]) => {
                  const field = FIELDS[key];
                  return (
                    <li key={key}>
                      <span className="font-medium">{field?.label ?? key} :</span> {message}
                      {field && field.step !== step && (
                        <>
                          {" "}
                          <button
                            type="button"
                            className="rounded-compact font-medium underline underline-offset-2"
                            onClick={() => {
                              setStep(field.step);
                              setMoves((count) => count + 1);
                            }}
                          >
                            Aller à l&apos;étape {STEPS[field.step].label}
                          </button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Alert>
          )}
        </div>
      )}

      {step === 0 && (
        <StepInformations form={form} set={set} errors={errors} categories={categories.data ?? []} categoriesLoading={categories.isLoading} categoriesFailed={categories.isError} />
      )}
      {step === 1 && <StepPhotos form={form} setForm={setForm} productId={product?.id} error={errors.photos} />}
      {step === 2 && <StepPricing form={form} set={set} setForm={setForm} errors={errors} />}
      {step === REVIEW && <StepReview form={form} categories={categories.data ?? []} canSubmit={canSubmit} editing={editing} saveLabel={saveLabel} isDraft={isDraft} goTo={goTo} />}

      {/* On a phone the bar holds the decisions; leaving the form is a link above it. */}
      <Link
        href={cancelHref}
        className={cn("self-center rounded-button px-3 py-2 text-body text-foreground-muted underline underline-offset-2 md:hidden", busy && "pointer-events-none opacity-60")}
      >
        Annuler et quitter le formulaire
      </Link>

      <FormActions sticky>
        <Button asChild variant="quiet" className={cn("hidden md:inline-flex", busy && "pointer-events-none opacity-60")}>
          <Link href={cancelHref}>Annuler</Link>
        </Button>

        {step > 0 && (
          <>
            <Button icon={ArrowLeft} onClick={() => goTo(step - 1)} disabled={busy} className="hidden md:inline-flex">
              Précédent
            </Button>
            {/* On a phone the final step needs the width for its two decisions: the stepper goes back. */}
            {!(last && canSubmit) && (
              <IconButton icon={ArrowLeft} label="Étape précédente" variant="secondary" tooltip={false} onClick={() => goTo(step - 1)} disabled={busy} className="md:hidden" />
            )}
          </>
        )}

        {/* Saving is offered at every step: a product can be left half-filled. */}
        {(canSubmit || !last) && (
          <Button variant="secondary" loading={running === "draft"} disabled={busy} onClick={() => run("draft")} aria-label={saveLabel}>
            <Save className="hidden size-4 shrink-0 md:block" aria-hidden="true" />
            <span className="md:hidden">{isDraft ? "Brouillon" : "Enregistrer"}</span>
            <span className="hidden md:inline">{saveLabel}</span>
          </Button>
        )}

        {!last ? (
          <Button variant="primary" trailingIcon={ArrowRight} onClick={() => goTo(step + 1)} disabled={busy}>
            Suivant
          </Button>
        ) : canSubmit ? (
          <Button variant="primary" icon={Send} loading={running === "submit"} disabled={busy} onClick={() => run("submit")}>
            Soumettre à validation
          </Button>
        ) : (
          <Button variant="primary" icon={Save} loading={running === "draft"} disabled={busy} onClick={() => run("draft")}>
            {saveLabel}
          </Button>
        )}
      </FormActions>
    </form>
  );
}

// ── Step 1: Informations ────────────────────────────────────

function StepInformations({
  form,
  set,
  errors,
  categories,
  categoriesLoading,
  categoriesFailed,
}: {
  form: FormState;
  set: SetField;
  errors: FormErrors;
  categories: ProductCategoryOption[];
  categoriesLoading: boolean;
  categoriesFailed: boolean;
}) {
  return (
    <>
      <Card className="@container">
        <Section title="Informations générales" description="Ce que les acheteurs lisent en premier." headingLevel={3}>
          <FormField id={FIELDS.name.id} label="Nom du produit" required error={errors.name} hint="Tel que les acheteurs le verront.">
            <Input value={form.name} maxLength={200} onChange={(event) => set("name", event.target.value)} autoComplete="off" />
          </FormField>

          <CategoryField value={form.categoryIds} onChange={(ids) => set("categoryIds", ids)} options={categories} loading={categoriesLoading} failed={categoriesFailed} error={errors.categoryIds} />

          <DescriptionField value={form.descriptionHtml} onChange={(html) => set("descriptionHtml", html)} error={errors.descriptionHtml} />
        </Section>
      </Card>

      <Card className="@container">
        <Section title="Livraison" description="Facultatif. Ces informations aident les agences à estimer le transport." headingLevel={3}>
          <div className="grid grid-cols-1 items-start gap-3 @md:grid-cols-2">
            <FormField id={FIELDS.weight.id} label="Poids" error={errors.weight}>
              <div className="flex gap-2">
                <Input inputMode="decimal" value={form.weight} onChange={(event) => set("weight", event.target.value)} className="min-w-0 flex-1" />
                <Select
                  aria-label="Unité de poids"
                  value={form.weightUnit}
                  onChange={(event) => set("weightUnit", event.target.value as FormState["weightUnit"])}
                  options={[
                    { value: "g", label: "grammes" },
                    { value: "kg", label: "kilogrammes" },
                  ]}
                  className="w-36"
                />
              </div>
            </FormField>
            <FormField label="Pays d'origine">
              <Select value={form.originCountry} onChange={(event) => set("originCountry", event.target.value)} placeholder="Non précisé" options={ORIGIN_COUNTRIES} />
            </FormField>
          </div>
        </Section>
      </Card>
    </>
  );
}

function CategoryField({ value, onChange, options, loading, failed, error }: { value: string[]; onChange: (ids: string[]) => void; options: ProductCategoryOption[]; loading: boolean; failed: boolean; error?: string }) {
  const selected = value.map((id) => options.find((option) => option.id === id) ?? { id, name: "Catégorie enregistrée" });
  const remaining = options.filter((option) => !value.includes(option.id));

  return (
    <FormField
      id={FIELDS.categoryIds.id}
      label="Catégorie"
      required
      error={error}
      hint={failed ? "Les catégories n'ont pas pu être chargées. Rechargez la page pour en choisir une." : value.length > 1 ? "La première est la catégorie principale." : undefined}
    >
      <div className="flex flex-col gap-2">
        {selected.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Catégories choisies">
            {selected.map((category, index) => (
              <li key={category.id} className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface-subtle py-0.5 pr-1 pl-2.5 text-meta text-foreground">
                {category.name}
                {index === 0 && value.length > 1 && <span className="text-foreground-muted">· principale</span>}
                <button
                  type="button"
                  aria-label={`Retirer la catégorie ${category.name}`}
                  onClick={() => onChange(value.filter((id) => id !== category.id))}
                  className="flex size-5 items-center justify-center rounded-pill text-foreground-muted hover:bg-surface-hover hover:text-foreground touch:size-8"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Select
          value=""
          disabled={loading || failed || remaining.length === 0}
          placeholder={loading ? "Chargement des catégories…" : value.length === 0 ? "Choisir une catégorie" : "Ajouter une autre catégorie"}
          options={remaining.map((option) => ({ value: option.id, label: option.name }))}
          onChange={(event) => event.target.value && onChange([...value, event.target.value])}
        />
      </div>
    </FormField>
  );
}

/**
 * The description, laid out exactly like a `FormField`. The editable area is
 * not a form control: it carries its own name, hint and error.
 */
function DescriptionField({ value, onChange, error }: { value: string; onChange: (html: string) => void; error?: string }) {
  const id = FIELDS.descriptionHtml.id;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="text-label text-foreground" aria-hidden="true">
        Description
      </p>
      <RichTextEditor
        id={id}
        label="Description"
        value={value}
        onChange={onChange}
        describedBy={error ? `${id}-error ${id}-hint` : `${id}-hint`}
        invalid={Boolean(error)}
        placeholder="Décrivez votre produit"
      />
      <p id={`${id}-hint`} className="text-meta text-foreground-muted">
        Matière, dimensions, usage, entretien : ce qui aide à choisir.
      </p>
      {/* Always mounted so that a message appearing later is announced. */}
      <p id={`${id}-error`} role="alert" className={cn("flex items-start gap-1 text-meta text-danger-fg", !error && "hidden")}>
        {error && (
          <>
            <AlertCircle className="mt-px size-3.5 shrink-0 text-danger-icon" aria-hidden="true" />
            <span>{error}</span>
          </>
        )}
      </p>
    </div>
  );
}

// ── Step 2: Photos ──────────────────────────────────────────

function StepPhotos({ form, setForm, productId, error }: { form: FormState; setForm: SetForm; productId?: string; error?: string }) {
  return (
    <Card className="@container" id={FIELDS.photos.id}>
      <Section title="Photos du produit" description="La photo principale est celle des listes et des résultats de recherche." headingLevel={3}>
        <PhotosField photos={form.photos} setForm={setForm} productId={productId} error={error} />
        <ul className="flex list-disc flex-col gap-0.5 pl-5 text-meta text-foreground-muted">
          <li>Un fond clair et uni met le produit en valeur.</li>
          <li>Montrez le produit entier, puis ses détails.</li>
        </ul>
      </Section>
    </Card>
  );
}

// ── Step 3: Prix et stock ───────────────────────────────────

function StepPricing({ form, set, setForm, errors }: { form: FormState; set: SetField; setForm: SetForm; errors: FormErrors }) {
  const id = useId();
  return (
    <>
      <Card className="@container">
        <Section title="Prix et stock" headingLevel={3}>
          {/* Short figures go by pairs, on a phone too: less scrolling, same reading order. */}
          <div className="grid grid-cols-2 items-start gap-3">
            <FormField id={FIELDS.price.id} label="Prix de vente" required error={errors.price} hint={form.hasVariants ? "Prix de départ des variantes." : undefined}>
              <Input inputMode="decimal" value={form.price} onChange={(event) => set("price", event.target.value)} suffix="FCFA" />
            </FormField>
            <FormField id={FIELDS.compareAtPrice.id} label="Prix barré" error={errors.compareAtPrice} hint="Facultatif : l'ancien prix.">
              <Input inputMode="decimal" value={form.compareAtPrice} onChange={(event) => set("compareAtPrice", event.target.value)} suffix="FCFA" />
            </FormField>
            {!form.hasVariants && (
              <FormField id={FIELDS.stock.id} label="Stock" error={errors.stock} hint="Unités à vendre.">
                <Input inputMode="numeric" value={form.stock} onChange={(event) => set("stock", event.target.value)} />
              </FormField>
            )}
            <FormField id={FIELDS.lowStockThreshold.id} label="Seuil d'alerte" error={errors.lowStockThreshold} hint="Stock faible sous ce seuil.">
              <Input inputMode="numeric" value={form.lowStockThreshold} onChange={(event) => set("lowStockThreshold", event.target.value)} />
            </FormField>
            <FormField id={FIELDS.minOrderQuantity.id} label="Quantité minimale" error={errors.minOrderQuantity} hint="Par commande." className={cn(!form.hasVariants && "col-span-2 @md:col-span-1")}>
              <Input inputMode="numeric" value={form.minOrderQuantity} onChange={(event) => set("minOrderQuantity", event.target.value)} />
            </FormField>
          </div>

          <Checkbox
            label="Suivre le stock de ce produit"
            description="Chaque vente diminue le stock ; le produit passe en rupture à zéro."
            checked={form.trackStock}
            onChange={(event) => set("trackStock", event.target.checked)}
          />

          <Disclosure
            id={`${id}-tiers`}
            anchor={FIELDS.tiers.id}
            label="Prix par quantité"
            description="Un prix unitaire plus bas à partir d'une certaine quantité."
            checked={form.hasTiers}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, hasTiers: checked }))}
          >
            <TiersEditor tiers={form.tiers} onChange={(tiers) => set("tiers", tiers)} error={errors.tiers} legend="Prix par quantité du produit" />
          </Disclosure>
        </Section>
      </Card>

      <Card className="@container" id={FIELDS.axes.id}>
        <Section title="Variantes" description="Pour un produit vendu en plusieurs tailles, couleurs ou formats." headingLevel={3}>
          <Disclosure
            id={`${id}-variants`}
            label="Ce produit a des variantes"
            description="Chaque variante a son prix, son stock et sa référence."
            checked={form.hasVariants}
            onCheckedChange={(checked) => setForm((current) => ({ ...current, hasVariants: checked }))}
          >
            <VariantsField form={form} setForm={setForm} errors={errors} />
          </Disclosure>
        </Section>
      </Card>
    </>
  );
}

/** A switch that reveals what it turns on: the form stays short until asked. */
function Disclosure({
  id,
  anchor,
  label,
  description,
  checked,
  onCheckedChange,
  children,
}: {
  id: string;
  anchor?: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div id={anchor} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id={`${id}-label`} className="text-body font-medium text-foreground">
            {label}
          </p>
          <p id={`${id}-hint`} className="text-meta text-foreground-muted">
            {description}
          </p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} aria-controls={`${id}-panel`} />
      </div>
      {checked && (
        <div id={`${id}-panel`} className="flex flex-col gap-3 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Step 4: Récapitulatif ───────────────────────────────────

/** One block of the summary, with the way back to its step. */
function ReviewBlock({ title, step, goTo, children }: { title: string; step: number; goTo: (step: number) => void; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-label font-medium text-foreground-muted">{title}</h4>
        <Button size="compact" variant="quiet" icon={Pencil} onClick={() => goTo(step)} aria-label={`Modifier : ${title}`}>
          Modifier
        </Button>
      </div>
      {children}
    </section>
  );
}

const missing = (text: string) => <span className="text-foreground-muted">{text}</span>;
const amountOf = (text: string) => Number(text.trim().replace(",", ".")) || 0;

function StepReview({
  form,
  categories,
  canSubmit,
  editing,
  saveLabel,
  isDraft,
  goTo,
}: {
  form: FormState;
  categories: ProductCategoryOption[];
  canSubmit: boolean;
  editing: boolean;
  saveLabel: string;
  isDraft: boolean;
  goTo: (step: number) => void;
}) {
  const photos = keptPhotos(form);
  const removed = form.photos.length - photos.length;
  const checks = readiness(form);
  const done = checks.filter((check) => check.done).length;
  const price = amountOf(form.price);
  const comparePrice = amountOf(form.compareAtPrice);
  const categoryNames = form.categoryIds.map((id) => categories.find((category) => category.id === id)?.name ?? "Catégorie enregistrée");
  const origin = ORIGIN_COUNTRIES.find((country) => country.value === form.originCountry)?.label;
  const withVariants = form.hasVariants && form.variants.length > 0;
  const totalStock = withVariants ? form.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0) : Number(form.stock) || 0;

  return (
    <>
      <Card className="@container">
        <Section title="Récapitulatif" description="Relisez le produit tel qu'il sera enregistré." headingLevel={3}>
          <div className="divide-y divide-border">
            <ReviewBlock title="Informations" step={0} goTo={goTo}>
              <p className="text-section-title break-words text-foreground">{form.name.trim() || missing("Sans nom")}</p>
              <p className="text-body text-foreground">{categoryNames.length > 0 ? categoryNames.join(" · ") : missing("Aucune catégorie")}</p>
              {plainText(form.descriptionHtml) ? (
                <div className="max-h-40 overflow-hidden rounded-control border border-border bg-surface-subtle p-3">
                  <RichText html={form.descriptionHtml} />
                </div>
              ) : (
                <p className="text-body">{missing("Aucune description")}</p>
              )}
              {(form.weight.trim() || origin) && (
                <p className="text-meta text-foreground-muted">
                  {[form.weight.trim() ? `Poids : ${form.weight.trim()} ${form.weightUnit}` : null, origin ? `Origine : ${origin}` : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </ReviewBlock>

            <ReviewBlock title="Photos" step={1} goTo={goTo}>
              {photos.length > 0 ? (
                <ul className="flex flex-wrap gap-2" aria-label="Photos retenues">
                  {photos.map((photo, index) => (
                    <li key={photo.key} className={cn("relative size-16 overflow-hidden rounded-control border bg-surface-subtle", photo.isMain ? "border-primary ring-1 ring-primary" : "border-border")}>
                      <ProductImage src={photo.url} alt={`Photo ${index + 1}${photo.isMain ? ", principale" : ""}`} sizes="64px" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-body">{missing("Aucune photo")}</p>
              )}
              {removed > 0 && (
                <p className="text-meta text-warning-fg">
                  {removed > 1 ? `${removed} photos seront retirées` : "1 photo sera retirée"} à l&apos;enregistrement.
                </p>
              )}
            </ReviewBlock>

            <ReviewBlock title="Prix et stock" step={2} goTo={goTo}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 @md:grid-cols-3">
                <div>
                  <dt className="text-meta text-foreground-muted">Prix de vente</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-2 text-body text-foreground">
                    {price > 0 ? <Money francs={asFrancs(price)} className="text-section-title" /> : missing("Non renseigné")}
                    {comparePrice > 0 && (
                      <span className="text-meta text-foreground-muted line-through">
                        <Money francs={asFrancs(comparePrice)} />
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-meta text-foreground-muted">Stock</dt>
                  <dd className="text-section-title text-foreground tabular-nums">
                    {formatUnits(totalStock)} unité{totalStock > 1 ? "s" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-meta text-foreground-muted">Quantité minimale</dt>
                  <dd className="text-body text-foreground tabular-nums">{form.minOrderQuantity || "1"}</dd>
                </div>
              </dl>

              {withVariants && (
                <ul className="divide-y divide-border rounded-control border border-border" aria-label="Variantes">
                  {form.variants.map((variant) => (
                    <li key={variant.id} className="flex items-baseline justify-between gap-3 px-3 py-1.5 text-body">
                      <span className="min-w-0 break-words text-foreground">{combinationLabel(variant.combination)}</span>
                      <span className="shrink-0 text-right text-foreground-muted tabular-nums">
                        {amountOf(variant.price) > 0 ? <Money francs={asFrancs(amountOf(variant.price))} className="text-foreground" /> : "—"} · {variant.stock || "0"} en stock
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {form.hasTiers && form.tiers.length > 0 && (
                <p className="text-meta text-foreground-muted">
                  Prix par quantité : {form.tiers.map((tier) => `${tier.minQuantity} unités et plus à ${formatMoneyFromFrancs(amountOf(tier.price))}`).join(" ; ")}
                </p>
              )}
            </ReviewBlock>
          </div>
        </Section>
      </Card>

      {canSubmit ? (
        <Card>
          <Section title="Prêt pour la validation ?" description={`${done} sur ${checks.length}`} headingLevel={3}>
            <ul className="flex flex-col gap-1">
              {checks.map((check) => (
                <li key={check.label} className="flex items-center justify-between gap-3 text-body">
                  <span className="flex min-w-0 items-start gap-2">
                    {check.done ? (
                      <Check className="mt-0.5 size-4 shrink-0 text-success-icon" aria-hidden="true" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
                    )}
                    <span className={check.done ? "text-foreground" : "text-foreground-muted"}>
                      {check.label}
                      <span className="sr-only">{check.done ? " : fait" : " : à faire"}</span>
                    </span>
                  </span>
                  {!check.done && (
                    <Button size="compact" variant="quiet" onClick={() => goTo(check.step)} aria-label={`Compléter : ${check.label}`}>
                      Compléter
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-meta text-foreground-muted">
              <span className="font-medium text-foreground">{saveLabel}</span>{" "}
              {isDraft ? "garde le produit pour vous seul." : "garde vos corrections sans les envoyer."}{" "}
              <span className="font-medium text-foreground">Soumettre à validation</span> l&apos;envoie à l&apos;équipe SUGU, qui le vérifie avant sa mise en ligne.
            </p>
          </Section>
        </Card>
      ) : (
        editing && <p className="text-meta text-foreground-muted">Le statut du produit ne change pas : seules vos modifications sont enregistrées.</p>
      )}
    </>
  );
}
