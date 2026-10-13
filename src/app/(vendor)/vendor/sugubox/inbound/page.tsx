import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxReceptions } from "@/features/vendor/sugubox/components/receptions";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Réceptions Sugu Box | SUGUPro Vendeur",
  description: "Les marchandises que l'entrepôt Sugu Box reçoit de votre boutique.",
};

export default function Page() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxReceptions />
    </Suspense>
  );
}
