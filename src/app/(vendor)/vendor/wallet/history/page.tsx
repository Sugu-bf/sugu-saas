import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceHistory } from "@/features/finance/components/history";
import { FinanceLoading } from "@/features/finance/components/loading";

export const metadata: Metadata = {
  title: "Historique | SUGUPro Vendeur",
  description: "Toutes les opérations de votre portefeuille.",
};

export default function VendorHistoryPage() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<FinanceLoading />}>
      <FinanceHistory profile="vendor" />
    </Suspense>
  );
}
