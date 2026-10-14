import { expect, test, type Page } from "@playwright/test";
import { failNext, open, received, resetStandIn, signIn, toast } from "./helpers";

// The tickets of a seller: one route for the list, the open ticket and the
// form of a new one, against the stand-in of e2e/messaging/mock-messaging.mjs.

test.beforeEach(async ({ page, baseURL }) => {
  await signIn(page, baseURL);
  await resetStandIn(page, baseURL);
});

const rows = (page: Page) => page.locator("[data-ticket]");
const row = (page: Page, id: string) => page.locator(`[data-ticket="${id}"]`);
const ticket = (page: Page) => page.locator("[data-ticket-thread]");
const replies = (page: Page) => ticket(page).locator("[data-reply]");
const field = (page: Page) => ticket(page).locator("[data-composer] textarea");
const sendButton = (page: Page) => ticket(page).locator("[data-composer] [data-send]");
const posts = async (page: Page, baseURL: string | undefined, path: RegExp) => (await received(page, baseURL)).received.filter((entry) => path.test(entry.path) && (entry.method === "POST" || entry.clientId !== undefined));

test("lists the tickets with their real status, the latest activity first", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets");
  await expect(page.getByRole("heading", { level: 1, name: "Support" })).toBeVisible();
  await expect(rows(page)).toHaveCount(15);

  await expect(rows(page).first()).toContainText("#TKT-261012-0045");
  await expect(rows(page).first()).toContainText("Problème de paiement");
  // Six statuses on the server, five labels: resolved and closed are two.
  await expect(row(page, "ticket-0045").locator("[data-status='open']")).toHaveText("Ouvert");
  await expect(row(page, "ticket-0042").locator("[data-status='pending_internal']")).toHaveText("En cours");
  await expect(row(page, "ticket-0040").locator("[data-status='pending_customer']")).toHaveText("Réponse attendue");
  await expect(row(page, "ticket-0038").locator("[data-status='resolved']")).toHaveText("Résolu");
  await expect(row(page, "ticket-0035").locator("[data-status='closed']")).toHaveText("Fermé");

  // Twenty tickets, fifteen a page: the second page is the server's.
  await page.getByRole("button", { name: "Page suivante" }).click();
  await expect(rows(page)).toHaveCount(5);
  expect((await received(page, baseURL)).received.some((entry) => entry.path === "/sellers/support/tickets" && entry.page === "2")).toBe(true);
});

test("filters by status and searches on the server", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets");
  await expect(rows(page)).toHaveCount(15);

  await page.getByRole("combobox", { name: "Statut" }).selectOption("active");
  await expect(rows(page)).toHaveCount(4);
  await expect(page.locator("[data-ticket] [data-status='closed'], [data-ticket] [data-status='resolved']")).toHaveCount(0);
  expect((await received(page, baseURL)).received.some((entry) => entry.status === "open,pending_customer,pending_internal,escalated")).toBe(true);

  await page.getByRole("combobox", { name: "Statut" }).selectOption("done");
  await expect(rows(page)).toHaveCount(15);
  await expect(page.locator("[data-ticket] [data-status='open']")).toHaveCount(0);

  await page.getByRole("combobox", { name: "Statut" }).selectOption("all");
  await page.getByRole("searchbox", { name: "Rechercher un ticket" }).fill("stock");
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Erreur de stock");

  await page.getByRole("searchbox", { name: "Rechercher un ticket" }).fill("rien de tel");
  await expect(page.getByText("Aucun ticket ne correspond")).toBeVisible();
});

test("opens a ticket beside the list: its exchanges, its file, what is known of it", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets", { width: 1440 });
  await row(page, "ticket-0045").click();
  await expect(page).toHaveURL(/\/vendor\/tickets\?ticket=ticket-0045$/);

  await expect(ticket(page).getByRole("heading", { level: 2, name: "#TKT-261012-0045" })).toBeVisible();
  await expect(ticket(page)).toContainText("Problème de paiement");
  await expect(replies(page)).toHaveCount(2);
  await expect(replies(page).nth(0)).toContainText("Moi");
  await expect(replies(page).nth(1)).toContainText("Support SUGU");
  await expect(replies(page).nth(1)).toContainText("nous vérifions votre dossier");

  const image = ticket(page).getByRole("img", { name: "capture-ecran.png" });
  expect(await image.getAttribute("src")).toMatch(/^\/api\/proxy\/sellers\/support\/tickets\/ticket-0045\/messages\/[0-9A-Z]{26}\/attachments\/\d+$/);

  const facts = page.locator("[data-ticket-facts]");
  await expect(facts).toContainText("Ouvert");
  await expect(facts).toContainText("Paiement");
  await expect(facts).toContainText("Normale");
  await expect(facts).toContainText("Date de création");
  await expect(facts).toContainText("Dernière activité");
  // What the server does not give a seller is not drawn: no agent, no deadline, nothing to edit.
  await expect(facts.getByRole("combobox")).toHaveCount(0);
  await expect(page.getByText(/SLA|Agent|Assigné|Délai de réponse/)).toHaveCount(0);

  // The list is still there, and the row is marked.
  await expect(row(page, "ticket-0045")).toHaveAttribute("aria-current", "page");
});

