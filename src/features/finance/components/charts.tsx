import { cn, formatMoneyFromCents, type MoneyCents } from "@/design-system";

// The two drawings of the money screens. Both are drawn from what the
// server counted, and both give their figures in a table for who cannot see
// them. Neither invents a comparison.

const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });
const MONTH_LONG = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

/** "oct." from `2026-10`. */
export function shortMonth(month: string): string {
  const text = MONTH.format(monthDate(month));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "octobre 2026" from `2026-10`. */
export const longMonth = (month: string): string => MONTH_LONG.format(monthDate(month));

/** The top of the scale, in francs: the smallest round figure that holds the tallest bar. */
function scaleTop(maxFrancs: number): number {
  if (maxFrancs <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(maxFrancs));
  for (const step of [1, 2, 2.5, 5, 10]) if (maxFrancs <= step * magnitude) return step * magnitude;
  return 10 * magnitude;
}

/** "1,5 M", "250 k", "800": a tick of the scale, short enough for its column. */
function tickLabel(francs: number): string {
  if (francs >= 1_000_000) return `${(francs / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} M`;
  if (francs >= 1_000) return `${(francs / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return francs.toLocaleString("fr-FR");
}

/**
 * What settlement credited in each of the last months, one bar a month. The
 * month the figures of the page are those of is the bar in full colour.
 */
export function MonthlyBars({ months, selected, label, className }: { months: Array<{ month: string; amount: MoneyCents }>; selected: string; label: string; className?: string }) {
  const top = scaleTop(Math.max(0, ...months.map((entry) => entry.amount / 100)));
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const total = months.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <figure className={cn("relative flex flex-col", className)}>
      <div role="img" aria-label={`${label}, des ${months.length} derniers mois : ${formatMoneyFromCents(total)} au total.`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        <div className="flex h-44 flex-col justify-between text-meta text-foreground-muted tabular-nums" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 text-right leading-4 whitespace-nowrap">
              {tickLabel(tick)}
            </span>
          ))}
        </div>

        <div className="relative h-44" aria-hidden="true">
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-end justify-around gap-2 px-1">
            {months.map((entry) => (
              <div key={entry.month} className="flex h-full min-w-0 flex-1 items-end justify-center" title={`${longMonth(entry.month)} : ${formatMoneyFromCents(entry.amount)}`}>
                <span
                  className={cn("w-full max-w-9 rounded-t-compact", entry.month === selected ? "bg-brand" : "bg-brand/30")}
                  // A month with income is never drawn flat: two pixels at least.
                  style={{ height: entry.amount > 0 ? `max(2px, ${(entry.amount / 100 / top) * 100}%)` : 0 }}
                />
              </div>
            ))}
          </div>
        </div>

        <span aria-hidden="true" />
        <div className="mt-2 flex justify-around gap-2 px-1 text-meta text-foreground-muted" aria-hidden="true">
          {months.map((entry) => (
            <span key={entry.month} className={cn("min-w-0 flex-1 text-center whitespace-nowrap", entry.month === selected && "font-semibold text-foreground")}>
              {shortMonth(entry.month)}
            </span>
          ))}
        </div>
      </div>

      <div className="sr-only">
        <table>
          <caption>{label}, par mois</caption>
          <thead>
            <tr>
              <th scope="col">Mois</th>
              <th scope="col">Montant</th>
            </tr>
          </thead>
          <tbody>
            {months.map((entry) => (
              <tr key={entry.month}>
                <th scope="row">{longMonth(entry.month)}</th>
                <td>{formatMoneyFromCents(entry.amount)}</td>
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
  amount: MoneyCents;
  /** Classes of its colour: the stroke of its arc, the fill of its dot. */
  stroke: string;
  dot: string;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * How a total splits, as a ring: the total in its middle, each part named
 * beside it with its amount and its share. A part of nothing is listed, not
 * drawn.
 */
export function ShareRing({ shares, total, caption }: { shares: Share[]; total: MoneyCents; caption: string }) {
  const sum = shares.reduce((accumulator, share) => accumulator + share.amount, 0);
  let offset = 0;

  return (
    <figure className="flex flex-col items-center gap-4 @md:flex-row @md:items-center @md:gap-6">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${caption} : ${formatMoneyFromCents(total)}.`}>
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" className="stroke-border" />
          {sum > 0 &&
            shares
              .filter((share) => share.amount > 0)
              .map((share) => {
                const length = (share.amount / sum) * CIRCUMFERENCE;
                const arc = <circle key={share.key} cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="12" strokeDasharray={`${length} ${CIRCUMFERENCE - length}`} strokeDashoffset={-offset} className={share.stroke} />;
                offset += length;
                return arc;
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
          <span className="text-body font-semibold text-foreground tabular-nums [overflow-wrap:anywhere]">{formatMoneyFromCents(total, { currency: false })}</span>
          <span className="text-meta text-foreground-muted">FCFA</span>
        </div>
      </div>

      <figcaption className="w-full min-w-0 flex-1">
        <ul className="flex flex-col gap-2">
          {shares.map((share) => (
            <li key={share.key} className="flex items-center gap-2 text-label">
              <span className={cn("size-2.5 shrink-0 rounded-pill", share.dot)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-normal text-foreground-muted">{share.label}</span>
              <span className="shrink-0 font-semibold text-foreground tabular-nums">{formatMoneyFromCents(share.amount)}</span>
              <span className="w-10 shrink-0 text-right font-normal text-foreground-muted tabular-nums">{sum > 0 ? `${Math.round((share.amount / sum) * 100)} %` : "—"}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
