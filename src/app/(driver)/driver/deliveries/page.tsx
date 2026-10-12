import { Suspense } from "react";
import type { Metadata } from "next";
import MissionsLoading from "./loading";
import { MissionsContent } from "./missions-content";

export const metadata: Metadata = {
  title: "Missions | SUGUPro Coursier",
  description: "Vos missions disponibles, en cours et terminées.",
};

export default function DriverMissionsPage() {
  // The list reads its tab, search and page from the address.
  return (
    <Suspense fallback={<MissionsLoading />}>
      <MissionsContent />
    </Suspense>
  );
}
