"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MapPin, Package, Pencil, SlidersHorizontal, Store, User, UserPlus } from "lucide-react";
import {
  Button,
  DescriptionList,
  FormErrorSummary,
  FormField,
  Input,
  PageHeader,
  Radio,
  RadioGroup,
  Select,
  StepActions,
  Stepper,
  Textarea,
  formatMoneyFromFrancs,
} from "@/design-system";
import { CourierPicker } from "@/features/agency/components/courier-picker";
import { AgencyPage } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import type { Courier } from "@/features/agency/couriers/contract";
import { deliveryLabel } from "@/features/agency/deliveries/contract";
import { useCreateDelivery, useShopSuggestions } from "@/features/agency/deliveries/hooks";
import {
  EMPTY_NEW_DELIVERY,
  NEW_DELIVERY_FIELDS,
  NEW_DELIVERY_SERVER_FIELD,
  NEW_DELIVERY_STEPS,
  PAYMENT_METHOD_OPTIONS,
  newDeliveryRequest,
  parseAmount,
  validateNewDelivery,
  type NewDeliveryField,
  type NewDeliveryForm,
  type NewDeliveryPriority,
} from "@/features/agency/deliveries/new-delivery";
import type { ShopSuggestion } from "@/features/agency/deliveries/shops";
import { describeAgencyFailure } from "@/features/agency/errors";
import { useOneAtATime } from "@/features/agency/single-flight";
import { formatLongDate } from "@/features/agency/format";

const LIST = "/agency/deliveries";
const STEPS = NEW_DELIVERY_STEPS.map((step) => ({ id: step.id, label: step.label }));
const PRIORITY_LABEL: Record<NewDeliveryPriority, string> = { urgent: "Urgente", normal: "Normale", low: "Basse" };

type Errors = Partial<Record<NewDeliveryField, string>>;

/**
 * Shops of the marketplace whose name holds what is typed as the sender.
 * Only ever a suggestion: the sender of a delivery the agency enters is
 * often no shop of the marketplace, and the field stays free text.
 */
