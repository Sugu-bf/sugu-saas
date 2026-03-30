import { Metadata } from "next";
import { DriverSignupWizard } from "./_components/driver-signup-wizard";

export const metadata: Metadata = {
  title: "Inscription Livreur | SUGU",
  description: "Rejoignez notre réseau de coursiers",
};

export default function DriverSignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-gray-950/50">
      <div className="w-full max-w-md">
        <DriverSignupWizard />
      </div>
    </div>
  );
}
