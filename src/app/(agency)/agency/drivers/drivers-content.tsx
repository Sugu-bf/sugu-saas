"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Bike,
  BellRing,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CirclePause,
  CirclePlay,
  Coffee,
  Download,
  Eye,
  FileWarning,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  TrendingDown,
  Truck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  IconButton,
  Money,
  PageHeader,
  Skeleton,
  Stat,
  StatusBadge,
  Toolbar,
  ToolbarFilter,
  ToolbarSearch,
  cn,
  courierActivity,
  type DataTableColumn,
  type SortState,
  type Tone,
} from "@/design-system";
import { loadStateOf } from "@/lib/query/load-state";
import { replaceUrlQuery } from "@/lib/utils/replace-url-query";
import { CourierActionDialogs, courierAbilities, type CourierIntent } from "@/features/agency/components/courier-actions";
import { CourierCell, SuccessRate } from "@/features/agency/components/courier-bits";
import { InvitationCode } from "@/features/agency/components/invitation-code";
import { AgencyPage, KpiRow } from "@/features/agency/components/page";
import { Panel } from "@/features/agency/components/panel";
import { exportCouriersCsv, COURIER_PAGE_SIZE } from "@/features/agency/couriers/api";
import { COURIER_ACTIVITIES, documentLabel, type Courier, type CourierActivity, type CourierAlerts, type CourierOverview } from "@/features/agency/couriers/contract";
import { useCouriers } from "@/features/agency/couriers/hooks";
import { describeAgencyFailure } from "@/features/agency/errors";
import { formatCount, formatRate, relativeTime, telHref, whatsappHref } from "@/features/agency/format";
import { useAgencyId } from "@/features/agency/session";
import { CLEARED_FILTERS, filtersOf, isNarrowed, readListState, writeListState, type ListState } from "./list-state";

// ── What the page offers ────────────────────────────────────

/** The groups counted above the list. Each figure is the size of the list its card filters. */
const GROUPS: { activity: CourierActivity; count: keyof CourierOverview; label: string; hint: string; icon: LucideIcon }[] = [
  { activity: "on_delivery", count: "onDelivery", label: "En livraison", hint: "Actuellement sur le terrain", icon: Truck },
  { activity: "available", count: "available", label: "Disponibles", hint: "En attente de courses", icon: CircleCheck },
  { activity: "paused", count: "paused", label: "En pause", hint: "Temporairement indisponibles", icon: Coffee },
  { activity: "to_verify", count: "toVerify", label: "À vérifier", hint: "Pièces à contrôler", icon: CircleAlert },
];

const ACTIVITY_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  ...COURIER_ACTIVITIES.map((code) => ({ value: code as string, label: courierActivity.resolve(code).label })),
];

// ── Rows ────────────────────────────────────────────────────

/** A heading of two words on two lines, over a column of figures. */
const TWO_LINES = "@2xl:[&:is(th)]:w-20 @2xl:[&:is(th)]:leading-tight @2xl:[&:is(th)]:whitespace-normal";

