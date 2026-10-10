"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Package, Plus, Search, ShoppingCart, Trash2, UserRound, X } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  DescriptionList,
  ErrorState,
  FormErrorSummary,
  FormField,
  IconButton,
  Input,
  Money,
  PageHeader,
  Radio,
  RadioGroup,
  Section,
  Select,
  Skeleton,
  StepActions,
  Stepper,
  Textarea,
  type StepDefinition,
} from "@/design-system";
import { useIdempotencyKey } from "@/lib/utils/use-idempotency-key";
import { describeFailure } from "@/features/vendor/orders/errors";
import {
  useCreateSale,
  useSaleAgencies,
  useSaleCustomerSearch,
  useSaleProductSearch,
} from "@/features/vendor/orders/hooks";
import {
  EMPTY_SALE,
  SALE_FIELD_STEP,
  SALE_STEPS,
  buildSaleRequest,
  computeSaleTotals,
  saleFieldOfApiError,
  validateSale,
  type DiscountKind,
  type SaleAgency,
  type SaleCustomer,
  type SaleDraft,
  type SaleProduct,
  type SaleStep,
  type SaleTotals,
} from "@/features/vendor/orders/sale";

const STEPS: StepDefinition[] = [
  { id: "items", label: "Articles" },
  { id: "customer", label: "Client" },
  { id: "delivery", label: "Livraison" },
  { id: "review", label: "Récapitulatif" },
];

/** Labels and anchors of the fields, for the error summary. */
const FIELDS: Record<string, { label: string; id?: string }> = {
  lines: { label: "Articles", id: "sale-product-search" },
  discount: { label: "Remise", id: "sale-discount" },
  customer: { label: "Client", id: "sale-customer-search" },
  customerName: { label: "Nom du client", id: "sale-customer-name" },
  customerPhone: { label: "Téléphone", id: "sale-customer-phone" },
  customerEmail: { label: "E-mail", id: "sale-customer-email" },
  agency: { label: "Agence", id: "sale-agency" },
  addressLine: { label: "Adresse de livraison", id: "sale-address" },
};

