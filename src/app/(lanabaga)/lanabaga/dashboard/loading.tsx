import { Skeleton } from "@/design-system";
import { KpiRow, LanayaPage } from "@/features/lanaya/components/frame";

export default function LanabagaDashboardLoading() {
  return (
    <LanayaPage aria-busy>
      <p role="status" className="sr-only">
        Chargement du tableau de bord…
      </p>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-control w-40 rounded-button" />
      </div>
      <KpiRow label="Chargement des indicateurs">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-panel" />
        ))}
      </KpiRow>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-72 rounded-panel" />
        <Skeleton className="h-72 rounded-panel" />
      </div>
    </LanayaPage>
  );
}
