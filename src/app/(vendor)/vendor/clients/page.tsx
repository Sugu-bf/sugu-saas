import { Suspense } from "react";
import type { Metadata } from "next";
import { ClientsLoading, ClientsScreen } from "@/features/vendor/clients/components/screen";

export const metadata: Metadata = {
  title: "Mes clients | SUGUPro Vendeur",
  description: "Les clients de votre boutique : recherche, statuts, commandes et montants dépensés.",
};

export default function Page() {
  // The screen reads its filters, its page and the open sheet from the address.
  return (
    <Suspense fallback={<ClientsLoading />}>
      <ClientsScreen />
    </Suspense>
  );
}
