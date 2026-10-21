# SUGU Lanaya — Matrice des autorisations (Lot 1, puis affectations DEC-29 à DEC-32)

**Statut : PROPOSÉE** (ADR-02, ADR-05, ADR-11). Toute règle ci-dessous est vérifiée **par le serveur**, à chaque requête, en relisant l'état en base (pas de cache). Les écrans ne font que refléter ces règles.

Une autorisation Lanaya combine toujours (cahier §5) : **rôle ou permission + périmètre (sa ressource) + état de l'objet + pays (capacité ouverte) + conformité (compte, convention) + conflit d'intérêts**. Le montant s'y ajoutera aux Lots 3 à 5.

---

## 1. Acteurs

| Acteur | Comment il est reconnu |
|---|---|
| Visiteur | aucune session |
| Acheteur | compte SUGU, sans boutique ni profil Lanabaga |
| Vendeur | propriétaire d'une boutique (`stores.owner_id`) |
| Candidat Lanabaga | profil `application_status` ≠ `approved` |
| Lanabaga admis et actif | profil `approved` + `account_status = active` + convention `valid` non expirée |
| Lanabaga suspendu / fermé | `account_status` `suspended` / `closed` |
| Administrateur générique | rôle `admin`, **aucune** permission `lanaya.*` (exclues de ce rôle, ADR-05) |
| Commercial Lanaya | `admin` + rôle `lanaya-commercial` |
| Ops Lanaya | `admin` + rôle `lanaya-ops` |
| Risk & Compliance | `admin` + rôle `lanaya-compliance` |
| Finance Lanaya | `admin` + rôle `lanaya-finance` (aucun droit au Lot 1) |
| Super-admin | rôle `super-admin` (détient tout, attribue les rôles Lanaya) |

Un même compte peut cumuler Vendeur et Lanabaga (ADR-03). Un opérateur Lanaya qui est aussi candidat ou Lanabaga ne peut **rien décider** sur son propre dossier.

## 2. Permissions du back-office

| Permission | Commercial | Ops | Compliance | Finance | Admin générique | Super-admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `lanaya.applications.view` — liste et dossiers, **sans** fichiers | ✓ | ✓ | ✓ | — | — | ✓ |
| `lanaya.applications.review` — prendre en revue, demander un complément | — | ✓ | ✓ | — | — | ✓ |
| `lanaya.applications.decide` — admettre, refuser | — | ✓ | — | — | — | ✓ |
| `lanaya.kyc.view` — ouvrir une pièce | — | — | ✓ | — | — | ✓ |
| `lanaya.kyc.review` — valider ou rejeter une pièce, statut d'identité | — | — | ✓ | — | — | ✓ |
| `lanaya.references.verify` — noter une référence contactée ou validée | — | ✓ | ✓ | — | — | ✓ |
| `lanaya.agreements.record` — enregistrer une convention signée | — | ✓ | — | — | — | ✓ |
| `lanaya.agreements.verify` — contrôler la convention enregistrée | — | — | ✓ | — | — | ✓ |
| `lanaya.accounts.suspend` — suspendre avec motif | — | ✓ | ✓ | — | — | ✓ |
| `lanaya.accounts.reactivate` — réactiver | — | — | ✓ | — | — | ✓ |
| `lanaya.network.view` — prospects, invitations, origines | ✓ | ✓ | ✓ | — | — | ✓ |
| `lanaya.network.decide` — trancher un doublon ou une origine concurrente | — | ✓ | — | — | — | ✓ |
| `lanaya.policies.view` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `lanaya.policies.propose` | — | ✓ | — | — | — | ✓ |
| `lanaya.policies.approve` (jamais la sienne) | — | — | ✓ | ✓ ¹ | — | ✓ |
| `lanaya.assignments.manage` — confier une boutique à un Lanabaga (proposition au vendeur), retirer une proposition, mettre fin à une affectation, avec motif (DEC-29, DEC-32) | — | ✓ | — | — | — | ✓ |
| `lanaya.orders.attribute` — ajouter, retirer ou réattribuer le Lanabaga de la part d'une boutique dans une commande non livrée, avec motif (DEC-31, DEC-32) | — | ✓ | — | — | — | ✓ |
| Attribuer un rôle `lanaya-*` | — | — | — | — | — | ✓ ² |

