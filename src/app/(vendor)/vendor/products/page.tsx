import { Suspense } from "react";
import { ProductsContent } from "./products-content";
import VendorProductsLoading from "./loading";

export default function VendorProductsPage() {
  return (
    // The list reads its state from the URL (useSearchParams).
    <Suspense fallback={<VendorProductsLoading />}>
      <ProductsContent />
    </Suspense>
  );
}
