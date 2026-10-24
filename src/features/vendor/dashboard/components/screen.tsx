"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Headset,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  PackagePlus,
  Receipt,
  ShoppingBag,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Badge, Button, Card, ErrorState, Skeleton, cn } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { DayChart } from "@/features/insights/charts";
import { PERIODS, type Compared, type PeriodKey } from "@/features/insights/contract";
import type { ReportRange } from "@/features/vendor/statistics/api";
import { ApiError } from "@/lib/http/api-error";
import { env } from "@/lib/env";
import type { DashboardBoard } from "../contract";
import { useDashboardBoard } from "../hooks";
import {
  PUBLISH_STEP_LABEL,
  ROUTES,
  STEP_DEFINITIONS,
  SUBTITLES,
  boardState,
  chartDay,
  chartDayCompact,
  currentStep,
  formatFrancs,
  formatUnits,
  orderPill,
  priorities,
  productsColumn,
  stockLeft,
  stockPill,
  storefrontUrl,
  timeAgo,
  type BoardState,
  type ChartMetric,
  type Priority,
  type PriorityKind,
} from "../model";
import { EmptyChartIllustration, StorefrontIllustration } from "./illustrations";
import { PeriodPicker } from "./period-picker";

// `/vendor/dashboard` (V9.5): what happens in the store, what waits for the
// seller, and where to act. It follows its mock-up
// (docs/captures/references/v9.5-dashboard-vendeur-planche-2.png) on
// Foundation. Every figure is the server's; a link opens the page that
// counts the same thing.

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function describeDashboardFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 422) return "Cette période n'est pas valide. Choisissez-en une autre.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Votre tableau de bord n'a pas pu être chargé. Réessayez dans un instant.";
}

function DashboardPage({ children, ...props }: { children: ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4 md:gap-5" {...props}>
      {children}
    </div>
  );
}

/** The period of the address: `?periode=30j`, or `?du=…&au=…`; 7 days by default. */
function usePeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const from = params.get("du") ?? "";
  const to = params.get("au") ?? "";
  const custom = DAY.test(from) && DAY.test(to) && from <= to ? { from, to } : null;
  const preset: PeriodKey = (PERIODS as readonly string[]).includes(params.get("periode") ?? "") ? (params.get("periode") as PeriodKey) : "7j";
  const range: ReportRange = custom ?? { period: preset };
  return {
    custom,
    preset,
    range,
    choosePreset: (period: PeriodKey) => router.replace(period === "7j" ? pathname : `${pathname}?periode=${period}`, { scroll: false }),
    chooseRange: (chosen: { from: string; to: string }) => router.replace(`${pathname}?du=${chosen.from}&au=${chosen.to}`, { scroll: false }),
  };
}

