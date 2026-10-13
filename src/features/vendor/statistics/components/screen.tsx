"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, ChartNoAxesCombined, ShoppingBag, ShoppingCart, UserPlus, Wallet } from "lucide-react";
import { Card, EmptyState, ErrorState, PageHeader, Skeleton, asFrancs, formatMoneyFromFrancs } from "@/design-system";
import { ProductThumb } from "@/features/vendor/catalog/components/product-bits";
import { Amount, Figure, KpiGrid } from "@/features/vendor/clients/components/bits";
import { Panel, PeriodControl, RankedBar, Trend } from "@/features/insights/bits";
import { DayChart, RANKED_SHADES, ShareRing, periodLabel } from "@/features/insights/charts";
import { PERIODS, type PeriodKey } from "@/features/insights/contract";
import { ApiError } from "@/lib/http/api-error";
import type { ReportRange } from "../api";
import { useSalesReport } from "../hooks";

const UNITS = new Intl.NumberFormat("fr-FR");
const units = (value: number) => UNITS.format(value);
const francs = (value: number) => formatMoneyFromFrancs(asFrancs(value));
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function describeFailure(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "La connexion a été interrompue. Vérifiez votre réseau, puis réessayez.";
    if (error.status === 422) return "Cette période n'est pas valide. Choisissez-en une autre.";
    if (error.status === 429) return "Trop de demandes en peu de temps. Patientez une minute, puis réessayez.";
  }
  return "Vos statistiques n'ont pas pu être chargées. Réessayez dans un instant.";
}

function StatisticsPage({ children, ...props }: { children: React.ReactNode; "aria-busy"?: boolean }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" {...props}>
      {children}
    </div>
  );
}

/**
 * `/vendor/statistics`: the sales of the store over the period of the
 * address (`?periode=7j`, or `?du=…&au=…`). Every figure is the server's,
 * for that period; a figure it does not measure is not shown.
 */
