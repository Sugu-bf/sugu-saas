"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Alert, Button, DataTable, Input, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ToolbarSearch, formatMoneyFromCents, type DataTableColumn } from "@/design-system";
import { formatDay, formatDayTime } from "@/features/agency/format";
import { DriverPage, ScreenHeader } from "@/features/driver/components/frame";
import { describeDriverFailure } from "@/features/driver/errors";
import { HISTORY_PAGE_SIZES, fetchHistory, type HistoryQuery, type HistoryRow, type HistoryStatus } from "@/features/driver/history/contract";
import { queryKeys } from "@/lib/query";

// The missions that are over, after their mock-up: a table on a desk, cards
// on a phone. Counters, search, days and pages are the server's.

const STATUS_PARAM: Record<HistoryStatus, string> = { delivered: "terminees", failed: "echecs" };
const statusOf = (param: string | null): HistoryStatus | undefined => (Object.keys(STATUS_PARAM) as HistoryStatus[]).find((status) => STATUS_PARAM[status] === param);
const isDay = (value: string | null): value is string => value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

function useHistory(query: HistoryQuery) {
  return useQuery({ queryKey: [...queryKeys.driver.all, "portal", "history", query], queryFn: () => fetchHistory(query), staleTime: 30_000, placeholderData: keepPreviousData });
}

const openLabel = (row: HistoryRow) => `Voir la mission ${row.reference ?? ""}`.trim();

const columns: DataTableColumn<HistoryRow>[] = [
  {
    id: "reference",
    header: "Référence",
    mobile: "title",
    cell: (row) => <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">{row.reference ?? "—"}</span>,
  },
  {
    id: "date",
    header: "Date",
    mobile: "subtitle",
    cell: (row) => <span className="whitespace-nowrap text-foreground-muted tabular-nums">{formatDay(row.finishedAt)}</span>,
    mobileCell: (row) => formatDayTime(row.finishedAt),
  },
  {
    id: "client",
    header: "Client",
    cell: (row) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-foreground">{row.client ?? "Client non renseigné"}</span>
        {row.failReason && <span className="truncate text-meta text-danger-fg">{row.failReason}</span>}
      </span>
    ),
  },
  { id: "status", header: "Statut", mobile: "badge", cell: (row) => <StatusBadge domain="courierMission" code={row.status} /> },
  {
    id: "amount",
    header: "Montant encaissé",
    numeric: true,
    // Cash taken at the door. A mission paid online or in failure took none: said, not written as zero francs.
    cell: (row) => (row.cashCollected > 0 ? formatMoneyFromCents(row.cashCollected) : <span className="text-foreground-muted">Rien à encaisser</span>),
  },
];

export function HistoryContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const status = statusOf(params.get("statut"));
  const search = params.get("q") ?? "";
  const from = isDay(params.get("du")) ? params.get("du")! : "";
  const to = isDay(params.get("au")) ? params.get("au")! : "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = HISTORY_PAGE_SIZES.find((size) => size === Number(params.get("lignes"))) ?? HISTORY_PAGE_SIZES[0];

  const [typed, setTyped] = useState(search);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
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
  const { data, isLoading, isError, error, refetch, isFetching } = useHistory({ status, search, from: rangeError ? undefined : from, to: rangeError ? undefined : to, page, pageSize });

  const filters = [search, from, to].filter(Boolean).length;
  const reset = () => {
    setTyped("");
    update({ q: null, du: null, au: null, page: null });
  };

  return (
    <DriverPage wide>
      <ScreenHeader title="Historique des missions" count={data ? `(${data.counts.all.toLocaleString("fr-FR")} mission${data.counts.all > 1 ? "s" : ""})` : undefined} back={{ label: "Retour à l'accueil", href: "/driver/dashboard" }} />

      <Tabs value={status ?? "all"} onValueChange={(value) => update({ statut: value === "all" ? null : STATUS_PARAM[value as HistoryStatus], page: null })}>
        <TabsList label="Missions par résultat" variant="pills">
          <TabsTrigger value="all" count={data?.counts.all}>
            Toutes
          </TabsTrigger>
          <TabsTrigger value="delivered" tone="success" count={data?.counts.delivered}>
            Terminées
          </TabsTrigger>
          <TabsTrigger value="failed" tone="danger" count={data?.counts.failed}>
            Échecs
          </TabsTrigger>
        </TabsList>

        <TabsContent value={status ?? "all"} className="mt-4 flex flex-col gap-4">
      <Toolbar
        search={<ToolbarSearch value={typed} onValueChange={setTyped} onSubmit={(value) => update({ q: value.trim() || null, page: null })} label="Rechercher par référence, client ou adresse" />}
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

      <DataTable
        caption="Missions terminées"
        columns={columns}
        rows={data?.rows ?? []}
        getRowId={(row) => row.id}
        state={isLoading ? "loading" : isError && !data ? "error" : "ready"}
        refreshing={isFetching && !isLoading}
        error={{ description: describeDriverFailure(error).message, onRetry: () => refetch() }}
        empty={{
          icon: History,
          title: filters > 0 || status ? "Aucune mission ne correspond" : "Aucune mission terminée",
          description: filters > 0 || status ? "Modifiez la recherche, les dates ou le filtre." : "Vos missions livrées ou en échec apparaîtront ici.",
        }}
        rowActionsLabel="Actions"
        mobileRowActions="footer"
        rowActions={(row) => (
          <Button asChild variant="secondary" size="compact" aria-label={openLabel(row)}>
            <Link href={`/driver/deliveries/${row.id}`}>Voir</Link>
          </Button>
        )}
        pagination={{
          page: data?.page ?? page,
          pageSize: data?.pageSize ?? pageSize,
          total: data?.total ?? 0,
          onPageChange: (next) => update({ page: next > 1 ? String(next) : null }),
          variant: "numbered",
          pageSizeOptions: [...HISTORY_PAGE_SIZES],
          onPageSizeChange: (size) => update({ lignes: size === HISTORY_PAGE_SIZES[0] ? null : String(size), page: null }),
          itemLabel: "missions",
        }}
      />
        </TabsContent>
      </Tabs>
    </DriverPage>
  );
}

/** A day of the range, laid out as a filter of the toolbar: its label beside it on the row, above it in the « Filtres » panel. */
function DayFilter({ label, value, min, max, onValueChange }: { label: string; value: string; min?: string; max?: string; onValueChange: (value: string) => void }) {
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
