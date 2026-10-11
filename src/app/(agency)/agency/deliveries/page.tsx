import { Suspense } from "react";
import type { Metadata } from "next";
import { DeliveriesContent } from "./deliveries-content";
import DeliveriesLoading from "./loading";

export const metadata: Metadata = {
  title: "Livraisons | SUGUPro Agence",
  description: "Suivez, filtrez et assignez les courses de votre agence.",
};

export default function AgencyDeliveriesPage() {
  return (
    // The list reads its state from the URL (useSearchParams).
    <Suspense fallback={<DeliveriesLoading />}>
      <DeliveriesContent />
    </Suspense>
  );
}
