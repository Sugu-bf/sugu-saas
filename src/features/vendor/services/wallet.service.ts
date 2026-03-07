/**
 * Wallet Service
 * Handles: GET /wallets, GET /wallets/:id, GET /stores/:storeId/payout-settings
 *          POST /sellers/wallet/request-payout
 *
 * All functions call the real API and transform backend shapes
 * into the Zod-validated frontend schemas.
 */
import {
  vendorWalletDataSchema,
  withdrawalResponseSchema,
  type VendorWalletData,
  type WalletKpi,
  type WalletEntry,
  type WalletRevenuePoint,
  type PayoutMethod,
  type PayoutSetting,
  type WithdrawalResponse,
} from "../schema";
import { api } from "@/lib/http/client";
import { formatDateFr } from "./_shared";

// ── Raw API Types (backend response shapes) ───────────────

interface RawWallet {
  id: string;
  owner_type: string;
  owner_id: string;
  currency: string;
  balance_amount: number;
  is_active: boolean;
  owner?: { id: string; name: string; slug: string };
  entries?: RawWalletEntry[];
}

interface RawWalletEntry {
  id: string;
  type: "credit" | "debit";
  amount: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  transaction_id: string | null;
  metadata: unknown;
  booked_at: string;
  created_at: string;
}

interface RawWalletsResponse {
  success: boolean;
  message: string;
  data: { wallets: RawWallet[] };
}

interface RawWalletDetailResponse {
  success: boolean;
  message: string;
  data: { wallet: RawWallet };
}

interface RawPayoutSetting {
  id: string;
  store_id: string;
  type: "mobile_money" | "bank_account";
  mm_provider: string | null;
  mm_msisdn_e164: string | null;
  mm_account_name: string | null;
  bank_name: string | null;
  bank_code: string | null;
  account_number: string | null;
  iban: string | null;
  country_code: string;
  currency: string;
  is_default: boolean;
  status: number;
  verified_at: string | null;
  created_at: string;
}

interface RawPayoutSettingsResponse {
  success: boolean;
  message: string;
  data: { payout_settings: RawPayoutSetting[] };
}

interface RawPayoutResponse {
  id: string;
  payout_number: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  method: string;
  estimated_date?: string;
}

// ── Public API ────────────────────────────────────────────

/**
 * Fetch the vendor wallet data (KPIs, chart, transactions, payout info).
 * Calls 3 backend endpoints and assembles the composite response.
 *
 * Flow:
 * 1. GET /v1/wallets → find the store wallet
 * 2. GET /v1/wallets/{id} → detail with 20 last entries
 * 3. GET /v1/stores/{storeId}/payout-settings → payment methods
 * 4. Assemble + validate via Zod
 */
export async function getVendorWallet(): Promise<VendorWalletData> {
  // 1. Fetch all wallets, find the store wallet
  const walletsRes = await api.get<RawWalletsResponse>("wallets");
  const storeWallet = walletsRes.data.wallets.find(
    (w) => w.owner_type === "store",
  );
  if (!storeWallet) return _buildEmptyWalletData();

  // 2. Fetch wallet detail with entries
  const detailRes = await api.get<RawWalletDetailResponse>(
    `wallets/${storeWallet.id}`,
  );

  // 3. Fetch payout settings for the store
  const storeId = storeWallet.owner_id;
  let payoutSettings: RawPayoutSetting[] = [];
  try {
    const psRes = await api.get<RawPayoutSettingsResponse>(
      `stores/${storeId}/payout-settings`,
    );
    payoutSettings = psRes.data.payout_settings ?? [];
  } catch {
    // Payout settings may not be set up yet — graceful fallback
    payoutSettings = [];
  }

  // 4. Assemble and validate
  return vendorWalletDataSchema.parse(
    _transformWalletData(detailRes.data.wallet, payoutSettings),
  );
}

