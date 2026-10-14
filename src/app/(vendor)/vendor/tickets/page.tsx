import { Suspense } from "react";
import type { Metadata } from "next";
import { SupportLoading, SupportScreen } from "@/features/vendor/support/components/screen";

export const metadata: Metadata = {
  title: "Support | SUGUPro Vendeur",
  description: "Vos demandes d'assistance auprès de l'équipe SUGU : suivi, réponses et pièces jointes.",
};

export default function VendorTicketsPage() {
  // The screen reads the open ticket and the form of a new one from the address.
  return (
    <Suspense fallback={<SupportLoading />}>
      <SupportScreen />
    </Suspense>
  );
}
