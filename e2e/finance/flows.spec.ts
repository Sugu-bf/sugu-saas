import { expect, test, type Page, type Route } from "@playwright/test";
import { ALL, PROFILES, api, confirmation, dialog, figures, francs, notice, open, post, textOf, toast, typeAmount, type Profile } from "./helpers";

// What the money screens do with what the server answers: they show its
// figures, ask it for every page and every filter, send a withdrawal once,
// and say what they do not know. The server is the stand-in of
// mock-finance.mjs: these are checks of the portal, not of Laravel.

const requests = (page: Page) => page.getByRole("list", { name: "Demandes de retrait" }).getByRole("listitem");
const methodCards = (page: Page) => page.getByRole("list", { name: "Méthodes de paiement" }).getByRole("listitem");
const summaryOf = async (page: Page, profile: Profile) => (await api(page, `${PROFILES[profile].wallet}/summary`)).body.data;

// ── Overview ────────────────────────────────────────────────

for (const profile of ALL) {
  test(`${profile}: the overview shows the figures of the server and leads to the four other screens`, async ({ page, baseURL }) => {
    await open(page, baseURL, profile);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(PROFILES[profile].title);
    const data = await summaryOf(page, profile);

    const shown = await textOf(figures(page));
    expect(shown).toContain(PROFILES[profile].balance);
    expect(shown).toContain(francs(data.balance.available));
    expect(shown).toContain(francs(data.balance.in_withdrawal));
    expect(shown).toContain(francs(data.earned.total));
    expect(shown).toContain(francs(data.period.earned));
    if (profile === "vendor") expect(shown).not.toContain("Espèces à reverser");
    else expect(shown).toContain(francs(data.cash_held));

    const main = page.locator("main");
    const base = PROFILES[profile].base;
    await expect(main.getByRole("link", { name: "Demander un retrait" })).toHaveAttribute("href", `${base}/withdraw`);
    await expect(main.getByRole("link", { name: /Méthodes de paiement/ })).toHaveAttribute("href", `${base}/methods`);
    await expect(main.getByRole("link", { name: /Demandes de retrait/ })).toHaveAttribute("href", `${base}/withdrawals`);
    await expect(main.getByRole("link", { name: "Voir tout" })).toHaveAttribute("href", `${base}/history`);
    await expect(main.getByRole("link", { name: /Demandes de retrait/ })).toContainText("1 en cours sur 3 possibles");

    // The five last movements, the newest first, as the server orders them.
    const entries = (await api(page, `${PROFILES[profile].wallet}/entries?per_page=5`)).body.data;
    const rows = main.locator("ul[aria-label]").first().getByRole("listitem");
    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toContainText(entries[0].reference.number);
  });
}

test("another month is asked of the server, and the balance stays today's", async ({ page, baseURL }) => {
  await open(page, baseURL, "agency", "", { width: 1280 });
  const now = await summaryOf(page, "agency");
  const before = (await api(page, `${PROFILES.agency.wallet}/summary?month=2026-09`)).body.data;
  expect(before.period.earned).not.toBe(now.period.earned);

  const [answer] = await Promise.all([page.waitForResponse((response) => response.url().includes("/wallet/summary") && response.url().includes("month=2026-09")), page.getByLabel("Mois affiché").selectOption("2026-09")]);
  expect(answer.status()).toBe(200);
  await expect(page).toHaveURL(/mois=2026-09/);
  await expect(page.locator("main")).toContainText("Septembre 2026 :");
  const shown = await textOf(figures(page));
  expect(shown).toContain(francs(before.period.earned));
  expect(shown).toContain(francs(now.balance.available));

  // The agency reads how its customers paid: the three shares add up to the month.
  const ring = page.locator("main").getByRole("img", { name: /Revenus de livraison de septembre 2026/ });
  await expect(ring).toBeVisible();
  expect(before.period.by_payment.online + before.period.by_payment.cod + before.period.by_payment.cod_mixte).toBe(before.period.earned);
});

