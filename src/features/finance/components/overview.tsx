"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpFromLine, Banknote, ChevronRight, Clock, Coins, CreditCard, Hourglass, ListChecks, PiggyBank, Receipt, ShieldAlert, Wallet } from "lucide-react";
import { Alert, Button, ErrorState, Select, Skeleton, Stat, cn, formatMoneyFromCents } from "@/design-system";
import type { FinanceProfile } from "../api";
import type { WalletEntry, WalletSummary } from "../contract";
import { useEntries, useFinanceScope, useMethods, useSummary } from "../hooks";
import { FINANCE_SPACES, financePaths, type FinanceSpace } from "../spaces";
import { describeFinanceFailure, isForbidden } from "../wording";
import { Block, EntrySheet, FigureAmount, FinanceHeader, FinancePage, LinkRow, OperationList, useReturnFocus } from "./bits";
import { MonthlyBars, ShareRing, longMonth } from "./charts";

// The overview of a money space, after its mock-ups: what there is, what can
// be withdrawn, what moved last. Every figure is the server's.

const isMonth = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}$/.test(value);
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function FinanceOverview({ profile }: { profile: FinanceProfile }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const asked = isMonth(params.get("mois")) ? params.get("mois")! : undefined;

  const summary = useSummary(scope, asked);
  const recent = useEntries(scope, { page: 1, pageSize: 5 });
  const methods = useMethods(scope);
  const [opened, setOpened] = useState<WalletEntry | null>(null);
  const focus = useReturnFocus();
  const open = (entry: WalletEntry) => {
    focus.remember();
    setOpened(entry);
  };
  const close = () => {
    setOpened(null);
    focus.restore();
  };

  if (summary.isError && !summary.data) {
    return (
      <FinancePage>
        <FinanceHeader title={space.title} />
        {isForbidden(summary.error) ? (
          <Alert tone="warning" title="Accès réservé">
            {describeFinanceFailure(summary.error).message}
          </Alert>
        ) : (
          // A failure is said as one: never as a balance of zero.
          <ErrorState title="Impossible d'afficher vos finances" description={describeFinanceFailure(summary.error).message} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
        )}
      </FinancePage>
    );
  }

  const data = summary.data;
  if (!data) return <OverviewSkeleton title={space.title} />;

  const month = data.period.month;
  const setMonth = (value: string) => {
    // Read from the address itself: a change asked while another is still on its way starts from it.
    const next = new URLSearchParams(window.location.search);
    // The current month is the address without a month.
    if (value === data.monthly.at(-1)?.month) next.delete("mois");
    else next.set("mois", value);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const defaultMethod = methods.data?.find((method) => method.isDefault) ?? methods.data?.[0];
  const methodsLine = methods.isError
    ? "Momentanément indisponibles"
    : !methods.data
      ? "Chargement…"
      : methods.data.length === 0
        ? "Aucune méthode : ajoutez-en une pour retirer"
        : `${defaultMethod?.label ?? ""}${defaultMethod?.account ? ` ${defaultMethod.account}` : ""}`;

  return (
    <FinancePage>
      <FinanceHeader
        title={space.title}
        actions={
          <div className="w-40 md:w-48">
            <Select aria-label="Mois affiché" compact value={month} onChange={(event) => setMonth(event.target.value)} options={[...data.monthly].reverse().map((entry) => ({ value: entry.month, label: capital(longMonth(entry.month)) }))} />
          </div>
        }
      />

      {!data.wallet.active && (
        <Alert tone="danger" title="Portefeuille suspendu">
          Aucune opération n&apos;est possible sur ce portefeuille pour le moment. Contactez le support SUGU.
        </Alert>
      )}

      <Figures space={space} data={data} historyHref={paths.history} refreshing={summary.isFetching} />

      <WithdrawAction data={data} href={paths.withdraw} />

      <p className="flex items-start gap-2 text-label font-normal text-foreground-muted">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {space.settlementNote}
      </p>

      {/* On a phone the last operations come first, as on its mock-up; these two rows follow them. */}
      <div className="grid gap-3 max-md:order-last md:grid-cols-2">
        <LinkRow href={paths.methods} icon={CreditCard} tone="info" title="Méthodes de paiement" description={methodsLine} />
        <LinkRow
          href={paths.withdrawals}
          icon={ListChecks}
          tone="brand"
          title="Demandes de retrait"
          description={data.limits.pendingCount > 0 ? `${data.limits.pendingCount} en cours sur ${data.limits.maxPending} possibles` : "Aucune demande en cours"}
        />
      </div>

      <div className={cn("grid gap-4", profile === "agency" ? "xl:grid-cols-3" : "lg:grid-cols-5")}>
        <Block title={space.chartTitle} className={profile === "agency" ? "" : "lg:col-span-3"}>
          <p className="mb-4 text-label font-normal text-foreground-muted">
            {capital(longMonth(month))} : <span className="font-semibold text-foreground tabular-nums">{formatMoneyFromCents(data.period.earned)}</span> en {data.period.count.toLocaleString("fr-FR")} {space.earningNoun}
            {data.period.count > 1 ? "s" : ""}
          </p>
          <MonthlyBars months={data.monthly} selected={month} label={space.chartTitle} />
        </Block>

        {profile === "agency" && (
          <Block title="Répartition par paiement" className="@container">
            <p className="mb-4 text-label font-normal text-foreground-muted">Revenus de {longMonth(month)}, selon la façon dont le client a payé sa commande.</p>
            <ShareRing
              caption={`Revenus de livraison de ${longMonth(month)}`}
              total={data.period.earned}
              shares={[
                { key: "online", label: "Payé en ligne", amount: data.period.byPayment.online, stroke: "stroke-info-icon", dot: "bg-info-icon" },
                { key: "cod", label: "Payé à la livraison", amount: data.period.byPayment.cod, stroke: "stroke-success-icon", dot: "bg-success-icon" },
                { key: "cod_mixte", label: "COD Mixte", amount: data.period.byPayment.codMixte, stroke: "stroke-brand", dot: "bg-brand" },
              ]}
            />
          </Block>
        )}

        <Block title={space.recentTitle} action={{ label: "Voir tout", href: paths.history }} className={cn("max-lg:order-first", profile === "agency" ? "max-xl:order-first" : "lg:col-span-2")}>
          <OperationList
            label={space.recentTitle}
            entries={recent.data?.rows ?? []}
            profile={profile}
            onOpen={open}
            load={{ loading: !recent.data && !recent.isError, failed: recent.isError && !recent.data, errorMessage: describeFinanceFailure(recent.error).message, onRetry: () => recent.refetch() }}
            empty={{ icon: Receipt, title: "Aucune opération", description: "Vos ventes, vos gains et vos retraits apparaîtront ici." }}
          />
        </Block>
      </div>

      <EntrySheet entry={opened} profile={profile} onClose={close} />
    </FinancePage>
  );
}

/**
 * The balance, first and largest, then the figures around it. Two a row on a
 * phone, the balance on a row of its own; one row on a desk.
 */
function Figures({ space, data, historyHref, refreshing }: { space: FinanceSpace; data: WalletSummary; historyHref: string; refreshing: boolean }) {
  const month = longMonth(data.period.month);
  const columns = space.holdsCash ? "lg:grid-cols-5" : "lg:grid-cols-4";

  return (
    <section aria-label="Chiffres clés" aria-busy={refreshing || undefined} className={cn("grid grid-cols-2 gap-2.5 md:gap-3", columns)}>
      <Link
        href={historyHref}
        aria-label={`${space.balanceLabel} : ${formatMoneyFromCents(data.available)}. Voir l'historique`}
        className="col-span-2 flex min-w-0 items-center gap-3 rounded-panel border border-border-strong bg-surface p-4 transition-colors duration-100 hover:border-primary lg:col-span-1 lg:flex-col lg:items-start lg:gap-0"
      >
        <Wallet className="size-6 shrink-0 text-foreground lg:size-5" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col lg:mt-3 lg:w-full">
          <span className="text-label text-foreground-muted lg:order-2 lg:mt-0.5">{space.balanceLabel}</span>
          {/* Never cut: a balance of several millions wraps before it hides a digit. */}
          <span className="text-[1.625rem] leading-9 font-bold tracking-tight text-foreground tabular-nums [overflow-wrap:anywhere] lg:order-1 lg:text-kpi">{formatMoneyFromCents(data.available)}</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-foreground-subtle lg:hidden" aria-hidden="true" />
      </Link>

      <Stat layout="figure" icon={Hourglass} label="Retraits en cours" value={<FigureAmount cents={data.inWithdrawal} />} hint={data.limits.pendingCount > 0 ? `${data.limits.pendingCount} demande${data.limits.pendingCount > 1 ? "s" : ""}` : "Aucune demande"} />
      <Stat layout="figure" icon={PiggyBank} label={space.totalLabel} value={<FigureAmount cents={data.earnedTotal} />} hint={`Déjà retiré : ${formatMoneyFromCents(data.withdrawn)}`} />
      <Stat
        layout="figure"
        icon={Banknote}
        label={space.monthLabel}
        value={<FigureAmount cents={data.period.earned} />}
        hint={data.period.withdrawalFees > 0 ? `Frais de retrait : ${formatMoneyFromCents(data.period.withdrawalFees)}` : month}
        className={cn(!space.holdsCash && "max-lg:col-span-2")}
      />
      {data.cashHeld !== null && <Stat layout="figure" icon={Coins} label="Espèces à reverser" value={<FigureAmount cents={data.cashHeld} />} hint="Encaissées pour des tiers, hors de votre solde" />}
    </section>
  );
}

/** The one action of the screen. It is offered only when the server says a withdrawal can be asked. */
function WithdrawAction({ data, href }: { data: WalletSummary; href: string }) {
  if (!data.withdrawal.allowed) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="warning" title="Retrait indisponible">
          {data.withdrawal.blockedMessage ?? "Un retrait ne peut pas être demandé pour le moment."}
        </Alert>
        <Button variant="primary" icon={ShieldAlert} disabled className="w-full md:w-auto md:self-end">
          Demander un retrait
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <p className="text-label font-normal text-foreground-muted max-md:order-2 max-md:text-center">
        Minimum {formatMoneyFromCents(data.limits.min)} · maximum {formatMoneyFromCents(data.limits.max)} par demande
        {data.limits.feeRate > 0 ? ` · frais de ${(data.limits.feeRate * 100).toLocaleString("fr-FR")} %` : " · sans frais"}
      </p>
      <Button asChild variant="primary" icon={ArrowUpFromLine} className="w-full md:w-auto">
        <Link href={href}>Demander un retrait</Link>
      </Button>
    </div>
  );
}

export function OverviewSkeleton({ title }: { title: string }) {
  return (
    <FinancePage aria-busy>
      <p role="status" className="sr-only">
        Chargement de vos finances…
      </p>
      <FinanceHeader title={title} />
      <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
        <Skeleton className="col-span-2 h-24 rounded-panel lg:col-span-1 lg:h-28" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-panel lg:h-28" />
        ))}
      </div>
      <Skeleton className="h-11 rounded-button" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-panel lg:col-span-3" />
        <Skeleton className="h-72 rounded-panel lg:col-span-2" />
      </div>
    </FinancePage>
  );
}
