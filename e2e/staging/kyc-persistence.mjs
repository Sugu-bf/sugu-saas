// The decisive test of the private KYC storage, on staging: a document survives a deployment.
//
//   node e2e/staging/kyc-persistence.mjs put      before the deployment: a QA courier sends a synthetic document;
//                                                 it is read back by its owner, refused to another courier and to nobody
//   (redeploy the backend)
//   node e2e/staging/kyc-persistence.mjs check    after: the SAME document is read again and compared byte for byte
//
// Accounts of QaCourierSeeder only (@qa.sugu.test); the document is a one-page PDF that says what it is.
// The password is read from .env.staging.local, as playwright.staging.config.ts does. Nothing secret is printed.
// What `put` learnt (the id of the document, the hash of its content) is kept in .env.kyc-persistence.local.json, ignored by Git.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const env = { ...Object.fromEntries(readFileSync(".env.staging.local", "utf8").split(/\r?\n/).map((l) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2].replace(/^(["'])(.*)\1$/, "$2")])), ...process.env };
const portal = String(env.STAGING_URL ?? "").replace(/\/+$/, "");
const password = env.STAGING_COURIER_PASSWORD ?? env.STAGING_AGENCY_PASSWORD;
const OWNER = "qa-coursier-attente@qa.sugu.test";
const OTHER = "qa-coursier@qa.sugu.test";
const TYPE = "driver_license";
// Beside .env.staging.local, and ignored by Git like it (.env*).
const STATE = join(process.cwd(), ".env.kyc-persistence.local.json");
if (/^https:\/\/pro\.sugu\.pro/.test(portal)) throw new Error("Not meant for production.");

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
};

async function session(email) {
  const response = await fetch(`${portal}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json", origin: portal }, body: JSON.stringify({ email, password }) });
  const cookie = (response.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  if (response.status !== 200 || !cookie) throw new Error(`${email} does not sign in (${response.status}): run QaCourierSeeder`);
  return {
    get: (path) => fetch(`${portal}/api/proxy/${path}`, { headers: { cookie, accept: "application/json" } }),
    post: (path, body) => fetch(`${portal}/api/proxy/${path}`, { method: "POST", headers: { cookie, origin: portal, accept: "application/json" }, body }),
    close: () => fetch(`${portal}/api/auth/logout`, { method: "POST", headers: { cookie, origin: portal } }),
  };
}

async function documentOf(owner) {
  const settings = await (await owner.get("courier/settings")).json();
  return (settings.data?.kyc?.documents ?? []).find((doc) => (doc.document_type ?? doc.type) === TYPE);
}

async function read(owner, id) {
  const response = await owner.get(`courier/settings/kyc/${id}/file`);
  return { status: response.status, type: response.headers.get("content-type"), cache: response.headers.get("cache-control"), body: Buffer.from(await response.arrayBuffer()) };
}

(async () => {
  const step = process.argv[2];
  if (step !== "put" && step !== "check") throw new Error("Usage: node e2e/staging/kyc-persistence.mjs put|check");
  const owner = await session(OWNER);

  if (step === "put") {
    // Unique content: the hash proves it is THIS upload that is read back later.
    const stamp = new Date().toISOString();
    const pdf = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n% PIECE FACTICE DE RECETTE SUGU - AUCUNE VALEUR - ${stamp}\n`, "latin1");
    const form = new FormData();
    form.append("document_type", TYPE);
    form.append("file", new Blob([pdf], { type: "application/pdf" }), "qa-recette-permis-factice.pdf");
    const sent = await owner.post("courier/settings/kyc/upload", form);
    check("the synthetic document is accepted", sent.status === 200, `HTTP ${sent.status}`);

    const doc = await documentOf(owner);
    check("the file is said to be on the server", doc?.file_available === true);
    const back = await read(owner, doc.id);
    check("its owner reads it back, byte for byte", back.status === 200 && sha(back.body) === sha(pdf), `HTTP ${back.status}, ${back.body.length} bytes`);
    check("never kept by a cache, served as a PDF", /no-store/.test(back.cache ?? "") && back.type === "application/pdf", `${back.type} | ${back.cache}`);
    writeFileSync(STATE, JSON.stringify({ id: doc.id, sha256: sha(pdf), bytes: pdf.length, putAt: stamp, portal }, null, 2));
    console.log(`\nDocument ${doc.id.slice(0, 6)}… sent at ${stamp}. Redeploy the backend, then run: node e2e/staging/kyc-persistence.mjs check`);
  }

  const known = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
  if (!known) throw new Error("Nothing to check: run `put` first.");

  if (step === "check") {
    const doc = await documentOf(owner);
    check("it is the same document as before the deployment", doc?.id === known.id, `sent at ${known.putAt}`);
    check("the file is still said to be on the server", doc?.file_available === true);
    const back = await read(owner, known.id);
    check("its owner reads the SAME content after the deployment", back.status === 200 && sha(back.body) === known.sha256, `HTTP ${back.status}, ${back.body.length} bytes (sent: ${known.bytes})`);
  }

  // Who may not read it: another courier of the same agency, and nobody.
  const other = await session(OTHER);
  const foreign = await other.get(`courier/settings/kyc/${known.id}/file`);
  check("another courier is answered that it does not exist", foreign.status === 404, `HTTP ${foreign.status}`);
  await other.close();
  const anonymous = await fetch(`${portal}/api/proxy/courier/settings/kyc/${known.id}/file`);
  check("without a session, nothing", anonymous.status === 401, `HTTP ${anonymous.status}`);
  const settingsText = JSON.stringify((await (await owner.get("courier/settings")).json()).data?.kyc ?? {});
  check("no storage address in the answer", !/r2\.cloudflarestorage|cdn\.sugu|agencies-couriers-kyc/.test(settingsText));

  await owner.close();
  console.log(`\n${step}: ${results.filter(Boolean).length}/${results.length}`);
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((error) => {
  console.error(`FAIL  ${error.message}`);
  process.exit(1);
});
