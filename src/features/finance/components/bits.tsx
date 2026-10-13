"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { DescriptionList, EmptyState, ErrorState, Money, Sheet, SheetContent, Skeleton, StatusBadge, cn, formatMoneyFromCents, iconTileClass, type DescriptionItem, type MoneyCents, type Tone } from "@/design-system";
import { formatDayTime, formatLongDateTime } from "@/features/agency/format";
import type { FinanceProfile } from "../api";
import { signedAmount, type PayoutMethod, type WalletEntry, type Withdrawal } from "../contract";
import { entryExplanation, entryTitle, entryTitleParts, kindWording, methodIcon, methodTone, payoutMethodLabel } from "../wording";

// The pieces every money screen is built from, after its mock-ups (V5).

/** Frame of a money page: the Foundation scope, and a width that reads on a phone and on a desk. */
export function FinancePage({ children, narrow = false, className, ...props }: { children: ReactNode; narrow?: boolean; className?: string; "aria-busy"?: boolean }) {
  return (
    <div className={cn("sugu-ui mx-auto flex w-full flex-col gap-4", narrow ? "max-w-2xl" : "max-w-[80rem]", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Gives the focus back to what opened a panel or a dialog, once it closes.
 * They are opened from a row or a menu, not from a trigger of their own:
 * left alone, the focus would fall back to the top of the page.
 */
export function useReturnFocus() {
  const opener = useRef<HTMLElement | null>(null);
  return {
    remember: () => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    restore: () => {
      const target = opener.current;
      // After the panel has let go of the focus it trapped.
      if (target?.isConnected) window.setTimeout(() => target.focus(), 0);
    },
  };
}

/** Heading of a money screen: the way back, the title, what the screen offers. */
export function FinanceHeader({ title, back, actions, children }: { title: string; back?: { label: string; href: string }; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex min-h-touch items-center gap-2 md:gap-3">
        {back && (
          <Link
            href={back.href}
            aria-label={back.label}
            title={back.label}
            className="-ml-2 flex size-touch shrink-0 items-center justify-center rounded-button text-foreground hover:bg-surface-hover md:ml-0 md:size-control md:border md:border-border-strong md:bg-surface"
          >
            <ArrowLeft className="size-5 md:size-4" aria-hidden="true" />
          </Link>
        )}
        <h1 className="min-w-0 flex-1 text-page-title text-foreground [overflow-wrap:anywhere]">{title}</h1>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

/** Tinted square behind an icon: what a row is about, told by its colour. */
export function IconTile({ icon: Icon, tone, size = "md" }: { icon: LucideIcon; tone: Tone | "brand"; size?: "md" | "lg" }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-control", size === "lg" ? "size-11" : "size-10", iconTileClass[tone])}>
      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

/** A card with a title and, on its right, a link to the whole list. */
export function Block({ title, action, children, className }: { title: string; action?: { label: string; href: string }; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-panel border border-border bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2">
        <h2 className="min-w-0 text-section-title text-foreground">{title}</h2>
        {action && (
          <Link href={action.href} className="shrink-0 rounded-compact text-label font-semibold text-primary hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      <div className="min-w-0 flex-1 px-4 pb-4">{children}</div>
    </section>
  );
}

// ── Amounts ─────────────────────────────────────────────────

/**
 * An amount as a key figure: the number, then its unit smaller beside it.
 * The number is never broken nor cut: in a narrow card the unit goes under
 * it, and a number of ten digits or more is drawn smaller.
 */
export function FigureAmount({ cents }: { cents: MoneyCents }) {
  const number = formatMoneyFromCents(cents, { currency: false });
  return (
    <>
      <span className={cn("whitespace-nowrap", number.length > 11 && "text-[1.125rem] leading-7 md:text-kpi")}>{number}</span> <span className="text-body font-semibold whitespace-nowrap text-foreground-muted">FCFA</span>
    </>
  );
}

/** A movement: green with a plus when it came in, red with a minus when it left. */
export function MovementAmount({ entry, className }: { entry: Pick<WalletEntry, "direction" | "amount">; className?: string }) {
  return <Money cents={signedAmount(entry)} showPlus className={cn("font-semibold", entry.direction === "credit" ? "text-success-fg" : "text-danger-fg", className)} />;
}

// ── Operations ──────────────────────────────────────────────

export interface ListLoad {
  /** First load: nothing to show yet. */
  loading: boolean;
  /** The load failed and there is nothing on screen to keep. */
  failed: boolean;
  errorMessage: string;
  onRetry: () => void;
}

/**
 * The movements of a wallet, one a row: what it is, when, how much, and the
 * state of the withdrawal when it is one. A row opens its detail.
 *
 * An empty list is only drawn from an answer: while loading it is skeletons,
 * and a failure is said as a failure — never as "no operation".
 */
export function OperationList({
  entries,
  profile,
  load,
  empty,
  onOpen,
  label,
  detailed = false,
}: {
  entries: WalletEntry[];
  profile: FinanceProfile;
  load: ListLoad;
  empty: { icon: LucideIcon; title: string; description: string };
  onOpen: (entry: WalletEntry) => void;
  label: string;
  /** On a wide screen, a column says what each movement is: for the full history. */
  detailed?: boolean;
}) {
  if (load.loading) {
    return (
      <div className="flex flex-col gap-3 py-2" aria-busy>
        <p role="status" className="sr-only">
          Chargement des opérations…
        </p>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-control" />
        ))}
      </div>
    );
  }
  if (load.failed) return <ErrorState description={load.errorMessage} onRetry={load.onRetry} />;
  if (entries.length === 0) return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />;

  return (
    <ul aria-label={label} className="flex flex-col divide-y divide-border">
      {entries.map((entry) => {
        const wording = kindWording(entry.kind, profile);
        const title = entryTitle(entry, profile);
        const parts = entryTitleParts(entry, profile);
        return (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onOpen(entry)}
              aria-label={`${title}, ${formatMoneyFromCents(signedAmount(entry), { showPlus: true })}, voir le détail`}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-control px-2 py-3 text-left transition-colors duration-100 hover:bg-surface-hover"
            >
              <IconTile icon={wording.icon} tone={wording.tone} />
              <span className={cn("flex min-w-0 flex-1 flex-col", detailed && "lg:max-w-80")}>
                {/* The number is what the row is looked for by: it goes under its word when both do not fit, and is never cut. */}
                <span className="text-body font-semibold text-foreground">
                  {parts.label}
                  {parts.number && (
                    <>
                      {" "}
                      <span className="whitespace-nowrap">{parts.number}</span>
                    </>
                  )}
                </span>
                <span className="text-meta text-foreground-muted tabular-nums">{formatDayTime(entry.bookedAt)}</span>
              </span>
              {/* Whole: the sentence carries a number, and a number is never cut. */}
              {detailed && <span className="hidden min-w-0 flex-1 text-label font-normal text-foreground-muted [overflow-wrap:anywhere] lg:block">{entry.detail ?? entryExplanation(entry, profile)}</span>}
              <span className="flex shrink-0 flex-col items-end gap-1">
                <MovementAmount entry={entry} className="text-body" />
                {entry.kind === "withdrawal" && <StatusBadge domain="payout" code={entry.status} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Details ─────────────────────────────────────────────────

/** The lines of a withdrawal request: what was asked, what it costs, where it goes, where it stands. */
export function withdrawalItems(withdrawal: Withdrawal): DescriptionItem[] {
  return [
    { label: "Référence", value: withdrawal.number ?? "—" },
    { label: "Montant demandé", value: <Money cents={withdrawal.amount} /> },
    { label: "Frais de retrait", value: <Money cents={withdrawal.fee} /> },
    { label: "Montant net", value: <Money cents={withdrawal.net} className="font-semibold text-foreground" /> },
    { label: "Méthode", value: payoutMethodLabel(withdrawal.method) },
    { label: "Compte", value: withdrawal.destination ?? "—" },
    { label: "Demandé le", value: formatLongDateTime(withdrawal.requestedAt) },
    ...(withdrawal.paidAt ? [{ label: "Payé le", value: formatLongDateTime(withdrawal.paidAt) }] : []),
    { label: "Statut", value: <StatusBadge domain="payout" code={withdrawal.status} /> },
  ];
}

/** What the state of a request means for the money, in a sentence. */
export function withdrawalNote(withdrawal: Withdrawal): { tone: "info" | "success" | "warning" | "danger"; text: string } | null {
  switch (withdrawal.status) {
    case "pending":
      return { tone: "info", text: `Votre demande est enregistrée. Un opérateur SUGU la vérifie${withdrawal.delay ? ` : comptez ${withdrawal.delay}` : ""}. Le montant est réservé et n'est plus dans votre solde.` };
    case "approved":
      return { tone: "info", text: "Votre demande est approuvée. Le transfert n'est pas encore parti." };
    case "processing":
      return { tone: "info", text: "Le transfert est en cours chez l'opérateur de paiement. Il n'est pas encore confirmé." };
    case "paid":
      return { tone: "success", text: "Le transfert a été confirmé." };
    case "failed":
      return { tone: "warning", text: "Le transfert a échoué. Le montant reste réservé : un opérateur SUGU le relance ou vous le restitue." };
    case "rejected":
      return { tone: "danger", text: "La demande a été refusée. Le montant a été restitué à votre solde." };
    case "canceled":
      return { tone: "info", text: "La demande a été annulée. Le montant a été restitué à votre solde." };
    default:
      return null;
  }
}

/** Detail of one movement, in a panel: what the server knows of it, nothing more. */
export function EntrySheet({ entry, profile, onClose, footer }: { entry: WalletEntry | null; profile: FinanceProfile; onClose: () => void; footer?: (entry: WalletEntry) => ReactNode }) {
  return (
    <Sheet open={entry !== null} onOpenChange={(open) => !open && onClose()}>
      {entry && (
        <SheetContent title="Détail de l'opération" footer={footer?.(entry)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-panel border border-border bg-surface-subtle p-4">
              <IconTile icon={kindWording(entry.kind, profile).icon} tone={kindWording(entry.kind, profile).tone} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-section-title text-foreground [overflow-wrap:anywhere]">{entryTitle(entry, profile)}</p>
                <p className="text-meta text-foreground-muted tabular-nums">{formatLongDateTime(entry.bookedAt)}</p>
                <MovementAmount entry={entry} className="mt-1 text-kpi" />
              </div>
            </div>

            <p className="text-body text-foreground-muted">{entryExplanation(entry, profile)}</p>

            <DescriptionList
              items={[
                { label: "Type", value: kindWording(entry.kind, profile).label },
                { label: "Sens", value: entry.direction === "credit" ? "Entrée" : "Sortie" },
                ...(entry.reference?.number ? [{ label: "Référence", value: entry.reference.number }] : []),
                ...(entry.detail ? [{ label: "Détail", value: entry.detail }] : []),
                { label: "Montant", value: <Money cents={entry.amount} /> },
              ]}
            />

            {entry.withdrawal && (
              <section className="flex flex-col gap-2">
                <h3 className="text-section-title text-foreground">Demande de retrait</h3>
                <DescriptionList items={withdrawalItems(entry.withdrawal)} />
              </section>
            )}
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}

// ── Payout methods ──────────────────────────────────────────

/** A payout method as a line: its tile, its name, its masked account. */
export function MethodIdentity({ method, children }: { method: PayoutMethod; children?: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <IconTile icon={methodIcon(method)} tone={methodTone(method)} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-body font-semibold text-foreground">{method.label}</span>
          {children}
        </span>
        <span className="truncate text-label font-normal text-foreground-muted tabular-nums">{[method.account, method.holder].filter(Boolean).join(" · ") || "Compte non renseigné"}</span>
      </span>
    </span>
  );
}

/** A row that leads somewhere: a label, what it says, a chevron. */
export function LinkRow({ href, icon, tone = "neutral", title, description }: { href: string; icon: LucideIcon; tone?: Tone | "brand"; title: string; description?: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-panel border border-border bg-surface p-3 transition-colors duration-100 hover:border-border-strong">
      <IconTile icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-foreground">{title}</span>
        {description && <span className="truncate text-label font-normal text-foreground-muted">{description}</span>}
      </span>
      <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
    </Link>
  );
}
