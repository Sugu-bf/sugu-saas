"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { Avatar, Skeleton, asFrancs, cn, formatMoneyFromFrancs } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import type { Client } from "../contract";

// Pieces the Clients screens share. They follow their mock-up
// (docs/captures/references/v7-clients-marketing-stats-planche-1.png) on
// Foundation: figures without a tinted tile, pills for buttons and badges.

export const CLIENTS = "/vendor/clients";
export const clientPath = (id: string, from?: string) => {
  const params = new URLSearchParams(from ?? "");
  params.set("client", id);
  return `${CLIENTS}?${params.toString()}`;
};

/** Frame of a Clients page: the Foundation scope, and the width its table needs. */
export function ClientsPage({ children, ...props }: { children: ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" {...props}>
      {children}
    </div>
  );
}

// ── Words and numbers ───────────────────────────────────────

const UNITS = new Intl.NumberFormat("fr-FR");
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const formatUnits = (value: number) => UNITS.format(value);
export const formatFrancs = (value: number) => formatMoneyFromFrancs(asFrancs(value));
export const plural = (count: number, one: string, other: string) => `${formatUnits(count)} ${count > 1 ? other : one}`;

export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DAY.format(date);
}

/** `+226 70 12 34 56`: a number a person can read; anything else is left as it is. */
export function formatPhone(phone: string | null): string {
  if (!phone) return "";
  const match = /^(\+\d{3})(\d{8})$/.exec(phone);
  return match ? `${match[1]} ${match[2].replace(/(\d{2})(?=\d)/g, "$1 ")}` : phone;
}

/** What went wrong, in words a seller can act on. */
export function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 404) return "Votre compte n'a pas de boutique : les clients sont réservés aux vendeurs.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Les clients n'ont pas pu être chargés. Réessayez dans un instant.";
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

// ── Cells ───────────────────────────────────────────────────

/** A customer in a row: initials, name, and the number under it. */
export function ClientCell({ client }: { client: Pick<Client, "name" | "phone" | "email"> }) {
  const second = formatPhone(client.phone) || client.email;
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={client.name} size="lg" />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{client.name}</span>
        {second && <span className="block truncate text-meta text-foreground-muted tabular-nums">{second}</span>}
      </span>
    </span>
  );
}

// ── Key figures ─────────────────────────────────────────────

/** Row of key figures: two a row on a phone, never a row to scroll sideways. */
export function KpiGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {children}
    </section>
  );
}

/**
 * A figure of the mock-up: the icon on the left, the figure, its label. The
 * icon stays plain: colour is kept for statuses. With `onSelect` the card
 * filters the list it counts; `trend` is a line under the label, for a
 * comparison the server computed.
 */
export function Figure({ icon: Icon, label, value, hint, trend, onSelect, pressed = false, loading = false }: { icon: LucideIcon; label: string; value: ReactNode | undefined; hint?: string; trend?: ReactNode; onSelect?: () => void; pressed?: boolean; loading?: boolean }) {
  const labelClass = "block text-left text-label text-foreground-muted";
  return (
    <div
      data-pressed={pressed || undefined}
      className={cn(
        "relative flex min-w-0 items-center gap-3 rounded-panel border border-border bg-surface p-3 md:gap-4 md:p-4",
        onSelect && "transition-colors duration-100 hover:border-border-strong data-[pressed]:border-primary data-[pressed]:bg-brand-subtle",
        onSelect && "has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-focus-ring",
      )}
    >
      <Icon className="size-5 shrink-0 text-foreground md:size-7" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col-reverse">
        {trend && !loading && <span className="mt-0.5 block text-meta text-foreground-muted">{trend}</span>}
        {onSelect ? (
          <button type="button" aria-pressed={pressed} onClick={onSelect} className={cn(labelClass, "outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none")}>
            {label}
            {hint && <span className="sr-only">, {hint}</span>}
          </button>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {loading || value === undefined ? <Skeleton className="mb-1 h-7 w-14" /> : <span className="block min-w-0 text-kpi text-foreground tabular-nums [overflow-wrap:anywhere]">{value}</span>}
      </div>
      {onSelect && <ChevronRight className="size-4 shrink-0 text-foreground-subtle max-md:hidden" aria-hidden="true" />}
    </div>
  );
}
