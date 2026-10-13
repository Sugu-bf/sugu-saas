"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Receipt } from "lucide-react";
import { Alert, Button, Card, Input, Pagination, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ToolbarSearch } from "@/design-system";
import type { FinanceProfile } from "../api";
import { ENTRY_KINDS, type EntryKind, type WalletEntry } from "../contract";
import { useEntries, useFinanceScope } from "../hooks";
import { FINANCE_SPACES, financePaths } from "../spaces";
import { describeFinanceFailure, isForbidden, kindWording } from "../wording";
import { EntrySheet, FinanceHeader, FinancePage, OperationList, useReturnFocus } from "./bits";

// Every movement of the wallet, after its mock-up: the kinds as pills, a
// search, the days, and pages. Counters, search, days and pages are the
// server's: nothing is filtered or added up in the browser.

export const ENTRY_PAGE_SIZES = [20, 50, 100] as const;

/** The kinds in the address, in French: `?type=ventes`. */
const KIND_PARAM: Record<EntryKind, string> = {
  sale: "ventes",
  delivery: "livraisons",
  withdrawal: "retraits",
  withdrawal_released: "retraits-annules",
  dispute: "litiges",
  adjustment: "ajustements",
};
const kindOf = (param: string | null): EntryKind | undefined => ENTRY_KINDS.find((kind) => KIND_PARAM[kind] === param);
const isDay = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function FinanceHistory({ profile }: { profile: FinanceProfile }) {
  const space = FINANCE_SPACES[profile];
  const paths = financePaths(space);
  const scope = useFinanceScope(profile);

  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const requested = kindOf(params.get("type"));
  const kind = requested && space.kinds.includes(requested) ? requested : undefined;
  const search = params.get("q") ?? "";
  const from = isDay(params.get("du")) ? params.get("du")! : "";
  const to = isDay(params.get("au")) ? params.get("au")! : "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = ENTRY_PAGE_SIZES.find((size) => size === Number(params.get("lignes"))) ?? ENTRY_PAGE_SIZES[0];

  const [typed, setTyped] = useState(search);
  const [opened, setOpened] = useState<WalletEntry | null>(null);
  const focus = useReturnFocus();
  const open = (entry: WalletEntry) => {
    focus.remember();
    setOpened(entry);
  };
  const close = () => {
    setOpened(null);
    focus.restore();
  };

  const update = (changes: Record<string, string | null>) => {
    // Read from the address itself: a change asked while another is still on its way starts from it.
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (typed.trim() === search) return;
    const timer = window.setTimeout(() => update({ q: typed.trim() || null, page: null }), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` reads the current address each time it runs.
  }, [typed, search]);

  // A range whose end is before its start is not asked of the server: it would refuse it.
  const rangeError = from && to && to < from ? "La date de fin est avant la date de début." : null;
  const { data, isError, error, refetch, isFetching } = useEntries(scope, { kind, search, from: rangeError ? undefined : from, to: rangeError ? undefined : to, page, pageSize });

  const filters = [search, from, to].filter(Boolean).length;
  const reset = () => {
    setTyped("");
    update({ q: null, du: null, au: null, page: null });
  };

  // The pills offered: the kinds of this profile that hold something, and the one in use.
  const shown = space.kinds.filter((entry) => entry === kind || (data?.counts[entry] ?? 0) > 0 || entry === space.kinds[0] || entry === "withdrawal");

  if (isError && !data && isForbidden(error)) {
    return (
      <FinancePage>
        <FinanceHeader title={space.historyTitle} back={{ label: `Retour : ${space.title}`, href: paths.overview }} />
        <Alert tone="warning" title="Accès réservé">
          {describeFinanceFailure(error).message}
        </Alert>
      </FinancePage>
    );
  }

  return (
    <FinancePage>
      <FinanceHeader
        title={space.historyTitle}
        back={{ label: `Retour : ${space.title}`, href: paths.overview }}
        actions={
          <Button asChild variant="secondary" size="compact" icon={ListChecks}>
            <Link href={paths.withdrawals}>Mes retraits</Link>
          </Button>
        }
      />

      <Tabs value={kind ?? "all"} onValueChange={(value) => update({ type: value === "all" ? null : KIND_PARAM[value as EntryKind], page: null })}>
        <TabsList label="Opérations par type" variant="pills">
          <TabsTrigger value="all" count={data?.counts.all}>
            Toutes
          </TabsTrigger>
          {shown.map((entry) => (
            <TabsTrigger key={entry} value={entry} count={data?.counts[entry]}>
              {kindWording(entry, profile).filter}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={kind ?? "all"} className="mt-4 flex flex-col gap-4">
          <Toolbar
            search={<ToolbarSearch value={typed} onValueChange={setTyped} onSubmit={(value) => update({ q: value.trim() || null, page: null })} label="Rechercher une opération par numéro de commande" />}
            activeFilterCount={[from, to].filter(Boolean).length}
            onResetFilters={reset}
            filters={
              <>
                <DayFilter label="Du" value={from} max={to || undefined} onValueChange={(value) => update({ du: value || null, page: null })} />
                <DayFilter label="Au" value={to} min={from || undefined} onValueChange={(value) => update({ au: value || null, page: null })} />
              </>
            }
            countAction={
              filters > 0 ? (
                <Button variant="quiet" size="compact" onClick={reset}>
                  Tout afficher
                </Button>
              ) : undefined
            }
          />

          {rangeError && <Alert tone="warning" title={rangeError} />}

          <Card className="py-1" aria-busy={isFetching || undefined}>
            <OperationList
              label={space.historyTitle}
              detailed
              entries={data?.rows ?? []}
              profile={profile}
              onOpen={open}
              load={{ loading: !data && !isError, failed: isError && !data, errorMessage: describeFinanceFailure(error).message, onRetry: () => refetch() }}
              empty={{
                icon: Receipt,
                title: filters > 0 || kind ? "Aucune opération ne correspond" : "Aucune opération",
                description: filters > 0 || kind ? "Modifiez la recherche, les dates ou le type." : "Vos ventes, vos gains et vos retraits apparaîtront ici.",
              }}
            />
          </Card>

          {data && data.total > 0 && (
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              disabled={isFetching}
              onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              variant="numbered"
              pageSizeOptions={[...ENTRY_PAGE_SIZES]}
              onPageSizeChange={(size) => update({ lignes: size === ENTRY_PAGE_SIZES[0] ? null : String(size), page: null })}
              itemLabel="opérations"
            />
          )}
        </TabsContent>
      </Tabs>

      <EntrySheet entry={opened} profile={profile} onClose={close} />
    </FinancePage>
  );
}

/** A day of the range, laid out as a filter of the toolbar: its label beside it on the row, above it in the « Filtres » panel. */
export function DayFilter({ label, value, min, max, onValueChange }: { label: string; value: string; min?: string; max?: string; onValueChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1 group-data-[inline]/filters:flex-row group-data-[inline]/filters:items-center group-data-[inline]/filters:gap-2">
      <label htmlFor={id} className="text-label whitespace-nowrap text-foreground-muted">
        {label}
      </label>
      <Input id={id} type="date" value={value} min={min} max={max} onChange={(event) => onValueChange(event.target.value)} className="text-label group-data-[inline]/filters:w-40" />
    </div>
  );
}