/**
 * Request a payout withdrawal.
 * @deprecated Use submitWithdrawal() instead — this is kept for backward compat.
 */
export async function requestPayout(
  _amount: number,
): Promise<{ success: boolean }> {
  console.warn(
    "[Wallet] requestPayout() is deprecated. Use submitWithdrawal() instead.",
  );
  // Delegate to submitWithdrawal with no specific payout setting (won't work without it).
  // This function is not used by UI components — the wizard uses useSubmitWithdrawal().
  return { success: false };
}

// ── Payout Settings & Withdrawal ─────────────────────────

/**
 * Fetch payout settings (payment methods) for the vendor's store.
 * Real API: GET /v1/stores/{storeId}/payout-settings
 */
export async function getPayoutSettings(): Promise<PayoutSetting[]> {
  // Get store wallet to find storeId
  const walletsRes = await api.get<RawWalletsResponse>("wallets");
  const storeWallet = walletsRes.data.wallets.find(
    (w) => w.owner_type === "store",
  );
  if (!storeWallet) return [];

  const res = await api.get<RawPayoutSettingsResponse>(
    `stores/${storeWallet.owner_id}/payout-settings`,
  );

  return (res.data.payout_settings ?? [])
    .filter((s) => s.status === 1) // Only active settings
    .map(_transformPayoutSetting);
}

/**
 * Submit a withdrawal request.
 * Real API: POST /v1/sellers/wallet/request-payout
 */
export async function submitWithdrawal(data: {
  amount: number;
  payoutSettingId: string;
}): Promise<WithdrawalResponse> {
  const res = await api.post<{
    success: boolean;
    data: { payout: RawPayoutResponse };
  }>("sellers/wallet/request-payout", {
    amount: data.amount,
    payout_setting_id: data.payoutSettingId,
  });

  return withdrawalResponseSchema.parse({
    id: res.data.payout.id,
    amount: res.data.payout.amount,
    fee:
      res.data.payout.fee_amount ??
      Math.round(res.data.payout.amount * 0.01),
    netAmount:
      res.data.payout.net_amount ??
      res.data.payout.amount - (res.data.payout.fee_amount ?? 0),
    status: res.data.payout.status,
    estimatedDate: res.data.payout.estimated_date ?? "24 à 48h ouvrées",
  });
}

// ── Transformers ──────────────────────────────────────────

/**
 * Build an empty wallet response for vendors with no store wallet.
 */
function _buildEmptyWalletData(): VendorWalletData {
  return {
    kpis: [
      {
        id: "available-balance",
        label: "Solde disponible",
        value: "0",
        subValue: "FCFA",
        icon: "wallet",
        gradient: "from-emerald-50 via-green-50/60 to-teal-50/40",
        iconBg:
          "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
      },
      {
        id: "pending-amount",
        label: "En attente",
        value: "0",
        subValue: "FCFA",
        icon: "clock",
        gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
        iconBg:
          "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
      },
      {
        id: "total-withdrawn",
        label: "Total retiré",
        value: "0",
        subValue: "FCFA",
        icon: "arrow-down-to-line",
        gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40",
        iconBg:
          "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
      },
      {
        id: "total-revenue",
        label: "Revenus total",
        value: "0",
        subValue: "FCFA",
        icon: "trending-up",
        gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
        iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
      },
    ],
    revenueChart: [],
    nextPayout: {
      amount: 0,
      scheduledDate: "—",
      method: null,
      minThreshold: 10000,
    },
    transactions: [],
    payoutMethods: [],
  };
}

/**
 * Transform raw wallet + payout settings into the composite VendorWalletData shape.
 */
