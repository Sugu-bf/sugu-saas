"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Pencil, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Card,
  ConfirmDialog,
  DescriptionList,
  Money,
  PageHeader,
  Section,
  StatusBadge,
  type DescriptionItem,
} from "@/design-system";
import { formatOrderDateTime } from "@/features/vendor/orders/components/order-bits";
import { formatUnits } from "@/features/vendor/catalog/components/product-bits";
import type { ProductDetail, ProductVariant } from "@/features/vendor/catalog/contract";
import { describeFailure } from "@/features/vendor/catalog/errors";
import { useDeleteProduct } from "@/features/vendor/catalog/hooks";

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
 * no explanation (draft, active, archived) have none.
 */
const MODERATION: Record<string, { tone: "info" | "warning" | "danger"; title: string; body: string }> = {
  submitted: {
    tone: "info",
    title: "En cours de validation",
    body: "Ce produit a été soumis à l'équipe SUGU. Il sera mis en ligne une fois approuvé.",
  },
  changes_requested: {
    tone: "warning",
    title: "Des corrections sont demandées",
    body: "Modifiez le produit selon la remarque ci-dessous pour le soumettre à nouveau.",
  },
  rejected: {
    tone: "danger",
    title: "Ce produit a été rejeté",
    body: "Il n'est pas visible par les acheteurs.",
  },
  suspended: {
    tone: "danger",
    title: "Ce produit est suspendu",
    body: "Il a été retiré de la vente par l'équipe SUGU.",
  },
};

/**
 * Text of the rich description, paragraph by paragraph. The markup is read,
 * never inserted in the page: whatever it contains cannot run here.
 */
