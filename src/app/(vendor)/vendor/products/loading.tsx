import { Skeleton } from "@/design-system";

export default function VendorProductsLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-7xl flex-col gap-4" aria-busy="true">
      <p role="status" className="sr-only">
        Chargement des produits…
      </p>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-9 w-40 rounded-pill" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-9 w-full max-w-xs" />
      <div className="overflow-hidden rounded-panel border border-border bg-surface">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-border px-3 py-3 last:border-b-0">
            <Skeleton className="size-10 rounded-control" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
