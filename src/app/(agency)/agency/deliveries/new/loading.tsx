import { Skeleton } from "@/design-system";
import { AgencyPage } from "@/features/agency/components/page";

export default function CreateDeliveryLoading() {
  return (
    <AgencyPage className="max-w-3xl" aria-busy>
      <p role="status" className="sr-only">
        Chargement du formulaire…
      </p>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 rounded-panel" />
    </AgencyPage>
  );
}
