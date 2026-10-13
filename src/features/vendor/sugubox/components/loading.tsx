import { Skeleton } from "@/design-system";

/** What a Sugu Box page shows before its screen has read the address. */
export function SuguBoxLoading() {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4" aria-busy="true">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-72 w-full rounded-panel" />
    </div>
  );
}
