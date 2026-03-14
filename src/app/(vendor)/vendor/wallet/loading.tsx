import { WalletPageLoading } from "@/components/shared/wallet";

export default function VendorWalletLoading() {
  return (
    <WalletPageLoading
      ariaLabel="Chargement du portefeuille"
      srMessage="Chargement du portefeuille en cours…"
      headerStyle="vendor"
    />
  );
}