const COLUMNS: DataTableColumn<Courier>[] = [
  {
    id: "name",
    header: "Livreur",
    sortable: true,
    mobile: "title",
    className: "@2xl:max-w-44",
    cell: (courier) => <CourierCell courier={courier} />,
    mobileCell: (courier) => <CourierCell courier={courier} wrap />,
  },
  {
    id: "phone",
    header: "Téléphone",
    className: "whitespace-nowrap",
    cell: (courier) =>
      courier.phone ? (
        <a href={telHref(courier.phone)} className="rounded-compact tabular-nums underline-offset-2 hover:underline">
          {courier.phone}
        </a>
      ) : (
        <span className="text-foreground-muted">—</span>
      ),
  },
  { id: "activity", header: "Statut", mobile: "badge", cell: (courier) => <StatusBadge domain="courierActivity" code={courier.activity} /> },
  {
    id: "quartier",
    header: "Zone",
    className: "@2xl:max-w-24",
    cell: (courier) => (courier.quartier ? <span className="block truncate">{courier.quartier}</span> : <span className="text-foreground-muted">—</span>),
    mobileCell: (courier) => courier.quartier,
  },
  // Two-line headings, as narrow as the figures under them.
  { id: "today", header: "Livraisons aujourd'hui", numeric: true, className: TWO_LINES, cell: (courier) => formatCount(courier.deliveriesToday) },
  { id: "rate", header: "Taux de réussite", className: cn(TWO_LINES, "@2xl:[&:is(th)]:w-16"), cell: (courier) => <SuccessRate rate={courier.successRate} /> },
  { id: "revenue", header: "Gains du jour", numeric: true, mobile: "detail", className: TWO_LINES, cell: (courier) => <Money francs={courier.revenueTodayFrancs} /> },
  {
    id: "last",
    header: "Dernière activité",
    mobile: "detail",
    // Left out while the list is narrower than 880px (a 1440px screen with the menu open): it is on the page of the courier.
    className: cn(TWO_LINES, "whitespace-nowrap @2xl:hidden @[55rem]:table-cell"),
    cell: (courier) => relativeTime(courier.lastActivityAt) ?? <span className="text-foreground-muted">—</span>,
    mobileCell: (courier) => relativeTime(courier.lastActivityAt),
  },
];

// ── Alerts ──────────────────────────────────────────────────

/** The document types, in a word: an alert names the courier first. */
const SHORT_DOCUMENT: Record<string, string> = { id_card: "Identité", driver_license: "Permis", vehicle_registration: "Carte grise", insurance: "Assurance" };

function AlertGroup({ title, icon: Icon, total, shown, children }: { title: string; icon: LucideIcon; total: number; shown: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="flex items-center gap-2 text-body font-semibold text-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        {title}
        <span className="ml-auto text-meta font-normal text-foreground-muted tabular-nums">{formatCount(total)}</span>
      </h3>
      {total === 0 ? (
        <p className="text-meta text-foreground-muted">Rien à signaler.</p>
      ) : (
        <ul className="flex flex-col">{children}</ul>
      )}
      {total > shown && <p className="text-meta text-foreground-muted">et {formatCount(total - shown)} autre{total - shown > 1 ? "s" : ""}.</p>}
    </section>
  );
}

function AlertRow({ courierId, name, employeeId, badge, tone, detail }: { courierId: string; name: string; employeeId: string | null; badge: string; tone: Tone; detail: string }) {
  return (
    <li>
      <Link href={`/agency/drivers/${courierId}`} className="group -mx-2 flex items-center gap-2.5 rounded-control px-2 py-2 hover:bg-surface-subtle">
        <Avatar name={name} size="md" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* The name is never cut: the badge goes under it when the two do not fit a line. */}
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-body font-medium text-foreground">{name}</span>
            <Badge tone={tone}>{badge}</Badge>
          </span>
          <span className="text-meta text-foreground-muted">{[employeeId, detail].filter(Boolean).join(" · ")}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
      </Link>
    </li>
  );
}

/** "Expire dans 3 jours", "Expiré depuis 2 jours", "Expire aujourd'hui". */
function expiry(daysLeft: number): string {
  if (daysLeft === 0) return "Expire aujourd'hui";
  const days = Math.abs(daysLeft);
  return daysLeft > 0 ? `Expire dans ${days} jour${days > 1 ? "s" : ""}` : `Expiré depuis ${days} jour${days > 1 ? "s" : ""}`;
}