test("a failure of the server is shown as a failure, never as a balance of zero", async ({ page, baseURL }) => {
  let failing = true;
  await page.route(/\/api\/proxy\/sellers\/wallet\/summary/, (route) => (failing ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Server Error" }) }) : route.continue()));
  await open(page, baseURL, "vendor");

  await expect(notice(page, "Impossible d'afficher vos finances")).toBeVisible({ timeout: 20_000 });
  await expect(figures(page)).toHaveCount(0);
  expect(await textOf(page.locator("main"))).not.toMatch(/\d FCFA/);
  expect(await textOf(page.locator("main"))).not.toContain("Server Error");

  failing = false;
  await page.locator("main").getByRole("button", { name: /Réessayer/ }).click();
  await expect(figures(page)).toContainText("Solde disponible");
});

test("an expired session sends back to the sign-in page", async ({ page, baseURL }) => {
  await open(page, baseURL, "courier");
  await page.context().clearCookies();
  await page.goto("/driver/earnings/history");
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

// ── History ─────────────────────────────────────────────────

test("the history is paged, filtered and searched by the server", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/history", { width: 1280 });
  const first = (await api(page, "sellers/wallet/entries?per_page=20")).body;
  const list = page.locator("main ul[aria-label]").first().getByRole("listitem");

  await expect(page.getByRole("tab", { name: /Toutes/ })).toContainText(String(first.meta.counts.all));
  await expect(list).toHaveCount(20);
  await expect(list.first()).toContainText(first.data[0].reference.number);
  expect(first.meta.total).toBeGreaterThan(20);

  // Page 2 is another request, not a slice of the first.
  const [second] = await Promise.all([page.waitForResponse((response) => response.url().includes("/wallet/entries") && /[?&]page=2/.test(response.url())), page.getByRole("navigation", { name: /Pagination/ }).getByRole("button", { name: /^(Page )?2$/ }).or(page.getByRole("button", { name: "Page suivante" })).first().click()]);
  const secondBody = await second.json();
  await expect(page).toHaveURL(/page=2/);
  await expect(list.first()).toContainText(secondBody.data[0].reference?.number ?? "Ajustement");

  // A kind.
  const [withdrawals] = await Promise.all([page.waitForResponse((response) => response.url().includes("kind=withdrawal")), page.getByRole("tab", { name: /^Retraits\s*\d/ }).click()]);
  expect((await withdrawals.json()).meta.total).toBe(first.meta.counts.withdrawal);
  await expect(page).toHaveURL(/type=retraits/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(list).toHaveCount(first.meta.counts.withdrawal);
  await expect(list.first().locator("[data-status]")).toHaveAttribute("data-status", "pending");

  // A search, typed: asked once the typing pauses.
  await page.getByRole("tab", { name: /Toutes/ }).click();
  await expect(page).not.toHaveURL(/type=/);
  const [searched] = await Promise.all([page.waitForResponse((response) => response.url().includes("search=002080")), page.getByRole("searchbox").fill("002080")]);
  expect((await searched.json()).meta.total).toBe(1);
  await expect(list).toHaveCount(1);
  await expect(list.first()).toContainText("SU-2026-002080");

  // Nothing found is said as such, with the way out.
  await page.getByRole("searchbox").fill("introuvable-xyz");
  await expect(page.locator("main").getByText("Aucune opération ne correspond")).toBeVisible();
  await page.locator("main").getByRole("button", { name: "Tout afficher" }).click();
  await expect(list).toHaveCount(20);
});

test("a row of the history opens what the server knows of it", async ({ page, baseURL }) => {
  await open(page, baseURL, "courier", "/history?type=retraits");
  const list = page.locator("main ul[aria-label]").first().getByRole("listitem");
  await list.filter({ hasText: "PO-RT0010CC" }).getByRole("button").click();

  const sheet = dialog(page);
  await expect(sheet).toContainText("Retrait PO-RT0010CC");
  await expect(sheet).toContainText("Demande de retrait");
  await expect(sheet).toContainText("Montant net");
  await expect(sheet.locator("[data-status]")).toHaveAttribute("data-status", "rejected");
  // A courier reads "Mission", an agency "Livraison": the same entry, the word of each.
  await page.keyboard.press("Escape");
  await page.goto("/driver/earnings/history");
  await expect(list.first()).toContainText("Mission #SU-2026-002087");
});

test("a range of days whose end is before its start is not sent", async ({ page, baseURL }) => {
  await open(page, baseURL, "agency", "/history?du=2026-10-10&au=2026-10-01", { width: 1280 });
  await expect(notice(page, "La date de fin est avant la date de début.")).toBeVisible();
  const log = (await (await page.request.get("/api/proxy/__log")).json()).requests as string[];
  expect(log.filter((entry) => entry.includes("from=2026-10-10") && entry.includes("to=2026-10-01"))).toEqual([]);
});

// ── Requests ────────────────────────────────────────────────

test("the requests are listed by state, with what each state means", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/withdrawals");
  await expect(page.getByRole("tab", { name: /Toutes/ })).toContainText("4");
  await expect(requests(page)).toHaveCount(4);
  await expect(requests(page).first()).toContainText("PO-RT0012AA");

  const [answer] = await Promise.all([page.waitForResponse((response) => response.url().includes("state=closed")), page.getByRole("tab", { name: /Refusés ou annulés/ }).click()]);
  expect((await answer.json()).meta.total).toBe(1);
  await expect(requests(page)).toHaveCount(1);

  await requests(page).first().getByRole("button").click();
  const sheet = dialog(page);
  await expect(sheet).toContainText("La demande a été refusée. Le montant a été restitué à votre solde.");
  await expect(sheet).toContainText("Le nom du titulaire ne correspond pas au compte.");
  await page.keyboard.press("Escape");

  // Paid is said of a request the server says paid, and of no other.
  await page.getByRole("tab", { name: /Payés/ }).click();
  await expect(requests(page)).toHaveCount(2);
  for (const row of await requests(page).all()) await expect(row.locator("[data-status]")).toHaveAttribute("data-status", "paid");
  await page.getByRole("tab", { name: /En cours/ }).click();
  await expect(requests(page)).toHaveCount(1);
  await expect(requests(page).first()).not.toContainText("Payé");
});

// ── Withdrawal ──────────────────────────────────────────────

for (const profile of ALL) {
  test(`${profile}: a withdrawal is asked in three steps and shown as the server recorded it`, async ({ page, baseURL }) => {
    await open(page, baseURL, profile, "/withdraw");
    const before = await summaryOf(page, profile);
    // An amount whose fee, at 1 %, does not fall on a whole franc.
    const amount = profile === "courier" ? 12_345_00 : 123_457_00;
    const quote = (await api(page, `${PROFILES[profile].wallet}/quote?amount=${amount}`)).body.data;
    expect(quote.acceptable).toBe(true);
    expect(quote.net_amount % 100).toBe(0);

    await expect(page.getByRole("button", { name: "Continuer" })).toBeDisabled();
    await typeAmount(page, String(amount / 100));
    const recap = page.getByRole("region", { name: "Récapitulatif" });
    await expect.poll(() => textOf(recap)).toContain(francs(quote.net_amount));
    expect(await textOf(recap)).toContain(francs(quote.fee_amount));
    if (profile === "vendor") expect(quote.fee_amount).toBe(0);
    else expect(quote.fee_amount).toBeGreaterThan(Math.floor(amount * 0.01));

    await page.getByRole("button", { name: "Continuer" }).click();
    const choice = page.getByRole("group", { name: "Méthode de paiement" });
    // Two verified methods; the one waiting for its verification is not offered.
    await expect(choice.getByRole("radio")).toHaveCount(2);
    await expect(choice.getByRole("radio").first()).toBeChecked();
    await expect(choice).not.toContainText("Coris Bank");
    await choice.getByText("Moov Money").click();
    await page.getByRole("button", { name: "Continuer" }).click();

    const review = page.locator("main");
    await expect(review.getByRole("heading", { name: "Vérifiez avant de confirmer" })).toBeVisible();
    await expect(review).toContainText("Moov Money");
    await expect(review).toContainText("+226******33");
    await expect(review.getByText("Demande enregistrée")).toHaveCount(0);

    const [answer] = await Promise.all([page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(PROFILES[profile].request)), page.getByRole("button", { name: "Confirmer le retrait" }).click()]);
    expect(answer.status()).toBe(201);
    const sent = answer.request().postDataJSON();
    expect(sent).toMatchObject({ amount, payout_setting_id: "method-2" });
    expect(String(sent.idempotency_key).length).toBeGreaterThan(10);

    await expect(review.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
    await expect(review.locator("[data-status]").first()).toHaveAttribute("data-status", "pending");
    await expect(review).not.toContainText("Payé");
    expect(await textOf(review)).toContain(francs(quote.net_amount));

    const after = await summaryOf(page, profile);
    expect(after.balance.available).toBe(before.balance.available - amount);
    expect(after.balance.in_withdrawal).toBe(before.balance.in_withdrawal + amount);

    await review.getByRole("link", { name: "Voir mes demandes" }).click();
    await expect(requests(page)).toHaveCount(5);
    await expect(requests(page).first()).toContainText(francs(amount).replace(" FCFA", ""));
    await expect(page.getByRole("tab", { name: /En cours/ })).toContainText("2");
  });
}

test("the refusal of an amount is the sentence of the server, under the field", async ({ page, baseURL }) => {
  await open(page, baseURL, "agency", "/withdraw");
  const next = page.getByRole("button", { name: "Continuer" });

  for (const [typed, sentence] of [
    ["5000", "Montant minimum de retrait : 10 000 FCFA."],
    ["1500000", /Solde insuffisant\. Disponible : [\d ]+ FCFA\./],
    ["3000000", "Montant maximum par retrait : 2 000 000 FCFA."],
  ] as const) {
    await typeAmount(page, typed);
    await expect(page.locator("main").getByText(sentence)).toBeVisible();
    await expect(page.getByLabel("Montant à retirer")).toHaveAttribute("aria-invalid", "true");
    await expect(next).toBeDisabled();
  }

  await page.getByLabel("Montant à retirer").fill("12,5");
  await expect(page.locator("main").getByText("Saisissez un montant en francs CFA, sans décimales.")).toBeVisible();
  await expect(next).toBeDisabled();

  // « Max » is what can be asked now: the balance in whole francs, under the ceilings.
  const data = await summaryOf(page, "agency");
  await page.getByRole("button", { name: "Max" }).click();
  const most = Math.min(data.balance.available, data.limits.max_amount, data.limits.daily_remaining);
  await expect(page.getByLabel("Montant à retirer")).toHaveValue(francs(most - (most % 100)).replace(" FCFA", ""));
  await expect(next).toBeEnabled();
});

/** Goes to the last step with the minimum amount and the default method. */
async function toReview(page: Page, typed: string) {
  await typeAmount(page, typed);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { name: "Vérifiez avant de confirmer" })).toBeVisible();
}

test("a double click on the confirmation sends one request", async ({ page, baseURL }) => {
  await open(page, baseURL, "courier", "/withdraw");
  await toReview(page, "5000");
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("courier/withdrawals")) sent.push(request.postData() ?? "");
  });
  await page.getByRole("button", { name: "Confirmer le retrait" }).dblclick();
  await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
  expect(sent).toHaveLength(1);
  expect((await api(page, "courier/withdrawals")).body.meta.counts.in_progress).toBe(2);
});

