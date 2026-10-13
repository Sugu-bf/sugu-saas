import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxMovements } from "@/features/vendor/sugubox/components/movements";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Mouvements Sugu Box | SUGUPro Vendeur",
  description: "Le journal des mouvements de stock de vos produits dans Sugu Box.",
};

export default function Page() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxMovements />
    </Suspense>
  );
}
