// Money endpoints for the V5 smoke (playwright.finance.config.ts), plugged
// into e2e/shell/mock-api.mjs. Payloads and rules follow ProWalletController,
// WalletStatementService, WithdrawalService, PayoutPolicies and
// PayoutSettingService (../sugu): amounts in centimes, the fee rounded so
// that the net is whole francs, the bounds, the cap of pending requests, one
// withdrawal per idempotency key, a method born unverified, and the refusals
// with their sentences. One independent wallet per session token, so tests
// can ask for withdrawals and declare methods without seeing each other.
// Nothing here reaches a real backend, and nothing here is a proof that the
// real one behaves so: e2e/staging/finance.staging.spec.ts is.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** The moment the data set is built around: 12 October 2026 at 16:00 (the specs fix the browser clock on it). */
export function fixtureNow() {
  return new Date(2026, 9, 12, 16, 0, 0, 0).getTime();
}

const iso = (time) => new Date(time).toISOString();
const francs = (centimes) => `${Math.trunc(centimes / 100).toLocaleString("fr-FR").replace(/\s/g, " ")} FCFA`;

/** PayoutPolicies, in centimes. */
const POLICIES = {
  seller: { min: 5_000_00, max: 5_000_000_00, daily: 10_000_000_00, maxPending: 3, feeRate: 0 },
  delivery_partner: { min: 10_000_00, max: 2_000_000_00, daily: 5_000_000_00, maxPending: 3, feeRate: 0.01 },
  courier: { min: 5_000_00, max: 2_000_000_00, daily: 5_000_000_00, maxPending: 3, feeRate: 0.01 },
};

const PROVIDERS = { orange_money: "Orange Money", moov_money: "Moov Money", wave: "Wave", mtn_money: "MTN Money" };

/** WithdrawalService::quote. */
function quote(amount, rate) {
  let fee = Math.round(amount * rate);
  let net = amount - fee;
  if (net % 100 !== 0) {
    net -= net % 100;
    fee = amount - net;
  }
  return { amount, fee_amount: fee, net_amount: net };
}

const maskPhone = (phone) => phone.replace(/(\+\d{3})\d+(\d{2})/, "$1******$2");

// ── Seed ────────────────────────────────────────────────────

function payoutMethod(id, fields) {
  return { id, type: "mobile_money", provider: "orange_money", bank: null, account: "+22670123456", holder: "Awa Traoré", is_default: false, verified: true, status: 1, ...fields };
}

