import { Suspense } from "react";
import type { Metadata } from "next";
import { SellerLanayaLoading, SellerLanayaScreen } from "@/features/lanaya/components/seller-screen";

export const metadata: Metadata = {
  title: "Programme Lanaya | SUGUPro Vendeur",
  description: "Le Lanabaga qui vous a présenté SUGU, et votre réponse à une invitation du programme Lanaya.",
};

export default function Page() {
  // The invitation being answered comes from the address (?invitation=…).
  return (
    <Suspense fallback={<SellerLanayaLoading />}>
      <SellerLanayaScreen />
    </Suspense>
  );
}