¹ Finance approuve les familles `commission` à partir du Lot 3 ; au Lot 1, seule la famille `policy` existe.
² Action dédiée et journalisée ; la fiche Utilisateur et l'écran Administrateurs refusent ces rôles ; personne ne modifie ses propres rôles Lanaya.

**Règles à quatre yeux proposées** (à confirmer au gate) :

- une convention est enregistrée par une personne et contrôlée par une autre (`verified_by ≠ recorded_by`) ;
- une politique est proposée par une personne et approuvée par une autre (`approved_by ≠ proposed_by`) ;
- l'admission exige une identité `verified` par Compliance ; **recommandé** : la personne qui admet n'est pas celle qui a vérifié l'identité.

**Exigences de session** : 2FA confirmée pour toute écriture `lanaya.*`, puis vérification récente (`step-up`) ; l'administrateur générique sans 2FA ne peut rien écrire de Lanaya même s'il recevait la permission.

## 3. Espace Lanabaga (portail) — règles d'état, pas de permission Spatie

| Action | Candidat | Admis actif | Suspendu | Fermé | Autres comptes |
|---|:-:|:-:|:-:|:-:|:-:|
| Créer sa candidature (pays avec `candidate_onboarding` ouvert) | ✓ (une seule) | — | — | — | — |
| Modifier sa candidature | en `draft` ou `info_requested` | — | — | — | jamais celle d'un autre |
| Déposer une pièce | en `draft` ou `info_requested` | renouvellement sur demande | — | — | — |
| Lire ses propres pièces (relais du portail) | ✓ | ✓ | ✓ | — | — |
| Lire son statut et les motifs communicables | ✓ | ✓ | ✓ | ✓ | — |
| Tableau de bord | « Ma candidature » seulement | ✓ | lecture, bannière de suspension | — | — |
| Créer un prospect, une invitation | — | ✓ si convention valide, capacité `seller_invitation` ouverte, Quality Gate ≠ `suspended`, plafond d'invitations non atteint | — | — | — |
| Révoquer sa propre invitation | — | ✓ | ✓ | — | jamais celle d'un autre |
| Voir ses vendeurs (invitations acceptées) | — | ✓ | ✓ lecture | — | jamais ceux d'un autre Lanabaga |
| Voir les boutiques qui lui sont confiées (proposées, actives, terminées) | — | ✓ | ✓ lecture | — | jamais celles d'un autre Lanabaga |
| Lire les commandes qu'Ops lui a attribuées : numéro, statut, date, boutique (DEC-31) | — | ✓ tant que l'attribution est active | — | — | jamais : une attribution retirée ou remplacée ne donne plus accès |
| Lire le montant, l'acheteur, l'adresse, les messages, les chiffres de vente d'une commande | **jamais** | **jamais** (le serveur ne les envoie pas) | — | — | — |
| Changer sa propre affectation ou une attribution | **jamais** | **jamais** | **jamais** | **jamais** | — |
| Encaisser, modifier un bénéficiaire de versement, créer un compte vendeur | **jamais** | **jamais** | **jamais** | **jamais** | — |

## 4. Espace vendeur (portail)