function _transformWalletData(
  wallet: RawWallet,
  payoutSettings: RawPayoutSetting[],
): unknown {
  const entries = wallet.entries ?? [];
  const credits = entries.filter((e) => e.type === "credit");
  const debits = entries.filter((e) => e.type === "debit");

  const totalCredits = credits.reduce((sum, e) => sum + e.amount, 0);
  const totalDebits = debits.reduce((sum, e) => sum + e.amount, 0);

  // Count pending payout holds
  const pendingHolds = debits
    .filter((e) => e.reason === "payout_hold")
    .reduce((sum, e) => sum + e.amount, 0);

  // Build KPIs
  const kpis: WalletKpi[] = [
    {
      id: "available-balance",
      label: "Solde disponible",
      value: wallet.balance_amount.toLocaleString("fr-FR"),
      subValue: "FCFA",
      icon: "wallet",
      gradient: "from-emerald-50 via-green-50/60 to-teal-50/40",
      iconBg:
        "bg-gradient-to-br from-emerald-400 to-green-500 text-white",
    },
    {
      id: "pending-amount",
      label: "En attente",
      value: pendingHolds.toLocaleString("fr-FR"),
      subValue: "FCFA",
      badge: pendingHolds > 0 ? "En cours" : undefined,
      badgeColor:
        pendingHolds > 0 ? "text-amber-600 bg-amber-50" : undefined,
      icon: "clock",
      gradient: "from-amber-50 via-yellow-50/60 to-orange-50/40",
      iconBg:
        "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",
    },
    {
      id: "total-withdrawn",
      label: "Total retiré",
      value: totalDebits.toLocaleString("fr-FR"),
      subValue: "FCFA",
      icon: "arrow-down-to-line",
      gradient: "from-blue-50 via-indigo-50/60 to-violet-50/40",
      iconBg:
        "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
    },
    {
      id: "total-revenue",
      label: "Revenus total",
      value: totalCredits.toLocaleString("fr-FR"),
      subValue: "FCFA",
      icon: "trending-up",
      gradient: "from-sugu-50 via-sugu-100/60 to-sugu-200/40",
      iconBg: "bg-gradient-to-br from-sugu-400 to-sugu-500 text-white",
    },
  ];

  // Build revenue chart from credit entries (grouped by day)
  const revenueChart: WalletRevenuePoint[] =
    _aggregateRevenueChart(credits);

  // Transform entries to WalletEntry[]
  const transactions: WalletEntry[] = entries.map((e) => ({
    id: e.id,
    type: e.type,
    amount: e.amount,
    description: _buildEntryDescription(e),
    referenceType: e.reference_type,
    referenceId: e.reference_id,
    status: _deriveEntryStatus(e),
    date: formatDateFr(e.booked_at || e.created_at),
    dateRaw: e.booked_at || e.created_at,
  }));

  // Transform payout settings to PayoutMethod[] for the wallet card
  const payoutMethods: PayoutMethod[] = payoutSettings
    .filter((s) => s.status === 1) // only active
    .map(_transformPayoutSettingToPayoutMethod);

  // Build next payout info
  const defaultMethod =
    payoutMethods.find((m) => m.isDefault) ?? payoutMethods[0] ?? null;

  return {
    kpis,
    revenueChart,
    nextPayout: {
      amount: wallet.balance_amount,
      scheduledDate: "—",
      method: defaultMethod,
      minThreshold: 10000,
    },
    transactions,
    payoutMethods,
  };
}

/**
 * Aggregate credit entries into revenue chart points (last 7 unique days).
 */
function _aggregateRevenueChart(
  credits: RawWalletEntry[],
): WalletRevenuePoint[] {
  const dayMap = new Map<string, number>();

  for (const entry of credits) {
    const dateStr = entry.booked_at || entry.created_at;
    const date = new Date(dateStr);
    const dayLabel = new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(date);
    dayMap.set(dayLabel, (dayMap.get(dayLabel) ?? 0) + entry.amount);
  }

  return Array.from(dayMap.entries())
    .map(([day, value]) => ({ day, value }))
    .slice(-7);
}

/**
 * Build a human-readable description from a raw wallet entry.
 * The backend uses `reason` (and reference_type) rather than `description`.
 */
