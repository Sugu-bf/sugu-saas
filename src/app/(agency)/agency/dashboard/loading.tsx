import { Skeleton } from "@/design-system";
import { AgencyPage, KpiRow } from "@/features/agency/components/page";

export default function AgencyDashboardLoading() {
  return (
    <AgencyPage aria-busy>
      <p role="status" className="sr-only">
        Chargement du tableau de bord…
      </p>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-control w-40 rounded-button" />
      </div>
      <KpiRow label="Chargement des indicateurs">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-panel" />
        ))}
      </KpiRow>
      <Skeleton className="h-72 rounded-panel" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-panel" />
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </AgencyPage>
  );
}
