"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, MoreHorizontal, Pencil, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import { Alert, Badge, Button, Checkbox, ConfirmDialog, Dialog, DialogContent, DropdownMenu, DropdownMenuItem, EmptyState, ErrorState, FormField, IconButton, Input, Radio, RadioGroup, Select, Skeleton, StatusBadge } from "@/design-system";
import { useOneAtATime } from "@/features/agency/single-flight";
import { canEditMethods, type FinanceProfile } from "../api";
import type { MethodDraft, MethodKind, PayoutMethod } from "../contract";
import { useFinanceScope, useMethodCommand, useMethods, useSummary } from "../hooks";
import { FINANCE_SPACES, financePaths } from "../spaces";
import { describeFinanceFailure, isForbidden } from "../wording";
import { FinanceHeader, FinancePage, MethodIdentity, useReturnFocus } from "./bits";

// The accounts withdrawals are sent to, after the mock-up: a card a method,
// its menu, and the form that declares one.
//
// A method is declared here and verified by SUGU: the portal shows the state
// the server gives, and never makes a method usable itself. The numbers are
// masked by the server; the portal holds them only while they are typed.

type FormTarget = { mode: "create" } | { mode: "edit"; method: PayoutMethod };

export function FinanceMethods({ profile }: { profile: FinanceProfile }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);
  const methods = useMethods(scope);
  const summary = useSummary(scope);
  const command = useMethodCommand(scope);

  const [form, setForm] = useState<FormTarget | null>(null);
  const [removing, setRemoving] = useState<PayoutMethod | null>(null);
  const focus = useReturnFocus();
  const openForm = (target: FormTarget) => {
    focus.remember();
    setForm(target);
  };
  const closeForm = () => {
    setForm(null);
    focus.restore();
  };
  const editable = scope ? canEditMethods(scope) : false;
  const back = { label: `Retour : ${space.title}`, href: paths.overview };

  // `?ajouter=1` (from the settings): open the form once the list is there.
  const router = useRouter();
  const pathname = usePathname();
  const wantsNew = useSearchParams().get("ajouter") === "1";
  const [newHandled, setNewHandled] = useState(false);
  if (wantsNew && methods.data && !newHandled) {
    setNewHandled(true);
    if (editable) setForm({ mode: "create" });
  }
  useEffect(() => {
    // The form is open: the address forgets the request, so that a reload does not reopen it.
    if (wantsNew && newHandled) router.replace(pathname, { scroll: false });
  }, [wantsNew, newHandled, router, pathname]);

  const makeDefault = useOneAtATime(async (method: PayoutMethod) => {
    try {
      await command.mutateAsync({ type: "set_default", id: method.id });
      toast.success(`${method.label} est maintenant votre méthode par défaut.`);
    } catch (error) {
      toast.error(describeFinanceFailure(error).message);
    }
  });

  const remove = async () => {
    if (!removing) return;
    try {
      await command.mutateAsync({ type: "delete", id: removing.id });
      toast.success("Méthode de paiement supprimée.");
      setRemoving(null);
    } catch (error) {
      toast.error(describeFinanceFailure(error).message);
      setRemoving(null);
    }
  };

  const failed = methods.isError && !methods.data;

  return (
    <FinancePage narrow>
      <FinanceHeader
        title="Mes méthodes"
        back={back}
        actions={
          !failed && (
            <Button variant="primary" size="compact" icon={Plus} onClick={() => openForm({ mode: "create" })}>
              Ajouter
            </Button>
          )
        }
      />

      {!methods.data && !methods.isError ? (
        <div className="flex flex-col gap-3" aria-busy>
          <p role="status" className="sr-only">
            Chargement des méthodes de paiement…
          </p>
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-[4.5rem] rounded-panel" />
          ))}
        </div>
      ) : failed ? (
        isForbidden(methods.error) ? (
          <Alert tone="warning" title="Accès réservé">
            {describeFinanceFailure(methods.error).message}
          </Alert>
        ) : (
          // An outage is not "no method": it is said, with a way to ask again.
          <ErrorState title="Méthodes de paiement indisponibles" description={describeFinanceFailure(methods.error).message} onRetry={() => methods.refetch()} retrying={methods.isFetching} />
        )
      ) : methods.data && methods.data.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Aucune méthode de paiement"
          description="Ajoutez un compte mobile money ou bancaire pour recevoir vos retraits. SUGU le vérifie avant le premier retrait."
          action={
            <Button variant="primary" icon={Plus} onClick={() => openForm({ mode: "create" })}>
              Ajouter une méthode
            </Button>
          }
        />
      ) : (
        <ul aria-label="Méthodes de paiement" className="flex flex-col gap-3">
          {methods.data?.map((method) => (
            <li key={method.id} className="flex items-center gap-2 rounded-panel border border-border bg-surface p-3">
              <MethodIdentity method={method}>
                {method.isDefault && (
                  <Badge tone="success" icon={Star}>
                    Par défaut
                  </Badge>
                )}
                {/* Said only when it is not usable: a verified method needs no label. */}
                {method.state !== "verified" && <StatusBadge domain="payoutMethod" code={method.state} />}
              </MethodIdentity>
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions pour ${method.label} ${method.account ?? ""}`.trim()} size="compact" />}>
                {!method.isDefault && (
                  <DropdownMenuItem icon={Star} onSelect={() => makeDefault(method)}>
                    Définir par défaut
                  </DropdownMenuItem>
                )}
                {editable && (
                  <DropdownMenuItem icon={Pencil} onSelect={() => setForm({ mode: "edit", method })}>
                    Modifier
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setRemoving(method)}>
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-3 rounded-panel border border-border bg-surface-subtle p-4 text-label font-normal text-foreground-muted">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success-icon" aria-hidden="true" />
        <span>Vos méthodes de paiement servent uniquement à vos retraits. Chaque compte est vérifié par un opérateur SUGU avant de pouvoir recevoir de l&apos;argent, et ses numéros ne sont jamais affichés en entier.</span>
      </p>

      <Dialog open={form !== null} onOpenChange={(open) => !open && closeForm()}>
        {form && scope && (
          <MethodForm
            target={form}
            providers={summary.data?.mobileMoneyProviders ?? []}
            providersState={summary.isError && !summary.data ? "error" : summary.data ? "ready" : "loading"}
            onClose={closeForm}
            onSubmit={(draft) => command.mutateAsync(form.mode === "edit" ? { type: "update", id: form.method.id, draft } : { type: "create", draft })}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Supprimer cette méthode ?"
        description={
          removing ? (
            <>
              {removing.label} {removing.account ?? ""} ne pourra plus recevoir de retrait. Pour l&apos;utiliser à nouveau, il faudra la déclarer et la faire vérifier une nouvelle fois.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        confirmIcon={Trash2}
        tone="danger"
        onConfirm={remove}
      />
    </FinancePage>
  );
}

// ── Form ────────────────────────────────────────────────────

/** What Laravel accepts: `StoreDeliveryPayoutSettingRequest` and `CreatePayoutSettingRequest`. */
const E164 = /^\+[1-9]\d{6,14}$/;
const IBAN = /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/;

/** Fields of the server's 422, by the name of the field of the form. */
const FIELD_OF: Record<string, string> = {
  mm_provider: "provider",
  mm_msisdn_e164: "phone",
  mm_account_name: "holder",
  account_holder_name: "holder",
  bank_name: "bank",
  account_number: "accountNumber",
  iban: "iban",
};

function MethodForm({
  target,
  providers,
  providersState,
  onClose,
  onSubmit,
}: {
  target: FormTarget;
  providers: Array<{ code: string; label: string }>;
  providersState: "loading" | "error" | "ready";
  onClose: () => void;
  onSubmit: (draft: MethodDraft) => Promise<unknown>;
}) {
  const editing = target.mode === "edit" ? target.method : null;

  const [kind, setKind] = useState<MethodKind>(editing?.kind ?? "mobile_money");
  const [provider, setProvider] = useState(editing?.kind === "mobile_money" ? (editing.provider ?? "") : "");
  const [phone, setPhone] = useState("+226");
  const [holder, setHolder] = useState(editing?.holder ?? "");
  const [bank, setBank] = useState(editing?.kind === "bank" ? editing.label : "");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function validate(): { draft: MethodDraft | null; errors: Record<string, string> } {
    const found: Record<string, string> = {};
    if (holder.trim().length < 2) found.holder = "Indiquez le nom du titulaire du compte.";

    if (kind === "mobile_money") {
      const number = phone.replace(/[\s.-]/g, "");
      if (!provider) found.provider = "Choisissez l'opérateur.";
      if (!E164.test(number)) found.phone = "Saisissez le numéro au format international, par exemple +22670123456.";
      return { draft: Object.keys(found).length ? null : { kind, provider, phone: number, holder, isDefault }, errors: found };
    }

    const compactIban = iban.replace(/\s+/g, "").toUpperCase();
    if (bank.trim().length < 2) found.bank = "Indiquez le nom de la banque.";
    if (!compactIban && !accountNumber.trim()) found.accountNumber = "Un IBAN ou un numéro de compte est requis.";
    if (compactIban && !IBAN.test(compactIban)) found.iban = "Le format de l'IBAN est invalide.";
    return { draft: Object.keys(found).length ? null : { kind, bank, holder, accountNumber, iban: compactIban, isDefault }, errors: found };
  }

  const submit = useOneAtATime(async () => {
    const checked = validate();
    setErrors(checked.errors);
    setFailure(null);
    if (!checked.draft) return;

    setSending(true);
    try {
      await onSubmit(checked.draft);
      toast.success(editing ? "Méthode mise à jour. SUGU doit la vérifier à nouveau avant un retrait." : "Méthode enregistrée. SUGU la vérifie avant votre premier retrait.");
      onClose();
    } catch (error) {
      const described = describeFinanceFailure(error);
      const fields: Record<string, string> = {};
      for (const [field, message] of Object.entries(described.fields)) fields[FIELD_OF[field] ?? field] = message;
      setErrors(fields);
      setFailure(described.message);
    } finally {
      setSending(false);
    }
  });

  return (
    <DialogContent
      title={editing ? "Modifier la méthode" : "Ajouter une méthode de paiement"}
      description="Le compte sur lequel SUGU vous envoie vos retraits."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button variant="primary" loading={sending} onClick={() => submit()}>
            {editing ? "Enregistrer" : "Ajouter la méthode"}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {failure && <Alert tone="danger" title={failure} />}

        {editing?.payable && (
          <Alert tone="warning" title="Cette méthode est vérifiée.">
            Si vous changez ses coordonnées, elle devra être vérifiée à nouveau par SUGU et ne pourra plus recevoir de retrait d&apos;ici là.
          </Alert>
        )}

        <RadioGroup label="Type de compte" value={kind} onValueChange={(value) => setKind(value as MethodKind)} required>
          <Radio value="mobile_money" label="Mobile money" description="Un numéro de téléphone chez un opérateur." />
          <Radio value="bank" label="Compte bancaire" description="Un IBAN ou un numéro de compte." />
        </RadioGroup>

        {kind === "mobile_money" ? (
          <>
            <FormField label="Opérateur" required error={errors.provider} hint={providersState === "error" ? "La liste des opérateurs n'a pas pu être chargée. Fermez puis rouvrez ce formulaire." : undefined}>
              <Select value={provider} onChange={(event) => setProvider(event.target.value)} placeholder={providersState === "loading" ? "Chargement…" : "Choisir un opérateur"} options={providers.map((entry) => ({ value: entry.code, label: entry.label }))} disabled={providersState !== "ready"} />
            </FormField>
            <FormField label="Numéro mobile money" required error={errors.phone} hint={editing ? "Saisissez à nouveau le numéro : il n'est jamais renvoyé en entier." : "Avec l'indicatif du pays : +226 pour le Burkina Faso."}>
              <Input type="tel" inputMode="tel" autoComplete="off" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+22670123456" />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Banque" required error={errors.bank}>
              <Input value={bank} onChange={(event) => setBank(event.target.value)} autoComplete="off" placeholder="Nom de la banque" />
            </FormField>
            <FormField label="IBAN" error={errors.iban} hint="Ou, à défaut, le numéro de compte ci-dessous.">
              <Input value={iban} onChange={(event) => setIban(event.target.value)} autoComplete="off" autoCapitalize="characters" placeholder="BF42 …" />
            </FormField>
            <FormField label="Numéro de compte" error={errors.accountNumber}>
              <Input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} autoComplete="off" inputMode="numeric" />
            </FormField>
          </>
        )}

        <FormField label="Titulaire du compte" required error={errors.holder} hint="Le nom exact sous lequel le compte est ouvert.">
          <Input value={holder} onChange={(event) => setHolder(event.target.value)} autoComplete="off" />
        </FormField>

        <Checkbox checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} label="Utiliser par défaut pour mes retraits" />

        {/* Enter in a field sends the form. */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">
          Envoyer
        </button>
      </form>
    </DialogContent>
  );
}
