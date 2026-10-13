import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxExpeditions } from "@/features/vendor/sugubox/components/expeditions";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Expéditions Sugu Box | SUGUPro Vendeur",
  description: "Les commandes que l'entrepôt Sugu Box prépare et expédie pour vous.",
};

export default function Page() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxExpeditions />
    </Suspense>
  );
}