function ShopSuggestions({ typed, onChoose }: { typed: string; onChoose: (shop: ShopSuggestion) => void }) {
  const shops = useShopSuggestions(typed);
  if (shops.length === 0) return null;
  return (
    <div className="-mt-2">
      <p id="delivery-shop-suggestions" className="text-meta text-foreground-muted">
        Boutiques SUGU à ce nom
      </p>
      <ul aria-labelledby="delivery-shop-suggestions" className="mt-1.5 flex flex-col gap-1.5">
        {shops.map((shop) => (
          <li key={shop.id}>
            <button
              type="button"
              onClick={() => onChoose(shop)}
              className="flex w-full min-w-0 items-start gap-2.5 rounded-control border border-border bg-surface p-2.5 text-left transition-colors duration-100 hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <Store className="mt-0.5 size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium text-foreground">{shop.name}</span>
                <span className="truncate text-meta text-foreground-muted">{shop.address ?? "Adresse non renseignée par la boutique"}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What choosing a shop filled in for the pickup, said once it is chosen. */
function takenFrom(shop: ShopSuggestion): string {
  if (shop.address && shop.phone) return "Boutique SUGU : son adresse et son téléphone sont repris pour la collecte. Vous pourrez les corriger à l'étape suivante.";
  if (shop.address) return "Boutique SUGU : son adresse est reprise pour la collecte. Vous pourrez la corriger à l'étape suivante.";
  if (shop.phone) return "Boutique SUGU : son téléphone est repris pour la collecte. Sa fiche ne donne pas d'adresse : vous la saisirez à l'étape suivante.";
  return "Boutique SUGU : sa fiche ne donne ni adresse ni téléphone. Vous les saisirez à l'étape suivante.";
}

export function CreateDeliveryForm() {
  const router = useRouter();
  const create = useCreateDelivery();
  const [form, setForm] = useState<NewDeliveryForm>(EMPTY_NEW_DELIVERY);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  // Kept for the recap: the picker only reports the user id.
  const [courier, setCourier] = useState<Courier | null>(null);
  // The shop of the marketplace the sender was taken from, while the name is still its name.
  const [shop, setShop] = useState<ShopSuggestion | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const step = NEW_DELIVERY_STEPS[stepIndex];
  const errorSteps = [...new Set(Object.keys(errors).map((field) => NEW_DELIVERY_FIELDS[field as NewDeliveryField].step))];

  const set = <Field extends NewDeliveryField>(field: Field, value: NewDeliveryForm[Field]) => {
    setForm((current) => ({ ...current, [field]: value }));
    // An error leaves with the first change of its field.
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const field = (name: NewDeliveryField) => ({ id: NEW_DELIVERY_FIELDS[name].id, label: NEW_DELIVERY_FIELDS[name].label, error: errors[name] ?? null });

  /** Takes the name of a shop, and what its record says of where the parcel is collected. */
  function chooseShop(chosen: ShopSuggestion) {
    setShop(chosen);
    set("vendorName", chosen.name);
    if (chosen.address) set("pickupAddress", chosen.address);
    if (chosen.phone) set("pickupPhone", chosen.phone);
  }
  /** The sender typed by hand. What a shop had filled in leaves with its name, unless it was corrected since. */
  function changeSender(value: string) {
    if (shop && value.trim() !== shop.name) {
      setForm((current) => ({
        ...current,
        pickupAddress: current.pickupAddress === shop.address ? "" : current.pickupAddress,
        pickupPhone: current.pickupPhone === shop.phone ? "" : current.pickupPhone,
      }));
      setShop(null);
    }
    set("vendorName", value);
  }
  const shopNote = shop ? takenFrom(shop) : null;

  /** Shows what is wrong, on the step that holds the first of it. */
  function showErrors(found: Errors) {
    setErrors(found);
    const first = NEW_DELIVERY_STEPS.findIndex((candidate) => Object.keys(found).some((name) => NEW_DELIVERY_FIELDS[name as NewDeliveryField].step === candidate.id));
    if (first >= 0) setStepIndex(first);
    top.current?.scrollIntoView({ block: "start" });
  }

  function goTo(index: number) {
    setStepIndex(index);
    top.current?.scrollIntoView({ block: "start" });
  }

  function next() {
    const found = validateNewDelivery(form, step.id);
    if (Object.keys(found).length > 0) showErrors(found);
    else {
      setErrors({});
      goTo(stepIndex + 1);
    }
  }

  // One at a time: two clicks on « Créer la course » used to create two deliveries.
  const submit = useOneAtATime(async () => {
    const found = validateNewDelivery(form);
    if (Object.keys(found).length > 0) {
      showErrors(found);
      return;
    }
    try {
      const created = await create.mutateAsync(newDeliveryRequest(form));
      toast.success(`Course ${deliveryLabel(created.reference)} créée.`);
      router.push(`${LIST}/${created.id}`);
    } catch (error) {
      const failure = describeAgencyFailure(error);
      const fromServer: Errors = {};
      for (const [name, message] of Object.entries(failure.fields)) {
        const local = NEW_DELIVERY_SERVER_FIELD[name];
        if (local) fromServer[local] = message;
      }
      if (Object.keys(fromServer).length > 0) showErrors(fromServer);
      toast.error(failure.message);
    }
  });

  const items = parseAmount(form.itemsCount);
  const total = parseAmount(form.orderTotal);
  const fee = parseAmount(form.shippingAmount);
  const slot = [form.timeFrom, form.timeTo].filter(Boolean).join(" – ");

  return (
    <AgencyPage className="max-w-3xl">
      <div ref={top} className="scroll-mt-4" />
      <PageHeader
        title="Nouvelle course"
        description="Une livraison que votre agence saisit elle-même : elle n'a pas à être acceptée, et peut être confiée à un livreur tout de suite."
        back={{ label: "Retour aux livraisons", href: LIST }}
      />

      <Stepper steps={STEPS} currentStep={stepIndex} errorSteps={errorSteps} label="Étapes de la nouvelle course" />

      <FormErrorSummary errors={errors as Record<string, string>} fields={NEW_DELIVERY_FIELDS} />

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (stepIndex === NEW_DELIVERY_STEPS.length - 1) void submit();
          else next();
        }}
      >
        {step.id === "parcel" && (
          <Panel title="Le colis" icon={Package} description="Ce que le livreur va transporter, et qui l'envoie.">
            <div className="flex flex-col gap-4">
              <FormField {...field("vendorName")} required hint="Boutique, entreprise ou particulier qui confie le colis. Une boutique SUGU se retrouve par son nom.">
                <Input value={form.vendorName} onChange={(event) => changeSender(event.target.value)} maxLength={255} autoComplete="off" />
              </FormField>
              {shopNote ? (
                <p role="status" className="-mt-2 text-meta text-foreground-muted">
                  {shopNote}
                </p>
              ) : (
                <ShopSuggestions typed={form.vendorName} onChoose={chooseShop} />
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField {...field("itemsCount")} required>
                  <Input inputMode="numeric" value={form.itemsCount} onChange={(event) => set("itemsCount", event.target.value)} />
                </FormField>
                <FormField {...field("orderTotal")} required hint="Ce que valent les articles transportés.">
                  <Input inputMode="decimal" suffix="FCFA" value={form.orderTotal} onChange={(event) => set("orderTotal", event.target.value)} />
                </FormField>
              </div>
              <RadioGroup label={NEW_DELIVERY_FIELDS.paymentStatus.label} value={form.paymentStatus} onValueChange={(value) => set("paymentStatus", value as NewDeliveryForm["paymentStatus"])} required>
                <Radio value="pending" label="À encaisser à la livraison" description="Le livreur doit collecter le paiement auprès du destinataire." />
                <Radio value="paid" label="Déjà payée" description="Rien à encaisser pour les articles." />
              </RadioGroup>
              <FormField {...field("paymentMethod")}>
                <Select value={form.paymentMethod} onChange={(event) => set("paymentMethod", event.target.value)} options={PAYMENT_METHOD_OPTIONS} />
              </FormField>
              <FormField {...field("orderNotes")} hint="Facultatif. Fragile, à tenir droit, à remettre en main propre…">
                <Textarea rows={3} maxLength={2000} value={form.orderNotes} onChange={(event) => set("orderNotes", event.target.value)} />
              </FormField>
            </div>
          </Panel>
        )}

        {step.id === "addresses" && (
          <>
            <Panel title="Collecte" icon={Store} tone="info" description="Où le livreur prend le colis.">
              <div className="flex flex-col gap-4">
                <FormField {...field("pickupAddress")} required>
                  <Input value={form.pickupAddress} onChange={(event) => set("pickupAddress", event.target.value)} maxLength={500} autoComplete="off" />
                </FormField>
                <FormField {...field("pickupPhone")} hint="Facultatif. Pour que le livreur prévienne de son arrivée.">
                  <Input type="tel" inputMode="tel" value={form.pickupPhone} onChange={(event) => set("pickupPhone", event.target.value)} maxLength={32} autoComplete="off" />
                </FormField>
              </div>
            </Panel>
            <Panel title="Livraison" icon={MapPin} description="Où le colis doit être remis.">
              <div className="flex flex-col gap-4">
                <FormField {...field("deliveryAddress")} required>
                  <Input value={form.deliveryAddress} onChange={(event) => set("deliveryAddress", event.target.value)} maxLength={500} autoComplete="off" />
                </FormField>
                <FormField {...field("deliveryInstructions")} hint="Facultatif. Ce qui aide à trouver : une enseigne, une couleur de portail, un étage.">
                  <Textarea rows={2} maxLength={2000} value={form.deliveryInstructions} onChange={(event) => set("deliveryInstructions", event.target.value)} />
                </FormField>
              </div>
            </Panel>
            <Panel title="Destinataire" icon={User} tone="info" description="La personne qui reçoit le colis.">
              <div className="flex flex-col gap-4">
                <FormField {...field("clientName")} required>
                  <Input value={form.clientName} onChange={(event) => set("clientName", event.target.value)} maxLength={255} autoComplete="off" />
                </FormField>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField {...field("clientPhone")} required>
                    <Input type="tel" inputMode="tel" value={form.clientPhone} onChange={(event) => set("clientPhone", event.target.value)} maxLength={32} autoComplete="off" />
                  </FormField>
                  <FormField {...field("clientEmail")} hint="Facultatif.">
                    <Input type="email" inputMode="email" value={form.clientEmail} onChange={(event) => set("clientEmail", event.target.value)} maxLength={255} autoComplete="off" />
                  </FormField>
                </div>
              </div>
            </Panel>
          </>
        )}

        {step.id === "courier" && (
          <>
            <Panel title="Livreur" icon={UserPlus} description="Confiez la course maintenant, ou laissez-la parmi celles à assigner.">
              <div id={NEW_DELIVERY_FIELDS.courierUserId.id}>
                <CourierPicker
                  value={form.courierUserId}
                  onChange={(userId, chosen) => {
                    set("courierUserId", userId);
                    setCourier(chosen);
                  }}
                  none={{ label: "Assigner plus tard", description: "La course attendra un livreur dans la liste des livraisons." }}
                  disabled={create.isPending}
                />
                {errors.courierUserId && (
                  <p role="alert" className="mt-2 text-meta text-danger-fg">
                    {errors.courierUserId}
                  </p>
                )}
              </div>
            </Panel>
            <Panel title="Options" icon={SlidersHorizontal} tone="neutral">
              <div className="flex flex-col gap-4">
                <RadioGroup label={NEW_DELIVERY_FIELDS.priority.label} value={form.priority} onValueChange={(value) => set("priority", value as NewDeliveryPriority)}>
                  <Radio value="urgent" label="Urgente" description="À livrer avant les autres." />
                  <Radio value="normal" label="Normale" />
                  <Radio value="low" label="Basse" description="Peut attendre une tournée." />
                </RadioGroup>
                <FormField {...field("shippingAmount")} hint="Ce que le client paie pour la livraison. Facultatif : vous pourrez le fixer plus tard.">
                  <Input inputMode="decimal" suffix="FCFA" value={form.shippingAmount} onChange={(event) => set("shippingAmount", event.target.value)} />
                </FormField>
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField {...field("deliveryDate")} hint="Le jour promis au client.">
                    <Input type="date" value={form.deliveryDate} onChange={(event) => set("deliveryDate", event.target.value)} />
                  </FormField>
                  <FormField {...field("timeFrom")}>
                    <Input type="time" value={form.timeFrom} onChange={(event) => set("timeFrom", event.target.value)} />
                  </FormField>
                  <FormField {...field("timeTo")} hint="Passée cette heure, la course est en retard.">
                    <Input type="time" value={form.timeTo} onChange={(event) => set("timeTo", event.target.value)} />
                  </FormField>
                </div>
              </div>
            </Panel>
          </>
        )}

        {step.id === "summary" && (
          <>
            <Panel
              title="Le colis"
              icon={Package}
              actions={
                <Button size="compact" icon={Pencil} onClick={() => goTo(0)}>
                  Modifier
                </Button>
              }
            >
              <DescriptionList
                className="-my-2"
                items={[
                  { label: "Expéditeur", value: form.vendorName },
                  { label: "Articles", value: items === null ? "—" : `${items} article${items > 1 ? "s" : ""}` },
                  { label: "Valeur des articles", value: total === null ? "—" : formatMoneyFromFrancs(total) },
                  { label: "Paiement", value: `${form.paymentStatus === "paid" ? "Déjà payée" : "À encaisser à la livraison"} · ${PAYMENT_METHOD_OPTIONS.find((option) => option.value === form.paymentMethod)?.label ?? form.paymentMethod}` },
                  ...(form.orderNotes.trim() ? [{ label: "Consigne", value: form.orderNotes.trim() }] : []),
                ]}
              />
            </Panel>
            <Panel
              title="Adresses et destinataire"
              icon={MapPin}
              actions={
                <Button size="compact" icon={Pencil} onClick={() => goTo(1)}>
                  Modifier
                </Button>
              }
            >
              <DescriptionList
                className="-my-2"
                items={[
                  { label: "Collecte", value: [form.pickupAddress.trim(), form.pickupPhone.trim()].filter(Boolean).join(" · ") },
                  { label: "Livraison", value: form.deliveryAddress.trim() },
                  ...(form.deliveryInstructions.trim() ? [{ label: "Point de repère", value: form.deliveryInstructions.trim() }] : []),
                  { label: "Destinataire", value: [form.clientName.trim(), form.clientPhone.trim(), form.clientEmail.trim()].filter(Boolean).join(" · ") },
                ]}
              />
            </Panel>
            <Panel
              title="Livreur et options"
              icon={UserPlus}
              actions={
                <Button size="compact" icon={Pencil} onClick={() => goTo(2)}>
                  Modifier
                </Button>
              }
            >
              <DescriptionList
                className="-my-2"
                items={[
                  { label: "Livreur", value: courier && form.courierUserId ? courier.name : "À assigner plus tard" },
                  { label: "Priorité", value: PRIORITY_LABEL[form.priority] },
                  { label: "Prix de la livraison", value: fee === null ? "Non fixé" : formatMoneyFromFrancs(fee) },
                  { label: "Livraison promise", value: form.deliveryDate ? [formatLongDate(form.deliveryDate), slot].filter(Boolean).join(", ") : "Aucune date" },
                ]}
              />
            </Panel>
          </>
        )}

        <StepActions
          isFirstStep={stepIndex === 0}
          isLastStep={stepIndex === NEW_DELIVERY_STEPS.length - 1}
          onPrevious={() => goTo(stepIndex - 1)}
          onNext={next}
          onSubmit={submit}
          submitLabel="Créer la course"
          submitting={create.isPending}
          sticky
        />
      </form>
    </AgencyPage>
  );
}
