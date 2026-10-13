"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpFromLine, Check, CheckCircle2, CreditCard, Info, Plus, SearchCheck } from "lucide-react";
import { Alert, Button, DescriptionList, EmptyState, ErrorState, FormField, Input, Money, Skeleton, StatusBadge, Stepper, asFrancs, cn, formatMoneyFromCents, francsToCents, type MoneyCents } from "@/design-system";
import { useOneAtATime } from "@/features/agency/single-flight";
import { WithdrawalOutcomeUnknown, type FinanceProfile } from "../api";
import type { PayoutMethod, WalletSummary, Withdrawal, WithdrawalQuote } from "../contract";
import { useFinanceScope, useLookupWithdrawal, useMethods, useQuote, useRequestWithdrawal, useSummary } from "../hooks";
import { FINANCE_SPACES, financePaths } from "../spaces";
import { describeFinanceFailure } from "../wording";
import { FinanceHeader, FinancePage, MethodIdentity, withdrawalItems, withdrawalNote } from "./bits";

// Asking for a withdrawal, in the three steps of its mock-up: the amount, the
// method, the validation. Then what the server recorded.
//
// The portal decides nothing about the money: the balance, the fee and the
// net are read; the refusal of an amount is the server's sentence; and a
// request is shown as recorded only once the server said so.

const STEPS = [
  { id: "amount", label: "Montant" },
  { id: "method", label: "Méthode" },
  { id: "review", label: "Validation" },
];

/** Amounts offered under the field, in francs, when the balance and the ceilings allow them. */
const QUICK_FRANCS = [10_000, 25_000, 50_000, 100_000, 200_000, 500_000];

/** Digits only: "150 000" and "150000" are the same amount; anything else is no amount. */
function parseFrancs(text: string): number | null {
  const digits = text.replace(/\s/g, "");
  if (!/^\d{1,12}$/.test(digits)) return null;
  return Number(digits);
}

/** "150 000": the thousands apart, with a plain space the field can be typed over. */
const groupDigits = (francs: number) => francs.toLocaleString("fr-FR").replace(/\s/g, " ");

/** The most that can be asked now: the balance, in whole francs, under the two ceilings. */
function mostAllowed(summary: WalletSummary): MoneyCents {
  const least = Math.min(summary.available, summary.limits.max, summary.limits.dailyRemaining);
  return (least - (least % 100)) as MoneyCents;
}

function newKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function FinanceWithdraw({ profile }: { profile: FinanceProfile }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);
  const summary = useSummary(scope);
  const back = { label: `Retour : ${space.title}`, href: paths.overview };

  // One attempt, one key. A new attempt (after a result) is a new form and a new key.
  const [attempt, setAttempt] = useState(0);

  if (summary.isError && !summary.data) {
    return (
      <FinancePage narrow>
        <FinanceHeader title="Demander un retrait" back={back} />
        <ErrorState title="Impossible de préparer le retrait" description={describeFinanceFailure(summary.error).message} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
      </FinancePage>
    );
  }

  if (!summary.data || !scope) {
    return (
      <FinancePage narrow aria-busy>
        <p role="status" className="sr-only">
          Chargement…
        </p>
        <FinanceHeader title="Demander un retrait" back={back} />
        <Skeleton className="h-10 rounded-panel" />
        <Skeleton className="h-24 rounded-panel" />
        <Skeleton className="h-40 rounded-panel" />
      </FinancePage>
    );
  }

  return (
    <FinancePage narrow>
      <FinanceHeader title="Demander un retrait" back={back} />
      <Wizard key={attempt} profile={profile} summary={summary.data} onAgain={() => setAttempt((count) => count + 1)} />
    </FinancePage>
  );
}

type Outcome = { type: "recorded"; withdrawal: Withdrawal } | { type: "unknown"; key: string } | { type: "refused"; message: string } | null;

