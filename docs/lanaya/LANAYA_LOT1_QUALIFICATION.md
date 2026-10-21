# SUGU Lanaya — Qualification

Ce document ne contient que des résultats **réellement exécutés**, avec leurs conditions de reproduction. Niveaux de preuve : **L2** test automatisé sur base de test ; **L3** recette locale contre le vrai Laravel et le portail construit ; **L4** staging ; **L5** production. Aucune exécution L4 ni L5 : aucun push, aucun déploiement n'a été fait ni autorisé.

## État au 21 octobre 2026

**Le Lot 1 est livré et recetté en local (L3).** Identité, candidature, pièces, admission à deux personnes, suspension, convention enregistrée, prospects, invitations, origine d'un vendeur, capacité (primitive), console d'administration, espace Lanabaga du portail et entrée vendeur fonctionnent contre le vrai Laravel, sur des données fictives. Rien n'est poussé ni déployé ; aucune activation financière.

Commits locaux, branche `lanaya/lot0-lot1` des deux dépôts :

| Dépôt | Commits du Lot 1 |
|---|---|
| `sugu` | `9a754661` caractérisation · `bb87d66d` socle · `b19aa8ec` permissions · `3c75bb37` API · `a8faa67a` console · `ef98459e` double authentification · `5789cec4` panne à l'inscription · `b37303a9` boutiques actives au tableau de bord · `a6310d1f` index · `a07facea` menu et historique de la console · `0ecaece3` données de recette · `2d02461c` codes d'erreur |
| `sugu-saas` | `71a62e5` statuts et initiales · `90c61c1` espace Lanabaga, réponse du vendeur, pages publiques · `f97e944` tests e2e · (documentation : ce commit) |
| `sugu-marketplace` | aucun : rien de Lanaya n'y est affiché au Lot 1 |

## 1. Backend (`sugu`)

Environnement : Windows, PHP 8.3, PostgreSQL de test (conteneur `sugu-test-postgres`, port 55432, base `sugu_testing`), Redis de test (6380).

| Suite | Commande | Résultat |
|---|---|---|
| Lanaya (caractérisation comprise) | `php -d memory_limit=1024M vendor/bin/pest tests/Feature/Lanaya` | **59 verts**, 497 assertions, 202 s |
| Interface d'administration et seeder de production | `vendor/bin/pest tests/Feature/Ui tests/Feature/ProductionSeederTest.php` | **73 verts**, 367 assertions, 387 s |
| Référence de non-régression (12 fichiers, voir la version précédente de ce document) | même commande qu'au Lot 0 | **167 verts** lors des commits `bb87d66d` à `ef98459e` ; non rejouée après `5789cec4` (changements limités au domaine Lanaya) |
| Vitest du back-office (navigation, cadre) | `npx vitest run resources/js/navigation resources/js/shell` | **57 verts** |
| Types Vue | `npx vue-tsc --noEmit` | 341 lignes d'erreurs, **toutes préexistantes** ; aucune dans les fichiers Lanaya ni dans le menu |
| Compilation des pages Vue | `npx vite build` (avec la base de recette : Wayfinder lit les routes) | **compile**, 12 entrées Lanaya au manifeste ; `public/build` remis dans son état ensuite |

## 2. Portail (`sugu-saas`)

