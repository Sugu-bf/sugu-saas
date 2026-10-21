# SUGU Lanaya — Audit d'intégration de l'existant (Lot 0)

**Date :** 21 octobre 2026
**Branches de travail :** `lanaya/lot0-lot1` dans `sugu` et `sugu-saas` (marketplace inchangée)
**Document normatif :** [SUGU_Lanaya_Cahier_Charges_Technique_Integration_v1.0.md](SUGU_Lanaya_Cahier_Charges_Technique_Integration_v1.0.md) (copie exacte de la pièce jointe : 35 sections, ACC-001 à ACC-070, DEC-01 à DEC-25)
**Lecteurs :** CTO, lead backend, Produit, Finance, Ops, Risk & Compliance

Ce rapport dit ce qui existe réellement dans les trois dépôts, où chaque capacité Lanaya peut se raccorder sans casser SUGU, et ce qui bloque. Il ne prescrit aucun code. Les décisions proposées sont dans [LANAYA_ARCHITECTURE_DECISIONS.md](LANAYA_ARCHITECTURE_DECISIONS.md), les validations attendues dans [LANAYA_DECISIONS_REGISTER.md](LANAYA_DECISIONS_REGISTER.md).

**Niveaux de preuve utilisés** (mission, §7) : L0 code lu ; L1 test unitaire ; L2 intégration réelle locale (Laravel + PostgreSQL) ; L3 parcours E2E local ; L4 staging ; L5 condition opérationnelle confirmée. Aucun résultat de ce rapport n'est au-dessus de L2.

---

## 0. Synthèse en dix constats

| # | Constat | Preuve | Conséquence pour Lanaya |
|---|---|---|---|
| 1 | Un compte n'a qu'**un seul `user_type`** (acheteur, vendeur, les deux, agence, coursier), et le portail n'ouvre **qu'un seul espace** par session. | L0 `app/Enums/Users/UserType.php`, `sugu-saas/src/lib/auth/session-user.ts:31` | Un vendeur qui devient Lanabaga ne doit pas changer de `user_type` : le statut Lanabaga vit dans un profil dédié, et la session du portail doit pouvoir porter **plusieurs espaces**. |
| 2 | La fiche Utilisateur du back-office **ne garde qu'un rôle** et réécrit `user_type`. | **L2** test I-1 | Le statut Lanabaga ne peut pas reposer sur un rôle Spatie seul : un simple enregistrement de fiche l'effacerait. |
| 3 | Le rôle `admin` **reçoit automatiquement toute permission** existante ; l'entrée du back-office exige `admin` ou `super-admin`. | **L2** tests I-2, I-3 | Sans exclusion explicite, chaque administrateur lirait les pièces KYC Lanabaga. La séparation des tâches exige d'exclure les permissions Lanaya sensibles du rôle `admin`. |
| 4 | Le checkout crée **une seule commande par panier**, au nom du premier vendeur ; chaque ligne garde son vendeur. Il n'existe **pas de sous-commande par vendeur**. | **L2** test O-1, L0 `PlaceOrderAction.php:222-225` | La VCL « par vendeur » (seuil 5 M) se dérive en groupant les lignes par `vendor_id`. DEC-02 doit l'acter avant le Lot 3. |
| 5 | La commission SUGU est calculée **au règlement** (72 h après livraison), **par boutique**, et inscrite au **grand livre** avec la boutique pour dimension. | **L2** test C-1, L0 `LedgerBook.php:505` | La part Standard (20 %) doit lire la commission inscrite pour (commande, boutique), jamais la recalculer. |
| 6 | Le règlement **ignore les règles de commission par catégorie** que le simulateur du back-office applique ; la règle retenue est **celle en vigueur au règlement**. `orders.commission_amount` n'est jamais écrit. | **L2** tests C-2, C-3 | Défaut financier existant, hors Lanaya, à arbitrer par Finance (registre R-07). Le snapshot Lanaya ne peut pas s'appuyer sur un taux figé à la commande : il n'y en a pas. |
| 7 | **Aucun système d'abonnement** (pas de SuguPro Plus, pas de plan Lanabaga), **aucun drapeau de fonctionnalité**, **aucune capacité par pays** (seul `countries.is_enabled`). | L0 recherche exhaustive | Le Lot 1 se limite au plan Standard gratuit (5 vendeurs), lu dans une politique versionnée à créer. Pro Plus et SuguPro Plus attendent DEC-06. |
| 8 | **Aucun prestataire de paiement ne sait répartir un paiement** entre plusieurs bénéficiaires (LigdiCash, Moneroo, SuguPay — passerelle propre, en Go). Le portefeuille vendeur est un sous-registre interne crédité au règlement. | L0 recherche dans `sugu` et `sugupay-backend` | Le régime Négocié (déduction d'honoraires) reste bloqué par DEC-03 et DEC-04 ([LEGAL GATE]). Aucun portefeuille Lanaya. |
| 9 | Les pièces KYC ont déjà un **disque privé** (`kyc_private`) et une **sortie unique** contrôlée (`KycStorage`) ; le staging perd encore ses pièces à chaque déploiement. | L0 `app/Support/Kyc/KycStorage.php`, mémoire de recette du 12/10 | Réutiliser `KycStorage` pour les pièces Lanabaga ; la persistance du bucket privé en staging est un prérequis de recette (R-05). |
| 10 | Le back-office est **Laravel + Inertia + Vue** (`resources/js/admin`), pas Next.js. Le journal d'audit est `spatie/activitylog` (table `activity_log`, lecture seule dans l'admin). | L0 `routes/admin.php`, `resources/js/admin/pages/*` | La console des candidatures s'ajoute au back-office existant. Les décisions Lanaya critiques demandent en plus un historique append-only propre (ADR-08). |

**Verdict Lot 0 :** l'inventaire est complet et les points d'intégration sont identifiés. Après revue, l'utilisateur a validé le Lot 0 le 21 octobre 2026 « pour les 4 rôles » et tranché les décisions d'entrée (§11) : **GO LOT 1**.

---

## 1. Baseline Git (vérifiée le 21 octobre 2026)

`git fetch` fait sur les trois dépôts ; aucun n'avait bougé sur le distant.

