"use client";

import { useVendorWallet } from "@/features/vendor/hooks";
import {
  VENDOR_WALLET_CONFIG,
  mapVendorWalletToWalletData,
} from "@/features/vendor/vendor-wallet-config";
import { WalletPageLayout } from "@/components/shared/wallet";
import VendorWalletLoading from "./loading";

export default function VendorWalletPage() {
  const query = useVendorWallet();

  return (
    <WalletPageLayout
      config={VENDOR_WALLET_CONFIG}
      query={query}
      mapData={mapVendorWalletToWalletData}
      LoadingComponent={VendorWalletLoading}
    />
  );
}
