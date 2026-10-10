"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Phone, Save, Send, User } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DescriptionList,
  FormActions,
  FormErrorSummary,
  FormField,
  Input,
  Money,
  Radio,
  RadioGroup,
  Select,
  StepActions,
  Stepper,
  Switch,
  Textarea,
  fieldErrorsFromZod,
} from "@/design-system";

const AGENCIES = [
  { value: "agence-demo-1", label: "Agence Démo Centre" },
  { value: "agence-demo-2", label: "Agence Démo Ouest" },
];

const saleSchema = z.object({
  customer: z.string().trim().min(2, "Indiquez le nom du client."),
  phone: z
    .string()
    .trim()
    .regex(/^(\+226)?\s?\d{2}(\s?\d{2}){3}$/, "Numéro attendu : 8 chiffres, par exemple 70 00 00 00."),
  amount: z.coerce
    .number({ invalid_type_error: "Indiquez un montant." })
    .int("Montant en francs entiers.")
    .positive("Le montant doit être supérieur à 0."),
  agency: z.string().min(1, "Choisissez une agence."),
  notes: z.string().max(200, "200 caractères au maximum."),
});

const FIELD_META = {
  customer: { label: "Client", id: "demo-customer" },
  phone: { label: "Téléphone", id: "demo-phone" },
  amount: { label: "Montant", id: "demo-amount" },
  agency: { label: "Agence", id: "demo-agency" },
  notes: { label: "Instructions", id: "demo-notes" },
};

export function SaleFormDemo() {
  const [values, setValues] = useState({ customer: "", phone: "", amount: "", agency: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [payment, setPayment] = useState("cod");
  const [notify, setNotify] = useState(true);
  const [fragile, setFragile] = useState(false);

  function set(field: keyof typeof values) {
    return (event: { target: { value: string } }) => {
      setValues((current) => ({ ...current, [field]: event.target.value }));
      setSaved(false);
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = saleSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(fieldErrorsFromZod(parsed.error));
      setSaved(false);
      return;
    }
    setErrors({});
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmitting(false);
    setSaved(true);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-label="Vente de démonstration">
        <FormErrorSummary errors={errors} fields={FIELD_META} />
        {saved && (
          <Alert tone="success" title="Vente enregistrée (démonstration)">
            Aucune requête n&apos;a été envoyée.
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Client" id="demo-customer" required error={errors.customer}>
            <Input leadingIcon={User} value={values.customer} onChange={set("customer")} autoComplete="off" />
          </FormField>
          <FormField
            label="Téléphone"
            id="demo-phone"
            required
            hint="Le coursier appellera ce numéro."
            error={errors.phone}
          >
            <Input leadingIcon={Phone} type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} />
          </FormField>
          <FormField label="Montant" id="demo-amount" required error={errors.amount}>
            <Input inputMode="numeric" suffix="FCFA" value={values.amount} onChange={set("amount")} />
          </FormField>
          <FormField label="Agence" id="demo-agency" required error={errors.agency}>
            <Select
              placeholder="Choisir une agence"
              options={AGENCIES}
              value={values.agency}
              onChange={set("agency")}
            />
          </FormField>
        </div>

        <FormField
          label="Instructions"
          id="demo-notes"
          hint={`${values.notes.length} / 200 caractères`}
          error={errors.notes}
        >
          <Textarea rows={3} value={values.notes} onChange={set("notes")} />
        </FormField>

        <div className="grid gap-4 md:grid-cols-2">
          <RadioGroup label="Mode de paiement" value={payment} onValueChange={setPayment} required>
            <Radio value="cod" label="À la livraison" description="Le coursier encaisse le montant." />
            <Radio value="online" label="Payé en ligne" />
            <Radio value="credit" label="À crédit" description="Indisponible pour ce client." disabled />
          </RadioGroup>
          <div className="flex flex-col gap-3">
            <Checkbox
              label="Colis fragile"
              description="Ajoute une mention sur le bon de livraison."
              checked={fragile}
              onChange={(event) => setFragile(event.target.checked)}
            />
            <Checkbox label="Assurance" description="Option non disponible." disabled />
            <FormField label="Prévenir le client par SMS" className="flex-row items-center justify-between">
              <Switch checked={notify} onCheckedChange={setNotify} />
            </FormField>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Référence interne" hint="Champ désactivé." disabled>
            <Input defaultValue="DEMO-0001" />
          </FormField>
          <FormField label="Code de retrait" success="Code vérifié.">
            <Input defaultValue="4821" inputMode="numeric" />
          </FormField>
        </div>

        <FormActions>
          <Button variant="secondary" disabled={submitting} onClick={() => setErrors({})}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" icon={Save} loading={submitting}>
            Enregistrer la vente
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

const STEPS = [
  { id: "product", label: "Produit" },
  { id: "price", label: "Prix et stock" },
  { id: "delivery", label: "Livraison" },
  { id: "summary", label: "Résumé" },
];

export function StepperDemo() {
  const [step, setStep] = useState(1);
  const [withError, setWithError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <Card className="flex flex-col gap-4">
      <Stepper
        label="Création d'un produit (démonstration)"
        steps={STEPS}
        currentStep={step}
        errorSteps={withError ? ["product"] : []}
      />
      {withError && (
        <Alert tone="danger" title="L'étape Produit contient une erreur">
          Revenez à l&apos;étape 1 pour la corriger avant de publier.
        </Alert>
      )}
      {done && <Alert tone="success" title="Produit envoyé en validation (démonstration)" />}
      {step === STEPS.length - 1 ? (
        <DescriptionList
          items={[
            { label: "Produit", value: "Pagne tissé (démo)" },
            { label: "Prix", value: <Money francs={50000} /> },
            { label: "Stock", value: <span className="tabular-nums">24</span> },
            { label: "Livraison", value: "Agence Démo Centre" },
          ]}
        />
      ) : (
        <p className="text-body text-foreground-muted">
          Contenu de l&apos;étape « {STEPS[step].label} ». La page métier fournit les champs et la validation.
        </p>
      )}
      <Checkbox
        label="Simuler une erreur à l'étape 1"
        checked={withError}
        onChange={(event) => setWithError(event.target.checked)}
      />
      <StepActions
        isFirstStep={step === 0}
        isLastStep={step === STEPS.length - 1}
        onPrevious={() => setStep((current) => Math.max(0, current - 1))}
        onNext={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
        submitLabel="Envoyer en validation"
        submitIcon={Send}
        submitting={submitting}
        onSubmit={async () => {
          setSubmitting(true);
          await new Promise((resolve) => setTimeout(resolve, 600));
          setSubmitting(false);
          setDone(true);
        }}
      />
    </Card>
  );
}