export function DashboardScreen() {
  const period = usePeriod();
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useDashboardBoard(period.range);

  if (isPending) return <DashboardLoading />;

  if (isError || !data) {
    // No figure is shown when none was read: never a zero that is not one.
    return (
      <DashboardPage>
        <header>
          <h1 className="text-page-title text-foreground">Tableau de bord</h1>
        </header>
        <Card>
          <ErrorState title="Tableau de bord indisponible" description={describeDashboardFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      </DashboardPage>
    );
  }

  const state = boardState(data);
  const shop = storefrontUrl(env.NEXT_PUBLIC_MARKETPLACE_URL, data.store);
  const tasks = priorities(data.tasks);
  const picker = (
    <PeriodPicker value={period.custom ? null : period.preset} range={period.custom} onPreset={period.choosePreset} onRange={period.chooseRange} busy={isFetching} />
  );

  return (
    <DashboardPage aria-busy={isFetching}>
      <header className="flex flex-wrap items-start justify-between gap-3" data-state={state}>
        <div className="min-w-0">
          <h1 className="text-page-title text-foreground">
            {state === "new" ? (
              "Bienvenue sur SUGU PRO !"
            ) : (
              <>
                Bonjour{data.store ? `, ${data.store.name}` : ""} <span aria-hidden="true">👋</span>
              </>
            )}
          </h1>
          <p className="mt-1 text-body text-foreground-muted">{SUBTITLES[state]}</p>
        </div>
        <div className="flex items-center gap-2 max-md:w-full">
          {state !== "new" && <div className="max-md:flex-1">{picker}</div>}
          <StorefrontButton href={shop} className={state === "new" ? undefined : "max-md:hidden"} />
        </div>
      </header>

      <div className={cn("flex flex-col gap-4 md:gap-5", isPlaceholderData && "opacity-60 transition-opacity")}>
        {(state !== "new" || tasks.length > 0) && <Priorities items={tasks} />}

        {state === "new" && <Onboarding board={data} shop={shop} />}

        <Kpis board={data} period={period} />

        {state === "new" ? <NoSalesYet /> : <SalesChart board={data} period={period} />}

        {state === "new" ? (
          <RecommendedActions shop={shop} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <RecentOrders orders={data.recentOrders} />
            {productsColumn(data) === "alerts" ? <StockAlerts items={data.stockWatch} /> : <TopProducts products={data.topProducts} />}
            <QuickActions shop={shop} />
          </div>
        )}
      </div>
    </DashboardPage>
  );
}

function StorefrontButton({ href, className }: { href: string | null; className?: string }) {
  if (!href) {
    return (
      <Button variant="outline" trailingIcon={ExternalLink} disabled title="Votre boutique sera visible sur la marketplace dès sa validation." className={className}>
        Voir ma boutique
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" trailingIcon={ExternalLink} className={className}>
      <a href={href} target="_blank" rel="noreferrer">
        Voir ma boutique<span className="sr-only"> (nouvel onglet)</span>
      </a>
    </Button>
  );
}

// ── À faire maintenant ──────────────────────────────────────

const PRIORITY_ICONS: Record<PriorityKind, LucideIcon> = { orders: ShoppingBag, stock: AlertTriangle, messages: MessageSquare, tickets: Headset };

function priorityIconClass(item: Priority): string {
  if (item.tone === "danger") return "text-danger-icon";
  if (item.kind === "messages") return "text-info-icon";
  if (item.kind === "tickets") return "text-danger-icon";
  if (item.kind === "stock") return "text-warning-icon";
  return "text-brand";
}

function Priorities({ items }: { items: Priority[] }) {
  return (
    <section aria-labelledby="dashboard-todo">
      <h2 id="dashboard-todo" className="sr-only">
        À faire maintenant
      </h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-panel border border-border bg-surface px-4 py-3 text-body text-foreground-muted">
          <CheckCircle2 className="size-5 text-success-icon" aria-hidden="true" />
          Aucune action urgente pour le moment.
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-4">
          {items.map((item) => {
            const Icon = PRIORITY_ICONS[item.kind];
            return (
              <li key={item.kind} data-kind={item.kind} data-tone={item.tone}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex h-full rounded-panel border transition-colors",
                    "max-md:min-h-12 max-md:items-center max-md:gap-3 max-md:px-3 max-md:py-2.5",
                    "md:flex-col md:gap-2 md:p-4",
                    item.tone === "danger" ? "border-danger-border bg-danger-bg hover:border-danger-icon" : "border-[#fde0cf] bg-brand-subtle hover:border-brand",
                  )}
                >
                  <Icon className={cn("size-5 shrink-0", priorityIconClass(item))} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-label font-semibold text-foreground md:text-body">{item.title}</span>
                  <span className={cn("text-meta font-medium group-hover:underline max-md:sr-only", item.tone === "danger" ? "text-danger-fg" : "text-primary-hover")}>{item.action}</span>
                  <ChevronRight className="size-4 shrink-0 text-foreground-muted md:hidden" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Key figures ─────────────────────────────────────────────

function TrendChip({ figure }: { figure: Compared }) {
  // No rate when the period before was empty: +100 % of nothing says nothing.
  if (figure.change === null) return null;
  const up = figure.change > 0;
  const flat = figure.change === 0;
  const rate = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Math.abs(figure.change));
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-0.5 rounded-pill px-1.5 text-meta font-semibold tabular-nums",
        flat ? "bg-neutral-bg text-neutral-fg" : up ? "bg-success-bg text-success-fg" : "bg-danger-bg text-danger-fg",
      )}
    >
      {/* No arrow: phones draw the arrow characters as emoji. The sign and the colour say the direction. */}
      <span className="sr-only">{flat ? "Stable" : up ? "En hausse de" : "En baisse de"} </span>
      {flat ? "0" : `${up ? "+" : "−"}${rate}`} %<span className="sr-only"> par rapport à la période précédente</span>
    </span>
  );
}

function Kpi({ href, value, label, trend, badge }: { href: string; value: string; label: string; trend?: ReactNode; badge?: number }) {
  return (
    <Link href={href} className="group relative flex min-w-0 flex-col gap-1 rounded-panel border border-border bg-surface p-3 transition-colors hover:border-border-strong md:p-4">
      <span className="text-kpi text-foreground tabular-nums">{value}</span>
      <span className="text-label text-foreground-muted group-hover:text-foreground">{label}</span>
      {trend && <span>{trend}</span>}
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-3 right-3 inline-flex size-6 items-center justify-center rounded-control bg-brand text-meta font-semibold text-white tabular-nums" aria-hidden="true">
          {formatUnits(badge)}
        </span>
      )}
    </Link>
  );
}

