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
  trend?: StatTrend;
  /** Context line under the value, e.g. "sur 30 jours". */
  hint?: ReactNode;
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

/** KPI. All stats share one neutral look: colour is kept for meaning. */
export function Stat({ label, value, icon: Icon, trend, hint, loading = false, className }: StatProps) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;
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
          {trend && TrendIcon && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium tabular-nums", SENTIMENT_CLASS[trend.sentiment ?? "neutral"])}>
              <TrendIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{TREND_WORD[trend.direction]} : </span>
              {trend.label}
            </span>
          )}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}
