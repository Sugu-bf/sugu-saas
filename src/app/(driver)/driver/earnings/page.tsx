"use client";

import { useDriverEarnings } from "@/features/driver/hooks";
import {
  DRIVER_EARNINGS_CONFIG,
  mapDriverEarningsToWalletData,
} from "@/features/driver/earnings-wallet-config";
import { WalletPageLayout } from "@/components/shared/wallet";
import DriverEarningsLoading from "./loading";

export default function DriverEarningsPage() {
  const query = useDriverEarnings();

  return (
    <WalletPageLayout
      config={DRIVER_EARNINGS_CONFIG}
      query={query}
      mapData={mapDriverEarningsToWalletData}
      LoadingComponent={DriverEarningsLoading}
    />
  );
}
