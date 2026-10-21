// SUGU Lanaya endpoints for the Lot 1 smoke (playwright.lanaya.config.ts),
// plugged into e2e/shell/mock-api.mjs. Payloads follow LanayaPresenter and
// the Lanaya controllers of ../sugu (states with their server labels, the
// link of an invitation given once, the consent of the seller required, a
// candidate kept out of the network). One independent data set per session
// token. Nothing here reaches a real backend, and nothing here proves that
// the real one behaves so: e2e/staging/lanaya.staging.spec.ts does.

const DAY = 24 * 60 * 60 * 1000;
const iso = (time) => (time === null || time === undefined ? null : new Date(time).toISOString());

/** A token the specs know: the invitation a seller opens. */
export const KNOWN_TOKEN = "a".repeat(64);

const LABELS = {
  application: { draft: "Brouillon", submitted: "Soumise", in_review: "En revue", info_requested: "À compléter", approved: "Admise", rejected: "Refusée", withdrawn: "Retirée" },
  account: { none: "Non ouvert", active: "Actif", suspended: "Suspendu", closed: "Fermé" },
  identity: { none: "Non déposée", pending: "À vérifier", verified: "Vérifiée", rejected: "Refusée", expired: "Expirée" },
  document: { pending: "À vérifier", approved: "Validée", rejected: "Refusée", superseded: "Remplacée" },
  lead: { prospect: "Nouveau", contacted: "En discussion", invited: "Invitation envoyée", no_response: "Sans réponse", registered: "Converti", lost: "Abandonné" },
  invitation: { open: "En attente", accepted: "Acceptée", declined: "Refusée", revoked: "Révoquée", expired: "Expirée" },
  assignment: { proposed: "En attente de l'accord du vendeur", active: "Active", declined: "Refusée par le vendeur", cancelled: "Proposition retirée", ended: "Terminée" },
  attribution: { active: "En cours", removed: "Retirée", replaced: "Réattribuée" },
  order: { pending: "En attente", confirmed: "Confirmée", processing: "En préparation", shipped: "Expédiée" },
  source: { recommendation: "Recommandation", personal_network: "Réseau personnel", trade_fair: "Salon commercial", social_network: "Réseaux sociaux", website: "Site web", other: "Autre" },
  reference: { pending: "Non contactée", contacted: "Contactée", validated: "Référence validée", no_answer: "Sans réponse", rejected: "Non confirmée" },
  relation: { regular_client: "Client régulier", business_partner: "Partenaire commercial", supplier: "Fournisseur", former_employer: "Ancien employeur", other: "Autre" },
};
const state = (family, value) => ({ value, label: LABELS[family][value] ?? value });

const CONSENTS = [
  { key: "data_processing", version: "pilote-2026-10-provisoire", text: "J'accepte que SUGU traite les informations et les pièces de ma candidature pour l'examiner." },
  { key: "conduct_code", version: "pilote-2026-10-provisoire", text: "Je m'engage à agir avec honnêteté envers les vendeurs et les acheteurs." },
];
const SELLER_CONSENT = { key: "seller_introduction", version: "pilote-2026-10-provisoire", text: "J'accepte que ce Lanabaga soit enregistré comme m'ayant présenté SUGU." };
const ASSIGNMENT_CONSENT = { key: "seller_assignment", version: "pilote-2026-10-provisoire", text: "J'accepte que ce Lanabaga devienne le Lanabaga principal de ma boutique et me conseille pour vendre sur SUGU. Il n'a accès ni à mon compte, ni à mes paiements." };

const CARD = { public_code: "LNB-AB12CD", name: "Aïssata Kaboré", city: "Ouagadougou", country_code: "BF", specialties: ["Électronique", "Accessoires mobiles"], account_active: true, badge: null };

const normalize = (phone) => {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `+226${digits.replace(/^0+/, "")}`;
};

