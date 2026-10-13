"use client";

import type { ReactNode } from "react";
import { Badge, asFrancs, formatMoneyFromFrancs } from "@/design-system";
import { ApiError } from "@/lib/http/api-error";
import { describeFailureWith, type Failure } from "@/lib/http/failure";
import { TYPE_LABELS } from "../contract";

// Pieces the Marketing screens share. They follow their mock-up
// (docs/captures/references/v7-clients-marketing-stats-planche-1.png).

export const MARKETING = "/vendor/marketing";

/** Frame of the Marketing page: the Foundation scope, and the width its tables need. */
export function MarketingPage({ children, ...props }: { children: ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" {...props}>
      {children}
    </div>
  );
}

const UNITS = new Intl.NumberFormat("fr-FR");
const DAY_YEAR = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const DAY_ONLY = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

export const formatUnits = (value: number) => UNITS.format(value);
export const formatFrancs = (value: number) => formatMoneyFromFrancs(asFrancs(value));

/** "01 oct. – 31 déc. 2026"; the year of the start is said when it differs. */
export function formatPeriod(startsAt: string | null, endsAt: string | null): string {
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (start && end) return `${start.getFullYear() === end.getFullYear() ? DAY_ONLY.format(start) : DAY_YEAR.format(start)} – ${DAY_YEAR.format(end)}`;
  if (start) return `Depuis le ${DAY_YEAR.format(start)}, sans fin`;
  if (end) return `Jusqu'au ${DAY_YEAR.format(end)}`;
  return "Sans limite de date";
}

/** "-10 %" or "-5 000 FCFA", as the offer takes it off. */
export function formatReduction(type: string, value: number): string {
  if (type === "percent_off") return `−${formatUnits(value)} %`;
  if (type === "amount_off") return `−${formatFrancs(value)}`;
  return "—";
}

export function TypeBadge({ type }: { type: string }) {
  return <Badge tone={type === "free_shipping" ? "neutral" : "info"}>{TYPE_LABELS[type] ?? type}</Badge>;
}

/** What went wrong when the board could not be read. */
export function describeLoadFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Vos codes et promotions n'ont pas pu être chargés. Réessayez dans un instant.";
}

/** What to tell the seller when a change is refused: the server's own sentence when it wrote one for them. */
export function describeChangeFailure(error: unknown): Failure {
  return describeFailureWith(error, {
    not_found: "Cet élément n'existe plus. La liste a été actualisée.",
    validation: "Certaines informations sont à corriger.",
    forbidden: "Ce produit n'appartient pas à votre boutique.",
  });
}
