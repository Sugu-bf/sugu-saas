import { Skeleton } from "@/design-system";
import { DriverPage } from "@/features/driver/components/frame";

export default function MissionsLoading() {
  return (
    <DriverPage aria-busy>
      <p role="status" className="sr-only">
        Chargement des missions…
      </p>
      <Skeleton className="h-11 w-48" />
      <Skeleton className="h-10 rounded-panel" />
      <Skeleton className="h-10 rounded-panel" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-panel" />
      ))}
    </DriverPage>
  );
}
