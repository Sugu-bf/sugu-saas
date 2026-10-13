"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarRange, Minus } from "lucide-react";
import { Button, ButtonGroup, Card, FormField, Input, cn } from "@/design-system";
import { PERIODS, PERIOD_LABELS, type Compared, type PeriodKey } from "./contract";

// Pieces the two statistics screens share (seller, agency).

const UNITS = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * A change against the period before, as the server computed it: its sign,
 * its rate, and in words what it is compared to. Green when it goes the
 * right way; `lowerIsBetter` for what one wants less of (failures). When the
 * period before was empty the server gives no rate, and none is shown.
 */
export function Trend({ figure, before, lowerIsBetter = false }: { figure: Compared; before: string; lowerIsBetter?: boolean }) {
  if (figure.change === null) return <>Avant : {before}</>;
  const up = figure.change > 0;
  const flat = figure.change === 0;
  const good = flat ? null : up !== lowerIsBetter;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <>
      <span className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", good === null ? "text-foreground-muted" : good ? "text-success-fg" : "text-danger-fg")}>
        <Icon className="size-3.5" aria-hidden="true" />
        <span className="sr-only">{flat ? "Stable" : up ? "En hausse" : "En baisse"} : </span>
        {up ? "+" : flat ? "" : "−"}
        {UNITS.format(Math.abs(figure.change))} %
      </span>{" "}
      <span>avant&nbsp;: {before}</span>
    </>
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The period of the page: the presets the server knows, and, when the page
 * allows it, two days of one's choice. One control above everything it
 * scopes; choosing asks the server again.
 */
export function PeriodControl({
  value,
  onPreset,
  range,
  onRange,
  busy = false,
}: {
  value: PeriodKey | null;
  onPreset: (period: PeriodKey) => void;
  /** The custom range in use, if any. */
  range?: { from: string; to: string } | null;
  /** Omit it and no custom range is offered. */
  onRange?: (range: { from: string; to: string }) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(range));
  const [from, setFrom] = useState(range?.from ?? "");
  const [to, setTo] = useState(range?.to ?? "");
  const today = todayLocal();
  const error = from && to && to < from ? "La date de fin précède la date de début." : to > today ? "La date de fin est dans le futur." : null;
  const ready = DAY.test(from) && DAY.test(to) && !error;

  return (
    <div className="flex flex-col gap-2 md:items-end" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonGroup label="Période" className="max-md:flex-1 max-md:[&>*]:flex-1">
          {PERIODS.map((period) => (
            <Button key={period} variant={value === period ? "primary" : "secondary"} aria-pressed={value === period} onClick={() => onPreset(period)}>
              {PERIOD_LABELS[period]}
            </Button>
          ))}
        </ButtonGroup>
        {onRange && (
          <Button variant={range ? "outline" : "secondary"} icon={CalendarRange} aria-expanded={open} aria-pressed={Boolean(range)} onClick={() => setOpen((shown) => !shown)}>
            Dates
          </Button>
        )}
      </div>
      {onRange && open && (
        <form
          className="flex flex-wrap items-end gap-2 max-md:[&>*]:flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) onRange({ from, to });
          }}
        >
          <FormField label="Du" error={null}>
            <Input type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} />
          </FormField>
          <FormField label="Au" error={error}>
            <Input type="date" value={to} min={from || undefined} max={today} onChange={(event) => setTo(event.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" disabled={!ready}>
            Appliquer
          </Button>
        </form>
      )}
    </div>
  );
}

/** A titled card of a statistics page; it is its own container, so its content lays itself out on the width it really has. */
export function Panel({ title, hint, action, children, className }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cn("@container flex min-w-0 flex-col gap-3", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-section-title text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-meta text-foreground-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** A ranked line: what it is, how much, and a bar of its share of the first. */
export function RankedBar({ label, value, share }: { label: ReactNode; value: string; share: number }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-3 text-label">
        <span className="min-w-0 truncate text-foreground">{label}</span>
        <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">{value}</span>
      </span>
      <span className="block h-1.5 overflow-hidden rounded-pill bg-surface-subtle" aria-hidden="true">
        <span className="block h-full rounded-pill bg-brand" style={{ width: `${Math.max(2, Math.min(100, share))}%` }} />
      </span>
    </li>
  );
}