function profileOf(kind, now) {
  const admitted = kind === "admitted";
  return {
    id: `profile-${kind}`,
    public_code: admitted ? "LNB-AB12CD" : "LNB-CD34EF",
    country_code: "BF",
    city: admitted ? "Ouagadougou" : "Koudougou",
    specialties: admitted ? ["Électronique", "Accessoires mobiles"] : ["Pagnes et textiles"],
    experience_band: admitted ? "3-5" : null,
    structure_name: null,
    conflicts_declared: null,
    application_status: state("application", admitted ? "approved" : "draft"),
    account_status: state("account", admitted ? "active" : "none"),
    identity_status: state("identity", admitted ? "verified" : "none"),
    quality_gate_state: { value: "open", label: "Ouvert" },
    editable: !admitted,
    can_work: admitted,
    submitted_at: admitted ? iso(now - 35 * DAY) : null,
    decided_at: admitted ? iso(now - 31 * DAY) : null,
    decision_note: null,
    decision_reason: null,
    suspension_reason: null,
    agreement: admitted
      ? { id: "agreement-1", reference: "CONV-QA-AB12CD", version: "pilote", status: { value: "valid", label: "Valide" }, in_force: true, signed_at: iso(now - 30 * DAY).slice(0, 10), valid_from: iso(now - 30 * DAY).slice(0, 10), valid_until: iso(now + 330 * DAY).slice(0, 10) }
      : null,
    created_at: iso(now - 40 * DAY),
  };
}

function lead(id, company, contact, phone, city, source, status, daysAgo, now) {
  return { id, company_name: company, contact_name: contact, phone: normalize(phone), email: null, city, sector: "Électronique", declared_source: state("source", source), relation_to_lanabaga: null, status: state("lead", status), last_activity_at: iso(now - daysAgo * DAY), created_at: iso(now - daysAgo * DAY) };
}

function invitation(id, company, contact, phone, status, createdDaysAgo, now, extra = {}) {
  return { id, lead_id: null, company_name: company, contact_name: contact, phone: normalize(phone), message: null, status: state("invitation", status), expires_at: iso(now + (14 - createdDaysAgo) * DAY), accepted_at: null, store: null, created_at: iso(now - createdDaysAgo * DAY), ...extra };
}

/** LanayaPresenter::assignment: the store, and the Lanabaga's card on the seller's side only. */
function assignmentOf(id, status, store, now, { card = null, proposedDaysAgo = 3, acceptedDaysAgo = null, endedDaysAgo = null } = {}) {
  return {
    id,
    status: state("assignment", status),
    scope: "store",
    store: { ...store, active: true },
    lanabaga: card,
    proposed_at: iso(now - proposedDaysAgo * DAY),
    accepted_at: acceptedDaysAgo === null ? null : iso(now - acceptedDaysAgo * DAY),
    declined_at: null,
    cancelled_at: null,
    ended_at: endedDaysAgo === null ? null : iso(now - endedDaysAgo * DAY),
    ended_by_capacity: null,
  };
}

const STORE_AWA = { id: "11", name: "Boutique Awa", slug: "boutique-awa", city: "Ouagadougou" };
const STORE_ZONGO = { id: "12", name: "Quincaillerie Zongo", slug: "quincaillerie-zongo", city: "Bobo-Dioulasso" };
const STORE_SAWADOGO = { id: "13", name: "Ets Sawadogo", slug: "ets-sawadogo", city: "Koudougou" };

function attributionOf(id, number, status, placedDaysAgo, now) {
  return {
    id,
    status: state("attribution", "active"),
    order: { id: `order-${id}`, number, status: state("order", status), placed_at: iso(now - placedDaysAgo * DAY) },
    store: { id: STORE_AWA.id, name: STORE_AWA.name, city: STORE_AWA.city },
    lanabaga: { public_code: CARD.public_code, name: CARD.name },
    attributed_at: iso(now - placedDaysAgo * DAY + 2 * 60 * 60 * 1000),
    ended_at: null,
  };
}

