import { expect, test } from "@playwright/test";
import { dialog, notice, open, pageAlert, received, toast } from "./helpers";

// The file of a courier. The defect this covers: a courier whose documents
// were not all sent was held on a waiting screen with nothing to do. They now
// land on their file, see what is missing, send it, and read their own
// documents through the portal — while the missions stay closed to them, by
// the server and not by this screen.

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

test.describe("a courier who cannot work yet", () => {
  test("lands on their file, which says what is missing", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/dashboard", { courier: "incomplete" });

    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes documents");
    await expect(pageAlert(page)).toContainText("Dossier incomplet");
    await expect(pageAlert(page)).toContainText("Pièce à transmettre : Permis de conduire.");

    const permit = page.locator('[data-document="driver_license"]');
    await expect(permit).toContainText("À transmettre");
    await expect(permit).toContainText("Pièce obligatoire");
    await expect(page.locator('[data-document="id_card"]')).toContainText("En attente");
  });

  test("is kept out of every mission page, and offered no way to them", async ({ page, baseURL }) => {
    for (const path of ["/driver/deliveries", "/driver/deliveries/mission-206", "/driver/deliveries/mission-206/update"]) {
      await open(page, baseURL, path, { courier: "incomplete" });
      await expect(page).toHaveURL(/\/driver\/documents$/);
    }
    const tabs = page.getByRole("navigation", { name: "Navigation rapide" });
    await expect(tabs.getByRole("link")).toHaveText(["Dossier", "Gains", "Profil"]);
  });

  test("the server refuses the missions by itself, whatever the screen does", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents", { courier: "incomplete" });

    for (const path of ["courier/dashboard", "courier/deliveries?scope=in_progress", "courier/deliveries/mission-206"]) {
      const response = await page.request.get(`/api/proxy/${path}`);
      expect(response.status(), path).toBe(403);
      expect((await response.json()).error_code).toBe("COURIER_KYC_PENDING");
    }
    const accept = await page.request.post("/api/proxy/courier/deliveries/mission-209/accept", { headers: { Origin: baseURL ?? "" } });
    expect(accept.status()).toBe(403);
    // A business refusal, not an expired session: the courier is still signed in.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mes documents");
  });

  test("sends the missing document, once, and the file goes to verification", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents", { courier: "incomplete" });
    await page.locator('[data-document="driver_license"]').getByRole("link", { name: "Transmettre : Permis de conduire" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ajouter un document");
    await expect(page.getByLabel("Type de document")).toHaveValue("driver_license");

    await page.getByLabel("Fichier").setInputFiles({ name: "permis.pdf", mimeType: "application/pdf", buffer: PDF });
    await expect(page.getByRole("region", { name: "Aperçu" })).toContainText("permis.pdf");
    await page.getByRole("button", { name: "Envoyer le document" }).dblclick();

    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(toast(page, "Permis de conduire : document transmis")).toBeVisible();
    await expect(notice(page, "Dossier en cours de vérification")).toBeVisible();
    await expect(page.locator('[data-document="driver_license"]')).toContainText("En attente");

    const sent = (await received(page)).filter((request) => request.path === "/settings/kyc/upload");
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ fields: { document_type: "driver_license" }, files: ["permis.pdf"] });

    // Sending a document opens nothing: the agency still has to approve.
    await page.goto("/driver/deliveries");
    await expect(page).toHaveURL(/\/driver\/documents$/);
  });

  test("a file is checked before it leaves: type and weight, with a sentence", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents/new", { courier: "incomplete" });

    await page.getByRole("button", { name: "Envoyer le document" }).click();
    await expect(page.locator("main")).toContainText("Choisissez le type de document.");
    await expect(page.locator("main")).toContainText("Joignez le fichier de la pièce.");

    await page.getByLabel("Fichier").setInputFiles({ name: "piece.exe", mimeType: "application/x-msdownload", buffer: Buffer.from("MZ") });
    await expect(page.locator("#fichier-erreur")).toHaveText("Le fichier doit être une image (JPG, PNG) ou un PDF.");

    await page.getByLabel("Fichier").setInputFiles({ name: "lourd.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await expect(page.locator("#fichier-erreur")).toHaveText("Le fichier ne doit pas dépasser 5 Mo.");
    expect(await received(page)).toHaveLength(0);
  });

  test("a refused file says why, and is sent again", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/dashboard", { courier: "rejected" });

    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(pageAlert(page)).toContainText("Dossier refusé");
    await expect(pageAlert(page)).toContainText("Motif donné par Faso Express : La photo du permis est floue.");
    const permit = page.locator('[data-document="driver_license"]');
    await expect(permit).toContainText("Refusé");
    await expect(permit).toContainText("Motif du refus : Photo floue : le numéro du permis est illisible.");

    await permit.getByRole("link", { name: "Remplacer : Permis de conduire" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Remplacer un document");
    await page.getByLabel("Fichier").setInputFiles({ name: "permis-net.pdf", mimeType: "application/pdf", buffer: PDF });
    await page.getByRole("button", { name: "Envoyer le document" }).click();

    await expect(notice(page, "Dossier en cours de vérification")).toBeVisible();
    await expect(page.locator('[data-document="driver_license"]')).toContainText("En attente");
  });

  test("a suspended courier reads that they are, keeps their history, and gets no mission", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/deliveries", { courier: "suspended" });

    await expect(page).toHaveURL(/\/driver\/documents$/);
    await expect(pageAlert(page)).toContainText("Compte suspendu");
    // Verified, then suspended: no document is asked of them.
    await expect(pageAlert(page)).not.toContainText("à transmettre");

    await page.goto("/driver/history");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Historique des missions");

    const response = await page.request.get("/api/proxy/courier/deliveries?scope=in_progress");
    expect(response.status()).toBe(403);
    expect((await response.json()).error_code).toBe("COURIER_NOT_ACTIVE");
  });
});

