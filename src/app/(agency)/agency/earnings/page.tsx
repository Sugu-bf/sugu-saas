"use client";

import { useAgencyEarnings } from "@/features/agency/hooks";
import { WalletPageLayout } from "@/components/shared/wallet";
import {
  AGENCY_EARNINGS_CONFIG,
  mapAgencyEarningsToWalletData,
} from "@/features/agency/earnings-wallet-config";
import AgencyEarningsLoading from "./loading";

export default function AgencyEarningsPage() {
  const query = useAgencyEarnings();

  return (
    <WalletPageLayout
      config={AGENCY_EARNINGS_CONFIG}
      query={query}
      mapData={mapAgencyEarningsToWalletData}
      LoadingComponent={AgencyEarningsLoading}
    />
  );
}
