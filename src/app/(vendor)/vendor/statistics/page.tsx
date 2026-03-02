"use client";

import { useVendorStats } from "@/features/vendor/hooks";
import { StatsContent } from "./stats-content";
import StatsLoading from "./loading";
import { ErrorState } from "@/components/feedback";

export default function VendorStatisticsPage() {
  const { data, isLoading, isError, error, refetch } = useVendorStats();

  if (isLoading) return <StatsLoading />;

  if (isError) {
    return (
      <div className="mx-auto flex max-w-7xl items-center justify-center py-24">
        <ErrorState
          title="Erreur"
          description={error?.message || "Impossible de charger les statistiques."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) return null;

  return <StatsContent data={data} />;
}
