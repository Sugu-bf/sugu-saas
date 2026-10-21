# SUGU Lanaya — Qualification des affectations et des attributions (DEC-29 à DEC-32)

Ce document ne contient que des résultats **réellement exécutés**. Niveaux de preuve : **L2** test automatisé sur base de test ; **L3** recette locale contre le vrai Laravel, le back-office compilé et le portail construit ; **L4** staging ; **L5** production. Aucune exécution L4 ni L5 : rien n'est poussé ni déployé.

## État au 21 octobre 2026

**Livré et recetté en local (L3).** Commits locaux, branche `lanaya/lot0-lot1`, rien de poussé :

| Dépôt | Commits |
|---|---|
| `sugu` | `b21d8907` domaine, tables, permissions · `69973f80` API · `918c9abf` console et `LanayaAssignmentsTest` · `88b817c4` données de recette · `16bcf48d` codes d'erreur |
| `sugu-saas` | `63fd86a` réponse du vendeur · `f9e82bc` espace Lanabaga · `3adcf4a` tests e2e · (documentation : ce commit) |
| `sugu-marketplace` | aucun : rien n'y est montré aux acheteurs |

## Ce qui a été demandé

Le 21 octobre 2026, après la livraison du Lot 1 : « Un administrateur doit pouvoir ajouter manuellement des vendeurs à un Lanabaga ou en retirer ! Ajouter sur une commande ou en supprimer sur une commande ou en réattribuer pour une commande ! » Réponses de l'utilisateur, enregistrées comme DEC-29 à DEC-32 ([registre](LANAYA_DECISIONS_REGISTER.md)) :

| Décision | Réponse |
|---|---|
| DEC-29 périmètre | les deux (boutiques confiées **et** commandes), **sans argent** |
| DEC-30 effet | l'affectation n'est active qu'**après l'accord du vendeur**, donné depuis « Programme Lanaya » |
| DEC-31 commandes | commandes **non livrées** seulement, **motif obligatoire**, historique gardé |
| DEC-32 droits | **Ops** (`lanaya-ops`), permission dédiée, double authentification ; jamais le rôle `admin` seul |

## Ce qui est livré

**Back-office** (Lanaya › Candidatures › dossier admis, et Lanaya › Commandes) :

- « Boutiques confiées » : Ops cherche une boutique active, la confie au Lanabaga avec un motif (10 caractères au moins) ; la proposition attend le vendeur. Ops peut retirer une proposition ou mettre fin à une affectation, avec un motif. Ce que le serveur refuserait est dit avant l'envoi (boutique déjà confiée à ce Lanabaga, proposition déjà en attente).
- « Commandes et Lanabagas » : recherche par numéro ; pour la part de chaque boutique d'une commande non livrée, Ops **attribue** au Lanabaga principal de la boutique, **retire** l'attribution ou la **réattribue** (après un transfert de boutique), toujours avec un motif ; l'historique de la part (qui, quand, pourquoi, qui l'a retirée) ne s'efface pas ; une commande livrée, annulée, retournée ou en échec est affichée sans aucune action.

**Portail, vendeur** (« Programme Lanaya ») : la proposition de SUGU, avec la carte publique du Lanabaga et le texte du consentement versionné ; la case n'est jamais cochée d'avance ; « Accepter ce Lanabaga » ou « Refuser » (confirmé) ; une fois accepté, « Votre Lanabaga principal » et « Mettre fin à l'accompagnement » (confirmé). Si la proposition remplace le Lanabaga actuel, la carte le dit.

**Portail, Lanabaga** : « Mes vendeurs » distingue les boutiques confiées, en attente de l'accord du vendeur, et seulement présentées ; « Boutiques confiées » et la nouvelle page « Commandes suivies » (numéro, boutique, statut, date ; **ni montant, ni acheteur, ni adresse** : le serveur ne les envoie pas). La capacité du tableau de bord compte désormais les boutiques confiées actives.

