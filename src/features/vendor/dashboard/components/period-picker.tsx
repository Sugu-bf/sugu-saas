"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button, FormField, Input, cn } from "@/design-system";
import { PERIODS, type PeriodKey } from "@/features/insights/contract";
import { periodLabel } from "@/features/insights/charts";

export const PERIOD_NAMES: Record<PeriodKey, string> = { "7j": "7 derniers jours", "30j": "30 derniers jours", "90j": "90 derniers jours" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function todayLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The period of the dashboard (frame 13 of the mock-up): a button that says
 * it, and under it the three periods the server knows and a custom one.
 */
export function PeriodPicker({
  value,
  range,
  onPreset,
  onRange,
  busy = false,
}: {
  value: PeriodKey | null;
  range: { from: string; to: string } | null;
  onPreset: (period: PeriodKey) => void;
  onRange: (range: { from: string; to: string }) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(Boolean(range));
  const [from, setFrom] = useState(range?.from ?? "");
  const [to, setTo] = useState(range?.to ?? "");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const today = todayLocal();
  const error = from && to && to < from ? "La date de fin précède la date de début." : to > today ? "La date de fin est dans le futur." : null;
  const ready = DAY.test(from) && DAY.test(to) && !error;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const label = range ? periodLabel(range.from, range.to) : PERIOD_NAMES[value ?? "7j"];

  return (
    <div ref={root} className="relative" aria-busy={busy}>
      <Button ref={trigger} trailingIcon={ChevronDown} aria-expanded={open} aria-controls={panelId} aria-label={`Période : ${label}`} onClick={() => setOpen((shown) => !shown)} className="max-md:w-full max-md:justify-between">
        {label}
      </Button>
      {open && (
        <div id={panelId} role="group" aria-label="Choisir la période" className="absolute right-0 z-30 mt-2 w-[min(36rem,calc(100vw-2rem))] rounded-panel border border-border bg-surface p-4 shadow-overlay max-md:left-0 max-md:right-auto">
          <p className="mb-3 text-label font-semibold text-foreground">Période</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PERIODS.map((period) => {
              const pressed = !range && value === period && !custom;
              return (
                <Button
                  key={period}
                  size="compact"
                  variant={pressed ? "primary" : "secondary"}
                  aria-pressed={pressed}
                  onClick={() => {
                    setCustom(false);
                    setOpen(false);
                    onPreset(period);
                  }}
                >
                  {PERIOD_NAMES[period]}
                </Button>
              );
            })}
            <Button size="compact" icon={CalendarDays} variant={custom || range ? "primary" : "secondary"} aria-pressed={Boolean(custom || range)} aria-expanded={custom} onClick={() => setCustom((shown) => !shown)}>
              Période personnalisée
            </Button>
          </div>
          {custom && (
            <form
              className={cn("mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]")}
              onSubmit={(event) => {
                event.preventDefault();
                if (!ready) return;
                setOpen(false);
                onRange({ from, to });
              }}
            >
              <FormField label="Du" error={null}>
                <Input type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} />
              </FormField>
              <FormField label="Au" error={error}>
                <Input type="date" value={to} min={from || undefined} max={today} onChange={(event) => setTo(event.target.value)} />
              </FormField>
              <Button type="submit" variant="primary" disabled={!ready} className="max-sm:col-span-2">
                Appliquer
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
