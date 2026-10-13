import { Suspense } from "react";
import type { Metadata } from "next";
import { StatisticsLoading, StatisticsScreen } from "@/features/vendor/statistics/components/screen";

export const metadata: Metadata = {
  title: "Statistiques | SUGUPro Vendeur",
  description: "Les ventes de votre boutique sur la période de votre choix.",
};

export default function Page() {
  // The screen reads its period from the address.
  return (
    <Suspense fallback={<StatisticsLoading />}>
      <StatisticsScreen />
    </Suspense>
  );
}
