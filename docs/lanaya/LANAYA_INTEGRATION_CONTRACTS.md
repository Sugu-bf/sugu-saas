# SUGU Lanaya — Contrats d'intégration

**Statut :** les éléments marqués **existant** sont vérifiés dans le code (L0, chemins cités) ; les éléments marqués **proposé** n'existent pas et ne seront créés qu'après le gate du Lot 0. Aucun chemin proposé ne doit être considéré comme présent.

---

## 1. Authentification et transport

| Client | Mécanisme | Existant / proposé |
|---|---|---|
| Portail Pro (Lanabaga, vendeur) | Cookie httpOnly `sugu_session` ; le BFF (`/api/proxy/[...path]`) ajoute le jeton Sanctum ; préfixes refusés par le relais : `auth`, `web-auth`, `admin` | existant |
| Back-office | Session web, groupe `auth` + `verified` + `role:admin|super-admin`, domaine `ADMIN_DOMAIN` | existant |
| Marketplace | Relais `/api/backend/*`, OTP téléphone | existant |
| Applications mobiles | JWT (`auth.jwt`), profil compact | existant — **aucune route Lanaya au Lot 1** |

Règles pour les routes Lanaya (proposé) : `auth:sanctum` ; garde `EnsureLanabagaActive` (modèle `EnsureCourierOperational`) sur les routes réservées aux admis ; garde de capacité pays ; limites de débit **nommées** (`throttle:…,lanaya.invitations.store`), jamais anonymes (piège connu : compteur partagé entre routes sans nom).

## 2. API proposée du Lot 1

Préfixe `/api/v1/lanaya`. Réponses au format existant `{ success, message, data }`.

### 2.1 Espace Lanabaga (compte connecté, sa propre ressource seulement)

| Méthode et chemin | Rôle | Garde |
|---|---|---|
| `GET /lanaya/me` | Statut complet : candidature, compte, identité, convention, capacité effective, capacités du pays | connecté |
| `POST /lanaya/me/application` | Créer sa candidature (une seule) | pays `candidate_onboarding` ouvert |
| `PUT /lanaya/me/application` | Modifier (profil, spécialités, conflits déclarés, références) | `draft` ou `info_requested` |
| `POST /lanaya/me/application/submit` | Soumettre ; consentements exigés | idem + pièces exigées présentes |
| `POST /lanaya/me/application/withdraw` | Retirer | avant décision |
| `POST /lanaya/me/documents` | Déposer une pièce (multipart, flux direct, pas de mise en mémoire par le relais) | `draft` / `info_requested` ; `throttle` nommé |
| `GET /lanaya/me/documents/{id}/file` | Relire sa pièce (via relais du portail) | propriétaire |
| `GET /lanaya/me/overview` | Tableau de bord : vendeurs, actions, capacité, statut | admis actif |
| `GET/POST /lanaya/me/leads`, `PUT /lanaya/me/leads/{id}` | Prospects | admis actif, convention valide |
| `GET/POST /lanaya/me/invitations`, `POST /lanaya/me/invitations/{id}/revoke` | Invitations (`Idempotency-Key` exigé en création) | idem + capacité `seller_invitation` + plafond |
| `GET /lanaya/me/sellers` | Vendeurs introduits (invitations acceptées) | admis |

### 2.2 Vendeur