**Règles tenues par le serveur** (aucune par l'interface seule) : une boutique a un seul Lanabaga principal (index uniques partiels) ; capacité vérifiée à la proposition et sous verrou à l'acceptation ; accepter un autre Lanabaga termine l'affectation précédente sans toucher aux commandes en cours (jamais de réattribution silencieuse, cahier §8.4) ; une attribution exige une affectation active ; le Lanabaga acheteur de la commande est refusé ; un opérateur ne décide rien pour lui-même ; aucune ligne de grand livre, d'obligation, de commission ni de versement ; tout est historisé dans `lanaya_events`. Deux capacités de pays nouvelles, `seller_assignment` et `order_tracking`, **fermées par défaut**.

## 1. Backend (`sugu`)

| Suite | Commande | Résultat |
|---|---|---|
| Lanaya, interface d'administration, seeder de production (après Pint) | `php -d memory_limit=2G vendor/bin/pest tests/Feature/Lanaya tests/Feature/Ui tests/Feature/ProductionSeederTest.php` | **143 verts**, 1 003 assertions, 391 s (70 Lanaya, dont 10 nouveaux dans `LanayaAssignmentsTest` et 1 dans `QaLanayaSeederTest`) |
| Vitest du back-office (menu, cadre) | `npx vitest run resources/js/navigation resources/js/shell` | **57 verts** (127 entrées de menu) |
| Types Vue | `npx vue-tsc --noEmit` | 209 erreurs, **toutes préexistantes** (fichiers de test de contrat) ; aucune dans les fichiers Lanaya ni dans le menu |
| Style PHP | `vendor/bin/pint --test` sur les fichiers modifiés | conforme (après `pint` sur les seules lignes nouvelles) |
| Compilation du back-office | `npx vite build` (base de recette, Wayfinder) | compile ; `public/build` remis dans son état ensuite |

Contenu de `LanayaAssignmentsTest` (10 tests) : parcours DEC-30 complet (rien d'actif avant l'accord du vendeur pour **sa** boutique, consentement versionné) ; refus et fin par le vendeur ; propositions refusées (boutique inactive, sa propre boutique, Lanabaga suspendu, pays fermé, doublon) ; DEC-32 (réservé à Ops avec double authentification ; ni `admin` seul, ni Commercial, ni Compliance) ; transfert qui garde les attributions ; capacité tenue sous accords simultanés, une proposition n'occupant pas de place (ACC-014) ; DEC-31 ajout, réattribution, retrait avec motif et historique, ce que voit le Lanabaga ; commande livrée, boutique absente de la commande, Lanabaga acheteur, absence de permission ; aucune écriture financière ; recherche de boutiques (actives seulement, avec leur Lanabaga du moment).

## 2. Portail (`sugu-saas`)

| Vérification | Commande | Résultat |
|---|---|---|
| Types | `npx tsc --noEmit -p .` | aucune erreur |
| Lint | `npx eslint src e2e playwright.lanaya.config.ts` | aucune erreur |
| Vitest complet | `npx vitest run` | **1 082 verts**, 59 fichiers (dont 5 nouveaux sur la proposition, l'accord, le refus, la fin, le remplacement) |
| Build | `npx next build --webpack` | réussi ; nouvelle route `/lanabaga/orders` |
| Playwright, doublure Lanaya | `npx playwright test -c playwright.lanaya.config.ts` | **26 verts** : 13 parcours (dont 4 nouveaux), 13 écrans aux six largeurs (dont 3 nouveaux : « Commandes suivies », la proposition et le Lanabaga principal du vendeur) : rien de latéral, tout arrondi, aucune violation Axe sérieuse |
| Playwright, cadre commun | `playwright.shell.config.ts` | **non rejoué** : le seul changement du cadre est une entrée de menu Lanabaga, couverte par `app-shell.test.tsx` |

## 3. Recette locale contre le vrai Laravel (L3)

Pile : base `sugu_recette` migrée (`2026_10_21_100700`), `ProductionRolesPermissionsSeeder` relancé (les deux permissions nouvelles vont au seul rôle `lanaya-ops` ; l'administrateur générique ne les a pas, vérifié), `QaLanayaSeeder` relancé (nouvelle version de politique qui ouvre les deux capacités en pilote, approuvée par une seconde personne ; boutique B confiée à `qa-lanabaga` avec l'accord du vendeur B ; commande `SU-2099-000090` suivie). API `php -S 127.0.0.1:8610`, back-office compilé, portail `next start -p 3240`.

Enchaînement réellement joué :

1. **Back-office, Ops (2FA)** : boutique A confiée à `qa-lanabaga` avec un motif → « Proposition envoyée » ; la boutique B (déjà confiée) et la boutique A (proposition en attente) sont refusées **avant l'envoi**, bouton « Confirmer » inactif.
2. **Portail, vendeur A** (W3) : la proposition s'affiche, case non cochée ; « Accepter » sans la case est refusé ; avec la case, le serveur répond 200 et l'API dit l'affectation active, au bon Lanabaga, sans proposition restante.
3. **Back-office, Ops** : `SU-2099-000030` (boutique A) attribuée ; `SU-2099-000090` (boutique B) retirée puis attribuée de nouveau, l'historique garde les deux lignes ; `SU-2099-000029` (livrée) : aucune action ; fin de l'affectation de la boutique A → l'attribution de `SU-2099-000030` **reste** (jamais déplacée en silence), la page le dit, Ops la retire.
4. **Portail, Lanabaga et vendeur B** (R9, R10) : boutiques confiées et commandes suivies comparées à la réponse du serveur, aucun montant ; le vendeur B voit son Lanabaga principal et la sortie.

| Test | Résultat |
|---|---|
| R1 à R8 (Lot 1, rejoués avec les nouvelles données) | verts |
| R9 boutiques confiées, commandes suivies | vert |
| R10 vendeur B, Lanabaga principal | vert |
| W1 invitation répondue par le vendeur A, **avec une proposition de SUGU sur la même page** | vert, rejoué seul (voir ci-dessous) |
| W2 inscription complète d'un candidat | vert |
| W3 le vendeur A accepte la proposition d'Ops | vert (deux fois : avant et après la fin d'affectation par Ops) |

Dernier passage complet : **12 verts, 1 échec** (W1, 3,2 min). L'échec venait du test : le passage précédent, arrêté sur le défaut des deux « Refuser », avait laissé une invitation ouverte, et la requête de nettoyage du test n'envoyait pas d'en-tête `Origin` (le relais du portail refuse à juste titre une écriture d'une autre origine). Corrigé dans le test ; W1 rejoué ensuite deux fois : nettoyage, puis **vert**. Le défaut des deux « Refuser » lui-même avait été trouvé par le premier passage (12 verts, W1 en échec) et corrigé dans le portail.

