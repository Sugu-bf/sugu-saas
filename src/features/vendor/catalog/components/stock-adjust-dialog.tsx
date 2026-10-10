"use client";

import { useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Alert, Button, Dialog, DialogClose, DialogContent, FormField, Input, Select } from "@/design-system";
import type { InventoryRow } from "../contract";
import { describeFailure } from "../errors";
import { useAdjustStock } from "../hooks";
import {
  ADJUSTMENT_REASONS,
  adjustableVariants,
  checkAdjustment,
  variantLabel,
  type StockOperation,
} from "../stock";
import { formatUnits } from "./product-bits";

const OPERATIONS: { value: StockOperation; label: string }[] = [
  { value: "add", label: "Ajouter au stock" },
  { value: "remove", label: "Retirer du stock" },
];

/**
 * Adds or removes units from the stock of one variant. The stock shown
 * afterwards is the one the server answers: nothing is updated optimistically.
 */
export function StockAdjustDialog({ row, onClose }: { row: InventoryRow | null; onClose: () => void }) {
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      {/* Keyed by product: the form starts clean for each one. */}
      {row && <StockAdjustForm key={row.id} row={row} onClose={onClose} />}
    </Dialog>
  );
}

function StockAdjustForm({ row, onClose }: { row: InventoryRow; onClose: () => void }) {
  const formId = useId();
  const adjust = useAdjustStock();
  const variants = adjustableVariants(row);

  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [operation, setOperation] = useState<StockOperation>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Older backend: no variant list. The product is adjusted as a whole and
  // the server picks its default variant.
  const variant = variants.find((candidate) => candidate.id === variantId) ?? null;
  const currentStock = variant ? variant.stock : row.stock;
  const check = checkAdjustment({ operation, quantity, currentStock });
  const reasons = ADJUSTMENT_REASONS.filter((option) => option.operation === operation);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    setFailure(null);
    if (check.delta === null || adjust.isPending) return;

    try {
      const result = await adjust.mutateAsync({
        productId: row.id,
        variantId: variant?.id,
        quantity: check.delta,
        reason: reason || undefined,
      });
      toast.success(
        result
          ? `Stock mis à jour : ${formatUnits(result.stock)} unité${result.stock > 1 ? "s" : ""}.`
          : "Stock mis à jour.",
      );
      onClose();
    } catch (error) {
      setFailure(describeFailure(error).message);
    }
  }

  return (
    <DialogContent
      title="Ajuster le stock"
      description={row.name}
      footer={
        <>
          <DialogClose asChild>
            <Button disabled={adjust.isPending}>Annuler</Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" loading={adjust.isPending}>
            Enregistrer
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {failure && (
          <Alert tone="danger" title="Le stock n'a pas été modifié">
            {failure}
          </Alert>
        )}

        {variants.length > 1 && (
          <FormField label="Variante" required>
            <Select
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              options={variants.map((candidate) => ({
                value: candidate.id,
                label: `${variantLabel(candidate)} · ${formatUnits(candidate.stock)} en stock${candidate.isActive ? "" : " · désactivée"}`,
              }))}
            />
          </FormField>
        )}

        <FormField label="Opération" required>
          <Select
            value={operation}
            onChange={(event) => {
              setOperation(event.target.value as StockOperation);
              setReason("");
            }}
            options={OPERATIONS}
          />
        </FormField>

        <FormField
          label="Quantité"
          required
          hint={`Stock actuel : ${formatUnits(currentStock)}`}
          error={submitted ? check.error : null}
        >
          <Input
            inputMode="numeric"
            autoComplete="off"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            suffix="unités"
          />
        </FormField>

        <FormField label="Motif">
          <Select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Aucun motif"
            options={reasons.map((option) => ({ value: option.value, label: option.label }))}
          />
        </FormField>

        <p className="text-body text-foreground-muted" aria-live="polite">
          {check.resultingStock === null
            ? "Le stock après ajustement s'affichera ici."
            : `Stock après ajustement : ${formatUnits(check.resultingStock)} unité${check.resultingStock > 1 ? "s" : ""}.`}
        </p>
      </form>
    </DialogContent>
  );
}
