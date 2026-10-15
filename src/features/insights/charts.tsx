"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/design-system";

// The drawings of the statistics screens (seller and agency). Each one is
// drawn from what the server counted, on one scale, and gives its figures in
// a table for who cannot see it. Pointing at a day, or moving over the days
// with the arrow keys, reads its figures; nothing is only in a tooltip.

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const DAY_LONG = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const UNITS = new Intl.NumberFormat("fr-FR");

const dateOf = (day: string) => new Date(`${day}T00:00:00Z`);
/** "12 oct." from `2026-10-12`. */
export const shortDay = (day: string) => DAY.format(dateOf(day));
/** "lundi 12 octobre" from `2026-10-12`. */
export const longDay = (day: string) => DAY_LONG.format(dateOf(day));

/** The top of a scale: the smallest round figure that holds the tallest mark. */
export function scaleTop(max: number): number {
  if (max <= 0) return 4;
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 4, 5, 8, 10]) if (max <= step * magnitude) return step * magnitude;
  return 10 * magnitude;
}

/** "1,5 M", "250 k", "800": a tick of the scale, short enough for its column. */
export function tickLabel(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
  if (value >= 10_000) return `${(value / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return UNITS.format(value);
}

/** Days named under the plot: both ends, and a few between them. */
function dayTicks(count: number): number[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, index) => Math.round((index * (count - 1)) / steps));
}

export interface DayPoint {
  /** `YYYY-MM-DD`. */
  date: string;
  /** What the mark draws. */
  value: number;
  /** What the readout says of that day, the drawn value first. */
  readout: Array<{ label: string; value: string }>;
}

interface DayChartProps {
  /** What the chart shows, e.g. "Chiffre d'affaires par jour". */
  label: string;
  /** The sentence a screen reader gets in place of the drawing. */
  summary: string;
  points: DayPoint[];
  /** An area for money that accumulates, bars for counts, a line with its days marked (the dashboard). */
  form: "area" | "bars" | "line";
  /** Ticks of the scale as text (amounts are shortened, counts are not). */
  formatTick?: (value: number) => string;
  /** The day under the plot; "12 oct." by default. */
  formatDay?: (day: string) => string;
  /** The colour of the mark: the brand, or `danger` for a figure going down. */
  tone?: "brand" | "danger";
  className?: string;
}

/**
 * A figure day by day over a period: an area under a line for money that
 * accumulates, bars for things that are counted. One scale, starting at zero.
 */
export function DayChart({ label, summary, points, form, formatTick = tickLabel, formatDay = shortDay, tone = "brand", className }: DayChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const readoutId = useId();
  const count = points.length;
  const top = scaleTop(Math.max(0, ...points.map((point) => point.value)));
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const named = dayTicks(count);
  const current = active !== null ? points[active] : null;

  const indexAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / Math.max(1, box.width);
    return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (count === 0) return;
    const from = active ?? count - 1;
    if (event.key === "ArrowRight") setActive(Math.min(count - 1, active === null ? count - 1 : from + 1));
    else if (event.key === "ArrowLeft") setActive(Math.max(0, from - 1));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(count - 1);
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  // The middle of each day's column, as a share of the width.
  const x = (index: number) => ((index + 0.5) / count) * 100;
  const y = (value: number) => 100 - (value / top) * 100;
  // A line is drawn smooth: each day joins the next by a curve whose handles stay level, so it never dips under zero nor above a day's figure.
  const line = points
    .map((point, index) => {
      const here = `${x(index).toFixed(3)},${y(point.value).toFixed(3)}`;
      if (index === 0) return `M${here}`;
      if (form !== "line") return `L${here}`;
      const middle = ((x(index - 1) + x(index)) / 2).toFixed(3);
      return `C${middle},${y(points[index - 1].value).toFixed(3)} ${middle},${y(point.value).toFixed(3)} ${here}`;
    })
    .join(" ");

  return (
    <figure className={cn("relative flex flex-col", className)}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="flex h-48 flex-col justify-between text-meta text-foreground-muted tabular-nums" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 text-right leading-4 whitespace-nowrap">
              {formatTick(tick)}
            </span>
          ))}
        </div>

        <div
          role="img"
          aria-label={summary}
          aria-describedby={current ? readoutId : undefined}
          tabIndex={count > 0 ? 0 : -1}
          onPointerMove={(event) => setActive(indexAt(event))}
          onPointerDown={(event) => setActive(indexAt(event))}
          onPointerLeave={(event) => event.pointerType === "mouse" && setActive(null)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative h-48 touch-pan-y rounded-compact outline-offset-4"
        >
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>

          {form !== "bars" ? (
            <>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
                {count > 1 && <path d={`${line} L${x(count - 1)},100 L${x(0)},100 Z`} className={form === "area" ? "fill-brand/10" : tone === "danger" ? "fill-danger-solid/5" : "fill-brand/5"} />}
                {count > 1 && <path d={line} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className={tone === "danger" ? "stroke-danger-solid" : "stroke-brand"} />}
              </svg>
              {/* A line marks its days while they are few enough to tell apart. */}
              {form === "line" &&
                count <= 31 &&
                points.map((point, index) => (
                  <span
                    key={point.date}
                    aria-hidden="true"
                    className={cn("pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill border-2 bg-surface", tone === "danger" ? "border-danger-solid" : "border-brand")}
                    style={{ left: `${x(index)}%`, top: `${y(point.value)}%` }}
                  />
                ))}
            </>
          ) : (
            <div className="absolute inset-0 flex items-end" aria-hidden="true">
              {points.map((point, index) => (
                <div key={point.date} className="flex h-full min-w-0 flex-1 items-end justify-center px-px">
                  <span
                    className={cn("w-full max-w-7 rounded-t-compact", active === null || active === index ? "bg-brand" : "bg-brand/40")}
                    // A day with something is never drawn flat: two pixels at least.
                    style={{ height: point.value > 0 ? `max(2px, ${(point.value / top) * 100}%)` : 0 }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* The day pointed at: a hairline, and on a line its point, ringed by the surface. */}
          {current && active !== null && (
            <>
              {form !== "bars" && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-border-strong" style={{ left: `${x(active)}%` }} />}
              {form !== "bars" && (
                <span
                  aria-hidden="true"
                  className={cn("pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-pill ring-2 ring-surface", tone === "danger" ? "bg-danger-solid" : "bg-brand")}
                  style={{ left: `${x(active)}%`, top: `${y(current.value)}%` }}
                />
              )}
              <div
                id={readoutId}
                role="status"
                className={cn("pointer-events-none absolute top-0 z-10 w-max max-w-[min(15rem,80%)] rounded-control border border-border bg-surface px-3 py-2 shadow-lg", x(active) > 55 ? "-translate-x-full" : "")}
                style={{ left: `calc(${x(active)}% + ${x(active) > 55 ? "-8px" : "8px"})` }}
              >
                <p className="text-meta text-foreground-muted first-letter:uppercase">{longDay(current.date)}</p>
                {current.readout.map((entry, index) => (
                  <p key={entry.label} className="flex items-baseline justify-between gap-4 text-label">
                    <span className="text-foreground-muted">{entry.label}</span>
                    <span className={cn("tabular-nums", index === 0 ? "font-semibold text-foreground" : "text-foreground")}>{entry.value}</span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>

        <span aria-hidden="true" />
        <div className="relative mt-2 h-4 text-meta text-foreground-muted tabular-nums" aria-hidden="true">
          {named.map((index, position) => (
            <span
              key={index}
              className={cn("absolute whitespace-nowrap", position === 0 ? "left-0" : position === named.length - 1 ? "right-0" : "-translate-x-1/2", count <= 7 && position > 0 && position < named.length - 1 && "max-md:hidden")}
              style={position === 0 || position === named.length - 1 ? undefined : { left: `${x(index)}%` }}
            >
              {points[index] ? formatDay(points[index].date) : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Jour</th>
              {(points[0]?.readout ?? []).map((entry) => (
                <th key={entry.label} scope="col">
                  {entry.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <th scope="row">{longDay(point.date)}</th>
                {point.readout.map((entry) => (
                  <td key={entry.label}>{entry.value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

export interface Share {
  key: string;
  label: string;
  value: number;
  /** The share as the server computed it, in percent. */
  percent: number;
  /** What the legend says of the part: an amount, a count. */
  detail: string;
  /** Classes of its colour: the stroke of its arc, the fill of its dot. */
  stroke: string;
  dot: string;
}

/** One hue from full to faint, for the parts of a whole listed from the largest: lightness tells them apart, their names say which is which. */
export const RANKED_SHADES: Array<{ stroke: string; dot: string }> = [
  { stroke: "stroke-brand", dot: "bg-brand" },
  { stroke: "stroke-brand/75", dot: "bg-brand/75" },
  { stroke: "stroke-brand/55", dot: "bg-brand/55" },
  { stroke: "stroke-brand/40", dot: "bg-brand/40" },
  { stroke: "stroke-brand/25", dot: "bg-brand/25" },
  { stroke: "stroke-neutral-icon/40", dot: "bg-neutral-icon/40" },
];

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** The surface shows between two parts. */
const GAP = 1.2;

/**
 * How a total splits, as a ring: the total in its middle, each part named
 * beside it with its figure and its share. A part of nothing is listed, not
 * drawn. Read at a glance only: six parts at most.
 */
export function ShareRing({ shares, center, caption }: { shares: Share[]; center: { value: ReactNode; label: string }; caption: string }) {
  const sum = shares.reduce((total, share) => total + share.value, 0);
  const drawn = shares.filter((share) => share.value > 0);
  let offset = 0;

  return (
    <figure className="flex flex-col items-center gap-4 @md:flex-row @md:items-center @md:gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={caption}>
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" className="stroke-border" />
          {sum > 0 &&
            drawn.map((share) => {
              const length = (share.value / sum) * CIRCUMFERENCE;
              const visible = Math.max(0.5, length - (drawn.length > 1 ? GAP : 0));
              const arc = <circle key={share.key} cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" strokeDasharray={`${visible} ${CIRCUMFERENCE - visible}`} strokeDashoffset={-offset} className={share.stroke} />;
              offset += length;
              return arc;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className="text-body font-semibold text-foreground tabular-nums [overflow-wrap:anywhere]">{center.value}</span>
          <span className="text-meta text-foreground-muted">{center.label}</span>
        </div>
      </div>

      <figcaption className="w-full min-w-0 flex-1">
        <ul className="flex flex-col gap-2">
          {shares.map((share) => (
            <li key={share.key} className="flex items-center gap-2 text-label">
              <span className={cn("size-2.5 shrink-0 rounded-pill", share.dot)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-foreground">{share.label}</span>
              <span className="text-foreground-muted tabular-nums">{share.detail}</span>
              <span className="w-12 text-right font-semibold text-foreground tabular-nums">{UNITS.format(share.percent)} %</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/** A period of days, as a title says it: "6 oct. – 12 oct. 2026". */
export function periodLabel(from: string, to: string): string {
  const year = dateOf(to).getUTCFullYear();
  return `${shortDay(from)} – ${shortDay(to)} ${year}`;
}

/**
 * A change against the period before, in words: the server gives no rate when
 * that period was empty, and none is made up here.
 */
export function changeHint(change: number | null, previous: string): string {
  if (change === null) return `Période précédente : ${previous}`;
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  return `${sign}${UNITS.format(Math.abs(change))} % · avant : ${previous}`;
}
