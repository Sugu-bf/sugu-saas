import { api } from "@/lib/http/client";
import { type AgencyEarningsData } from "../schema";

// Earnings
// ============================================================

/** Raw earnings payload — all monetary fields in CENTIMES. */
interface RawAgencyEarnings {
  currency: string;
  amounts_in: string;
  kpis: {
    available_balance: number;
    available_balance_change_percent: number;
    pending_amount: number;
    total_withdrawn: number;
    week_earnings: number;
  };
  limits: { min_amount: number; max_amount: number; daily_limit: number; fee_rate: number };
  revenueChart: Array<{ day: string; value: number }>;
  nextPayout: {
    amount: number;
    scheduled_date: string;
    method: { provider: string; provider_label: string; account_masked: string } | null;
    min_threshold: number;
  };
  transactions: Array<{
    id: string;
    date: string;
    description: string;
    type: "credit" | "debit";
    reference_type: string | null;
    amount: number;
    status: "confirmed" | "completed" | "pending";
  }>;
}

const XOF_DISPLAY = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Centimes → display string (the card supplies the "FCFA" suffix). */
function centsToXofValue(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return XOF_DISPLAY.format(safe / 100);
}

/**
 * Fetch and shape the agency earnings page.
 *
 * The API now returns raw CENTIMES instead of pre-formatted strings. It used to
 * emit `number_format(balance)` next to a hard-coded "FCFA" built server-side
 * from centimes — showing every agency a balance 100× too large — and shipping
 * Tailwind gradient classes from PHP. Presentation belongs here.
 */
export async function getAgencyEarnings(agencyId: string): Promise<AgencyEarningsData> {
  const response = await api.get<{
    success: boolean;
    data: RawAgencyEarnings;
  }>(`agencies/${agencyId}/earnings`);

  const d = response.data;
  const changePercent = d.kpis.available_balance_change_percent;

  return {
    kpis: [
      {
        id: "total-gains",
        label: "Gains de la semaine",
        value: centsToXofValue(d.kpis.week_earnings),
        subValue: "FCFA",
        badge: `${changePercent >= 0 ? "+" : ""}${changePercent}%`,
        badgeColor:
          changePercent >= 0
            ? "text-green-600 bg-green-100"
            : "text-red-600 bg-red-100",
        icon: "wallet",
        gradient: "from-green-50/50 to-white",
        iconBg: "bg-green-50 text-green-600",
      },
      {
        id: "available-balance",
        label: "Solde actuel",
        value: centsToXofValue(d.kpis.available_balance),
        subValue: "FCFA",
        icon: "banknote",
        gradient: "from-blue-50/50 to-white",
        iconBg: "bg-blue-50 text-blue-600",
      },
      {
        id: "pending-gains",
        label: "En attente",
        value: centsToXofValue(d.kpis.pending_amount),
        subValue: "FCFA",
        icon: "clock",
        gradient: "from-amber-50/50 to-white",
        iconBg: "bg-amber-50 text-amber-600",
      },
      {
        id: "total-withdrawn",
        label: "Total retiré",
        value: centsToXofValue(d.kpis.total_withdrawn),
        subValue: "FCFA",
        icon: "arrow-down-to-line",
        gradient: "from-violet-50/50 to-white",
        iconBg: "bg-violet-50 text-violet-600",
      },
    ],
    revenueChart: (d.revenueChart ?? []).map((p) => ({
      day: p.day,
      value: Math.round(p.value / 100),
    })),
    nextPayout: {
      // The withdrawal wizard works in XOF.
      amount: Math.floor(d.nextPayout.amount / 100),
      scheduledDate: d.nextPayout.scheduled_date,
      method: d.nextPayout.method
        ? {
            provider: d.nextPayout.method.provider,
            providerLabel: d.nextPayout.method.provider_label,
            accountMasked: d.nextPayout.method.account_masked,
          }
        : null,
      minThreshold: Math.floor(d.nextPayout.min_threshold / 100),
    },
    transactions: (d.transactions ?? []).map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      type: t.type,
      referenceType: t.reference_type,
      amount: Math.round(t.amount / 100),
      status: t.status,
    })),
  };
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

/** XOF entered by the user → centimes for the API. */
export function xofToCents(xof: number): number {
  return Math.round((Number.isFinite(xof) ? xof : 0) * 100);
}

/**
 * Submit an agency withdrawal.
 *
 * @param data.amount XOF, as typed by the user — converted to centimes here.
 *        Sending the raw figure meant "10000" withdrew 100 FCFA, not 10 000.
 * @param data.idempotencyKey MUST be stable across retries of the same
 *        submission; minting it here gave every retry a fresh key, which made
 *        the protection decorative.
 */
export async function submitAgencyWithdrawal(
  agencyId: string,
  data: { amount: number; payoutSettingId: string; note?: string; idempotencyKey?: string },
): Promise<AgencyWithdrawalResponse> {
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
    amount: xofToCents(data.amount),
    payout_setting_id: data.payoutSettingId,
    note: data.note,
    idempotency_key: data.idempotencyKey,
  });

  const raw = response.data;
  return {
    id: raw.id,
    payoutNumber: raw.payout_number,
    // Back to XOF for display.
    amount: raw.amount / 100,
    feeAmount: raw.fee_amount / 100,
    netAmount: raw.net_amount / 100,
    status: raw.status,
    estimatedDate: raw.estimated_date,
  };
}