test("an answer lost on the way is not called a failure: the request is found again, and not sent twice", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/withdraw");
  await toReview(page, "25000");
  const before = await summaryOf(page, "vendor");

  // The server records the request; its answer never reaches the browser.
  let posts = 0;
  await page.route(/\/api\/proxy\/sellers\/wallet\/request-payout$/, async (route: Route) => {
    posts += 1;
    await route.fetch();
    await route.abort("connectionreset");
  });

  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible({ timeout: 30_000 });
  expect(posts).toBe(1);

  const after = await summaryOf(page, "vendor");
  expect(after.balance.available).toBe(before.balance.available - 25_000_00);
  expect(after.limits.pending_count).toBe(before.limits.pending_count + 1);
});

test("when nothing can be confirmed, the screen says so and offers to check — then finds the request", async ({ page, baseURL }) => {
  await open(page, baseURL, "agency", "/withdraw");
  await toReview(page, "40000");
  const before = await summaryOf(page, "agency");

  let offline = true;
  let posts = 0;
  await page.route(/\/api\/proxy\/agencies\/21\/withdrawals$/, async (route: Route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts += 1;
    await route.fetch();
    await route.abort("connectionreset");
  });
  await page.route(/\/api\/proxy\/agencies\/21\/wallet\/lookup/, (route: Route) => (offline ? route.abort("internetdisconnected") : route.continue()));

  const confirm = page.getByRole("button", { name: "Confirmer le retrait" });
  await confirm.click();
  await expect(notice(page, "Nous n'avons pas pu confirmer votre demande.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toHaveCount(0);
  // Not sent again from here: it is looked for.
  await expect(confirm).toBeDisabled();

  offline = false;
  await page.getByRole("button", { name: "Vérifier l'état de la demande" }).click();
  await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
  expect(posts).toBe(1);
  expect((await summaryOf(page, "agency")).balance.available).toBe(before.balance.available - 40_000_00);
});

test("a request the server never received can be sent again, under the same key", async ({ page, baseURL }) => {
  await open(page, baseURL, "courier", "/withdraw");
  await toReview(page, "6000");

  const keys: string[] = [];
  let down = true;
  await page.route(/\/api\/proxy\/courier\/withdrawals$/, async (route: Route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().postDataJSON().idempotency_key);
    return down ? route.fulfill({ status: 502, contentType: "application/json", body: "{}" }) : route.continue();
  });

  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  // The server holds nothing under this key: it is a failure, said without a word of the server's.
  await expect(notice(page, "Le serveur a rencontré un problème. Réessayez dans un instant.")).toBeVisible({ timeout: 30_000 });
  expect((await api(page, "courier/withdrawals")).body.meta.counts.in_progress).toBe(1);

  down = false;
  await page.getByRole("button", { name: "Confirmer le retrait" }).click();
  await expect(page.getByRole("heading", { name: "Demande enregistrée" })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect((await api(page, "courier/withdrawals")).body.meta.counts.in_progress).toBe(2);
});

test("at three requests in progress the withdrawal is no longer offered, in the server's words", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor");
  for (const key of ["cap-1", "cap-2"]) {
    expect((await post(page, baseURL, "sellers/wallet/request-payout", { amount: 5_000_00, payout_setting_id: "method-1", idempotency_key: key })).status).toBe(201);
  }
  // The same key again is the same request, not a fourth.
  expect((await post(page, baseURL, "sellers/wallet/request-payout", { amount: 5_000_00, payout_setting_id: "method-1", idempotency_key: "cap-2" })).status).toBe(201);
  const refused = await post(page, baseURL, "sellers/wallet/request-payout", { amount: 5_000_00, payout_setting_id: "method-1", idempotency_key: "cap-3" });
  expect(refused.status).toBe(422);

  await page.reload();
  await expect(notice(page, "Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter.")).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Demander un retrait" })).toHaveCount(0);
  await expect(page.locator("main").getByRole("button", { name: "Demander un retrait" })).toBeDisabled();

  await page.goto("/vendor/wallet/withdraw");
  await expect(notice(page, "Vous avez déjà 3 demandes de retrait en attente. Veuillez patienter.")).toBeVisible();
  await expect(page.getByLabel("Montant à retirer")).toHaveCount(0);
});

// ── Payout methods ──────────────────────────────────────────

for (const profile of ALL) {
  test(`${profile}: a method is declared, waits for its verification, and is not offered for a withdrawal`, async ({ page, baseURL }) => {
    await open(page, baseURL, profile, "/methods");
    await expect(methodCards(page)).toHaveCount(3);
    // The number is never on the page in full.
    expect(await textOf(page.locator("main"))).not.toMatch(/\+226\d{8}|BF42BF/);
    await expect(methodCards(page).filter({ hasText: "Coris Bank" }).locator('[data-status="pending"]')).toHaveCount(1);
    await expect(methodCards(page).filter({ hasText: "Orange Money" }).locator("[data-status]")).toHaveCount(0);

    await page.locator("main").getByRole("button", { name: "Ajouter", exact: true }).click();
    const form = dialog(page);
    // The operators are those the server declares.
    await expect(form.getByRole("combobox", { name: /Opérateur/ }).locator("option")).toHaveText(["Choisir un opérateur", "Orange Money", "Moov Money", "Wave", "MTN Money"]);

    await form.getByRole("button", { name: "Ajouter la méthode" }).click();
    await expect(form.getByText("Choisissez l'opérateur.")).toBeVisible();
    await form.getByRole("combobox", { name: /Opérateur/ }).selectOption("wave");
    await form.getByLabel("Numéro mobile money").fill("70 55 44 33");
    await form.getByLabel("Titulaire du compte").fill("Recette V5");
    await form.getByRole("button", { name: "Ajouter la méthode" }).click();
    await expect(form.getByText(/Saisissez le numéro au format international/)).toBeVisible();

    await form.getByLabel("Numéro mobile money").fill("+226 70 55 44 33");
    const [created] = await Promise.all([page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(PROFILES[profile].methods)), form.getByRole("button", { name: "Ajouter la méthode" }).click()]);
    expect(created.status()).toBe(201);
    expect(created.request().postDataJSON()).toEqual({ type: "mobile_money", mm_provider: "wave", mm_msisdn_e164: "+22670554433", mm_account_name: "Recette V5", is_default: false });

    await expect(toast(page, /SUGU la vérifie avant votre premier retrait/)).toBeVisible();
    await expect(methodCards(page)).toHaveCount(4);
    const card = methodCards(page).filter({ hasText: "Wave" });
    await expect(card.locator('[data-status="pending"]')).toHaveCount(1);
    await expect(card).toContainText("+226******33");
    await expect(card).not.toContainText("70554433");

    // Not verified: the wizard does not offer it.
    await page.goto(`${PROFILES[profile].base}/withdraw`);
    await toReview(page, "10000");
    await expect(page.locator("main")).not.toContainText("Wave");
    await page.getByRole("button", { name: "Retour" }).click();
    await expect(page.getByRole("group", { name: "Méthode de paiement" }).getByRole("radio")).toHaveCount(2);
    await expect(page.getByRole("group", { name: "Méthode de paiement" })).toContainText("2 autres méthodes attendent la vérification de SUGU");
  });
}

