# SUGU Lanaya — Décisions d'architecture proposées

**Statut : ADR-01 à ADR-12 VALIDÉES le 21 octobre 2026** par l'utilisateur, qui a déclaré signer pour le CTO, le lead backend, Produit et Finance (gate du Lot 0). Les « orientations pour les lots suivants » restent des propositions. Chaque décision cite le constat qui la fonde ([LANAYA_INTEGRATION_AUDIT.md](LANAYA_INTEGRATION_AUDIT.md)) et l'exigence du cahier qui l'impose.

Format : contexte, décision, alternatives écartées, conséquences.

---

## ADR-01 — Un module Lanaya dans le monolithe existant

**Contexte.** Le cahier (§4.1) préfère un monolithe modulaire. Le backend a déjà des domaines sous `app/Domain/*` (Checkout, Orders, Payments, SuguBox…), le portail des espaces par groupe de routes, le back-office des pages Inertia par domaine.

**Décision.**

| Couche | Emplacement |
|---|---|
| Domaine backend | `app/Domain/Lanaya/{Identity,Network,Policy,Audit}` au Lot 1 ; `Assignment`, `Orders`, `Fees`, `Earnings`, `Evidence`, `Trust`, `Risk` créés à leur lot seulement |
| Tables | préfixe `lanaya_` (données du programme) ou `lanabaga_` (données d'une personne) |
| API | `routes/api_v1/lanaya/*.php`, préfixe `/api/v1/lanaya/…`, middleware `auth:sanctum` |
| Back-office | routes dans le groupe existant de `routes/admin.php` (fichier inclus `routes/admin_lanaya.php`), pages `resources/js/admin/pages/lanaya/*` |
| Portail | groupe `src/app/(lanabaga)/lanabaga/*`, fonctions `src/features/lanaya/*`, entrée vendeur `src/app/(vendor)/vendor/lanaya` |
| Marketplace | aucun changement avant le Lot 6 |

Les onze domaines logiques du cahier sont des espaces de noms, pas des services ni des bases séparés. Un domaine Lanaya **lit** les vérités natives (commande, paiement, livraison, commission) et **n'écrit jamais** dans leurs tables.

**Écarté.** Microservice Lanaya (doublerait l'authentification, les permissions, la messagerie) ; tout le code dans `app/Services/Lanaya` (mélange les domaines du cahier).

**Conséquences.** Une seule authentification, un seul journal, une seule base ; chaque lot ajoute un sous-domaine sans toucher aux précédents.

---

## ADR-02 — Le statut Lanabaga est un profil, ni un `user_type` ni un rôle

**Contexte.** `user_type` est unique par compte et publié tel quel aux applications mobiles par `GET /api/v1/auth/user-types` (constat R-04). La fiche Utilisateur du back-office ne garde qu'un rôle et réécrit `user_type` (test I-1). Un vendeur doit pouvoir devenir Lanabaga sans perdre sa boutique (cahier §5 : comptes à plusieurs rôles).

**Décision.** Une table `lanabaga_profiles`, une ligne par utilisateur au plus (`user_id` unique), est la **seule source de vérité** du statut Lanabaga. Aucun nouveau cas `UserType`. Aucun rôle Spatie `lanabaga` n'est requis : les policies lisent le profil. Le profil `/auth/me` gagne un bloc `lanaya` **ajouté** (aucun champ existant modifié).

**Écarté.**
- Nouveau `user_type = lanabaga` : ferait perdre l'espace vendeur, apparaîtrait aux applications mobiles, serait réécrit par la fiche admin.
- Rôle Spatie seul : effacé par la fiche admin (I-1), et un rôle global « Lanabaga » ne dit rien du périmètre (cahier §5).

**Conséquences.** Un acheteur, un vendeur ou un compte sans boutique peut porter un profil Lanabaga. Les écrans admin Utilisateurs ne touchent pas au statut Lanabaga (garantie testée au Lot 1 : enregistrer la fiche d'un Lanabaga ne change pas son profil).

---

## ADR-03 — La session du portail porte plusieurs espaces

**Contexte.** Le portail transforme le profil en **un** rôle (`mapRole`) et `RoleGuard` refuse tout autre espace (constat 1). Un vendeur-Lanabaga doit pouvoir passer d'un espace à l'autre.

**Décision.**
- Le type de session gagne `spaces: UserRole[]` (par exemple `["vendor", "lanabaga"]`) ; `role` reste l'espace principal (atterrissage après connexion, compatibilité de tout le code existant).
- `UserRole` gagne `"lanabaga"`, URL `/lanabaga/*`.
- `RoleGuard` autorise un espace s'il est dans `spaces` ; l'espace **actif** est celui de l'URL. Aucune action ne s'exécute dans un espace qui n'est pas celui de l'écran.
- Le menu utilisateur propose « Passer à l'espace Lanabaga / vendeur » quand `spaces` a plus d'un élément.
- Un candidat non admis a l'espace `lanabaga` réduit à « Ma candidature », comme un coursier en attente n'a que son dossier (`courierCanWork`).

**Écarté.** Second compte (interdit par la mission) ; cookie d'« espace actif » qui changerait le sens des requêtes (deux onglets ouverts sur deux espaces se contrediraient).

**Conséquences.** Le serveur reste seul juge : chaque route `/api/v1/lanaya/*` vérifie le profil. Les tests de garde de route du portail (`role-guard`, `session-user`, `navigation`) sont étendus, ceux des trois espaces existants doivent rester verts.

---

## ADR-04 — Pièces Lanabaga : table propre, stockage KYC existant

**Contexte.** Les pièces vivent par entité (`store_kyc_documents`, `courier_kyc_documents`) sur le disque privé `kyc_private`, sous l'autorité de `KycStorage`.

**Décision.** Table `lanabaga_documents` (une ligne par fichier : type, face, statut de revue, examinateur, dates d'émission et d'expiration), fichiers écrits par `KycStorage` sur `kyc_private`, jamais par la porte d'envoi R2 centrale. Lecture seulement par route authentifiée (portail : relais `/api/proxy/…` ; admin : URL signée 15 min + permission `lanaya.kyc.view`). Aucune URL de stockage en base ni dans une réponse.

**Écarté.** Table KYC générique polymorphe : obligerait à migrer les pièces des boutiques et des coursiers, hors périmètre et risqué. Réutiliser les pièces KYB d'une boutique : elles prouvent l'entreprise, pas la personne qui devient Lanabaga.

**Conséquences.** Un vendeur-Lanabaga peut devoir redéposer sa pièce d'identité ; acceptable et à dire dans l'écran. La liste des pièces obligatoires est une donnée de la politique pays (ADR-06), pas une constante : elle attend DEC-16.

---

## ADR-05 — Permissions `lanaya.*` et séparation des tâches

**Contexte.** Le rôle `admin` reçoit toute permission existante (I-2) ; l'entrée du back-office exige `admin` (I-3) ; un administrateur peut modifier ses propres rôles administrateurs (I-4) ; `VendorKycPolicy` accorde tout au rôle `admin`.

**Décision.**
1. Permissions Lanaya préfixées `lanaya.` (liste dans [LANAYA_PERMISSIONS_MATRIX.md](LANAYA_PERMISSIONS_MATRIX.md)).
2. Le seeder des rôles **exclut tout le préfixe `lanaya.`** du rôle `admin` ; `super-admin` les garde (cohérent avec la règle actuelle).
3. Rôles dédiés, cumulables avec `admin` : `lanaya-commercial`, `lanaya-ops`, `lanaya-compliance`, `lanaya-finance` (ce dernier vide au Lot 1).
4. Ces rôles ne s'attribuent que par un super-admin, par une action dédiée et journalisée ; la fiche Utilisateur et l'écran Administrateurs les refusent (règle `grantRole` étendue). Personne ne modifie ses propres rôles Lanaya.
5. Les policies Lanaya ne lisent **que** des permissions `lanaya.*`, jamais un nom de rôle, et refusent toute décision sur sa propre ressource (son profil, une boutique qu'on possède, un prospect qu'on a soi-même apporté quand on est opérateur).
6. 2FA exigée pour toute action `lanaya.*` d'écriture : refus si `two_factor_confirmed_at` est vide (règle nouvelle, propre à Lanaya), puis vérification récente par le middleware existant `step-up` (`StepUp2faMiddleware`). Ce middleware seul ne suffit pas : il laisse passer un compte sans 2FA (constaté, L0).

**Écarté.** Policies par rôle (`hasRole('admin')`) : tout administrateur lirait les pièces. Nouveau garde d'entrée du back-office pour les rôles restreints : changement transverse hors Lanaya.

**Conséquences.** Après déploiement, **personne** n'a de droit Lanaya tant qu'un super-admin ne l'a pas accordé : c'est voulu. Le runbook des permissions doit l'expliquer (le seeder réécrit les rôles).

---

## ADR-06 — Politiques versionnées en base, jamais en constantes

**Contexte.** Le cahier exige des paramètres [CONFIG] versionnés, approuvés, datés (§12.1, §23.6, §24.1) et les quatre références de version dans chaque snapshot de commande (ACC-067). Les réglages Spatie existants écrasent leur valeur sans historique.

**Décision.** Table `lanaya_policy_versions`, **lignes immuables** : `family` (`policy`, `scoring`, `commission`, `badge`), `country_code`, `version`, `document` JSON, `effective_from`, `proposed_by`, `approved_by` (différent de `proposed_by`), `approved_at`, `justification`. La version applicable = dernière version approuvée de la famille et du pays dont `effective_from` est passé. Au Lot 1, seule la famille `policy` sert : capacités du pays (ADR-07), capacité Standard (5), pièces exigées, durée d'une invitation, plafond d'invitations ouvertes.

**Écarté.** Constantes de code ; réglages Spatie (pas d'historique, pas d'approbation) ; fichier de configuration (pas d'approbation, change au déploiement).

**Conséquences.** Une modification de politique est une nouvelle ligne approuvée par une seconde personne, jamais une édition. Les décisions du Lot 1 (admission, invitation) enregistrent l'identifiant de version appliqué.

---

## ADR-07 — Capacités par pays, toutes fermées par défaut

**Contexte.** `countries.is_enabled` est global. Le cahier exige des capacités séparées par pays (§26.1) et des drapeaux désactivés par défaut (§30.2-30.3). Il n'existe aucune bibliothèque de drapeaux.

**Décision.** Les capacités sont des clés du document de politique du pays : `candidate_onboarding`, `seller_invitation` (Lot 1) puis `seller_assignment`, `order_tracking`, `standard_earnings`, `negotiated_proposals`… (noms du cahier §30.3), chacune `disabled`, `pilot`, `active` ou `suspended`. Un pays sans politique approuvée n'a **aucune** capacité. Aucune bibliothèque ajoutée. Un interrupteur global d'urgence (`LANAYA_KILL_SWITCH`, variable d'environnement lue une fois) coupe toutes les écritures Lanaya sans toucher aux flux natifs.

**Écarté.** Laravel Pennant (nouvelle dépendance pour un seul module) ; colonnes booléennes sur `countries`.

**Conséquences.** Le Burkina Faso ne s'ouvre que par une politique approuvée (DEC-05). Une capacité suspendue arrête les **nouvelles** opérations et laisse lire l'existant (cahier §30.4).

---

## ADR-08 — Historique append-only des décisions Lanaya

**Contexte.** `activity_log` est modifiable en base, sans purge planifiée ni règle de conservation (R-12). Le cahier exige que les décisions critiques ne puissent pas être effacées par leurs auteurs (§19.3, §23.7, §28.1).

**Décision.** Table `lanaya_events` : sujet (type, identifiant), événement, état avant, état après, acteur, rôle Lanaya de l'acteur, code de motif, note, version de politique, identifiant de corrélation, empreinte des données sûres. Le modèle refuse toute mise à jour et toute suppression ; aucune route ne les propose ; la colonne d'horodatage est posée par la base. Chaque écriture Lanaya qui change un état écrit son événement **dans la même transaction**. `activity_log` reçoit aussi l'action (cohérence avec l'écran Journal existant).

**Écarté.** `activity_log` seul (modifiable, mélangé) ; déclencheur PostgreSQL interdisant UPDATE/DELETE : envisageable plus tard, à décider avec l'exploitation (il gênerait les restaurations et anonymisations légales).

**Conséquences.** Aucun secret, aucune pièce, aucun numéro de document dans l'événement. L'anonymisation légale (DEC-20) se fera par une procédure dédiée, auditée, pas par suppression ordinaire.

---

## ADR-09 — Invitations de vendeurs : jeton haché, usage unique, consentement

**Contexte.** Cahier §7.2, §21.3, §27.3 ; mission §27. Le modèle existant le plus proche est `driver_invitations` (agence → coursier). Le formulaire commercial crée des comptes pour autrui (R-11).

**Décision.**
- Jeton aléatoire de 32 octets ; seule son empreinte SHA-256 est stockée ; durée et plafond d'invitations ouvertes lus dans la politique.
- Usage unique, révocable par le Lanabaga ou Ops, expiré par une tâche planifiée.
- Une invitation ouverte au plus par (Lanabaga, téléphone ou e-mail normalisé) ; création idempotente (`Idempotency-Key`).
- L'acceptation exige un vendeur **connecté** à son propre compte : compte existant → rattachement à **sa** boutique (choisie parmi celles qu'il possède) ; nouveau vendeur → inscription par le parcours normal, puis acceptation. **Aucun compte, aucune boutique, aucun compte de versement n'est créé par le Lanabaga.**
- Refuser est aussi simple qu'accepter ; aucune case pré-cochée.
- On ne peut pas accepter l'invitation de soi-même (propriétaire = Lanabaga invitant).

**Écarté.** Lien public réutilisable ; jeton en clair en base ; création de compte par le Lanabaga.

**Conséquences.** ACC-007 et ACC-008 se testent directement. Le contact préalable du prospect (son accord pour être contacté) est déclaré par le Lanabaga et horodaté ; sa valeur juridique relève de DEC-20.

---

## ADR-10 — Origine commerciale, affectation et droit à rémunération restent distincts

**Contexte.** Cahier §7.3 et §15.1 : avoir introduit un vendeur ne donne aucun droit.

**Décision.** Au Lot 1, l'**origine** d'un vendeur = l'invitation acceptée (Lanabaga, boutique, date), visible dans le reporting. Elle ne crée **ni affectation** (Lot 2) **ni droit** (Lot 5). Les recommandations concurrentes sont toutes conservées et signalées à Ops (DEC-23 tranchera qui est l'origine retenue).

**Conséquences.** Un test du Lot 1 vérifie qu'une invitation acceptée ne crée aucune ligne dans un futur registre d'obligations ni aucune écriture au grand livre (ACC-009).

---

## ADR-11 — États orthogonaux et machine à états serveur

**Contexte.** Cahier §6.1, §11.1 : compte, identité, badge, convention, plan et capacité sont distincts.

**Décision.** Colonnes séparées sur le profil : `application_status`, `account_status`, `identity_status`, `quality_gate_state` (+ capacité imposée éventuelle) ; la convention est une ligne de `lanabaga_agreements` (statut et validité) ; **pas de colonne badge ni plan** avant les Lots 6 et 7 (« pas de badge » = aucune attribution). Les transitions autorisées sont déclarées dans une classe par machine (modèle des `StateMachines` existants de `Domain/Orders`) ; toute autre transition est refusée côté serveur et testée.

États de candidature : `draft → submitted → prechecked → in_review → (info_requested → submitted) → approved | rejected` ; `withdrawn` par le candidat. Compte : `none → active → suspended → active | closed`. « Admis sans badge » = `approved` + `active` + convention valide.

**Conséquences.** ACC-002 (actif sans badge) est un état normal, pas un cas particulier. ACC-003 (suspension) coupe les actions protégées parce que chaque garde lit `account_status` à chaque requête.

---

## ADR-12 — Capacité effective calculée par le serveur, sous verrou

**Contexte.** Cahier §8.2 : capacité = minimum (plan, Quality Gate, pays, restriction individuelle). Mission §28 : vendeurs en attente ≠ vendeurs actifs ; un vendeur compte une fois par Lanabaga.

**Décision.** Une seule fonction serveur `effectiveCapacity(profil)` = min(5 du plan Standard lu dans la politique, capacité du Quality Gate, plafond pays, restriction individuelle). Le décompte des vendeurs actifs compte les boutiques distinctes avec une relation **active** (au Lot 1 il n'y en a pas : les affectations arrivent au Lot 2). Toute opération qui pourrait dépasser la capacité verrouille la ligne du profil (`SELECT … FOR UPDATE`) avant de compter, pour qu'aucun sixième vendeur n'entre par deux requêtes simultanées.

**Conséquences.** Le portail affiche la capacité renvoyée par le serveur, jamais un 5 écrit dans un composant. ACC-014 et ACC-015 se testent sur la primitive dès le Lot 1 ; le scénario complet (affectation) reste « non exécuté » jusqu'au Lot 2.

---

## Orientations pour les lots suivants (non décidées)

- **Lot 3** : un « contexte Lanaya » par couple (commande, vendeur), créé au plus tôt à la création de commande, figé à la confirmation du paiement ; VCL = somme des lignes du vendeur après leurs remises, hors transport et taxes ; la ventilation de la remise globale attend DEC-11.
- **Lot 5** : la part Standard lit l'écriture `RevenueCommission` du grand livre pour (commande, boutique) ; les obligations Lanabaga sont des écritures d'un nouveau compte du plan comptable (« partenaires Lanaya à payer »), jamais un portefeuille ; versement par export validé tant que DEC-03 n'est pas confirmé.
- **Lot 6** : badge = ligne d'attribution avec motif et auteur, publiée par la marketplace sans aucun repli sur des données fictives.
