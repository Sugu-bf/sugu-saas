import { Skeleton } from "@/design-system";

export default function CreateOrderLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-7 w-56" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 rounded-panel" />
    </div>
  );
}
