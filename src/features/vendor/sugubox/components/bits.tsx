"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, ChevronRight, type LucideIcon } from "lucide-react";
import { Alert, Card, ErrorState, Skeleton, cn } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { ApiError } from "@/lib/http/api-error";

// Pieces the seven Sugu Box screens share. They follow their mock-ups
// (docs/captures/references/v6-sugubox-*.png) on Foundation: no colour of
// their own, pills for buttons and badges, figures without a tinted tile.

export const BOX = {
  overview: "/vendor/sugubox",
  stock: "/vendor/sugubox/stock",
  receptions: "/vendor/sugubox/inbound",
  reception: (id: string) => `/vendor/sugubox/inbound/${id}`,
  expeditions: "/vendor/sugubox/outbound",
  expedition: (id: string) => `/vendor/sugubox/outbound/${id}`,
  movements: "/vendor/sugubox/movements",
} as const;

export const BOX_CRUMB = { label: "Sugu Box", href: BOX.overview } as const;

/** Frame of a Sugu Box page: the Foundation scope, and the width its tables need. */
export function BoxPage({ children, ...props }: { children: ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" {...props}>
      {children}
    </div>
  );
}

// ── Words and numbers ───────────────────────────────────────

const UNITS = new Intl.NumberFormat("fr-FR");
const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const DAY_SHORT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatUnits = (value: number) => UNITS.format(value);
/** `+50`, `-3`: a movement always says which way it went. */
export const formatSigned = (value: number) => (value > 0 ? `+${UNITS.format(value)}` : UNITS.format(value).replace("-", "−"));

/** A day the server gives without an hour (`2026-10-12`) is read as that day here, whatever the time zone. */
function dateOf(value: string): Date | null {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(value: string | null | undefined): string {
  const date = value ? dateOf(value) : null;
  return date ? DAY.format(date) : "—";
}

export function formatTime(value: string | null | undefined): string {
  const date = value ? dateOf(value) : null;
  return date ? TIME.format(date) : "";
}

export function formatDayTime(value: string | null | undefined): string {
  const date = value ? dateOf(value) : null;
  return date ? `${DAY.format(date)} à ${TIME.format(date)}` : "—";
}

export function formatDayShortTime(value: string | null | undefined): string {
  const date = value ? dateOf(value) : null;
  return date ? `${DAY_SHORT.format(date)} ${TIME.format(date)}` : "—";
}

export const plural = (count: number, one: string, other: string) => `${formatUnits(count)} ${count > 1 ? other : one}`;

/** What went wrong, in words a seller can act on. */
export function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 403) return "Votre compte n'a pas de boutique : Sugu Box est réservé aux vendeurs.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
    if (error.status >= 500) return "Le service Sugu Box ne répond pas pour le moment. Réessayez dans un instant.";
  }
  return "Les données Sugu Box n'ont pas pu être chargées. Réessayez.";
}

export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404;

// ── Cells ───────────────────────────────────────────────────

/** A product in a row: its picture, its name, its variant under it. */
export function ProductCell({ name, variant, imageUrl, sku }: { name: string; variant?: string | null; imageUrl: string | null; sku?: string | null }) {
  const second = [variant, sku].filter(Boolean).join(" · ");
  return (
    <span className="flex min-w-0 items-center gap-3">
      <ProductThumb src={imageUrl} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{name || "Produit sans nom"}</span>
        {second && <span className="block truncate text-meta text-foreground-muted">{second}</span>}
      </span>
    </span>
  );
}

/** The code of a bin of the warehouse, as a label a picker reads on a shelf. */
export function BinChip({ code }: { code: string }) {
  return <span className="inline-flex h-6 items-center rounded-badge bg-surface-subtle px-2 text-meta font-medium whitespace-nowrap text-foreground tabular-nums">{code}</span>;
}

export function Reference({ children }: { children: ReactNode }) {
  return <span className="font-medium whitespace-nowrap text-foreground tabular-nums">{children}</span>;
}

/** A quantity that moved: green in, red out, and a sign whatever the colour. */
export function SignedQuantity({ value }: { value: number }) {
  return <span className={cn("font-semibold tabular-nums", value > 0 ? "text-success-fg" : value < 0 ? "text-danger-fg" : "text-foreground-muted")}>{formatSigned(value)}</span>;
}

// ── Key figures ─────────────────────────────────────────────

/** Row of key figures: two a row on a phone, never a row to scroll sideways. */
export function KpiGrid({ label, columns, children }: { label: string; columns: 3 | 4 | 5; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-2.5 md:gap-3 max-md:[&>*:last-child:nth-child(odd)]:col-span-2",
        columns === 3 && "md:grid-cols-3",
        columns === 4 && "md:grid-cols-4",
        columns === 5 && "md:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {children}
    </section>
  );
}