function CourierAlertsPanel({ alerts, loading, failed }: { alerts: CourierAlerts | null; loading: boolean; failed: boolean }) {
  const total = alerts ? alerts.documents.total + alerts.lowPerformance.total + alerts.inactive.total : 0;
  return (
    <Panel title="Alertes et suivi" icon={BellRing} tone="warning" actions={alerts && <Badge tone={total > 0 ? "warning" : "neutral"}>{formatCount(total)}</Badge>}>
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : failed ? (
        <p className="text-body text-foreground-muted">Les alertes n&apos;ont pas pu être chargées.</p>
      ) : !alerts ? (
        <p className="text-body text-foreground-muted">Les alertes sont réservées au responsable de l&apos;agence.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <AlertGroup title="Documents à renouveler" icon={FileWarning} total={alerts.documents.total} shown={alerts.documents.items.length}>
            {alerts.documents.items.map((entry) => (
              <AlertRow
                key={`${entry.courierId}-${entry.documentType}`}
                courierId={entry.courierId}
                name={entry.name}
                employeeId={entry.employeeId}
                badge={SHORT_DOCUMENT[entry.documentType] ?? documentLabel(entry.documentType)}
                tone={entry.daysLeft < 0 ? "danger" : "warning"}
                detail={expiry(entry.daysLeft)}
              />
            ))}
          </AlertGroup>
          <AlertGroup title="Performance faible" icon={TrendingDown} total={alerts.lowPerformance.total} shown={alerts.lowPerformance.items.length}>
            {alerts.lowPerformance.items.map((entry) => (
              <AlertRow
                key={entry.courierId}
                courierId={entry.courierId}
                name={entry.name}
                employeeId={entry.employeeId}
                badge={formatRate(entry.successRate)}
                tone="danger"
                detail={`Taux de réussite bas sur ${formatCount(entry.totalDeliveries)} livraisons`}
              />
            ))}
          </AlertGroup>
          <AlertGroup title="Inactifs récemment" icon={UserX} total={alerts.inactive.total} shown={alerts.inactive.items.length}>
            {alerts.inactive.items.map((entry) => (
              <AlertRow
                key={entry.courierId}
                courierId={entry.courierId}
                name={entry.name}
                employeeId={entry.employeeId}
                badge="Sans livraison"
                tone="neutral"
                detail={`Depuis ${formatCount(entry.days)} jour${entry.days > 1 ? "s" : ""}`}
              />
            ))}
          </AlertGroup>
        </div>
      )}
    </Panel>
  );
}

// ── Page ────────────────────────────────────────────────────

