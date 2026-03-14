import { WalletPageLoading } from "@/components/shared/wallet";

export default function DriverEarningsLoading() {
  return (
    <WalletPageLoading
      ariaLabel="Chargement des gains"
      srMessage="Chargement des gains en cours..."
      headerStyle="driver"
    />
  );
}
