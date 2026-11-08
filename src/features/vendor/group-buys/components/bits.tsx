"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ExternalLink, Truck } from "lucide-react";
import { Badge, Button, Skeleton, StatusBadge, cn, formatMoneyFromCents } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { formatUnits, plural } from "@/features/vendor/clients/components/bits";
import { ApiError } from "@/lib/http/api-error";
import { formatRemaining, remainingUntil, serverNowAt, type GroupBuy, type ServerClock } from "../contract";

// Pieces of the "Achats groupés" page: a group as a card, its gauge, its
// figures, and the server's clock the countdowns are measured with.

export const GROUP_BUYS = "/vendor/group-buys";
export const GROUP_BUYING_SETTINGS = "/vendor/settings?section=group-buying";
export const PRODUCTS = "/vendor/products";

/** Frame of the page: the Foundation scope, the width of the other vendor pages. */
export function GroupBuysPage({ children, ...props }: { children: ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" {...props}>
      {children}
    </div>
  );
}

const money = (cents: number) => formatMoneyFromCents(cents);
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const MOMENT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function formatWith(format: Intl.DateTimeFormat, value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format.format(date);
}

// ── The server's clock ──────────────────────────────────────

const TICK_MS = 20_000;

/**
 * The server's "now", moved on every 20 seconds: enough for a countdown in
 * minutes. It starts from the `server_now` of the last page read, so a phone
 * set to the wrong time still counts right. Null before any page.
 */