Captures (non versionnées) : `docs/captures/lanaya/affectations/back-office/`, `docs/captures/lanaya/affectations/recette-local/`, `docs/captures/lanaya/affectations/doublure/`.

## Défauts trouvés par la recette, et corrigés

| Défaut | Correction |
|---|---|
| Une invitation et une proposition sur la même page portaient deux boutons « Refuser » de même nom (ambigu au lecteur d'écran ; W1 l'a trouvé) | le bouton de la proposition s'annonce « Refuser la proposition pour <boutique> » ; test de doublure « une invitation et une proposition sur la même page » |
| Le dialogue « Confier une boutique » proposait un « transfert » vers le Lanabaga qui l'accompagne déjà, et laissait envoyer une seconde proposition (le serveur refusait) | refus dit avant l'envoi, « Confirmer » inactif |
| Ligne de « Boutiques confiées » écrasée dans la colonne latérale (texte sur 150 px) | badge sur la ligne du nom, actions en dessous |
| L'historique d'une attribution retirée nommait qui l'avait créée, pas qui l'avait retirée | « retirée le … par … » ; numéro de commande sur une ligne au téléphone |
| Une attribution restée active après la fin de l'affectation n'était pas expliquée | « Le Lanabaga attribué n'est plus le Lanabaga principal de cette boutique : retirez l'attribution, ou réattribuez-la… » |

## Limites connues

- **Aucune notification** : ni le vendeur ni le Lanabaga ne sont prévenus d'une proposition, d'une acceptation ou d'une attribution ; la proposition apparaît dans « Programme Lanaya » à la prochaine visite du vendeur.
- **Aucune attribution automatique** au passage de commande : une commande d'une boutique confiée n'est suivie que si Ops l'attribue (le contexte Lanaya au checkout reste au Lot 3).
- **Après un transfert ou une fin d'affectation**, Ops doit réattribuer ou retirer à la main les commandes en cours (règle voulue : jamais de réattribution silencieuse).
- **La réattribution vers un autre Lanabaga** n'a pas été jouée en recette locale (un seul Lanabaga admis dans les données QA) ; elle est couverte en L2 (`LanayaAssignmentsTest`).
- **Périmètre boutique seulement** : pas d'affectation par catégorie ou produit (Lot 7), pas d'attribution par ligne (Lot 3).
- **Déploiement** : migration, puis `ProductionRolesPermissionsSeeder` (il réécrit les permissions des rôles : voir `../sugu/docs/PERMISSIONS_DEPLOY_RUNBOOK.md`), puis une version de politique du pays qui ouvre `seller_assignment` et `order_tracking`, proposée par Ops et approuvée par une autre personne. Sans cette politique, tout reste fermé.
- **Marketplace** : rien n'y change (aucune donnée Lanaya n'est montrée aux acheteurs).
