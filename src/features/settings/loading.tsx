import { Skeleton } from "@/design-system";

/** The settings page while it loads: the title, the list of sections, a panel. */
export function SettingsPageLoading({ sections = 8 }: { sections?: number }) {
  return (
    <div className="sugu-ui mx-auto flex w-full max-w-[96rem] flex-col gap-4 lg:gap-5" aria-busy>
      <span className="sr-only" role="status">
        Chargement des paramètres…
      </span>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="hidden h-4 w-72 md:block" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-1 rounded-panel border border-border bg-surface p-1.5">
          {Array.from({ length: sections }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
        <Skeleton className="hidden h-[28rem] w-full rounded-panel lg:block" />
      </div>
    </div>
  );
}
