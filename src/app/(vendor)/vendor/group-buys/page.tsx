import { Suspense } from "react";
import type { Metadata } from "next";
import { GroupBuysLoading, GroupBuysScreen } from "@/features/vendor/group-buys/components/screen";

export const metadata: Metadata = {
  title: "Achats groupés | SUGUPro Vendeur",
  description: "Les groupes de clients qui achètent vos produits ensemble, au prix de vos paliers.",
};

export default function Page() {
  // The screen reads its tab from the address.
  return (
    <Suspense fallback={<GroupBuysLoading />}>
      <GroupBuysScreen />
    </Suspense>
  );
}
