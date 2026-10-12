import { Skeleton } from "@/design-system";
import { DriverPage, KpiGrid } from "@/features/driver/components/frame";

export default function DriverDashboardLoading() {
  return (
    <DriverPage wide aria-busy>
      <p role="status" className="sr-only">
        Chargement de l&apos;accueil…
      </p>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-pill" />
        <Skeleton className="h-7 w-44" />
      </div>
      <KpiGrid label="Chargement des indicateurs">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-panel" />
        ))}
      </KpiGrid>
      <Skeleton className="h-56 rounded-panel lg:max-w-2xl" />
    </DriverPage>
  );
}