function seed(kind, now) {
  const at = (days, hours = 0) => now - days * DAY - hours * HOUR;
  const earning = kind === "seller" ? "sale" : "delivery";
  const refType = kind === "seller" ? "order" : "shipment";
  const unit = kind === "seller" ? 1 : kind === "courier" ? 0.3 : 1.4;

  const payouts = [];
  const entries = [];
  let sequence = 0;
  const entry = (fields) => entries.push({ id: `entry-${++sequence}`, direction: "credit", kind: earning, booked_at: at(0), reference: null, detail: null, payout_id: null, ...fields });

  // Sales or deliveries, spread over six months: 26 of them in October, so that the history has a second page.
  const amounts = [12_500_00, 18_000_00, 25_000_00, 8_900_00, 15_000_00, 32_000_00, 6_500_00, 21_000_00];
  for (let index = 0; index < 26; index += 1) {
    const number = `SU-2026-00${String(2087 - index).padStart(4, "0")}`;
    const amount = Math.round((amounts[index % amounts.length] * unit) / 100) * 100;
    entry({
      amount,
      booked_at: at(Math.floor(index / 2.4), 2 + (index % 5)),
      reference: { type: refType, id: `${refType}-${2087 - index}`, number },
      detail: kind === "seller" ? `Vente #${number} — net après commission 10%` : kind === "courier" ? `Commission livraison #${number} (70%)` : `Frais livraison #${number} — part agence (30%)`,
      mode: index % 5 === 0 ? "cod_mixte" : index % 3 === 0 ? "cod" : "online",
    });
  }
  for (let month = 1; month <= 5; month += 1) {
    for (let index = 0; index < 6; index += 1) {
      const number = `SU-2026-00${String(1900 - month * 40 - index).padStart(4, "0")}`;
      entry({ amount: Math.round((amounts[(month + index) % amounts.length] * unit * (1 - month * 0.1)) / 100) * 100, booked_at: at(month * 30 + index * 3), reference: { type: refType, id: `${refType}-old-${month}-${index}`, number }, detail: null, mode: "online" });
    }
  }
  entry({ kind: "adjustment", amount: Math.round((5_000_00 * unit) / 100) * 100 || 500_00, booked_at: at(5, 6) });

  const policy = POLICIES[kind];
  const payout = (id, number, amount, status, days, extra = {}) => {
    const row = { id, payout_number: number, ...quote(amount, policy.feeRate), status, method: "mobile_money", destination_masked: "+226******56", requested_at: iso(at(days, 7)), approved_at: null, paid_at: status === "paid" ? iso(at(days - 1, 3)) : null, note_public: null, idempotency_key: null, method_id: "method-1", ...extra };
    payouts.push(row);
    entry({ direction: "debit", kind: "withdrawal", amount, booked_at: at(days, 7), reference: { type: "payout", id, number }, payout_id: id });
    if (status === "rejected" || status === "canceled") entry({ kind: "withdrawal_released", amount, booked_at: at(days - 1, 2), reference: { type: "payout", id, number }, payout_id: id });
    return row;
  };
  const base = policy.min;
  payout("payout-12", "PO-RT0012AA", base * 3, "pending", 2);
  payout("payout-11", "PO-RT0011BB", base * 4, "paid", 9);
  payout("payout-10", "PO-RT0010CC", base * 2, "rejected", 16, { note_public: "Le nom du titulaire ne correspond pas au compte." });
  payout("payout-09", "PO-RT0009DD", base * 5, "paid", 34);

  entries.sort((a, b) => b.booked_at - a.booked_at);

  const methods = [
    payoutMethod("method-1", { is_default: true }),
    payoutMethod("method-2", { provider: "moov_money", account: "+22660112233", holder: "Awa Traoré" }),
    payoutMethod("method-3", { type: "bank_account", provider: null, bank: "Coris Bank", account: "BF42BF0840101300463574001234", verified: false, status: 0 }),
  ];

  return { kind, policy, entries, payouts, methods, active: true, storeActive: true, cashHeld: kind === "seller" ? null : kind === "courier" ? 38_000_00 : 320_500_00, sequence: 100 };
}

const wallets = new Map();
function walletOf(token, profile) {
  if (!wallets.has(token)) wallets.set(token, seed(profile.user_type, fixtureNow()));
  return wallets.get(token);
}

// ── Projections ─────────────────────────────────────────────

