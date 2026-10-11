"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Pencil, Send, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  cn,
} from "@/design-system";
import { formatOrderDateTime } from "@/features/vendor/orders/components/order-bits";
import { ProductImage, formatUnits } from "@/features/vendor/catalog/components/product-bits";
import type { ProductDetail, ProductVariant } from "@/features/vendor/catalog/contract";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { ORIGIN_COUNTRIES } from "@/features/vendor/catalog/form/model";
import { RichText } from "@/features/vendor/catalog/form/rich-text";
import { useDeleteProduct, useSubmitProduct } from "@/features/vendor/catalog/hooks";

/** `App\Enums\Products\ProductCondition`. An unknown value is not shown. */
const CONDITION: Record<string, string> = {
  "0": "Neuf",
  new: "Neuf",
  "1": "Reconditionné",
  "2": "Seconde main",
  "3": "Scellé",
  "4": "Comme neuf",
  "5": "Très bon état",
  "6": "Bon état",
  "7": "État acceptable",
  "8": "Pour pièces détachées",
};

/**
 * What moderation asks of the seller, by product status. Statuses that need
 * no explanation (active, archived) have none.
 */
const MODERATION: Record<string, { tone: "info" | "warning" | "danger"; title: string; body: string }> = {
  draft: {
    tone: "info",
    title: "Brouillon",
    body: "Ce produit n'est pas visible par les acheteurs. Soumettez-le à validation pour le mettre en vente.",
  },
  submitted: {
    tone: "info",
    title: "En cours de validation",
    body: "Ce produit a été soumis à l'équipe SUGU. Il sera mis en ligne une fois approuvé.",
  },
  changes_requested: {
    tone: "warning",
    title: "Des corrections sont demandées",
    body: "Modifiez le produit selon la remarque ci-dessous, puis soumettez-le à nouveau.",
  },
  rejected: {
    tone: "danger",
    title: "Ce produit a été rejeté",
    body: "Il n'est pas visible par les acheteurs. Corrigez-le avant de le soumettre à nouveau.",
  },
  suspended: {
    tone: "danger",
    title: "Ce produit est suspendu",
    body: "Il a été retiré de la vente par l'équipe SUGU.",
  },
};

const millimetres = (value: number | null) => (value === null ? "—" : `${formatUnits(value / 10)} cm`);

/** ISO 3166-1 alpha-2 code → French name, for the countries the form offers. */
const COUNTRY: Record<string, string> = Object.fromEntries(ORIGIN_COUNTRIES.map((country) => [country.value, country.label]));

