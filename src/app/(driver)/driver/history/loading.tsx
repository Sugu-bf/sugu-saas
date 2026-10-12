import { Skeleton } from "@/design-system";
import { DriverPage } from "@/features/driver/components/frame";

export default function HistoryLoading() {
  return (
    <DriverPage wide aria-busy>
      <p role="status" className="sr-only">
        Chargement de l&apos;historique…
      </p>
      <Skeleton className="h-11 w-48" />
      <Skeleton className="h-10 rounded-panel" />
      <Skeleton className="h-10 rounded-panel" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-panel" />
      ))}
    </DriverPage>
  );
}