export function useServerNow(clock: ServerClock | null): number | null {
  const [deviceNow, setDeviceNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setDeviceNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return clock ? serverNowAt(clock, deviceNow) : null;
}

// ── What a card says ────────────────────────────────────────

interface Fact {
  label: string;
  value: string;
  hint?: string | null;
}

const saving = (group: GroupBuy) => (group.savingPercent > 0 ? `−${group.savingPercent} % (au lieu de ${money(group.baseUnitPrice)})` : null);

/** The price of the group, as its state allows to name it. */
export function priceFact(group: GroupBuy): Fact {
  switch (group.status) {
    case "locked":
    case "finished":
      return { label: "Prix obtenu", value: money(group.lockedUnitPrice ?? group.currentUnitPrice), hint: saving(group) };
    case "open":
      return { label: "Prix actuel", value: money(group.currentUnitPrice), hint: group.currentTierMinQty !== null ? saving(group) : "Prix normal : aucun palier atteint" };
    case "confirming":
      return { label: "Prix provisoire", value: money(group.lockedUnitPrice ?? group.currentUnitPrice), hint: "Recalculé sur les grosses réservations payées" };
    case "failed":
      return { label: "Prix de groupe", value: "Non atteint", hint: `Prix normal : ${money(group.baseUnitPrice)}` };
    default:
      if (group.lockedUnitPrice !== null) return { label: "Prix obtenu", value: money(group.lockedUnitPrice), hint: saving(group) };
      return { label: "Prix atteint", value: group.currentTierMinQty !== null ? money(group.currentUnitPrice) : "Aucun palier" };
  }
}

/** Orders come once the price is obtained: before, there is nothing to count. */
export function ordersFact(group: GroupBuy): Fact {
  if (group.status === "open") return { label: "Commandes passées", value: "Après la clôture" };
  if (group.status === "confirming") return { label: "Commandes passées", value: formatUnits(group.orderedCount), hint: "Grosses réservations, payées en ligne" };
  if (group.grouped) return { label: "Commandes passées", value: formatUnits(group.orderedCount), hint: "Une seule commande pour tout le groupe" };
  return { label: "Commandes passées", value: `${formatUnits(group.orderedCount)} sur ${formatUnits(group.membersCount)}` };
}

/** What is left of a running group, measured at the server's "now"; the day a closed one ended. */
export function timeFact(group: GroupBuy, serverNow: number | null): Fact | null {
  switch (group.status) {
    case "open": {
      if (serverNow === null) return null;
      const left = remainingUntil(group.closesAt, serverNow);
      if (left === null) return null;
      return { label: "Clôture dans", value: formatRemaining(left) ?? "En cours de clôture", hint: formatWith(MOMENT, group.closesAt) };
    }
    case "confirming": {
      if (serverNow === null) return null;
      const left = remainingUntil(group.confirmDeadlineAt, serverNow);
      if (left === null) return null;
      return { label: "Confirmation encore", value: formatRemaining(left) ?? "En cours de calcul", hint: formatWith(MOMENT, group.confirmDeadlineAt) };
    }
    case "locked": {
      if (serverNow === null) return null;
      const left = remainingUntil(group.orderDeadlineAt, serverNow);
      if (left === null) return null;
      return { label: "Fin des commandes dans", value: formatRemaining(left) ?? "En cours de clôture", hint: formatWith(MOMENT, group.orderDeadlineAt) };
    }
    case "finished": {
      const day = formatWith(DAY, group.orderDeadlineAt);
      return day ? { label: "Commandes closes le", value: day } : null;
    }
    case "failed": {
      const day = formatWith(DAY, group.closesAt);
      return day ? { label: "Clos le", value: day } : null;
    }
    default:
      return null;
  }
}

export interface GaugeView {
  value: number;
  max: number;
  /** "Prochain palier : 20", beside the quantity. */
  target: string | null;
  caption: string;
  /** A group that ended without its price: the bar is grey, not orange. */
  muted: boolean;
}

/** The reserved quantity against the next tier; full once a tier is kept. */
export function gaugeOf(group: GroupBuy): GaugeView {
  const reserved = group.reservedQty;
  if (group.nextTier) {
    return {
      value: reserved,
      max: group.nextTier.minQty,
      target: `Prochain palier : ${formatUnits(group.nextTier.minQty)}`,
      caption: `Encore ${plural(group.nextTier.missingQty, "unité", "unités")} pour passer à ${money(group.nextTier.unitPrice)} l'unité.`,
      muted: false,
    };
  }
  if (group.currentTierMinQty !== null) {
    return {
      value: reserved,
      max: Math.max(reserved, 1),
      target: null,
      caption: group.status === "open" ? "Meilleur prix atteint : il ne baissera plus." : `Palier de ${plural(group.currentTierMinQty, "unité", "unités")} atteint.`,
      muted: group.status === "cancelled",
    };
  }
  const first = group.tiers[0]?.minQty ?? null;
  return {
    value: reserved,
    max: Math.max(first ?? reserved, 1),
    target: first !== null ? `Premier palier : ${formatUnits(first)}` : null,
    caption: "Aucun palier atteint.",
    muted: group.status !== "open",
  };
}

// ── The card ────────────────────────────────────────────────

function Gauge({ group }: { group: GroupBuy }) {
  const gauge = gaugeOf(group);
  const value = Math.min(gauge.value, gauge.max);
  const percent = Math.round((value / gauge.max) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-meta text-foreground">
          <span className="text-body font-semibold tabular-nums">{formatUnits(group.reservedQty)}</span> {group.reservedQty > 1 ? "unités réservées" : "unité réservée"}
        </p>
        {gauge.target && <p className="text-meta text-foreground-muted tabular-nums">{gauge.target}</p>}
      </div>
      <div
        role="progressbar"
        aria-label="Quantité réservée"
        aria-valuemin={0}
        aria-valuemax={gauge.max}
        aria-valuenow={value}
        aria-valuetext={`${formatUnits(group.reservedQty)} sur ${formatUnits(gauge.max)}`}
        className="h-2 overflow-hidden rounded-pill bg-surface-hover"
      >
        <span className={cn("block h-full rounded-pill", gauge.muted ? "bg-foreground-subtle" : "bg-brand")} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-meta text-foreground-muted">{gauge.caption}</p>
    </div>
  );
}

function FactItem({ fact }: { fact: Fact }) {
  return (
    <div className="min-w-0">
      <dt className="text-meta text-foreground-muted">{fact.label}</dt>
      <dd className="text-body font-semibold text-foreground tabular-nums">{fact.value}</dd>
      {fact.hint && <dd className="text-meta text-foreground-muted">{fact.hint}</dd>}
    </div>
  );
}

function byline(group: GroupBuy, showStore: boolean): string {
  const day = formatWith(DAY, group.opensAt);
  const launched = group.initiatorName ? `Lancé par ${group.initiatorName}${day ? ` le ${day}` : ""}` : day ? `Lancé le ${day}` : null;
  return [launched, group.city, showStore ? group.storeName : null].filter(Boolean).join(" · ");
}

/** One group on the seller's products: what it is at, what it brought, its public page. */
export function GroupBuyCard({ group, serverNow, showStore = false }: { group: GroupBuy; serverNow: number | null; showStore?: boolean }) {
  const headingId = useId();
  const name = group.product?.name ?? "Produit retiré de la vente";
  const time = timeFact(group, serverNow);
  const facts = [{ label: "Membres", value: formatUnits(group.membersCount) }, ordersFact(group), priceFact(group), ...(time ? [time] : [])];
  const line = byline(group, showStore);

  return (
    <article aria-labelledby={headingId} className="flex h-full min-w-0 flex-col gap-4 rounded-panel border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <ProductThumb src={group.product?.imageUrl ?? null} size="md" />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="line-clamp-2 text-body font-semibold break-words text-foreground">
            {name}
          </h3>
          {line && <p className="mt-0.5 text-meta break-words text-foreground-muted">{line}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge domain="groupBuy" code={group.status} />
            {group.grouped && (
              <Badge icon={Truck} title="La personne qui a lancé le groupe commande pour tout le monde, en un seul colis.">
                Livraison groupée
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Gauge group={group} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((fact) => (
          <FactItem key={fact.label} fact={fact} />
        ))}
      </dl>

      {group.shareUrl && (
        <div className="mt-auto">
          <Button asChild variant="secondary" size="compact" trailingIcon={ExternalLink} className="w-full sm:w-auto">
            <a href={group.shareUrl} target="_blank" rel="noreferrer">
              Voir la page du groupe<span className="sr-only"> {name}, dans un nouvel onglet</span>
            </a>
          </Button>
        </div>
      )}
    </article>
  );
}

/** The cards while the first page is on its way. */
export function GroupListSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <Skeleton key={index} className={cn("h-72 w-full rounded-panel", index > 0 && "hidden md:block", index > 1 && "md:hidden xl:block")} />
      ))}
    </div>
  );
}

/** What went wrong when a list or the figures could not be read. */
export function describeLoadFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 403) return "Votre compte n'a pas accès aux achats groupés.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Les achats groupés n'ont pas pu être chargés. Réessayez dans un instant.";
}
