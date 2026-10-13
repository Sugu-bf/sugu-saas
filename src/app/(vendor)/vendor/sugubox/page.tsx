import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxOverview } from "@/features/vendor/sugubox/components/overview";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Sugu Box | SUGUPro Vendeur",
  description: "Stock, réceptions, expéditions et alertes de votre espace Sugu Box.",
};

export default function Page() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxOverview />
    </Suspense>
  );
}
