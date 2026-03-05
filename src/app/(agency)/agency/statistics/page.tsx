"use client";

import { useState } from "react";
import { useAgencyStats } from "@/features/agency/hooks";
import { StatisticsContent } from "./statistics-content";
import StatisticsLoading from "./loading";
import StatisticsError from "./error";

type Period = "7j" | "30j" | "90j";

/**
 * Agency statistics page — Client Component.
 *
 * Uses `useAgencyStats(period)` so changing period triggers a real refetch.
 * The hook uses `keepPreviousData` to avoid white flash on period change.
 */
export default function AgencyStatisticsPage() {
  const [period, setPeriod] = useState<Period>("30j");
  const { data, isLoading, isError, error, refetch } = useAgencyStats(period);

  if (isLoading && !data) return <StatisticsLoading />;

  if (isError && !data) {
    return (
      <StatisticsError
        error={error as Error & { digest?: string }}
        reset={() => void refetch()}
      />
    );
  }

  if (!data) return null;

  return (
    <StatisticsContent
      data={data}
      period={period}
      onPeriodChange={setPeriod}
    />
  );
}
