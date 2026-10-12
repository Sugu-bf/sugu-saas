import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Skeleton, cn, iconTileClass, type Tone } from "@/design-system";

// The frame of a courier screen, after its mock-ups (V4): a phone first. A
// column a thumb reaches on a phone, which widens into the usual page on a
// desk.

/** Frame of a courier page: the Foundation scope, and a width that reads on a phone and on a desk. */
export function DriverPage({ children, wide = false, className, ...props }: { children: ReactNode; wide?: boolean; className?: string; "aria-busy"?: boolean }) {
  return (
    <div className={cn("sugu-ui mx-auto flex w-full flex-col gap-4", wide ? "max-w-[80rem]" : "max-w-2xl", className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Heading of a screen: the way back on its left, the title in the middle on a
 * phone (as an application does), what the screen offers on its right.
 */
export function ScreenHeader({
  title,
  count,
  back,
  actions,
  children,
}: {
  title: string;
  /** How many the list under it holds, said by the server. */
  count?: ReactNode;
  back?: { label: string; href: string };
  actions?: ReactNode;
  /** Under the title: where the mission stands. */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <div className="grid min-h-touch grid-cols-[2.75rem_1fr_2.75rem] items-center gap-1 md:flex md:gap-3">
        <div className="flex justify-start">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              title={back.label}
              className="flex size-touch items-center justify-center rounded-button text-foreground hover:bg-surface-hover md:size-control md:border md:border-border-strong md:bg-surface"
            >
              <ArrowLeft className="size-5 md:size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        <h1 className="min-w-0 text-center text-section-title text-foreground [overflow-wrap:anywhere] md:flex-1 md:text-left md:text-page-title">
          {title}
          {count !== undefined && <span className="ml-2 text-body font-normal text-foreground-muted tabular-nums">{count}</span>}
        </h1>
        <div className="flex justify-end md:shrink-0 md:gap-2">{actions}</div>
      </div>
      {children}
    </header>
  );
}

/** A key figure of the courier: what it counts on a tinted tile, the figure, its label. */
export function KpiCard({ icon: Icon, tone, value, label, loading = false, href }: { icon: LucideIcon; tone: Tone | "brand"; value: ReactNode; label: string; loading?: boolean; href?: string }) {
  const body = (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-control", iconTileClass[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col-reverse">
        {/* Read label first, drawn figure first. */}
        <span className="truncate text-meta text-foreground-muted">{label}</span>
        {loading ? <Skeleton className="mb-1 h-6 w-10" /> : <span className="text-section-title leading-6 font-semibold text-foreground tabular-nums">{value}</span>}
      </span>
    </>
  );
  const frame = "flex min-w-0 items-center gap-3 rounded-panel border border-border bg-surface p-3";
  return href ? (
    <Link href={href} className={cn(frame, "transition-colors duration-100 hover:border-border-strong")}>
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

/** Row of key figures: two a row on a phone, the fifth under the four others; five across on a desk. */
export function KpiGrid({ children, label }: { children: ReactNode; label: string }) {
  return (
    <section aria-label={label} className="grid grid-cols-2 gap-2.5 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-5 lg:gap-3">
      {children}
    </section>
  );
}

/** Bar of the action of a screen, resting on the tab bar of a phone. */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky sticky-bottom-shell z-sticky -mx-(--page-gutter) flex items-center gap-2 border-t border-border bg-surface px-(--page-gutter) py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">{children}</div>
  );
}