export function StatisticsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("du") ?? "";
  const to = params.get("au") ?? "";
  const custom = DAY.test(from) && DAY.test(to) && from <= to ? { from, to } : null;
  const preset: PeriodKey = (PERIODS as readonly string[]).includes(params.get("periode") ?? "") ? (params.get("periode") as PeriodKey) : "30j";
  const range: ReportRange = custom ?? { period: preset };

  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useSalesReport(range);

  const control = (
    <PeriodControl
      value={custom ? null : preset}
      range={custom}
      busy={isFetching}
      onPreset={(period) => router.replace(period === "30j" ? pathname : `${pathname}?periode=${period}`, { scroll: false })}
      onRange={(chosen) => router.replace(`${pathname}?du=${chosen.from}&au=${chosen.to}`, { scroll: false })}
    />
  );

  // The header keeps the period beside the title on a wide screen; on a phone it comes under it.
  const header = (
    <>
      <PageHeader title="Statistiques" description="Analysez les performances de votre boutique" meta={control} />
      <div className="md:hidden">{control}</div>
    </>
  );

  if (isPending) {
    return (
      <StatisticsPage aria-busy>
        {header}
        <KpiGrid label="Chiffres de la période">
          {["Commandes", "Chiffre d'affaires", "Nouveaux clients", "Panier moyen"].map((label) => (
            <Figure key={label} icon={BarChart3} label={label} value={undefined} loading />
          ))}
        </KpiGrid>
        <Skeleton className="h-72 w-full rounded-panel" />
        <span className="sr-only" role="status">
          Chargement des statistiques…
        </span>
      </StatisticsPage>
    );
  }

  if (isError || !data) {
    return (
      <StatisticsPage>
        {header}
        <Card>
          <ErrorState title="Statistiques indisponibles" description={describeFailure(error)} onRetry={() => refetch()} retrying={isFetching} />
        </Card>
      </StatisticsPage>
    );
  }

  const { period, kpis, series, topProducts, categories, cities } = data;
  const span = periodLabel(period.from, period.to);
  const before = periodLabel(period.previousFrom, period.previousTo);
  const nothing = kpis.orders.value === 0 && kpis.canceledOrders === 0;
  const topRevenue = Math.max(1, ...topProducts.map((product) => product.revenue));

  return (
    // While another period loads, the figures on screen are the previous one's: dimmed, never blank.
    <StatisticsPage aria-busy={isFetching}>
      {header}

      <p className="text-label text-foreground-muted" data-period={period.key}>
        <span className="font-medium text-foreground">{span}</span> ({period.days} jour{period.days > 1 ? "s" : ""}), comparé à la période précédente ({before}).
      </p>

      <div className={isPlaceholderData ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4"}>
        <KpiGrid label="Chiffres de la période">
          <Figure icon={ShoppingCart} label="Commandes" value={units(kpis.orders.value)} trend={<Trend figure={kpis.orders} before={units(kpis.orders.previous)} />} />
          <Figure icon={ChartNoAxesCombined} label="Chiffre d'affaires" value={<Amount francs={kpis.revenue.value} />} trend={<Trend figure={kpis.revenue} before={francs(kpis.revenue.previous)} />} />
          <Figure icon={UserPlus} label="Nouveaux clients" value={units(kpis.newCustomers.value)} trend={<Trend figure={kpis.newCustomers} before={units(kpis.newCustomers.previous)} />} />
          <Figure icon={ShoppingBag} label="Panier moyen" value={kpis.deliveredOrders > 0 ? <Amount francs={kpis.averageBasket.value} /> : "—"} trend={<Trend figure={kpis.averageBasket} before={francs(kpis.averageBasket.previous)} />} />
        </KpiGrid>

        <p className="text-meta text-foreground-muted">
          Commandes passées sur la période, hors annulées, échouées, retournées et en attente de paiement. Chiffre d&apos;affaires et panier moyen : commandes livrées ({units(kpis.deliveredOrders)}), vos articles uniquement, remises déduites, hors frais de livraison.
          {kpis.inProgressAmount > 0 && <> {francs(kpis.inProgressAmount)} de commandes sont encore en cours et s&apos;ajouteront à leur livraison.</>}
          {kpis.canceledOrders > 0 && <> {units(kpis.canceledOrders)} commande{kpis.canceledOrders > 1 ? "s annulées" : " annulée"} sur la période.</>}
          {kpis.returningCustomers > 0 && <> {units(kpis.returningCustomers)} client{kpis.returningCustomers > 1 ? "s avaient" : " avait"} déjà commandé chez vous.</>}
        </p>

        {nothing ? (
          <Card>
            <EmptyState icon={Wallet} title="Aucune commande sur cette période" description="Les ventes apparaissent ici dès qu'une commande est passée dans votre boutique. Essayez une période plus longue." />
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
            <Panel title="Ventes" hint={`Chiffre d'affaires livré, par jour de commande · ${span}`} className="xl:col-span-1">
              <DayChart
                form="area"
                label={`Ventes par jour, ${span}`}
                summary={`Ventes du ${span} : ${francs(kpis.revenue.value)} de chiffre d'affaires pour ${units(kpis.orders.value)} commande${kpis.orders.value > 1 ? "s" : ""}.`}
                points={series.map((day) => ({
                  date: day.date,
                  value: day.revenue,
                  readout: [
                    { label: "Chiffre d'affaires", value: francs(day.revenue) },
                    { label: "Commandes", value: units(day.orders) },
                  ],
                }))}
              />
            </Panel>

            <Panel title="Répartition par catégorie" hint="Part du chiffre d'affaires livré">
              {categories.length === 0 ? (
                <p className="text-body text-foreground-muted">Aucune vente livrée sur cette période.</p>
              ) : (
                <ShareRing
                  caption={`Chiffre d'affaires par catégorie : ${categories.map((category) => `${category.name} ${units(category.percent)} %`).join(", ")}.`}
                  center={{ value: formatMoneyFromFrancs(asFrancs(kpis.revenue.value), { currency: false }), label: "FCFA" }}
                  shares={categories.map((category, index) => ({
                    key: category.name,
                    label: category.name,
                    value: category.revenue,
                    percent: category.percent,
                    detail: francs(category.revenue),
                    ...RANKED_SHADES[Math.min(index, RANKED_SHADES.length - 1)],
                  }))}
                />
              )}
            </Panel>

            <Panel
              title="Produits les plus vendus"
              hint="Par chiffre d'affaires livré"
              action={
                <Link href="/vendor/products" className="inline-flex min-h-6 items-center text-label font-medium whitespace-nowrap text-primary underline-offset-4 hover:underline">
                  Voir tout
                </Link>
              }
            >
              {topProducts.length === 0 ? (
                <p className="text-body text-foreground-muted">Aucun produit livré sur cette période.</p>
              ) : (
                <ol className="flex flex-col divide-y divide-border">
                  {topProducts.map((product, index) => {
                    const line = (
                      <>
                        <ProductThumb src={product.image} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground group-hover:underline">{product.name}</span>
                          <span className="block truncate text-meta text-foreground-muted tabular-nums">{[product.sku, francs(product.revenue)].filter(Boolean).join(" · ")}</span>
                        </span>
                        <span className="text-label whitespace-nowrap text-foreground-muted tabular-nums">
                          <span className="font-semibold text-foreground">{units(product.quantity)}</span> vente{product.quantity > 1 ? "s" : ""}
                        </span>
                      </>
                    );
                    return (
                      <li key={product.productId ?? `${product.name}-${index}`} data-share={Math.round((product.revenue / topRevenue) * 100)}>
                        {product.productId ? (
                          <Link href={`/vendor/products/${product.productId}`} className="group flex items-center gap-3 py-2.5 outline-offset-2">
                            {line}
                          </Link>
                        ) : (
                          // A product that was removed since keeps its sales, without a sheet to open.
                          <span className="flex items-center gap-3 py-2.5">{line}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </Panel>
          </div>
        )}

        {cities.length > 0 && (
          <Panel title="Villes de livraison" hint="Part des commandes de la période dont la ville est connue">
            <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {cities.map((city) => (
                <RankedBar key={city.city} label={city.city} value={`${units(city.orders)} commande${city.orders > 1 ? "s" : ""} · ${units(city.percent)} %`} share={city.percent} />
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </StatisticsPage>
  );
}

/** What the page shows before its screen has read the address. */
export function StatisticsLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-72 w-full rounded-panel" />
    </div>
  );
}
