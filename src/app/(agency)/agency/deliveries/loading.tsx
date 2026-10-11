import { Skeleton } from "@/design-system";
import { AgencyPage, KpiRow } from "@/features/agency/components/page";

export default function DeliveriesLoading() {
  return (
    <AgencyPage aria-busy>
      <p role="status" className="sr-only">
        Chargement des livraisons…
      </p>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-control w-40 rounded-button" />
      </div>
      <KpiRow label="Chargement des indicateurs">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-panel" />
        ))}
      </KpiRow>
      <Skeleton className="h-16 rounded-panel" />
      <div className="overflow-hidden rounded-panel border border-border bg-surface">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </AgencyPage>
  );
}
