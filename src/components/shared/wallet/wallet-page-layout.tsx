"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ErrorState } from "@/components/feedback";
import { WalletKpiCard } from "./wallet-kpi-card";
import { WalletAreaChart } from "./wallet-area-chart";
import { WalletNextPayoutCard } from "./wallet-next-payout-card";
import { WalletTransactionsSection } from "./wallet-transactions-section";
import type { WalletPageConfig, WalletPageData } from "@/features/shared/wallet.types";

// Period pills — identical for both pages
const PERIOD_OPTIONS = [
  { label: "7j", value: "7d" },
  { label: "30j", value: "30d" },
  { label: "90j", value: "90d" },
  { label: "1an", value: "1y" },
] as const;

interface WalletPageLayoutProps<TRaw> {
  config: WalletPageConfig;
  query: {
    data: TRaw | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  mapData: (raw: TRaw) => WalletPageData;
  LoadingComponent: ComponentType;
}

/** Main orchestrator for both driver earnings and vendor wallet pages */
export function WalletPageLayout<TRaw>({
  config,
  query,
  mapData,
  LoadingComponent,
}: WalletPageLayoutProps<TRaw>) {
  const [activePeriod, setActivePeriod] = useState("30d");

  if (query.isLoading) return <LoadingComponent />;

  if (query.isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title={config.errorTitle}
          description={
            query.error?.message || config.errorDescription
          }
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  if (!query.data) return null;

  const data = mapData(query.data);

  // Revenue chart stats
  const totalRevenue = data.revenueChart.reduce((s, d) => s + d.value, 0);
  const previousRevenue = config.previousValueGenerator(totalRevenue);

  return (
    <div className="mx-auto max-w-7xl space-y-4 lg:space-y-6">
      {/* ════════════ Header ════════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {config.headerIconWrapperClass ? (
            <div className={config.headerIconWrapperClass}>
              {config.headerIcon}
            </div>
          ) : config.headerIcon ? (
            /* Vendor style: icon inline in title */
            null
          ) : null}
          <div>
            <h1 className="text-lg font-bold text-gray-900 lg:text-2xl">
              {!config.headerIconWrapperClass && config.headerIcon ? (
                <>
                  <span className="inline-block" aria-hidden="true">
                    {config.headerIcon}
                  </span>{" "}
                </>
              ) : null}
              {config.pageTitle}
            </h1>
            <p className={`mt-0.5 text-xs text-gray-500 ${config.headerIconWrapperClass ? "lg:text-[13px]" : "lg:text-sm"}`}>
              {config.pageSubtitle}
            </p>
          </div>
        </div>

        <Link
          href={config.withdrawHref}
          className="flex items-center gap-2 rounded-2xl bg-sugu-500 px-5 py-2.5 text-sm font-semibold text-white transition-all active:scale-95 hover:bg-sugu-600 lg:hover:-translate-y-0.5"
          id="request-payout-btn"
        >
          <ArrowUpRight className="h-4 w-4" />
          Demander un retrait
        </Link>
      </header>

      {/* ════════════ KPI Cards ════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {data.kpis.map((kpi, i) => (
          <WalletKpiCard
            key={kpi.id}
            kpi={kpi}
            delay={i}
            iconMap={config.iconMap}
            iconShadow={config.kpiIconShadow}
          />
        ))}
      </div>

      {/* ════════════ Middle Row: Chart + Next Payout ════════════ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:gap-4">
        {/* Revenue Chart (3 cols) */}
        <section
          className="glass-card rounded-2xl p-4 transition-all duration-300 lg:col-span-3 lg:rounded-3xl lg:p-6"
          aria-labelledby={config.chartTitleId}
        >
          <div className="flex items-center justify-between">
            <h2
              id={config.chartTitleId}
              className="text-base font-semibold text-gray-900 lg:text-lg"
            >
              {config.chartTitle}
            </h2>
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActivePeriod(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                    activePeriod === opt.value
                      ? `bg-sugu-500 text-white${config.periodPillActiveExtra ? ` ${config.periodPillActiveExtra}` : ""}`
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 lg:mt-4">
            <WalletAreaChart
              data={data.revenueChart}
              gradientId={config.chartGradientId}
              lineGradientId={config.chartLineGradientId}
              ariaLabel={config.chartAriaLabel}
              emptyMessage={config.emptyChartMessage}
            />
          </div>

          {/* Bottom stats */}
          <div className="mt-3 flex flex-col gap-1 px-1 sm:flex-row sm:justify-between lg:mt-4">
            <span className="text-xs text-gray-500">
              {config.chartLabel}:{" "}
              <strong className="text-gray-700">
                {formatCurrency(totalRevenue)} FCFA
              </strong>
            </span>
            <span className="text-xs text-gray-500">
              {config.chartCompareLabel}:{" "}
              <strong className="text-gray-700">
                {formatCurrency(previousRevenue)} FCFA
              </strong>{" "}
              <span className="font-semibold text-green-600">({config.growthLabel})</span>
            </span>
          </div>
        </section>

        {/* Next Payout Card (2 cols) */}
        <section className="lg:col-span-2">
          <WalletNextPayoutCard
            payout={data.nextPayout}
            methodLabelClass={config.headerIconWrapperClass ? "text-[10px]" : "text-xs"}
          />
        </section>
      </div>

      {/* ════════════ Transactions Table ════════════ */}
      <WalletTransactionsSection
        transactions={data.transactions}
        filterOptions={config.filterOptions}
        entryTypeConfig={config.entryTypeConfig}
        statusDisplay={config.statusDisplay}
        getEntryCategory={config.getEntryCategory}
        defaultCategory={config.defaultCategory}
      />
    </div>
  );
}