/**
 * A key figure of the overview, as its mock-up draws it: the icon alone,
 * the label, the figure, what it counts, and the list behind it.
 */
export function FigureCard({ icon: Icon, label, value, unit, link, loading }: { icon: LucideIcon; label: string; value: number | undefined; unit: string; link: { label: string; href: string }; loading: boolean }) {
  return (
    <Card className="flex min-w-0 flex-col p-3 md:p-4">
      <Icon className="size-5 text-foreground md:size-6" aria-hidden="true" />
      <p className="mt-2 text-label font-semibold text-foreground md:mt-3">{label}</p>
      {loading || value === undefined ? <Skeleton className="mt-1 h-8 w-16" /> : <p className="mt-0.5 text-kpi text-foreground tabular-nums">{formatUnits(value)}</p>}
      <p className="text-meta text-foreground-muted">{unit}</p>
      <Link href={link.href} className="mt-2 inline-flex min-h-6 items-center gap-1 self-start text-label font-medium text-primary underline-offset-4 hover:underline md:mt-3">
        {link.label} <span aria-hidden="true">→</span>
      </Link>
    </Card>
  );
}

/**
 * The counter of a list, as the mock-ups of the lists draw it: the icon on
 * the left, the label, the figure, and a chevron when the card filters the
 * list it counts. The icon stays plain: colour is kept for statuses.
 */
export function FilterFigure({ icon: Icon, label, value, hint, onSelect, pressed = false, loading = false }: { icon: LucideIcon; label: string; value: number | undefined; hint?: string; onSelect?: () => void; pressed?: boolean; loading?: boolean }) {
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
      <Icon className="size-6 shrink-0 text-foreground md:size-7" strokeWidth={1.75} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {onSelect ? (
          <button type="button" aria-pressed={pressed} onClick={onSelect} className={cn(labelClass, "outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none")}>
            {label}
          </button>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {loading || value === undefined ? <Skeleton className="mt-1 h-7 w-12" /> : <span className="block text-kpi text-foreground tabular-nums">{formatUnits(value)}</span>}
        {hint && !loading && <span className="block text-meta text-foreground-muted">{hint}</span>}
      </div>
      {onSelect && <ChevronRight className="size-4 shrink-0 text-foreground-subtle max-md:hidden" aria-hidden="true" />}
    </div>
  );
}

// ── Journey of a reception or an expedition ─────────────────

export interface JourneyStep {
  label: string;
  /** When the step was reached, already formatted; none while it is still to come. */
  at?: string | null;
  state: "done" | "current" | "upcoming";
}

/** The steps of a document, in a row; read as a list ("Contrôle : en cours"). */
export function Journey({ label, steps }: { label: string; steps: JourneyStep[] }) {
  const words = { done: "fait", current: "en cours", upcoming: "à venir" } as const;
  return (
    <ol aria-label={label} className="flex w-full items-start">
      {steps.map((step, index) => (
        <li key={step.label} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
          {index > 0 && <span aria-hidden="true" className={cn("absolute top-3 right-1/2 h-0.5 w-full", step.state === "upcoming" ? "bg-border" : "bg-primary")} />}
          <span
            aria-hidden="true"
            className={cn(
              "relative z-[1] flex size-6 items-center justify-center rounded-pill border-2 bg-surface",
              step.state === "done" && "border-primary bg-primary text-white",
              step.state === "current" && "border-primary",
              step.state === "upcoming" && "border-border-strong",
            )}
          >
            {step.state === "done" ? <Check className="size-3.5" /> : step.state === "current" ? <span className="size-2 rounded-pill bg-primary" /> : null}
          </span>
          <span className={cn("mt-1.5 px-1 text-label", step.state === "upcoming" ? "text-foreground-muted" : "font-semibold text-foreground")}>{step.label}</span>
          <span className="px-1 text-meta text-foreground-muted">
            {step.at ?? (step.state === "current" ? "En cours" : step.state === "upcoming" ? "En attente" : "")}
            <span className="sr-only"> : {words[step.state]}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

// ── States of a whole page ──────────────────────────────────

export function PageFailure({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  if (error instanceof ApiError && error.status === 403) {
    return (
      <Alert tone="warning" title="Accès réservé">
        {describeFailure(error)}
      </Alert>
    );
  }
  return (
    <Card>
      <ErrorState title="Chargement impossible" description={describeFailure(error)} onRetry={onRetry} retrying={retrying} />
    </Card>
  );
}

export function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-64 w-full rounded-panel" />
    </div>
  );
}
