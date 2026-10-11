import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { cn, formatMoneyFromFrancs } from "@/design-system";
import { formatToday } from "../format";

/** Frame of an agency page: the Foundation scope, and the width its tables need. */
export function AgencyPage({ children, className, ...props }: { children: ReactNode; className?: string; "aria-busy"?: boolean }) {
  return (
    <div className={cn("sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * The day a page is about, next to its actions. A piece of information,
 * not a control: the figures are those of today, and no other day can be
 * asked for.
 */
export function TodayLabel({ now = new Date() }: { now?: Date }) {
  return (
    <p className="flex h-control items-center gap-2 rounded-button border border-border bg-surface px-3 text-label whitespace-nowrap text-foreground">
      <CalendarDays className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      <time dateTime={now.toISOString().slice(0, 10)}>{formatToday(now)}</time>
    </p>
  );
}

/** An amount as a key figure: the number large, the unit small beside it. */
export function KpiMoney({ francs }: { francs: number }) {
  return (
    <>
      {formatMoneyFromFrancs(francs, { currency: false })} <span className="text-body font-semibold text-foreground-muted">FCFA</span>
    </>
  );
}

/**
 * Row of key figures: four or five across on a desktop, three a row on a
 * tablet.
 *
 * On a phone, a grid of smaller cards, two a row: nothing scrolls sideways,
 * and every figure is on screen. The fifth of five takes the row under the
 * four others.
 */
export function KpiRow({ children, columns = 5, label }: { children: ReactNode; columns?: 4 | 5; label: string }) {
  return (
    <section
      aria-label={label}
      className={cn(
        "grid grid-cols-2 gap-2.5 md:gap-3",
        columns === 4 ? "xl:grid-cols-4" : "max-md:[&>*:last-child:nth-child(odd)]:col-span-2 md:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {children}
    </section>
  );
}
