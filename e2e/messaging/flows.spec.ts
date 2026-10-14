import { expect, test, type Page } from "@playwright/test";
import {
  AGENCY,
  COURIER,
  bubbles,
  conversation,
  conversations,
  failNext,
  field,
  incoming,
  open,
  peerRead,
  peerTyping,
  pendingBubbles,
  received,
  resetStandIn,
  scroller,
  sendButton,
  signIn,
  socket,
  thread,
  toast,
} from "./helpers";

// What a seller, a courier and an agency do with their conversations, against
// the stand-in of e2e/messaging/mock-messaging.mjs and its socket.

test.beforeEach(async ({ page, baseURL }) => {
  await signIn(page, baseURL);
  await resetStandIn(page, baseURL);
  await socket(page, baseURL, false);
});

const sends = async (page: Page, baseURL: string | undefined) => (await received(page, baseURL)).received.filter((entry) => /\/(messages|product-card)$/.test(entry.path));

test.describe("seller: the list", () => {
  test("lists the conversations of the store, the latest first, with what is unread", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages");
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    await expect(conversations(page)).toHaveCount(20);

    const first = conversations(page).first();
    await expect(first).toContainText("Aminata Traoré");
    await expect(first).toContainText("est-ce que ce produit est disponible en taille 43");
    await expect(first).toContainText("2 messages non lus");
    await expect(conversation(page, "conv-shop-02")).toContainText("Merci beaucoup !");
    // A message that is only a picture says so.
    await expect(conversation(page, "conv-shop-04")).toContainText("Photo");
    // What the seller wrote last is theirs.
    await expect(conversation(page, "conv-shop-05")).toContainText("Vous : D'accord, merci.");
    await expect(conversation(page, "conv-shop-09")).toContainText("Fermée");
    await expect(conversation(page, "conv-pickup-01")).toContainText("Coursier · Moussa Kaboré");

    // The menu says how many conversations hold something unread, as the server counts them.
    const badge = page.locator("[data-shell='pro'] a[href='/vendor/messages'] [data-unread-badge]").first();
    await expect(badge).toContainText("2");
    await conversation(page, "conv-shop-02").click();
    await expect(bubbles(page)).toHaveCount(5);
    await expect(badge).toContainText("1");
  });

  test("asks the next page with the cursor of the previous one, and shows each conversation once", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages");
    await expect(conversations(page)).toHaveCount(20);

    await page.getByRole("button", { name: "Afficher plus de conversations" }).click();
    await expect(conversations(page)).toHaveCount(25);
    await expect(page.getByRole("button", { name: "Afficher plus de conversations" })).toHaveCount(0);

    const ids = await conversations(page).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-conversation")));
    expect(new Set(ids).size).toBe(25);

    const asked = (await received(page, baseURL)).received.filter((entry) => entry.path === "/seller/conversations");
    expect(asked.some((entry) => entry.cursor)).toBe(true);
    expect(asked.every((entry) => !("page" in entry))).toBe(true);
  });

  test("searches and filters on the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages");
    await expect(conversations(page)).toHaveCount(20);

    await page.getByRole("searchbox", { name: "Rechercher une conversation" }).fill("compao");
    await expect(conversations(page)).toHaveCount(1);
    await expect(conversations(page).first()).toContainText("Issa Compaoré");
    expect((await received(page, baseURL)).received.some((entry) => entry.q === "compao")).toBe(true);

    await page.getByRole("searchbox", { name: "Rechercher une conversation" }).fill("personne de ce nom");
    await expect(page.getByText("Aucune conversation ne correspond")).toBeVisible();

    await page.getByRole("searchbox", { name: "Rechercher une conversation" }).fill("");
    await page.getByRole("combobox", { name: "Filtrer les conversations" }).selectOption("unread");
    await expect(conversations(page)).toHaveCount(2);
    expect((await received(page, baseURL)).received.some((entry) => entry.unread === "1")).toBe(true);
  });
});

