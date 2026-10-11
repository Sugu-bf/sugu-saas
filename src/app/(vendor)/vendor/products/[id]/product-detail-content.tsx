"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, ImagePlus, Pencil, Send, Trash2 } from "lucide-react";
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

  // Under the title: what tells this product from its neighbours in the list.
  const reference = [product.sku, product.category].filter(Boolean).join(" · ");

  return (
    <div className="sugu-ui @container/page mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={product.name}
        description={reference || undefined}
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

      {/* From 896px of page: what is sold on two thirds, what files it in the margin.
          Narrower, one column: the facts close the page. */}
      <div className="flex flex-col gap-4 @4xl/page:grid @4xl/page:grid-cols-3 @4xl/page:items-start">
        <div className="flex min-w-0 flex-col gap-4 @4xl/page:col-span-2">
          {/* The product at a glance: its pictures next to its price and stock;
              on a phone, the picture first, across the card. */}
          <Card role="region" aria-label="Résumé du produit" className="@container">
            <div className="flex flex-col gap-4 @md:flex-row @md:gap-5">
              <div className="flex shrink-0 flex-col gap-2 @md:w-48 @2xl:w-64">
                <div className="relative aspect-[4/3] overflow-hidden rounded-control border border-border bg-surface-subtle @md:aspect-square">
                  <ProductImage
                    src={shown?.url ?? null}
                    alt={shown ? `Photo de ${product.name}` : ""}
                    sizes="(min-width: 1280px) 256px, (min-width: 768px) 192px, 100vw"
                    fit="contain"
                    caption
                  />
                </div>
                {product.pictures.length > 1 && (
                  <ul className="flex flex-wrap gap-1.5" aria-label="Photos du produit">
                    {product.pictures.map((picture, index) => (
                      <PictureButton key={picture.id} url={picture.url} number={index + 1} current={picture.id === shown?.id} onSelect={() => setShownId(picture.id)} />
                    ))}
                  </ul>
                )}
                {product.pictures.length === 0 && (
                  <Button asChild size="compact" icon={ImagePlus} className="self-start">
                    <Link href={`/vendor/products/${product.id}/edit?step=photos`}>Ajouter des photos</Link>
                  </Button>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <dl>
                  <div>
                    <dt className="text-label text-foreground-muted">Prix de vente</dt>
                    <dd className="flex flex-wrap items-baseline gap-x-2">
                      <Money francs={product.priceFrancs} className="text-kpi text-foreground" />
                      {product.compareAtFrancs !== null && (
                        <span className="text-body text-foreground-muted line-through">
                          <span className="sr-only">Prix barré : </span>
                          <Money francs={product.compareAtFrancs} />
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
                <dl className="grid grid-cols-2 gap-x-6 border-t border-border pt-3">
                  <div className={cn(variants.length === 0 && "col-span-2")}>
                    <dt className="text-label text-foreground-muted">Stock</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-section-title text-foreground tabular-nums">
                        {product.stock === null ? "Non communiqué" : `${formatUnits(product.stock)} unité${product.stock > 1 ? "s" : ""}`}
                      </span>
                      {product.stockLevel && <StatusBadge domain="stock" code={product.stockLevel} />}
                    </dd>
                  </div>
                  {variants.length > 0 && (
                    <div>
                      <dt className="text-label text-foreground-muted">Variantes</dt>
                      <dd className="mt-0.5 text-section-title text-foreground tabular-nums">{variants.length}</dd>
                    </div>
                  )}
                </dl>

                {product.shortDescription && <p className="border-t border-border pt-3 text-body text-foreground">{product.shortDescription}</p>}

                {product.bulkPrices.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-border pt-3">
                    <p className="text-label text-foreground-muted">Prix par quantité</p>
                    <ul className="flex flex-col">
                      {product.bulkPrices.map((tier) => (
                        <li key={tier.id} className="flex items-baseline justify-between gap-4 py-0.5 text-body text-foreground">
                          <span>À partir de {formatUnits(tier.minQuantity)} unités</span>
                          <Money francs={tier.priceFrancs} className="font-medium" />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Card>

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
              {/* One fact a line, its value at the end; two columns of them where the card is wide. */}
              <dl className="grid gap-x-8 @xl:grid-cols-2">
                {facts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex min-w-0 items-baseline justify-between gap-4 border-t border-border py-2 first:border-t-0 first:pt-0 @xl:[&:nth-child(2)]:border-t-0 @xl:[&:nth-child(2)]:pt-0"
                  >
                    <dt className="shrink-0 text-body text-foreground-muted">{fact.label}</dt>
                    <dd className="min-w-0 text-right text-body font-medium break-words text-foreground">{fact.value}</dd>
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
  // A variant taken off sale has no stock to report as missing.
  const soldOut = variant.isActive && variant.stock <= 0;
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
        <span className="mt-0.5 block text-meta text-foreground-muted tabular-nums @lg:hidden">
          {soldOut ? <StatusBadge domain="stock" code="out_of_stock" /> : `${formatUnits(variant.stock)} en stock`}
        </span>
      </p>
      <p className="hidden text-right text-body text-foreground tabular-nums @lg:block">
        {soldOut ? (
          <StatusBadge domain="stock" code="out_of_stock" />
        ) : (
          <>
            {formatUnits(variant.stock)} <span className="text-foreground-muted">en stock</span>
          </>
        )}
      </p>
    </li>
  );
}