| Méthode et chemin | Rôle | Garde |
|---|---|---|
| `GET /lanaya/invitations/{token}` | Aperçu : carte publique du Lanabaga (code, nom d'usage, ville, spécialités, compte actif), boutiques du vendeur éligibles | vendeur connecté ; réponse identique pour un jeton inconnu, expiré ou révoqué |
| `POST /lanaya/invitations/{token}/accept` | `{ store_id }` | propriétaire de la boutique, pas le Lanabaga lui-même, invitation ouverte |
| `POST /lanaya/invitations/{token}/decline` | Refus | idem |
| `GET /sellers/lanaya` | État Lanaya de ses boutiques (origine, invitations) | propriétaire |

### 2.3 Back-office (routes web Inertia, groupe admin existant)

`/admin/lanaya/applications` (liste, filtres statut / pays / ville / identité / convention), `/admin/lanaya/applications/{id}` (dossier, références, historique, décision), `PUT …/review`, `POST …/request-info`, `PUT …/approve`, `PUT …/reject`, `PUT /admin/lanaya/profiles/{id}/suspend|reactivate`, `PUT /admin/lanaya/documents/{id}/status`, `GET /admin/lanaya/kyc-files/{document}` (URL signée 15 min), `POST /admin/lanaya/profiles/{id}/agreements`, `PUT /admin/lanaya/agreements/{id}/verify`, `/admin/lanaya/network`, `/admin/lanaya/policies` (+ `propose`, `approve`). Permissions : [LANAYA_PERMISSIONS_MATRIX.md](LANAYA_PERMISSIONS_MATRIX.md).

### 2.4 Profil de session (`AuthService::getUserProfile`, existant, étendu)

Ajout d'un bloc, **aucun champ existant modifié** (applications mobiles) :

```json
"lanaya": {
  "profile_id": "01J…",
  "public_code": "LNB-7K2Q9M",
  "application_status": "approved",
  "account_status": "active",
  "can_work": true
}
```

`null` quand le compte n'a pas de profil. Le portail en déduit l'espace `lanabaga` (ADR-03). Le cache de 60 s du profil s'applique : c'est un confort d'affichage, la décision reste celle du serveur à chaque requête.

## 3. Erreurs

Format existant (`docs/ERROR_CODES.md` du backend) : code préfixé dans `message`, plus un champ `error_code` structuré (déjà employé par `EnsureCourierOperational`), pour aller vers la forme cible sans casser les clients.

```json
{ "success": false, "error_code": "SUGU-LANAYA-ACCOUNT-SUSPENDED",
  "message": "SUGU-LANAYA-ACCOUNT-SUSPENDED: Votre compte Lanabaga est suspendu." }
```

| Code | HTTP | Condition |
|---|---|---|
| `SUGU-LANAYA-CAPABILITY-CLOSED` | 403 | capacité fermée pour le pays du profil |
| `SUGU-LANAYA-ACCOUNT-NOT-ACTIVE` | 403 | candidat non admis sur une route d'admis |
| `SUGU-LANAYA-ACCOUNT-SUSPENDED` | 403 | compte suspendu |
| `SUGU-LANAYA-AGREEMENT-INVALID` | 403 | convention absente, non contrôlée ou expirée |
| `SUGU-LANAYA-APPLICATION-LOCKED` | 422 | modification hors `draft` / `info_requested` |
| `SUGU-LANAYA-DOCUMENTS-MISSING` | 422 | soumission sans les pièces exigées par la politique |
| `SUGU-LANAYA-TRANSITION-REFUSED` | 422 | transition d'état non autorisée |
| `SUGU-LANAYA-SELF-INTRODUCTION` | 422 | Lanabaga et propriétaire de la boutique sont le même compte |
| `SUGU-LANAYA-INVITATION-LIMIT` | 422 | plafond d'invitations ouvertes atteint |
| `SUGU-LANAYA-INVITATION-UNAVAILABLE` | 404 | jeton inconnu, expiré, révoqué ou utilisé (indistinctement) |
| `SUGU-LANAYA-CAPACITY-REACHED` | 422 | capacité effective atteinte (Lot 2) |
| `SUGU-LANAYA-2FA-REQUIRED` | 403 | écriture du back-office sans 2FA confirmée ou récente |

Le registre `docs/ERROR_CODES.md` du backend sera complété au Lot 1.

## 4. Idempotence et concurrence

- Création d'invitation et soumission de candidature : en-tête `Idempotency-Key` (déjà transmis par le relais du portail) ; une clé rejouée rend le même résultat.
- Acceptation d'invitation : transaction qui verrouille l'invitation puis le profil (`FOR UPDATE`), contrôle l'état, écrit l'acceptation et l'événement ; un double clic ne crée qu'une acceptation.
- Toute transition d'état : comparaison de l'état attendu dans la même requête SQL (`WHERE application_status = :attendu`) ; zéro ligne touchée = 422 `SUGU-LANAYA-TRANSITION-REFUSED`.

## 5. Événements

### 5.1 Événements natifs utiles (existant)

| Source | Événement | Usage Lanaya | Lot |
|---|---|---|---|
| Commandes | `App\Events\Orders\OrderConfirmed`, `OrderDelivered`, `OrderCanceled` | suivi, commande effective | 2-3 |
| Paiements | `App\Events\Payments\PaymentReceived`, `RefundProcessed`, `WalletCredited` | suivi, ajustements | 3-5 |
| Livraison | `App\Events\Delivery\*` (statuts d'expédition diffusés sur Reverb) | chronologie | 2 |

### 5.2 Événements natifs manquants (à demander aux domaines propriétaires, jamais simulés par Lanaya)

| Besoin (cahier §25.1) | Constat | Lot |
|---|---|---|
| Commande créée | aucun événement à la création (`PlaceOrderAction`) | 3 |
| Commission acquise (règlement d'une commande pour une boutique) | aucun événement ; seule trace : `product_fee_settled_at` + transaction `stl_product_{order}` au grand livre | 5 |
| Litige ouvert / résolu / rouvert | aucun événement | 5 |
| Boutique suspendue, KYB retiré | aucun événement dédié | 2 |
| Produit recatégorisé / archivé | aucun événement | 7 |

### 5.3 Événements Lanaya proposés au Lot 1

Écrits dans `lanaya_events` (ADR-08) dans la transaction de l'action ; diffusés ensuite comme événements Laravel (`App\Events\Lanaya\*`) pour les notifications, découverts automatiquement selon `docs/CONVENTIONS_EVENTS.md` (jamais d'`Event::listen` manuel).

`ApplicationSubmitted`, `ApplicationInfoRequested`, `ApplicationApproved`, `ApplicationRejected`, `AccountSuspended`, `AccountReactivated`, `AgreementRecorded`, `AgreementVerified`, `DocumentReviewed`, `InvitationCreated`, `InvitationAccepted`, `InvitationDeclined`, `InvitationRevoked`, `PolicyApproved`.

Champs communs : identifiant unique, type, version du schéma (`1`), sujet, pays, horodatage, acteur, identifiant de corrélation (celui de `AuditContext` existant), clé d'idempotence. Un consommateur qui reçoit deux fois le même identifiant ne fait rien la seconde fois.

## 6. Notifications (réutilise l'existant)

Canaux existants : e-mail, SMS, WhatsApp, push, base de données (`NotificationTemplate`, `NotificationDispatchLog`). Lot 1 : candidat (soumission reçue, complément demandé, décision, suspension), vendeur invité (invitation : SMS ou WhatsApp avec le gabarit SUGU fixe et le seul lien officiel), Ops (nouvelle candidature, doublon signalé). Aucune donnée de pièce, aucun motif sensible dans un SMS.

## 7. Dépendances Checkout et Finance (aucune au Lot 1)

| Dépendance | Lot | Décision préalable |
|---|---|---|
| Contexte Lanaya par (commande, vendeur), VCL | 3 | DEC-02, DEC-11 |
| Blocage du paiement d'une sous-commande en régime Négocié | 4 | DEC-03, DEC-04, DEC-22 |
| Part Standard = 20 % de l'écriture `RevenueCommission` (commande, boutique) | 5 | DEC-07, R-07 (règles de catégorie ignorées au règlement) |
| Versement aux Lanabagas | 5 | DEC-03, DEC-19 |

Le Lot 1 ne lit ni n'écrit aucune table de commande, de paiement, de portefeuille ou du grand livre.

## 8. Affectations et attributions (DEC-29 à DEC-32, livré le 21 octobre 2026)

### 8.1 Lanabaga (portail, `LanabagaGuard` : admis, actif, convention valide)

| Méthode | Route | Réponse |
|---|---|---|
| GET | `/api/v1/lanaya/me/assignments` | `{ items: Assignment[] (proposées, actives), past: Assignment[] (20 dernières terminées, refusées, retirées) }` |
| GET | `/api/v1/lanaya/me/orders?page=` | `{ items: Attribution[] (actives seulement), meta }`, 20 par page |
| GET | `/api/v1/lanaya/me/overview` | ajoute `assigned` (10 affectations actives ou proposées) et `orders_followed` (nombre d'attributions actives) |

### 8.2 Vendeur (propriétaire de la boutique ; une affectation d'une autre boutique répond 404)

| Méthode | Route | Corps | Réponse |
|---|---|---|---|
| GET | `/api/v1/sellers/lanaya` | — | chaque boutique ajoute `assignment` (active) et `proposal` (en attente, avec `consent: { key: "seller_assignment", version, text }`) |
| POST | `/api/v1/sellers/lanaya/assignments/{id}/accept` | `{ consent: true }` (refus 422 sinon) | l'affectation active |
| POST | `/api/v1/sellers/lanaya/assignments/{id}/decline` | — | — |
| POST | `/api/v1/sellers/lanaya/assignments/{id}/end` | `{ reason?: string }` | — |

Limite de débit dédiée `lanaya.assignments.answer`.

### 8.3 Back-office (Inertia, `lanaya-ops`, 2FA confirmée)

| Méthode | Route | Permission |
|---|---|---|
| GET | `/admin/lanaya/stores?q=` (JSON : 15 boutiques actives au plus, leurs affectations en cours) | `lanaya.assignments.manage` |
| POST | `/admin/lanaya/applications/{profile}/assignments` `{ store_id, reason ≥ 10 }` | `lanaya.assignments.manage` |
| PUT | `/admin/lanaya/assignments/{assignment}/cancel` `{ reason ≥ 5 }` | `lanaya.assignments.manage` |
| PUT | `/admin/lanaya/assignments/{assignment}/end` `{ reason ≥ 5 }` | `lanaya.assignments.manage` |
| GET | `/admin/lanaya/orders?number=` (page « Commandes ») | `lanaya.network.view` |
| POST | `/admin/lanaya/orders/{order}/attributions` `{ store_id, lanabaga_profile_id, reason ≥ 5 }` | `lanaya.orders.attribute` |
| PUT | `/admin/lanaya/attributions/{attribution}/remove` `{ reason ≥ 5 }` | `lanaya.orders.attribute` |

### 8.4 Formes

- `Assignment` : `id`, `status {value,label}`, `scope`, `store {id,name,slug,city,active}`, `lanabaga` (carte publique, côté vendeur seulement), `proposed_at`, `accepted_at`, `declined_at`, `cancelled_at`, `ended_at`, `ended_by_capacity`.
- `Attribution` : `id`, `status`, `order {id, number, status {value,label}, placed_at}`, `store {id,name,city}`, `lanabaga {public_code,name}`, `attributed_at`, `ended_at`. **Ni montant, ni acheteur, ni adresse.**

### 8.5 Événements (`lanaya_events`)

`assignment.proposed`, `assignment.cancelled`, `assignment.accepted`, `assignment.declined`, `assignment.ended` (un transfert termine l'affectation précédente par cet événement, avec l'affectation qui la remplace), `order_attribution.added`, `order_attribution.reassigned`, `order_attribution.removed` — avec l'acteur, sa qualité (Ops, vendeur) et le motif. Aucune notification n'est envoyée au vendeur ni au Lanabaga à ce stade : la proposition apparaît dans « Programme Lanaya » à sa prochaine visite.

## 9. Messagerie et support du programme (DEC-33 à DEC-37, livré le 21 octobre 2026)

### 9.1 Lanabaga (admis, actif, convention valide ; affectation active pour chaque conversation)

`lanaya/me/conversations` : `GET` (liste, curseur, `meta.counts`), `POST start { store_id }` (201 nouvelle, 200 retrouvée), `GET {id}`, `GET {id}/messages`, `POST {id}/messages` (texte, 5 pièces, `client_message_id`), `GET {id}/messages/{m}/attachments/{media}`, `POST {id}/read`, `POST {id}/typing`, `POST {id}/messages/{m}/report`, `GET {id}/presence`. Même forme que `seller/conversations` ; l'autre côté (`peer`) est la **boutique** (`type: store`), jamais le téléphone du vendeur ; `can.share_product`, `close`, `block` toujours faux ; `contact_policy.masked = [phone, email, link]`. Hors affectation active : 404 `SUGU-LANAYA-CONVERSATION-UNAVAILABLE`.

Canal privé `messaging.lanabaga.{userId}` (le compte lui-même, avec un profil Lanabaga) : `.message.created`, `.message.read`, `.user.typing`.

### 9.2 Vendeur

`POST sellers/lanaya/conversation { store_id }` → `{ id }` ; la conversation se lit ensuite sous `seller/conversations` (type `lanaya`, `peer.type = lanabaga`). `POST seller/conversations/{id}/close` sur une conversation `lanaya` : 422 (mettre fin à l'accompagnement). Tickets : `category = lanaya` exige `topic` parmi `my_lanabaga`, `conduct`, `other`.

### 9.3 Demandes au programme (tout profil Lanabaga)

`lanaya/me/tickets` : `GET` (page Laravel + `counts`, `topics`), `POST { subject, description, topic }`, `GET {id}`, `GET {id}/messages` (jamais de note interne ; l'équipe signe « Équipe Lanaya »), `POST {id}/messages` (3 pièces, `client_message_id`), `POST {id}/close`, `GET {id}/messages/{m}/attachments/{media}`. Une demande d'un autre compte : 404 `SUGU-LANAYA-TICKET-UNAVAILABLE`. Thème `conduct` : priorité haute. Réponse de l'équipe : e-mail `LanayaTicketRepliedNotification` sans le contenu.

### 9.4 Back-office

File du support : les tickets `lanaya` n'apparaissent (liste, compteurs, filtre, fiche, pièces) qu'avec `lanaya.support.handle` ; ailleurs, 404. Écrire, changer, assigner : 2FA exigée ; assignation à l'équipe Lanaya seulement. Menu Lanaya › « Support » (`/admin/support/tickets?category=lanaya`).

### 9.5 Contenu des messages (tous types)

`config/messaging.php` : `phone`, `email`, `link` masqués en `general`, `pre_order`, `order_support`, `lanaya` ; rien en livraison ni au support. Le message porte `metadata.masked` ; chaque conversation dit sa `contact_policy`.