function paragraphsOf(html: string | null): string[] {
  if (!html || typeof DOMParser === "undefined") return [];
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const blocks = body.querySelectorAll("p, li, h1, h2, h3, h4, blockquote");
  const texts = blocks.length > 0 ? Array.from(blocks, (block) => block.textContent) : [body.textContent];
  return texts.map((text) => (text ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
}

const millimetres = (value: number | null) => (value === null ? "—" : `${formatUnits(value / 10)} cm`);

export function ProductDetailContent({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const remove = useDeleteProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const description = useMemo(() => paragraphsOf(product.descriptionHtml), [product.descriptionHtml]);
  const moderation = MODERATION[product.status];
  const main = product.pictures.find((picture) => picture.isMain) ?? product.pictures[0] ?? null;
  const others = product.pictures.filter((picture) => picture !== main);
  // A simple product has one unnamed variant: its stock is the product's.
  const namedVariants = product.variants.filter((variant) => variant.title !== null || product.hasVariants);

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

  const facts: DescriptionItem[] = [];
  if (product.sku) facts.push({ label: "Référence (SKU)", value: <span className="break-all">{product.sku}</span> });
  if (product.category) facts.push({ label: "Catégorie", value: product.category });
  if (product.brand) facts.push({ label: "Marque", value: product.brand });
  if (product.condition && CONDITION[product.condition]) facts.push({ label: "État", value: CONDITION[product.condition] });
  if (product.originCountry) facts.push({ label: "Pays d'origine", value: product.originCountry });
  if (product.weightGrams) facts.push({ label: "Poids", value: `${formatUnits(product.weightGrams)} g` });
  if (product.dimensionsMm) {
    const { length, width, height } = product.dimensionsMm;
    facts.push({ label: "Dimensions (L × l × h)", value: [length, width, height].map(millimetres).join(" × ") });
  }
  if (product.createdAt) facts.push({ label: "Créé le", value: formatOrderDateTime(product.createdAt) });
  if (product.updatedAt) facts.push({ label: "Modifié le", value: formatOrderDateTime(product.updatedAt) });

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title={product.name}
        breadcrumbs={[{ label: "Produits", href: "/vendor/products" }, { label: product.name }]}
        titleAddon={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge domain="product" code={product.status} />
            {product.stockLevel && <StatusBadge domain="stock" code={product.stockLevel} />}
          </span>
        }
        primaryAction={{ label: "Modifier", icon: Pencil, href: `/vendor/products/${product.id}/edit` }}
        secondaryActions={[
          { label: "Gérer le stock", icon: Boxes, href: `/vendor/inventory?q=${encodeURIComponent(product.sku ?? product.name)}` },
          { label: "Supprimer", icon: Trash2, onSelect: () => setConfirmDelete(true), disabled: remove.isPending },
        ]}
      />

      {moderation && (
        <Alert tone={moderation.tone} title={moderation.title}>
          {moderation.body}
          {product.moderation?.reason && <span className="mt-1 block font-medium">Motif : {product.moderation.reason}</span>}
          {product.moderation?.note && <span className="mt-1 block">{product.moderation.note}</span>}
        </Alert>
      )}

      {/* One column on phones, ordered by priority; two columns from 1024px. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-4">
          <Card className="order-1 lg:order-none">
            <Section title="Prix et stock">
              <DescriptionList
                items={[
                  {
                    label: "Prix de vente",
                    value: (
                      <span className="inline-flex flex-wrap items-baseline justify-end gap-2">
                        <Money francs={product.priceFrancs} className="text-section-title" />
                        {product.compareAtFrancs !== null && (
                          <span className="text-meta text-foreground-muted line-through">
                            <span className="sr-only">Prix barré : </span>
                            <Money francs={product.compareAtFrancs} />
                          </span>
                        )}
                      </span>
                    ),
                  },
                  {
                    label: "Stock",
                    value:
                      product.stock === null ? (
                        "Non communiqué"
                      ) : (
                        <span className="tabular-nums">
                          {formatUnits(product.stock)} unité{product.stock > 1 ? "s" : ""}
                        </span>
                      ),
                  },
                  ...(product.minOrderQuantity > 1
                    ? [{ label: "Quantité minimale par commande", value: formatUnits(product.minOrderQuantity) }]
                    : []),
                ]}
              />
              {product.bulkPrices.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-label font-medium text-foreground">Prix par quantité</p>
                  <ul className="flex flex-col gap-1 text-body text-foreground-muted">
                    {product.bulkPrices.map((tier) => (
                      <li key={tier.id} className="flex items-baseline justify-between gap-3">
                        <span>À partir de {formatUnits(tier.minQuantity)} unités</span>
                        <Money francs={tier.priceFrancs} className="text-foreground" />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </Card>

          {namedVariants.length > 0 && (
            <Card className="order-3 lg:order-none">
              <Section title="Variantes" description={`${namedVariants.length} variante${namedVariants.length > 1 ? "s" : ""}`}>
                <ul className="divide-y divide-border">
                  {namedVariants.map((variant) => (
                    <VariantRow key={variant.id} variant={variant} />
                  ))}
                </ul>
              </Section>
            </Card>
          )}

          <Card className="order-5 lg:order-none">
            <Section title="Description">
              {product.shortDescription && <p className="text-body font-medium text-foreground">{product.shortDescription}</p>}
              {description.length > 0 ? (
                <div className="flex flex-col gap-2 text-body break-words text-foreground-muted">
                  {description.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                !product.shortDescription && <p className="text-body text-foreground-muted">Aucune description n&apos;est enregistrée.</p>
              )}
            </Section>
          </Card>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <Card className="order-2 lg:order-none">
            <Section title="Photos" description={product.pictures.length > 0 ? `${product.pictures.length} photo${product.pictures.length > 1 ? "s" : ""}` : undefined}>
              {main ? (
                <div className="flex flex-col gap-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-control border border-border bg-surface-subtle">
                    <Image src={main.url} alt={`Photo principale de ${product.name}`} fill sizes="(min-width: 1024px) 320px, 100vw" className="object-contain" />
                  </div>
                  {others.length > 0 && (
                    <ul className="grid grid-cols-4 gap-2">
                      {others.map((picture, index) => (
                        <li key={picture.id} className="relative aspect-square overflow-hidden rounded-control border border-border bg-surface-subtle">
                          <Image src={picture.url} alt={`Photo ${index + 2} de ${product.name}`} fill sizes="80px" className="object-cover" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="text-body text-foreground-muted">Ce produit n&apos;a pas encore de photo.</p>
              )}
            </Section>
          </Card>

          {facts.length > 0 && (
            <Card className="order-4 lg:order-none">
              <Section title="Informations">
                <DescriptionList items={facts} />
              </Section>
            </Card>
          )}
        </div>
      </div>

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

function VariantRow({ variant }: { variant: ProductVariant }) {
  const options = Object.entries(variant.options);
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-body font-medium text-foreground">
          <span className="break-words">{variant.title ?? "Variante unique"}</span>
          {!variant.isActive && <Badge tone="neutral">Désactivée</Badge>}
        </p>
        {options.length > 0 && (
          <p className="text-meta text-foreground-muted">{options.map(([name, value]) => `${name} : ${value}`).join(" · ")}</p>
        )}
        {variant.sku && <p className="text-meta break-all text-foreground-muted">{variant.sku}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-end text-body">
        {variant.priceFrancs !== null && <Money francs={variant.priceFrancs} className="font-medium text-foreground" />}
        <span className="text-meta text-foreground-muted tabular-nums">
          {formatUnits(variant.stock)} en stock
        </span>
      </div>
    </li>
  );
}
