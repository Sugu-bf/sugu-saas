import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketingLoading, MarketingScreen } from "@/features/vendor/marketing/components/screen";

export const metadata: Metadata = {
  title: "Marketing | SUGUPro Vendeur",
  description: "Les codes promotionnels et les promotions produits de votre boutique.",
};

export default function Page() {
  // The screen reads its tab from the address.
  return (
    <Suspense fallback={<MarketingLoading />}>
      <MarketingScreen />
    </Suspense>
  );
}
