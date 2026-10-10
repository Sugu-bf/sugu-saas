import { Skeleton } from "@/design-system";

/** Frame shown while the session is being checked: same geometry as the shell. */
export function ShellSkeleton() {
  return (
    <div
      className="sugu-ui flex h-dvh overflow-hidden bg-background"
      role="status"
      aria-label="Chargement de votre espace"
    >
      <div className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border bg-surface p-4 lg:flex">
        <Skeleton className="mb-4 h-8 w-36" />
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:h-16 lg:px-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-8 rounded-pill" />
        </div>
        <div className="flex-1 space-y-4 p-4 lg:p-8">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