const balance = (wallet) => wallet.entries.reduce((sum, row) => sum + (row.direction === "credit" ? row.amount : -row.amount), 0);
const inFlight = (wallet) => wallet.payouts.filter((row) => ["pending", "approved", "processing"].includes(row.status));
const earnings = (wallet) => wallet.entries.filter((row) => row.direction === "credit" && (row.kind === "sale" || row.kind === "delivery"));
const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
const monthOf = (time) => {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

function payoutOut(row) {
  return { id: row.id, payout_number: row.payout_number, amount: row.amount, fee_amount: row.fee_amount, net_amount: row.net_amount, currency: "XOF", status: row.status, status_label: null, method: row.method, destination_masked: row.destination_masked, requested_at: row.requested_at, approved_at: row.approved_at, paid_at: row.paid_at, failure_code: null, note_public: row.note_public, estimated_date: "24 à 48h ouvrées" };
}

function entryOut(wallet, row) {
  const payout = row.payout_id ? wallet.payouts.find((entry) => entry.id === row.payout_id) : null;
  return { id: row.id, direction: row.direction, amount: row.amount, kind: row.kind, booked_at: iso(row.booked_at), reference: row.reference, detail: row.detail, status: row.kind === "withdrawal" && payout ? payout.status : "booked", payout: payout ? payoutOut(payout) : null };
}

function methodOut(row, vendor) {
  const mobile = row.type === "mobile_money";
  const masked = mobile ? maskPhone(row.account) : `****${row.account.slice(-4)}`;
  const shared = {
    id: row.id,
    type: mobile ? "mobile_money" : "bank_transfer",
    provider: mobile ? row.provider : row.bank.toLowerCase().replace(/ /g, "_"),
    provider_label: mobile ? PROVIDERS[row.provider] ?? row.provider : row.bank,
    account_masked: masked,
    account_name: row.holder,
    is_default: row.is_default,
    is_verified: row.verified,
    is_payable: row.verified && row.status === 1,
    status: row.status,
  };
  // The vendor routes keep the name `bank_account` and the older columns, masked.
  return vendor ? { ...shared, type: row.type, mm_provider: row.provider, mm_msisdn_e164: mobile ? masked : null, bank_name: row.bank, account_holder_name: mobile ? null : row.holder, iban: mobile ? null : masked } : shared;
}

function blockedOf(wallet) {
  if (wallet.kind === "seller" && !wallet.storeActive) return { code: "store_inactive", message: "Votre boutique doit être active pour effectuer un retrait." };
  if (!wallet.active) return { code: "wallet_suspended", message: "Ce portefeuille est suspendu. Aucune opération n'est autorisée." };
  if (inFlight(wallet).length >= wallet.policy.maxPending) return { code: "pending_cap", message: `Vous avez déjà ${wallet.policy.maxPending} demandes de retrait en attente. Veuillez patienter.` };
  return null;
}

function dailyUsed(wallet, now) {
  return sum(wallet.payouts.filter((row) => Date.parse(row.requested_at) >= now - DAY && !["rejected", "canceled"].includes(row.status)));
}

function summaryOf(wallet, month, now) {
  const policy = wallet.policy;
  const earned = earnings(wallet);
  const current = monthOf(now);
  const asked = month ?? current;
  const inMonth = earned.filter((row) => monthOf(row.booked_at) === asked);
  const monthly = [];
  for (let back = 5; back >= 0; back -= 1) {
    const date = new Date(now);
    date.setDate(1);
    date.setMonth(date.getMonth() - back);
    const key = monthOf(date.getTime());
    monthly.push({ month: key, amount: sum(earned.filter((row) => monthOf(row.booked_at) === key)) });
  }
  const blocked = blockedOf(wallet);
  const data = {
    currency: "XOF",
    amounts_in: "centimes",
    wallet: { exists: true, is_active: wallet.active },
    balance: { available: balance(wallet), in_withdrawal: sum(inFlight(wallet)), withdrawn: sum(wallet.payouts.filter((row) => row.status === "paid")) },
    earned: { total: sum(earned), this_month: sum(earned.filter((row) => monthOf(row.booked_at) === current)), last_30_days: sum(earned.filter((row) => row.booked_at >= now - 30 * DAY)), count_this_month: earned.filter((row) => monthOf(row.booked_at) === current).length },
    series: [],
    monthly,
    period: {
      month: asked,
      earned: sum(inMonth),
      count: inMonth.length,
      by_payment: { online: sum(inMonth.filter((row) => row.mode === "online")), cod: sum(inMonth.filter((row) => row.mode === "cod")), cod_mixte: sum(inMonth.filter((row) => row.mode === "cod_mixte")) },
      withdrawal_fees: wallet.payouts.filter((row) => monthOf(Date.parse(row.requested_at)) === asked && !["rejected", "canceled"].includes(row.status)).reduce((total, row) => total + row.fee_amount, 0),
      withdrawn: sum(wallet.payouts.filter((row) => row.paid_at && monthOf(Date.parse(row.paid_at)) === asked)),
    },
    limits: { min_amount: policy.min, max_amount: policy.max, daily_limit: policy.daily, daily_remaining: Math.max(0, policy.daily - dailyUsed(wallet, now)), max_pending: policy.maxPending, pending_count: inFlight(wallet).length, fee_rate: policy.feeRate },
    withdrawal: { allowed: blocked === null, blocked },
    payout_methods: { types: ["mobile_money", "bank_account"], mobile_money_providers: Object.entries(PROVIDERS).map(([code, label]) => ({ code, label })) },
  };
  if (wallet.cashHeld !== null) data.cash_held = wallet.cashHeld;
  return data;
}

/** WithdrawalService::refusalFor, in its order. */
function refusalFor(wallet, amount, now) {
  const policy = wallet.policy;
  if (!wallet.active) return "Ce portefeuille est suspendu. Aucune opération n'est autorisée.";
  if (!Number.isInteger(amount) || amount <= 0 || amount % 100 !== 0) return "Le montant doit être un nombre entier de francs CFA.";
  if (amount < policy.min) return `Montant minimum de retrait : ${francs(policy.min)}.`;
  if (amount > policy.max) return `Montant maximum par retrait : ${francs(policy.max)}.`;
  if (amount > balance(wallet)) return `Solde insuffisant. Disponible : ${francs(balance(wallet))}.`;
  if (inFlight(wallet).length >= policy.maxPending) return `Vous avez déjà ${policy.maxPending} demandes de retrait en attente. Veuillez patienter.`;
  const remaining = Math.max(0, policy.daily - dailyUsed(wallet, now));
  if (amount > remaining) return `Limite journalière de retrait atteinte. Maximum restant : ${francs(remaining)}.`;
  return null;
}

const page = (rows, url) => {
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page")) || 20));
  const current = Math.max(1, Number(url.searchParams.get("page")) || 1);
  return { rows: rows.slice((current - 1) * perPage, current * perPage), meta: { current_page: current, last_page: Math.max(1, Math.ceil(rows.length / perPage)), per_page: perPage, total: rows.length } };
};

const KINDS = ["sale", "delivery", "withdrawal", "withdrawal_released", "dispute", "adjustment"];
const STATES = { in_progress: ["pending", "approved", "processing"], paid: ["paid"], closed: ["failed", "rejected", "canceled"] };

// ── Routes ──────────────────────────────────────────────────

/** The owner a path addresses, by the profile that may read it: `null` when it is somebody else's. */
function scopeOf(path, profile) {
  const kind = profile.user_type;
  let match;
  if ((match = /^\/sellers\/wallet(\/.*)?$/.exec(path))) return kind === "seller" ? { area: "wallet", rest: match[1] ?? "" } : { refused: [404, { success: false, message: "Aucun store trouvé pour ce vendeur." }] };
  if ((match = /^\/stores\/(\d+)\/payout-settings$/.exec(path))) return kind === "seller" && Number(match[1]) === profile.store.id ? { area: "methods", rest: "" } : { refused: [403, { message: "This action is unauthorized." }] };
  if ((match = /^\/stores\/payout-settings\/([^/]+)(\/set-default)?$/.exec(path))) return kind === "seller" ? { area: "methods", rest: `/${match[1]}${match[2] ?? ""}` } : { refused: [403, { message: "This action is unauthorized." }] };
  if ((match = /^\/agencies\/(\d+)\/(wallet|withdrawals|payout-settings)(\/.*)?$/.exec(path))) {
    if (kind !== "delivery_partner" || Number(match[1]) !== profile.agency.id) return { refused: [403, { message: "Agence introuvable ou accès refusé." }] };
    return { area: match[2] === "payout-settings" ? "methods" : match[2], rest: match[3] ?? "" };
  }
  if ((match = /^\/courier\/(wallet|withdrawals|payout-settings)(\/.*)?$/.exec(path))) {
    if (kind !== "courier") return { refused: [403, { message: "Accès réservé aux livreurs." }] };
    return { area: match[1] === "payout-settings" ? "methods" : match[1], rest: match[2] ?? "" };
  }
  return null;
}

export default async function finance({ req, res, url, path, method, profile, token, send, readJson }) {
  const scope = scopeOf(path, profile);
  if (!scope) return false;
  if (scope.refused) return send(res, ...scope.refused), true;

  const wallet = walletOf(token, profile);
  const now = fixtureNow();
  const vendor = wallet.kind === "seller";
  const answer = (status, body) => (send(res, status, body), true);

  // ── Statement ──
  if (scope.area === "wallet" && method === "GET") {
    if (scope.rest === "/summary") {
      const month = url.searchParams.get("month");
      if (month && !/^\d{4}-\d{2}$/.test(month)) return answer(422, { message: "Le champ month ne correspond pas au format Y-m.", errors: { month: ["Format invalide."] } });
      return answer(200, { success: true, data: summaryOf(wallet, month, now) });
    }
    if (scope.rest === "/entries") {
      const kind = url.searchParams.get("kind");
      if (kind && !KINDS.includes(kind)) return answer(422, { message: "Le type est invalide.", errors: { kind: ["Le type est invalide."] } });
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
      const within = wallet.entries.filter((row) => {
        const day = new Date(row.booked_at - new Date(row.booked_at).getTimezoneOffset() * MIN).toISOString().slice(0, 10);
        return (!from || day >= from) && (!to || day <= to) && (!search || (row.detail ?? "").toLowerCase().includes(search));
      });
      const counts = { all: within.length };
      for (const entry of KINDS) counts[entry] = within.filter((row) => row.kind === entry).length;
      const { rows, meta } = page(kind ? within.filter((row) => row.kind === kind) : within, url);
      return answer(200, { success: true, data: rows.map((row) => entryOut(wallet, row)), meta: { ...meta, counts } });
    }
    if (scope.rest === "/quote") {
      const raw = url.searchParams.get("amount");
      if (raw === null || !/^\d+$/.test(raw)) return answer(422, { message: "Le montant doit être un entier.", errors: { amount: ["Le montant doit être un entier."] } });
      const amount = Number(raw);
      const refusal = refusalFor(wallet, amount, now);
      return answer(200, { success: true, data: { ...quote(amount, wallet.policy.feeRate), fee_rate: wallet.policy.feeRate, acceptable: refusal === null, refusal } });
    }
    if (scope.rest === "/lookup") {
      const found = wallet.payouts.find((row) => row.idempotency_key && row.idempotency_key === url.searchParams.get("idempotency_key"));
      return answer(200, { success: true, data: found ? payoutOut(found) : null });
    }
  }

  // ── Withdrawals ──
  const history = (vendor && scope.area === "wallet" && scope.rest === "/payouts") || (scope.area === "withdrawals" && scope.rest === "");
  if (history && method === "GET") {
    const state = url.searchParams.get("state");
    const sorted = [...wallet.payouts].sort((a, b) => Date.parse(b.requested_at) - Date.parse(a.requested_at));
    const counts = { all: sorted.length };
    for (const [key, statuses] of Object.entries(STATES)) counts[key] = sorted.filter((row) => statuses.includes(row.status)).length;
    const { rows, meta } = page(state && STATES[state] ? sorted.filter((row) => STATES[state].includes(row.status)) : sorted, url);
    return answer(200, { success: true, data: rows.map(payoutOut), meta: { ...meta, counts } });
  }

  const asks = (vendor && scope.area === "wallet" && scope.rest === "/request-payout") || (scope.area === "withdrawals" && scope.rest === "");
  if (asks && method === "POST") {
    const body = await readJson(req);
    const replay = body.idempotency_key ? wallet.payouts.find((row) => row.idempotency_key === body.idempotency_key) : null;
    const wrap = (row) => (vendor ? { success: true, message: "Demande de retrait envoyée.", data: { payout: payoutOut(row) } } : { success: true, data: payoutOut(row) });
    if (replay) return answer(201, wrap(replay));

    if (vendor && !wallet.storeActive) return answer(422, { success: false, message: "Votre boutique doit être active pour effectuer un retrait." });
    const amount = body.amount;
    if (!Number.isInteger(amount)) return answer(422, { message: "Le montant doit être un entier (exprimé en centimes).", errors: { amount: ["Le montant doit être un entier (exprimé en centimes)."] } });
    const target = wallet.methods.find((row) => row.id === body.payout_setting_id);
    if (!target) return answer(422, { success: false, message: "Méthode de versement introuvable." });
    if (!(target.verified && target.status === 1)) return answer(422, { success: false, message: "Cette méthode de versement n'est pas encore vérifiée. Contactez le support." });
    const refusal = refusalFor(wallet, amount, now);
    if (refusal) return answer(422, { success: false, message: refusal });

    const id = `payout-${++wallet.sequence}`;
    const number = `PO-QA${String(wallet.sequence).padStart(6, "0")}`;
    const row = { id, payout_number: number, ...quote(amount, wallet.policy.feeRate), status: "pending", method: target.type === "mobile_money" ? "mobile_money" : "bank", destination_masked: methodOut(target, false).account_masked, requested_at: iso(now), approved_at: null, paid_at: null, note_public: null, idempotency_key: body.idempotency_key ?? null, method_id: target.id };
    wallet.payouts.push(row);
    wallet.entries.unshift({ id: `entry-new-${wallet.sequence}`, direction: "debit", kind: "withdrawal", amount, booked_at: now, reference: { type: "payout", id, number }, detail: null, payout_id: id });
    return answer(201, wrap(row));
  }

  // ── Payout methods ──
  if (scope.area === "methods") {
    const one = (row) => (vendor ? { payout_setting: methodOut(row, true) } : methodOut(row, false));

    if (scope.rest === "" && method === "GET") {
      const rows = [...wallet.methods].sort((a, b) => Number(b.is_default) - Number(a.is_default)).map((row) => methodOut(row, vendor));
      return answer(200, { success: true, data: vendor ? { payout_settings: rows } : rows });
    }

    if (scope.rest === "" && method === "POST") {
      const body = await readJson(req);
      const errors = {};
      if (body.type === "mobile_money") {
        if (!body.mm_provider) errors.mm_provider = ["Le fournisseur Mobile Money est requis."];
        if (!/^\+[1-9]\d{6,14}$/.test(body.mm_msisdn_e164 ?? "")) errors.mm_msisdn_e164 = ["Le numéro Mobile Money doit être au format international (ex : +22670000000)."];
        if (!vendor && !body.mm_account_name) errors.mm_account_name = ["Le nom du titulaire du compte Mobile Money est requis."];
      } else if (body.type === "bank_account") {
        if (!body.bank_name) errors.bank_name = ["Le nom de la banque est requis."];
        if (!body.account_holder_name) errors.account_holder_name = ["Le nom du titulaire du compte est requis."];
        if (!body.iban && !body.account_number) errors.account_number = ["Un IBAN ou un numéro de compte est requis pour un virement bancaire."];
        if (body.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(body.iban)) errors.iban = ["Le format IBAN est invalide."];
      } else errors.type = ["Type de compte invalide. Valeurs acceptées : mobile_money, bank_account."];
      if (Object.keys(errors).length) return answer(422, { message: Object.values(errors)[0][0], errors });

      const account = body.type === "mobile_money" ? body.mm_msisdn_e164 : (body.iban ?? body.account_number);
      if (wallet.methods.some((row) => row.account === account)) return answer(422, { success: false, message: "Ce compte de versement est déjà enregistré." });

      const first = wallet.methods.length === 0;
      if (body.is_default || first) wallet.methods.forEach((row) => (row.is_default = false));
      // Whatever is sent, a method is born a draft nobody but an operator verifies.
      const row = payoutMethod(`method-${++wallet.sequence}`, { type: body.type, provider: body.mm_provider ?? null, bank: body.bank_name ?? null, account, holder: body.mm_account_name ?? body.account_holder_name ?? null, is_default: Boolean(body.is_default) || first, verified: false, status: 0 });
      wallet.methods.push(row);
      return answer(201, { success: true, message: "Compte de versement enregistré. Il doit être vérifié avant tout retrait.", data: one(row) });
    }

    const target = /^\/([^/]+)(\/set-default)?$/.exec(scope.rest);
    const row = target ? wallet.methods.find((entry) => entry.id === target[1]) : null;
    if (target && !row) return answer(404, { success: false, message: "Compte de versement introuvable." });
    const open = row ? wallet.payouts.some((entry) => entry.method_id === row.id && ["pending", "approved", "processing", "failed"].includes(entry.status)) : false;

    if (row && target[2] && method === "POST") {
      wallet.methods.forEach((entry) => (entry.is_default = entry === row));
      return answer(200, { success: true, data: one(row) });
    }
    if (row && !target[2] && method === "DELETE") {
      if (open) return answer(409, { success: false, message: "Un retrait est en cours sur ce compte. Suppression impossible." });
      wallet.methods.splice(wallet.methods.indexOf(row), 1);
      return answer(200, { success: true, message: "Compte de versement supprimé." });
    }
    if (row && !target[2] && method === "PUT" && vendor) {
      const body = await readJson(req);
      if (open) return answer(409, { success: false, message: "Un retrait est en cours sur ce compte. Modification impossible." });
      Object.assign(row, { type: body.type, provider: body.mm_provider ?? null, bank: body.bank_name ?? null, account: body.type === "mobile_money" ? body.mm_msisdn_e164 : (body.iban ?? body.account_number), holder: body.mm_account_name ?? body.account_holder_name ?? row.holder, verified: false, status: 0 });
      return answer(200, { success: true, message: "Compte de versement mis à jour. Il doit être vérifié à nouveau avant tout retrait.", data: one(row) });
    }
  }

  return false;
}
