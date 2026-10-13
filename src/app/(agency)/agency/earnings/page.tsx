import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceOverview } from "@/features/finance/components/overview";
import { FinanceLoading } from "@/features/finance/components/loading";

export const metadata: Metadata = {
  title: "Finances de l'agence | SUGUPro Agence",
  description: "Solde disponible, retraits en cours et dernières opérations.",
};

export default function AgencyOverviewPage() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<FinanceLoading />}>
      <FinanceOverview profile="agency" />
    </Suspense>
  );
}
