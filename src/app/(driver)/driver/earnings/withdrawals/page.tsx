import { Suspense } from "react";
import type { Metadata } from "next";
import { FinanceWithdrawals } from "@/features/finance/components/withdrawals";
import { FinanceLoading } from "@/features/finance/components/loading";

export const metadata: Metadata = {
  title: "Demandes de retrait | SUGUPro Coursier",
  description: "Vos demandes de retrait et leur suivi.",
};

export default function DriverWithdrawalsPage() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<FinanceLoading />}>
      <FinanceWithdrawals profile="courier" />
    </Suspense>
  );
}
