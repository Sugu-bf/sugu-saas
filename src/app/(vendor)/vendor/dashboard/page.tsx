import { Suspense } from "react";
import { DashboardLoading, DashboardScreen } from "@/features/vendor/dashboard/components/screen";

export default function Page() {
  // The screen reads its period from the address.
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardScreen />
    </Suspense>
  );
}
