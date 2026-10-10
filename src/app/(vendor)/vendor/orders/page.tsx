import { Suspense } from "react";
import { OrdersContent } from "./orders-content";
import VendorOrdersLoading from "./loading";

export default function VendorOrdersPage() {
  return (
    // The list reads its state from the URL (useSearchParams).
    <Suspense fallback={<VendorOrdersLoading />}>
      <OrdersContent />
    </Suspense>
  );
}
