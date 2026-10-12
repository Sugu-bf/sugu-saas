import { Suspense } from "react";
import type { Metadata } from "next";
import { HistoryContent } from "./history-content";
import HistoryLoading from "./loading";

export const metadata: Metadata = {
  title: "Historique des missions | SUGUPro Coursier",
  description: "Vos missions terminées : livrées ou en échec.",
};

export default function DriverHistoryPage() {
  // The list reads its filters and its page from the address.
  return (
    <Suspense fallback={<HistoryLoading />}>
      <HistoryContent />
    </Suspense>
  );
}