test.describe("documents of an approved courier", () => {
  test("each document has its status, and its file opens through the portal", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents");

    await expect(notice(page, "Votre dossier est validé")).toBeVisible();
    await expect(page.getByRole("button", { name: "Vérifier mon statut" })).toHaveCount(0);

    const identity = page.locator('[data-document="id_card"]');
    await expect(identity).toContainText("Approuvé");
    const link = identity.getByRole("link", { name: "Voir le fichier : Pièce d'identité" });
    // On the portal's own origin: never the host of the API, never a signed link.
    await expect(link).toHaveAttribute("href", "/api/proxy/courier/settings/kyc/doc-id_card/file");
    for (const href of await page.locator("main a[href]").evaluateAll((links) => links.map((anchor) => (anchor as HTMLAnchorElement).href))) {
      expect(new URL(href).origin, href).toBe(new URL(baseURL!).origin);
    }
    await expect(page.locator("main")).not.toContainText("api.invalid");

    // The picture of a document that is one is drawn; it is read behind the session.
    await expect(identity.locator("img")).toHaveJSProperty("complete", true);
    expect(await identity.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test("a PDF comes back as a PDF, to its courier only", async ({ page, baseURL, browser }) => {
    await open(page, baseURL, "/driver/documents");

    const file = await page.request.get("/api/proxy/courier/settings/kyc/doc-driver_license/file");
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toBe("application/pdf");
    expect(file.headers()["cache-control"]).toContain("no-store");
    expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");

    // Without a session: nothing.
    const anonymous = await browser.newContext();
    const refused = await anonymous.request.get(`${baseURL}/api/proxy/courier/settings/kyc/doc-driver_license/file`);
    expect(refused.status()).toBe(401);
    await anonymous.close();

    // A document that is not theirs does not exist for them.
    expect((await page.request.get("/api/proxy/courier/settings/kyc/doc-of-somebody-else/file")).status()).toBe(404);
  });

  test("a document whose file is gone says so, and offers no link that cannot work", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents");

    const registration = page.locator('[data-document="vehicle_registration"]');
    await expect(registration).toContainText("Le fichier n'est plus sur le serveur. Transmettez de nouveau cette pièce.");
    await expect(registration.getByRole("link", { name: /Voir le fichier/ })).toHaveCount(0);
    await expect(registration.getByRole("link", { name: "Remplacer : Carte grise" })).toBeVisible();
  });

  test("the profile shows who they are, where the verification stands, and leads to the rest", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/profile");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mon profil");
    const identity = page.getByRole("region", { name: "Identité" });
    await expect(identity).toContainText("Moussa Kaboré");
    await expect(identity).toContainText("+226 76 44 55 66");

    const verification = page.locator("main").getByText("Vérification de compte").locator("../..");
    await expect(verification).toContainText("Approuvé");
    await expect(verification).toContainText("Votre dossier est validé.");
    await expect(verification.getByRole("listitem")).toHaveCount(3);

    await expect(page.getByRole("link", { name: /Informations personnelles/ })).toHaveAttribute("href", "/driver/settings?tab=profile");
    await expect(page.getByRole("link", { name: /Véhicule/ })).toContainText("Moto · 11 KK 4521");
    await expect(page.getByRole("link", { name: /Documents/ })).toHaveAttribute("href", "/driver/documents");
    await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible();
  });

  test("replacing a document warns that it goes back to verification", async ({ page, baseURL }) => {
    await open(page, baseURL, "/driver/documents/new?type=id_card");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Remplacer un document");
    await expect(page.locator("main")).toContainText("le nouveau fichier la remplace, et repasse en vérification");
    await expect(dialog(page)).toHaveCount(0);
  });
});