test.describe("seller: a conversation", () => {
  test("opens beside the list, with its history and its product card", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages");
    await conversation(page, "conv-shop-01").click();
    await expect(page).toHaveURL(/\/vendor\/messages\/conv-shop-01$/);

    await expect(thread(page).getByRole("heading", { level: 2, name: "Aminata Traoré" })).toBeVisible();
    await expect(thread(page)).toContainText("En ligne");
    await expect(bubbles(page)).toHaveCount(6);
    // The list stayed where it was.
    await expect(conversations(page)).toHaveCount(20);
    await expect(conversation(page, "conv-shop-01")).toHaveAttribute("aria-current", "page");

    const card = thread(page).locator("[data-product-card='prod-baskets']");
    await expect(card).toContainText("Baskets Classic");
    await expect(card).toContainText("En stock");
    await expect(card).toContainText(/28.000.FCFA/);
    await expect(card.getByRole("link", { name: "Voir le produit" })).toHaveAttribute("href", "/vendor/products/prod-baskets");

    await expect(thread(page).getByRole("link", { name: "Commande SU-2099-00123" })).toHaveAttribute("href", "/vendor/orders/order-123");
    await expect(thread(page).getByRole("link", { name: "Appeler Aminata Traoré" })).toHaveAttribute("href", "tel:+22670123456");
  });

  test("reading a conversation clears its unread, on the server and in the list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages");
    await expect(conversation(page, "conv-shop-01")).toContainText("2 messages non lus");

    await conversation(page, "conv-shop-01").click();
    await expect(bubbles(page)).toHaveCount(6);
    await expect(conversation(page, "conv-shop-01")).not.toContainText("non lu");
    await expect.poll(async () => (await received(page, baseURL)).reads).toBeGreaterThan(0);

    await page.reload();
    await expect(conversation(page, "conv-shop-01")).not.toContainText("non lu");
  });

  test("a message is sent once, whatever the keys and the clicks", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);

    await field(page).fill("Oui, la taille 43 est en stock.");
    await field(page).press("Enter");
    await field(page).press("Enter");
    await sendButton(page).click({ force: true }).catch(() => undefined);

    await expect(bubbles(page)).toHaveCount(7);
    await expect(bubbles(page).last()).toContainText("Oui, la taille 43 est en stock.");
    await expect(bubbles(page).last().locator("[data-mark='sent']")).toBeVisible();
    await expect(pendingBubbles(page)).toHaveCount(0);
    await expect(field(page)).toHaveValue("");

    const sent = await sends(page, baseURL);
    expect(sent).toHaveLength(1);
    expect(sent[0].clientId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    // It is there after a reload, once.
    await page.reload();
    await expect(bubbles(page)).toHaveCount(7);
    await expect(conversation(page, "conv-shop-01")).toContainText("Vous : Oui, la taille 43 est en stock.");
  });

  test("Shift+Enter makes a new line, and an empty message is not sent", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);
    await expect(sendButton(page)).toBeDisabled();

    await field(page).fill("   ");
    await field(page).press("Enter");
    await field(page).fill("Première ligne");
    await field(page).press("Shift+Enter");
    await field(page).pressSequentially("Seconde ligne");
    await field(page).press("Enter");

    await expect(bubbles(page)).toHaveCount(7);
    // Two lines, as typed (a form sends its line breaks as CR LF).
    expect(await bubbles(page).last().locator("p").first().innerText()).toMatch(/^Première ligne\s*\n\s*Seconde ligne$/);
    expect(await sends(page, baseURL)).toHaveLength(1);
  });

  test("a message the server did not take is said not sent, and sent again with the same identifier", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);
    await failNext(page, baseURL, ["error"]);

    await field(page).fill("Je vous réponds dans une minute.");
    await sendButton(page).click();

    const failed = pendingBubbles(page).first();
    await expect(failed).toHaveAttribute("data-state", "failed");
    await expect(failed).toContainText("Je vous réponds dans une minute.");
    await expect(failed.getByRole("alert")).toContainText("Le serveur a rencontré un problème");
    // Never drawn as a sent message.
    await expect(bubbles(page)).toHaveCount(6);

    // The reason and the way out are in view: the thread followed the message as it grew.
    await expect(failed.getByRole("button", { name: "Réessayer" })).toBeInViewport();
    await expect(failed.getByRole("button", { name: "Supprimer" })).toBeInViewport();

    await failed.getByRole("button", { name: "Réessayer" }).click();
    await expect(bubbles(page)).toHaveCount(7);
    await expect(pendingBubbles(page)).toHaveCount(0);

    const sent = await sends(page, baseURL);
    expect(sent).toHaveLength(2);
    expect(sent[1].clientId).toBe(sent[0].clientId);
  });

  test("a message whose answer was lost appears once, as sent", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);
    // Written by the server, and the connection drops before the answer.
    await failNext(page, baseURL, ["lost"]);

    await field(page).fill("Message dont la réponse se perd.");
    await sendButton(page).click();

    await expect(bubbles(page).filter({ hasText: "Message dont la réponse se perd." })).toHaveCount(1);
    await expect(pendingBubbles(page)).toHaveCount(0);

    await page.reload();
    await expect(bubbles(page).filter({ hasText: "Message dont la réponse se perd." })).toHaveCount(1);
    await expect(bubbles(page)).toHaveCount(7);
  });

  test("a failed message can be dropped, and survives going to another conversation", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);
    await failNext(page, baseURL, ["error"]);
    await field(page).fill("À ne pas perdre.");
    await sendButton(page).click();
    await expect(pendingBubbles(page)).toHaveCount(1);

    await conversation(page, "conv-shop-02").click();
    await expect(thread(page).getByRole("heading", { level: 2, name: "Issa Compaoré" })).toBeVisible();
    await expect(pendingBubbles(page)).toHaveCount(0);

    await conversation(page, "conv-shop-01").click();
    await expect(pendingBubbles(page)).toHaveCount(1);
    await expect(pendingBubbles(page).first()).toContainText("À ne pas perdre.");

    await pendingBubbles(page).first().getByRole("button", { name: "Supprimer" }).click();
    await expect(pendingBubbles(page)).toHaveCount(0);
    expect(await sends(page, baseURL)).toHaveLength(1);
  });

  test("shows a picture and a file through the portal, and sends one", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-02");
    await expect(bubbles(page)).toHaveCount(5);

    const image = thread(page).getByRole("img", { name: "colis-abime.png" });
    await expect(image).toBeVisible();
    expect(await image.getAttribute("src")).toMatch(/^\/api\/proxy\/seller\/conversations\/conv-shop-02\/messages\/[0-9A-Z]{26}\/attachments\/\d+$/);
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);

    const download = thread(page).getByRole("link", { name: "Télécharger Bon de retour.pdf" });
    expect(await download.getAttribute("href")).toMatch(/^\/api\/proxy\/seller\/conversations\/conv-shop-02\//);
    await expect(thread(page)).toContainText("245 Ko · PDF");
    // Nothing of the thread points outside the portal.
    expect(await thread(page).locator("a[href^='http'], img[src^='http']").count()).toBe(0);

    await page.locator("[data-composer] input[type='file']").first().setInputFiles({ name: "facture.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
    await expect(page.getByRole("list", { name: "Fichiers à envoyer" })).toContainText("facture.pdf");
    await sendButton(page).click();
    await expect(bubbles(page)).toHaveCount(6);
    await expect(bubbles(page).last()).toContainText("facture.pdf");
    expect((await sends(page, baseURL))[0].files).toEqual(["facture.pdf"]);
  });

  test("refuses a file that cannot be sent before asking the server", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);
    const picker = page.locator("[data-composer] input[type='file']").first();

    await picker.setInputFiles({ name: "outil.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") });
    await expect(page.locator("[data-composer]").getByRole("alert")).toContainText("ce type de fichier n'est pas accepté");
    await expect(page.getByRole("list", { name: "Fichiers à envoyer" })).toHaveCount(0);

    await picker.setInputFiles({ name: "lourd.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    await expect(page.locator("[data-composer]").getByRole("alert")).toContainText("dépasse 10 Mo");
    expect(await sends(page, baseURL)).toHaveLength(0);
  });

  test("shares a product of the store, and only of the store", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);

    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await page.getByRole("menuitem", { name: "Partager un produit" }).click();
    const dialog = page.getByRole("dialog", { name: "Partager un produit" });
    await expect(dialog.getByRole("listitem")).toHaveCount(4);
    await expect(dialog).not.toContainText("Montre d'une autre boutique");
    await expect(dialog).not.toContainText("Sandales tressées");

    await dialog.getByRole("searchbox", { name: "Rechercher un produit" }).fill("pagne");
    await expect(dialog.getByRole("listitem")).toHaveCount(1);
    await dialog.getByRole("button", { name: "Partager Pagne tissé Faso Dan Fani" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(thread(page).locator("[data-product-card='prod-pagne']")).toContainText(/12.500.FCFA/);
    const sent = await sends(page, baseURL);
    expect(sent).toHaveLength(1);
    expect(sent[0].product).toBe("prod-pagne");
  });

  test("reports a message of the other side, never one's own", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-01");
    await expect(bubbles(page)).toHaveCount(6);

    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await page.getByRole("menuitem", { name: "Signaler un message" }).click();
    await expect(thread(page).getByText("Choisissez le message à signaler.")).toBeVisible();
    // One button per message of the buyer, none on the seller's.
    await expect(thread(page).getByRole("button", { name: "Signaler ce message" })).toHaveCount(4);
    await expect(thread(page).locator("[data-own='true']").getByRole("button", { name: "Signaler ce message" })).toHaveCount(0);

    await thread(page).getByRole("button", { name: "Signaler ce message" }).last().click();
    const dialog = page.getByRole("dialog", { name: "Signaler un message" });
    await dialog.getByRole("button", { name: "Signaler", exact: true }).click();
    await expect(dialog.getByText("Choisissez une raison.")).toBeVisible();

    await dialog.getByRole("combobox", { name: /^Raison/ }).selectOption("spam");
    await dialog.getByRole("button", { name: "Signaler", exact: true }).click();
    await expect(toast(page, "Message signalé")).toBeVisible();
    await expect(bubbles(page).last()).toContainText("Signalé");
    expect((await received(page, baseURL)).received.some((entry) => entry.reason === "spam")).toBe(true);
  });

  test("closing leaves the history and removes the field; a closed or blocked conversation takes nothing", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-03");
    await expect(field(page)).toBeVisible();

    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await page.getByRole("menuitem", { name: "Fermer la conversation" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Fermer la conversation" }).click();

    await expect(toast(page, "Conversation fermée.")).toBeVisible();
    await expect(thread(page).getByText("Cette conversation est fermée.")).toBeVisible();
    await expect(field(page)).toHaveCount(0);
    await expect(bubbles(page)).toHaveCount(2);

    await conversation(page, "conv-shop-10").click();
    await expect(thread(page).getByText("Cette conversation est bloquée.")).toBeVisible();
    await expect(field(page)).toHaveCount(0);
    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await expect(page.getByRole("menuitem", { name: "Bloquer ce client" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Partager un produit" })).toHaveCount(0);
  });

  test("blocks a buyer after a confirmation; a courier is neither blocked nor offered a product", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-06");
    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await page.getByRole("menuitem", { name: "Bloquer ce client" }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toContainText("Adama Sanou ne pourra plus vous écrire");
    await confirm.getByRole("button", { name: "Bloquer" }).click();
    await expect(toast(page, "Client bloqué.")).toBeVisible();
    await expect(thread(page).getByText("Cette conversation est bloquée.")).toBeVisible();

    await conversation(page, "conv-pickup-01").click();
    await expect(thread(page).getByRole("heading", { level: 2, name: "Coursier · Moussa Kaboré" })).toBeVisible();
    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await expect(page.getByRole("menuitem", { name: "Signaler un message" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Bloquer ce client" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Partager un produit" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Voir le profil client" })).toHaveCount(0);
  });

  test("a conversation of another store, or that does not exist, is said not found", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-delivery-01");
    await expect(page.getByText("Conversation introuvable")).toBeVisible();
    await expect(field(page)).toHaveCount(0);
  });
});

test.describe("seller: real time", () => {
  test("joins its private channel through the portal, and shows a message without a reload", async ({ page, baseURL }) => {
    const authorised: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/broadcasting/auth")) authorised.push(request.postData() ?? "");
    });

    await open(page, baseURL, "/vendor/messages/conv-shop-03");
    await expect(bubbles(page)).toHaveCount(2);
    await expect.poll(() => authorised.length).toBeGreaterThan(0);
    expect(authorised[0]).toContain("private-messaging.store.11");
    // The socket is there: nothing says otherwise.
    await expect(page.getByText("Temps réel indisponible")).toHaveCount(0);

    await incoming(page, baseURL, "conv-shop-03", "Avez-vous aussi le modèle en rouge ?");
    await expect(bubbles(page).last()).toContainText("Avez-vous aussi le modèle en rouge ?", { timeout: 5_000 });
    await expect(bubbles(page)).toHaveCount(3);
    await expect(page.getByRole("status").filter({ hasText: "Nouveau message de Marie Koné" })).toHaveCount(1);

    // Another conversation receives a message: its row moves up, with its counter.
    await incoming(page, baseURL, "conv-shop-07", "Toujours disponible ?");
    await expect(conversations(page).first()).toContainText("Moussa Zongo", { timeout: 5_000 });
    await expect(conversation(page, "conv-shop-07")).toContainText("1 message non lu");
  });

  test("shows that the other side is writing, and that it has read", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-03");
    await expect(bubbles(page)).toHaveCount(2);

    await field(page).fill("Bonjour, oui.");
    await sendButton(page).click();
    await expect(bubbles(page).last().locator("[data-mark='sent']")).toBeVisible();

    await peerTyping(page, baseURL, "conv-shop-03");
    await expect(thread(page).getByText("Marie Koné écrit…")).toBeVisible();

    await peerRead(page, baseURL, "conv-shop-03");
    await expect(bubbles(page).last().locator("[data-mark='read']")).toBeVisible();
    // Known from the server too, not only from the event.
    await page.reload();
    await expect(bubbles(page).last().locator("[data-mark='read']")).toBeVisible();
  });

  test("says when real time is away, keeps working, and catches up without duplicates when it is back", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-03");
    await expect(bubbles(page)).toHaveCount(2);

    await socket(page, baseURL, true);
    await expect(page.getByText("Temps réel indisponible")).toBeVisible({ timeout: 30_000 });

    // Sending still works over HTTP.
    await field(page).fill("Envoyé sans le temps réel.");
    await sendButton(page).click();
    await expect(bubbles(page)).toHaveCount(3);

    // Two messages arrive while the socket is away: no event carries them.
    await incoming(page, baseURL, "conv-shop-03", "Premier message manqué", { silent: true });
    await incoming(page, baseURL, "conv-shop-03", "Second message manqué", { silent: true });

    await socket(page, baseURL, false);
    await expect(page.getByText("Temps réel indisponible")).toHaveCount(0, { timeout: 30_000 });
    await expect(bubbles(page)).toHaveCount(5, { timeout: 20_000 });
    await expect(bubbles(page).filter({ hasText: "Premier message manqué" })).toHaveCount(1);
    await expect(bubbles(page).filter({ hasText: "Second message manqué" })).toHaveCount(1);

    // And events are heard again.
    await incoming(page, baseURL, "conv-shop-03", "Après la reconnexion");
    await expect(bubbles(page)).toHaveCount(6, { timeout: 5_000 });
    const texts = await bubbles(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-message")));
    expect(new Set(texts).size).toBe(6);
  });
});

test.describe("seller: reading back", () => {
  test("loads older messages above without moving the reader, and does not jump down when one arrives", async ({ page, baseURL }) => {
    await open(page, baseURL, "/vendor/messages/conv-shop-05");
    await expect(bubbles(page)).toHaveCount(30);
    // Opened on the latest message.
    await expect(bubbles(page).last()).toBeInViewport();

    // Going up to the oldest message on screen asks for the ones before it.
    const anchorId = await bubbles(page).first().getAttribute("data-message");
    await scroller(page).evaluate((node) => node.scrollTo({ top: 0 }));
    const before = await page.locator(`[data-message="${anchorId}"]`).evaluate((node) => node.getBoundingClientRect().top);
    await expect(bubbles(page)).toHaveCount(60);

    // What was being read has not moved: the older messages are above it.
    const after = await page.locator(`[data-message="${anchorId}"]`).evaluate((node) => node.getBoundingClientRect().top);
    expect(Math.abs(after - before)).toBeLessThan(80);
    expect(await scroller(page).evaluate((node) => node.scrollTop)).toBeGreaterThan(200);
    // No message twice across the pages.
    const ids = await bubbles(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-message")));
    expect(new Set(ids).size).toBe(60);

    // Reading higher up: a new message is counted, the reader keeps their place.
    const top = await scroller(page).evaluate((node) => node.scrollTop);
    await incoming(page, baseURL, "conv-shop-05", "Un message pendant la lecture");
    await expect(page.getByRole("button", { name: "1 nouveau message" })).toBeVisible({ timeout: 5_000 });
    expect(Math.abs((await scroller(page).evaluate((node) => node.scrollTop)) - top)).toBeLessThan(4);
    // Not read: the reader has not seen it.
    await expect(conversation(page, "conv-shop-05")).toContainText("1 message non lu");

    await page.getByRole("button", { name: "1 nouveau message" }).click();
    await expect(bubbles(page).last()).toBeInViewport();
    await expect(page.getByRole("button", { name: "1 nouveau message" })).toHaveCount(0);
    await expect(conversation(page, "conv-shop-05")).not.toContainText("non lu");
  });
});

test.describe("courier", () => {
  test("lists the conversations of the missions, with their counters, on a phone", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/messages", { width: 390, account: COURIER });
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeVisible();
    await expect(conversations(page)).toHaveCount(8);
    await expect(page.getByRole("button", { name: "Toutes (8)" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Non lus (2)" })).toBeVisible();

    await expect(conversations(page).first()).toContainText("Client – SU-2026-000205");
    await expect(conversations(page).first()).toContainText("Je vous attends à l'accueil.");
    await expect(conversations(page).first()).toContainText("2 messages non lus");
    await expect(conversation(page, "conv-delivery-02")).toContainText("Boutique – SU-2026-000206");

    await page.getByRole("button", { name: "Non lus (2)" }).click();
    await expect(conversations(page)).toHaveCount(2);
    // A delivery of another courier, or of nobody: not here.
    await expect(conversation(page, "conv-delivery-07")).toHaveCount(0);
  });

  test("opens a conversation over the whole screen, answers, and comes back to the list", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/messages", { width: 390, account: COURIER });
    await conversations(page).first().click();
    await expect(page).toHaveURL(/\/driver\/messages\/conv-delivery-01$/);

    await expect(thread(page).getByRole("heading", { level: 2, name: "Client – SU-2026-000205" })).toBeVisible();
    await expect(thread(page)).toContainText("Fatoumata Compaoré");
    await expect(thread(page).getByRole("link", { name: "Mission SU-2026-000205" })).toHaveAttribute("href", "/driver/deliveries/mission-205");
    await expect(thread(page).getByRole("link", { name: "Appeler Fatoumata Compaoré" })).toHaveAttribute("href", "tel:+22670123456");
    // One pane at a time: the list is not under the conversation.
    await expect(conversations(page).first()).toBeHidden();

    await field(page).fill("J'arrive dans 2 minutes.");
    await sendButton(page).click();
    await expect(bubbles(page).last()).toContainText("J'arrive dans 2 minutes.");
    expect(await sends(page, baseURL)).toHaveLength(1);

    // What belongs to the store is not offered to a courier.
    await thread(page).getByRole("button", { name: "Actions de la conversation" }).click();
    await expect(page.getByRole("menuitem", { name: "Signaler un message" })).toBeVisible();
    await expect(page.getByRole("menuitem")).toHaveCount(1);
    await page.keyboard.press("Escape");

    await thread(page).getByRole("link", { name: "Retour aux conversations" }).click();
    await expect(page).toHaveURL(/\/driver\/messages$/);
    await expect(conversations(page).first()).toBeVisible();
    await expect(conversations(page).first()).toContainText("Vous : J'arrive dans 2 minutes.");
  });

  test("receives the buyer's message on its own channel, and a finished delivery takes no message", async ({ page, baseURL }) => {
    const joined: string[] = [];
    page.on("request", (request) => {
      if (request.url().endsWith("/api/broadcasting/auth")) joined.push(request.postData() ?? "");
    });
    await open(page, baseURL, "/driver/messages/conv-delivery-03", { width: 390, account: COURIER });
    await expect(bubbles(page)).toHaveCount(1);

    await expect.poll(() => joined.length).toBeGreaterThan(0);
    expect(joined[0]).toContain("private-messaging.courier.103");
    await incoming(page, baseURL, "conv-delivery-03", "Je descends.");
    await expect(bubbles(page)).toHaveCount(2, { timeout: 5_000 });
    await expect(bubbles(page).last()).toContainText("Je descends.");

    await page.goto("/driver/messages/conv-delivery-04");
    await expect(thread(page).getByText("Cette conversation est fermée.")).toBeVisible();
    await expect(field(page)).toHaveCount(0);
    // No number once the mission is over.
    await expect(thread(page).getByRole("link", { name: /^Appeler/ })).toHaveCount(0);
  });

  test("never shows a handover code", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/messages/conv-delivery-01", { width: 390, account: COURIER });
    await expect(bubbles(page)).toHaveCount(6);
    const text = await page.locator("body").innerText();
    expect(text).not.toMatch(/DLV0\d+/);
    expect(text).not.toMatch(/BTQ0\d+/);
  });
});

test.describe("agency: supervision", () => {
  test("reads the conversations of its deliveries, and only reads", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/messages", { account: AGENCY, width: 1440 });
    await expect(page.getByRole("heading", { level: 1, name: "Conversations" })).toBeVisible();
    await expect(conversations(page)).toHaveCount(7);
    await expect(conversation(page, "conv-delivery-99")).toHaveCount(0);
    await expect(conversations(page).first()).toContainText("SU-2026-078437");
    await expect(conversations(page).first()).toContainText("Client · Moussa Kaboré");
    // An agency is nobody's side: no unread, no filter on it.
    await expect(page.getByText("non lu")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Filtrer les conversations" })).toHaveCount(0);

    await conversations(page).first().click();
    await expect(thread(page).getByRole("heading", { level: 2, name: "Client – SU-2026-078437" })).toBeVisible();
    await expect(thread(page)).toContainText("Moussa Kaboré · Mission en cours");
    await expect(thread(page).locator("[data-read-only]")).toContainText("Lecture seule");
    await expect(thread(page).locator("[data-read-only]")).toContainText("Vous ne pouvez pas envoyer de message.");
    await expect(bubbles(page)).toHaveCount(6);

    // Nothing to write with, nothing to decide.
    await expect(page.locator("[data-composer]")).toHaveCount(0);
    await expect(thread(page).getByRole("button", { name: "Actions de la conversation" })).toHaveCount(0);
    await expect(thread(page).getByRole("button", { name: /Signaler/ })).toHaveCount(0);
    // Both sides are named, and no message is the agency's.
    await expect(bubbles(page).first()).toContainText("Cheick Barro");
    await expect(thread(page).locator("[data-mark]")).toHaveCount(0);

    // The mission, beside.
    const panel = page.locator("[data-mission-panel]");
    await expect(panel).toContainText("SU-2026-078437");
    await expect(panel.getByRole("link", { name: "Voir la livraison" })).toHaveAttribute("href", "/agency/deliveries/ship-16");

    // Reading left nothing on the server: no message, no read mark, no typing signal, no refused write.
    const log = await received(page, baseURL);
    expect(log.reads).toBe(0);
    expect(log.typing).toBe(0);
    expect(log.received.filter((entry) => entry.refused)).toHaveLength(0);
    expect(log.received.filter((entry) => /\/(messages|product-card)$/.test(entry.path) && entry.clientId !== undefined)).toHaveLength(0);
  });

  test("follows a conversation live, narrows the list to a courier, and reaches nothing of another agency", async ({ page, baseURL }) => {
    await open(page, baseURL, "/agency/messages/conv-delivery-01", { account: AGENCY });
    await expect(bubbles(page)).toHaveCount(6);
    await incoming(page, baseURL, "conv-delivery-01", "Je suis à l'accueil.");
    await expect(bubbles(page)).toHaveCount(7, { timeout: 5_000 });

    await page.getByRole("combobox", { name: "Coursier" }).selectOption({ label: "Fatou Sawadogo" });
    await expect(conversations(page)).toHaveCount(1);
    await expect(conversations(page).first()).toContainText("Client · Fatou Sawadogo");

    await page.goto("/agency/messages/conv-delivery-99");
    await expect(page.getByText("Conversation introuvable")).toBeVisible();
    await page.goto("/agency/messages/conv-shop-01");
    await expect(page.getByText("Conversation introuvable")).toBeVisible();
  });
});