function Wizard({ profile, summary, onAgain }: { profile: FinanceProfile; summary: WalletSummary; onAgain: () => void }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);
  const methods = useMethods(scope);
  const request = useRequestWithdrawal(scope);
  const lookup = useLookupWithdrawal(scope);

  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState("");
  const [methodId, setMethodId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [idempotencyKey] = useState(newKey);

  const francs = parseFrancs(typed);
  const amount = francs !== null && francs > 0 ? francsToCents(asFrancs(francs)) : null;

  // The quote is asked once the typing pauses, not at every key.
  const [settled, setSettled] = useState<MoneyCents | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(amount), 300);
    return () => window.clearTimeout(timer);
  }, [amount]);
  const quote = useQuote(scope, settled);
  // Only the quote of the amount on screen counts.
  const current: WithdrawalQuote | null = quote.data && amount !== null && quote.data.amount === amount ? quote.data : null;

  const payable = (methods.data ?? []).filter((method) => method.payable);
  const selected = payable.find((method) => method.id === methodId) ?? payable.find((method) => method.isDefault) ?? payable[0] ?? null;

  const submit = useOneAtATime(async () => {
    if (!current || !selected) return;
    setOutcome(null);
    try {
      const withdrawal = await request.mutateAsync({ amount: current.amount, methodId: selected.id, idempotencyKey });
      setOutcome({ type: "recorded", withdrawal });
    } catch (error) {
      if (error instanceof WithdrawalOutcomeUnknown) setOutcome({ type: "unknown", key: error.idempotencyKey });
      else setOutcome({ type: "refused", message: describeFinanceFailure(error).message });
    }
  });

  const check = useOneAtATime(async (key: string) => {
    try {
      const withdrawal = await lookup.mutateAsync(key);
      // Not found: the server holds no request under this key, sending it again is safe.
      setOutcome(withdrawal ? { type: "recorded", withdrawal } : { type: "refused", message: "Aucune demande n'a été enregistrée : votre solde n'a pas bougé. Vous pouvez la renvoyer." });
    } catch {
      setOutcome({ type: "unknown", key });
    }
  });

  if (outcome?.type === "recorded") return <Recorded withdrawal={outcome.withdrawal} historyHref={paths.withdrawals} overviewHref={paths.overview} onAgain={onAgain} />;

  if (!summary.withdrawal.allowed) {
    return (
      <Alert tone="warning" title="Retrait indisponible">
        {summary.withdrawal.blockedMessage ?? "Un retrait ne peut pas être demandé pour le moment."}
      </Alert>
    );
  }

  const amountError = typed.trim() !== "" && francs === null ? "Saisissez un montant en francs CFA, sans décimales." : current && !current.acceptable ? current.refusal : null;
  const amountReady = current !== null && current.acceptable;
  const busy = request.isPending || lookup.isPending;

  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={STEPS} currentStep={step} label="Étapes du retrait" completedSteps={STEPS.slice(0, step).map((entry) => entry.id)} onStepSelect={(index) => index < step && !busy && setStep(index)} />

      {step === 0 && (
        <>
          <Balance label={space.balanceLabel} summary={summary} />
          <AmountField typed={typed} onTyped={setTyped} error={amountError} summary={summary} />
          <Recap quote={current} loading={amount !== null && current === null && !quote.isError} failed={quote.isError} onRetry={() => quote.refetch()} />
          <Button variant="primary" className="w-full" disabled={!amountReady} onClick={() => setStep(1)}>
            Continuer
          </Button>
        </>
      )}

      {step === 1 && (
        <>
          <MethodChoice methods={methods.data} payable={payable} selected={selected} onSelect={setMethodId} loading={!methods.data && !methods.isError} failed={methods.isError && !methods.data} error={methods.error} onRetry={() => methods.refetch()} methodsHref={paths.methods} />
          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-between">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Retour
            </Button>
            <Button variant="primary" disabled={!selected} onClick={() => setStep(2)}>
              Continuer
            </Button>
          </div>
        </>
      )}

      {step === 2 && current && selected && (
        <>
          <section className="rounded-panel border border-border bg-surface p-4">
            <h2 className="text-section-title text-foreground">Vérifiez avant de confirmer</h2>
            <DescriptionList
              className="mt-2"
              items={[
                { label: "Montant demandé", value: <Money cents={current.amount} /> },
                { label: "Frais de retrait", value: <Money cents={current.fee} /> },
                { label: "Montant net à recevoir", value: <Money cents={current.net} className="font-semibold text-foreground" /> },
                { label: "Méthode", value: selected.label },
                { label: "Compte", value: selected.account ?? "—" },
                ...(selected.holder ? [{ label: "Titulaire", value: selected.holder }] : []),
              ]}
            />
          </section>

          <Alert tone="info" title="Le montant quitte votre solde dès la confirmation.">
            Il est réservé le temps qu&apos;un opérateur SUGU vérifie la demande, puis transféré sur ce compte. Si la demande est refusée, il vous est restitué.
          </Alert>

          {outcome?.type === "refused" && <Alert tone="danger" title={outcome.message} />}

          {outcome?.type === "unknown" && (
            <Alert
              tone="warning"
              title="Nous n'avons pas pu confirmer votre demande."
              actions={
                <Button variant="secondary" size="compact" icon={SearchCheck} loading={lookup.isPending} onClick={() => check(outcome.key)}>
                  Vérifier l&apos;état de la demande
                </Button>
              }
            >
              La connexion a été interrompue avant la réponse du serveur. La demande est peut-être enregistrée : vérifiez avant d&apos;en refaire une.
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-between">
            <Button variant="secondary" disabled={busy} onClick={() => setStep(1)}>
              Retour
            </Button>
            {/* While the outcome is unknown the request is not sent again from here: it is looked for. */}
            <Button variant="primary" icon={Check} loading={request.isPending} disabled={busy || outcome?.type === "unknown"} onClick={() => submit()}>
              Confirmer le retrait
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Balance({ label, summary }: { label: string; summary: WalletSummary }) {
  return (
    <section className="rounded-panel border border-border bg-surface-subtle p-4">
      <p className="text-label text-foreground-muted">{label}</p>
      <p className="text-kpi text-foreground tabular-nums [overflow-wrap:anywhere]">{formatMoneyFromCents(summary.available)}</p>
    </section>
  );
}

function AmountField({ typed, onTyped, error, summary }: { typed: string; onTyped: (value: string) => void; error: string | null; summary: WalletSummary }) {
  const most = mostAllowed(summary);
  const quick = QUICK_FRANCS.filter((francs) => francs * 100 >= summary.limits.min && francs * 100 <= most).slice(-3);
  const groupId = useId();

  return (
    <div className="flex flex-col gap-2">
      <FormField label="Montant à retirer" required error={error} hint={`De ${formatMoneyFromCents(summary.limits.min)} à ${formatMoneyFromCents(summary.limits.max)} par demande, en francs entiers.`}>
        <Input
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={typed}
          onChange={(event) => onTyped(event.target.value)}
          onBlur={() => {
            const francs = parseFrancs(typed);
            if (francs !== null) onTyped(groupDigits(francs));
          }}
          suffix="FCFA"
          className="text-[1.125rem] font-semibold tabular-nums"
        />
      </FormField>

      {(quick.length > 0 || most >= summary.limits.min) && (
        <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-2">
          <span id={groupId} className="sr-only">
            Montants proposés
          </span>
          {quick.map((francs) => (
            <Button key={francs} variant="secondary" size="compact" className="flex-1" aria-pressed={parseFrancs(typed) === francs} onClick={() => onTyped(groupDigits(francs))}>
              {groupDigits(francs)}
            </Button>
          ))}
          {most >= summary.limits.min && (
            <Button variant="secondary" size="compact" className="flex-1" aria-pressed={parseFrancs(typed) === most / 100} onClick={() => onTyped(groupDigits(most / 100))}>
              Max
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** What the amount costs and pays: the three lines of the server's quote. */
function Recap({ quote, loading, failed, onRetry }: { quote: WithdrawalQuote | null; loading: boolean; failed: boolean; onRetry: () => void }) {
  const line = (value: MoneyCents | undefined) => (loading ? <Skeleton className="h-4 w-20" /> : <Money cents={value} />);

  if (failed) {
    return (
      <Alert
        tone="warning"
        title="Les frais n'ont pas pu être calculés."
        actions={
          <Button variant="secondary" size="compact" onClick={onRetry}>
            Réessayer
          </Button>
        }
      >
        Ils sont calculés par le serveur : sans eux, la demande ne peut pas continuer.
      </Alert>
    );
  }

  return (
    <section aria-label="Récapitulatif" aria-busy={loading || undefined} className="overflow-hidden rounded-panel border border-border bg-surface">
      <dl className="flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt className="text-label font-normal text-foreground-muted">Montant demandé</dt>
          <dd className="text-body text-foreground">{line(quote?.amount)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-2.5">
          <dt className="text-label font-normal text-foreground-muted">
            Frais de retrait{quote && quote.feeRate > 0 ? ` (${(quote.feeRate * 100).toLocaleString("fr-FR")} %)` : ""}
          </dt>
          <dd className="text-body text-foreground">{line(quote?.fee)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 bg-brand-subtle px-4 py-3">
          <dt className="text-body font-semibold text-foreground">Montant net</dt>
          <dd className={cn("text-body font-semibold", quote ? "text-primary" : "text-foreground")}>{line(quote?.net)}</dd>
        </div>
      </dl>
    </section>
  );
}

function MethodChoice({
  methods,
  payable,
  selected,
  onSelect,
  loading,
  failed,
  error,
  onRetry,
  methodsHref,
}: {
  methods: PayoutMethod[] | undefined;
  payable: PayoutMethod[];
  selected: PayoutMethod | null;
  onSelect: (id: string) => void;
  loading: boolean;
  failed: boolean;
  error: unknown;
  onRetry: () => void;
  methodsHref: string;
}) {
  const name = useId();

  if (loading) return <Skeleton className="h-32 rounded-panel" />;
  // A failure is not "no method": it is said, with a way to ask again.
  if (failed) return <ErrorState title="Méthodes de paiement indisponibles" description={describeFinanceFailure(error).message} onRetry={onRetry} />;

  const waiting = (methods ?? []).filter((method) => !method.payable);

  if (payable.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title={waiting.length > 0 ? "Aucune méthode vérifiée pour l'instant" : "Aucune méthode de paiement"}
        description={waiting.length > 0 ? "Votre compte est en cours de vérification par SUGU. Un retrait sera possible dès qu'il sera vérifié." : "Ajoutez un compte mobile money ou bancaire pour recevoir vos retraits."}
        action={
          <Button asChild variant="primary" icon={waiting.length > 0 ? CreditCard : Plus}>
            <Link href={methodsHref}>{waiting.length > 0 ? "Voir mes méthodes" : "Ajouter une méthode"}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-section-title text-foreground">Méthode de paiement</legend>
      {payable.map((method) => {
        const checked = selected?.id === method.id;
        return (
          <label
            key={method.id}
            className={cn("flex cursor-pointer items-center gap-3 rounded-panel border bg-surface p-3 transition-colors duration-100 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus-ring", checked ? "border-primary bg-brand-subtle" : "border-border hover:border-border-strong")}
          >
            <MethodIdentity method={method}>{method.isDefault && <StatusBadgeDefault />}</MethodIdentity>
            <input type="radio" name={name} value={method.id} checked={checked} onChange={() => onSelect(method.id)} className="size-5 shrink-0 accent-primary outline-none" />
          </label>
        );
      })}

      {waiting.length > 0 && (
        <p className="flex items-start gap-2 text-label font-normal text-foreground-muted">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {waiting.length === 1 ? "Une autre méthode attend" : `${waiting.length} autres méthodes attendent`} la vérification de SUGU et ne peu{waiting.length === 1 ? "t" : "vent"} pas encore recevoir de retrait.
        </p>
      )}

      <Link href={methodsHref} className="self-start rounded-compact text-label font-semibold text-primary hover:underline">
        Gérer mes méthodes de paiement
      </Link>
    </fieldset>
  );
}

function StatusBadgeDefault() {
  return <span className="inline-flex h-5 items-center rounded-pill border border-success-border bg-success-bg px-2 text-meta font-medium text-success-fg">Par défaut</span>;
}

/** What the server recorded: its reference, its amounts, its state. */
function Recorded({ withdrawal, historyHref, overviewHref, onAgain }: { withdrawal: Withdrawal; historyHref: string; overviewHref: string; onAgain: () => void }) {
  const note = withdrawalNote(withdrawal);
  // The result replaces the last step: it is brought to the top of the screen, and read out.
  const top = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    top.current?.scrollIntoView?.({ block: "center" });
    top.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="flex flex-col gap-4">
      <section role="status" className="flex flex-col items-center gap-2 rounded-panel border border-border bg-surface p-6 text-center">
        <span className="flex size-14 items-center justify-center rounded-pill bg-success-bg text-success-icon">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </span>
        <h2 ref={top} tabIndex={-1} className="text-page-title text-foreground outline-none">
          Demande enregistrée
        </h2>
        <p className="text-body text-foreground-muted">Votre demande de retrait {withdrawal.number ?? ""} est enregistrée.</p>
        <StatusBadge domain="payout" code={withdrawal.status} />
      </section>

      <section className="rounded-panel border border-border bg-surface px-4 py-2">
        <DescriptionList items={withdrawalItems(withdrawal)} />
      </section>

      {note && <Alert tone={note.tone} title={note.text} />}

      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        <Button variant="quiet" icon={ArrowUpFromLine} onClick={onAgain}>
          Nouvelle demande
        </Button>
        <Button asChild variant="secondary">
          <Link href={overviewHref}>Retour aux finances</Link>
        </Button>
        <Button asChild variant="primary">
          <Link href={historyHref}>Voir mes demandes</Link>
        </Button>
      </div>
    </div>
  );
}