function seed(kind) {
  const now = Date.now();
  const set = { kind, now, received: [], documents: [], references: [], consents: {}, profile: kind === "seller" ? null : profileOf(kind, now), answered: false, assignment: null, proposal: null };
  if (kind === "admitted") {
    set.assignments = [
      assignmentOf("asg-1", "active", STORE_AWA, now, { proposedDaysAgo: 12, acceptedDaysAgo: 11 }),
      assignmentOf("asg-2", "proposed", STORE_ZONGO, now, { proposedDaysAgo: 1 }),
    ];
    set.pastAssignments = [assignmentOf("asg-0", "ended", STORE_SAWADOGO, now, { proposedDaysAgo: 40, acceptedDaysAgo: 39, endedDaysAgo: 8 })];
    set.orders = [attributionOf("att-1", "SG-2026-004812", "processing", 1, now), attributionOf("att-2", "SG-2026-004790", "confirmed", 3, now)];
  }
  if (kind === "admitted") {
    set.leads = [
      lead("lead-1", "Sankara Électronique", "Ibrahim Sankara", "76112233", "Ouagadougou", "recommendation", "prospect", 0, now),
      lead("lead-2", "Maison Ouédraogo", "Mariam Ouédraogo", "78554411", "Bobo-Dioulasso", "trade_fair", "contacted", 1, now),
      lead("lead-3", "Nikiema Mobiles", "Yacouba Nikiema", "70667788", "Koudougou", "website", "prospect", 6, now),
      lead("lead-4", "Kaboré Informatique", "Fatoumata Kaboré", "71234567", "Bobo-Dioulasso", "social_network", "no_response", 9, now),
    ];
    set.invitations = [
      invitation("inv-1", "Traoré Accessoires", "Zinabou Traoré", "67123455", "open", 12, now),
      invitation("inv-2", "Boutique Awa", "Awa Traoré", "70000101", "accepted", 18, now, { accepted_at: iso(now - 16 * DAY), store: { id: "11", name: "Boutique Awa", slug: "boutique-awa", city: "Ouagadougou" } }),
      invitation("inv-3", "Ets Sawadogo", "Awa Sawadogo", "76001122", "expired", 20, now, { expires_at: iso(now - 6 * DAY) }),
    ];
  }
  if (kind === "admitted") {
    set.documents = ["identity", "professional_photo"].map((type) => documentOf(type, "approved", now));
  }
  return set;
}

function documentOf(type, status, now) {
  const labels = { identity: "Pièce d'identité", professional_photo: "Photo professionnelle" };
  return { id: `doc-${type}-${Math.random().toString(36).slice(2, 8)}`, document_type: { value: type, label: labels[type] }, side: { value: "single", label: "Recto" }, file_name: `${type}.pdf`, mime_type: "application/pdf", size_bytes: 1024, review_status: state("document", status), rejection_reason: null, uploaded_at: iso(now), reviewed_at: null };
}

const sets = new Map();
function setOf(token, profile) {
  if (!sets.has(token)) sets.set(token, seed(profile.lanaya?.can_work ? "admitted" : profile.lanaya ? "candidate" : "seller"));
  return sets.get(token);
}

/** The pieces of the pilot policy (DEC-16). */
const REQUIRED = [{ value: "identity", label: "Pièce d'identité" }, { value: "professional_photo", label: "Photo professionnelle" }];

function me(set) {
  if (!set.profile) return { profile: null, countries: [{ code: "BF", name: "Burkina Faso" }], consents: CONSENTS.map((c) => ({ ...c, given: false })) };
  return {
    profile: set.profile,
    documents: set.documents,
    references: set.references,
    requirements: { documents: REQUIRED, references: 2 },
    consents: CONSENTS.map((c) => ({ ...c, given: Boolean(set.consents[c.key]) || set.kind === "admitted" })),
    capabilities: { candidate_onboarding: { value: "pilot", label: "Pilote" }, seller_invitation: { value: "pilot", label: "Pilote" } },
    capacity: set.kind === "admitted" ? { effective: 5, active: 1, available: 4 } : null,
    history: [{ event: "application.created", to: "draft", by_sugu: false, note: null, occurred_at: set.profile.created_at }],
  };
}

function openInvitations(set) {
  return (set.invitations ?? []).filter((i) => i.status.value === "open");
}