export function DriversContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const agencyId = useAgencyId();

  // The list state lives here and is mirrored in the URL, as on the deliveries list.
  const [state, setListState] = useState<ListState>(() => readListState(searchParams));
  const setState = useCallback((patch: Partial<ListState>) => {
    setListState((current) => ({ ...current, page: 1, ...patch }));
  }, []);

  const query = writeListState(state).toString();
  const urlQuery = writeListState(readListState(searchParams)).toString();
  const writtenQuery = useRef(urlQuery);

  useEffect(() => {
    if (query === writtenQuery.current) return;
    writtenQuery.current = query;
    replaceUrlQuery(pathname, query);
  }, [pathname, query]);

  useEffect(() => {
    if (urlQuery === writtenQuery.current) return;
    writtenQuery.current = urlQuery;
    setListState(readListState(new URLSearchParams(urlQuery)));
  }, [urlQuery]);

  const [searchInput, setSearchInput] = useState(state.search);
  useEffect(() => setSearchInput(state.search), [state.search]);

  const filters = useMemo(() => filtersOf(state), [state]);
  const couriers = useCouriers({ ...filters, page: state.page, pageSize: COURIER_PAGE_SIZE });

  const [intent, setIntent] = useState<CourierIntent | null>(null);
  const [exporting, setExporting] = useState(false);

  const page = couriers.data;
  const loadState = loadStateOf(couriers);
  const overview = page?.overview ?? null;
  const narrowed = isNarrowed(state);
  const clearFilters = () => setState({ ...CLEARED_FILTERS });

  const quartierOptions = useMemo(
    () => [{ value: "", label: "Toutes les zones" }, ...(page?.quartiers ?? []).map((entry) => ({ value: entry.name, label: `${entry.name} (${entry.count})` }))],
    [page?.quartiers],
  );

  async function runExport() {
    if (!agencyId) return;
    setExporting(true);
    try {
      await exportCouriersCsv(agencyId, filters);
      toast.success("Export des livreurs téléchargé.");
    } catch (error) {
      toast.error(`Export impossible. ${describeAgencyFailure(error).message}`);
    } finally {
      setExporting(false);
    }
  }

  const sort: SortState | null = state.sort === "name" ? { columnId: "name", direction: state.direction } : null;

  return (
    <AgencyPage>
      <PageHeader
        title="Livreurs"
        description="Pilotez votre flotte, suivez la disponibilité et la performance."
        hideDescriptionOnPhone
        primaryAction={{ label: "Nouveau livreur", icon: UserPlus, href: "/agency/drivers/new" }}
      />

      <KpiRow label="Livreurs par situation">
        <Stat
          layout="figure"
          label="Actifs"
          icon={Users}
          value={overview ? formatCount(overview.active) : "—"}
          hint={overview ? `Sur ${formatCount(overview.total)} livreur${overview.total > 1 ? "s" : ""}` : undefined}
          loading={loadState === "loading"}
        />
        {GROUPS.map((group) => (
          <Stat
            layout="figure"
            key={group.activity}
            label={group.label}
            icon={group.icon}
            value={overview ? formatCount(overview[group.count]) : "—"}
            hint={group.hint}
            loading={loadState === "loading"}
            pressed={state.activity === group.activity}
            onSelect={() => setState({ activity: state.activity === group.activity ? "" : group.activity })}
          />
        ))}
      </KpiRow>

      <Toolbar
        className="rounded-panel border border-border bg-surface p-3"
        search={
          <ToolbarSearch label="Nom, téléphone ou matricule" value={searchInput} onValueChange={setSearchInput} onSubmit={(value) => setState({ search: value.trim() })} />
        }
        filters={
          <>
            <ToolbarFilter
              label="Statut"
              hideLabelInline
              value={state.activity}
              onValueChange={(value) => setState({ activity: value as CourierActivity | "" })}
              options={ACTIVITY_OPTIONS}
            />
            {quartierOptions.length > 1 && (
              <ToolbarFilter label="Zone" hideLabelInline value={state.quartier} onValueChange={(value) => setState({ quartier: value })} options={quartierOptions} />
            )}
          </>
        }
        activeFilterCount={(state.activity ? 1 : 0) + (state.quartier ? 1 : 0)}
        onResetFilters={clearFilters}
        actions={
          <Button icon={Download} loading={exporting} disabled={!agencyId} onClick={runExport}>
            Exporter
          </Button>
        }
        countAction={
          narrowed ? (
            <Button variant="quiet" size="compact" icon={X} onClick={clearFilters}>
              Tout afficher
            </Button>
          ) : undefined
        }
        count={
          narrowed ? (
            <p className="text-meta text-foreground-muted" aria-live="polite">
              La liste est filtrée.
            </p>
          ) : undefined
        }
      />

      {/* The alerts sit beside the list once the page itself is 1104px wide (a 1440px screen, or 1280px with the menu folded); under that, below it. */}
      <div className="@container/couriers">
        <div className="grid items-start gap-4 @[69rem]/couriers:grid-cols-[minmax(0,1fr)_16.5rem]">
        <DataTable
          caption="Livreurs"
          header={{
            title: (
              <span className="inline-flex items-center gap-2">
                Liste des livreurs
                {page && <Badge tone="neutral">{formatCount(page.total)}</Badge>}
              </span>
            ),
          }}
          columns={COLUMNS}
          rows={page?.rows ?? []}
          getRowId={(courier) => courier.id}
          state={loadState}
          refreshing={couriers.isFetching && loadState === "ready"}
          error={{
            title: "Les livreurs n'ont pas pu être chargés",
            description: describeAgencyFailure(couriers.error).message,
            onRetry: () => couriers.refetch(),
            retrying: couriers.isFetching,
          }}
          empty={
            narrowed
              ? {
                  title: "Aucun livreur ne correspond",
                  description: "Modifiez la recherche ou les filtres pour élargir les résultats.",
                  action: (
                    <Button icon={X} onClick={clearFilters}>
                      Tout afficher
                    </Button>
                  ),
                }
              : {
                  icon: Bike,
                  title: "Aucun livreur pour le moment",
                  description: "Ajoutez vos livreurs, ou partagez votre code de recrutement pour qu'ils s'inscrivent eux-mêmes.",
                  action: (
                    <Button asChild variant="primary" icon={UserPlus}>
                      <Link href="/agency/drivers/new">Nouveau livreur</Link>
                    </Button>
                  ),
                }
          }
          sort={sort}
          onSortChange={(next) => setState({ sort: "name", direction: next.direction })}
          density="compact"
          rowActionsLabel="Actions"
          rowActions={(courier) => {
            const can = courierAbilities(courier);
            return (
              <>
                {/* The name of the row opens his page: an icon that did the same took the room his name needs to be read in full. */}
                {can.assign ? (
                  <IconButton icon={Send} label={`Confier une course à ${courier.name}`} onClick={() => setIntent({ kind: "assign", courier })} />
                ) : (
                  // Keeps the menus of the rows under one another, in the table as in the cards.
                  <span className="w-control shrink-0 touch:w-touch" aria-hidden="true" />
                )}
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Autres actions pour ${courier.name}`} />}>
                  <DropdownMenuItem icon={Eye} onSelect={() => router.push(`/agency/drivers/${courier.id}`)}>
                    Ouvrir la fiche
                  </DropdownMenuItem>
                  {courier.phone && (
                    <DropdownMenuItem asChild>
                      <a href={telHref(courier.phone)}>
                        <Phone className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">Appeler</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  {courier.phone && (
                    <DropdownMenuItem asChild>
                      <a href={whatsappHref(courier.phone)} target="_blank" rel="noreferrer">
                        <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">WhatsApp</span>
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem icon={Pencil} onSelect={() => router.push(`/agency/drivers/${courier.id}/edit`)}>
                    Modifier la fiche
                  </DropdownMenuItem>
                  {can.verify && (
                    <DropdownMenuItem icon={ShieldCheck} onSelect={() => router.push(`/agency/drivers/${courier.id}#pieces`)}>
                      Vérifier les pièces
                    </DropdownMenuItem>
                  )}
                  {(can.pause || can.resume || can.suspend || can.activate) && <DropdownMenuSeparator />}
                  {can.pause && (
                    <DropdownMenuItem icon={CirclePause} onSelect={() => setIntent({ kind: "pause", courier })}>
                      Mettre en pause
                    </DropdownMenuItem>
                  )}
                  {can.resume && (
                    <DropdownMenuItem icon={CirclePlay} onSelect={() => setIntent({ kind: "resume", courier })}>
                      Reprendre l&apos;activité
                    </DropdownMenuItem>
                  )}
                  {can.activate && (
                    <DropdownMenuItem icon={UserCheck} onSelect={() => setIntent({ kind: "activate", courier })}>
                      Réactiver le compte
                    </DropdownMenuItem>
                  )}
                  {can.suspend && (
                    <DropdownMenuItem icon={Ban} tone="danger" onSelect={() => setIntent({ kind: "suspend", courier })}>
                      Suspendre le compte
                    </DropdownMenuItem>
                  )}
                </DropdownMenu>
              </>
            );
          }}
          pagination={{
            page: state.page,
            pageSize: COURIER_PAGE_SIZE,
            total: page?.total ?? 0,
            onPageChange: (next) => setState({ page: next }),
            itemLabel: "livreurs",
            variant: "numbered",
          }}
        />

        <aside aria-label="Alertes et recrutement" className="grid min-w-0 items-start gap-4 md:grid-cols-2 @[69rem]/couriers:grid-cols-1">
          <CourierAlertsPanel alerts={page?.alerts ?? null} loading={loadState === "loading"} failed={loadState === "error"} />
          <InvitationCode />
        </aside>
        </div>
      </div>

      <CourierActionDialogs intent={intent} onClose={() => setIntent(null)} />
    </AgencyPage>
  );
}