| Dépôt | Rôle | `main` = `staging` = `production` | Branche Lanaya | Fichiers non suivis préexistants |
|---|---|---|---|---|
| `../sugu` | Backend Laravel 12 + back-office Inertia/Vue | `ded89b64` | `lanaya/lot0-lot1` (+ `9a754661`, tests de caractérisation) | aucun |
| `sugu-saas` | Portail Pro Next.js 16 (vendeur, agence, coursier) | `956fd76` | `lanaya/lot0-lot1` (documents Lot 0) | `docs/PRO_DASHBOARD_RECON.md`, `docs/V10_RELEASE_READINESS.md`, `docs/captures/` (travaux V10, laissés tels quels) |
| `../sugu-marketplace` | Marketplace acheteur Next.js 16 | `1b7358e` | aucune (lecture seule) | aucun |

La V10 est **poussée et en production** (mise en production du 21 octobre 2026 : `ded89b64`, `956fd76`, `1b7358e`). Je n'ai rien poussé.

Autres dossiers du poste examinés seulement pour la question des prestataires : `../sugupay-backend` (passerelle de paiement SuguPay, Go). Les dossiers `sugu-front`, `sugu-uat`, `sugu-pro-portal`, `sugu-marketplaces`, `sugu-marketpalce_old` ne sont pas des dépôts du programme et n'ont pas été utilisés.

**Applications mobiles :** leur code n'est pas sur ce poste. Elles existent côté API (`routes/api_v1/mobile/*`, `routes/api_v1/auth/mobile_auth_api_v1.php`, JWT à part de Sanctum). Toute modification d'un contrat partagé (profil `/auth/me`, liste publique `GET /api/v1/auth/user-types`) est donc un risque de compatibilité non vérifiable ici (registre R-09).

---

## 2. Architecture observée

```
 Acheteur ──> sugu-marketplace (Next.js, BFF /api/backend/*)  ─┐
 Pro      ──> sugu-saas (Next.js, BFF /api/proxy/*, cookie     ├──> sugu : API /api/v1 (Sanctum ; JWT mobile)
              httpOnly sugu_session)                           │        + back-office web /admin (Inertia/Vue,
 Mobile   ──> applications (code absent du poste)  ────────────┘          session, domaine ADMIN_DOMAIN)
                                                                          PostgreSQL · Redis · Horizon · Reverb
                                                                          R2 public (CDN) · R2 privé (KYC)
 Prestataires : LigdiCash (collecte + versements), Moneroo, SuguPay (passerelle SUGU au-dessus de LigdiCash)
```

- **Backend** : monolithe Laravel 12, PHP 8.3. Domaines partiels sous `app/Domain/*` (Cart, Checkout, Orders, Payments, Inventory, SuguBox, Webhooks, Audit…) et services sous `app/Services/*`. Spatie Permission (rôles et permissions), Spatie Activitylog (audit), Spatie Settings (réglages non versionnés), Spatie Medialibrary, Horizon, Reverb, Scramble.
- **Portail Pro** : Next.js 16, React 19, TanStack Query, Zod, Foundation + AppShell, BFF strict (aucun jeton dans le navigateur, relais `/api/proxy/[...path]` qui refuse `auth`, `web-auth`, `admin`), une seule source de navigation (`src/components/app-shell/navigation.ts`).
- **Marketplace** : Next.js 16, Vitest seulement ; relais `/api/backend/*`.
- **Back-office** : routes web `routes/admin.php` (1 175 lignes) derrière `auth`, `verified`, `role:admin|super-admin`, servies sur le seul `ADMIN_DOMAIN` en production.

---

## 3. Constats par domaine

### 3.1 Identité, comptes, sessions [ACC-001 à 006]

| Élément | Observation | Niveau |
|---|---|---|
| Modèle | `App\Models\User` (ULID, SoftDeletes, Spatie `HasRoles`, Fortify 2FA, Sanctum). | L0 |
| Type de compte | `user_type` unique : `buyer`, `seller`, `both`, `delivery_partner`, `courier` (`UserType.php`). `getAllowedTypes()` « ajoute automatiquement tout nouveau cas » et alimente la route **publique** `GET /api/v1/auth/user-types` (`MobileAuthController.php:519`). | L0 |
| Inscription | Web : `user_type` forcé à `buyer` (`RegisterRequest.php:82-88`, SEC-08). Mobile : acheteur. Coursier : inscription par invitation d'agence (`CourierSignupController`). Agence, vendeur : créés par l'admin, l'onboarding ou le formulaire commercial. | L0 |
| Statut | `status` 0 attente, 1 actif, 2 suspendu, 3 banni ; `isAccessBlocked()` ; middleware `LogoutBlockedAccount`. | L0 |
| Rôles du portail | `AuthService::assignUserRoles` : `seller`, `buyer`, `partner`, `courier`. `updateUserType()` vide tous les rôles (`syncRoles([])`) — non appelée aujourd'hui. | L0 |
| Fiche admin | `UsersService::updateUser` : `syncRoles([$data['role']])` puis `user_type` déduit du rôle. Un compte à deux rôles en perd un. | **L2 (I-1)** |
| Profil de session | `AuthService::getUserProfile` mis en cache **60 s** (`AuthService.php:454`) ; renvoie un `user_type`, des `roles`, et les objets `store`, `agency`, `courier`. | L0 |
| Portail | `mapRole()` transforme le profil en **un** rôle (`vendor`, `agency`, `courier`) ; un profil inconnu donne `null` (jamais « vendeur par défaut »). `RoleGuard` compare `user.role` à l'espace de l'URL. Le cookie de session est httpOnly. | L0 |
| Jetons | Portail : Sanctum, utilisateur relu à chaque requête. Mobile : JWT, utilisateur mis en cache **900 s** (`AuthenticateJwt.php:101`). | L0 |
| Double vérification | Fortify 2FA ; vérification de connexion par e-mail pour les comptes Pro (V9, `account/security/login-verification`) ; 2FA admin exigeable (`EnsureAdmin2faMiddleware`). | L0 |

**Réponse à la question de la mission :** oui, un utilisateur existant peut devenir Lanabaga **sans second compte**, à condition de ne toucher ni à `user_type` ni à ses rôles : un profil Lanabaga rattaché à `users.id`, lu par les policies serveur ; côté portail, une session qui liste ses espaces (vendeur **et** Lanabaga) avec un passage explicite de l'un à l'autre (ADR-02, ADR-03). Conséquences :

