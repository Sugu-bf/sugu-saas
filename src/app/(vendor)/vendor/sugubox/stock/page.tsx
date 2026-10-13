import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxStock } from "@/features/vendor/sugubox/components/stock";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Mon stock Sugu Box | SUGUPro Vendeur",
  description: "Le stock de vos produits dans les entrepôts Sugu Box.",
};

export default function Page() {
  // The screen reads its filters and its page from the address.
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxStock />
    </Suspense>
  );
}