| Action | Règle serveur |
|---|---|
| Voir l'aperçu d'une invitation (Lanabaga : code public, nom d'usage, ville, spécialités, compte actif) | vendeur connecté, jeton valide (`open`, non expiré) ; aucune pièce, aucun contact privé du Lanabaga |
| Accepter la mise en relation pour **une** de ses boutiques | propriétaire de la boutique choisie ; boutique **non** possédée par le Lanabaga invitant ; invitation `open` ; action positive (bouton), aucune case pré-cochée |
| Refuser | toujours possible tant que l'invitation est ouverte |
| Voir l'état « Lanaya » de ses boutiques | propriétaire |
| Voir la proposition de SUGU pour une de ses boutiques (carte publique du Lanabaga, texte du consentement versionné) | propriétaire ; aucune autre donnée du Lanabaga |
| Accepter la proposition (DEC-30) | propriétaire ; case du consentement `seller_assignment` cochée par lui (jamais pré-cochée) ; Lanabaga toujours admis, actif, convention valide, capacité disponible (vérifiée sous verrou) ; capacité `seller_assignment` ouverte dans le pays ; la boutique n'est pas au Lanabaga ; accepter un autre Lanabaga termine l'affectation précédente (transfert) |
| Refuser la proposition | propriétaire, tant qu'elle attend sa réponse |
| Mettre fin à l'accompagnement de sa boutique | propriétaire, à tout moment ; les commandes en cours gardent leur attribution jusqu'à ce qu'Ops la retire ou la réattribue |

## 5. Interdictions structurelles testées dès le Lot 1

| Interdiction (cahier §5) | Garde |
|---|---|
| S'auto-approuver (deux rôles sur un même compte) | toute décision refuse `actor_id = profil.user_id` et toute action sur une boutique dont l'acteur est propriétaire |
| Accès global d'un Lanabaga aux vendeurs du pays | toutes les lectures filtrées par `lanabaga_profile_id` du compte connecté |
| Lecture des pièces par un administrateur non habilité | `lanaya.kyc.view` seulement, absente du rôle `admin` |
| Délégation d'accès | aucune route de délégation |
| Modification de bénéficiaire, encaissement | aucune route ; tests qui vérifient l'absence (404/403) sur les routes de versement natives |
| Badge ou score acheté | aucune colonne, aucune route au Lot 1 |

## 6. Tests négatifs à écrire au Lot 1 (Pest, PostgreSQL)

| Test | Attendu | ACC |
|---|---|---|
| Candidat non admis lit `/api/v1/sellers/orders`, `/api/v1/lanaya/me/sellers`, toute commande | 403 / 404, aucune donnée | 001 |
| Admis actif sans badge crée une invitation | 201 | 002 |
| Lanabaga suspendu crée une invitation, un prospect | 403 `SUGU-LANAYA-ACCOUNT-SUSPENDED` dès la requête suivant la suspension | 003, 065 |
| Convention expirée : création d'invitation | 403 `SUGU-LANAYA-AGREEMENT-INVALID` ; historique lisible | 004 |
| Opérateur Ops qui est le candidat décide sa propre candidature | 403 | 005 |
| Lanabaga accepte (en tant que vendeur) l'invitation qu'il a émise vers sa propre boutique | 422 `SUGU-LANAYA-SELF-INTRODUCTION` | 005 |
| Administrateur générique ouvre une pièce | 403 ; aucun lien signé émis | 006 |
| Compliance ouvre une pièce | 200 avec `no-store`, événement d'ouverture journalisé | 006 |
| Invitation acceptée par un compte non propriétaire de la boutique visée | 403 | 007 |
| Invitation vers un téléphone déjà inscrit : aucun compte créé, rattachement par le vendeur connecté seulement | 0 nouvel utilisateur | 008 |
| Invitation acceptée : aucune écriture au grand livre, aucune obligation | 0 ligne | 009 |
| Sixième vendeur actif (primitive de capacité, deux requêtes simultanées) | une seule réussit | 014 |
| Lanabaga A lit un prospect, une invitation, un vendeur de B | 404 | 059 |
| Lanabaga appelle les routes de versement et de compte bancaire d'une boutique | 403 | 060 |
| Pays sans capacité ouverte : candidature | 403 `SUGU-LANAYA-CAPABILITY-CLOSED`, flux natifs intacts | 061 |
| Fiche Utilisateur enregistrée pour un Lanabaga | profil inchangé | (I-1) |
| Rôle `lanaya-compliance` attribué par un `admin` non super-admin (fiche Utilisateur, écran Administrateurs) | refus de validation | (I-4) |
| Seeder des rôles relancé | `admin` ne détient aucune `lanaya.*` | (I-2) |
| Écriture `lanaya.*` sans 2FA confirmée | 403 | — |
| Administrateur générique (sans `lanaya-ops`) confie une boutique ou attribue une commande | 403 (`LanayaAssignmentsTest`) | DEC-32 |
| Vendeur accepte une proposition sans cocher le consentement, ou pour la boutique d'un autre | 422 / 404, rien d'actif | DEC-30 |
| Attribution d'une commande livrée, annulée, retournée, en échec ; à un Lanabaga non affecté ; au Lanabaga acheteur | 422 `ORDER-CLOSED` / `NOT-ASSIGNED` / `CONFLICT-OF-INTEREST` | DEC-31 |
| Transfert d'une boutique : les commandes en cours ne changent pas de Lanabaga sans action d'Ops | attribution précédente intacte | cahier §8.4 |
| Affectation, attribution : aucune ligne de grand livre, d'obligation, de commission | 0 ligne | DEC-29 |
| Jeton d'invitation deviné, expiré, révoqué, déjà utilisé | 404 / 410, sans dire lequel | — |