- **session** : le profil `/auth/me` gagne un bloc `lanaya` (statut de candidature, compte, capacité) ; le portail en déduit l'espace supplémentaire ;
- **navigation** : un sélecteur d'espace dans le menu utilisateur quand le compte en a plusieurs ; chaque espace garde sa navigation propre ;
- **policies et gardes Laravel** : chaque route Lanaya vérifie le profil (état, pays, capacité) côté serveur, à chaque requête, sans cache ;
- **changement de contexte** : toujours explicite et visible (« Espace Lanabaga » / « Espace vendeur ») ; une action n'agit que dans l'espace de son URL ;
- **conflit d'intérêts** : un Lanabaga ne peut ni inviter, ni accompagner, ni se rémunérer sur une boutique dont il est propriétaire ; aucune approbation ne peut être faite par le compte qui en bénéficie (ACC-005).

### 3.2 Administration et autorisations [ACC-006, séparation des tâches]

| Élément | Observation | Niveau |
|---|---|---|
| Entrée du back-office | `role:admin|super-admin` sur tout le groupe `routes/admin.php:18`. Un rôle restreint seul (Finance, Modération…) n'entre pas. | **L2 (I-3)** |
| Rôle `admin` | Reçoit **toutes** les permissions sauf `settings.platform.manage`, `maintenance.manage`, `backups.manage` (`ProductionRolesPermissionsSeeder.php:491-495`), y compris celles créées plus tard, à chaque passage du seeder. | **L2 (I-2)** |
| Rôles restreints | `moderator`, `finance-manager` (dont `kyc.view`, `kyc.review`), `marketing-manager`, `support-agent`, `logistics-manager`, `backend-developer`, `mobile-developer`, `designer`. Utilisables seulement **en plus** de `admin`, qui donne déjà tout. | L0 |
| Attribution des rôles | `RolePolicy::grantPermission` : on n'accorde à un rôle qu'une permission qu'on détient (garde-fou utile). `AdminRolesRequest` : rôles d'administration seulement, `super-admin` réservé. **Pas d'interdiction de modifier ses propres rôles.** | **L2 (I-4)**, L0 |
| KYC vendeur actuel | `VendorKycPolicy` : tout `admin` voit, approuve et rejette. | L0 |
| KYC coursier | Revue par l'agence (portail) ; consultation admin `/admin/couriers`. | L0 |
| 2FA admin | `SecuritySettings::admin_2fa_required` (désactivable). | L0 |

Conséquence : **la séparation Ops / Risk-Compliance / Finance demandée par le cahier (§5, §19.3) n'existe pas aujourd'hui dans le back-office.** Elle se construit pour Lanaya par des permissions `lanaya.*` exclues du rôle `admin`, attribuées par un super-admin seulement, et des policies qui ne lisent que ces permissions (ADR-05, matrice dans [LANAYA_PERMISSIONS_MATRIX.md](LANAYA_PERMISSIONS_MATRIX.md)).

### 3.3 Vendeurs, boutiques, catalogue

| Élément | Observation | Niveau |
|---|---|---|
| Identifiant canonique | `stores.id` (ULID), propriétaire `stores.owner_id` → `users.id`. Un utilisateur peut posséder plusieurs boutiques (V10.1). | L0 |
| Statuts boutique | `StoreStatus` : 0 brouillon, 1 en attente, 2 active, 3 suspendue, 4 fermée ; `is_verified`, `risk_score`, `suspended_until`. | L0 |
| KYB | `store_kyc_documents` (+ fichiers sur `kyc_private`), `store_verification_requests`, files d'attente admin `/admin/vendors/kyc` et `/admin/vendors/onboarding`. | L0 |
| Contexte géographique | `stores.country_code`, `city`, `lat/lng`. | L0 |
| Catégories | `stores.primary_category_id` (catégorie de boutique) ; produits : `products.primary_category_id`, marques, variantes (`product_variants`). | L0 |
| Personnel de boutique | Rôle `seller-staff` défini mais aucune délégation dans l'API : l'autorité vendeur = propriété de la boutique (`resolveStore()` dans les contrôleurs vendeur). | L0 |
| Canal « commercial » existant | Formulaire public à **code partagé** (`/public/commercial/stores`, désactivé par défaut) : un agent identifié par un nom libre crée le compte vendeur, la boutique **et son compte de versement** (`CommercialStoreService.php:160`). | L0 |

Rattachement Lanaya : aux identifiants natifs `stores.id` (affectation boutique), `product_categories.id`, `products.id` ou `product_variants.id` (Lot 7). **Aucune copie de produit ni de boutique.** Le formulaire commercial ne doit **pas** servir de modèle aux invitations Lanaya : il ne recueille pas le consentement du vendeur et laisse un tiers fixer le bénéficiaire des versements (interdit au Lanabaga, cahier §5).

### 3.4 Commandes et checkout [DEC-02, DEC-11]

Chaîne réelle observée :

```
Panier (Domain/Cart) → session de checkout (CheckoutSession, pricing_snapshot)
  → PlaceOrderAction : UNE commande (orders.merchant_id = premier vendeur des lignes)
      + order_items (vendor_id par ligne, line_subtotal / line_discount / line_tax / line_total)
      + adresse, transaction de paiement, expéditions, DeliveryOrder
  → paiement (en ligne : SuguPay / LigdiCash / Moneroo ; COD legacy ou COD Mixte)
  → confirmation vendeur (COD Mixte), préparation, expédition (shipments), livraison (POD, code de remise)
  → règlement 72 h après la livraison (sans litige actif) : par boutique, commission au grand livre, portefeuilles crédités
  → remboursements, retours, litiges (Refund, Return, Dispute)
```

| Élément | Observation | Niveau |
|---|---|---|
| Unité de commande | Une commande par panier, multi-vendeurs possible ; `merchant_id` = premier vendeur. | **L2 (O-1)** |
| Unité « par vendeur » | Pas d'entité ; se dérive de `order_items.vendor_id` (c'est ce que fait déjà `ProductSettlementSplitter`). | L2 (O-1), L0 |
| Montants | En centimes entiers (`*_amount`), devise sur la commande (`orders.currency`). | L0 |
| Remises | `line_discount_amount` par ligne pour les coupons vendeur ; `discount_amount` global sur la commande. | L0 |
| Idempotence | `X-Idempotency-Key` obligatoire au checkout ; clés d'idempotence sur les écritures de portefeuille et du grand livre. | L0 |
| Statuts | `orders.status`, `payment_status`, `fulfillment_status` ; historique `order_status_histories`. | L0 |
| Verrouillage | Aucun « verrouillage » métier distinct ; `totals_snapshot` fige les montants de la tarification. | L0 |
| Événements | `OrderConfirmed`, `OrderDelivered`, `OrderCanceled`, `PaymentReceived`, `RefundProcessed`, `WalletCredited`. **Pas** d'événement à la création, au règlement, ni à l'ouverture d'un litige. | L0 |

