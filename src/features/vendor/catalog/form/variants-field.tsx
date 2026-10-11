"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, Checkbox, FormField, IconButton, Input, cn } from "@/design-system";
import {
  MAX_VARIANTS,
  combinationLabel,
  localKey,
  variantErrors,
  withAxes,
  type FormErrors,
  type PriceTier,
  type ProductForm,
  type VariantDraft,
} from "./model";

// ── Price tiers (shared by the product and by each variant) ──

export function TiersEditor({ tiers, onChange, error, legend }: { tiers: PriceTier[]; onChange: (tiers: PriceTier[]) => void; error?: string; legend: string }) {
  const set = (id: string, patch: Partial<PriceTier>) => onChange(tiers.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{legend}</legend>
      {tiers.map((tier, index) => (
        <div key={tier.id} className="flex items-end gap-2">
          <FormField label="À partir de" hideLabel={index > 0} className="min-w-0 flex-1">
            <Input inputMode="numeric" value={tier.minQuantity} onChange={(event) => set(tier.id, { minQuantity: event.target.value })} suffix="unités" />
          </FormField>
          <FormField label="Prix unitaire" hideLabel={index > 0} className="min-w-0 flex-1">
            <Input inputMode="decimal" value={tier.price} onChange={(event) => set(tier.id, { price: event.target.value })} suffix="FCFA" />
          </FormField>
          <IconButton icon={Trash2} label={`Retirer le palier ${index + 1}`} onClick={() => onChange(tiers.filter((candidate) => candidate.id !== tier.id))} />
        </div>
      ))}
      {error && (
        <p className="text-meta text-danger-fg" role="alert">
          {error}
        </p>
      )}
      <Button size="compact" icon={Plus} className="self-start" onClick={() => onChange([...tiers, { id: localKey("tier"), minQuantity: "", price: "" }])}>
        Ajouter un palier
      </Button>
    </fieldset>
  );
}

// ── Options (axes) ──────────────────────────────────────────

const SUGGESTED_OPTIONS = ["Taille", "Couleur", "Poids", "Matière", "Pointure"];

