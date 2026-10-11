import { cn } from "@/design-system";
import type { HourActivity } from "../dashboard/contract";

/** Hours always drawn: a working day. Activity outside them widens the range. */
const DAY_START = 8;
const DAY_END = 20;

/** The top of the scale: the smallest of 4, 8, 12, 20, 40, 80… that holds the tallest bar. */
function scaleTop(max: number): number {
  for (const top of [4, 8, 12, 20, 40, 80, 120, 200, 400]) if (max <= top) return top;
  return Math.ceil(max / 100) * 100;
}

const pad = (hour: number) => `${String(hour).padStart(2, "0")} h`;

/**
 * Deliveries and failed attempts of the day, hour by hour, as stacked bars.
 * The figures are also in a table for who cannot see the bars.
 */
export function HourChart({ hours, className }: { hours: HourActivity[]; className?: string }) {
  const active = hours.filter((entry) => entry.delivered + entry.failed > 0).map((entry) => entry.hour);
  const from = Math.min(DAY_START, ...active);
  const to = Math.max(DAY_END, ...active);
  const shown = hours.filter((entry) => entry.hour >= from && entry.hour <= to);
  const top = scaleTop(Math.max(1, ...shown.map((entry) => entry.delivered + entry.failed)));
  const ticks = [top, (top * 3) / 4, top / 2, top / 4, 0];
  const delivered = shown.reduce((sum, entry) => sum + entry.delivered, 0);
  const failed = shown.reduce((sum, entry) => sum + entry.failed, 0);

  return (
    <figure className={cn("relative flex flex-col gap-3", className)}>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-label text-foreground-muted">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-pill bg-brand" aria-hidden="true" />
          Livraisons
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-pill bg-danger-border" aria-hidden="true" />
          Tentatives échouées
        </span>
      </figcaption>

      <div
        role="img"
        aria-label={`Aujourd'hui, de ${pad(from)} à ${pad(to)} : ${delivered} livraison${delivered > 1 ? "s" : ""} et ${failed} tentative${failed > 1 ? "s" : ""} échouée${failed > 1 ? "s" : ""}.`}
        className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3"
      >
        {/* Scale */}
        <div className="flex h-44 flex-col justify-between text-meta text-foreground-muted tabular-nums" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-my-2 text-right leading-4">
              {tick}
            </span>
          ))}
        </div>

        {/* Bars over their grid lines */}
        <div className="relative h-44" aria-hidden="true">
          <div className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span key={tick} className="h-px bg-border" />
            ))}
          </div>
          <div className="absolute inset-0 flex items-end gap-1 md:gap-2">
            {shown.map((entry) => (
              <div key={entry.hour} className="flex h-full min-w-0 flex-1 flex-col-reverse" title={`${pad(entry.hour)} : ${entry.delivered} livrée(s), ${entry.failed} échec(s)`}>
                {/* Bottom to top: what was delivered, then what failed. The top of the bar is rounded. */}
                <span className={cn("w-full bg-brand", entry.failed === 0 && "rounded-t-compact")} style={{ height: `${(entry.delivered / top) * 100}%` }} />
                <span className="w-full rounded-t-compact bg-danger-border" style={{ height: `${(entry.failed / top) * 100}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Hours: every one on a wide chart, every other one on a phone */}
        <span aria-hidden="true" />
        <div className="mt-2 flex gap-1 text-meta text-foreground-muted tabular-nums md:gap-2" aria-hidden="true">
          {shown.map((entry, index) => (
            <span key={entry.hour} className={cn("min-w-0 flex-1 text-center whitespace-nowrap", index % 2 === 1 && "max-md:invisible")}>
              {String(entry.hour).padStart(2, "0")}h
            </span>
          ))}
        </div>
      </div>

      {/* In a wrapper: a table does not shrink to the one pixel of a visually hidden element, and widened the page of a phone. */}
      <div className="sr-only">
      <table>
        <caption>Livraisons et tentatives échouées d&apos;aujourd&apos;hui, par heure</caption>
        <thead>
          <tr>
            <th scope="col">Heure</th>
            <th scope="col">Livraisons</th>
            <th scope="col">Tentatives échouées</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((entry) => (
            <tr key={entry.hour}>
              <th scope="row">{pad(entry.hour)}</th>
              <td>{entry.delivered}</td>
              <td>{entry.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