Conséquence pour le Lot 3 (rien n'est touché au Lot 1) : la VCL d'un vendeur = somme de ses lignes **après** leurs remises, hors transport et taxes ; la répartition de la remise globale (`orders.discount_amount`) entre vendeurs n'existe pas et doit être décidée (DEC-11). Le checkout n'est pas modifié avant le Lot 3.

### 3.5 Commission marketplace, finance et prestataires [DEC-03, DEC-04, DEC-07, DEC-19]

| Étape demandée par la mission (§13) | Ce qui existe | Niveau |
|---|---|---|
| 1. Calcul commercial théorique | `CommissionCalculator::calculate()` (règles vendeur > catégorie > marque > global) ; simulateur admin `CommissionController`. | L0 |
| 2. Créance conditionnelle | Séquestre du grand livre (fonds bloqués 72 h après livraison). | L0 |
| 3. Commission acquise | Écriture `RevenueCommission` au règlement, par boutique (`LedgerBook::releaseProduct`, l. 505). | **L2 (C-1)** |
| 4. Montant payable | Solde du portefeuille vendeur (`Wallet`, `WalletEntry`), délai de 72 h (CGV de la marketplace). | L0 |
| 5. Paiement initié | Demande de retrait (`Payout`, `WithdrawalService`), réserve au grand livre. | L0 |
| 6. Paiement confirmé | Versement LigdiCash ou SuguPay ; `LIGDICASH_AUTO_PAYOUT` et `SUGUPAY_AUTO_PAYOUT_ENABLED` désactivés par défaut. | L0 |

Écarts constatés (existants, hors Lanaya, signalés à Finance — registre R-06, R-07) :

- le règlement appelle `calculate($splitGross, 0, $storeId)` **sans catégorie ni marque** (`OnlineOrderSettlementService.php:139`, `PrepaidCodSettlementService.php:148`, `SettlementService.php:490`) : une règle de catégorie créée au back-office n'est jamais appliquée alors que le simulateur l'applique (**L2, C-2**) ;
- la règle retenue est celle en vigueur **au règlement**, pas à la commande (**L2, C-3**) ;
- `orders.commission_amount` et `order_items.line_commission_amount` ne sont **jamais écrits** ; les rapports admin Finance, Ventes et Vendeurs qui les lisent affichent donc 0 commission (L0 + **L2, C-3**) ;
- l'assiette du règlement est `line_subtotal_amount` (avant remise de ligne) ;
- `POST sellers/premium/upgrade` répond « Upgrade en cours… » sans rien faire (`SellerDashboardController.php:480`) : bouton fictif possible côté client.

**Prestataires.** LigdiCash par défaut (collecte, versements) ; bascule prévue vers SuguPay, passerelle SUGU en Go (dépôt local `sugupay-backend`), par `config/payments.php` (`default_provider`) ; `cinetpay` et `moneroo` sont des alias qui passent par le service LigdiCash (`PaymentProviderService.php:122-126`), Moneroo ayant son propre traitement de webhook. Aucune fonction de **répartition d'un paiement entre plusieurs bénéficiaires** n'a été trouvée (recherche textuelle, L0, non exhaustive par nature). Ce que Laravel sait faire : encaisser sur SUGU, puis créditer des portefeuilles internes au règlement. Une déduction d'honoraires Lanabaga sur le règlement vendeur serait donc **un mouvement interne SUGU**, dont la licéité (rôle de SUGU, BCEAO, mandat du vendeur) relève de DEC-03 et DEC-04 et exige une confirmation écrite. **Rien n'est automatisé avant.**

### 3.6 Abonnements [DEC-06]

Recherche dans le code, les migrations et la configuration : **aucun plan, aucun abonnement, aucun droit (entitlement)**. La page « Tarifs » du portail dit elle-même qu'aucune grille n'est publiée. Il n'y a donc **pas de « second système d'abonnement » à éviter : il n'y en a pas de premier**. Le Lot 1 n'en crée pas : la capacité Standard (5 vendeurs) vient d'une politique versionnée ; Pro Plus et SuguPro Plus restent désactivés jusqu'à ce que Produit et Finance définissent l'offre, son prix et sa facturation (DEC-06), puis qu'un système d'abonnement de plateforme soit conçu (hors Lanaya).

### 3.7 Livraison, messagerie et preuves

| Élément | Observation | Niveau |
|---|---|---|
| Livraison | `shipments`, `delivery_orders`, `proofs_of_delivery`, `delivery_verifications` ; code de remise réservé à l'acheteur (route `orders/{id}/delivery-code`, V4.1), purgé en clair par `ClearPlainDeliveryCodesJob`. | L0 |
| Messagerie | `conversations` typées (`pre_order`, `order_support`, `general`, `support_chat`, `delivery_support`, `courier_customer`, `courier_store`), `conversation_participants` (types client, vendeur, admin, coursier, agence), canaux Reverb privés par utilisateur, boutique, coursier, agence. | L0 |
| Pièces jointes | Bucket public du CDN, lues par une route authentifiée (V8). | L0 |

Pour Lanaya (Lot 2 et suivants) : un participant `lanabaga` invité à **une** conversation de commande, jamais un accès aux conversations de la boutique ; jamais de lecture du code de remise ; aucune confirmation de livraison hors du mécanisme natif. Rien n'est nécessaire au Lot 1.

### 3.8 Stockage privé et pièces KYC

`App\Support\Kyc\KycStorage` est la seule autorité : disque `kyc_private` (bucket R2 privé si `R2_PRIVATE_BUCKET`, sinon disque local), refus d'écrire en production sans bucket privé, refus d'un bucket partagé avec le CDN, sortie par URL signée de 15 minutes ou route authentifiée, en-têtes `no-store`, `nosniff`. Tests existants : `KycPrivateStorageTest`, `KycStorageSelectionTest`, `KycStorageCheckCommandTest`.

Limites connues : sur le staging, le bucket privé n'était pas configuré au 15 octobre 2026 (pièces perdues à chaque déploiement, contrôle `kyc-persistence` 4/6). La recette L4 du Lot 1 en dépend (R-05). Les pièces jointes de messagerie restent sur le CDN public : elles ne doivent jamais recevoir de pièce d'identité.

### 3.9 Journal d'audit, événements, files

- `spatie/activitylog`, table `activity_log`, rétention configurée à 365 jours mais **aucune purge planifiée** ; écran admin en lecture seule (`AuditLogController` index/show) ; aide `audit()` (`app/Support/Audit/AuditLogger.php`) qui ajoute le contexte de requête.
- Pas de table append-only protégée : un administrateur de base peut modifier ou supprimer une ligne. Pour les décisions Lanaya critiques, un historique propre, sans mise à jour ni suppression par le code, est proposé (ADR-08), en plus de `activity_log`.
- Événements Laravel découverts automatiquement (`docs/CONVENTIONS_EVENTS.md`), webhooks sortants (`Domain/Webhooks`), files Redis sous Horizon. Pas de boîte d'envoi transactionnelle (outbox).

### 3.10 Pays, devises, configuration

`countries` (code ISO, `is_enabled`, `currency_code`), `currencies`, réglages Spatie (`CodSettings`, `CommercialSettings`, `SecuritySettings`…), non versionnés. **Aucun drapeau de fonctionnalité** (ni Pennant ni équivalent). Le cahier exige des capacités par pays explicites et désactivées par défaut (§26.1, §30.3) : à créer, en une seule table de politiques versionnées (ADR-06, ADR-07).

### 3.11 Marketplace acheteur [P1 / P2]

| Élément | Observation | Niveau |
|---|---|---|
| Authentification | Téléphone + OTP, relais `/api/backend/*`. | L0 |
| Panier, checkout, commandes, suivi | `cart`, `checkout`, `account/orders`, `track-order` ; COD Mixte, code de remise. | L0 |
| Messagerie | `messages/[conversationId]`, `support-chat`. | L0 |
| Fiches | `product/[slug]`, `store/[slug]`, `stores`, `fournisseurs`, `vendeurs`. **Aucun badge « vérifié » boutique ou produit n'est affiché aujourd'hui** ; seul « achat vérifié » sur un avis. | L0 |
| Contexte B2B | Prix par palier (`product_bulk_prices`, `product_variant_bulk_prices`), page « Fournisseurs » (« Grossistes et fabricants vérifiés pour vos achats en gros »), pas d'espace acheteur professionnel ni de demande de sourcing. | L0 |
| Données de démonstration | La page Fournisseurs et d'autres services (catalogue, recherche, boutiques, accueil) **retombent sur des données fictives** quand l'API ne répond pas (`features/supplier/services/supplier-service.ts:66`). | L0 |

Vocabulaire public existant : les conditions générales parlent d'une « période de garantie » (fonds retenus 72 h après la livraison), la politique anti-fraude de « protection des paiements », la page Fournisseurs de « fournisseurs vérifiés ». Le vocabulaire de Lanaya devra s'articuler avec ces textes sans laisser croire qu'un Lanabaga ajoute une garantie (cahier §17.5, ACC-068) : à revoir avec Brand et Legal au Lot 6.

Conséquences : aucun badge Lanaya n'est publié au Lot 1 ; tout futur affichage Lanaya sur la marketplace doit refuser tout repli sur des données fictives (un faux badge est pire qu'aucun badge) ; le libellé « fournisseurs vérifiés » existant ne doit pas être confondu avec un badge Lanaya (registre R-10). Rien n'a dû changer dans la marketplace pour ce lot ; vérifié selon la règle de synchronisation des trois dépôts.

