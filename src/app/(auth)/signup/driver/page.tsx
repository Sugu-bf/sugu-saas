import { Suspense } from "react";
import type { Metadata } from "next";
import { DriverSignupWizard } from "./_components/driver-signup-wizard";

export const metadata: Metadata = {
  title: "Inscription coursier | SUGU",
  description: "Rejoignez une agence de livraison partenaire SUGU.",
};

export default function DriverSignupPage() {
  return (
    <Suspense fallback={null}>
      <DriverSignupWizard />
    </Suspense>
  );
}