| Vérification | Commande | Résultat |
|---|---|---|
| Types | `npx tsc --noEmit -p .` | aucune erreur |
| Lint | `npx eslint src e2e playwright.lanaya.config.ts` | aucune erreur |
| Vitest complet | `npx vitest run` | **1 075 verts**, 59 fichiers (dont 13 Lanaya, 6 espaces de session, 6 cadre Lanabaga) |
| Build | `npx next build --webpack` | réussi ; routes `/lanabaga/*`, `/vendor/lanaya`, `/invitation/[token]`, `/signup/lanabaga`, `/api/auth/lanabaga-register` |
| Playwright, doublure Lanaya | `CAPTURE=1 npx playwright test -c playwright.lanaya.config.ts` | **19 verts** : 9 parcours, 10 écrans aux six largeurs (rien de latéral, tout arrondi, aucune violation Axe sérieuse) |
| Playwright, cadre commun | `npx playwright test -c playwright.shell.config.ts` | **104 verts** : 102 au premier passage ; 1 attente mise à jour (entrée « Lanaya » du menu vendeur) ; 1 échec de course clavier sous charge (menu du compte de l'agence), vert rejoué seul |

## 3. Recette locale contre le vrai Laravel (L3)

Pile : base `sugu_recette`, `QaProPortalSeeder` puis `QaLanayaSeeder` (comptes fictifs `@qa.sugu.test`, pièces = PDF « fictif » sur le disque privé local), API par `php -S 127.0.0.1:8610`, portail construit par `next start -p 3240`. Commande : `STAGING_URL=http://localhost:3240 STAGING_AGENCY_PASSWORD=… [STAGING_ALLOW_MUTATIONS=1] npx playwright test -c playwright.staging.config.ts lanaya`.

| Test | Ce qu'il vérifie | Résultat |
|---|---|---|
| R1 | Tableau de bord : chaque chiffre comparé à la réponse du serveur ; ni badge, ni montant ; « Commissions : pas encore ouvert » | vert |
| R2 | Prospects : indicateurs, filtre de statut, panneau, formulaire d'invitation (pas de liste de boutiques, 300 caractères) | vert |
| R3 | Invitations et vendeurs : listes du serveur, « Révoquer » sur les seules invitations en attente, aucun lien réaffiché | vert |
| R4 | Lanabaga admis : candidature, documents, conformité en lecture seule ; sa pièce s'ouvre par le relais du portail (PDF, 200) | vert |
| R5 | Brouillon : le portail renvoie le candidat à sa candidature, **le serveur répond 403** sur le réseau ; quatre étapes à 390 et 1440 px ; aucune case cochée d'avance | vert |
| R6 | En revue et complément demandé : ce que le candidat voit du travail de SUGU, la pièce refusée et son motif | vert |
| R7 | Vendeur B : qui l'a présenté, avec le code ; ni « Vérifié », ni « Contacter », ni promesse de visibilité. Vendeur A : état vide honnête | vert |
| R8 | Pages publiques : inscription d'un candidat, invitation inconnue | vert |
| W1 | Un prospect (case d'accord exigée), une invitation au vendeur A (lien et numéro retirés du mot personnel par le serveur), la page publique du lien, puis la réponse du vendeur A depuis son compte : **acceptée** au 2ᵉ passage, **refusée** au 3ᵉ (boutique déjà présentée), jeton inutilisable ensuite | vert |
| W2 | Un nouveau compte, de l'inscription (code e-mail lu dans le journal local) à la soumission : profil, deux pièces, deux références, engagements refusés puis acceptés | vert |

Dernier passage complet : **10 verts** (2,9 min). Après les dernières corrections de mise en page : **R1 à R8 verts** (Axe désormais lancé à la hauteur réelle de l'écran).

Captures (non versionnées, comme celles des phases précédentes) : `docs/captures/lanaya/lot1/recette-local/` (103 fichiers, six largeurs, page entière et écran de téléphone), `docs/captures/lanaya/lot1/doublure/` (60, données inventées de la doublure), `docs/captures/lanaya/lot1/back-office/` (15 : liste des candidatures, dossier en revue, dossier admis, réseau, politiques, à 1440, 1280 et 390 px). Les captures du back-office ont été faites avec deux opérateurs créés **à la main dans la base locale seulement** (secret de double authentification connu) : aucun seeder ne crée de compte d'administration.

Comparaison avec les maquettes : [LANAYA_MOCKUPS_REVIEW.md](LANAYA_MOCKUPS_REVIEW.md), section « Livraison du Lot 1 ».


## Critères d'acceptation du Lot 1

Niveau de preuve : **L2** test automatisé sur base de test ; **L3** recette locale contre le vrai Laravel (`sugu_recette`, portail construit) ; **L4** staging (non exécuté, aucune autorisation de déploiement).

| ACC | Critère (cahier §31) | Preuve | Niveau |
|---|---|---|---|
| ACC-001 | Un candidat crée une demande ; il ne lit aucune commande avant admission | Pest `LanayaApplicationApiTest` (« ACC-001 : un candidat non admis ne lit ni tableau de bord, ni réseau, ni commande ») ; recette R5 (le portail renvoie le candidat à sa candidature, le serveur répond 403 sur `lanaya/me/leads`) ; W2 (un nouveau compte crée et soumet sa candidature) | L2 + L3 |
| ACC-002 | Un Lanabaga admis, avec contrat valide, est actif **sans** badge | Pest « ACC-002 » ; recette R1 (tableau de bord sans badge ni montant, « Niveau : Nouveau ») ; contrat du portail : un badge envoyé par erreur est ignoré (Vitest) | L2 + L3 |
| ACC-003 | La suspension retire immédiatement l'accès | Pest « ACC-003 / ACC-065 » (dès la requête suivante, invitations inutilisables) | L2 |
| ACC-004 | Une convention expirée bloque les nouveaux droits sans effacer l'historique | Pest « ACC-004 » | L2 |
| ACC-005 | Pas d'auto-approbation par changement de contexte | Pest « ACC-005 » (console : pas de décision sur son propre dossier ; réseau : pas d'auto-présentation) ; portail : « C'est votre propre invitation » (Vitest) | L2 |
| ACC-006 | Un administrateur non habilité ne lit pas les pièces KYC | Pest « ACC-006 » (ni liste, ni pièce, même avec un lien signé) ; le rôle `admin` ne reçoit aucune permission `lanaya.*` (`LanayaGovernanceTest`) | L2 |
| ACC-007 | L'invitation laisse la décision au vendeur | Pest « ACC-007 / 008 / 009 » ; recette W1 (case jamais cochée d'avance, refus serveur sans la case, acceptation puis refus selon l'état de la boutique) ; Playwright doublure et Vitest | L2 + L3 |
| ACC-008 | Aucun second compte créé par une invitation | Pest « ACC-007 / 008 / 009 » (acceptation pour SA boutique, aucun compte ni boutique créés) ; W1 (le vendeur A répond depuis son propre compte) | L2 + L3 |
| ACC-009 | Une recommandation ne donne pas de commission | Pest (aucune écriture d'argent à l'acceptation) ; portail : « Présenter une boutique ne donne pas, à lui seul, droit à une commission » ; aucune route Lanaya ne touche à l'argent | L2 + L3 |
| ACC-014 | Pas de sixième vendeur actif au-delà de cinq | Pest « ACC-014 / ACC-015 (primitive) » : capacité = minimum des limites, sixième refusé sous verrou. Les affectations (vendeurs « actifs ») arrivent au Lot 2 : la primitive seule est livrée | L2 (primitive) |
| ACC-059 | Un Lanabaga ne lit rien d'un autre | Pest « ACC-059 » (ni lecture, ni modification, ni révocation ; 404) | L2 |
| ACC-060 | Aucun encaissement, aucune modification de bénéficiaire | Pest « ACC-060 » (aucune route Lanaya ne touche à l'argent ; le compte de versement d'une boutique reste fermé à un Lanabaga) ; page Conformité : règles du cahier §1.4 | L2 |
| ACC-061 | Un pays non activé refuse Lanaya, les flux natifs continuent | Pest « ACC-061 » (y compris l'interrupteur `LANAYA_KILL_SWITCH`) | L2 |
| ACC-065 | Le retrait des droits coupe l'accès immédiatement | Pest « ACC-003 / ACC-065 » | L2 |

Non couverts au Lot 1, par construction : ACC-010 à 013 et 015 à 058, 062 à 064, 066 à 070 (affectations, contextes de commande, honoraires, finance, badges, abonnements : lots 2 à 9).

## Défauts trouvés par la recette, et corrigés

La recette contre le vrai Laravel et les captures ont trouvé ces défauts ; chacun est corrigé dans les commits du Lot 1 et re-vérifié.

| # | Défaut | Où | Correction |
|---|---|---|---|
| 1 | Une panne serveur pendant l'inscription d'un candidat (rôle Spatie `buyer` absent de la base) répondait le message neutre « si vous avez déjà un compte, connectez-vous » | `LanabagaRegisterController` | 503 « momentanément indisponible » pour une panne ; la réponse neutre reste pour un compte existant. Test Pest ajouté. Cause racine hors Lanaya : risque R-15 de l'audit |
| 2 | Le tableau de bord ne disait pas si une boutique présentée est active (la liste « Mes vendeurs » le disait) | `GET lanaya/me/overview` | `store_active` ajouté (ajout seulement) |
| 3 | Index `matched_store_id` prévu par le plan de données, absent de la migration | `lanaya_seller_leads` | Migration `2026_10_21_100600` |
| 4 | Onglet actif Prospects / Invitations / Vendeurs : texte orange sur fond orangé, contraste insuffisant (Axe) | portail | Texte foncé, icône orange, comme l'entrée active du menu |
| 5 | Lien dans un paragraphe sans soulignement, contraste faible (Axe) | page vendeur, inscription | Lien souligné, texte foncé |
| 6 | Les trois onglets du réseau débordaient de 10 px à 375 px | portail | Marges réduites sous 640 px |
| 7 | « Enregistrer le brouillon » et « Soumettre ma candidature » débordaient de 18 px à 375 et 390 px | candidature, étape Validation | « Enregistrer » sur téléphone |
| 8 | La page Conformité n'avait aucun élément focalisable : sa zone défilante était inaccessible au clavier sur téléphone (Axe, à la hauteur d'un écran) | portail | Lien « Voir ma candidature » ; Axe lancé à la hauteur réelle de l'écran dans la recette |
| 9 | À 1440 px, le tableau des prospects débordait de sa carte (statuts coupés sous la colonne d'actions, dernière activité masquée) et la colonne « Réponse » des invitations tenait sur six lignes, « Révoquer » coupé | portail | Formulaire latéral à partir de 1400 px seulement, tableau compact, Source masquée quand la place manque (visible dans la fiche et sur téléphone), dates courtes ; la page Invitations renvoie au formulaire de la page Prospects |
| 10 | Les blocs du tableau de bord, de la candidature, de la conformité et de la page vendeur n'avaient pas de cadre, contrairement aux maquettes | portail | Chaque bloc dans sa carte (`Panel`) |
| 11 | Initiales « A( » pour « Aïssata Kaboré (QA) » | `Avatar` (design system) | Initiales prises des mots seulement ; test ajouté |
| 12 | Anneau de capacité : un point vert pour zéro vendeur actif, piste invisible | portail | Rien de dessiné pour zéro, piste visible |
| 13 | Numéros affichés « +22670000102 » | portail | « +226 70 00 01 02 » |
| 14 | Code Lanabaga coupé en fin de ligne (« LNB- / 93S6X9 ») | carte du Lanabaga | Le code reste sur une ligne |
| 15 | « Bonjour, QA » : le prénom venait du nom de recette | `QaLanayaSeeder` | Noms fictifs prénom d'abord, « (QA) » à la fin |

## Limites connues du Lot 1

- **Aucune recette staging (L4)** : le bucket privé des pièces n'est pas configuré sur le staging (R-05) et aucun déploiement n'est autorisé.
- **Rôle `buyer` absent des seeders** (R-15) : à vérifier sur le staging et en production avant toute inscription de candidat.
- **Pas de page « Paramètres » dans l'espace Lanabaga** : un Lanabaga qui n'est pas aussi vendeur ne change pas son mot de passe depuis le portail (il passe par « Mot de passe oublié »).
- **Invitation par lien seulement** : SUGU n'envoie ni SMS ni WhatsApp ; le Lanabaga transmet le texte officiel et le lien.
- **Un compte qui n'existe que sur la marketplace** (acheteur) ne peut pas s'inscrire comme candidat (réponse neutre) : il doit d'abord avoir un compte Pro, ou passer par l'équipe.
- **Textes d'engagement provisoires** (version `pilote-2026-10-provisoire`) : à faire valider par Legal ; convention v1.1 jamais fournie (enregistrée par référence et copie signée).
- **Fiche vendeur détaillée (maquette 5)** et accompagnement actif : Lot 2.
- **Régression Pest complète** (environ 4 240 tests, plus de 2 h par dossiers) non rejouée sur la branche ; à faire avant toute proposition de staging.

## Lot 0 (rappel)


Environnement : poste Windows, PHP 8.3, PostgreSQL de test (conteneur `sugu-test-postgres`, port 55432, base `sugu_testing`), Redis de test, branche `lanaya/lot0-lot1` du backend.

### Tests de caractérisation — niveau L2

Commit `9a754661` (backend). Commande : `php vendor/bin/pest tests/Feature/Lanaya/Baseline`.

| Test | Ce qu'il établit | Résultat |
|---|---|---|
| I-1 | La fiche Utilisateur du back-office ne garde qu'un rôle et réécrit `user_type` | vert |
| I-2 | Le seeder des rôles donne au rôle `admin` toute permission existante | vert |
| I-3 | Un rôle restreint seul (`finance-manager`) n'entre pas dans le back-office | vert |
| I-4 | Un administrateur peut modifier ses propres rôles administrateurs | vert |
| O-1 | Un panier à deux vendeurs donne une seule commande, au nom du premier vendeur | vert |
| C-1 | La commission acquise est inscrite au grand livre par commande et par boutique | vert |
| C-2 | Une règle de catégorie, appliquée par le simulateur, ne l'est pas au règlement | vert |
| C-3 | La règle retenue est celle du règlement ; `orders.commission_amount` reste à 0 | vert |

**8 tests, 19 assertions, 121 s.** Ces tests décrivent l'existant ; leur réussite prouve le comportement constaté, pas une propriété de sécurité de Lanaya.

### Suite de référence de non-régression — niveau L2

Même environnement, aucune modification de code applicatif. Commande :

```
php -d memory_limit=1024M vendor/bin/pest \
  tests/Feature/Financial/OnlineOrderSettlementTest.php tests/Feature/PlaceOrderActionTest.php \
  tests/Feature/Sprint6/SellerOrderScopingTest.php tests/Feature/Admin/AdminAccountsAuthorizationTest.php \
  tests/Feature/Admin/UserAuthorizationTest.php tests/Feature/Admin/RoleManagementAuthorizationTest.php \
  tests/Feature/Admin/VendorKycWorkflowTest.php tests/Feature/Admin/CourierAuthorizationTest.php \
  tests/Feature/Security/KycPrivateStorageTest.php tests/Feature/Delivery/CourierKycPortalTest.php \
  tests/Feature/ProductionSeederTest.php tests/Feature/Admin/AuditLogAccessTest.php
```

**167 tests verts, 786 assertions, 420 s.** C'est la référence à rejouer avant et après chaque commit du Lot 1.

