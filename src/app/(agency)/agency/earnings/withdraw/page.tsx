import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceWithdraw } from "@/features/finance/components/withdraw";
import { FinanceLoading } from "@/features/finance/components/loading";

export const metadata: Metadata = {
  title: "Demander un retrait | SUGUPro Agence",
  description: "Retirez vos fonds vers un compte mobile money ou bancaire.",
};

export default function AgencyWithdrawPage() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<FinanceLoading />}>
      <FinanceWithdraw profile="agency" />
    </Suspense>
  );
}