function OptionEditor({ form, setForm, error }: { form: ProductForm; setForm: Dispatch<SetStateAction<ProductForm>>; error?: string }) {
  const [newValue, setNewValue] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");

  const applyAxes = (change: (axes: ProductForm["axes"]) => ProductForm["axes"]) => setForm((current) => withAxes(current, change(current.axes)));
  const taken = (name: string) => form.axes.some((axis) => axis.name.trim().toLocaleLowerCase("fr") === name.trim().toLocaleLowerCase("fr"));

  function addOption(name: string) {
    const clean = name.trim();
    if (!clean || taken(clean)) return;
    applyAxes((axes) => [...axes, { id: localKey("axis"), name: clean, values: [] }]);
    setNewName("");
  }

  function addValue(axisId: string) {
    const value = (newValue[axisId] ?? "").trim();
    if (!value) return;
    applyAxes((axes) =>
      axes.map((axis) =>
        axis.id !== axisId || axis.values.some((existing) => existing.toLocaleLowerCase("fr") === value.toLocaleLowerCase("fr"))
          ? axis
          : { ...axis, values: [...axis.values, value] },
      ),
    );
    setNewValue((current) => ({ ...current, [axisId]: "" }));
  }

  const suggestions = SUGGESTED_OPTIONS.filter((name) => !taken(name));

  return (
    <div className="flex flex-col gap-3">
      {form.axes.map((axis) => (
        <div key={axis.id} className="flex flex-col gap-2 rounded-control border border-border bg-surface-subtle p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label font-medium text-foreground">{axis.name}</p>
            <Button size="compact" variant="quiet" icon={Trash2} onClick={() => applyAxes((axes) => axes.filter((candidate) => candidate.id !== axis.id))} aria-label={`Retirer l'option ${axis.name}`}>
              Retirer
            </Button>
          </div>
          {axis.values.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label={`Valeurs de ${axis.name}`}>
              {axis.values.map((value) => (
                <li key={value} className="inline-flex items-center gap-1 rounded-pill border border-border bg-surface py-0.5 pr-1 pl-2.5 text-meta text-foreground">
                  {value}
                  <button
                    type="button"
                    aria-label={`Retirer ${value} de ${axis.name}`}
                    onClick={() => applyAxes((axes) => axes.map((candidate) => (candidate.id === axis.id ? { ...candidate, values: candidate.values.filter((existing) => existing !== value) } : candidate)))}
                    className="flex size-5 items-center justify-center rounded-pill text-foreground-muted hover:bg-surface-hover hover:text-foreground touch:size-8"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-2">
            <FormField label={`Ajouter une valeur à ${axis.name}`} hideLabel className="min-w-0 flex-1">
              <Input
                value={newValue[axis.id] ?? ""}
                placeholder={axis.values.length === 0 ? "Première valeur, par exemple M" : "Autre valeur"}
                onChange={(event) => setNewValue((current) => ({ ...current, [axis.id]: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addValue(axis.id);
                  }
                }}
              />
            </FormField>
            <Button icon={Plus} onClick={() => addValue(axis.id)}>
              Ajouter
            </Button>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <FormField label={form.axes.length === 0 ? "Nom de l'option" : "Autre option"} hint={form.axes.length === 0 ? "Ce qui distingue vos variantes : taille, couleur, poids…" : undefined} error={error} className="min-w-0 flex-1">
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(newName);
                }
              }}
            />
          </FormField>
          <Button icon={Plus} onClick={() => addOption(newName)} className={cn(error && "mb-5")}>
            Ajouter l&apos;option
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-meta text-foreground-muted">Suggestions :</span>
            {suggestions.map((name) => (
              <Button key={name} size="compact" variant="quiet" onClick={() => addOption(name)}>
                {name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Combinations ────────────────────────────────────────────

function VariantRow({ variant, errors, onChange }: { variant: VariantDraft; errors: Record<string, string>; onChange: (patch: Partial<VariantDraft>) => void }) {
  const [open, setOpen] = useState(false);
  const label = combinationLabel(variant.combination);
  // Advanced settings holding an error are shown: an error is never hidden.
  const advancedError = Boolean(errors.minOrderQuantity || errors.lowStockThreshold || errors.tiers);
  const expanded = open || advancedError;
  const customised = variant.tiers.length > 0 || variant.allowBackorder;

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body font-medium break-words text-foreground">{label}</p>
        {customised && <Badge tone="neutral">Réglages propres</Badge>}
      </div>

      {/* The three figures every variant needs, always in view. */}
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-3">
        <FormField label="Prix" error={errors.price}>
          <Input inputMode="decimal" value={variant.price} onChange={(event) => onChange({ price: event.target.value })} suffix="FCFA" aria-label={`Prix de ${label}`} />
        </FormField>
        <FormField label="Stock" error={errors.stock}>
          <Input inputMode="numeric" value={variant.stock} onChange={(event) => onChange({ stock: event.target.value })} aria-label={`Stock de ${label}`} />
        </FormField>
        <FormField label="Référence (SKU)" error={errors.sku} className="col-span-2 @lg:col-span-1">
          <Input value={variant.sku} onChange={(event) => onChange({ sku: event.target.value })} placeholder="Automatique si vide" aria-label={`Référence de ${label}`} />
        </FormField>
      </div>

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setOpen(!open)}
        aria-label={`Plus de réglages pour ${label}`}
        className="inline-flex items-center gap-1 self-start rounded-button py-1 text-meta font-medium text-foreground-muted hover:text-foreground touch:py-2.5"
      >
        <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        Plus de réglages
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 rounded-control border border-border bg-surface-subtle p-3">
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Quantité minimale par commande" error={errors.minOrderQuantity}>
              <Input inputMode="numeric" value={variant.minOrderQuantity} onChange={(event) => onChange({ minOrderQuantity: event.target.value })} />
            </FormField>
            <FormField label="Seuil de stock faible" error={errors.lowStockThreshold}>
              <Input inputMode="numeric" value={variant.lowStockThreshold} onChange={(event) => onChange({ lowStockThreshold: event.target.value })} />
            </FormField>
          </div>
          <Checkbox
            label="Accepter les commandes en rupture"
            description="Le client peut commander cette variante même sans stock."
            checked={variant.allowBackorder}
            onChange={(event) => onChange({ allowBackorder: event.target.checked })}
          />
          <div className="flex flex-col gap-2">
            <p className="text-label font-medium text-foreground">Prix par quantité de cette variante</p>
            <TiersEditor tiers={variant.tiers} onChange={(tiers) => onChange({ tiers })} error={errors.tiers} legend={`Prix par quantité de ${label}`} />
          </div>
        </div>
      )}
    </li>
  );
}

export function VariantsField({ form, setForm, errors }: { form: ProductForm; setForm: Dispatch<SetStateAction<ProductForm>>; errors: FormErrors }) {
  const setVariant = (id: string, patch: Partial<VariantDraft>) =>
    setForm((current) => ({ ...current, variants: current.variants.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)) }));

  /** Copies one figure to every variant: the usual case is one price for all. */
  const applyToAll = (field: "price" | "stock", value: string) =>
    setForm((current) => ({ ...current, variants: current.variants.map((variant) => ({ ...variant, [field]: value })) }));

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <OptionEditor form={form} setForm={setForm} error={errors.axes} />

      {form.variants.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-label font-medium text-foreground">
              {form.variants.length} variante{form.variants.length > 1 ? "s" : ""}
            </p>
            <p className="text-meta text-foreground-muted">{MAX_VARIANTS} au plus. Chaque variante a son prix, son stock et sa référence.</p>
          </div>

          {form.variants.length > 1 && (
            <div className="grid grid-cols-1 gap-2 rounded-control border border-border bg-surface-subtle p-3 @lg:grid-cols-2">
              <div className="flex items-end gap-2">
                <FormField label="Même prix pour toutes" className="min-w-0 flex-1">
                  <Input inputMode="decimal" value={bulkPrice} onChange={(event) => setBulkPrice(event.target.value)} suffix="FCFA" />
                </FormField>
                <Button disabled={!bulkPrice.trim()} onClick={() => applyToAll("price", bulkPrice.trim())}>
                  Appliquer
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <FormField label="Même stock pour toutes" className="min-w-0 flex-1">
                  <Input inputMode="numeric" value={bulkStock} onChange={(event) => setBulkStock(event.target.value)} />
                </FormField>
                <Button disabled={!bulkStock.trim()} onClick={() => applyToAll("stock", bulkStock.trim())}>
                  Appliquer
                </Button>
              </div>
            </div>
          )}

          <ul className="divide-y divide-border" aria-label="Variantes du produit">
            {form.variants.map((variant) => (
              <VariantRow key={variant.id} variant={variant} errors={variantErrors(errors, variant.id)} onChange={(patch) => setVariant(variant.id, patch)} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