function _buildEntryDescription(entry: RawWalletEntry): string {
  const reason = entry.reason;
  const refType = entry.reference_type;

  // Known reason mappings
  const reasonMap: Record<string, string> = {
    order_payment: "Paiement commande",
    payout_hold: "Retrait en attente",
    commission: "Commission SUGU",
    refund: "Remboursement",
    adjustment: "Ajustement",
  };

  if (reason && reasonMap[reason]) {
    const base = reasonMap[reason];
    if (entry.reference_id) {
      const shortRef = entry.reference_id.slice(-8).toUpperCase();
      return `${base} #${shortRef}`;
    }
    return base;
  }

  // Fallback: derive from reference_type
  if (refType === "order") {
    const shortRef = entry.reference_id
      ? entry.reference_id.slice(-8).toUpperCase()
      : "";
    return `Commande ${shortRef ? `#${shortRef}` : ""}`.trim();
  }
  if (refType === "payout") return "Retrait";
  if (refType === "commission") return "Commission";

  // Ultimate fallback
  return entry.type === "credit" ? "Crédit" : "Débit";
}

/**
 * Derive a display status for a wallet entry.
 * All persisted entries are "confirmed" unless they're payout holds (pending).
 */
function _deriveEntryStatus(entry: RawWalletEntry): string {
  if (entry.reason === "payout_hold") return "pending";
  return "confirmed";
}

// ── Payout Setting Transformers ───────────────────────────

/**
 * Slugify a provider name (e.g. "OrangeMoney" → "orange_money").
 */
function _slugifyProvider(provider: string): string {
  return provider
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/**
 * Humanize a PascalCase provider name (e.g. "OrangeMoney" → "Orange Money").
 */
function _humanizeProvider(provider: string): string {
  return provider.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/**
 * Mask a phone number (e.g. "+22670001234" → "•••• 00 12 34").
 * Shows last 8 characters formatted as 3 pairs of digits.
 */
function _maskPhone(e164: string): string {
  if (e164.length < 8) return e164;
  const last8 = e164.slice(-8);
  return `•••• ${last8.slice(0, 2)} ${last8.slice(2, 4)} ${last8.slice(4, 6)}`;
}

/**
 * Format an ISO date to a short French date (e.g. "15 Fév").
 */
function _formatShortDate(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

/**
 * Transform a raw backend StorePayoutSetting → frontend PayoutSetting.
 */
function _transformPayoutSetting(raw: RawPayoutSetting): PayoutSetting {
  return {
    id: raw.id,
    type: raw.type === "bank_account" ? "bank_transfer" : raw.type,
    provider: raw.mm_provider ? _slugifyProvider(raw.mm_provider) : null,
    providerLabel: raw.mm_provider
      ? _humanizeProvider(raw.mm_provider)
      : "Virement Bancaire",
    accountMasked: raw.mm_msisdn_e164
      ? _maskPhone(raw.mm_msisdn_e164)
      : raw.account_number ?? raw.iban ?? "—",
    bankName: raw.bank_name ?? null,
    isDefault: raw.is_default,
    status: raw.status,
    addedDate: _formatShortDate(raw.created_at),
  };
}

/**
 * Transform a raw backend StorePayoutSetting → frontend PayoutMethod.
 * (Simpler shape used in the wallet "Next Payout" card.)
 */
function _transformPayoutSettingToPayoutMethod(
  raw: RawPayoutSetting,
): PayoutMethod {
  return {
    id: raw.id,
    provider: raw.mm_provider ? _slugifyProvider(raw.mm_provider) : "bank",
    providerLabel: raw.mm_provider
      ? _humanizeProvider(raw.mm_provider)
      : "Virement Bancaire",
    accountMasked: raw.mm_msisdn_e164
      ? _maskPhone(raw.mm_msisdn_e164)
      : raw.account_number ?? "—",
    isDefault: raw.is_default,
  };
}