test("replies with a file; the reply is written once and the status follows the server", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets?ticket=ticket-0040");
  await expect(ticket(page).locator("[data-status='pending_customer']")).toBeVisible();
  await expect(replies(page)).toHaveCount(2);

  // A reply needs words: a file alone does not leave.
  await ticket(page).locator("[data-composer] input[type='file']").setInputFiles({ name: "bon.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await expect(sendButton(page)).toBeDisabled();

  await field(page).fill("C'est la commande SU-2099-00123.");
  await sendButton(page).click();
  await sendButton(page).click({ force: true }).catch(() => undefined);

  await expect(replies(page)).toHaveCount(3);
  await expect(replies(page).last()).toContainText("C'est la commande SU-2099-00123.");
  await expect(replies(page).last()).toContainText("bon.pdf");
  // The author's reply brought the ticket back from waiting.
  await expect(ticket(page).locator("[data-status='open']")).toBeVisible();
  await expect(row(page, "ticket-0040").locator("[data-status='open']")).toBeVisible();

  const sent = await posts(page, baseURL, /tickets\/ticket-0040\/messages$/);
  expect(sent).toHaveLength(1);
  expect(sent[0].files).toEqual(["bon.pdf"]);
});

test("a reply that did not leave is said so, kept, and sent again with the same identifier", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets?ticket=ticket-0045");
  await expect(replies(page)).toHaveCount(2);
  await failNext(page, baseURL, ["error"]);

  await field(page).fill("Avez-vous du nouveau ?");
  await sendButton(page).click();

  const alert = ticket(page).getByRole("alert").filter({ hasText: "Votre réponse n'a pas été envoyée" });
  await expect(alert).toBeVisible();
  await expect(replies(page)).toHaveCount(2);

  await alert.getByRole("button", { name: "Réessayer" }).click();
  await expect(replies(page)).toHaveCount(3);
  await expect(alert).toHaveCount(0);

  const sent = await posts(page, baseURL, /tickets\/ticket-0045\/messages$/);
  expect(sent).toHaveLength(2);
  expect(sent[1].clientId).toBe(sent[0].clientId);
});

test("a resolved ticket still takes a reply and can be closed; a closed one takes nothing", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets?ticket=ticket-0038");
  await expect(ticket(page).locator("[data-status='resolved']")).toBeVisible();
  await expect(field(page)).toBeVisible();

  await ticket(page).getByRole("button", { name: "Actions du ticket" }).click();
  await page.getByRole("menuitem", { name: "Fermer le ticket" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("ne reçoit plus de réponse");
  await confirm.getByRole("button", { name: "Fermer le ticket" }).click();

  await expect(toast(page, "Ticket fermé.")).toBeVisible();
  await expect(ticket(page).locator("[data-status='closed']")).toBeVisible();
  await expect(ticket(page).getByText("Ce ticket est fermé")).toBeVisible();
  await expect(field(page)).toHaveCount(0);
  await expect(ticket(page).getByRole("button", { name: "Actions du ticket" })).toHaveCount(0);

  // Already closed on arrival: the same.
  await row(page, "ticket-0035").click();
  await expect(ticket(page).getByRole("heading", { level: 2, name: "#TKT-261004-0035" })).toBeVisible();
  await expect(field(page)).toHaveCount(0);
  await expect(ticket(page).getByRole("button", { name: "Actions du ticket" })).toHaveCount(0);
});

test("the ticket a buyer opened about the store is answered, not closed, by the seller", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets?ticket=ticket-0036", { width: 1440 });
  await expect(ticket(page).getByRole("heading", { level: 2, name: "#TKT-261008-0036" })).toBeVisible();
  await expect(page.locator("[data-ticket-facts]")).toContainText("Ouvert par");
  await expect(page.locator("[data-ticket-facts]")).toContainText("Issa Compaoré");
  await expect(replies(page).first()).not.toContainText("Moi");
  await expect(ticket(page).getByRole("button", { name: "Actions du ticket" })).toHaveCount(0);
  await expect(field(page)).toBeVisible();
});