---

## 4. Matrice Réutiliser / Étendre / Créer

| Domaine Lanaya | Fonction existante | Emplacement vérifié | Décision | Justification | Risque |
|---|---|---|---|---|---|
| Identité | Compte `User`, Sanctum, statut, 2FA, vérification de connexion | `app/Models/User.php`, `AuthService`, `routes/api_v1/account/*` | **Réutiliser** | Un Lanabaga est un utilisateur SUGU ; pas de second compte. | Faible |
| Identité (rôle) | `user_type`, rôles Spatie | `UserType.php`, `UsersService.php:306` | **Créer** un profil `lanabaga_profiles` (1 par utilisateur) ; **ne pas** ajouter de `user_type` ni dépendre d'un rôle | `user_type` est unique et public (mobile) ; la fiche admin efface les rôles (I-1). | Moyen : profil `/auth/me` à étendre sans casser le mobile (champ ajouté, rien retiré) |
| Session portail | Un espace par session | `session-user.ts`, `role-guard.tsx`, `navigation.ts` | **Étendre** : liste d'espaces + sélecteur | Un vendeur-Lanabaga doit accéder aux deux espaces. | Moyen : garde de route à faire évoluer avec tests |
| Conformité (KYC) | `KycStorage`, disque `kyc_private`, modèle courier `CourierKycDocument` | `app/Support/Kyc/KycStorage.php` | **Réutiliser** le stockage ; **créer** une table de pièces Lanabaga | Le KYC existant est par entité (boutique, coursier) ; un KYC générique demanderait de migrer les deux autres. | Faible ; staging sans bucket privé (R-05) |
| Convention | — | aucune | **Créer** `lanabaga_agreements` (référence, version, dates, preuve) | Rien n'existe. Contenu bloqué : convention v1.1 non fournie. | Bloquant documentaire (DEC-16) |
| Consentements | — (aucun enregistrement versionné, même pour les CGU) | aucune | **Créer** `lanaya_consents` (conçu pour pouvoir servir à la plateforme) | Preuve de version et d'horodatage exigée (§6.2, §13.3). | Faible |
| Vendeurs | `stores`, propriétaire, KYB, statuts | `app/Models/Store.php`, `/admin/vendors/*` | **Réutiliser** (identifiants natifs) | Cahier §2, §9. | Faible |
| Prospection / invitation | Invitations coursier (`driver_invitations`), formulaire commercial | `DriverInvitation.php`, `CommercialStoreService.php` | **Créer** `lanaya_seller_leads` et `lanaya_seller_invitations` sur le modèle des invitations coursier (jeton, expiration, statut), **pas** sur le formulaire commercial | Consentement du vendeur et absence de doublon exigés ; le formulaire commercial crée des comptes et des comptes de versement pour autrui. | Moyen : doublons de prospects, données personnelles de tiers (DEC-20) |
| Affectations | — | aucune | **Créer** au Lot 2 | Hors Lot 1. | — |
| Commandes | Commande multi-vendeurs, lignes avec vendeur | `PlaceOrderAction.php`, `order_items` | **Réutiliser** (lecture) au Lot 3 ; **créer** un contexte Lanaya par (commande, vendeur) | Pas de sous-commande native (O-1). | Élevé au Lot 3 : remise globale non ventilée (DEC-11) |
| Paiements | PSP, webhooks, idempotence | `app/Domain/Payments/*`, `app/Services/Payments/*` | **Réutiliser** (écoute) ; **aucune** modification | Cahier §4.2 : le PSP reste la vérité du paiement. | [LEGAL GATE] DEC-03 |
| Commissions | `CommissionCalculator`, grand livre | `app/Services/Commission/*`, `LedgerBook.php` | **Réutiliser** la commission inscrite au grand livre ; **étendre** le plan comptable (compte « partenaires Lanaya à payer ») au Lot 5 | Source de vérité unique de la commission acquise. | Élevé : écarts C-2 / C-3 à arbitrer par Finance |
| Règlements Lanabaga | Portefeuilles, retraits, LigdiCash | `app/Services/Wallet/*`, `Payouts/*` | **Ne pas** créer de portefeuille Lanaya ; sous-registre d'obligations + export de paiement validé au Lot 5 | Cahier §1.4, §14.2. | [LEGAL GATE] DEC-07, DEC-19 |
| Abonnements | — (aucun) ; stub `premium/upgrade` | `SellerDashboardController.php:480` | **Ne rien créer** au Lot 1 | Aucune offre définie (DEC-06). | Faible si les plans payants restent désactivés |
| Messagerie | Conversations typées, participants | `app/Models/Messaging/*` | **Étendre** au Lot 2 (participant Lanabaga sur une conversation de commande) | Pas de seconde messagerie. | Moyen : périmètre d'accès |
| Transport | Expéditions, POD, code de remise | `app/Models/Shipment/*`, `Delivery/*` | **Réutiliser** (lecture) au Lot 2 | Le Lanabaga n'est pas transporteur. | Faible |
| Documents | Disque privé, routes authentifiées | `KycStorage`, `KycFileController` | **Réutiliser** | Règle « rien n'envoie sur l'hôte de l'API » : sortie par le relais du portail. | Faible |
| Admin | Back-office Inertia/Vue, files KYC, journal | `routes/admin.php`, `resources/js/admin/pages/*` | **Étendre** : pages `lanaya/*`, permissions `lanaya.*` exclues du rôle `admin` | Pas de second back-office ; séparation des tâches à construire (I-2, I-3). | Moyen : seeder qui réécrit les rôles (runbook) |
| Audit | `activity_log`, `audit()` | `AuditLogger.php` | **Réutiliser** + **créer** `lanaya_events` append-only | Décisions critiques non effaçables par le code. | Faible |
| Pays / politiques | `countries.is_enabled`, réglages Spatie | `countries`, `app/Settings/*` | **Créer** `lanaya_policy_versions` (capacités par pays, capacité, délais), tout désactivé par défaut | Aucun mécanisme versionné ni par capacité. | Faible |
| Marketplace | Fiches, recherche, messagerie | `sugu-marketplace/src/features/*` | **Étendre** au Lot 6/8 (badge, accompagnement) | Aucun badge sans source de vérité. | Moyen : replis sur données fictives (R-10) |

