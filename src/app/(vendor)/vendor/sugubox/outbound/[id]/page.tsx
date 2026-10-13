import { Suspense } from "react";
import type { Metadata } from "next";
import { SuguBoxExpeditionDetail } from "@/features/vendor/sugubox/components/details";
import { SuguBoxLoading } from "@/features/vendor/sugubox/components/loading";

export const metadata: Metadata = {
  title: "Expédition Sugu Box | SUGUPro Vendeur",
  description: "La préparation et le suivi d'une expédition.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<SuguBoxLoading />}>
      <SuguBoxExpeditionDetail id={id} />
    </Suspense>
  );
}
