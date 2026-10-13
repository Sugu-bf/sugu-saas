import { Skeleton } from "@/design-system";
import { FinancePage } from "./bits";

/** What a money screen shows while it arrives: its shape, never a figure. */
export function FinanceLoading() {
  return (
    <FinancePage aria-busy>
      <p role="status" className="sr-only">
        Chargement de vos finances…
      </p>
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-24 rounded-panel" />
      <Skeleton className="h-11 rounded-button" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-16 rounded-panel" />
      ))}
    </FinancePage>
  );
}
