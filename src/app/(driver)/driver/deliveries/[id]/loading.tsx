import { Skeleton } from "@/design-system";
import { DriverPage } from "@/features/driver/components/frame";

export default function MissionLoading() {
  return (
    <DriverPage aria-busy>
      <p role="status" className="sr-only">
        Chargement de la mission…
      </p>
      <Skeleton className="h-11 w-2/3" />
      <Skeleton className="h-16 rounded-panel" />
      <Skeleton className="h-56 rounded-panel" />
      <Skeleton className="h-48 rounded-panel" />
    </DriverPage>
  );
}
