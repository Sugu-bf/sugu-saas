import { api } from "@/lib/http/client";
import { type AgencyEarningsData } from "../schema";

// Earnings
// ============================================================

export async function getAgencyEarnings(agencyId: string): Promise<AgencyEarningsData> {
  const response = await api.get<{
    success: boolean;
    data: AgencyEarningsData;
  }>(`agencies/${agencyId}/earnings`);

  return response.data;
}

// ============================================================
// Payout Settings
// ============================================================

export interface AgencyPayoutSetting {
  id: string;
  type: "mobile_money" | "bank_transfer";
  provider: string;
  providerLabel: string;
  accountMasked: string;
  isDefault: boolean;
}

export async function getAgencyPayoutSettings(
  agencyId: string,
): Promise<AgencyPayoutSetting[]> {
  const response = await api.get<{
    success: boolean;
    data: Array<{
      id: string;
      type: string;
      provider: string;
      provider_label: string;
      account_masked: string;
      is_default: boolean;
    }>;
  }>(`agencies/${agencyId}/payout-settings`);

  return response.data.map((ps) => ({
    id: ps.id,
    type: ps.type as "mobile_money" | "bank_transfer",
    provider: ps.provider,
    providerLabel: ps.provider_label,
    accountMasked: ps.account_masked,
    isDefault: ps.is_default,
  }));
}

// ============================================================
// Withdrawals
// ============================================================

export interface AgencyWithdrawalResponse {
  id: string;
  payoutNumber: string;
  amount: number;
  feeAmount: number;
  netAmount: number;
  status: string;
  estimatedDate?: string;
}

export async function submitAgencyWithdrawal(
  agencyId: string,
  data: { amount: number; payoutSettingId: string; note?: string },
): Promise<AgencyWithdrawalResponse> {
  const idempotencyKey = crypto.randomUUID();
  const response = await api.post<{
    success: boolean;
    data: {
      id: string;
      payout_number: string;
      amount: number;
      fee_amount: number;
      net_amount: number;
      status: string;
      estimated_date?: string;
    };
  }>(`agencies/${agencyId}/withdrawals`, {
    amount: data.amount,
    payout_setting_id: data.payoutSettingId,
    note: data.note,
    idempotency_key: idempotencyKey,
  });

  const raw = response.data;
  return {
    id: raw.id,
    payoutNumber: raw.payout_number,
    amount: raw.amount,
    feeAmount: raw.fee_amount,
    netAmount: raw.net_amount,
    status: raw.status,
    estimatedDate: raw.estimated_date,
  };
}