function statisticsHref(period: ReturnType<typeof usePeriod>): string {
  if (period.custom) return `${ROUTES.statistics}?du=${period.custom.from}&au=${period.custom.to}`;
  return `${ROUTES.statistics}?periode=${period.preset}`;
}

function Kpis({ board, period }: { board: DashboardBoard; period: ReturnType<typeof usePeriod> }) {
  const { kpis } = board;
  return (
    <section aria-label="Chiffres de la période" className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      <Kpi href={statisticsHref(period)} value={formatFrancs(kpis.revenue.value)} label="Ventes de la période" trend={<TrendChip figure={kpis.revenue} />} />
      <Kpi href={ROUTES.orders} value={formatUnits(kpis.orders.value)} label="Commandes" trend={<TrendChip figure={kpis.orders} />} />
      <Kpi href={statisticsHref(period)} value={formatUnits(kpis.unitsSold.value)} label="Produits vendus" trend={<TrendChip figure={kpis.unitsSold} />} />
      <Kpi href={ROUTES.ordersToPrepare} value={formatUnits(kpis.toPrepare)} label="À préparer" badge={kpis.toPrepare} />
    </section>
  );
}

// ── Sales ───────────────────────────────────────────────────

function Panel({ title, action, children, className, id }: { title: string; action?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <Card className={cn("flex min-w-0 flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-section-title text-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const SHORT_PERIODS: Record<PeriodKey, string> = { "7j": "7j", "30j": "30j", "90j": "90j" };

function SalesChart({ board, period }: { board: DashboardBoard; period: ReturnType<typeof usePeriod> }) {
  const [metric, setMetric] = useState<ChartMetric>("revenue");
  const days = board.period.days;
  const figure = board.kpis[metric];
  const falling = figure.change !== null && figure.change < 0;
  const name = metric === "revenue" ? "Chiffre d'affaires" : "Commandes";
  const total = metric === "revenue" ? formatFrancs(board.kpis.revenue.value) : formatUnits(board.kpis.orders.value);

  return (
    <Panel
      title="Évolution des ventes"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="dashboard-metric">
            Mesure du graphique
          </label>
          <select
            id="dashboard-metric"
            value={metric}
            onChange={(event) => setMetric(event.target.value as ChartMetric)}
            className="h-control-sm rounded-pill border border-border-strong bg-surface pr-8 pl-3 text-label text-foreground"
          >
            <option value="revenue">Chiffre d&apos;affaires</option>
            <option value="orders">Commandes</option>
          </select>
          <div role="group" aria-label="Période du graphique" className="flex gap-1">
            {PERIODS.map((key) => {
              const pressed = !period.custom && period.preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={pressed}
                  aria-label={`${key.replace("j", "")} jours`}
                  onClick={() => period.choosePreset(key)}
                  className={cn(
                    "inline-flex h-control-sm min-w-10 items-center justify-center rounded-pill border px-2.5 text-label font-medium transition-colors",
                    pressed ? "border-transparent bg-primary text-primary-foreground" : "border-border-strong bg-surface text-foreground hover:bg-surface-subtle",
                  )}
                >
                  {SHORT_PERIODS[key]}
                </button>
              );
            })}
          </div>
        </div>
      }
    >
      <DayChart
        form="line"
        tone={falling ? "danger" : "brand"}
        label={`${name} par jour`}
        summary={`${name} du ${board.period.from} au ${board.period.to} : ${total}.`}
        formatTick={(value) => formatUnits(value)}
        formatDay={(day) => chartDay(day, days)}
        formatDayCompact={(day) => chartDayCompact(day, days)}
        points={board.series.map((day) => ({
          date: day.date,
          value: metric === "revenue" ? day.revenue : day.orders,
          readout:
            metric === "revenue"
              ? [
                  { label: "Chiffre d'affaires", value: formatFrancs(day.revenue) },
                  { label: "Commandes", value: formatUnits(day.orders) },
                ]
              : [
                  { label: "Commandes", value: formatUnits(day.orders) },
                  { label: "Chiffre d'affaires", value: formatFrancs(day.revenue) },
                ],
        }))}
      />
      <p className="text-meta text-foreground-muted">Chiffre d&apos;affaires : commandes livrées, vos articles uniquement. Commandes : passées sur la période, hors annulées.</p>
    </Panel>
  );
}

function NoSalesYet() {
  return (
    <Card className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-center sm:gap-8 sm:text-left">
      <EmptyChartIllustration className="h-24 w-36 shrink-0" />
      <div className="max-w-sm">
        <h2 className="text-section-title text-foreground">Aucune vente pour le moment</h2>
        <p className="mt-1 text-body text-foreground-muted">Vos ventes apparaîtront ici dès que vous recevrez vos premières commandes.</p>
      </div>
    </Card>
  );
}

// ── Lists ───────────────────────────────────────────────────

function SeeAll({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-label font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}

function RecentOrders({ orders }: { orders: DashboardBoard["recentOrders"] }) {
  return (
    <Panel title="Commandes récentes" action={<SeeAll href={ROUTES.orders}>Voir toutes</SeeAll>}>
      {orders.length === 0 ? (
        <p className="text-body text-foreground-muted">Aucune commande pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {orders.map((order) => {
            const pill = orderPill(order.status);
            return (
              <li key={order.id}>
                <Link href={ROUTES.order(order.id)} className="group flex items-center gap-3 py-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border bg-surface-subtle text-foreground-muted">
                    <Receipt className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label font-semibold text-foreground group-hover:underline">#{order.number}</span>
                    <span className="block truncate text-meta text-foreground-muted">{order.customer ?? "Client"}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-label font-semibold text-foreground tabular-nums md:hidden">{formatFrancs(order.amount)}</span>
                    <Badge tone={pill.tone}>{pill.label}</Badge>
                    <span className="text-meta text-foreground-muted max-md:hidden">{timeAgo(order.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function TopProducts({ products }: { products: DashboardBoard["topProducts"] }) {
  return (
    <Panel title="Produits les plus vendus" action={<SeeAll href={ROUTES.statistics}>Voir tout</SeeAll>}>
      {products.length === 0 ? (
        <p className="text-body text-foreground-muted">Aucun produit livré sur cette période.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {products.map((product, index) => {
            const line = (
              <>
                <ProductThumb src={product.image} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-semibold text-foreground group-hover:underline">{product.name}</span>
                  <span className="block text-meta text-foreground-muted tabular-nums">
                    {formatUnits(product.quantity)} vente{product.quantity > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="text-label font-semibold whitespace-nowrap text-foreground tabular-nums">{formatFrancs(product.revenue)}</span>
              </>
            );
            return (
              <li key={product.productId ?? `${product.name}-${index}`}>
                {product.productId ? (
                  <Link href={ROUTES.product(product.productId)} className="group flex items-center gap-3 py-2.5">
                    {line}
                  </Link>
                ) : (
                  <span className="flex items-center gap-3 py-2.5">{line}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function StockAlerts({ items }: { items: DashboardBoard["stockWatch"] }) {
  return (
    <Panel title="Produits en alerte" action={<SeeAll href={ROUTES.outOfStock}>Voir le stock</SeeAll>}>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => {
          const pill = stockPill(item);
          return (
            <li key={item.productId}>
              <Link href={ROUTES.product(item.productId)} className="group flex items-center gap-3 py-2.5">
                <ProductThumb src={item.image} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-semibold text-foreground group-hover:underline">{item.name}</span>
                  <Badge tone={pill.tone} className="mt-1">
                    {pill.label}
                  </Badge>
                </span>
                <span className={cn("text-meta whitespace-nowrap tabular-nums md:sr-only", item.stock <= 0 ? "font-semibold text-danger-fg" : "text-foreground-muted")}>{stockLeft(item.stock)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ── Actions ─────────────────────────────────────────────────

function ActionRow({ href, icon: Icon, label, external = false }: { href: string | null; icon: LucideIcon; label: string; external?: boolean }) {
  const content = (
    <>
      <Icon className="size-4 shrink-0 text-info-icon" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {external && <ExternalLink className="size-3.5 shrink-0 text-foreground-muted" aria-hidden="true" />}
    </>
  );
  const shape = "flex min-h-10 items-center gap-3 rounded-control border border-border px-3 text-label font-medium text-foreground";
  if (!href) {
    return (
      <span className={cn(shape, "cursor-not-allowed text-foreground-muted")} title="Votre boutique sera visible sur la marketplace dès sa validation.">
        {content}
      </span>
    );
  }
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cn(shape, "transition-colors hover:border-border-strong hover:bg-surface-subtle")}>
        {content}
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cn(shape, "transition-colors hover:border-border-strong hover:bg-surface-subtle")}>
      {content}
    </Link>
  );
}

function QuickActions({ shop }: { shop: string | null }) {
  return (
    <Panel title="Actions rapides">
      <ul className="flex flex-col gap-2">
        <li><ActionRow href={ROUTES.newProduct} icon={PackagePlus} label="Ajouter un produit" /></li>
        <li><ActionRow href={ROUTES.orders} icon={ClipboardList} label="Voir toutes les commandes" /></li>
        <li><ActionRow href={ROUTES.products} icon={LayoutGrid} label="Gérer mon catalogue" /></li>
        <li><ActionRow href={ROUTES.messages} icon={MessageSquare} label="Voir les messages" /></li>
        <li><ActionRow href={ROUTES.statistics} icon={BarChart3} label="Consulter les statistiques" /></li>
        <li><ActionRow href={shop} icon={Store} label="Voir ma boutique publique" external /></li>
      </ul>
    </Panel>
  );
}

function RecommendedActions({ shop }: { shop: string | null }) {
  return (
    <Panel title="Actions recommandées">
      <ul className="grid gap-2 sm:grid-cols-2">
        <li><ActionRow href={ROUTES.newProduct} icon={PackagePlus} label="Ajouter un produit" /></li>
        <li><ActionRow href="/vendor/settings?section=delivery" icon={Truck} label="Configurer la livraison" /></li>
        <li><ActionRow href={shop} icon={Store} label="Voir ma boutique" external /></li>
        <li><ActionRow href={ROUTES.marketing} icon={Megaphone} label="Découvrir le marketing" /></li>
      </ul>
    </Panel>
  );
}

// ── First steps ─────────────────────────────────────────────

function Onboarding({ board, shop }: { board: DashboardBoard; shop: string | null }) {
  const { steps, completed, total } = board.onboarding;
  const now = currentStep(steps);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card className="flex gap-6 md:p-5">
      <div className="min-w-0 flex-1">
        <h2 className="text-section-title text-foreground">Démarrez votre boutique</h2>
        <p className="mt-0.5 text-meta text-foreground-muted">
          {completed} sur {total} étapes complétées
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-surface-subtle" role="progressbar" aria-label="Étapes complétées" aria-valuemin={0} aria-valuemax={total} aria-valuenow={completed}>
          <span className="block h-full rounded-pill bg-brand" style={{ width: `${percent}%` }} />
        </div>
        <ol className="mt-4 flex flex-col gap-2">
          {steps.map((step, index) => {
            const current = step.key === now;
            const definition = step.key === "publish" ? null : STEP_DEFINITIONS[step.key];
            const label = definition?.label ?? PUBLISH_STEP_LABEL;
            return (
              <li key={step.key} data-step={step.key} data-done={step.done || undefined} className="flex min-h-11 items-center gap-3">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-pill text-label font-semibold",
                    step.done ? "bg-success-icon text-white" : current ? "bg-brand text-white" : "border border-border-strong text-foreground-muted",
                  )}
                  aria-hidden="true"
                >
                  {step.done ? <Check className="size-4" /> : index + 1}
                </span>
                <span className={cn("min-w-0 flex-1 text-label", step.done ? "text-foreground-muted" : "text-foreground")}>
                  {label}
                  {step.done && <span className="sr-only"> (fait)</span>}
                </span>
                {step.key === "publish" ? (
                  shop ? (
                    <Button asChild size="compact" variant={current ? "primary" : "outline"}>
                      <a href={shop} target="_blank" rel="noreferrer">
                        Voir ma boutique<span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </Button>
                  ) : (
                    <Badge tone="neutral">En cours de validation</Badge>
                  )
                ) : (
                  !step.done &&
                  definition && (
                    <Button asChild size="compact" variant={current ? "primary" : "outline"}>
                      <Link href={definition.href}>{definition.action}</Link>
                    </Button>
                  )
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <StorefrontIllustration className="hidden h-36 w-44 shrink-0 self-center md:block" />
    </Card>
  );
}

// ── Loading ─────────────────────────────────────────────────

export function DashboardLoading() {
  return (
    <DashboardPage aria-busy>
      <span className="sr-only" role="status">
        Chargement du tableau de bord…
      </span>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-40 rounded-pill max-md:hidden" />
      </div>
      <div className="grid gap-2 md:grid-cols-4 md:gap-3">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-12 rounded-panel md:h-28" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-panel" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-panel" />
      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-80 rounded-panel" />
        ))}
      </div>
    </DashboardPage>
  );
}

export type { BoardState };
