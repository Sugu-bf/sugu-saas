import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceMethods } from "@/features/finance/components/methods";
import { FinanceLoading } from "@/features/finance/components/loading";

export const metadata: Metadata = {
  title: "Méthodes de paiement | SUGUPro Coursier",
  description: "Les comptes sur lesquels vous recevez vos retraits.",
};

export default function DriverMethodsPage() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<FinanceLoading />}>
      <FinanceMethods profile="courier" />
    </Suspense>
  );
}