test("a method is made the default one, and removed after a confirmation", async ({ page, baseURL }) => {
  await open(page, baseURL, "courier", "/methods");
  const moov = methodCards(page).filter({ hasText: "Moov Money" });
  await moov.getByRole("button", { name: /^Actions pour/ }).click();
  await page.getByRole("menuitem", { name: "Définir par défaut" }).click();
  await expect(toast(page, "Moov Money est maintenant votre méthode par défaut.")).toBeVisible();
  await expect(moov).toContainText("Par défaut");
  await expect(methodCards(page).filter({ hasText: "Orange Money" })).not.toContainText("Par défaut");
  // A courier has no route to modify a method.
  await moov.getByRole("button", { name: /^Actions pour/ }).click();
  await expect(page.getByRole("menuitem", { name: "Modifier" })).toHaveCount(0);

  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await expect(confirmation(page)).toContainText("ne pourra plus recevoir de retrait");
  await confirmation(page).getByRole("button", { name: "Annuler" }).click();
  await expect(methodCards(page)).toHaveCount(3);

  await moov.getByRole("button", { name: /^Actions pour/ }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await confirmation(page).getByRole("button", { name: "Supprimer" }).click();
  await expect(toast(page, "Méthode de paiement supprimée.")).toBeVisible();
  await expect(methodCards(page)).toHaveCount(2);
});

test("a method a withdrawal is addressed to cannot be removed: the refusal of the server is said", async ({ page, baseURL }) => {
  await open(page, baseURL, "agency", "/methods");
  const orange = methodCards(page).filter({ hasText: "Orange Money" });
  await orange.getByRole("button", { name: /^Actions pour/ }).click();
  await page.getByRole("menuitem", { name: "Supprimer" }).click();
  await confirmation(page).getByRole("button", { name: "Supprimer" }).click();
  await expect(toast(page, "Un retrait est en cours sur ce compte. Suppression impossible.")).toBeVisible();
  await expect(methodCards(page)).toHaveCount(3);
});

test("a vendor modifies a method, which then waits for a new verification", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor", "/methods");
  const moov = methodCards(page).filter({ hasText: "Moov Money" });
  await expect(moov.locator("[data-status]")).toHaveCount(0);
  await moov.getByRole("button", { name: /^Actions pour/ }).click();
  await page.getByRole("menuitem", { name: "Modifier" }).click();

  const form = dialog(page);
  await expect(form).toContainText("Cette méthode est vérifiée.");
  // The number is typed again: the server never gives it back.
  await expect(form.getByLabel("Numéro mobile money")).toHaveValue("+226");
  await form.getByLabel("Numéro mobile money").fill("+22660998877");
  const [updated] = await Promise.all([page.waitForResponse((response) => response.request().method() === "PUT"), form.getByRole("button", { name: "Enregistrer" }).click()]);
  expect(updated.status()).toBe(200);
  await expect(moov.locator('[data-status="pending"]')).toHaveCount(1);
  await expect(moov).toContainText("+226******77");
});

