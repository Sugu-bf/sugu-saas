import { Suspense } from "react";
import type { Metadata } from "next";
import { InventoryContent } from "./inventory-content";
import VendorInventoryLoading from "./loading";

export const metadata: Metadata = {
  title: "Inventaire | SUGUPro Vendeur",
  description: "Le stock de vos produits et de leurs variantes.",
};

export default function VendorInventoryPage() {
  return (
    // The list reads its state from the URL (useSearchParams).
    <Suspense fallback={<VendorInventoryLoading />}>
      <InventoryContent />
    </Suspense>
  );
}