test("creates a ticket: what is missing is said, one request leaves, and it opens once the server has answered", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets");
  await page.getByRole("link", { name: "Nouveau ticket" }).first().click();
  await expect(page).toHaveURL(/\/vendor\/tickets\?new=1$/);
  const form = page.getByRole("form", { name: "Nouveau ticket" });
  await expect(form.getByRole("textbox", { name: /^Sujet/ })).toBeFocused();

  await form.getByRole("button", { name: "Créer le ticket" }).click();
  await expect(form.getByText("Indiquez le sujet de votre demande.")).toBeVisible();
  await expect(form.getByText("Choisissez une catégorie.")).toBeVisible();
  await expect(form.getByText("Décrivez votre demande.")).toBeVisible();
  expect(await posts(page, baseURL, /^\/sellers\/support\/tickets$/)).toHaveLength(0);

  await form.getByRole("textbox", { name: /^Sujet/ }).fill("Virement non reçu");
  await form.getByRole("combobox", { name: /^Catégorie/ }).selectOption("payment");
  await form.getByRole("textbox", { name: /^Description/ }).fill("Mon retrait du 10 octobre n'est pas arrivé sur mon compte.");
  await expect(form.getByText("58 / 5000")).toBeVisible();

  const create = form.getByRole("button", { name: "Créer le ticket" });
  await create.click();
  await create.click({ force: true }).catch(() => undefined);

  await expect(toast(page, /Ticket #TKT-NEW-\d+ créé\./)).toBeVisible();
  await expect(page).toHaveURL(/\/vendor\/tickets\?ticket=ticket-new-\d+$/);
  await expect(ticket(page)).toContainText("Virement non reçu");
  await expect(replies(page)).toHaveCount(1);
  await expect(replies(page).first()).toContainText("Mon retrait du 10 octobre");
  await expect(rows(page).first()).toContainText("Virement non reçu");

  const created = await posts(page, baseURL, /^\/sellers\/support\/tickets$/);
  expect(created).toHaveLength(1);
  expect(Object.keys(created[0].body).sort()).toEqual(["category", "description", "store_id", "subject"]);
  expect(created[0].body).toMatchObject({ subject: "Virement non reçu", description: "Mon retrait du 10 octobre n'est pas arrivé sur mon compte.", category: "payment" });
  expect(String(created[0].body.store_id)).toBe("11");
});

test("a ticket the server did not create is not announced, and what was typed stays", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets?new=1");
  const form = page.getByRole("form", { name: "Nouveau ticket" });
  await form.getByRole("textbox", { name: /^Sujet/ }).fill("Panne");
  await form.getByRole("combobox", { name: /^Catégorie/ }).selectOption("other");
  await form.getByRole("textbox", { name: /^Description/ }).fill("Texte à ne pas perdre.");
  await form.getByRole("button", { name: "Créer le ticket" }).click();

  await expect(form.getByRole("alert")).toContainText("Le serveur a rencontré un problème");
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  await expect(page).toHaveURL(/\?new=1$/);
  await expect(form.getByRole("textbox", { name: /^Description/ })).toHaveValue("Texte à ne pas perdre.");
});

test("on a phone: the list, then the ticket over the screen, then back", async ({ page, baseURL }) => {
  await open(page, baseURL, "/vendor/tickets", { width: 390 });
  await expect(page.getByRole("button", { name: "Tous (20)" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Ouverts (4)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Résolus (16)" })).toBeVisible();

  await page.getByRole("button", { name: "Ouverts (4)" }).click();
  await expect(rows(page)).toHaveCount(4);

  await row(page, "ticket-0045").click();
  await expect(ticket(page).getByRole("heading", { level: 2, name: "#TKT-261012-0045" })).toBeVisible();
  await expect(rows(page).first()).toBeHidden();
  // What the side panel says on a desktop is said in the header here.
  await expect(ticket(page)).toContainText("Paiement · Priorité normale");
  await expect(field(page)).toBeInViewport();

  await ticket(page).getByRole("link", { name: "Retour aux tickets" }).click();
  await expect(page).toHaveURL(/\/vendor\/tickets$/);
  await expect(rows(page).first()).toBeVisible();
});
