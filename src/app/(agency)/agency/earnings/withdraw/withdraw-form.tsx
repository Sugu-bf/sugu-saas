"use client";

import { useMemo } from "react";

import { WithdrawForm as SharedWithdrawForm } from "@/components/shared/withdraw";
import { AGENCY_WITHDRAW_CONFIG } from "@/features/agency/withdraw-config";
import {
  useAgencyEarnings,
  useAgencyPayoutSettings,
  useSubmitAgencyWithdrawal,
} from "@/features/agency/hooks";
import type { SharedPayoutSetting } from "@/components/shared/withdraw";

export function WithdrawForm() {
  const { data: earningsData } = useAgencyEarnings();
  const { data: payoutSettings = [] } = useAgencyPayoutSettings();
  const submitWithdrawal = useSubmitAgencyWithdrawal();

  // Parse available balance from KPI data
  const availableBalance = useMemo(() => {
    const balanceKpi = earningsData?.kpis.find(
      (k) => k.id === "available-balance",
    );
    if (!balanceKpi) return 0;
    return parseInt(balanceKpi.value.replace(/[^\d]/g, ""), 10) || 0;
  }, [earningsData]);

  // Map AgencyPayoutSetting → SharedPayoutSetting
  const sharedSettings: SharedPayoutSetting[] = useMemo(
    () =>
      payoutSettings.map((ps) => ({
        id: ps.id,
        type: ps.type,
        provider: ps.provider,
        providerLabel: ps.providerLabel,
        accountMasked: ps.accountMasked,
        isDefault: ps.isDefault,
      })),
    [payoutSettings],
  );

  return (
    <SharedWithdrawForm
      config={AGENCY_WITHDRAW_CONFIG}
      balance={availableBalance}
      payoutSettings={sharedSettings}
      submitMutation={submitWithdrawal}
    />
  );
}
