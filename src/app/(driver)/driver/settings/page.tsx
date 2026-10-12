import { Suspense } from "react";
import { SettingsPageClient } from "./settings-content";

export const metadata = { title: "Paramètres — Coursier SUGU" };

export default function DriverSettingsPage() {
  // The screen reads the section asked for from the address (`?tab=`).
  return (
    <Suspense fallback={null}>
      <SettingsPageClient />
    </Suspense>
  );
}