**Créations proposées pour le Lot 1 : 9 tables** (détail et justification dans [LANAYA_DATA_MIGRATION_PLAN.md](LANAYA_DATA_MIGRATION_PLAN.md)). Les 26 entités logiques du cahier (§24) ne sont pas toutes des tables : 8 sont couvertes au Lot 1 par ces 9 tables, 3 réutilisent l'existant (grand livre, notifications, litiges), 15 attendent leur lot.

---

## 5. Matrice des quatre expériences

| Expérience | Parcours | Route existante ou future | API (proposée, à confirmer) | Permission / garde serveur | Priorité |
|---|---|---|---|---|---|
| Lanabaga — portail | Candidature (5 étapes : profil, identité, références, convention, validation) | future `/lanabaga/application` (portail) ; publique `/signup/lanabaga` pour un nouveau compte | `GET/PUT /api/v1/lanaya/me/application`, `POST …/submit`, `POST …/documents` | propriétaire du profil ; pays avec capacité `candidate_onboarding` | P0 |
| Lanabaga — portail | Tableau de bord (vendeurs, actions, commissions indisponibles, statut) | future `/lanabaga/dashboard` | `GET /api/v1/lanaya/me/overview` | profil admis et actif, convention valide | P0 |
| Lanabaga — portail | Prospects et invitations | futures `/lanabaga/prospects`, `/lanabaga/invitations` | `…/me/leads`, `…/me/invitations` (création, révocation) | profil actif ; capacité `seller_invitation` ; plafond d'invitations ouvertes | P0 |
| Lanabaga — portail | Mes vendeurs, fiche vendeur | futures `/lanabaga/sellers`, `/lanabaga/sellers/[id]` | `…/me/sellers` (Lot 1 : origines et invitations acceptées ; Lot 2 : affectations) | ressource rattachée au profil | P0 (liste) / Lot 2 (fiche complète) |
| Vendeur — portail | Invitation et consentement de mise en relation | future `/vendor/lanaya` (entrée « Lanaya » du menu) | `GET /api/v1/lanaya/invitations/{token}` (aperçu), `POST …/accept`, `POST …/decline` | propriétaire de la boutique visée ; jeton valide ; jamais sa propre boutique | P0 |
| Vendeur — portail | Programme, état du dossier | `/vendor/lanaya` | `GET /api/v1/sellers/lanaya` | propriétaire de la boutique | P0 (lecture) |
| Admin | Candidatures : liste, filtres, dossier, décision | futures `/admin/lanaya/applications`, `/admin/lanaya/applications/{id}` (Inertia) | routes web du back-office | `lanaya.applications.view` / `.decide` | P0 |
| Admin | Conformité : pièces, vérification, convention | `/admin/lanaya/applications/{id}` (onglet) ; fichiers `/admin/lanaya/kyc-files/{id}` | routes web, URL signée 15 min | `lanaya.kyc.view` / `.review` ; `lanaya.agreements.record` | P0 |
| Admin | Réseau : vendeurs invités, doublons, origines | future `/admin/lanaya/network` | routes web | `lanaya.network.view` / `.decide` | P0 |
| Admin | Politiques et pays | future `/admin/lanaya/policies` | routes web | `lanaya.policies.propose` / `.approve` (deux personnes) | P0 |
| Marketplace | Information « Accompagné par un Lanabaga » / badge LANAYA | fiches `product/[slug]`, `store/[slug]` | contrat de présentation (Lot 6/8) | public, données publiées seulement | P1 |
| Marketplace B2B | Demande d'achat en gros, mise en relation (maquette 9) | aucune | aucune | — | **P2 (Buyer Match), non cadré** |

