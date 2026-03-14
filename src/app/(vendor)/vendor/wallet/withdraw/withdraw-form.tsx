"use client";

import { useMemo } from "react";

import { WithdrawForm as SharedWithdrawForm } from "@/components/shared/withdraw";
import { VENDOR_WITHDRAW_CONFIG } from "@/features/vendor/withdraw-config";
import {
  useVendorWallet,
  usePayoutSettings,
  useSubmitWithdrawal,
} from "@/features/vendor/hooks";
import type { SharedPayoutSetting } from "@/components/shared/withdraw";

export function WithdrawForm() {
  const { data: walletData } = useVendorWallet();
  const { data: payoutSettings = [] } = usePayoutSettings();
  const submitWithdrawal = useSubmitWithdrawal();

  // Parse available balance from KPI data
  const availableBalance = useMemo(() => {
    const balanceKpi = walletData?.kpis.find(
      (k) => k.id === "available-balance",
    );
    if (!balanceKpi) return 0;
    return parseInt(balanceKpi.value.replace(/[^\d]/g, ""), 10) || 0;
  }, [walletData]);

  // Map PayoutSetting → SharedPayoutSetting
  const sharedSettings: SharedPayoutSetting[] = useMemo(
    () =>
      payoutSettings.map((ps) => ({
        id: ps.id,
        type: ps.type,
        provider: ps.provider ?? undefined,
        providerLabel: ps.providerLabel,
        accountMasked: ps.accountMasked,
        bankName: ps.bankName,
        isDefault: ps.isDefault,
        addedDate: ps.addedDate,
      })),
    [payoutSettings],
  );

  return (
    <SharedWithdrawForm
      config={VENDOR_WITHDRAW_CONFIG}
      balance={availableBalance}
      payoutSettings={sharedSettings}
      submitMutation={submitWithdrawal}
    />
  );
}
