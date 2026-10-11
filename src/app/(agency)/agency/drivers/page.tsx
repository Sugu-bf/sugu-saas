import { Suspense } from "react";
import type { Metadata } from "next";
import { DriversContent } from "./drivers-content";
import DriversLoading from "./loading";

export const metadata: Metadata = {
  title: "Livreurs | SUGUPro Agence",
  description: "Votre flotte de livreurs : disponibilité, performance, alertes et recrutement.",
};

export default function AgencyDriversPage() {
  return (
    // The list reads its state from the URL (useSearchParams).
    <Suspense fallback={<DriversLoading />}>
      <DriversContent />
    </Suspense>
  );
}