test("without a method, the screens say so and lead to the form; an outage is not an absence", async ({ page, baseURL }) => {
  let mode: "empty" | "down" = "empty";
  await page.route(/\/api\/proxy\/courier\/payout-settings$/, (route: Route) =>
    route.request().method() !== "GET" ? route.continue() : mode === "empty" ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) }) : route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  );
  await open(page, baseURL, "courier", "/methods");
  await expect(page.locator("main").getByText("Aucune méthode de paiement")).toBeVisible();
  await expect(page.locator("main").getByRole("button", { name: "Ajouter une méthode" })).toBeVisible();

  await page.goto("/driver/earnings");
  await expect(page.locator("main").getByRole("link", { name: /Méthodes de paiement/ })).toContainText("Aucune méthode : ajoutez-en une pour retirer");

  mode = "down";
  await page.goto("/driver/earnings/methods");
  await expect(page.locator("main").getByText("Méthodes de paiement indisponibles")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("main").getByText("Aucune méthode de paiement")).toHaveCount(0);
  await expect(page.locator("main").getByRole("button", { name: "Ajouter", exact: true })).toHaveCount(0);
});

// ── Isolation ───────────────────────────────────────────────

test("a profile reads its own money: the routes of the others are refused, their screens are not served", async ({ page, baseURL }) => {
  await open(page, baseURL, "vendor");
  for (const path of ["agencies/21/wallet/summary", "agencies/21/withdrawals", "agencies/21/payout-settings", "courier/wallet/summary", "courier/withdrawals", "stores/12/payout-settings"]) {
    expect((await api(page, path)).status, path).toBe(403);
  }
  expect((await post(page, baseURL, "agencies/21/withdrawals", { amount: 10_000_00, payout_setting_id: "method-1" })).status).toBe(403);

  for (const path of ["/agency/earnings", "/driver/earnings/withdraw"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/vendor\//);
  }
});

test("an account the server refuses is told so, not shown an empty wallet", async ({ page, baseURL }) => {
  await page.route(/\/api\/proxy\/agencies\/21\/wallet\/summary/, (route: Route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Agence introuvable ou accès refusé." }) }));
  await open(page, baseURL, "agency");
  await expect(notice(page, "Accès réservé")).toBeVisible();
  await expect(page.locator("main")).toContainText("Agence introuvable ou accès refusé.");
  await expect(figures(page)).toHaveCount(0);
  await expect(page.locator("main").getByRole("link", { name: "Demander un retrait" })).toHaveCount(0);
});
