import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "../cn";
import { Skeleton } from "./skeleton";

export interface StatTrend {
  direction: "up" | "down" | "flat";
  /** Already formatted, e.g. "+12 %". */
  label: string;
  /** Whether this movement is good news. Colour follows meaning, not direction. */
  sentiment?: "positive" | "negative" | "neutral";
}

export interface StatProps {
  label: string;
  /** Already formatted value (use the money formatters for amounts). */
  value: ReactNode;
  icon?: LucideIcon;
  /**
   * `figure`: the card of a row of key figures. The icon alone, dark,
   * neither tinted nor in a tile; the figure; its label under it. No colour
   * and no trend: what the figure is compared with is said in `hint`.
   * `label` (default): the label first, a small icon beside it.
   */
  layout?: "label" | "figure";
  /** Movement since the previous period. Drawn by the `label` layout only. */
  trend?: StatTrend;
  /** Context line under the value, e.g. "sur 30 jours". */
  hint?: ReactNode;
  /**
   * Makes the whole card a button: a figure that is the size of a list
   * filters that list. Needs the `figure` layout. `pressed` says the filter is on.
   */
  onSelect?: () => void;
  pressed?: boolean;
  loading?: boolean;
  className?: string;
}

const TREND_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;
const TREND_WORD = { up: "En hausse", down: "En baisse", flat: "Stable" } as const;
const SENTIMENT_CLASS = {
  positive: "text-success-fg",
  negative: "text-danger-fg",
  neutral: "text-foreground-muted",
} as const;

/** KPI. One neutral look for every figure: colour is kept for what moves, never for decoration. */
export function Stat({ label, value, icon: Icon, layout = "label", trend, hint, onSelect, pressed = false, loading = false, className }: StatProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
  const trendContent = trend && TrendIcon && (
    <>
      <TrendIcon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{TREND_WORD[trend.direction]} : </span>
      {trend.label}
    </>
  );

  if (layout === "figure") {
    const labelClass = "order-3 mt-0.5 line-clamp-2 text-left text-label text-foreground-muted";
    return (
      <div
        data-pressed={pressed || undefined}
        className={cn(
          // Smaller on a phone, where two of them share the width of the screen.
          "relative flex min-w-0 flex-col rounded-panel border border-border bg-surface p-3 md:p-4",
          onSelect && "transition-colors duration-100 hover:border-border-strong data-[pressed]:border-primary data-[pressed]:bg-brand-subtle",
          // The button below covers the card: the focus ring is drawn around the card.
          onSelect && "has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-offset-2 has-[button:focus-visible]:outline-focus-ring",
          className,
        )}
      >
        {/* Read in the order label, figure, context; drawn icon, figure, label, context. */}
        {Icon && <Icon className="order-1 size-5 shrink-0 text-foreground" strokeWidth={1.75} aria-hidden="true" />}
        {onSelect ? (
          <button type="button" aria-pressed={pressed} onClick={onSelect} className={cn(labelClass, "outline-none after:absolute after:inset-0 after:rounded-panel focus-visible:outline-none")}>
            {label}
          </button>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {loading ? (
          <Skeleton className="order-2 mt-2 h-7 w-20 md:mt-3 md:h-9" />
        ) : (
          // A key figure is never cut: in a narrow card its unit goes under the number, and a number wider than the card breaks rather than hides its end.
          <span className="order-2 mt-2 min-w-0 text-kpi text-foreground tabular-nums [overflow-wrap:anywhere] md:mt-3">{value}</span>
        )}
        {hint && !loading && <p className="order-4 mt-0.5 text-meta text-foreground-muted">{hint}</p>}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-panel border border-border bg-surface p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-label text-foreground-muted">{label}</span>
        {Icon && <Icon className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-28" />
      ) : (
        <span className="truncate text-kpi text-foreground tabular-nums">{value}</span>
      )}
      {(trend || hint) && !loading && (
        <div className="flex flex-wrap items-center gap-x-2 text-meta text-foreground-muted">
          {trendContent && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", SENTIMENT_CLASS[trend.sentiment ?? "neutral"])}>
              {trendContent}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
