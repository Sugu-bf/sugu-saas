"use client";

import { useEffect, useState } from "react";
import { BadgePercent, PackageSearch, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Dialog, DialogContent, FormField, Input, Select, Skeleton, cn } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { DISCOUNT_TYPES, TYPE_LABELS, checkPromotion, dayOf, promoPrice, today, wholeNumber, type DiscountType, type Promotion, type PromotionDraft, type PromotionErrors } from "../contract";
import { useMarketingCommand, usePromotableProducts } from "../hooks";
import { describeChangeFailure, formatFrancs, formatReduction } from "./bits";

const FIELD_OF: Record<string, keyof PromotionDraft> = {
  product_id: "productId",
  discount_type: "type",
  discount_value: "value",
  starts_at: "startsAt",
  ends_at: "endsAt",
};

interface Chosen {
  id: string;
  name: string;
  sku: string | null;
  image: string | null;
  /** Francs. */
  price: number;
}

/** Create a promotion (`editing` null), or change one: its product then stays the same. */
export function PromotionDialog({ open, editing, onOpenChange }: { open: boolean; editing: Promotion | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PromotionForm key={editing?.id ?? "new"} editing={editing} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PromotionForm({ editing, onClose }: { editing: Promotion | null; onClose: () => void }) {
  const [product, setProduct] = useState<Chosen | null>(editing ? { ...editing.product } : null);
  const [draft, setDraft] = useState<PromotionDraft>(() => {
    if (editing) return { productId: editing.product.id, type: editing.type === "amount_off" ? "amount_off" : "percent_off", value: String(editing.value), startsAt: dayOf(editing.startsAt) || today(), endsAt: dayOf(editing.endsAt) };
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    return { productId: "", type: "percent_off", value: "", startsAt: today(), endsAt: today(end) };
  });
  const [errors, setErrors] = useState<PromotionErrors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const command = useMarketingCommand();

  const set = <Field extends keyof PromotionDraft>(field: Field, value: PromotionDraft[Field]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const choose = (chosen: Chosen | null) => {
    setProduct(chosen);
    set("productId", chosen?.id ?? "");
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const found = checkPromotion(draft, product?.price ?? null);
    setErrors(found);
    setRefusal(null);
    if (Object.keys(found).length > 0) return;

    command.mutate(editing ? { type: "update-promotion", id: editing.id, draft } : { type: "create-promotion", draft }, {
      onSuccess: () => {
        toast.success(editing ? "La promotion est modifiée." : `${product?.name ?? "Le produit"} est en promotion.`);
        onClose();
      },
      onError: (failure) => {
        const described = describeChangeFailure(failure);
        const fields: PromotionErrors = {};
        for (const [key, message] of Object.entries(described.fields)) {
          if (FIELD_OF[key]) fields[FIELD_OF[key]] = message;
        }
        setErrors(fields);
        if (Object.keys(fields).length === 0) setRefusal(described.message);
      },
    });
  };

  const value = wholeNumber(draft.value);
  const preview = product && value && value > 0 ? promoPrice(product.price, draft.type, value) : null;

  return (
    <DialogContent
      title={editing ? "Modifier la promotion" : "Créer une promotion produit"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={command.isPending}>
            Annuler
          </Button>
          <Button variant="primary" icon={BadgePercent} loading={command.isPending} onClick={() => submit()}>
            {editing ? "Enregistrer" : "Créer la promotion"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {refusal && <Alert tone="danger" title={refusal} />}

        {editing ? (
          <div>
            <p className="text-label font-medium text-foreground">Produit</p>
            <ProductLine product={product!} className="mt-1.5 rounded-control border border-border p-2.5" />
          </div>
        ) : (
          <ProductPicker chosen={product} onChoose={choose} error={errors.productId} />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Type de réduction" required error={errors.type}>
            <Select value={draft.type} onChange={(event) => set("type", event.target.value as DiscountType)} options={DISCOUNT_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))} />
          </FormField>
          <FormField label="Valeur" required error={errors.value} hint={draft.type === "percent_off" ? "De 1 à 99." : "En francs entiers, sous le prix du produit."}>
            <Input inputMode="numeric" value={draft.value} onChange={(event) => set("value", event.target.value)} suffix={draft.type === "percent_off" ? "%" : "FCFA"} autoComplete="off" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Date de début" required error={errors.startsAt}>
            <Input type="date" value={draft.startsAt} onChange={(event) => set("startsAt", event.target.value)} />
          </FormField>
          <FormField label="Date de fin" required error={errors.endsAt} hint="La promotion vaut jusqu'à la fin de ce jour.">
            <Input type="date" value={draft.endsAt} min={draft.startsAt || undefined} onChange={(event) => set("endsAt", event.target.value)} />
          </FormField>
        </div>

        <section aria-label="Aperçu" className="rounded-control bg-surface-subtle p-3">
          <h3 className="text-body font-semibold text-foreground">Aperçu</h3>
          {product ? (
            <dl className="mt-2 flex flex-col gap-1.5 text-body">
              <PreviewLine label="Prix actuel" value={formatFrancs(product.price)} />
              <PreviewLine label="Réduction" value={value && value > 0 ? formatReduction(draft.type, value) : "—"} />
              <PreviewLine label="Prix promotionnel" value={preview !== null && preview > 0 ? formatFrancs(preview) : "—"} strong />
            </dl>
          ) : (
            <p className="mt-1 text-label text-foreground-muted">Choisissez un produit pour voir son prix en promotion.</p>
          )}
          <p className="mt-2 text-meta text-foreground-muted">Le prix affiché sur la marketplace et facturé à l&apos;acheteur est celui que calcule le serveur à l&apos;enregistrement.</p>
        </section>

        <button type="submit" hidden />
      </form>
    </DialogContent>
  );
}

function PreviewLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-section-title font-semibold text-primary" : "font-medium text-foreground")}>{value}</dd>
    </div>
  );
}

function ProductLine({ product, className }: { product: Chosen; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <ProductThumb src={product.image} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">{product.name}</span>
        <span className="block truncate text-meta text-foreground-muted tabular-nums">{[product.sku, formatFrancs(product.price)].filter(Boolean).join(" · ")}</span>
      </span>
    </span>
  );
}

/**
 * The product to promote, searched by the server over the products on sale:
 * a product that is not published cannot be promoted, and is not offered.
 */
function ProductPicker({ chosen, onChoose, error }: { chosen: Chosen | null; onChoose: (product: Chosen | null) => void; error?: string }) {
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(typed.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [typed]);

  const { data, isPending, isError } = usePromotableProducts(search, chosen === null);

  if (chosen) {
    return (
      <div>
        <p className="text-label font-medium text-foreground">Produit</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-control border border-border p-2.5">
          <ProductLine product={chosen} className="flex-1" />
          <Button size="compact" onClick={() => onChoose(null)}>
            Changer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FormField label="Produit" required error={error} hint="Seuls vos produits en vente peuvent être mis en promotion.">
        <Input leadingIcon={Search} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Rechercher par nom ou référence" autoComplete="off" autoFocus />
      </FormField>
      <div role="listbox" aria-label="Produits en vente" className="flex max-h-56 flex-col overflow-y-auto rounded-control border border-border">
        {isPending ? (
          <div className="flex flex-col gap-2 p-2.5" aria-hidden="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <p className="p-3 text-label text-danger-fg">Vos produits n&apos;ont pas pu être chargés. Fermez puis rouvrez cette fenêtre.</p>
        ) : data.rows.length === 0 ? (
          <p className="flex items-center gap-2 p-3 text-label text-foreground-muted">
            <PackageSearch className="size-4 shrink-0" aria-hidden="true" />
            {search ? "Aucun produit en vente ne correspond." : "Vous n'avez pas encore de produit en vente."}
          </p>
        ) : (
          data.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onChoose({ id: row.id, name: row.name, sku: row.sku, image: row.image, price: row.priceFrancs })}
              className="flex min-h-touch w-full items-center border-b border-border px-2.5 py-2 text-left last:border-b-0 hover:bg-surface-subtle focus-visible:-outline-offset-2"
            >
              <ProductLine product={{ id: row.id, name: row.name, sku: row.sku, image: row.image, price: row.priceFrancs }} className="flex-1" />
            </button>
          ))
        )}
      </div>
      {data && data.total > data.rows.length && <p className="text-meta text-foreground-muted">{data.rows.length} produits affichés sur {data.total} : précisez la recherche.</p>}
    </div>
  );
}