La maquette « Besoin d'aide pour acheter en gros ? » décrit une **demande de sourcing** (produit, quantité, ville, budget, besoin d'accompagnement, suivi des demandes). Elle dépasse l'expérience acheteur P1 du cahier (§22 : badge, fiche de preuve, filtre) et correspond au **Buyer Match P2** (Lot 9). Elle n'est pas développée ; son cadrage est proposé comme décision produit complémentaire (DEC-26 dans le registre).

---

## 6. Dépendances contractuelles et documentaires

| Document | Disponible ? | Ce qui en dépend |
|---|---|---|
| Cahier des charges v1.0 | Oui (copie exacte dans ce dossier) | Tout |
| Convention pilote Lanaya–Lanabaga v1.1 (30/09/2026) et son annexe de rémunération | **Non fourni** | Conditions d'admission, pièces obligatoires, durée et préavis (§6.4), quota contractuel, Annexe A (délais, fréquence de paiement) |
| Master Guide v1.1 | **Non fourni** (déjà absent à la rédaction du cahier) | Règles marquées [À VALIDER] |
| Contrat vendeur (clause de déduction d'honoraires) | Non fourni | Régime Négocié (DEC-04) |
| Confirmation écrite du ou des prestataires de paiement | Non fournie | Répartition, déduction, versement aux Lanabagas (DEC-03) |
| Politique de conservation des données et preuves | Non fournie | Durée de conservation des pièces, prospects, journaux (DEC-20) |

Conformément à la mission, je n'ai simulé aucune convention signée et n'ai créé aucun droit, même de démonstration.

---

## 7. Registre des risques

| ID | Gravité | Risque | Origine | Traitement proposé |
|---|---|---|---|---|
| R-01 | **P0** | Pièces KYC Lanabaga lisibles par tout administrateur si les permissions suivent la règle actuelle du rôle `admin`. | I-2, I-3 | Permissions `lanaya.*` exclues du rôle `admin`, attribuées par un super-admin, policies sans raccourci de rôle ; tests négatifs ACC-006 (ADR-05). |
| R-02 | **P0** | Un compte Vendeur + Lanabaga approuve sa propre candidature, invite ou accompagne sa propre boutique. | §3.1 | Contrôle serveur « jamais sur sa propre ressource » à chaque action ; tests ACC-005. |
| R-03 | **P1** | Statut Lanabaga perdu ou accordé par erreur via un rôle Spatie (fiche admin, `user_type`). | I-1 | Statut = profil, pas rôle ; aucun `user_type` nouveau (ADR-02). |
| R-04 | **P1** | Nouveau cas `UserType` publié automatiquement aux applications mobiles (`GET /auth/user-types`), qui pourraient le proposer à l'inscription. | §3.1 | Ne pas ajouter de cas (ADR-02). |
| R-05 | **P1** | Pièces KYC perdues sur le staging à chaque déploiement (bucket privé absent). | Recette V10 | Faire configurer `R2_PRIVATE_BUCKET` sur le staging avant la recette L4 du Lot 1. |
| R-06 | **P1** | Rapports admin Finance / Ventes / Vendeurs affichent 0 commission (`orders.commission_amount` jamais écrit). | C-3 | Hors Lanaya : à arbitrer par Finance ; Lanaya lit le grand livre. |
| R-07 | **P1** | Règles de commission par catégorie ignorées au règlement ; règle non figée à la commande. | C-2, C-3 | Hors Lanaya : décision Finance avant le Lot 3 (le régime Standard en dépend). |
| R-08 | **P1** | Remise globale de commande non ventilée par vendeur : VCL par vendeur indéterminée en cas de coupon plateforme. | §3.4 | DEC-11 avant le Lot 3. |
| R-09 | **P2** | Clients mobiles non inspectables : un ajout au profil `/auth/me` doit rester compatible. | §1 | Ajouts seulement, aucun champ retiré ni renommé ; test de contrat. |
| R-10 | **P2** | Marketplace : repli sur des données fictives quand l'API ne répond pas (fournisseurs « vérifiés » inventés) ; risque de confusion avec un futur badge. | §3.11 | Signalé ; aucun affichage Lanaya avec repli fictif. Correction de l'existant à décider (hors Lanaya). |
| R-11 | **P2** | Formulaire commercial à code partagé : création de compte vendeur et de compte de versement par un tiers peu identifié. | §3.3 | Désactivé par défaut ; ne pas l'utiliser pour Lanaya ; à revoir par Risk. |
| R-12 | **P2** | `activity_log` modifiable en base, sans purge planifiée ni règle de conservation. | §3.9 | Historique Lanaya append-only (ADR-08) ; DEC-20. |
| R-13 | **P2** | Profil `/auth/me` en cache 60 s : un changement de statut Lanabaga se voit avec retard dans le portail. | §3.1 | Règle serveur lue sans cache à chaque requête protégée ; le portail n'est qu'un confort. |
| R-14 | **P3** | `POST sellers/premium/upgrade` répond un succès sans effet. | §3.5 | Ne jamais l'appeler ; à retirer (hors Lanaya). |
| R-15 | **P1** | *(constaté pendant la recette du Lot 1)* `AuthService::register` donne le rôle Spatie `buyer` (ou `seller`, `partner`) au nouveau compte, mais aucun seeder ne crée ce rôle : sur une base qui ne l'a pas, **toute inscription web échoue** (« There is no role named `buyer` »), Lanabaga comprise. | Recette locale, 21/10/2026 | Hors Lanaya : vérifier que le rôle existe sur le staging et en production, et le faire créer par `ProductionRolesPermissionsSeeder`. L'inscription Lanabaga répond désormais 503 « momentanément indisponible » dans ce cas, au lieu du message neutre « compte existant ». |

---

## 8. Tests de non-régression de référence

**Exécutés pour ce lot (L2, PostgreSQL de test, `9a754661`) :** les 8 tests de caractérisation `tests/Feature/Lanaya/Baseline` — **8/8 verts, 19 assertions, 121 s**.

**Suite de référence** (à rejouer avant et après chaque lot Lanaya ; résultat du 21 octobre 2026 dans [LANAYA_LOT1_QUALIFICATION.md](LANAYA_LOT1_QUALIFICATION.md)) :

- Commandes et argent : `PlaceOrderActionTest`, `Financial/OnlineOrderSettlementTest`, `Sprint6/SellerOrderScopingTest` ;
- Autorisations admin : `Admin/AdminAccountsAuthorizationTest`, `Admin/UserAuthorizationTest`, `Admin/RoleManagementAuthorizationTest`, `Admin/AuditLogAccessTest`, `ProductionSeederTest` ;
- KYC : `Admin/VendorKycWorkflowTest`, `Admin/CourierAuthorizationTest`, `Security/KycPrivateStorageTest`, `Delivery/CourierKycPortalTest` ;
- Portail : suites Vitest et Playwright existantes (`shell`, `orders`, `catalog`, `driver`, `finance`) ;
- Complète : régression Pest par dossier (`scratchpad/v10/pest-chunks.sh`, 4 237 tests en V10).

---

## 9. Points de validation attendus

Voir [LANAYA_DECISIONS_REGISTER.md](LANAYA_DECISIONS_REGISTER.md) pour le détail. Au minimum, pour ouvrir le Lot 1 :

1. Revue et validation de ce rapport par CTO, lead backend, Produit et Finance (cahier §32, Lot 0).
2. Convention v1.1 et liste des pièces exigées à l'admission (DEC-16), ou décision écrite de démarrer avec une liste minimale.
3. Pays pilote et capacités ouvertes : Burkina Faso, candidature et invitation de vendeurs seulement (DEC-05).
4. Règles de conservation des pièces et des prospects (DEC-20), au moins une durée provisoire.
5. Règle d'arbitrage entre recommandations concurrentes d'un même vendeur (DEC-23), et qui admet à combien de personnes (DEC-28).
6. Acceptation du modèle de permissions (ADR-05) et de l'extension de session à plusieurs espaces (ADR-03).

## 10. Livrables du Lot 0

| Livrable (cahier §2, mission §17-20, §50-56) | Fichier |
|---|---|
| Rapport d'audit, matrices, risques | ce document |
| Décisions d'architecture | [LANAYA_ARCHITECTURE_DECISIONS.md](LANAYA_ARCHITECTURE_DECISIONS.md) |
| Plan de données et migrations | [LANAYA_DATA_MIGRATION_PLAN.md](LANAYA_DATA_MIGRATION_PLAN.md) |
| Matrice des permissions et tests négatifs | [LANAYA_PERMISSIONS_MATRIX.md](LANAYA_PERMISSIONS_MATRIX.md) |
| Modèle de menace | [LANAYA_THREAT_MODEL.md](LANAYA_THREAT_MODEL.md) |
| Contrats d'intégration | [LANAYA_INTEGRATION_CONTRACTS.md](LANAYA_INTEGRATION_CONTRACTS.md) |
| Revue des maquettes | [LANAYA_MOCKUPS_REVIEW.md](LANAYA_MOCKUPS_REVIEW.md) |
| Registre des décisions DEC-01 à DEC-28 | [LANAYA_DECISIONS_REGISTER.md](LANAYA_DECISIONS_REGISTER.md) |
| Plan global des Lots 0 à 9 | [LANAYA_MASTER_DELIVERY_PLAN.md](LANAYA_MASTER_DELIVERY_PLAN.md) |
| Qualification (résultats réellement exécutés) | [LANAYA_LOT1_QUALIFICATION.md](LANAYA_LOT1_QUALIFICATION.md) |
| Tests de caractérisation | `sugu/tests/Feature/Lanaya/Baseline/*` (commit `9a754661`) |

## 11. Verdict Lot 0

Les douze conditions de la mission (§21) :

| # | Condition | État |
|---|---|---|
| 1 | Modèles réels identifiés | Fait (§3) |
| 2 | Parcours des commandes compris | Fait (§3.4, O-1) |
| 3 | Calcul de commission localisé | Fait (§3.5, C-1 à C-3) |
| 4 | Dépendances PSP documentées | Fait (§3.5) ; confirmation écrite manquante (DEC-03) |
| 5 | Authentification et rôles cartographiés | Fait (§3.1, §3.2, I-1 à I-4) |
| 6 | Back-office réel identifié | Fait (Inertia/Vue) |
| 7 | Stockage privé et événements examinés | Fait (§3.8, §3.9) |
| 8 | Matrice Réutiliser / Étendre / Créer | Fait (§4) |
| 9 | Plan de migrations | Fait (document dédié) |
| 10 | Décisions techniques justifiées | Fait (ADR-01 à ADR-12) |
| 11 | Dépendances contractuelles listées | Fait (§6) |
| 12 | Tests de non-régression de référence identifiés | Fait (§8) |

Premier verdict, au moment de la rédaction : **PAUSE GATE LOT 0** (validation formelle et décisions DEC-05, DEC-16, DEC-20, DEC-23, DEC-28 manquantes).

**Verdict après revue, 21 octobre 2026 : GO LOT 1 — dépendances formellement satisfaites.** L'utilisateur a validé ce rapport et les ADR-01 à ADR-12 en déclarant signer pour le CTO, le lead backend, Produit et Finance ; il a retenu : liste minimale provisoire de pièces (DEC-16), Burkina Faso avec deux capacités pilotes (DEC-05), conservation provisoire sans effacement (DEC-20), origine = première invitation acceptée (DEC-23), admission à deux personnes (DEC-28), maquettes 1 et 2 adaptées au style du back-office Vue. Restent ouverts et hors Lot 1 : convention v1.1 (fichier), qualification juridique, durées de conservation définitives, secteurs pilotes, et toutes les décisions des Lots 2 à 9. Aucune admission réelle, aucun droit financier, aucune modification du checkout.
