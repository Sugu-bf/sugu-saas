import { Suspense } from "react";
import type { Metadata } from "next";
import { SupportLoading, SupportScreen } from "@/features/vendor/support/components/screen";
import { LANABAGA_DESK, SupportDeskProvider } from "@/features/vendor/support/desk";

export const metadata: Metadata = {
  title: "Mes demandes | SUGUPro Lanabaga",
  description: "Vos demandes à l'équipe Lanaya de SUGU : candidature, pièces, convention, boutiques confiées.",
};

/** The support screen of the sellers, talking to the programme's desk (DEC-35). */
export default function LanabagaSupportPage() {
  return (
    <SupportDeskProvider desk={LANABAGA_DESK}>
      <Suspense fallback={<SupportLoading />}>
        <SupportScreen />
      </Suspense>
    </SupportDeskProvider>
  );
}
