# SUGU Lanaya — Plan de données et de migrations

**Statut : PROPOSÉ, aucune migration écrite ni exécutée.** Les migrations du Lot 1 ne seront écrites qu'après la validation du gate du Lot 0. Base cible : PostgreSQL (production, staging, tests `sugu_testing`).

Principes (cahier §24, §30 ; mission §19, §35) :

- réutiliser les entités natives par leur identifiant (`users.id`, `stores.id`, `countries.code`, `orders.id`, `order_items.id`), **jamais** les copier ;
- n'ajouter **aucune colonne** aux tables natives au Lot 1 ;
- toutes les clés étrangères en `restrict` (aucune suppression en cascade d'une preuve, d'une décision ou d'un consentement) ;
- montants en entiers (centimes) avec leur devise, dès qu'il y en aura (Lot 3) ;
- aucune commande existante ne devient Lanaya : les tables de commande Lanaya (Lot 3) ne seront remplies que pour des commandes créées après l'ouverture de la capacité, sur des vendeurs pilotes.

---

## 1. Les 26 entités logiques du cahier (§24) et leur sort

| Entité logique | Décision | Lot | Support physique |
|---|---|---|---|
| `LanabagaProfile` | Créer | 1 | `lanabaga_profiles` |
| `LanabagaCompliance` | Créer | 1 | `lanabaga_documents`, `lanabaga_references` ; état d'identité sur le profil |
| `LanabagaAgreement` | Créer (contenu bloqué : convention non fournie) | 1 | `lanabaga_agreements` |
| `LanabagaPlanEntitlement` | Attendre DEC-06 ; au Lot 1 le plan Standard est implicite et sa capacité lue dans la politique | 7 | — |
| `LanabagaQualityGate` | Créer, sous forme de colonnes du profil + historique | 1 | `lanabaga_profiles.quality_gate_*`, `lanaya_events` |
| `LanayaSellerLead` | Créer | 1 | `lanaya_seller_leads`, `lanaya_seller_invitations` |
| `SellerLanabagaAssignment` | Attendre | 2 | — |
| `LanayaOrderContext` | Attendre (DEC-02, DEC-11) | 3 | — |
| `LanayaLineAttribution` | Attendre | 3 | — |
| `LanayaOrderSnapshot` | Attendre | 3 | — |
| `LanayaFeeProposal` | Attendre ([LEGAL GATE]) | 4 | — |
| `LanayaSellerFeeConsent` | Attendre | 4 | — |
| `LanayaParticipationEvidence` | Attendre | 2 / 5 | — |
| `LanayaParticipationDecision` | Attendre | 5 | — |
| `LanayaEarning` | Attendre | 5 | — |
| `LanayaLedgerEntry` | **Réutiliser** le grand livre natif (`transactions`, `ledger_entries`, nouveau compte au plan comptable) | 5 | existant |
| `LanayaPayout` | Attendre DEC-03 | 5 | — |
| `LanayaRiskFlag` | Attendre ; au Lot 1 les doublons sont des événements `risk_signal` | 5 / 8 | `lanaya_events` |
| `LanayaCase` | **Réutiliser** les litiges natifs (`disputes`) pour les litiges commerciaux ; litige de commission au Lot 5 | 5 | existant + à venir |
| `LanayaScoreEvaluation` | Attendre (score en mode observation) | 6 / 8 | — |
| `LanayaBadgeGrant` | Attendre | 6 | — |
| `LanayaCardCredential` | Attendre | 6 | — |
| `LanayaPolicySet` | Créer | 1 | `lanaya_policy_versions` |
| `LanayaCountryCapability` | Créer, comme clés du document de politique du pays | 1 | `lanaya_policy_versions.document` |
| `LanayaAuditEvent` | Créer + réutiliser `activity_log` | 1 | `lanaya_events` |
| `LanayaNotification` | **Réutiliser** les notifications Laravel et `notification_dispatch_logs` | 1+ | existant |

Bilan : **8 entités couvertes au Lot 1 par 9 tables**, 3 réutilisées, 15 à leur lot.

Pourquoi une table supplémentaire hors §24 : `lanaya_consents`. Le cahier exige les consentements avec date et version (§6.2, §13.3) et la plateforme n'enregistre aucun consentement versionné aujourd'hui (pas même l'acceptation des CGU) ; aucune extension n'était possible.

---

## 2. Schéma proposé du Lot 1

Types : `ulid` (clé primaire, comme les tables natives), `timestampTz` pour les dates. Les énumérations sont des `string` validées par des Enums PHP (pas de type `enum` PostgreSQL, plus coûteux à faire évoluer).

### 2.1 `lanabaga_profiles` — une personne admise ou candidate

| Colonne | Type | Contraintes / remarques |
|---|---|---|
| `id` | ulid | PK |
| `user_id` | ulid | FK `users.id` **restrict**, **unique** (un profil par compte) |
| `public_code` | string(16) | unique, non séquentiel (ex. `LNB-7K2Q9M`), affiché et futur identifiant de carte |
| `country_code` | char(2) | FK `countries.code` restrict |
| `city` | string(100) | |
| `specialties` | jsonb | liste bornée (≤ 8) de libellés ou d'identifiants de catégories |
| `experience_band` | string(20) | `<1`, `1-3`, `3-5`, `5-10`, `10+` |
| `structure_name` | string(150) null | structure représentée, déclarée |
| `conflicts_declared` | jsonb null | liens déclarés avec vendeurs, acheteurs, transporteurs |
| `application_status` | string(20) | `draft` · `submitted` · `prechecked` · `in_review` · `info_requested` · `approved` · `rejected` · `withdrawn` |
| `account_status` | string(20) | `none` · `active` · `suspended` · `closed` |
| `identity_status` | string(20) | `none` · `pending` · `verified` · `rejected` · `expired` |
| `quality_gate_state` | string(20) | `open` · `watch` · `expansion_frozen` · `suspended` (défaut `open` à l'admission) |
| `capacity_limit` | smallint null | restriction individuelle (null = aucune) |
| `quality_gate_review_at` | timestampTz null | prochaine réévaluation |
| `submitted_at`, `decided_at`, `suspended_at` | timestampTz null | |
| `decided_by` | ulid null | FK `users.id` restrict |
| `decision_reason_code`, `suspension_reason_code` | string(40) null | codes du référentiel de motifs |
| `decision_note`, `suspension_note` | text null | notes internes |
| `policy_version_id` | ulid null | FK `lanaya_policy_versions.id` : version appliquée à la dernière décision |
| `created_at`, `updated_at` | timestampTz | |

Index : `(country_code, application_status)`, `(account_status, country_code)`, `(application_status, submitted_at)`. **Pas de suppression douce** : un profil se ferme (`closed`), il ne se supprime pas. **Aucune colonne de badge ni de plan** (ADR-11).

Contrainte de cohérence (CHECK) : `account_status = 'active'` exige `application_status = 'approved'`.

### 2.2 `lanabaga_documents` — pièces justificatives (un fichier par ligne)

| Colonne | Remarques |
|---|---|
| `id`, `lanabaga_profile_id` (FK restrict) | |
| `document_type` | `identity`, `professional_photo`, `reference_letter`, `structure_registration`, … (liste fermée par la politique pays, DEC-16) |
| `side` | `front`, `back`, `single` |
| `disk`, `file_path`, `file_name`, `mime_type`, `size_bytes`, `sha256` | disque toujours `kyc_private` ; empreinte pour la preuve d'intégrité |
| `document_number_hash` | null ; empreinte normalisée si un numéro est saisi (jamais le numéro en clair) |
| `issued_on`, `expires_on` | date null |
| `review_status` | `pending`, `approved`, `rejected`, `superseded` |
| `rejection_reason_code`, `reviewed_by`, `reviewed_at` | |
| `uploaded_by`, `created_at` | |

Index : `(lanabaga_profile_id, document_type, review_status)`. Unicité partielle : une seule pièce `approved` par (profil, type, face).

### 2.3 `lanabaga_references` — références professionnelles

`id`, `lanabaga_profile_id`, `full_name`, `company`, `phone_e164`, `email` null, `relation` (`regular_client`, `business_partner`, `supplier`, `former_employer`, `other`), `verification_status` (`pending`, `contacted`, `validated`, `no_answer`, `rejected`), `verified_by`, `verified_at`, `note`. Index `(lanabaga_profile_id)`. Données de tiers : conservation selon DEC-20.

### 2.4 `lanabaga_agreements` — convention et annexes

`id`, `lanabaga_profile_id`, `agreement_reference`, `agreement_version` (ex. `v1.1`), `annex_reference` null, `sugu_entity`, `territory` jsonb, `categories` jsonb, `contractual_quota` smallint null, `signed_at`, `signature_method` (`paper_controlled`, `in_app_acceptance`), `valid_from`, `valid_until` null, `notice_days` null, `status` (`pending_signature`, `valid`, `expired`, `terminated`), `document_disk`/`document_path`/`document_sha256` (copie signée sur `kyc_private`), `recorded_by`, `verified_by` (**différent** de `recorded_by`), `verified_at`, `terminated_at`, `termination_reason_code`.

Index : `(lanabaga_profile_id, status, valid_until)`. Unicité partielle : une seule convention `valid` par profil.

### 2.5 `lanaya_consents` — consentements versionnés

`id`, `user_id`, `subject_type`/`subject_id` (profil, invitation…), `consent_key` (`data_processing`, `conduct_code`, `contact_by_sugu`, `seller_introduction`…), `document_version`, `content_sha256` (empreinte du texte affiché), `given_at`, `withdrawn_at` null, `channel` (`portal`, `paper_controlled`), `request_id`, `ip_hash`, `user_agent_hash`. Index `(user_id, consent_key, given_at)`. Ligne jamais modifiée sauf `withdrawn_at`.

### 2.6 `lanaya_seller_leads` — prospects d'un Lanabaga

`id`, `lanabaga_profile_id`, `company_name`, `contact_name`, `phone_e164` (normalisé), `email` null, `city`, `sector`, `declared_source` (`recommendation`, `trade_fair`, `social_network`, `website`, `personal_network`, `other`), `relation_to_lanabaga`, `contact_permission_declared_at` (le Lanabaga atteste l'accord du prospect pour être contacté), `status` (`prospect`, `contacted`, `invited`, `registered`, `verified`, `activated`, `first_sale`, `lost`), `matched_store_id` null (FK `stores.id`, rempli par le rapprochement de doublons), `created_at`, `updated_at`.

Index : `(lanabaga_profile_id, status)`, `(phone_e164)`, `(matched_store_id)`. Unicité : `(lanabaga_profile_id, phone_e164)`. Le Lanabaga ne voit jamais si le même téléphone est le prospect d'un autre (pas de fuite entre Lanabagas, ACC-059) ; Ops le voit.

### 2.7 `lanaya_seller_invitations`

`id`, `lanabaga_profile_id`, `lead_id` null, `token_hash` char(64) **unique**, `target_phone_e164`, `target_email` null, `channel` (`sms`, `whatsapp`, `email`, `link`), `message` (≤ 300 caractères), `status` (`open`, `accepted`, `declined`, `revoked`, `expired`), `expires_at`, `accepted_at`, `accepted_by_user_id` (FK users), `accepted_store_id` (FK stores), `declined_at`, `revoked_at`, `revoked_by`, `idempotency_key` unique, `policy_version_id`, `created_at`.

Index : `(lanabaga_profile_id, status)`, `(target_phone_e164, status)`, `(accepted_store_id)`. Unicité partielle : une invitation `open` par (Lanabaga, téléphone).

**L'origine commerciale d'une boutique = l'invitation acceptée** (`accepted_store_id`). Pas de table d'origine séparée au Lot 1 (ADR-10).

### 2.8 `lanaya_policy_versions` — politiques et capacités par pays

`id`, `family` (`policy`, `scoring`, `commission`, `badge`), `country_code`, `version` (entier croissant par famille et pays), `document` jsonb, `effective_from`, `proposed_by`, `approved_by` null, `approved_at` null, `justification`, `created_at`. Unicité `(family, country_code, version)`. CHECK `approved_by <> proposed_by`. Ligne immuable une fois approuvée.

Document Lot 1 attendu pour `BF` (valeurs du cahier, à approuver — DEC-05, DEC-16, DEC-20) :

```json
{
  "capabilities": { "candidate_onboarding": "pilot", "seller_invitation": "pilot" },
  "standard_capacity": 5,
  "required_documents": ["identity", "professional_photo"],
  "invitation_ttl_days": 14,
  "max_open_invitations": 20,
  "application_retention_days": null
}
```

Les valeurs `14` et `20` sont des **hypothèses** à valider ; `application_retention_days` reste vide tant que DEC-20 n'est pas tranchée.

### 2.9 `lanaya_events` — historique append-only

`id`, `subject_type`, `subject_id`, `event` (ex. `application.submitted`, `application.approved`, `account.suspended`, `document.rejected`, `invitation.accepted`, `policy.approved`, `risk_signal.duplicate_lead`), `from_state`, `to_state`, `actor_id` null (null = système), `actor_capacity` (`lanabaga`, `seller`, `ops`, `compliance`, `commercial`, `finance`, `super_admin`, `system`), `reason_code`, `note`, `policy_version_id`, `correlation_id`, `payload` jsonb (sûr : jamais de pièce, de secret, de numéro de document), `occurred_at` (défaut `now()` côté base).

Index : `(subject_type, subject_id, occurred_at)`, `(event, occurred_at)`, `(actor_id, occurred_at)`. Aucune colonne `updated_at`.

---

## 3. Ordre des migrations (Lot 1)

1. `lanaya_policy_versions` (référencée par les suivantes) ;
2. `lanabaga_profiles` ;
3. `lanabaga_documents`, `lanabaga_references`, `lanabaga_agreements` ;
4. `lanaya_consents` ;
5. `lanaya_seller_leads`, puis `lanaya_seller_invitations` ;
6. `lanaya_events` ;
7. **aucune donnée insérée par migration** : ni politique, ni pays ouvert, ni Lanabaga. L'ouverture du Burkina Faso se fait par une politique proposée puis approuvée par deux personnes, après déploiement.

Chaque migration ne crée que ses tables : elle ne touche aucune table existante, ne verrouille aucune table chaude (`orders`, `order_items`, `users`, `stores` ne reçoivent qu'une clé étrangère entrante, sans réécriture). Temps d'arrêt attendu : nul.

Permissions et rôles : ajout des permissions `lanaya.*` et des rôles `lanaya-*` dans `ProductionRolesPermissionsSeeder`, avec l'exclusion du préfixe pour le rôle `admin` (ADR-05). À lancer selon `docs/PERMISSIONS_DEPLOY_RUNBOOK.md` (le seeder réécrit les rôles : relever l'état avant).

## 4. Compatibilité

- **Commandes historiques** : aucune lecture ni écriture au Lot 1. Au Lot 3, le contexte Lanaya ne se crée que pour une commande postérieure à l'ouverture de `order_tracking` et dont la boutique a une affectation active : test ACC-063 (« les anciennes commandes sont traitées exactement comme avant »).
- **Profil `/auth/me`** : un bloc `lanaya` ajouté ; aucun champ retiré ni renommé (applications mobiles, R-09).
- **Back-office** : aucune page existante modifiée, sauf le menu (entrée « Lanaya ») et la règle d'attribution des rôles.
- **Portail** : type de session étendu (`spaces`), `UserRole` gagne `lanabaga` ; les trois espaces existants gardent leurs routes.

## 5. Retour arrière

- Avant toute donnée réelle : `migrate:rollback` des migrations Lanaya (elles ne touchent rien d'autre).
- Après des données réelles : **pas de suppression**. On ferme les capacités du pays (nouvelle version de politique, ou `LANAYA_KILL_SWITCH`), le code peut être ramené en arrière, les tables restent (inertes, ADR-07) pour la preuve. Les permissions ajoutées restent aussi (sans effet sans le code), comme le prévoit déjà le runbook des permissions.

## 6. Conservation et données personnelles (attend DEC-20)

| Donnée | Proposition provisoire, à valider par Privacy/Legal |
|---|---|
| Pièces d'une candidature refusée ou retirée | effacement du fichier après un délai à fixer ; la ligne garde l'empreinte et la décision |
| Pièces d'un Lanabaga actif | durée de la relation + durée légale de preuve |
| Prospects non convertis | effacement des coordonnées après un délai à fixer ; agrégats conservés |
| `lanaya_events`, `lanaya_consents`, conventions | conservés (preuve) ; anonymisation par procédure dédiée seulement |

Aucune donnée personnelle réelle dans les fixtures, les seeders de recette ou les captures (les seeders QA utiliseront des identités fictives `qa.sugu.test` et des fichiers générés).

---

## 7. Écarts de l'implémentation (Lot 1, 21 octobre 2026)

Comparaison du plan ci-dessus avec ce qui est écrit dans `sugu` : migrations `2026_10_21_100000` à `100600`, Enums `app/Domain/Lanaya/Enums/`, `PolicyService`, `ConsentService`, `config/lanaya.php`. Le plan n'est pas réécrit : ses sections disent ce qui était prévu, celle-ci ce qui est livré.

**Communs aux neuf tables**

- Les contraintes CHECK et les index uniques partiels ne sont créés que sous PostgreSQL (le moteur de toutes les bases SUGU). Sur un autre moteur, ils n'existeraient pas.
- L'immuabilité (politique approuvée, consentement, événement) est assurée par les modèles Eloquent (`booted()`), pas par un trigger. Une écriture par le query builder la contourne ; `PolicyService::approve` n'écrit que si `approved_at` est encore vide.
- Les tables reçoivent `created_at` et `updated_at` (`timestampsTz()`), sauf `lanaya_consents` et `lanaya_events` (horodatage de création seul).
- Conformes au plan : l'ordre des migrations, aucune donnée insérée, aucune table native modifiée, des `down()` qui ne suppriment que leurs tables.

| Table | Écart | Remarque |
|---|---|---|
| `lanaya_policy_versions` | clé `required_references` (0 à 5) ajoutée au document ; `application_retention_days` absente | La durée de conservation attend DEC-20. Au Lot 1, seule la famille `policy` est acceptée. Index `lanaya_policy_current_idx` ajouté pour trouver la version en vigueur. |
| `lanabaga_profiles` | `experience_band` string(10) nullable ; `conflicts_declared` en `text` (pas jsonb) ; `identity_verified_at`, `identity_verified_by`, `suspended_by` ajoutées | La CHECK `lanabaga_active_means_approved` est plus stricte que prévu : un compte suspendu doit aussi être admis. `quality_gate_state` vaut `open` dès le brouillon. |
| `lanabaga_documents` | `document_number_hash` absente (aucun numéro de pièce n'est saisi) ; `rejection_reason` en texte (pas un code) | Le disque `kyc_private` est imposé par le code (`KycStorage`), pas par une contrainte. |
| `lanabaga_references` | `position` ajoutée (unique par profil) ; `email` absente ; `note` devient `verification_note` | **À confirmer** : une référence retirée par le candidat pendant son brouillon (ou son complément) est supprimée physiquement (`ApplicationService::replaceReferences`). Rien n'est supprimé après la soumission. |
| `lanabaga_agreements` | états `recorded`, `valid`, `rejected`, `terminated` (au lieu de `pending_signature`, `valid`, `expired`, `terminated`) ; `termination_reason` en texte ; `verification_note` ajoutée | L'échéance n'est pas un état : `isInForce()` la calcule à partir de `valid_from` et `valid_until`. La règle « contrôlée par une autre personne » est devenue une CHECK (`lanabaga_agreements_four_eyes`). |
| `lanaya_consents` | `contact_by_sugu` absente ; `channel` toujours `portal` | Les clés vivent dans `config/lanaya.php` (textes provisoires, version `pilote-2026-10-provisoire`). |
| `lanaya_seller_leads` | `last_activity_at` ajoutée ; états `prospect`, `contacted`, `invited`, `no_response`, `registered`, `lost` | `verified`, `activated`, `first_sale` arriveront avec les affectations (Lot 2). `no_response` est posé quand une invitation expire. **Index `matched_store_id` oublié par la première migration, ajouté par `2026_10_21_100600`.** |
| `lanaya_seller_invitations` | `company_name`, `contact_name`, `created_by` ajoutées ; `channel` toujours `link` ; index `(status, expires_at)` ajouté | Aucun SMS ni WhatsApp n'est envoyé par SUGU au Lot 1 : le Lanabaga transmet le lien. |
| `lanaya_events` | conforme ; noms d'événements plus nombreux que les exemples du plan | `document.reviewed` (et non `document.rejected`), `risk_signal.known_seller`, `risk_signal.concurrent_origin`, `document.opened`, `agreement.opened`… |

**États** : `prechecked` n'existe pas (`submitted` vaut pré-vérification passée) ; `AccountStatus`, `IdentityStatus`, `QualityGateState`, `DocumentReviewStatus`, `ReferenceStatus`, `InvitationStatus` sont conformes. `RejectionReason` et `SuspensionReason` forment le référentiel de motifs annoncé au §2.1.

**Conservation (§6, DEC-20)** : aucun mécanisme de purge ni d'anonymisation n'est écrit, conformément au report ; rien n'est préparé non plus.
