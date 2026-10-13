"use client";

import { useState } from "react";
import { TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Alert, Button, Dialog, DialogContent, FormField, Input, Select } from "@/design-system";
import { DISCOUNT_TYPES, TYPE_LABELS, checkCoupon, today, wholeNumber, type CouponDraft, type CouponErrors, type DiscountType } from "../contract";
import { useMarketingCommand } from "../hooks";
import { describeChangeFailure, formatFrancs } from "./bits";

/** Fields of the server, named as the form names them. */
const FIELD_OF: Record<string, keyof CouponDraft> = {
  code: "code",
  discount_type: "type",
  discount_value: "value",
  min_subtotal: "minSubtotal",
  total_usage_limit: "usageLimit",
  per_customer_limit: "perCustomerLimit",
  starts_at: "startsAt",
  ends_at: "endsAt",
};

function emptyDraft(): CouponDraft {
  const start = today();
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return { code: "", type: "percent_off", value: "", minSubtotal: "", usageLimit: "", perCustomerLimit: "1", startsAt: start, endsAt: today(end) };
}

export function CouponDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CouponForm onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function CouponForm({ onClose }: { onClose: () => void }) {
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [errors, setErrors] = useState<CouponErrors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const command = useMarketingCommand();

  const set = <Field extends keyof CouponDraft>(field: Field, value: CouponDraft[Field]) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const found = checkCoupon(draft);
    setErrors(found);
    setRefusal(null);
    if (Object.keys(found).length > 0) return;

    command.mutate(
      { type: "create-coupon", draft },
      {
        onSuccess: () => {
          toast.success(`Le code ${draft.code.trim().toUpperCase()} est créé.`);
          onClose();
        },
        onError: (failure) => {
          const described = describeChangeFailure(failure);
          const fields: CouponErrors = {};
          for (const [key, message] of Object.entries(described.fields)) {
            if (FIELD_OF[key]) fields[FIELD_OF[key]] = message;
          }
          setErrors(fields);
          if (Object.keys(fields).length === 0) setRefusal(described.message);
        },
      },
    );
  };

  const value = wholeNumber(draft.value);
  const minimum = wholeNumber(draft.minSubtotal);
  // What the offer does, in a sentence, before it is published.
  const summary =
    value && value > 0
      ? `${draft.type === "percent_off" ? `${value} % de réduction` : `${formatFrancs(value)} de réduction`} sur les articles de votre boutique${minimum ? `, dès ${formatFrancs(minimum)} d'achat chez vous` : ""}. Le client saisit le code dans son panier.`
      : "Le client saisit le code dans son panier ; la réduction porte sur les articles de votre boutique.";

  return (
    <DialogContent
      title="Créer un code promotionnel"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={command.isPending}>
            Annuler
          </Button>
          <Button variant="primary" icon={TicketPercent} loading={command.isPending} onClick={() => submit()}>
            Créer le code
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {refusal && <Alert tone="danger" title={refusal} />}

        <FormField label="Code" required error={errors.code} hint="Lettres et chiffres, sans espace. Il est enregistré en majuscules.">
          <Input value={draft.code} onChange={(event) => set("code", event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={50} placeholder="SUGU10" autoFocus />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Type de réduction" required error={errors.type}>
            <Select value={draft.type} onChange={(event) => set("type", event.target.value as DiscountType)} options={DISCOUNT_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))} />
          </FormField>
          <FormField label="Valeur" required error={errors.value} hint={draft.type === "percent_off" ? "De 1 à 100." : "En francs entiers."}>
            <Input inputMode="numeric" value={draft.value} onChange={(event) => set("value", event.target.value)} suffix={draft.type === "percent_off" ? "%" : "FCFA"} autoComplete="off" />
          </FormField>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Commande minimum" error={errors.minSubtotal} hint="Facultatif. Montant d'achat dans votre boutique.">
            <Input inputMode="numeric" value={draft.minSubtotal} onChange={(event) => set("minSubtotal", event.target.value)} suffix="FCFA" autoComplete="off" />
          </FormField>
          <FormField label="Limite d'utilisation" error={errors.usageLimit} hint="Facultatif. Nombre total d'utilisations.">
            <Input inputMode="numeric" value={draft.usageLimit} onChange={(event) => set("usageLimit", event.target.value)} autoComplete="off" />
          </FormField>
        </div>

        <FormField label="Limite par client" error={errors.perCustomerLimit} hint="Facultatif. Laissez vide pour ne pas limiter.">
          <Input inputMode="numeric" value={draft.perCustomerLimit} onChange={(event) => set("perCustomerLimit", event.target.value)} autoComplete="off" />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Date de début" required error={errors.startsAt}>
            <Input type="date" value={draft.startsAt} onChange={(event) => set("startsAt", event.target.value)} />
          </FormField>
          <FormField label="Date de fin" required error={errors.endsAt} hint="Le code vaut jusqu'à la fin de ce jour.">
            <Input type="date" value={draft.endsAt} min={draft.startsAt || undefined} onChange={(event) => set("endsAt", event.target.value)} />
          </FormField>
        </div>

        <p className="rounded-control bg-surface-subtle p-3 text-label text-foreground-muted">{summary}</p>

        {/* Enter in a field sends the form. */}
        <button type="submit" hidden />
      </form>
    </DialogContent>
  );
}