export function CreateOrderForm() {
  const router = useRouter();
  const [draft, setDraft] = useState<SaleDraft>(EMPTY_SALE);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const create = useCreateSale();
  // One key for the life of this form: a retry replays, it does not duplicate.
  const idempotencyKey = useIdempotencyKey();

  const step = SALE_STEPS[stepIndex];
  const totals = computeSaleTotals(draft);
  const update = (patch: Partial<SaleDraft>) => setDraft((current) => ({ ...current, ...patch }));

  /** Drop the errors of the fields being edited: they are re-checked on "Suivant". */
  function clearErrors(...keys: string[]) {
    setErrors((current) => {
      if (!keys.some((key) => key in current)) return current;
      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  }

  function goTo(index: number) {
    setStepIndex(index);
    window.scrollTo({ top: 0 });
  }

  function next() {
    const found = validateSale(draft, step);
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(stepIndex + 1);
  }

  /** Show the step that holds the first error. */
  function showErrors(found: Record<string, string>) {
    setErrors(found);
    const first = Object.keys(found).map((key) => SALE_FIELD_STEP[key]).find(Boolean);
    if (first) goTo(SALE_STEPS.indexOf(first));
  }

  async function submit() {
    if (create.isPending) return;
    setSubmitError(null);

    const found = validateSale(draft);
    if (Object.keys(found).length > 0) return showErrors(found);

    try {
      const sale = await create.mutateAsync({ request: buildSaleRequest(draft), idempotencyKey: idempotencyKey() });
      toast.success(sale.reference ? `Vente ${sale.reference} enregistrée.` : "Vente enregistrée.");
      router.push(`/vendor/orders/${sale.id}`);
    } catch (error) {
      const failure = describeFailure(error);
      const fieldErrors: Record<string, string> = {};
      for (const [path, message] of Object.entries(failure.fields)) {
        const field = saleFieldOfApiError(path);
        if (field && !fieldErrors[field]) fieldErrors[field] = message;
      }
      if (Object.keys(fieldErrors).length > 0) showErrors(fieldErrors);
      else setSubmitError(failure.message);
    }
  }

  const errorSteps = [...new Set(Object.keys(errors).map((key) => SALE_FIELD_STEP[key]).filter(Boolean))];

  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        title="Nouvelle vente"
        description="Enregistrez une vente faite en boutique, par téléphone ou sur les réseaux."
        breadcrumbs={[{ label: "Commandes", href: "/vendor/orders" }, { label: "Nouvelle vente" }]}
      />

      <Stepper steps={STEPS} currentStep={stepIndex} errorSteps={errorSteps} label="Étapes de la vente" />

      <FormErrorSummary errors={errors} fields={FIELDS} />
      {submitError && (
        <Alert tone="danger" title="La vente n'a pas été enregistrée">
          {submitError}
        </Alert>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {step === "items" && (
            <ItemsStep
              draft={draft}
              totals={totals}
              errors={errors}
              onChange={(patch) => {
                update(patch);
                clearErrors("lines", "discount");
              }}
            />
          )}
          {step === "customer" && (
            <CustomerStep
              draft={draft}
              errors={errors}
              onChange={(patch) => {
                update(patch);
                clearErrors("customer", "customerName", "customerPhone", "customerEmail");
              }}
            />
          )}
          {step === "delivery" && (
            <DeliveryStep
              draft={draft}
              errors={errors}
              onChange={(patch) => {
                update(patch);
                clearErrors("agency", "addressLine");
              }}
            />
          )}
          {step === "review" && <ReviewStep draft={draft} totals={totals} onEdit={(target) => goTo(SALE_STEPS.indexOf(target))} />}
        </div>

        {step !== "review" && (
          <Card className="hidden lg:sticky lg:top-4 lg:block">
            <Section title="Montant" headingLevel={2}>
              <TotalsList totals={totals} />
            </Section>
          </Card>
        )}
      </div>

      <StepActions
        isFirstStep={stepIndex === 0}
        isLastStep={step === "review"}
        onPrevious={() => goTo(stepIndex - 1)}
        onNext={next}
        onSubmit={submit}
        submitLabel="Enregistrer la vente"
        submitIcon={ShoppingCart}
        submitting={create.isPending}
        sticky
      />
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────

function TotalsList({ totals }: { totals: SaleTotals }) {
  return (
    <DescriptionList
      items={[
        {
          label: `Articles (${totals.itemCount})`,
          value: <Money francs={totals.subtotalFrancs} />,
        },
        ...(totals.discountFrancs > 0 ? [{ label: "Remise", value: <Money francs={-totals.discountFrancs} /> }] : []),
        { label: "Total à encaisser", value: <Money francs={totals.totalFrancs} className="text-section-title" /> },
      ]}
    />
  );
}

interface StepProps {
  draft: SaleDraft;
  errors: Record<string, string>;
  onChange: (patch: Partial<SaleDraft>) => void;
}

function Thumbnail({ src }: { src: string | null }) {
  return (
    <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-surface-subtle">
      {src ? (
        <Image src={src} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        <Package className="size-5 text-foreground-subtle" aria-hidden="true" />
      )}
    </div>
  );
}

// ── Step 1: items ───────────────────────────────────────────

function ItemsStep({ draft, totals, errors, onChange }: StepProps & { totals: SaleTotals }) {
  const [search, setSearch] = useState("");
  const results = useSaleProductSearch(search);
  const searching = search.trim().length >= 2;
  const inCart = new Set(draft.lines.map((line) => line.productId));

  function add(product: SaleProduct) {
    onChange({
      lines: [
        ...draft.lines,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          imageUrl: product.imageUrl,
          unitPriceFrancs: product.priceFrancs,
          quantity: 1,
          stock: product.stock,
        },
      ],
    });
  }

  function setQuantity(productId: string, quantity: number) {
    onChange({
      lines: draft.lines.map((line) =>
        line.productId === productId ? { ...line, quantity: Math.max(1, Math.min(line.stock, quantity)) } : line,
      ),
    });
  }

  return (
    <>
      <Card>
        <Section title="Ajouter des articles" description="Recherchez dans le catalogue de votre boutique.">
          <FormField label="Rechercher un produit" hideLabel id="sale-product-search" error={errors.lines}>
            <Input
              type="search"
              leadingIcon={Search}
              placeholder="Nom ou référence du produit"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
            />
          </FormField>

          {searching && (
            <div aria-live="polite">
              {results.isError ? (
                <ErrorState
                  title="La recherche a échoué"
                  description={describeFailure(results.error).message}
                  onRetry={() => results.refetch()}
                  retrying={results.isFetching}
                />
              ) : results.isPending ? (
                <div className="flex flex-col gap-2" role="status" aria-label="Recherche en cours">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : results.data.length === 0 ? (
                <p className="text-body text-foreground-muted">Aucun produit ne correspond à « {search.trim()} ».</p>
              ) : (
                <ul className="divide-y divide-border rounded-control border border-border">
                  {results.data.map((product) => {
                    const added = inCart.has(product.id);
                    const unavailable = product.stock <= 0;
                    return (
                      <li key={product.id} className="flex items-center gap-3 px-3 py-2">
                        <Thumbnail src={product.imageUrl} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-body font-medium text-foreground">{product.name}</p>
                          <p className="text-meta text-foreground-muted tabular-nums">
                            <Money francs={product.priceFrancs} /> ·{" "}
                            {unavailable ? "Rupture de stock" : `${product.stock} en stock`}
                          </p>
                        </div>
                        <Button
                          size="compact"
                          icon={Plus}
                          disabled={added || unavailable}
                          onClick={() => add(product)}
                          aria-label={`Ajouter ${product.name}`}
                        >
                          {added ? "Ajouté" : "Ajouter"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </Section>
      </Card>

      <Card>
        <Section title="Articles de la vente">
          {draft.lines.length === 0 ? (
            <p className="text-body text-foreground-muted">Aucun article pour le moment.</p>
          ) : (
            <ul className="divide-y divide-border">
              {draft.lines.map((line) => (
                <li key={line.productId} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Thumbnail src={line.imageUrl} />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="text-body font-medium break-words text-foreground">{line.name}</p>
                    <p className="text-meta text-foreground-muted tabular-nums">
                      <Money francs={line.unitPriceFrancs} /> l&apos;unité · {line.stock} en stock
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconButton
                      icon={Minus}
                      variant="secondary"
                      label={`Retirer un ${line.name}`}
                      tooltip={false}
                      disabled={line.quantity <= 1}
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    />
                    <span
                      className="w-8 text-center text-body font-medium text-foreground tabular-nums"
                      aria-label={`Quantité de ${line.name} : ${line.quantity}`}
                    >
                      {line.quantity}
                    </span>
                    <IconButton
                      icon={Plus}
                      variant="secondary"
                      label={`Ajouter un ${line.name}`}
                      tooltip={false}
                      disabled={line.quantity >= line.stock}
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    />
                  </div>
                  <Money
                    francs={line.unitPriceFrancs * line.quantity}
                    className="w-28 text-right text-body font-medium text-foreground"
                  />
                  <IconButton
                    icon={Trash2}
                    label={`Supprimer ${line.name} de la vente`}
                    onClick={() => onChange({ lines: draft.lines.filter((other) => other.productId !== line.productId) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </Card>

      <Card>
        <Section title="Remise" description="Facultative. Elle s'applique au total de la vente.">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Type de remise">
              <Select
                value={draft.discountKind}
                onChange={(event) => onChange({ discountKind: event.target.value as DiscountKind })}
                options={[
                  { value: "amount", label: "Montant en FCFA" },
                  { value: "percent", label: "Pourcentage" },
                ]}
              />
            </FormField>
            <FormField label="Remise" id="sale-discount" error={errors.discount}>
              <Input
                inputMode="numeric"
                placeholder="0"
                suffix={draft.discountKind === "percent" ? "%" : "FCFA"}
                value={draft.discountInput}
                onChange={(event) => onChange({ discountInput: event.target.value })}
              />
            </FormField>
          </div>
          <div className="lg:hidden">
            <TotalsList totals={totals} />
          </div>
        </Section>
      </Card>
    </>
  );
}

// ── Step 2: customer ────────────────────────────────────────

function CustomerStep({ draft, errors, onChange }: StepProps) {
  const [search, setSearch] = useState("");
  const results = useSaleCustomerSearch(search);
  const searching = search.trim().length >= 2;

  function choose(customer: SaleCustomer) {
    onChange({ customer });
    setSearch("");
  }

  return (
    <Card>
      <Section title="Client">
        <RadioGroup
          label="Ce client est-il déjà dans votre fichier ?"
          value={draft.customerMode}
          onValueChange={(value) => onChange({ customerMode: value as SaleDraft["customerMode"] })}
        >
          <Radio value="existing" label="Client existant" />
          <Radio value="new" label="Nouveau client" description="Il sera ajouté à votre fichier clients." />
        </RadioGroup>

        {draft.customerMode === "existing" ? (
          draft.customer ? (
            <div className="flex items-center gap-3 rounded-control border border-border bg-surface-subtle px-3 py-2">
              <UserRound className="size-5 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-foreground">{draft.customer.name}</p>
                <p className="truncate text-meta text-foreground-muted tabular-nums">
                  {draft.customer.phone ?? draft.customer.email ?? "Aucune coordonnée enregistrée"}
                </p>
              </div>
              <Button size="compact" icon={X} onClick={() => onChange({ customer: null })}>
                Changer
              </Button>
            </div>
          ) : (
            <>
              <FormField label="Rechercher un client" id="sale-customer-search" error={errors.customer}>
                <Input
                  type="search"
                  leadingIcon={Search}
                  placeholder="Nom, téléphone ou e-mail"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  autoComplete="off"
                />
              </FormField>
              {searching && (
                <div aria-live="polite">
                  {results.isError ? (
                    <ErrorState
                      title="La recherche a échoué"
                      description={describeFailure(results.error).message}
                      onRetry={() => results.refetch()}
                      retrying={results.isFetching}
                    />
                  ) : results.isPending ? (
                    <Skeleton className="h-12" role="status" aria-label="Recherche en cours" />
                  ) : results.data.length === 0 ? (
                    <p className="text-body text-foreground-muted">
                      Aucun client ne correspond à « {search.trim()} ». Choisissez « Nouveau client » pour le créer.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border rounded-control border border-border">
                      {results.data.map((customer) => (
                        <li key={customer.id} className="flex items-center gap-3 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-body font-medium text-foreground">{customer.name}</p>
                            <p className="truncate text-meta text-foreground-muted tabular-nums">
                              {customer.phone ?? customer.email ?? "Aucune coordonnée enregistrée"}
                            </p>
                          </div>
                          <Button size="compact" onClick={() => choose(customer)} aria-label={`Choisir ${customer.name}`}>
                            Choisir
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nom complet" required id="sale-customer-name" error={errors.customerName} className="md:col-span-2">
              <Input
                autoComplete="off"
                value={draft.newCustomer.name}
                onChange={(event) => onChange({ newCustomer: { ...draft.newCustomer, name: event.target.value } })}
              />
            </FormField>
            <FormField
              label="Téléphone"
              required
              id="sale-customer-phone"
              hint="Numéro du Burkina Faso, sans l'indicatif."
              error={errors.customerPhone}
            >
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={draft.newCustomer.phone}
                onChange={(event) => onChange({ newCustomer: { ...draft.newCustomer, phone: event.target.value } })}
              />
            </FormField>
            <FormField label="E-mail" id="sale-customer-email" error={errors.customerEmail}>
              <Input
                type="email"
                autoComplete="off"
                value={draft.newCustomer.email}
                onChange={(event) => onChange({ newCustomer: { ...draft.newCustomer, email: event.target.value } })}
              />
            </FormField>
          </div>
        )}
      </Section>
    </Card>
  );
}

// ── Step 3: handover ────────────────────────────────────────

function DeliveryStep({ draft, errors, onChange }: StepProps) {
  const shipping = draft.delivery === "shipping";
  const agencies = useSaleAgencies(shipping);

  return (
    <Card>
      <Section title="Livraison">
        <RadioGroup
          label="Comment le client reçoit-il ses articles ?"
          value={draft.delivery}
          onValueChange={(value) => onChange({ delivery: value as SaleDraft["delivery"] })}
        >
          <Radio
            value="pickup"
            label="Vente au comptoir"
            description="Le client repart avec ses articles. La vente est enregistrée comme livrée et encaissée."
          />
          <Radio
            value="shipping"
            label="Livraison par une agence"
            description="La commande est créée « Confirmée », à payer à la livraison. Les frais de livraison sont fixés ensuite avec l'agence."
          />
        </RadioGroup>

        {shipping && (
          <div className="flex flex-col gap-3">
            {agencies.isError ? (
              <ErrorState
                title="Les agences n'ont pas pu être chargées"
                description={describeFailure(agencies.error).message}
                onRetry={() => agencies.refetch()}
                retrying={agencies.isFetching}
              />
            ) : agencies.isPending ? (
              <Skeleton className="h-9" role="status" aria-label="Chargement des agences" />
            ) : agencies.data.length === 0 ? (
              <Alert tone="warning" title="Aucune agence de livraison disponible">
                Aucune agence active n&apos;est proposée pour le moment. Choisissez « Vente au comptoir » ou réessayez plus tard.
              </Alert>
            ) : (
              <AgencyField agencies={agencies.data} draft={draft} error={errors.agency} onChange={onChange} />
            )}

            <FormField label="Adresse de livraison" required id="sale-address" error={errors.addressLine} hint="Quartier, rue, repère.">
              <Input
                autoComplete="off"
                value={draft.addressLine}
                onChange={(event) => onChange({ addressLine: event.target.value })}
              />
            </FormField>
            <FormField label="Ville">
              <Input
                autoComplete="off"
                value={draft.addressCity}
                onChange={(event) => onChange({ addressCity: event.target.value })}
              />
            </FormField>
          </div>
        )}

        <FormField label="Note" hint="Facultative. Visible sur la commande et sur le bon de livraison.">
          <Textarea rows={2} maxLength={2000} value={draft.note} onChange={(event) => onChange({ note: event.target.value })} />
        </FormField>
      </Section>
    </Card>
  );
}

function AgencyField({
  agencies,
  draft,
  error,
  onChange,
}: {
  agencies: SaleAgency[];
  draft: SaleDraft;
  error: string | undefined;
  onChange: (patch: Partial<SaleDraft>) => void;
}) {
  return (
    <FormField label="Agence de livraison" required id="sale-agency" error={error}>
      <Select
        placeholder="Choisir une agence"
        value={draft.agencyId}
        onChange={(event) => onChange({ agencyId: event.target.value })}
        options={agencies.map((agency) => ({ value: agency.id, label: agency.name }))}
      />
    </FormField>
  );
}

// ── Step 4: review ──────────────────────────────────────────

function ReviewStep({
  draft,
  totals,
  onEdit,
}: {
  draft: SaleDraft;
  totals: SaleTotals;
  onEdit: (step: SaleStep) => void;
}) {
  const agencies = useSaleAgencies(draft.delivery === "shipping");
  const agencyName = agencies.data?.find((agency) => agency.id === draft.agencyId)?.name ?? null;
  const customer =
    draft.customerMode === "existing"
      ? { name: draft.customer?.name ?? "—", contact: draft.customer?.phone ?? draft.customer?.email ?? null }
      : { name: draft.newCustomer.name.trim() || "—", contact: draft.newCustomer.phone.trim() || null };

  return (
    <>
      <Card>
        <Section title="Articles" actions={<Button size="compact" onClick={() => onEdit("items")}>Modifier</Button>}>
          <ul className="divide-y divide-border">
            {draft.lines.map((line) => (
              <li key={line.productId} className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
                <span className="min-w-0 text-body text-foreground">
                  <span className="tabular-nums">{line.quantity} × </span>
                  {line.name}
                </span>
                <Money francs={line.unitPriceFrancs * line.quantity} className="text-body text-foreground" />
              </li>
            ))}
          </ul>
          <TotalsList totals={totals} />
        </Section>
      </Card>

      <Card>
        <Section title="Client" actions={<Button size="compact" onClick={() => onEdit("customer")}>Modifier</Button>}>
          <DescriptionList
            items={[
              { label: draft.customerMode === "new" ? "Nouveau client" : "Client", value: customer.name },
              ...(customer.contact ? [{ label: "Contact", value: <span className="tabular-nums">{customer.contact}</span> }] : []),
            ]}
          />
        </Section>
      </Card>

      <Card>
        <Section title="Livraison" actions={<Button size="compact" onClick={() => onEdit("delivery")}>Modifier</Button>}>
          {draft.delivery === "pickup" ? (
            <DescriptionList
              items={[
                { label: "Mode", value: "Vente au comptoir" },
                { label: "Après enregistrement", value: "Commande livrée, paiement encaissé" },
                ...(draft.note.trim() ? [{ label: "Note", value: draft.note.trim() }] : []),
              ]}
            />
          ) : (
            <DescriptionList
              items={[
                { label: "Mode", value: "Livraison par une agence" },
                { label: "Agence", value: agencyName ?? "—" },
                {
                  label: "Adresse",
                  value: [draft.addressLine.trim(), draft.addressCity.trim()].filter(Boolean).join(", ") || "—",
                },
                { label: "Après enregistrement", value: "Commande confirmée, paiement à la livraison" },
                ...(draft.note.trim() ? [{ label: "Note", value: draft.note.trim() }] : []),
              ]}
            />
          )}
        </Section>
      </Card>

      <Alert tone="info" title="Le stock sera mis à jour">
        Les quantités vendues sont retirées du stock dès l&apos;enregistrement.
      </Alert>
    </>
  );
}
