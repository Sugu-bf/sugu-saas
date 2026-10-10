import { Skeleton } from "@/design-system";

export default function OrderDetailLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-6xl flex-col gap-4" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement de la commande…
      </p>
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-44 rounded-pill" />
      </div>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Skeleton className="h-56 rounded-panel" />
          <Skeleton className="h-40 rounded-panel" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 rounded-panel" />
          <Skeleton className="h-36 rounded-panel" />
        </div>
      </div>
    </div>
  );
}
