"use client";

import type { ReactNode } from "react";
import { Card, Section, cn } from "@/design-system";

// ============================================================
// Lanaya — page frame and small shared pieces.
// ============================================================

/** Root of a Lanabaga page: the `.sugu-ui` scope and the page width. */
export function LanayaPage({ children, className, ...props }: { children: ReactNode; className?: string; "aria-busy"?: boolean }) {
  return (
    <div className={cn("sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4", className)} {...props}>
      {children}
    </div>
  );
}

/** A titled block in its card, as every block of the mockups is. */
export function Panel({ className, ...props }: React.ComponentProps<typeof Section>) {
  return (
    <Card className={cn("min-w-0", className)}>
      <Section {...props} />
    </Card>
  );
}

/** "+22670123456" → "+226 70 12 34 56": the numbers of the pilot country, in pairs as people read them. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const match = /^\+226(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(phone.replace(/\s/g, ""));
  return match ? `+226 ${match.slice(1).join(" ")}` : phone;
}

/** Key figures: two columns on a phone (never a row that scrolls sideways), then three or four. */
export function KpiRow({ children, columns = 4, label }: { children: ReactNode; columns?: 3 | 4; label: string }) {
  return (
    <section aria-label={label} className={cn("grid grid-cols-2 gap-2.5 md:gap-3", columns === 4 ? "xl:grid-cols-4" : "max-md:[&>*:last-child:nth-child(odd)]:col-span-2 md:grid-cols-3")}>
      {children}
    </section>
  );
}

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE.format(date);
}

/** "21 oct. 2026": for a column of a table. */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : SHORT_DATE.format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

/** "Aujourd'hui, 10:24", "Hier, 16:30", "Il y a 3 jours", or the date. */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `Aujourd'hui, ${time}`;
  if (days === 1) return `Hier, ${time}`;
  if (days > 1 && days < 7) return `Il y a ${days} jours`;
  if (days >= 7 && days < 14) return "Il y a 1 semaine";
  return formatDate(iso);
}

/** Capacity as a ring: active sellers over the effective capacity, from the server. */
export function CapacityRing({ active, effective, className }: { active: number; effective: number; className?: string }) {
  const ratio = effective > 0 ? Math.min(1, active / effective) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className={cn("relative size-24 shrink-0", className)}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-border" />
        {/* Nothing drawn for zero: a round cap of length 0 would still show a dot. */}
        {ratio > 0 && (
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-success-icon"
            strokeDasharray={`${circumference * ratio} ${circumference}`}
          />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-section-title font-semibold text-foreground tabular-nums">
        {active} / {effective}
      </span>
    </div>
  );
}

export const EXPERIENCE_BANDS = [
  { value: "<1", label: "Moins d'1 an" },
  { value: "1-3", label: "1 à 3 ans" },
  { value: "3-5", label: "3 à 5 ans" },
  { value: "5-10", label: "5 à 10 ans" },
  { value: "10+", label: "Plus de 10 ans" },
];

export const LEAD_SOURCES = [
  { value: "recommendation", label: "Recommandation" },
  { value: "personal_network", label: "Réseau personnel" },
  { value: "trade_fair", label: "Salon commercial" },
  { value: "social_network", label: "Réseaux sociaux" },
  { value: "website", label: "Site web" },
  { value: "other", label: "Autre" },
];

export const REFERENCE_RELATIONS = [
  { value: "regular_client", label: "Client régulier" },
  { value: "business_partner", label: "Partenaire commercial" },
  { value: "supplier", label: "Fournisseur" },
  { value: "former_employer", label: "Ancien employeur" },
  { value: "other", label: "Autre" },
];

/** Phone numbers are typed without their country code; the server adds it. */
export const PHONE_PREFIX = "+226";