export default async function lanaya({ req, res, url, path, method, profile, token, send, readJson }) {
  const plumbing = path === "/__lanaya/received";
  if (!plumbing && path !== "/__lanaya/scenario" && !path.startsWith("/lanaya/") && !path.startsWith("/sellers/lanaya")) return false;

  const set = setOf(token, profile);
  const ok = (data, message, status = 200) => (send(res, status, { success: true, ...(message ? { message } : {}), data }), true);
  const refuse = (status, code, message, extra = {}) => (send(res, status, { success: false, error_code: code, message: `${code}: ${message}`, ...extra }), true);
  if (plumbing) return (send(res, 200, { received: set.received }), true);
  // What the back-office would have done for this seller (DEC-29): a proposal, or an accepted assignment.
  if (path === "/__lanaya/scenario") {
    const store = { id: String(profile.store?.id ?? "11"), name: profile.store?.name ?? "Boutique", slug: "boutique", city: "Ouagadougou" };
    const wanted = url.searchParams.get("seller");
    if (wanted === "proposed" || wanted === "replacing") set.proposal = { ...assignmentOf("asg-p", "proposed", store, set.now, { card: CARD, proposedDaysAgo: 1 }), consent: ASSIGNMENT_CONSENT };
    if (wanted === "active" || wanted === "replacing") set.assignment = assignmentOf("asg-a", "active", store, set.now, { card: wanted === "replacing" ? { ...CARD, public_code: "LNB-GH56IJ", name: "Issouf Zongo" } : CARD, proposedDaysAgo: 12, acceptedDaysAgo: 11 });
    return (send(res, 200, { assignment: set.assignment, proposal: set.proposal }), true);
  }

  const multipart = /multipart\/form-data/.test(req.headers["content-type"] ?? "");
  let raw = "";
  if (multipart) for await (const chunk of req) raw += chunk.toString("latin1");
  const body = method === "GET" || multipart ? {} : await readJson(req).catch(() => ({}));
  // A form with a file is logged by its own route, once its fields are read.
  if (method !== "GET" && !multipart) set.received.push({ path: `${method} ${path}`, body });

  // ── The seller's side ──
  if (path === "/sellers/lanaya" && method === "GET") {
    if (profile.user_type !== "seller") return refuse(403, "FORBIDDEN", "Réservé aux vendeurs.");
    const introduced = set.answered === "accepted" ? { ...CARD, accepted_at: iso(set.now) } : null;
    return ok({ stores: [{ id: String(profile.store?.id ?? "11"), name: profile.store?.name ?? "Boutique", city: "Ouagadougou", introduced_by: introduced, assignment: set.assignment, proposal: set.proposal }] });
  }
  const answer = /^\/sellers\/lanaya\/assignments\/([^/]+)\/(accept|decline|end)$/.exec(path);
  if (answer && method === "POST") {
    if (profile.user_type !== "seller") return refuse(403, "FORBIDDEN", "Réservé aux vendeurs.");
    const [, id, action] = answer;
    if (action === "end") {
      if (set.assignment?.id !== id) return refuse(404, "SUGU-LANAYA-ASSIGNMENT-UNAVAILABLE", "Cette affectation n'est pas disponible.");
      set.assignment = null;
      return ok(null, "L'accompagnement de votre boutique est terminé.");
    }
    if (set.proposal?.id !== id) return refuse(404, "SUGU-LANAYA-ASSIGNMENT-UNAVAILABLE", "Cette proposition n'est pas disponible.");
    if (action === "decline") {
      set.proposal = null;
      return ok(null, "Proposition refusée.");
    }
    if (body.consent !== true) return refuse(422, "VALIDATION", "Confirmez votre accord pour que ce Lanabaga accompagne votre boutique.", { errors: { consent: ["Confirmez votre accord pour que ce Lanabaga accompagne votre boutique."] } });
    const accepted = { ...set.proposal, status: state("assignment", "active"), accepted_at: iso(set.now) };
    delete accepted.consent;
    set.assignment = accepted;
    set.proposal = null;
    return ok(set.assignment, "Votre Lanabaga principal est enregistré.");
  }
  const invitationPath = /^\/lanaya\/invitations\/([A-Za-z0-9]+)(\/(accept|decline))?$/.exec(path);
  if (invitationPath) {
    const [, tokenOf, , action] = invitationPath;
    if (tokenOf !== KNOWN_TOKEN || set.answered) return refuse(404, "SUGU-LANAYA-INVITATION-UNAVAILABLE", "Cette invitation n'est pas disponible.");
    if (!action && method === "GET") {
      return ok({ lanabaga: CARD, company_name: profile.store?.name ?? "Boutique", message: "Je vous accompagne pour démarrer.", expires_at: iso(set.now + 10 * DAY), signed_in: true, stores: profile.user_type === "seller" ? [{ id: String(profile.store?.id ?? "11"), name: profile.store?.name ?? "Boutique", city: "Ouagadougou" }] : [], self: profile.user_type !== "seller", consent: SELLER_CONSENT });
    }
    if (action === "accept" && method === "POST") {
      if (body.consent !== true) return refuse(422, "VALIDATION", "Confirmez votre accord pour enregistrer cette mise en relation.", { errors: { consent: ["Confirmez votre accord pour enregistrer cette mise en relation."] } });
      set.answered = "accepted";
      return ok({ store_id: body.store_id, accepted_at: iso(set.now) }, "Mise en relation enregistrée.");
    }
    if (action === "decline" && method === "POST") {
      set.answered = "declined";
      return ok(null, "Invitation refusée.");
    }
  }

  // ── The Lanabaga's own file ──
  if (path === "/lanaya/me" && method === "GET") return ok(me(set));
  if (!set.profile) return refuse(404, "NOT_FOUND", "Aucune candidature.");

  if (path === "/lanaya/me/application" && method === "PUT") {
    if (!set.profile.editable) return refuse(422, "SUGU-LANAYA-APPLICATION-LOCKED", "Votre candidature ne peut plus être modifiée à cette étape.");
    for (const field of ["city", "specialties", "experience_band", "structure_name", "conflicts_declared"]) if (field in body) set.profile[field] = body[field];
    if (Array.isArray(body.references)) {
      set.references = body.references.map((r, index) => ({ id: `ref-${index + 1}`, position: index + 1, full_name: r.full_name, company: r.company, phone: normalize(r.phone), relation: state("relation", r.relation), verification_status: state("reference", "pending"), verified_at: null }));
    }
    return ok({ profile: set.profile, references: set.references }, "Candidature enregistrée.");
  }
  if (path === "/lanaya/me/application/submit" && method === "POST") {
    const missing = REQUIRED.filter((type) => !set.documents.some((d) => d.document_type.value === type.value && ["pending", "approved"].includes(d.review_status.value)));
    if (missing.length > 0) return refuse(422, "SUGU-LANAYA-DOCUMENTS-MISSING", `Pièces manquantes : ${missing.map((m) => m.label).join(", ")}.`);
    if (set.references.length < 2) return refuse(422, "SUGU-LANAYA-REFERENCES-MISSING", "2 référence(s) professionnelle(s) sont demandées.");
    if (!CONSENTS.every((c) => body.consents?.[c.key] === true)) return refuse(422, "SUGU-LANAYA-CONSENTS-MISSING", "Les engagements demandés doivent être acceptés pour soumettre.");
    for (const c of CONSENTS) set.consents[c.key] = true;
    set.profile = { ...set.profile, application_status: state("application", "submitted"), editable: false, submitted_at: iso(set.now) };
    return ok(set.profile, "Candidature soumise : SUGU va l'examiner.");
  }
  if (path === "/lanaya/me/documents" && method === "POST") {
    // The stand-in does not parse the form: the type is read in the raw body.
    const type = /name="document_type"\s+professional_photo/.test(raw) ? "professional_photo" : "identity";
    set.received.push({ path: `${method} ${path}`, body: { document_type: type, has_file: /name="file"; filename=/.test(raw) } });
    set.documents = [...set.documents.filter((d) => d.document_type.value !== type), documentOf(type, "pending", set.now)];
    return ok(set.documents.at(-1), "Pièce reçue.", 201);
  }

  // ── The network: an admitted Lanabaga only (LanabagaGuard) ──
  if (!set.profile.can_work) return refuse(403, "SUGU-LANAYA-ACCOUNT-NOT-ACTIVE", "Votre candidature Lanabaga n'est pas encore admise.");

  if (path === "/lanaya/me/overview" && method === "GET") {
    const open = openInvitations(set);
    return ok({
      profile: set.profile,
      capacity: { effective: 5, active: 1, available: 4 },
      counts: { sellers_introduced: 1, invitations_open: open.length, leads_active: set.leads.filter((l) => !["registered", "lost"].includes(l.status.value)).length, actions_required: open.length > 0 ? 1 : 0 },
      actions: open.length > 0 ? [{ key: "invitations_waiting", count: open.length }] : [],
      sellers: set.invitations.filter((i) => i.status.value === "accepted").map((i) => ({ ...i, store_active: true })),
      recent_leads: set.leads.slice(0, 5),
      level: { value: "new", label: "Nouveau" },
      commissions: { available: false },
      assigned: set.assignments,
      orders_followed: set.orders.length,
    });
  }
  if (path === "/lanaya/me/assignments" && method === "GET") return ok({ items: set.assignments, past: set.pastAssignments });
  if (path === "/lanaya/me/orders" && method === "GET") return ok({ items: set.orders, meta: { total: set.orders.length, current_page: 1, last_page: 1 } });
  if (path === "/lanaya/me/leads" && method === "GET") {
    const params = url.searchParams;
    let items = set.leads;
    if (params.get("status")) items = items.filter((l) => l.status.value === params.get("status"));
    if (params.get("city")) items = items.filter((l) => l.city === params.get("city"));
    if (params.get("search")) items = items.filter((l) => `${l.company_name} ${l.contact_name} ${l.phone}`.toLowerCase().includes(params.get("search").toLowerCase()));
    return ok({
      items,
      meta: { total: items.length, current_page: 1, last_page: 1, per_page: 10 },
      summary: { active: set.leads.filter((l) => !["registered", "lost"].includes(l.status.value)).length, converted: set.leads.filter((l) => l.status.value === "registered").length, total: set.leads.length, invitations_open: openInvitations(set).length },
      cities: [...new Set(set.leads.map((l) => l.city))].sort(),
    });
  }
  if (path === "/lanaya/me/leads" && method === "POST") {
    if (body.contact_permission !== true) return refuse(422, "VALIDATION", "Confirmez que cette personne accepte d'être contactée.", { errors: { contact_permission: ["Confirmez que cette personne accepte d'être contactée."] } });
    if (set.leads.some((l) => l.phone === normalize(body.phone))) return refuse(422, "SUGU-LANAYA-DUPLICATE-LEAD", "Ce numéro est déjà dans vos prospects.");
    const created = lead(`lead-${set.leads.length + 1}`, body.company_name, body.contact_name, body.phone, body.city, body.declared_source, "prospect", 0, set.now);
    set.leads = [created, ...set.leads];
    return ok(created, "Prospect ajouté.", 201);
  }
  if (path === "/lanaya/me/invitations" && method === "GET") {
    const status = url.searchParams.get("status");
    const items = status ? set.invitations.filter((i) => i.status.value === status) : set.invitations;
    return ok({ items, meta: { total: items.length, current_page: 1, last_page: 1 } });
  }
  if (path === "/lanaya/me/invitations" && method === "POST") {
    if (openInvitations(set).some((i) => i.phone === normalize(body.phone))) return refuse(422, "SUGU-LANAYA-DUPLICATE-INVITATION", "Une invitation en attente existe déjà pour ce numéro.");
    // MessageSanitizer: no link, no phone number in the personal note.
    const message = body.message ? String(body.message).replace(/https?:\/\/\S+/g, "").replace(/(\+?\d[\d\s]{6,}\d)/g, "").replace(/\s+/g, " ").trim() || null : null;
    const created = invitation(`inv-${set.invitations.length + 1}`, body.company_name, body.contact_name, body.phone, "open", 0, set.now, { message });
    set.invitations = [created, ...set.invitations];
    return ok({ invitation: created, link: `http://localhost/invitation/${"b".repeat(64)}` }, "Invitation créée.", 201);
  }
  const revoke = /^\/lanaya\/me\/invitations\/([^/]+)\/revoke$/.exec(path);
  if (revoke && method === "POST") {
    const target = set.invitations.find((i) => i.id === revoke[1]);
    if (!target) return refuse(404, "NOT_FOUND", "Introuvable.");
    target.status = state("invitation", "revoked");
    return ok(target, "Invitation révoquée.");
  }
  if (path === "/lanaya/me/sellers" && method === "GET") {
    const items = set.invitations.filter((i) => i.status.value === "accepted").map((i) => ({ ...i, store_active: true, assignment: null }));
    return ok({ items, meta: { total: items.length, current_page: 1, last_page: 1 } });
  }
  return false;
}