export function ProductDetailContent({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const remove = useDeleteProduct();
  const submit = useSubmitProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const moderation = MODERATION[product.status];
  const main = product.pictures.find((picture) => picture.isMain) ?? product.pictures[0] ?? null;
  const [shownId, setShownId] = useState<string | null>(null);
  const shown = product.pictures.find((picture) => picture.id === shownId) ?? main;
  // A simple product has one unnamed variant: its stock is the product's.
  const variants = product.hasVariants ? product.variants : [];
  const inventoryHref = `/vendor/inventory?q=${encodeURIComponent(product.sku ?? product.name)}`;

  async function deleteProduct() {
    try {
      await remove.mutateAsync(product.id);
      toast.success(`« ${product.name} » a été supprimé.`);
      router.push("/vendor/products");
    } catch (error) {
      toast.error(describeFailure(error).message);
      throw error;
    }
  }

  async function submitProduct() {
    try {
      await submit.mutateAsync(product.id);
      toast.success("Produit soumis à validation.");
    } catch (error) {
      // The server says what is missing: the sentence is shown as it is.
      toast.error(describeFailure(error).message);
      throw error;
    }
  }

  const facts: { label: string; value: ReactNode }[] = [];
  if (product.sku) facts.push({ label: "Référence (SKU)", value: <span className="break-all">{product.sku}</span> });
  if (product.category) facts.push({ label: "Catégorie", value: product.category });
  if (product.brand) facts.push({ label: "Marque", value: product.brand });
  if (product.condition && CONDITION[product.condition]) facts.push({ label: "État", value: CONDITION[product.condition] });
  if (product.originCountry) facts.push({ label: "Pays d'origine", value: COUNTRY[product.originCountry] ?? product.originCountry });
  if (product.weightGrams) facts.push({ label: "Poids", value: `${formatUnits(product.weightGrams)} g` });
  if (product.dimensionsMm) {
    const { length, width, height } = product.dimensionsMm;
    facts.push({ label: "Dimensions (L × l × h)", value: [length, width, height].map(millimetres).join(" × ") });
  }
  if (product.minOrderQuantity > 1) facts.push({ label: "Quantité minimale", value: `${formatUnits(product.minOrderQuantity)} unités` });
  if (product.createdAt) facts.push({ label: "Créé le", value: formatOrderDateTime(product.createdAt) });
  if (product.updatedAt) facts.push({ label: "Modifié le", value: formatOrderDateTime(product.updatedAt) });

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={product.name}
        breadcrumbs={[{ label: "Produits", href: "/vendor/products" }, { label: product.name }]}
        titleAddon={<StatusBadge domain="product" code={product.status} />}
        primaryAction={
          product.canSubmit
            ? { label: "Soumettre à validation", icon: Send, onSelect: () => setConfirmSubmit(true), disabled: submit.isPending }
            : { label: "Modifier", icon: Pencil, href: `/vendor/products/${product.id}/edit` }
        }
        secondaryActions={[
          ...(product.canSubmit ? [{ label: "Modifier", icon: Pencil, href: `/vendor/products/${product.id}/edit` }] : []),
          { label: "Gérer le stock", icon: Boxes, href: inventoryHref },
          { label: "Supprimer", icon: Trash2, onSelect: () => setConfirmDelete(true), disabled: remove.isPending },
        ]}
      />

      {moderation && (
        <Alert tone={moderation.tone} title={moderation.title}>
          {moderation.body}
          {product.moderation?.reason && <span className="mt-1 block font-medium">Motif : {product.moderation.reason}</span>}
          {product.moderation?.note && product.moderation.note !== product.moderation.reason && (
            <span className="mt-1 block">{product.moderation.note}</span>
          )}
        </Alert>
      )}

      {/* Summary: the picture, the price and the stock, read at a glance.
          Phone: picture and figures side by side, the rest underneath.
          Wider: the picture spans both rows, the rest sits next to it. */}
      <Card className="@container">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 @md:gap-x-5">
          <div className="relative aspect-square w-24 self-start overflow-hidden rounded-control border border-border bg-surface-subtle @md:row-span-2 @md:w-36 @2xl:w-44">
            <ProductImage src={shown?.url ?? null} alt={shown ? `Photo de ${product.name}` : ""} sizes="(min-width: 768px) 176px, 96px" fit="contain" />
          </div>

          <dl className="grid grid-cols-1 content-start gap-x-8 gap-y-2 @md:grid-cols-2 @2xl:flex @2xl:flex-wrap">
            <div className="@md:col-span-2">
              <dt className="text-label text-foreground-muted">Prix de vente</dt>
              <dd className="flex flex-wrap items-baseline gap-x-2">
                <Money francs={product.priceFrancs} className="text-page-title text-foreground" />
                {product.compareAtFrancs !== null && (
                  <span className="text-body text-foreground-muted line-through">
                    <span className="sr-only">Prix barré : </span>
                    <Money francs={product.compareAtFrancs} />
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-label text-foreground-muted">Stock</dt>
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-section-title text-foreground tabular-nums">
                  {product.stock === null ? "Non communiqué" : `${formatUnits(product.stock)} unité${product.stock > 1 ? "s" : ""}`}
                </span>
                {product.stockLevel && <StatusBadge domain="stock" code={product.stockLevel} />}
              </dd>
            </div>
            {variants.length > 0 && (
              <div>
                <dt className="text-label text-foreground-muted">Variantes</dt>
                <dd className="text-section-title text-foreground tabular-nums">{variants.length}</dd>
              </div>
            )}
          </dl>

          {(product.pictures.length !== 1 || product.shortDescription || product.bulkPrices.length > 0) && (
            <div className="col-span-2 flex min-w-0 flex-col gap-3 @md:col-span-1 @md:col-start-2">
              {product.pictures.length > 1 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Photos du produit">
                  {product.pictures.map((picture, index) => (
                    <PictureButton key={picture.id} url={picture.url} number={index + 1} current={picture.id === shown?.id} onSelect={() => setShownId(picture.id)} />
                  ))}
                </ul>
              )}
              {product.pictures.length === 0 && <p className="text-meta text-foreground-muted">Ce produit n&apos;a pas encore de photo.</p>}
              {product.shortDescription && <p className="text-body text-foreground">{product.shortDescription}</p>}
              {product.bulkPrices.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-label font-medium text-foreground">Prix par quantité</p>
                  <ul className="flex flex-col gap-0.5 text-body text-foreground-muted @md:flex-row @md:flex-wrap @md:gap-x-5">
                    {product.bulkPrices.map((tier) => (
                      <li key={tier.id}>
                        À partir de {formatUnits(tier.minQuantity)} unités : <Money francs={tier.priceFrancs} className="font-medium text-foreground" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {variants.length > 0 && (
            <Card flush className="@container overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
                <div>
                  <h2 className="text-section-title text-foreground">Variantes</h2>
                  <p className="text-body text-foreground-muted">
                    {variants.length} variante{variants.length > 1 ? "s" : ""}, chacune avec son prix et son stock
                  </p>
                </div>
                <Button asChild size="compact" icon={Boxes}>
                  <Link href={inventoryHref}>Ajuster le stock</Link>
                </Button>
              </div>
              <ul className="divide-y divide-border border-t border-border" aria-label="Variantes du produit">
                {variants.map((variant) => (
                  <VariantRow key={variant.id} variant={variant} />
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <Section title="Description">
              {product.descriptionHtml ? (
                <RichText html={product.descriptionHtml} />
              ) : (
                <p className="text-body text-foreground-muted">Aucune description n&apos;est enregistrée.</p>
              )}
            </Section>
          </Card>
        </div>

        {facts.length > 0 && (
          <Card className="@container">
            <Section title="Informations">
              {/* Pairs side by side: twice as dense as one fact per line, at every width. */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 @xl:grid-cols-3 @3xl:grid-cols-4">
                {facts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <dt className="text-meta text-foreground-muted">{fact.label}</dt>
                    <dd className="text-body break-words text-foreground">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Soumettre ce produit à validation ?"
        description="L'équipe SUGU vérifie le produit. Il est mis en ligne une fois approuvé ; vous êtes prévenu s'il faut le corriger."
        confirmLabel="Soumettre à validation"
        confirmIcon={Send}
        onConfirm={submitProduct}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer « ${product.name} » ?`}
        description="Le produit est retiré de votre catalogue et n'est plus proposé aux acheteurs. Les commandes déjà passées ne changent pas."
        confirmLabel="Supprimer le produit"
        confirmIcon={Trash2}
        cancelLabel="Garder le produit"
        tone="danger"
        onConfirm={deleteProduct}
      />
    </div>
  );
}

/** One of the product pictures, shown in the summary when chosen. */
function PictureButton({ url, number, current, onSelect }: { url: string; number: number; current: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        aria-label={`Afficher la photo ${number}`}
        aria-pressed={current}
        onClick={onSelect}
        className={cn(
          "relative block size-12 overflow-hidden rounded-control border bg-surface-subtle",
          current ? "border-primary ring-1 ring-primary" : "border-border hover:border-border-strong",
        )}
      >
        <ProductImage src={url} alt="" sizes="48px" />
      </button>
    </li>
  );
}

function VariantRow({ variant }: { variant: ProductVariant }) {
  const options = Object.entries(variant.options);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 @lg:grid-cols-[minmax(0,1fr)_8rem_7rem]">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
          <span className="break-words">{variant.title ?? options.map(([, value]) => value).join(" / ")}</span>
          {!variant.isActive && <Badge tone="neutral">Désactivée</Badge>}
        </p>
        {variant.sku && <p className="text-meta break-all text-foreground-muted">{variant.sku}</p>}
      </div>
      <p className="row-span-2 text-right text-body @lg:row-span-1">
        {variant.priceFrancs !== null && <Money francs={variant.priceFrancs} className="font-medium text-foreground" />}
        <span className="block text-meta text-foreground-muted tabular-nums @lg:hidden">{formatUnits(variant.stock)} en stock</span>
      </p>
      <p className="hidden text-right text-body text-foreground tabular-nums @lg:block">
        {formatUnits(variant.stock)} <span className="text-foreground-muted">en stock</span>
      </p>
    </li>
  );
}
