// Stand-in for the Laravel API, for the shell smoke only (playwright.shell.config.ts).
// It knows the auth contract of the BFF routes and answers every other
// endpoint with an empty collection: the smoke checks the frame around the
// pages, not their business contracts. Nothing here talks to a real backend.
import { createServer } from "node:http";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.MOCK_API_PORT ?? 4010);
const PASSWORD = "Passw0rd!";
const OTP_CODE = "123456";

const PROFILES = {
  "vendeur@qa.test": {
    id: 101,
    name: "Awa Traoré",
    email: "vendeur@qa.test",
    user_type: "seller",
    store: { id: 11, name: "Boutique Awa" },
  },
  // The seller of the QA seeder (QaProPortalSeeder): the staging run
  // (e2e/staging) only signs in with such an address, and is rehearsed here.
  "qa-vendeur-a@qa.sugu.test": {
    id: 107,
    name: "Awa Traoré",
    email: "qa-vendeur-a@qa.sugu.test",
    user_type: "seller",
    store: { id: 11, name: "Boutique Awa" },
  },
  "agence@qa.test": {
    id: 102,
    name: "Issa Ouédraogo",
    email: "agence@qa.test",
    user_type: "delivery_partner",
    agency: { id: 21, company_name: "Faso Express" },
  },
  "coursier@qa.test": {
    id: 103,
    name: "Moussa Kaboré",
    email: "coursier@qa.test",
    user_type: "courier",
    courier: { id: 31, status: 1, delivery_partner: { id: 21 } },
  },
  "coursier-attente@qa.test": {
    id: 104,
    name: "Salif Sawadogo",
    email: "coursier-attente@qa.test",
    user_type: "courier",
    courier: { id: 32, status: 4, delivery_partner: { id: 21 } },
  },
  // A marketplace buyer: authenticated by the API, no place on the pro portal.
  "acheteur@qa.test": { id: 105, name: "Client", email: "acheteur@qa.test", user_type: "buyer" },
  "otp@qa.test": {
    id: 106,
    name: "Fatou Diallo",
    email: "otp@qa.test",
    user_type: "seller",
    store: { id: 12, name: "Boutique Fatou" },
    otp: true,
  },
};

const sessions = new Map();
const log = [];

/** The profile as the API would send it (the `otp` flag is test plumbing). */
function publicUser(profile) {
  const user = { ...profile };
  delete user.otp;
  return user;
}

function issue(profile) {
  const token = `qa-${profile.id}-${Math.random().toString(36).slice(2)}`;
  sessions.set(token, profile);
  return { user: publicUser(profile), token, expires_at: new Date(Date.now() + 3600_000).toISOString() };
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const routes = {
  "POST /web-auth/login": (body) => {
    const profile = PROFILES[body.login_field];
    if (!profile || body.password !== PASSWORD) return [401, { message: "Identifiants incorrects." }];
    if (profile.otp) {
      return [200, { data: { verification_required: true, identifier: profile.email, expires_in: 600 } }];
    }
    return [200, { success: true, data: issue(profile) }];
  },
  "POST /web-auth/verify-otp": (body) => {
    const profile = PROFILES[body.identifier];
    if (!profile || body.code !== OTP_CODE) return [422, { message: "Code invalide ou expiré." }];
    return [200, { success: true, data: issue(profile) }];
  },
  "GET /web-auth/me": (_body, token) => {
    const profile = sessions.get(token);
    if (!profile) return [401, { message: "Unauthenticated." }];
    return [200, { success: true, data: { user: publicUser(profile) } }];
  },
  "POST /web-auth/logout": (_body, token) => {
    sessions.delete(token);
    return [200, { success: true }];
  },
  "POST /web-auth/forgot-password": (body) =>
    body.email === "inconnu@qa.test" ? [422, { message: "Aucun compte avec cette adresse." }] : [200, { success: true }],
  "POST /web-auth/reset-password": (body) =>
    body.code === OTP_CODE ? [200, { success: true }] : [422, { errors: { code: ["Code invalide ou expiré."] } }],
  "POST /web-auth/verify-reset-token": (body) =>
    body.token === "valid-token" ? [200, { data: { valid: true } }] : [422, { data: { valid: false } }],
  "POST /web-auth/set-password": (body) =>
    body.token === "valid-token" && PROFILES[body.email]
      ? [200, { success: true, data: issue(PROFILES[body.email]) }]
      : [422, { message: "Lien invalide." }],
  // The legacy Sugu Box overview reads its payload without checking it.
  "GET /sellers/sugubox/overview": () => [
    200,
    {
      success: true,
      data: {
        total_variants_in_box: 0,
        total_units_in_box: 0,
        pending_inbound_count: 0,
        active_outbound_count: 0,
        recent_movements: [],
      },
    },
  ],
  "POST /web-auth/courier/validate-code": (body) =>
    body.code === "FASO2026"
      ? [200, { data: { agency_name: "Faso Express", partner_id: 21 } }]
      : [404, { message: "Code de recrutement inconnu." }],
};

// A domain smoke can plug its own endpoints in front of the empty-collection
// fallback: MOCK_API_EXTENSION points to a module whose default export is
// `(context) => boolean | Promise<boolean>` (true once it has answered).
const extension = process.env.MOCK_API_EXTENSION
  ? (await import(pathToFileURL(resolve(process.env.MOCK_API_EXTENSION)).href)).default
  : null;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/v1/, "");
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const key = `${req.method} ${path}`;
  log.push(`${key}${url.search}`);

  if (path === "/__log") return send(res, 200, { requests: log });

  if (extension && !path.startsWith("/web-auth/") && url.pathname.startsWith("/api/v1/")) {
    const profile = sessions.get(token);
    if (!profile) return send(res, 401, { message: "Unauthenticated." });
    const handled = await extension({ req, res, url, path, method: req.method, profile, token, send, readJson });
    if (handled) return;
  }

  const handler = routes[key] ?? Object.entries(routes).find(([route]) => key.startsWith(route))?.[1];
  if (handler) {
    const [status, body] = handler(await readJson(req), token);
    return send(res, status, body);
  }

  if (url.pathname === "/api/broadcasting/auth") return send(res, 403, { message: "Forbidden" });
  if (!sessions.has(token)) return send(res, 401, { message: "Unauthenticated." });
  if (req.method !== "GET") return send(res, 403, { message: "Lecture seule dans l'environnement de test." });
  return send(res, 200, { success: true, data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`mock API listening on http://127.0.0.1:${PORT}`);
});
