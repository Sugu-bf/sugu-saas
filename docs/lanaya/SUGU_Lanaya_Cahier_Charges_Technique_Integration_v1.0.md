# SUGU LANAYA
## Cahier des charges technique d'intégration — Backend, Frontends, Administration & Opérations

**Version :** 1.0 — 21 octobre 2026  
**Produit :** SUGU / SuguPro / SUGU Lanaya  
**Socle annoncé :** Laravel 12  
**Statut :** Spécification de conception et de recette, **non** preuve d'audit du code existant  
**Public :** CTO, lead backend, développeurs frontend/mobile, QA, DevOps, Product Owner, Ops, Commercial, Finance, Risk & Compliance  
**Documents de référence :** décisions du programme SUGU Lanaya échangées avec l'équipe ; **Convention pilote SUGU Lanaya – Lanabaga v1.1 du 30 septembre 2026**. Le Master Guide v1.1 a été évoqué dans les échanges précédents, mais son fichier intégral n'a pas été fourni dans l'environnement de cette rédaction ; les détails non confirmés dans la convention ou les décisions sont donc marqués **[À VALIDER]**.

> **Finalité.** Permettre à une équipe technique d'intégrer Lanaya dans **le SUGU existant**, sans remplacer abusivement les modules utilisateurs, vendeurs, catalogue, commandes, messagerie, paiements, transport, abonnements ou back-office déjà en place. Ce document décrit **ce que le système doit faire**, comment les modules interagissent, comment valider leur fonctionnement, et ce qui ne doit pas encore être automatisé. **Aucun code n'est prescrit.**

---

## Guide de lecture et hiérarchie des exigences

- **[CORE]** règle de fonctionnement ou de sécurité obligatoire, y compris dans le pilote.
- **[P0]** nécessaire pour ouvrir un pilote réellement utilisable, sous contrôle SUGU Operations.
- **[P1]** industrialisation après observations du pilote ; ne bloque pas l'ouverture du pilote si un procédé manuel fiable existe.
- **[P2]** extension de capacité, automatisation avancée ou expansion future.
- **[CONFIG]** valeur modifiable, versionnée et soumise à des autorisations ; jamais codée en dur.
- **[HYPOTHÈSE]** valeur de démarrage à valider par les données ou une décision Product/Risk ; ne constitue pas une performance observée.
- **[LEGAL GATE]** fonctionnalité interdite d'activation tant que contrats, responsabilité, fiscalité, protection des données ou infrastructure de paiement ne sont pas validés.
- **[AUDIT]** point dépendant du dépôt, de la BDD, des applications et des prestataires de SUGU ; **ne pas inférer** son existence.

**Règle d'interprétation :** en cas de contradiction entre une présentation commerciale, une maquette, cette spécification et une convention signée, arrêter le développement de la règle concernée et faire arbitrer Product + Legal. Une règle nouvelle ne modifie jamais rétroactivement le traitement économique d'une commande verrouillée, sauf procédure documentée prévue par les accords applicables.

## Sommaire

1. Mandat d'intégration et résultats attendus
2. Audit obligatoire de l'existant
3. Vocabulaire et frontières métier
4. Architecture fonctionnelle cible
5. Acteurs et matrice d'autorisation
6. Cycle de vie du Lanabaga
7. Acquisition de vendeurs par le réseau Lanaya
8. Abonnements et droits de capacité
9. Affectation boutique, catégorie, produit
10. Attribution Lanabaga sur commandes multi-produits
11. Cycle de vie complet d'une transaction Lanaya
12. Deux régimes de rémunération et calculs
13. Négociation, consentement et verrouillage
14. Comptabilité, règlements et rapprochements
15. Participation qualifiée et commissions
16. Scoring Lanabaga et Quality Gate
17. Badges Lanabaga, boutique et produit
18. Carte SUGU Lanaya et vérification QR
19. Risque, fraude, litiges et sanctions
20. Interfaces côté vendeur — SuguPro
21. Interfaces côté Lanabaga
22. Interfaces marketplace / acheteur
23. Back-office SUGU Operations, Finance et Risk
24. Modèle de données logique et intégration
25. Contrats d'interface / événements métier
26. Pays, devises, permissions et conformité
27. Sécurité, confidentialité et résilience
28. Notifications, journal d'audit et analytics
29. Parcours difficiles / scénarios limites
30. Stratégie de migration et pilote sans rupture
31. Tests et critères d'acceptation
32. Backlog priorisé et ordre de livraison
33. Observabilité, KPI, exploitation et rollout
34. Décisions ouvertes et validations obligatoires
35. Définition de “Terminé” et checklist Go/No-Go

---

# 1. Mandat d'intégration et résultats attendus

## 1.1 Problème à résoudre

SUGU opère une marketplace multivendeurs orientée notamment B2B : importateurs, distributeurs, usines et grossistes, avec des commandes parfois élevées et des partenaires potentiellement situés dans plusieurs pays UEMOA. Des échanges numériques seuls ne suffisent pas toujours à lever la méfiance entre vendeur et acheteur. Le programme **SUGU Lanaya** ajoute une couche humaine traçable, rétribuée selon des règles connues et tenue à des standards contrôlables.

**Lanabaga :** indépendant admis et suivi par SUGU, capable de présenter SUGU à des vendeurs, participer à leur onboarding, accompagner leurs transactions, aider aux relations commerciales, suivre la logistique et rapporter des incidents. Il n'est ni un agent de paiement, ni un arbitre financier, ni un garant des marchandises.

## 1.2 Objectifs métier mesurables

1. Acquérir des **vendeurs de qualité** par quelques Lanabagas bien choisis plutôt que par des démarches téléphoniques dispersées. Les annuaires, recherches Web et appels servent à **identifier / vérifier les bons Lanabagas et leurs réseaux**, pas à constituer seuls la stratégie d'acquisition vendeur.
2. Associer, avec consentement, au moins un interlocuteur Lanabaga à un vendeur ; rendre vérifiable cette relation.
3. Accompagner les commandes de la négociation à la livraison, avec preuves, responsabilités et transfert de dossier.
4. Appliquer automatiquement ou par validation Ops les **deux régimes financiers** sans commission cachée ni paiement non autorisé.
5. Afficher des **badges fondés sur des conditions réelles**, séparés du simple abonnement et sans promesse de garantie financière.
6. Augmenter le portefeuille vendeur d'un Lanabaga uniquement s'il **paie pour la capacité** requise **et** satisfait le **Quality Gate**.
7. Conserver les historiques permettant d'auditer attribution, consentement, score, honoraires, litiges et règlements.
8. Démarrer au Burkina Faso ; étendre pays par pays uniquement après activation des capacités et contrôles locaux.

## 1.3 Résultats fonctionnels livrables

- Un Lanabaga identifié et activable sans badge ; profil, contrat, périmètre, vérifications, carte numérique vérifiable, droits limités.
- Un parcours vendeur proposant **1 Lanabaga principal gratuit** ; capacité multi-Lanabaga via **SuguPro Plus**.
- Une affectation explicite boutique/catégorie/produit et une décision déterministe du **Lanabaga responsable de chaque ligne de commande**.
- Une vue de suivi opérationnel unifiée sur les commandes éligibles, sans dupliquer les commandes natives SUGU.
- Un calcul de commission exact, figé avant engagement financier, avec confirmation vendeur pour le régime négocié.
- Un moteur de badge explicable, pouvant fonctionner en mode manuel / assisté au pilote et automatisé ensuite.
- Une console Ops/Risk/Finance permettant de gérer les exceptions sans accès direct aux fonds.
- Un processus de rétrocompatibilité : **aucune commande existante ne doit être requalifiée rétroactivement en Lanaya**.

## 1.4 Hors périmètre V1

- Création d'un wallet, compte de cantonnement ou système d'escrow autonome par SUGU.
- Pouvoir pour un Lanabaga d'encaisser du cash, modifier un bénéficiaire financier, débloquer les fonds, arbitrer un litige ou se déclarer agent bancaire/assureur.
- Achat du badge, priorité commerciale automatique liée au seul paiement, classement opaque promettant “vendeur garanti”.
- Algorithme de machine learning anti-fraude, empreinte appareil intrusive ou score « scientifique » non calibré.
- Internationalisation de tous les pays en un seul déploiement.

# 2. Audit obligatoire de l'existant — livrable préalable à tout développement [P0][AUDIT]

Le développeur **ne commence pas par ajouter 25 tables ni par créer un nouveau service de paiement**. Il produit un inventaire réel, revu par le lead technique, des briques actuellement en production.

| Domaine existant à examiner | Questions précises | Décision de réutilisation attendue |
|---|---|---|
| Identité | Modèle utilisateur unique ? rôles ? comptes professionnels ? KYC actuel ? 2FA ? | Réutiliser l'authentification et étendre les rôles/autorisations. |
| Vendeurs | Boutique, responsable, pays, bénéficiaire de paiement, KYB, statuts et suspension ? | Rattacher les Lanabagas aux identifiants vendeurs existants. |
| Catalogue | Produits, variantes, catégories, offres, changement de propriétaire, multi-vendeur ? | Affectations vers identifiants natifs ; **pas** de copie de produits. |
| Commandes | Paniers mixtes, sous-commandes par vendeur, lignes, remise, coupons, devise, taxes, retours ? | Définir l'unité économique **par vendeur** et par ligne. |
| Tarifs SUGU | Commissions par catégorie/vendeur, remises de commission, frais paiement, taxes ? | Référencer le vrai calcul de commission marketplace. |
| Paiements | PSP, états confirmés, callbacks, paiement partiel, chargeback, annulation, versement vendeur ? | Ajouter instructions / événements Lanaya **sans** se substituer au PSP. |
| Transport | Transporteur, étapes, pickup, OTP/POD, litige livraison ? | Lanabaga consomme des actions autorisées du flux existant. |
| Messagerie | Canal acheteur–vendeur, pièces jointes, historique, lecture, modération ? | Ajouter participant Lanabaga via une permission scoped. |
| Plans | SuguPro Plus, facturation, renouvellement, expiration, essais, droits ? | Étendre l'entitlement ; ne pas coder un second moteur d'abonnement. |
| Admin | Workflow de validation, exports, back-office, identité des opérateurs ? | Étendre les écrans / actions avec RBAC + contexte métier. |
| Architecture frontend | Blade, Livewire, Vue, React, Inertia, API mobile : **non présumé**. | Adapter les spécifications aux écrans réels après audit. |
| Infrastructure | Jobs, queue, cache, stockage pièces, event bus, logs, monitoring, sauvegardes ? | Réutiliser les mécanismes existants. |
| Finance / facturation | Grand livre, factures, avoirs, taxes, compte de règlement, exports comptables ? | Brancher un sous-registre Lanaya sur les identifiants existants. |

**Livrables audit** : schéma d'architecture courant ; cartographie de modèles réels ; matrice d'intégration “réutiliser / étendre / créer” ; limites PSP confirmées ; workflows de commande et de remboursement ; tests de non-régression disponibles ; dettes à résoudre ; décisions techniques documentées. Aucune route, table, technologie frontend ou fournisseur n'est présenté comme **déjà présent** sans cette preuve.

# 3. Vocabulaire et frontières métier

| Terme | Définition exécutable |
|---|---|
| **SUGU Lanaya** | Programme de confiance, accompagnement et réputation. |
| **Lanabaga** | Partenaire indépendant approuvé ; peut exister sans badge. |
| **Lanabaga vérifié** | Statut public acquis par conditions d'identité, d'activité et de qualité. |
| **Affectation** | Relation temporelle vendeur ↔ Lanabaga avec un niveau de couverture et une validation du vendeur. |
| **Principal** | Lanabaga gratuit couvrant la boutique sauf exception de catégorie/produit. |
| **Responsable de ligne** | Unique Lanabaga choisi pour accompagner une ligne de commande déterminée au verrouillage. |
| **Participation qualifiée** | Mission documentée qui justifie le droit conditionnel à rémunération. |
| **Valeur de commande Lanaya (VCL)** | Base de calcul des **produits** confirmés après remises, hors transport, taxes / prélèvements de tiers et remboursements, suivant le contrat. |
| **Régime Standard** | VCL < seuil ; Lanabaga reçoit une fraction de la commission marketplace SUGU réellement acquise. |
| **Régime Négocié** | VCL ≥ seuil (ou exception autorisée) ; honoraires proposés puis acceptés par le vendeur avant verrouillage/paiement. |
| **Quality Gate** | Autorisation opérationnelle distincte de l'abonnement et calculée sur qualité, incidents, conformité et capacité. |
| **Badge** | Signal vérifié et révocable fondé sur des critères mesurables ; **non** produit d'assurance. |
| **Commande effective** | Transaction réelle payée / sécurisée selon canal autorisé, exécutée et livrée avec preuves suffisantes, période de contestation traitée et sans invalidation pertinente. |
| **Snapshot** | Capture non modifiable des règles / parties / taux / affectations applicables à une commande lors de son verrouillage. |
| **Country Pack** | Liste explicite de capacités autorisées par pays (paiement, commission, badge, onboarding, carte, etc.). |

**Distinction majeure :** une commande peut être **accompagnée** avant que le produit, le vendeur ou le Lanabaga n'ait un **badge public**. Les trois niveaux de confiance ne doivent jamais être confondus.

# 4. Architecture fonctionnelle — stratégie d'intégration [CORE]

## 4.1 Modular monolith prioritaire

Sur Laravel 12, **préférer un module fonctionnel intégré aux applications / services existants** plutôt qu'un microservice Lanaya isolé dès le pilote. La frontière métier doit cependant être explicite : les actions Lanaya n'altèrent pas directement les vérités détenues par Orders, Catalog, Billing, Payment, Delivery ou Disputes.

**Modules logiques à ajouter / étendre :**

1. **Lanaya Identity & Compliance** — comptes, vérifications, convention et suspensions.
2. **Network & Referral** — recrutement Lanabaga, prospects stratégiques, attribution d'origine vendeur, activation commerciale.
3. **Assignment Engine** — couverture boutique/catégorie/produit, consentement, conflits, capacité.
4. **Order Integration** — création du contexte Lanaya par sous-commande vendeur et ligne, snapshot, suivi.
5. **Fee Agreements** — proposition, acceptation, refus, expirations et gel des honoraires négociés.
6. **Earnings & Settlement** — droits à commission, journal d'événements financiers, instruction de paiement validée, rapprochement.
7. **Evidence & Participation** — missions, preuves, traces et supervision.
8. **Trust & Badges** — évaluation, états, historique, publication et révocation.
9. **Risk & Case Management** — alertes, litiges, Quality Gate, restrictions et décisions humaines.
10. **Country & Policy Configuration** — paramètres versionnés, activation par capacités, localisation.
11. **Insights & Reporting** — dashboards et métriques opérationnelles.

## 4.2 Une seule source de vérité par domaine

| Domaine | Source de vérité |
|---|---|
| Paiement effectivement reçu | Statut validé par le module paiement / PSP. |
| Livraison | Événements du transporteur / delivery existant + preuves admises. |
| Prix des marchandises | Commande native SUGU et modifications consenties. |
| Commission marketplace | Moteur commercial existant, au taux réellement applicable au vendeur. |
| Affectation / participation Lanaya | Domaine Lanaya, avec historique horodaté. |
| Honoraires négociés | Accord Lanaya signé numériquement / enregistré par Ops et accepté par vendeur. |
| Badge | Décision de confiance Lanaya, **jamais** l'abonnement seul. |
| Solde payable et paiement réalisé | Ledger des rémunérations + confirmation système de paiement autorisé. |

## 4.3 Contrats d'intégration

Lanaya doit **lire** les événements natifs (commande créée, payée, préparée, expédiée, livrée, contestée, remboursée, annulée). Il doit demander aux modules concernés les actions autorisées via leurs interfaces métier existantes. Les intégrations doivent rester **idempotentes** : un événement PSP répété dix fois ne crée qu'une occurrence économique.

## 4.4 Frontend : quatre expériences, une seule gouvernance

- **SuguPro vendeur :** choisir / gérer des Lanabagas, consentir aux honoraires, comprendre les badges et l'activité.
- **Espace Lanabaga :** gérer portefeuille, opportunités, dossiers et commissions ; afficher sa carte.
- **Marketplace acheteur :** comprendre le badge et contacter / voir le Lanabaga dans un contexte autorisé.
- **SUGU Admin :** arbitrer rôles, négociations exceptionnelles, conformité, scoring, paiement, badges, conflits et pays.

Une interface mobile éventuelle consomme les **mêmes règles serveur**. Aucune validation critique ne dépend exclusivement d'un bouton frontend.

# 5. Acteurs, capacités et restrictions [CORE]

**Acteurs reconnus :** visiteur, acheteur, vendeur, gestionnaire vendeur, Lanabaga débutant, Lanabaga vérifié, agent SUGU Ops, Risk/Compliance, Finance, Super Admin, transporteur, prestataire financier ; certains comptes peuvent cumuler plusieurs rôles mais les conflits d'intérêts sont traités séparément.

| Action métier | Vendeur | Lanabaga | Ops | Risk | Finance |
|---|---|---|---|---|---|
| Inviter / demander un Lanabaga | Oui | Proposer une candidature vendeur | Superviser | Voir si nécessaire | Non |
| Accepter son affectation | Oui | Accepter la mission | Valider exception | Contrôler conflit | Non |
| Lire commandes couvertes | Ses commandes | Uniquement périmètre affecté | Oui selon mission | Oui selon mission | Données financières pertinentes |
| Participer au chat d'une commande | Oui | Oui si mission active et visibilité autorisée | Modération | Audit limité | Non |
| Proposer honoraires négociés | Examiner / accepter / refuser | Proposer | Valider exception | Réviser risque | Voir état |
| Modifier honoraires acceptés | Non, pas unilatéralement | Non, pas unilatéralement | Correction encadrée | Enquêter | Exécuter ajustement autorisé |
| Apporter preuves / relancer | Oui | Oui | Oui | Lecture / revue | Non |
| Révoquer badge ou suspendre | Demander examen | Non | Selon privilège | Oui, avec motif | Non |
| Valider / libérer des fonds | Non (hors actions vendeurs normales) | **Jamais** | **Jamais seul** | Non | Seulement workflow autorisé + PSP |
| Changer compte de payout vendeur | Protocole KYC dédié | **Jamais** | Contrôle séparé | Vérification | Double contrôle |
| Forcer commission / remboursement | Non | Non | Demande justifiée | Contrôle | Ajustement autorisé / rapprochement |
| Modifier paramètres financiers | Non | Non | Proposition | Avis risque | Gestion habilitée + approbation |

Chaque autorisation combine **rôle + périmètre vendeur / commande + état de l'objet + pays + statut de conformité + conflit d'intérêts + montant**. Un rôle global “Lanabaga” ne donne pas le droit de lire toutes les commandes des vendeurs du pays.

**Interdictions structurelles :** pas de délégation d'accès, pas d'accès aux secrets/OTP, pas de modification de bénéficiaire, pas de suppression des preuves, pas de publication non autorisée des identités, pas de manipulation de score ni d'attribution automatique de badge via achat.

# 6. Vie du compte Lanabaga [P0]

## 6.1 États

**Candidat → Pré-vérification → En revue → Admis sans badge → Actif → Vérifié (badge obtenu) → Sous surveillance / Suspendu → Réactivé ou Clôturé.**

Distinguer en base :
- **état du compte** (actif / suspendu / fermé) ;
- **niveau de vérification d'identité** ;
- **statut du badge public** ;
- **statut de la convention** ;
- **plan d'abonnement** ;
- **capacité autorisée Quality Gate**.

Le badge n'est pas un état qui remplace celui du compte.

## 6.2 Données et onboarding

Identité, téléphone et courriel vérifiés, pays / ville, spécialités, filières, zones connues, références commerciales, structure représentée, conflits d'intérêts déclarés, justificatifs requis, parcours de formation, convention pilote et annexe rémunération, compte de règlement à son nom / à celui de sa structure validée, consentements et date/version des politiques.

La vérification doit être **proportionnée au pays et au risque**, avec accès restreint aux documents. Rien n'exige la collecte d'une donnée non indispensable au stade concerné.

## 6.3 Admission et premiers droits

- Un **compte approuvé peut commencer sans badge**.
- Un compte non approuvé n'accède jamais à des commandes réelles.
- L'admission n'accorde ni vendeur garanti, ni revenu garanti, ni exclusivité régionale.
- Les droits sont immédiatement suspendus si convention expirée/non valide, incident critique, contrôle réglementaire manquant ou compte désactivé.
- Un Lanabaga n'est jamais affecté automatiquement à un vendeur uniquement parce qu'il l'a invité : le vendeur et SUGU doivent accepter le lien.

## 6.4 Convention pilote et renouvellements

Conserver référence de convention, version, date de signature, entité SUGU signataire, Lanabaga, territoire, catégories, quota contractuel, Quality Gate initial, seuils dérogatoires, période de sécurité commission, fréquence de paiement et statut de validité. La convention v1.1 prévoit **six mois de pilote et un préavis de principe de quinze jours**, sous réserve du droit applicable ; aucune UI ne doit présenter cela comme une faculté de résiliation automatique ignorant les règles impératives.

# 7. Lanaya comme moteur d'acquisition vendeur [P0]

## 7.1 Stratégie opérationnelle

Pour Burkina / Mali / Niger, SUGU identifie d'abord des **Lanabagas influents et réellement connectés aux importateurs, fabricants, distributeurs et super-grossistes**. Exemples de profils : transitaire expérimenté, acteur import-export, ancien responsable distribution, intermédiaire B2B connu, professionnel d'une filière de gros. Les recherches Web, appels ou annuaires servent à qualifier ces candidats ; la prospection vendeurs est ensuite portée **principalement par leur réseau réel**. Ne pas éliminer les recrutements vendeurs directs ou inbound : ils restent possibles et mesurés comme canal de comparaison.

## 7.2 Entonnoir vendeur

**Lanabaga recrute / recommande → vendeur reçoit une invitation sécurisée → vendeur s'inscrit ou relie son compte existant → KYC/KYB vendeur normal → consentement d'affectation → catalogue / stock / capacités vérifiés → première offre activée → premières commandes suivies → qualification Lanaya progressive.**

## 7.3 Attribution marketing versus droit économique

**Ne pas confondre :**

- **Source d'acquisition vendeur** : qui a introduit le vendeur sur SUGU ; conserver l'historique à des fins de reporting.
- **Affectation active** : qui accompagne aujourd'hui ce vendeur ou ces produits.
- **Participation à la commande** : qui a effectivement contribué à cette commande.
- **Droit à commission** : qui remplit les conditions financières sur la commande figée.

Avoir introduit un vendeur **ne suffit pas** pour percevoir à vie ses commissions. En V1, aucun bonus séparé de recrutement n'est créé sans avenant tarifaire validé.

## 7.4 Règles anti-captation

Un vendeur ne devient jamais “propriété” du Lanabaga. Les vendeurs peuvent refuser/changer l'affectation. Un même vendeur ne doit pas être multiplié pour gonfler les quotas. Toute recommandation payante fictive, faux prospect, auto-inscription ou inscription forcée doit pouvoir être signalée et contrôlée.

## 7.5 Tableaux commerciaux

Mesurer : candidats Lanabaga identifiés → admissibles → admis → actifs ; vendeurs présentés → inscrits → vérifiés → avec catalogue exploitable → avec commande effective ; coût d'acquisition **par vendeur actif** ; délai de première vente ; commandes récurrentes ; concentration par Lanabaga ; fraude ; comparaison au canal direct.

# 8. Abonnements et capacité : deux produits, une logique [CORE]

## 8.1 Vendeur

- **Plan vendeur standard : 1 Lanabaga principal gratuit**, couvrant par défaut **tous les produits de la boutique**. Le vendeur peut choisir son Lanabaga parmi les candidats disponibles ou en demander un ; l'affectation n'est effective qu'après consentement et contrôles.
- **SuguPro Plus : plusieurs Lanabagas simultanés**, avec affectations par catégorie ou produit. Ces droits doivent être intégrés au système **d'abonnements SuguPro existant** [AUDIT] et peuvent être associés à d'autres fonctionnalités premium indépendantes de Lanaya.
- Le vendeur n'achète **jamais** le badge. Le badge n'apparaît que si les exigences de réputation sont satisfaites.
- Une boutique sans Lanabaga n'est pas bloquée de vente sauf autre règle marketplace déjà en vigueur.

## 8.2 Lanabaga

- **Standard : 0 à 5 vendeurs actifs**, gratuitement, sous réserve de ses contrôles.
- **Lanabaga Pro Plus : éligible à plus de 5 vendeurs**. Le plafond exact (par exemple 20 pour un plan donné) est **[CONFIG][À VALIDER]**, pas une obligation technique immuable.
- La capacité réelle = **minimum entre capacité du plan, capacité autorisée Quality Gate, capacité opérationnelle pays et éventuelles restrictions individuelles**.
- **Payer Pro Plus ne suffit jamais à obtenir plus de vendeurs si le Quality Gate est fermé.**
- Les conditions, prix, factures et dates d'effet du plan Lanabaga doivent être définies par Finance/Product ; aucune valeur de prix n'est inventée ici.

## 8.3 Unité de décompte des quotas

Un vendeur actif compte **une fois par Lanabaga**, même si ce Lanabaga couvre plusieurs catégories ou produits du vendeur. Les affectations terminées ne comptent plus pour les nouveaux quotas, mais demeurent dans l'historique et les commandes snapshotées. Les vendeurs non validés / invitations en attente ne comptent pas comme vendeurs actifs ; toutefois un système anti-abus doit limiter les invitations et réservations ouvertes.

## 8.4 Upgrade, downgrade, non-paiement

- **Upgrade** : nouvel entitlement pris en compte après confirmation de l'abonnement et contrôle Quality Gate ; aucune affectation automatique.
- **Downgrade vendeur vers 1 Lanabaga** : avertir ; faire choisir le principal conservé ; fixer une date d'effet ; retirer de nouvelles attributions à l'excédent ; traiter les commandes **déjà verrouillées** selon leurs snapshots.
- **Downgrade Lanabaga >5 vers Standard** : bloquer nouvelles affectations ; organiser une réduction contrôlée du portefeuille ; **ne jamais réassigner silencieusement une commande en cours**.
- **Retard de paiement / suspension** : appliquer la politique d'entitlement, notification, période de grâce si prévue [CONFIG] et repli déterministe.
- **Facturation premium indépendante du badge** : un badge perdu ne supprime pas de lui-même l'abonnement ; une sous-performance peut cependant limiter les droits opérationnels.

# 9. Affectation boutique, catégorie et produit [CORE][P0]

## 9.1 Définition d'une affectation

Chaque relation indique : vendeur, Lanabaga, niveau (`boutique`, `catégorie`, `produit` ou `offre/variante` si réellement nécessaire), objet natif ciblé, acteur proposant, acteur consentant, statut, dates d'effet, pays/territoire, raison de fin, version d'autorisation et audit.

**États :** proposée → en attente vendeur / Lanabaga → en revue SUGU si exigé → active → suspendue → terminée / refusée / expirée.

## 9.2 Résolution de couverture

Pour une **ligne de commande**, appliquer exactement :

1. Affectation **produit/offre** active et valide au moment du verrouillage, si le plan vendeur la permet ;
2. sinon affectation de **catégorie** active et valide ;
3. sinon **Lanabaga principal** actif de la boutique ;
4. sinon **aucun Lanabaga**.

Si le catalogue contient une hiérarchie de catégories, la catégorie la plus spécifique prévaut ; la profondeur et les règles de conflit sont déterminées à partir du vrai schéma SUGU [AUDIT]. En cas de plusieurs affectations de même priorité, **refuser l'activation de la deuxième couverture contradictoire** et demander arbitrage. Ne jamais sélectionner aléatoirement.

## 9.3 Contrainte d'unicité

Un produit peut avoir **un seul Lanabaga responsable opérationnel à un instant donné** dans la V1. Plusieurs Lanabagas peuvent accompagner **des produits distincts** d'un même vendeur. Un co-accompagnement exceptionnel peut être visible dans le dossier, mais **ne doit pas entraîner une double commission** ; toute répartition multi-Lanabaga est [P2] et nécessite règle et consentement additionnels.

## 9.4 Consentement et changements

- Vendeur et Lanabaga acceptent explicitement la collaboration ; SUGU peut refuser pour conflit, pays, plan, capacité ou contrôle.
- En cas de transfert, fermer l'affectation actuelle puis activer la nouvelle à la date fixée ; conserver les preuves et le motif.
- **Pas d'effet rétroactif** sur commandes verrouillées. Les commandes en cours restent assignées au Lanabaga snapshoté sauf procédure de transfert explicite, auditée, avec conséquences financières décidées par Ops selon les accords.
- À la suppression d'un produit / changement de catégorie, préserver l'historique ; aucune suppression en cascade des commissions, preuves ou snapshots.

## 9.5 Concurrence et capacité

Le même vendeur peut appartenir à plusieurs portefeuilles Lanabaga si SuguPro Plus le permet ; il compte une fois dans la capacité de chacun. Un seul Lanabaga est responsable d'une ligne déterminée. Les conflits d'intérêts doivent être contrôlés avant l'affectation (Lanabaga lié au vendeur, acheteur ou transporteur, relation financière non déclarée).

# 10. Commandes multi-produits, multi-vendeurs : unité économique [CORE]

## 10.1 Unité de transaction

Ne jamais décider Standard/Négocié sur le **panier total acheteur** si celui-ci inclut plusieurs vendeurs. La base du seuil est la **sous-commande / ensemble de lignes d'un seul vendeur** correspondant à l'unité commerciale réelle sur laquelle SUGU calcule ses commissions, sous réserve de l'audit du modèle Orders.

**Exemple :** panier 7 M FCFA : 4 M vendeur A + 3 M vendeur B ⇒ **deux régimes Standard** si chaque sous-commande vendeur est inférieure au seuil de 5 M ; pas de passage artificiel au Négocié pour l'ensemble du panier.

## 10.2 Plusieurs Lanabagas dans une même sous-commande vendeur

Un vendeur SuguPro Plus a Lanabaga A pour les téléphones et B pour les ordinateurs. Une commande de ce vendeur contient deux lignes concernées. **Le contexte financier est évalué au niveau de la sous-commande vendeur ; la rémunération est attribuée au niveau des lignes couvertes et de leur responsable snapshoté.**

- **Régime Standard :** calculer la commission marketplace **réellement acquise par ligne**, puis partager sa quote-part Lanaya uniquement avec le Lanabaga éligible de cette ligne ; reconstituer le total vendeur sans double paiement.
- **Régime Négocié :** toute proposition doit expliciter les **lignes / lots couverts**, le montant / pourcentage applicable à chaque lot, et le **plafond total d'honoraires Lanaya** accepté par le vendeur. Aucun Lanabaga ne propose des honoraires sur les lignes confiées à un autre sans acceptation et dérogation formalisée.
- Si le moteur natif n'a pas de ventilation fiable des commissions marketplace par ligne, traiter l'intégration comme un **blocage technique** à résoudre avant l'automatisation, plutôt que répartir arbitrairement.

## 10.3 Promotions, taxes, variation de panier

Remises et coupons doivent être affectés aux lignes selon la politique des commandes existantes, puis appliqués **avant** la base Lanaya ; frais de livraison et taxes/prélèvements tiers hors VCL. Les arrondis sont déterministes et le reliquat affecté à une ligne selon une règle stable documentée. Si une ligne est annulée : réviser les montants éligibles sans modifier le snapshot historique initial ; créer des événements d'ajustement.

## 10.4 Anti-fractionnement

La division de 8 M en deux sous-commandes 4 M au même vendeur pour éviter le Régime Négocié doit être détectable. Au pilote, signaler **commandes rapprochées du même groupe acheteur-vendeur** avec objets / expédition communs ; revue Ops **sans présomption automatique de fraude ni fusion abusive**. La règle de regroupement et ses exceptions seront calibrées par pays et secteur [P1].

---
# 11. Cycle de vie d'une transaction Lanaya [CORE][P0]

## 11.1 États métier à conserver séparément

Une commande SUGU possède déjà son cycle de vie natif ; **Lanaya n'invente pas un second statut “livrée” contradictoire**. Il maintient des états spécifiques, qui observent l'état natif et pilotent les autorisations.

| Sous-processus | États recommandés |
|---|---|
| Affectation sur commande | aucune → provisoire → figée → transférée par exception / terminée |
| Couverture | non couverte → accompagnement ouvert → active → terminée / suspendue |
| Honoraires | non requis → brouillon → proposés → acceptés / refusés / expirés → verrouillés |
| Participation | non commencée → en cours → soumise → qualifiée / refusée / en revue |
| Commission | non calculable → estimée → en attente → acquise → payable → payée / retenue / annulée / reprise |
| Litige | aucun → signalement → en instruction → résolu / escaladé |
| Confiance | non qualifié → éligible → badgé → sous revue / suspendu / expiré |

Les états doivent être **orthogonaux** : une commande peut être `livrée` alors que ses honoraires sont `retenus` à cause d'un litige ; un Lanabaga peut être `actif sans badge` tout en ayant une participation qualifiée sur une commande.

## 11.2 Parcours cible détaillé

**T0 — Recherche / panier.** Le moteur identifie les affectations en vigueur **sans exposer de détails internes**. Une présence Lanabaga peut être montrée comme information contextuelle mais ne devient pas une promesse de protection financière.

**T1 — Création de la commande.** Ventiler les lignes par vendeur ; déterminer une attribution **provisoire** par ligne ; calculer base VCL, commission marketplace estimée et régime provisoire ; prévenir les parties des informations encore modifiables.

**T2 — Acceptation / négociation vendeur.** Les quantités, prix, remises, délais et frais transport sont stabilisés selon le flux Orders. Toute modification matérielle conduit au recalcul de la VCL et à la réévaluation du régime avant paiement.

**T3 — Commission Lanaya.** Si Standard : afficher la participation potentielle au Lanabaga et sa quote-part estimée ; aucune nouvelle somme n'est facturée au vendeur. Si Négocié : exiger la proposition de chaque Lanabaga concerné, l'acceptation expresse du vendeur et le contrôle des fourchettes avant toute autorisation de paiement.

**T4 — Verrouillage.** Créer l'**instantané définitif** des lignes, affectations, base de calcul, règle commerciale, version de politique, méthode de commission, consentement vendeur et instructions de règlement. Après T4, modification substantielle ⇒ **nouvelle version d'accord et nouvelle confirmation**, pas modification silencieuse.

**T5 — Paiement.** Le PSP/module paiement existant confirme par événement signé/validé. Pour le Négocié, le module ne permet pas la finalisation payante tant qu'il manque l'accord vendeur sur les honoraires ; pas de déduction financière sur simple consentement Lanabaga.

**T6 — Préparation / enlèvement.** Le Lanabaga peut relancer, coordonner et documenter les preuves ; il ne simule pas une confirmation transporteur.

**T7 — Livraison.** Le module logistique fournit la preuve (OTP, signature, POD ou procédé compatible existant). Les éléments contestés passent en dossier litige.

**T8 — Inspection / contestation.** Période définie par catégorie/accord et canal de paiement ; ne pas la présumer uniforme pour une machine industrielle et des marchandises courantes. Les litiges ou chargebacks suspendent le passage `payable` selon règles applicables.

**T9 — Validation de mission.** Evaluer `Participation qualifiée` à partir des actions et justificatifs. Au pilote, une validation Ops peut être nécessaire ; les décisions motivées sont auditables.

**T10 — Acquisition.** Le service Finance Lanaya produit l'événement `commission acquise` **uniquement** lorsque la transaction et la mission satisfont toutes les conditions contractuelles ; elle peut ensuite devenir payable après la période de sécurité définie en Annexe A.

**T11 — Règlement.** Paiement via partenaire habilité, export de paiement approuvé ou interface financière native autorisée, puis rapprochement sur référence externe et quittancement. Une demande de payout créée n'est **pas** un paiement réalisé.

**T12 — Rétroaction / réputation.** Commande effective prise en compte **une seule fois** dans les métriques de badge et score, avec correction possible en cas d'événement ultérieur (remboursement, fraude prouvée, litige réouvert).

## 11.3 Règle de blocage du checkout

En mode Négocié, le système doit clairement indiquer **qui attend qui** : `Lanabaga doit proposer` / `Vendeur doit accepter` / `Ops doit approuver exception`. Tant que le montant est non validé, le client ne doit pas être placé dans un flux de paiement irréversible au titre de cette version de commande. Pour les commandes **partiellement prépayées**, le périmètre d'activation doit être validé avec le module paiement [AUDIT] ; à défaut, la fonctionnalité Lanaya négociée reste inactive sur ce mode de paiement.

## 11.4 Reprise après interruption

Si navigateur, session, queue ou PSP échoue : relire l'état serveur, reprendre au dernier état validé, ne jamais dupliquer accord, commission, mission, remboursement ou instruction de payout. Les opérations longues doivent être **rejouables sans double effet financier**.

# 12. Rémunération : spécification financière normative [CORE]

## 12.1 Paramètres initiaux du pilote Burkina Faso [CONFIG]

| Paramètre | Valeur pilote | Nature |
|---|---:|---|
| Seuil du régime Négocié | **5 000 000 FCFA** | [CONFIG] |
| Sous le seuil | **Standard** | [CORE] |
| À partir du seuil, seuil compris | **Négocié** | [CORE] |
| Quote-part Standard Lanabaga | **20 %** de la commission marketplace SUGU réellement acquise | [CONFIG] contractuel |
| Frais plateforme sur honoraires négociés | **5 %** des honoraires Lanabaga bruts | [CONFIG] contractuel |
| Minimum en Négocié | **25 000 FCFA recommandé**, non automatiquement exigé hors politique approuvée | [HYPOTHÈSE] |
| Mode hors seuil | Exception pour mission complexe sous 5 M validée par Ops avant accord | [CORE] |
| Plafond monétaire plan Lanabaga Pro Plus | À fixer par offre | [À VALIDER] |
| Délai de sécurité et fréquence de payout | **Annexe A propre au Lanabaga**, non valeur universelle | [À VALIDER par contrat] |

**N. B. :** les 5 % de la commission marketplace SUGU utilisés dans des exemples ne constituent **pas** un tarif universel : le taux dépend du contrat vendeur existant. Le seuil est défini sur la VCL et non sur le total TTC, ni sur le total livraison comprise.

## 12.2 Régime Standard — moins de 5 M

**Règle :** commission brute Lanabaga = **20 % × commission marketplace SUGU effectivement acquise sur les lignes couvertes et qualifiées**. Le coût est supporté **par la marge de commission SUGU**, sans supplément d'honoraires Lanaya au vendeur.

**Exemple A :** VCL = 1 000 000 FCFA ; commission marketplace 5 % = 50 000 ; Lanabaga 20 % × 50 000 = **10 000** ; SUGU conserve **40 000** avant autres coûts, frais et taxes.

**Exemple B :** VCL = 1 000 000 ; commission marketplace contractuelle 3 % = 30 000 ; Lanabaga = **6 000** ; SUGU conserve **24 000**. Le Lanabaga ne reçoit pas automatiquement 1 % de la vente si le taux marketplace est différent de 5 %.

**Si commission marketplace réellement acquise = 0**, commission Standard = 0, sauf accord indépendant explicite validé avant verrouillage. Une commission théorique non encaissée ne constitue pas une assiette acquise.

## 12.3 Régime Négocié — à partir de 5 M

**Règle :** la commission marketplace du vendeur à SUGU demeure due selon son contrat ; le Lanabaga négocie **ses propres honoraires** avec le vendeur et les déclare dans SUGU. Le vendeur les accepte **avant paiement ou verrouillage financier autorisé**. SUGU prélève **5 % des honoraires Lanabaga bruts** pour ses services Lanaya. Le Lanabaga reçoit le reliquat avant taxes/retenues légalement applicables.

**Exemple C :** VCL 20 000 000 ; commission marketplace SUGU 5 % = 1 000 000 ; honoraires Lanabaga négociés et acceptés 250 000 ; frais SUGU sur honoraires Lanabaga 12 500 ; net Lanabaga avant taxes éventuelles **237 500**. Contribution SUGU brute totale sur cette transaction **1 012 500** (commission marketplace + frais Lanaya), **hors coûts, fiscalité, remboursements et taxes éventuelles** ; montant marchand avant ajustements **18 750 000** si le cadre de règlement permet les deux retenues et qu'il n'existe aucun autre frais.

**Ne jamais :** déduire deux fois les 5 %, ajouter les honoraires au montant acheteur sans règle de tarification expressément acceptée, ou prélever sur le vendeur un honoraire qu'il n'a pas accepté.

## 12.4 Fourchettes pilotes — proposées, pas garanties économiques

| VCL d'une sous-commande vendeur | Honoraires Lanabaga conseillés | Montant fixe |
|---|---|---|
| **5 M à <10 M** | 0,5 % à 1,5 % | Autorisé |
| **10 M à <25 M** | 0,4 % à 1,25 % | Autorisé |
| **25 M à <50 M** | 0,3 % à 1,0 % | Autorisé |
| **50 M à <100 M** | 0,2 % à 0,75 % | Autorisé |
| **≥100 M** | 0,1 % à 0,5 % | Recommandé |

Le backend différencie : **plage recommandée** (aide à la négociation), **limites d'acceptation automatique** (bloquantes si approuvées dans la politique), **plafond de risque** (déclencheur de validation supérieure). Une proposition hors plage ne peut pas contourner Ops par simple soumission répétée. Les limites exactes à rendre bloquantes sont **[À VALIDER Product/Finance/Legal]**.

## 12.5 Autorisation de déduction

Une convention entre SUGU et le Lanabaga **ne permet pas à elle seule de débiter un vendeur**. Une autorisation vendeur **spécifique à la commande** doit être créée, signée/acceptée et liée à sa référence. Elle précise : bénéficiaire, montant brut, motif, date, frais plateforme retenus sur le brut Lanabaga, base de calcul, version du prix et conditions d'annulation. L'exécution de l'instruction appartient à la chaîne **Finance + PSP / établissement autorisé** et dépend de la capacité technique et réglementaire confirmée du prestataire.

## 12.6 Que faire si le PSP ne sait pas faire un split ? [AUDIT][LEGAL GATE]

**Ne pas inventer un wallet SUGU de substitution.** Étudier trois voies, par ordre : (A) fonctionnalité native du PSP habilité avec instructions vendeur/plateforme/partenaire ; (B) facturation et règlement séparés sur comptes autorisés avec justificatifs et réconciliation ; (C) traitement manuel contrôlé par Finance, uniquement si juridiquement validé. La faisabilité doit être écrite par le PSP et Finance/Legal avant activation du régime Négocié. **Pas de lancement “automatique” au seul motif que le calcul mathématique fonctionne.**

# 13. Négociation des honoraires : protocole et preuve de consentement [P0]

## 13.1 Objet « proposition d'honoraires »

Contient au minimum : commande/sous-commande, lignes couvertes, Lanabaga, vendeur, devise, base VCL gelable, mode fixe/pourcentage, taux ou montant brut, arrondi, montant final brut, frais SUGU sur honoraires, net prévisionnel Lanabaga, montant estimé vendeur, date limite, politique applicable, statut, auteur et historique des révisions.

## 13.2 Transitions autorisées

**Brouillon Lanabaga → Soumise → En examen Ops si hors politique → Présentée au vendeur → Acceptée / Refusée / Expirée → Verrouillée → Exécutée / Ajustée par avenant.**

- Un vendeur refusant une proposition doit pouvoir **demander une autre proposition**, changer de Lanabaga selon les règles, ou décider de ne pas bénéficier de Lanaya si la transaction native le permet.
- Après acceptation, toute augmentation exige une **nouvelle proposition + un nouveau consentement** avant paiement. Une baisse/renonciation ultérieure peut suivre un parcours simplifié mais doit rester prouvable ; **aucun changement silencieux**.
- Les propositions expirées ne peuvent pas être réactivées automatiquement si le montant, le périmètre ou la politique a changé.
- Aucun Lanabaga ne peut approuver sa propre proposition en utilisant un deuxième rôle vendeur lié.

## 13.3 Formulation explicite du consentement

L'interface doit afficher distinctement : « Honoraires de mon Lanabaga », « Commission de vente SUGU selon les conditions applicables », « Total des retenues connues », « Montant vendeur estimé » et, si applicable, « ce calcul reste sujet à taxes, frais ou ajustements indiqués ». Le vendeur doit accomplir une **action positive**, avec preuve d'identité/session/horodatage/version. Aucun accord tacite par simple visite, case pré-cochée ou message oral non confirmé.

## 13.4 Prix / panier qui change après l'accord

- **Avant paiement :** variation de prix, quantité, remise ou lot ⇒ recalcul, détermination du nouveau régime, annulation logique de l'accord précédent si sa base change, nouvelle confirmation vendeur.
- **Après paiement :** opérations de retour, remise exceptionnelle ou ajustement suivent le module Orders existant avec **avenant traçable et correction compensatoire** ; jamais écrasement de l'accord initial.
- **Changement de seuil :** un panier passant de 4,9 M à 5,1 M passe en Négocié et ne peut pas payer avant négociation validée. À l'inverse, si 5,1 M devient 4,9 M, recalculer le régime et présenter le nouveau cadre avant verrouillage.

# 14. Comptabilité Lanaya, sous-registre et rapprochements [CORE]

## 14.1 Aucune confusion entre quatre montants

Il faut conserver séparément :

1. **GMV/VCL produits** réellement éligible ;
2. **Commission marketplace SUGU brute / effectivement acquise** ;
3. **Honoraires Lanabaga bruts** et éventuel **frais Lanaya de 5 %** sur ces honoraires dans le Négocié ;
4. **Montant net payable Lanabaga**, après retenues fiscales, remboursements, compensations et paiements déjà effectués.

Le tableau de bord doit afficher clairement brut, frais, retenues, acquis, payable et payé ; il ne doit pas appeler « gagné » un montant encore simplement estimé.

## 14.2 Grand livre logique des rémunérations

Conserver des **écritures immuables d'obligation et d'ajustement**, pas un champ `balance` constamment réécrit sans trace. Types : estimation, acquisition, retenue, libération de retenue, correction d'arrondi, annulation, restitution/chargeback, paiement initié, confirmation de paiement, échec de payout, remboursement du trop-perçu, ajustement fiscal. Chaque écriture référence une **raison**, un acteur / événement source et une version de règle.

La comptabilité générale reste celle de SUGU et de son prestataire ; ce sous-registre n'est **pas** un portefeuille monétaire ouvert aux utilisateurs.

## 14.3 Idempotence et cohérence

Un même événement de livraison, PSP, remboursement ou demande de paiement possède une **clé métier unique**. Deux jobs concurrents ne peuvent pas acquérir une commission deux fois. Pour les opérations impliquant un système externe, enregistrer l'intention et l'identifiant de référence, puis constater l'état confirmé. Une timeout réseau n'est pas une preuve d'échec et ne justifie pas un nouveau payout aveugle.

## 14.4 Rapprochements

À fréquence définie par Finance : ventes confirmées ↔ commission marketplace effectivement acquise ↔ commissions Lanaya acquises ↔ revenus/frais SUGU ↔ règlements vendeur ↔ règlements Lanabaga ↔ remboursements et chargebacks. Exporter anomalies : **paiement enregistré sans banque/PSP confirmé**, double référence, débit vendeur sans consentement, compte de règlement tiers, net négatif, remboursement après payout.

## 14.5 Retenues et fiscalité

Taxes facturées, TVA éventuelle, retenues à la source, facturation de prestations indépendantes et documents fiscaux doivent être spécifiés par Finance/Legal pour chaque pays **avant activation du paiement automatique**. Le calcul commercial Lanaya ne constitue pas une détermination fiscale. Chaque valeur est stockée en **unité monétaire entière (FCFA pour XOF)** ou précision appropriée à la devise, avec règle d'arrondi contrôlée ; aucune manipulation financière en flottants non maîtrisés.

# 15. Participation qualifiée et acquisition de rémunération [CORE][P0]

## 15.1 Problème

La simple présence d'un Lanabaga sur la fiche vendeur **ne lui confère pas automatiquement une commission**. Il doit avoir un rôle réel, documenté et lié à l'exécution de la commande. Cette distinction vient directement de la convention pilote.

## 15.2 Actions pouvant constituer des preuves

- Onboarding vendeur effectivement accompagné et pertinent à la transaction.
- Mise en relation acheteur-vendeur vérifiable.
- Suivi de disponibilité / confirmation de stock, négociation commerciale facilitée sans engager le vendeur.
- Relance utile et horodatée, résolution d'un blocage documentaire.
- Organisation d'un pickup via module transport autorisé ; transmission de preuve fiable.
- Suivi du transport, gestion d'exception ou information acheteur-vendeur.
- Appui dans un litige par dépôt de preuves non manipulées.

Une action purement automatique (ouvrir une page, se connecter, envoyer un message vide) **ne suffit pas seule**. Une mission peut être de nature différente selon catégorie et valeur. Les contrôles ne doivent pas imposer artificiellement un volume de messages si l'accompagnement a réellement eu lieu en une visite ou un appel confirmé.

## 15.3 Décision pilote

**Incomplète / preuves disponibles / qualifiée / contestée / rejetée.** Une action administrative Ops peut accorder ou refuser la qualification avec preuve, motif codifié et note accessible au Lanabaga dans les limites de sécurité. Pour réduire le conflit d'intérêts, la personne qui approuve un paiement élevé ne doit pas être le seul validateur de la mission et de l'identité.

## 15.4 Réclamation Lanabaga

Un Lanabaga peut contester une commission non acquise selon un délai [CONFIG][À VALIDER]. La contestation enregistre les preuves et l'auteur ; elle est examinée par Ops/Risk, avec journal de décisions. Pas de suppression arbitraire des droits acquis ni de pénalité automatique sur simple signalement.

## 15.5 Ajustements après paiement

Annulation totale avant bonne exécution ⇒ aucune nouvelle commission acquise ; remboursement partiel ⇒ ajustement proportionnel **si cette règle est contractuellement applicable** ; chargeback/fraude constatée ⇒ retenue, reprise ou procédure de récupération documentée. L'interprétation de « commission acquise » et des retenues requiert une configuration alignée sur la convention et les textes impératifs.

# 16. Scoring du Lanabaga : deux couches distinctes [P0/P1]

## 16.1 La règle de conception fondamentale

**Hard gates d'éligibilité ≠ score de performance ≠ permission commerciale.** Un score élevé ne rattrape jamais un KYC invalide, une suspension critique ou une fraude avérée ; un abonnement payé ne rattrape pas un mauvais Quality Gate.

## 16.2 Hard gates pilote pour le badge [P0][HYPOTHÈSE]

1. Compte Lanabaga actif, identité et convention valides.
2. Formation et engagement de conduite validés.
3. **Au moins 5 commandes effectives réellement accompagnées** par ce Lanabaga, cumulées selon les règles de réputation ; pas cinq simples commandes créées.
4. Aucun incident critique bloquant actif et aucun conflit d'intérêts dissimulé établi.
5. Diversité et indépendance économique des acheteurs appréciées **en fonction du profil B2B** : proposition pilote **deux acheteurs indépendants vérifiables** ; **une activité B2B concentrée mais légitime peut être admise après revue motivée Ops/Risk**, sans faux deuxième acheteur.
6. Qualité suffisante et avis Risk/Ops ; la valeur numérique exacte du score est **shadow au pilote**, sauf décision expresse basée sur de vraies données.

Le système compte **une transaction économique indépendante** et non une multiplication artificielle de lignes, fractionnements ou comptes. Les commandes du même vendeur et de l'acheteur liées à un seul besoin commercial peuvent être regroupées après revue, non par heuristique aveugle.

## 16.3 Profil transactionnel B2B (et autres cas)

Prévoir un **profil commercial** (`retail`, `wholesale_b2b`, `mixed`, `industrial`) sur le vendeur, avec possibilité de précision selon catégorie/offre, déterminé/confirmé lors du KYB et contrôlable. Son utilisation pour la réputation doit reposer sur les **caractéristiques réelles des transactions**, pas uniquement sur une déclaration libre utilisée pour contourner les seuils. En B2B, la **qualité de l'indépendance acheteur** est plus importante qu'un seuil de diversité arbitraire. Les grands clients récurrents ne constituent pas une anomalie à eux seuls.

## 16.4 Score numérique candidat — cible [P1][HYPOTHÈSE]

Un moteur configurable pourra produire un score 0–100 avec des **dimensions explicables** :

| Dimension proposée | Pondération de départ **non validée** | Exemples de mesures |
|---|---:|---|
| Exécution de commandes | 30 pts | commandes accompagnées effectivement clôturées, annulations imputables, reprises |
| Respect des délais / service | 20 pts | délai de première réponse utile, tâches non traitées, escalades justifiées |
| Gestion des incidents | 20 pts | litiges imputables, résolution documentée, répétition de manquements |
| Qualité et fiabilité des preuves | 15 pts | pièces complètes, authenticité confirmée, audit des étapes |
| Satisfaction contextualisée | 15 pts | retours acheteur et vendeur validés, contestations fondées |

**Important :** ces cinq poids sont une **hypothèse de conception**, pas une vérité statistique. Avant activation publique : comparer sur historiques réels, estimer leurs effets pervers et documenter une calibration. Les sanctions graves doivent être traitées en **gates indépendants**, pas masquées par une moyenne.

## 16.5 Règles statistiques

- Distinguer fenêtre récente (par exemple 90 jours **[HYPOTHÈSE]**) et historique long (par exemple 12 mois **[HYPOTHÈSE]**).
- Montrer le **nombre d'observations** par dimension et un indice de fiabilité. Ne pas afficher publiquement un score 92,7/100 fondé sur seulement cinq commandes.
- Utiliser un lissage du taux de réussite **seulement après calibration sur données** ; ne pas imposer aujourd'hui un a priori 80 % / 10 commandes sans justification empirique.
- Les facteurs comme un nombre faible de litiges ne doivent pas faire monter artificiellement le score des comptes inactifs.
- Pour le litige, `fault_party` est **validé par un humain au pilote** : vendeur, acheteur, Lanabaga, transporteur, plateforme, prestataire paiement, indéterminé ; pas d'auto-imputation.
- Toute variation de score conserve : version, date, inputs agrégés, raisons, incidents bloquants, valeur avant/après et acteur/algorithme déclencheur.

## 16.6 Quality Gate et capacité autorisée [P0]

États : **ouvert / surveillance / gel d'expansion / suspendu**, avec motifs, échéance de réévaluation et procédure de recours. La capacité exploitable pour le Lanabaga est distincte de son quota payé.

**Exemple :** Pro Plus contractuel à 20 vendeurs ; autorisation Quality Gate initiale 5 ⇒ seulement 5 actifs possibles. Après contrôle satisfaisant : 10, puis 15, puis 20 si les règles le permettent ; ces paliers sont **illustratifs**, non une règle tarifaire irrévocable.

Un Quality Gate fermé **ne retire pas mécaniquement les sommes acquises**. Il peut suspendre l'ajout de vendeurs, provoquer l'examen des missions actives ou entraîner une suspension motivée selon gravité et contrat.

# 17. Badges : logique d'affichage et moteur de confiance [CORE]

## 17.1 Quatre notions à ne pas fusionner

1. **Compte Lanabaga actif** : personne autorisée à travailler.
2. **Badge “Lanabaga vérifié”** : expérience/qualité et exigences satisfaites.
3. **Badge vendeur / produit “LANAYA”** : historique qualifiant et accompagnement actuel admissible.
4. **Information “transaction suivie par Lanaya”** : état de cette commande ; ne signifie **pas** une garantie, un escrow ni une couverture assurantielle.

## 17.2 Badge Lanabaga [P0]

Évaluation selon §16.2 ; publication seulement après décision du moteur/règle Ops, avec motif, auteur et date. Un Lanabaga peut perdre son badge tout en conservant un compte limité selon l'incident. Un badge expiré ou suspendu cesse d'être affiché partout (produits, profil, carte, conversation) sans supprimer l'historique des anciennes transactions.

## 17.3 Badge boutique et produit : cumul + preuve locale [P0/P1]

Pour qu'une boutique/produit affiche le badge complet **LANAYA**, exiger simultanément :

- vendeur actif, suffisamment vérifié et sans incident critique bloquant ;
- Lanabaga **actuellement responsable** du produit / catégorie / boutique, lui-même vérifié, actif et non suspendu ;
- historique cumulé de **commandes Lanaya effectives du vendeur**, potentiellement accompagnées par **plusieurs** Lanabagas ;
- historique pertinent sur **ce produit** ou sa catégorie ;
- qualité et absence de litige critique bloquant selon règle publiée ;
- pays et politique badge actifs, score / avis Risk conformes.

**Seuils de départ à tester : 10 commandes vendeur effectives et 3 commandes produit/catégorie effectives** **[HYPOTHÈSE][CONFIG]**, évoqués lors de la conception initiale. Ne pas les coder en dur ni présenter comme statistiquement calibrés.

## 17.4 Périmètre du cumul

- Les commandes effectives accompagnées par différents Lanabagas **du même vendeur** peuvent contribuer au seuil global boutique.
- Les preuves relatives à un produit restent liées **au produit/vendeur**, même après changement de Lanabaga.
- Le **Lanabaga actuellement affecté doit toutefois être admissible et vérifié** pour que le produit porte le badge à la date de consultation.
- Le fait que le vendeur ait vendu 100 sacs de riz ne qualifie **pas automatiquement** une machine industrielle nouvellement listée.
- Les historiques ne doivent pas suivre un produit copié d'un vendeur à un autre ni être transférés par simple duplication de fiche.

## 17.5 États et libellés publics

| Condition | Affichage permis | Libellé à proscrire |
|---|---|---|
| Lanabaga lié mais pas vérifié | “Accompagné par un Lanabaga” si information autorisée | “Garanti Lanaya” |
| Lanabaga vérifié, produit sans historique suffisant | “Accompagné par un Lanabaga vérifié” | Badge LANAYA complet |
| Produit et vendeur qualifiés | Badge **LANAYA** avec explication au clic | “Vendeur certifié financièrement” |
| Transaction avec vrai dispositif de paiement protégé contractuellement | Statut exact de ce dispositif, selon PSP et contrat | “Protection activée” par défaut sans mécanisme effectif |

Prévoir des messages accessibles sur **ce que le badge prouve**, **ce qu'il ne garantit pas**, le moment de sa dernière vérification et les raisons générales de suspension sans divulguer de données sensibles.

## 17.6 États techniques du badge

**Non éligible → Candidat → En revue → Accordé → Actif → Expiré / Suspendu / Révoqué → Réévaluation.** Les changements prennent effet sur toutes les surfaces via invalidation du cache / index de recherche. Les cartes produits en cache ne doivent pas continuer à afficher un badge retiré pendant une durée indéfinie ; fixer une politique d'expiration courte et testée.

## 17.7 Événements de recalcul

Commande effective, remboursement, nouveau litige, changement de Lanabaga, suspension, changement de plan/capacité impactant une relation, KYB expiré, revue Risk, mise à jour de politique et changement de catégorie/produit. Calcul asynchrone possible ; la décision de publication doit lire les **hard gates à jour**, et les cas sensibles peuvent forcer la révocation immédiate.

# 18. Carte SUGU Lanaya : identité terrain et vérification [P0/P1]

## 18.1 Finalité

Une **carte numérique d'identification professionnelle vérifiable**, complétée éventuellement par une carte physique. Elle sert à présenter un Lanabaga et à confirmer qu'il est bien connu du réseau SUGU au moment du contrôle ; **ce n'est ni un mandat de signature, ni une carte bancaire, ni une preuve d'assurance ou de droit d'encaissement**.

## 18.2 Informations publiques minimales

Photo validée si nécessaire, nom d'usage/professionnel autorisé, identifiant Lanabaga, pays/ville approximative, spécialités si consenties, statut de compte actuel, statut badge distinct, date de mise à jour et canal officiel de signalement. **Ne pas exposer** numéro de pièce d'identité, copie KYC, adresse privée, solde, taux de commission, vendeurs confidentiels ou téléphone personnel sans consentement explicite.

## 18.3 QR et page de validation

Le QR pointe vers une **ressource SUGU sécurisée** qui interroge le statut présent du compte ; **ne jamais encoder une attestation éternellement vraie**. La page affiche `Actif / Suspendu / Expiré / Non reconnu` et explique les pouvoirs **que le Lanabaga ne possède pas**. L'identifiant n'est pas une authentification ; la page ne permet ni payout ni opération administrative. Prévoir protection contre automatisation abusive et usurpation de QR.

## 18.4 Carte physique

Version, numéro d'édition, date éventuelle de péremption, remplacement en cas de perte, invalidation de la précédente, vérification QR et mentions neutres. Un Lanabaga peut avoir une carte physique **sans badge “vérifié”** ; le design ne doit pas afficher “vérifié” avant éligibilité. Les mockups existants sont des références graphiques, **pas** une preuve que les QR déjà dessinés sont reliés à un registre réel.

## 18.5 Parcours de vérification

Une personne scanne → voit la page officielle SUGU → statut **temps courant** → peut signaler une usurpation. En mode réseau dégradé, un QR enregistré ne doit jamais être présenté comme preuve définitive d'activité : afficher l'indisponibilité de vérification.

# 19. Risque, fraude, litiges, sanctions [CORE]

## 19.1 Signaux à analyser, non verdicts automatisés

- Même identité / appareil / moyen de paiement entre des comptes à rôles différents.
- Acheteur et vendeur liés économiquement sans divulgation.
- Commandes fractionnées ou rondes et répétées dans une fenêtre rapprochée.
- Multiplication de petites commandes sans livraison prouvée.
- Anomalies de prix, retours et remboursements systématiques.
- Proposition honoraires anormalement élevée ; modifications avant checkout répétées.
- Lanabaga touchant presque toutes les commandes sans preuves suffisantes.
- Changements de bénéficiaire de paiement, prélèvements externes non déclarés.
- Badge affiché par usurpation ou carte présentée après suspension.

**Localisation des faux positifs :** un téléphone partagé, une même IP mobile, une entreprise utilisant un compte de paiement commun, plusieurs employés d'un grossiste ou des connexions dans un marché sont des **signaux faibles** ; pas un blocage systématique sans corrélation avec d'autres preuves. En V1, privilégier journalisation et revue humaine plutôt qu'un fingerprinting intrusif déployé sans analyse de données.

## 19.2 Niveaux de réponse

1. **Observer** (indicateur seul) : garder trace, pas d'accusation.
2. **Demander preuve** : tâches supplémentaires sans blocage arbitraire.
3. **Mettre en revue** : suspendre le nouveau badge / le nouveau payout si justifié par politique.
4. **Bloquer une capacité ciblée** : nouvelle affectation, négociation, carte ou commission selon décision.
5. **Suspendre le compte** : incident critique motivé, notifications et procédure de recours.
6. **Résilier / déclarer** : selon contrats, constatations et droit applicable.

## 19.3 Séparation des tâches

La personne qui gère le Lanabaga commercialement ne doit pas être l'unique personne habilitée à **qualifier une fraude, effacer une pénalité et autoriser un payout sensible**. Toute opération critique possède auteur, justification, approbateur distinct lorsque seuil de risque atteint, preuves et audit non effaçable par ces acteurs.

## 19.4 Litiges de commande versus litiges de rémunération

Créer deux types séparés :

- **Litige commercial** (qualité produit, livraison, conformité, défaut paiement), traité dans le système Disputes natif et éventuellement avec preuves Lanabaga.
- **Litige de commission Lanabaga** (participation contestée, calcul, déduction, reprise, absence d'accord vendeur), traité par Ops + Finance/Risk.

Le Lanabaga peut **fournir des preuves** mais **ne tranche pas** le litige qui conditionne sa propre rémunération.

## 19.5 Dossier de décision

Chaque dossier porte : références, type, date, parties, gravité, pièces, marqueurs fraude, enquêteur, avis Risk, décision, justification, conséquences de badge/commission/affectation, notification et éventuel recours. La conclusion **`fault_party`** est humaine au pilote et peut être `unknown` si les faits ne permettent pas une attribution fiable.

---
# 20. Spécification frontend : SuguPro vendeur [P0/P1]

**Principe UX :** peu d'écrans, information immédiatement exploitable, libellés simples en français, responsive/mobile-first. Les badges ne doivent pas encombrer les cartes produit ni remplacer l'information commerciale essentielle. Respecter les composants/design system actuels [AUDIT], palette SUGU et conventions de navigation.

## 20.1 Entrée “Lanaya” dans SuguPro

**Accès menu :** `Lanaya` dans la zone boutique, avec synthèse : Lanabaga principal, nombre de Lanabagas actifs / autorisés, produits couverts, commandes suivies, demandes en attente et éventuel badge. Si le vendeur n'a aucun Lanabaga, CTA **“Choisir un Lanabaga”** ou **“Demander un accompagnement”**.

**Cas vides obligatoires :** compte vendeur non vérifié ; aucun Lanabaga disponible dans le pays ; demande en attente ; Lanabaga suspendu ; plan insuffisant ; boutique sans commande ; score encore insuffisant pour badge. Chaque état propose une action réelle, pas une promesse de certification automatique.

## 20.2 Écran “Mes Lanabagas”

Données par carte : identité professionnelle, ID, localisation générale, spécialité, badge **si effectivement obtenu**, disponibilité, nombre de produits couverts, date d'affectation, missions en cours. Actions : voir profil, proposer une affectation, changer le responsable, terminer une relation, signaler problème.

Pour vendeur Standard, afficher clairement **“1 Lanabaga principal inclus”** et les catégories/produits implicitement couverts. Pour vendeur Plus, afficher **“Affectation avancée : catégorie ou produit”** avec matrice des zones couvertes et conflits signalés.

**Upgrade SuguPro Plus :** déclenché seulement lorsque le vendeur tente une **capacité réellement réservée au plan**, avec explication des autres bénéfices premium ; ne jamais vendre le passage Plus comme achat garanti de badges ou de réputation.

## 20.3 Choisir / changer de Lanabaga

**Étapes :** découverte filtrée par pays, spécialité et disponibilité → fiche → demande → confirmation vendeur → acceptation Lanabaga / contrôle Ops si requis → activation. L'interface affiche si le candidat est simplement **actif** ou **vérifié**. Si le vendeur souhaite remplacer son principal, prévisualiser les produits affectés et les commandes en cours qui conserveront l'ancien responsable au titre de leur snapshot.

## 20.4 Gestion d'affectation par produit/catégorie

Dans le tableau catalogue SuguPro : colonne `Lanabaga responsable` ; sélectionner un ou plusieurs produits (si autorisé) ; appliquer une affectation ; afficher la priorité `produit > catégorie > boutique`. Avant confirmation, montrer le nombre de produits impactés et éventuelles missions en cours **non modifiées rétroactivement**. Prévoir un filtre `Sans responsable` et `Lanabaga suspendu`.

## 20.5 Écran “Honoraires Lanaya” sur une commande

Deux variantes strictes :

- **Standard :** “Une partie de la commission SUGU rémunère votre Lanabaga ; aucun honoraire Lanaya supplémentaire n'est ajouté pour vous sur cette commande.” Afficher si nécessaire la part estimée, sans la présenter comme charge supplémentaire vendeur.
- **Négocié :** comparer commande / VCL, Lanabaga responsable, prestations proposées, type fixe/pourcentage, honoraires bruts proposés, commission marketplace du vendeur, retenues autorisées, règlement vendeur estimé, statut de l'accord, validité et conditions de modification. Actions **Accepter**, **Refuser**, **Demander une modification**. Confirmation active, jamais case pré-cochée.

La proposition doit être **accessible avant paiement**, y compris lors de commandes créées par devis, RFQ ou vente assistée. Une signature papier / acceptation Ops du pilote doit référencer le même accord économique et être visible comme `Accepté hors interface, preuve contrôlée` seulement après validation par deux acteurs habilités si requis.

## 20.6 Écran suivi d'une commande Lanaya

Timeline native SUGU + panneau `Accompagnement Lanaya` : photo/ID du Lanabaga, tâches qu'il suit, dernier événement validé, signaler un problème, messagerie si ouverte. **Ne jamais afficher une livraison comme vérifiée simplement sur une photo envoyée par le Lanabaga** si le workflow exige une preuve transporteur/acheteur.

## 20.7 Onglet “Badge & confiance”

Montrer : statut actuel (non obtenu / en cours / actif / suspendu), ce qu'il atteste, date de mise à jour, progression **indicative** vers seuils pilote et éléments encore requis, sans exposer les règles anti-fraude détaillées ni une promesse de délivrance automatique. Le vendeur doit voir **différence boutique vs produit** ; un produit nouvellement attribué n'est pas automatiquement badgé.

## 20.8 Notifications vendeur

Invitation Lanabaga, acceptation/refus, modification d'affectation, proposition d'honoraires à signer, relance avant expiration, commande bloquée en attente d'accord, étape logistique critique, badge obtenu/suspendu, renouvellement Pro Plus, downgrade et risque de couverture. Inclure lien direct vers l'action pertinente, pas vers une page générique.

# 21. Spécification frontend : espace Lanabaga [P0/P1]

## 21.1 Dashboard d'accueil

Présenter quatre blocs prioritaires au-dessus de la ligne de flottaison : **Mes vendeurs**, **Commandes à traiter**, **Honoraires / commissions**, **Mon statut Lanaya**. Prioriser les **actions urgentes**, pas uniquement le GMV. Bannière claire en cas de convention à renouveler, Quality Gate fermé, identité expirée ou suspension partielle.

## 21.2 “Mon portefeuille”

Table des vendeurs : statut du lien, secteur, ville/pays, qualité d'onboarding, date d'activation, produits couverts, commandes ouvertes, activités récentes, prochaine action, niveau de disponibilité. Le Lanabaga ne peut voir les données d'un vendeur qu'après affectation valide et dans la limite des ressources attribuées ; les prospects non liés ont un niveau de détail restreint.

**Gestion du quota :** compteur `5/5 vendeurs actifs`, plafond Pro Plus, capacité Quality Gate, demande d'extension ; si plan payé mais gel qualité, afficher raison opérationnelle et parcours de réexamen, **pas** une incitation à payer à nouveau.

## 21.3 “Inviter un vendeur” / Prospection

Créer une invitation nominative / lien de parrainage limité, avec consentement du vendeur et contrôle contre doublons. Fiche lead : entreprise, secteur, capacité probable, source déclarée, relation du Lanabaga, permission de contact, suivi. États `prospect → contacté → invité → inscrit → vérifié → activé → première vente`. L'attribution d'origine est **marketing**, pas un droit financier de long terme.

## 21.4 “Mes commandes”

Vue filtrable : en négociation, attente vendeur, paiement confirmé, à préparer, en transit, à livrer, litige, clôturée. Pour chaque dossier : produits **dont il est responsable**, montant éligible selon droits, délai, dernière étape, tâches, contact autorisé, preuves, proposition d'honoraires, droits de commission. Interdire les données des lignes confiées à d'autres Lanabagas si non nécessaires à la tâche.

## 21.5 “Proposer mes honoraires”

Accessible seulement en Négocié ou exception autorisée. Choisir fixe / pourcentage ; voir bornes et base de calcul ; expliquer prestation ; simuler honoraires bruts, retenue SUGU 5 %, net indicatif ; soumettre puis attendre validation / consentement vendeur. Le Lanabaga **ne peut ni se déclarer accepté, ni modifier la base VCL**, ni changer le prix vendeur.

## 21.6 “Mes commissions”

Segments : `estimées`, `en attente`, `acquises`, `payables`, `payées`, `retenues`, `annulées`. Sur chaque ligne : commande, vendeur, régime, assiette, commission SUGU de référence si Standard, honoraires bruts si Négocié, frais SUGU sur honoraires, ajustements, date théorique, référence de paiement confirmée, raison de retenue et contestation autorisée.

**Formulation interdite :** “Solde disponible” tant qu'aucun solde juridiquement détenu en compte de paiement autorisé n'existe. Préférer **“Commissions payables”** et **“Paiements reçus”**.

## 21.7 “Mon score / ma qualité”

Au pilote : niveau `Nouveau / En revue / Vérifié / Sous surveillance`, progression des commandes effectives, vérifications restantes, incidents actionnables et historique de décisions ; **pas** de score numérique public. En phase ultérieure, tableau de dimensions explicables si les données et les règles le justifient. Le Lanabaga peut demander une révision.

## 21.8 “Ma carte Lanaya”

Afficher QR actif, ID, rôle et statut réel ; télécharger/afficher carte numérique selon la politique, demander renouvellement de support physique et signaler perte/usurpation. Si badge non acquis, **ne pas afficher “Lanabaga vérifié”** sur la carte.

## 21.9 Messagerie et tâches

Le Lanabaga peut être invité à une conversation **commande spécifique**, et non disposer de toutes les messageries historiques d'une boutique. Chaque tâche : responsable, date, preuve éventuelle, état, délégation interdite par défaut, piste d'audit. Les notes privées Lanaya ne sont pas des messages marchands envoyés au nom du vendeur.

# 22. Spécification frontend : marketplace / acheteur [P1]

## 22.1 Fiche produit

Badge **LANAYA** compact **uniquement si le moteur l'a attribué**. Au clic : définition positive, limites, identité du Lanabaga si publication autorisée et lien vers la page officielle de vérification. S'il existe simplement un accompagnement sans badge, ne pas utiliser le même design que le badge vérifié ; afficher éventuellement “Accompagné par un Lanabaga” sous une forme secondaire.

## 22.2 Boutique et recherche

Sur la boutique : Lanabaga principal ou partenaire correspondant à la catégorie consultée, s'il est visible selon les règles. Sur les résultats : petit badge non trompeur ; filtre **“Vendeurs accompagnés par Lanaya”** [P1] avec définition précise et séparation éventuelle du filtre “Badge Lanaya obtenu”. Ce filtre ne doit pas fausser les autres critères produits, stock et prix ni faire promettre une garantie financière.

## 22.3 Commande et conversations

Avant paiement : si le vendeur utilise le Négocié, c'est **le vendeur** qui accepte les honoraires ; ne pas présenter au client un frais supplémentaire Lanaya non compris dans le prix validé. Le client peut identifier le responsable de transaction et être notifié de ses actions autorisées, mais conserve la liberté d'utiliser les canaux support SUGU ; le Lanabaga ne remplace pas le service litiges.

## 22.4 Accessibilité et confiance

En français par défaut, vocabulaire non ambigu, couleurs et icônes accompagnées de texte, états lisibles sur faible connexion, cache maîtrisé. Prévoir langues locales et anglais ensuite via localisation (ne pas disperser les libellés en dur). Expliquer : **“Un Lanabaga accompagne la transaction ; cela n'équivaut pas à une assurance.”**

# 23. Back-office : SUGU Operations, Finance, Risk et Admin [P0]

## 23.1 Console Lanabaga

Fiche 360° : identité/structure, pays/secteurs, contrôles, convention, vendeur(s), capacité plan/Quality Gate, historique de participation, badge, carte, incidents, commissions, payout, audit. Actions conditionnées par rôle : admettre, demander pièce, suspendre, réactiver, changer catégorie, limiter capacité, ouvrir révision de badge, réaffecter avec justification.

## 23.2 File d'onboarding vendeur

Vue des prospects apportés par Lanabagas avec statut du vendeur dans le parcours existant. Détecter doublons de société, vendeur déjà actif, fausse recommandation, territoire non ouvert. Ops peut approuver la relation sans automatiquement approuver le KYB vendeur : ces décisions sont distinctes.

## 23.3 File des propositions d'honoraires

Filtres : hors fourchette, attente vendeur, expirées, risque élevé, changement de prix, commande à seuil, multi-Lanabagas, incohérence fiscale/paiement. Chaque exception exige texte de justification et référence à la politique/version concernée. Le manager commercial ne peut contourner une décision Risk bloquante par un simple bouton.

## 23.4 File qualité/badges

Critères détaillés, preuves, version de politique, seuils paramétrables, score shadow, raisons de refus, historique de badge, date de prochain contrôle, décision de publication, révocation urgente. Autoriser une correction manuelle motivée **qui laisse une trace**, pas une édition directe de champs “is_verified”.

## 23.5 File Finance

Commissions Standard/Négocié, rapprochement PSP, consentements vendeur, retenues, demandes de payout, preuve de versement, remboursements et reprises, exports comptables. **Séparer** création d'une proposition de payout, contrôle et confirmation externe. Interdire un bouton “Marquer comme payé” sans justification de la référence de paiement validée.

## 23.6 Matrice configuration pays/abonnements/politiques

Admin consultable : fonctionnalités ouvertes, seuils, barèmes, période de sécurité, modes d'honoraires, plafonds de capacité, contrôle d'éligibilité, version de politique et date d'effet. Toute modification doit être validée, prévisualisée et testée sur des exemples ; aucun réglage ne modifie silencieusement une commande déjà figée.

## 23.7 Journal d'audit et exports

Visualisation de qui a changé quoi, quand, pourquoi et sur quelle version. Permissions d'export restreintes ; chaque export de données personnelles sensibles est journalisé. Pas d'export large par les Lanabagas.

# 24. Modèle de données logique : responsabilités et invariants [P0/P1]

**Note architecturale :** la liste ci-dessous décrit des **entités métier logiques**, **pas l'obligation de créer autant de tables**. Après audit, l'équipe documente pour chacune : entité native réutilisée, colonnes d'extension, nouvelle entité nécessaire, migrations, indexes et contraintes. Les noms définitifs seront adaptés au schéma Laravel actuel.

| Domaine logique | Informations minimales | Invariants critiques |
|---|---|---|
| `LanabagaProfile` | user/structure, statut, secteur, pays, identifiant public, badge, dates | Identité unique ; statut ≠ badge. |
| `LanabagaCompliance` | contrôles, type, résultat, validité, examinateur, document sécurisé | Historique et accès limités. |
| `LanabagaAgreement` | version de convention, acceptation/signature, annexe, pays, dates | Convention requise pour activité. |
| `LanabagaPlanEntitlement` | plan actuel, quotas, effet, provenance facturation | Capacité payée ≠ autorisation Quality Gate. |
| `LanabagaQualityGate` | capacité permise, état, motifs, décision, révision | Le backend bloque dépassements. |
| `LanayaSellerLead` | origine, vendeur potentiel, source, étapes, consentement | Origine commerciale ≠ droit à rémunération. |
| `SellerLanabagaAssignment` | vendeur, Lanabaga, portée, cible, statut, validité, consentement | Pas de chevauchement contradictoire à priorité égale. |
| `LanayaOrderContext` | commande/sous-commande, vendeur, VCL, régime, statut, versions | Une unité de décision par commande vendeur. |
| `LanayaLineAttribution` | ligne de commande native, Lanabaga choisi, valeur, commission de référence | Un responsable payable par ligne en V1. |
| `LanayaOrderSnapshot` | acteurs, prix, assiette, règles et quatre versions, consentements | **Immuable** après verrouillage ; nouveaux événements d'ajustement. |
| `LanayaFeeProposal` | mode, brut, taux, lots, états, expiration, version | Le Lanabaga ne peut s'accepter lui-même. |
| `LanayaSellerFeeConsent` | vendeur signataire, contenu affiché, date, support, version | Obligatoire pour toute déduction négociée. |
| `LanayaParticipationEvidence` | type, action, horodatage, pièce, objet et auteur | Non falsifiable par bénéficiaire après soumission. |
| `LanayaParticipationDecision` | qualification, motif, examinateur, appel | Décision motivée et historisée. |
| `LanayaEarning` | commande/ligne, régime, bases, brut, retenues, état | Au plus une acquisition par élément et version d'événement. |
| `LanayaLedgerEntry` | type, montant signé, source, raison, idempotence | Append-only / corrections compensatoires. |
| `LanayaPayout` | bénéficiaire, valeur, moyen autorisé, PSP, statut, références | Confirmé ≠ simplement demandé. |
| `LanayaRiskFlag` | objet, signal, sévérité, origine, état, justification | Signal ≠ fraude prouvée. |
| `LanayaCase` | incident/litige, parties, preuves, décisions, recours | Interdire auto-arbitrage du bénéficiaire. |
| `LanayaScoreEvaluation` | dimensions, observations, score shadow/version, hard gates | Reproductible, explicable, journalisé. |
| `LanayaBadgeGrant` | cible, badge, statut, conditions, validité, révocation | Aucune attribution par abonnement seul. |
| `LanayaCardCredential` | ID, version, statut, QR/token public, révocation | Révocation en temps réel. |
| `LanayaPolicySet` | seuils, versions, pays, date d'effet, approbation | Politique historique conservée. |
| `LanayaCountryCapability` | pays, capacité, état, date, justification réglementaire | `country_id` seul **n'active rien**. |
| `LanayaAuditEvent` | action, acteur, objet, avant/après sûr, date, corrélation | Pas de suppression ordinaire ni secret en clair. |
| `LanayaNotification` | destinataire, type, ressource, langue, livraison | Pas d'exposition de données sensibles par SMS. |

## 24.1 Snapshot des quatre politiques : correction obligatoire

Toute sous-commande Lanaya verrouillée doit disposer des **quatre références versionnées** :

1. `policy_version` : règles de participation, d'affectation et de commande.
2. `scoring_version` : règles de réputation et critères applicables.
3. `commission_version` : barème Standard/Négocié, assiettes et arrondis.
4. `badge_policy_version` : critères d'affichage / de révocation.

**Recommandation plus sûre :** conserver en outre les identifiants immuables des **rule sets** correspondants, et les valeurs effectives calculées / consenties. Les politiques d'aujourd'hui ne doivent jamais être substituées aux politiques d'une commande historique.

## 24.2 Identifiants, relations et unicité

Relations attendues : un Lanabaga ↔ plusieurs vendeurs ; un vendeur ↔ plusieurs Lanabagas si entitlement ; un vendeur ↔ plusieurs produits ; une sous-commande vendeur ↔ plusieurs lignes ; chaque ligne ↔ une affectation payable snapshotée au plus ; une proposition ↔ un périmètre de lignes et un consentement vendeur ; une commission ↔ un Lanabaga / une source / un régime ; un paiement externe ↔ un ensemble identifié de dettes acquises.

Contraintes logiques à formaliser dans les transactions et, quand possible, en BDD :

- unicité du **Lanabaga principal actif par vendeur** à une date donnée ;
- absence de **deux affectations actives de même priorité** sur la même cible avec chevauchement temporel ;
- impossibilité d'insérer deux écritures d'acquisition pour la même source économique et version ;
- impossibilité de clôturer un Négocié payé sans consentement valide antérieur ;
- index de toutes les recherches sur `(vendeur, statut, date)`, `(Lanabaga, statut, date)`, `(commande, ligne)`, `(pays, capacité, statut)` ;
- valeur historisée des versions, délais, arrondis, monnaies et règles de paiement.

## 24.3 Données personnelles et pièces sensibles

La BDD métier ne doit pas contenir de copie publique de pièce d'identité. Utiliser stockage privé, accès signés de courte durée, antivirus/contrôle des documents, chiffrement approprié, durée de conservation légale, traces d'ouverture et masquage des exports. Séparer photo publique de carte et document KYC original.

## 24.4 Politique d'historisation

**Ne pas supprimer physiquement** les accords, commissions, remboursements, décisions badge ou consentements encore soumis à obligations de preuve. En cas de suppression de compte demandée ou fin de relation, effectuer anonymisation / restriction / purge **conformément aux obligations applicables**, après décision Privacy/Legal, sans détruire la preuve financière légalement requise.

# 25. Interfaces métier, événements et notifications d'intégration [P0/P1]

**Il s'agit d'un contrat conceptuel ; les chemins API réels sont déterminés après audit. Il n'y a aucun code à écrire à partir de cet exemple de vocabulaire seul.**

## 25.1 Capacités entrantes existantes à consommer

| Source native | Événement utile | Réaction Lanaya |
|---|---|---|
| Identité | compte vérifié / suspendu | Mettre à jour habilitations / Quality Gate. |
| Vendeur | KYB validé / retiré | Autoriser / suspendre nouvelles affectations et badges. |
| Catalogue | produit publié / archivé / recatégorisé | Réévaluer couverture et badge produit. |
| Abonnement | plan activé / expiré / contesté | Réévaluer capacité ; ne pas modifier les commandes figées. |
| Orders | commande créée / modifiée / verrouillée | Attribution provisoire → snapshot, régime et accord. |
| PSP/Payments | paiement confirmé / échoué / renversé | Dossier de transaction ; suspendre ou acquérir selon la suite. |
| Delivery | expédition / POD / incident | Mettre à jour la timeline et les preuves. |
| Disputes | litige ouvert / résolu / réouvert | Retenue commission, Risk, recalcul réputation. |
| Finance | commission marketplace acquise / corrigée | Calcul part Lanaya Standard ou correction. |
| Refund | remboursement partiel / total | Compensation du revenu et de la réputation. |

## 25.2 Événements Lanaya sortants proposés

- Candidature Lanabaga soumise / admise / suspendue ; convention validée.
- Vendeur invité / activé par canal Lanaya.
- Affectation demandée / acceptée / activée / terminée / réaffectée.
- Honoraires négociés soumis / acceptés / expirés / verrouillés.
- Participation qualifiée / contestée / rejetée.
- Commission estimée / acquise / retenue / ajustée / payable / payée.
- Badge candidat / accordé / suspendu / révoqué.
- Carte émise / révoquée.
- Quality Gate ouvert / gelé / suspendu.
- Country Capability activée / désactivée.

Chaque événement porte : identifiant unique, type, version de schéma, sujet, pays, horodatage de production, acteur ou service, corrélation commande et clé d'idempotence. Les consommateurs ne doivent pas effectuer de double action s'ils reçoivent le même message plusieurs fois.

## 25.3 Consistance transactionnelle

Les changements **internes** qui doivent être atomiques (attribution + snapshot + références de règle) sont sauvegardés comme une seule opération métier. L'émission d'événements à destination d'autres modules utilise un mécanisme de publication fiable **compatible avec l'infrastructure actuelle** ; les traitements PSP restent asynchrones, rapprochés et idempotents.

## 25.4 Version des interfaces

Différencier version **du schéma événement**, version **de politique métier** et version **d'API**. L'évolution d'une politique de commission n'impose pas de modifier l'identifiant historique d'une commande et n'altère pas son accord signé.

## 25.5 Notifications

Destinataire, canal, déclencheur, délai, template, action et escalade sont définis pour chaque événement. Exemple : un accord Négocié en attente vendeur peut déclencher rappel limité, puis expiration ; la relance ne peut jamais **auto-accepter**. Éviter de notifier le montant de commission à un acheteur ou Lanabaga non concerné.

# 26. Pays, devises, capacités et conformité [CORE][LEGAL GATE]

## 26.1 Country Pack explicite

Pour chaque pays (Burkina, Mali, Niger, puis autres), définir chaque capacité **séparément** :

| Capacité | Condition d'ouverture |
|---|---|
| Candidature / admission Lanabaga | Contrats, conformité locale, support Ops et politique pays. |
| Affectation vendeurs | KYC/KYB, permissions, zone, consentement vendeur. |
| Badge public | Politique de preuves et revue marque/conformité locale. |
| Carte numérique / physique | Protection des données et procédure vérification. |
| Honoraires Standard | Accord contrat Lanabaga + commission marketplace réelle. |
| Honoraires Négociés | Accord vendeur, facturation/fiscalité et paiement autorisé. |
| Payout automatique | Capacités PSP, droit applicable, rapprochement validés. |
| Cash collection | **Désactivé V1**, activation séparée sous architecture agréée. |
| Transaction transfrontalière | Paiement, logistique, documents et responsabilités du corridor approuvés. |

Le **simple fait que le code connaisse un pays ne doit activer aucune capacité Lanaya**. La configuration pays indique `désactivé / pilote restreint / actif / suspendu`, responsable et date de contrôle, documentation juridique et version applicable.

## 26.2 Devise et seuil

XOF est la devise de départ pour le pilote UEMOA ; néanmoins les objets de commande, prix et règles doivent porter la devise plutôt que la déduire du pays. Pour une devise autre que XOF, **ne pas appliquer automatiquement “5 millions” comme nombre nu** ; utiliser paramètres en devise avec politique de conversion **si approuvée**. Les cas multi-devises et leur taux de change / arrondi sont [P2] sauf exigence de l'existant.

## 26.3 Legal Gates minimaux

- **Statut Lanabaga :** qualification réelle de l'indépendant / apporteur d'affaires / agent commercial et conséquences OHADA, à valider par juriste selon missions effectives.
- **Paiements :** rôle exact de SUGU, PSP, mandats, possibilité légale de split / déduction, instruction BCEAO applicable ; aucun cash Lanabaga V1.
- **Taxes / documents :** facture des prestations, retenues fiscales, modalités de rémunération transfrontalière.
- **Données :** qualification des responsables/sous-traitants, information/consentement, formalités et transfert transfrontalier applicable.
- **Marque :** éviter de présenter Lanaya comme assurance financière, caution ou garantie absolue.

Ces gates sont des **obligations de validation**, pas des conclusions de droit émises par ce cahier des charges.

# 27. Sécurité, confidentialité, robustesse technique [CORE]

## 27.1 Authentification et sécurité des sessions

Réutiliser l'authentification native, exiger MFA pour les Lanabagas et rôles sensibles lorsqu'un mécanisme adapté existe, gérer renouvellement/révocation de sessions et journaliser connexions risquées. Revalidation forte avant changement de compte payout, signature d'accord financier, activation de rôle ou action sensible.

## 27.2 Autorisations fines

Vérification **serveur** sur chaque lecture, modification, pièce jointe et export. Contrôles au niveau ressources et lignes : un Lanabaga ayant accès au vendeur A ne lit **ni vendeur B ni toutes les lignes du panier acheteur** ; une ancienne affectation terminée ne donne pas un accès illimité à l'historique futur. Les journaux de sécurité doivent enregistrer et surveiller les tentatives répétées d'accès interdit.

## 27.3 Gestion d'identifiants / demandes

Les QR, invitations, liens d'approbation, documents et exports sont tokenisés avec durée limitée, contrôle d'usage et révocation. Les identifiants publics ne doivent jamais permettre de récupérer une fiche KYC ou une information financière sans authentification.

## 27.4 Stockage et pièces

Fichiers privés, types et tailles validés, scan maliciel si disponible, URLs temporaires, filigrane facultatif, horodatage et empreintes de preuve si utile, accès minimisé. Les médias de conversation doivent respecter les permissions de la conversation, pas les permissions globales de l'agent.

## 27.5 Robustesse contre doubles actions

Protection contre double clic d'acceptation, deux assignations simultanées, livraison et remboursement dans le désordre, événements PSP redélivrés, deux paiements confirmés pour la même commission. Les opérations financières doivent rester cohérentes même si jobs asynchrones et base de données sont brièvement indisponibles.

## 27.6 Performances

Lister les vendeurs d'un Lanabaga sans N+1, calcul des badges lourds asynchrone avec invalidation sûre, indexation sur références natives, pages marketplace non bloquées par indisponibilité du service Lanaya, dégradation maîtrisée des éléments de confiance. Fixer SLO p95, files de jobs, délai de fraîcheur badge et couverture observabilité **après mesure d'un environnement réel** [AUDIT] plutôt que promettre arbitrairement 200 ms partout.

## 27.7 Continuité et récupération

Backups contrôlés, restauration testée, conservation de preuves financières, reprise des jobs, rapprochements manuels si PSP indisponible, procédure de révocation d'urgence d'un Lanabaga ou badge et canal support opérationnel. Incident de données signalé selon le contrat (notification Lanabaga à SUGU **sans délai et au plus tard dans les 12 heures de découverte**, sans préjudice des obligations légales distinctes).

# 28. Notifications, audits et analytics [P0/P1]

## 28.1 Journal d'audit métier

Tracer au minimum : identité / rôle, source et canal, ressource, date/heure, champ / état avant-après sans secrets, raison, approbations, correlation ID, version de règle. Une correction humaine de badge ou de commission doit être aussi traçable qu'une validation automatisée.

## 28.2 Notifications par type d'acteur

| Action | Vendeur | Lanabaga | SUGU Ops / Risk |
|---|---|---|---|
| Affectation proposée | À accepter / refuser | À accepter / suivre | Exceptions / conflit |
| Plan ne permet plus l'affectation | Choix du principal | Explication impact | File de transfert |
| Honoraires proposés | Validation demandée | Confirmation soumission | Hors barème / anomalie |
| Paiement confirmé | Confirmation selon interface | Début/continuation mission | Suivi financier |
| Livraison retardée | État et contact | Tâche urgente | SLA / escalade |
| Commission acquise | Pas nécessairement notifié | Relevé | Réconciliation |
| Badge accordé/suspendu | Statut concerné | Statut + recours | Justification et audit |
| Risque majeur | Information proportionnée | Restriction + motif recevable | Dossier et contrôle |

## 28.3 Métriques produites dès le pilote

- **Acquisition Lanabaga :** coût, qualité de sélection, délai d'admission, taux de mise en activité.
- **Vendeurs :** vendeur recruté par Lanabaga → vendeur KYB valide → première annonce → première commande → vendeur récurrent.
- **Conversion acheteur :** devis → commande → payée → livrée → répétée, par profil de vendeur.
- **Économie :** GMV éligible, commission marketplace réelle, coût Lanaya Standard, honoraires Négociés, frais SUGU de 5 %, coût Ops, marge contributive par commande.
- **Risque :** litiges fondés, fraude confirmée, faux positifs, badges suspendus, reversals, temps d'enquête.
- **Opérations :** délai d'accord Négocié, taux de dossier sans preuve, SLA, réaffectations, temps de règlement.
- **Abonnements :** taux d'upgrade vendeur et Lanabaga, churn, quota atteint, dépassements bloqués, poids de la performance.

La **North Star** proposée pour valider Lanaya est le **GMV livré et financièrement confirmé, puis répété, généré par des vendeurs qualifiés issus de Lanabagas**, rapporté au coût complet d'acquisition et de fonctionnement. Le nombre de badges et de vendeurs inscrits **ne suffit pas**.

---
# 29. Parcours difficiles et cas limites : décisions obligatoires [CORE]

| Cas | Comportement exigé |
|---|---|
| Le vendeur n'a aucun Lanabaga | Commande native possible si SUGU la permet ; aucune rémunération Lanaya et aucun badge Lanaya inféré. |
| Lanabaga affecté après commande verrouillée | Pas de droit automatique aux commissions de cette commande ; intervention exceptionnelle documentée séparément si autorisée. |
| Deux Lanabagas couvrent le même produit | Refuser la seconde affectation active de même priorité ; arbitrage et date d'effet. |
| Lanabaga A principal et B affecté au produit | B est responsable de ce produit ; A conserve les autres produits. |
| Vendeur perd SuguPro Plus | Préserver l'historique et les commandes figées, organiser l'extinction de couvertures excédentaires. |
| Lanabaga Pro Plus payé mais Quality Gate fermé | Quota contractuel visible, impossibilité de dépasser la capacité réellement autorisée. |
| Lanabaga perd badge après paiement acheteur | Ne pas effacer accord et historiques ; suspendre nouvelles affectations et examiner la continuation/les paiements selon le risque et le contrat. |
| Lanabaga change en cours de livraison | Transfer documenté ; le responsable économique initial reste snapshoté ; modification du droit à rémunération via décision exceptionnelle motivée. |
| Commande 4 999 999 FCFA | Standard, sauf exception documentée approuvée avant verrouillage. |
| Commande exactement 5 000 000 FCFA | Négocié ; accord vendeur obligatoire. |
| Panier 9 M, deux vendeurs 4 M + 5 M | Standard pour sous-commande 4 M, Négocié pour sous-commande 5 M, selon unité commerciale validée. |
| Même vendeur, deux catégories, deux Lanabagas | Ventiler les lignes et honoraires ; un responsable payable par ligne en V1. |
| Nouvelle remise passe 5,1 M à 4,8 M avant paiement | Recalculer en Standard et représenter conditions ; ancien accord Négocié non applicable silencieusement. |
| Le vendeur refuse honoraires Négociés | Pas de verrouillage Lanaya Négocié ; nouvelle proposition ou parcours de sortie si autorisé. |
| Le Lanabaga saisit 2 % hors plage autorisée | Bloquer/mettre en revue avant présentation vendeur selon politique, même si vendeur accepterait. |
| Accord hors interface signé pendant pilote | Enregistrer document, date, auteur, preuve de contrôle et approbations ; aucun simple “j'ai parlé au vendeur”. |
| Paiement PSP confirmé deux fois via callback | Une seule acquisition de revenu, un seul déclenchement de commission. |
| PSP confirme retard, navigateur a expiré | Réconciliation par référence externe ; pas de nouveau débit ou payout aveugle. |
| Livraison validée puis contestation sérieuse | Retenir/passer en revue commission non payée ; si payée, appliquer traitement de reprise contractuelle, avec preuve. |
| Remboursement partiel après clôture | Écritures d'ajustement, montants recalculés et traçabilité ; ne pas réécrire le snapshot initial. |
| Une commande est annulée et recréée | Nouvelle identité commerciale ; détection doublon éventuelle ; ne pas doubler réputation ou revenu. |
| Moyen de paiement commun entre deux acheteurs | Signal d'examen contextualisé, non jugement automatique de fraude. |
| Acheteurs B2B peu nombreux mais importants | Contrôle d'indépendance économique et revue motivée, pas rejet mécanique pour concentration. |
| Une machine nouvelle d'un vendeur réputé | Pas de badge produit complet sur seule réputation d'une autre catégorie. |
| Plusieurs Lanabagas historiques du même vendeur | Historique boutique cumulable ; badge produit exige responsable actuel vérifié. |
| Vendeur suspendu ou KYB retiré | Désactiver badges et nouvelles opérations sensibles ; préserver preuves et contrats passés. |
| QR d'une carte perdue | Ancienne carte immédiatement révoquée ; page officielle répond inactive. |
| LANAYA non ouvert au Niger | Ni candidature active, ni badge, ni honoraires automatisés pour ce pays, sauf capacités explicitement pilotées. |
| Commande cross-border Burkina→Mali | N'activer le split et les obligations que si les Country Packs et corridors requis sont tous habilités. |
| Lanabaga et acheteur ont même dirigeant | Risque de partie liée, déclaration obligatoire et revue avant qualification de réputation/commission. |
| Un Lanabaga ne peut être joint durant la mission | Mécanisme de délégation Ops ou réaffectation ; droits et honoraires historiques non modifiés implicitement. |
| Vendeur demande export de toutes les données des acheteurs | Limiter à ses droits natifs / règles privacy ; Lanaya n'étend pas automatiquement ces accès. |

# 30. Migration de l'existant et pilote sans rupture [P0]

## 30.1 Principe zéro réécriture

**Ne pas** migrer les produits, vendeurs et commandes existants vers des “copies Lanaya”. Ne pas ajouter le programme comme dépendance obligatoire de checkout pour tous les utilisateurs. Une commande **sans Lanaya** suit strictement son comportement d'avant la fonctionnalité. Toute modification du pipeline paiement existant doit être isolée derrière une décision métier `Lanaya applicable = oui/non` et une configuration pays/plan.

## 30.2 Préparation des déploiements

1. Auditer clés primaires, sous-commandes et lignes ; fixer le référentiel des montants, devises et statuts.
2. Introduire structures de données Lanaya avec champs / relations optionnels, sans imposer rétroactivement Lanabaga aux vendeurs existants.
3. Initialiser paramètres pays **tous désactivés** puis activer explicitement les seules capacités autorisées au Burkina pour les comptes pilotes.
4. Migrer uniquement les **Lanabagas pilotes réellement contractualisés** et leurs vendeurs ayant consenti ; conserver la date de début de relation sans fabriquer de dates antérieures.
5. Activer mode observation sur événements Orders/Payments/Delivery avant tout calcul payable.
6. Exécuter simulations financières sur jeux anonymisés puis commandes tests non réelles ; faire valider Finance.
7. Ouvrir nombre limité de vendeurs/catégories à l'aide d'une liste d'autorisation.
8. Activer suivi, propositions écrites et comptabilité de rémunération selon ce qui est réellement disponible ; payer uniquement via flux validé.
9. Activer badges **après** validation de données suffisantes et protocole Ops ; jamais immédiatement sur tous les vendeurs pilotes.
10. Réévaluer puis élargir par vagues, avec critères d'arrêt et rollback.

## 30.3 Feature flags conseillés

`lanaya_candidate_onboarding`, `lanaya_seller_assignment`, `lanaya_order_tracking`, `lanaya_standard_earnings`, `lanaya_negotiated_proposals`, `lanaya_seller_consent`, `lanaya_manual_payout_export`, `lanaya_automated_payout`, `lanaya_score_shadow`, `lanaya_badge_publication`, `lanaya_card_public_verify`, `lanaya_sugupro_multi_assignment`, `lanaya_lanabaga_pro_plus`, `lanaya_buyer_match`.

Chaque drapeau a au minimum : pays, environnement, cohorte, état, date, responsable, justification et documentation du chemin de **désactivation**. Les flags doivent être implémentés selon la solution de feature flags actuelle de SUGU [AUDIT], pas via une collection anarchique de variables temporaires.

## 30.4 Rollback

Une désactivation Lanaya arrête **nouvelles** propositions, affectations et badges ; elle ne détruit ni paiement reçu, ni consentement, ni commission acquise, ni audit. Les flux Orders/Payment doivent continuer normalement ou être mis en attente de façon explicite si une commande Négociée exige encore une décision. Prévoir procédure manuelle de reprise de dossiers en cours et information des parties concernées.

## 30.5 Plan de pilote conseillé [HYPOTHÈSE]

Cohorte limitée **10 à 20 Lanabagas** et **30 à 50 vendeurs**, secteurs de gros sélectionnés, accompagnement Ops rapproché, scoring numérique en mode shadow, badge attribué après contrôle humain. Taille exacte et durée du pilote à arrêter selon disponibilité des équipes, PSP et volumes réels. Ne pas déduire de ce chiffre une promesse de GMV.

# 31. Cahier de recette : scénarios vérifiables [CORE]

Les identifiants `ACC` ci-dessous désignent des **critères d'acceptation** ; chaque item doit être décliné en tests unitaires, d'intégration et/ou bout-en-bout selon sa nature, avec données fixes et résultats attendus documentés. Toute erreur de calcul financier ou fuite de données est bloquante pour le déploiement concerné.

## 31.1 Identité et admission

- **ACC-001** — Un candidat peut créer une demande ; il ne lit aucune commande avant admission.
- **ACC-002** — Un Lanabaga admis, avec contrat valide, peut être actif **sans** badge.
- **ACC-003** — La suspension du compte retire instantanément l'accès aux nouvelles ressources et aux actions sensibles.
- **ACC-004** — Une convention/annexe expirée bloque les nouveaux droits qui l'exigent sans effacer les commandes historiques.
- **ACC-005** — Un utilisateur ayant le rôle vendeur et Lanabaga ne peut s'auto-approuver un honoraire via changement de contexte.
- **ACC-006** — Un administrateur non habilité ne peut lire les copies de documents KYC Lanabaga.

## 31.2 Recrutement et affectations

- **ACC-007** — L'invitation par un Lanabaga laisse la décision d'inscription/consentement au vendeur.
- **ACC-008** — Un vendeur déjà existant ne génère pas de deuxième compte automatiquement via une invitation.
- **ACC-009** — Une recommandation vendeur ne suffit pas pour obtenir une commission sur une commande future non accompagnée.
- **ACC-010** — Un vendeur Standard ne peut maintenir qu'un Lanabaga principal actif.
- **ACC-011** — Un vendeur SuguPro Plus peut affecter A à la boutique et B à un produit ; B prévaut sur le produit.
- **ACC-012** — Une affectation catégorie prévaut sur une affectation boutique, sauf affectation produit plus spécifique.
- **ACC-013** — Deux affectations produit de même priorité simultanées sont refusées.
- **ACC-014** — Le Lanabaga à cinq vendeurs actifs ne peut accepter un sixième sans droits nécessaires.
- **ACC-015** — Le paiement Pro Plus n'autorise pas le sixième vendeur si Quality Gate limite à cinq.
- **ACC-016** — Un remplacement de Lanabaga ne modifie pas l'attribution financière des commandes déjà figées.
- **ACC-017** — Un downgrade SuguPro Plus vers Standard conserve les archives tout en ramenant les nouvelles couvertures autorisées au quota.

## 31.3 Seuil et calcul Standard

- **ACC-018** — VCL 4 999 999 FCFA ⇒ Standard par défaut.
- **ACC-019** — VCL 5 000 000 FCFA ⇒ Négocié et accord vendeur requis.
- **ACC-020** — À 1 M et commission SUGU 5 %, la part Lanabaga Standard acquise est 10 000 FCFA, sous réserve de participation.
- **ACC-021** — À 1 M et commission SUGU 3 %, la part Standard est 6 000 FCFA, pas 10 000.
- **ACC-022** — Commission SUGU réellement acquise nulle ⇒ rémunération Standard nulle, hors accord distinct écrit.
- **ACC-023** — Un panier 4 M vendeur A + 3 M vendeur B n'active pas automatiquement le Négocié en se basant sur le panier global.
- **ACC-024** — Un même vendeur avec deux Lanabagas sur deux lignes ne génère pas une commission Standard double sur une même ligne.
- **ACC-025** — Remise appliquée à une ligne est répercutée sur la base Lanaya selon la règle du module Orders, hors frais exclus.

## 31.4 Régime négocié, consentement et verrouillage

- **ACC-026** — Aucun paiement d'une sous-commande Négociée n'est autorisé via Lanaya sans proposition valide et accord vendeur explicite.
- **ACC-027** — Le vendeur lit les honoraires bruts, la base et l'estimation de son règlement avant acceptation.
- **ACC-028** — Refuser une proposition la garde non exécutable ; aucun consentement implicite.
- **ACC-029** — Le Lanabaga ne peut changer seul une proposition acceptée.
- **ACC-030** — Une variation de 4,9 M à 5,1 M avant paiement oblige le passage Négocié et un nouvel accord.
- **ACC-031** — Une variation matérielle de VCL invalide / versionne la proposition avant verrouillage.
- **ACC-032** — Une proposition expirée ou hors limites ne passe pas au paiement sans nouveau contrôle.
- **ACC-033** — Sur 20 M, commission SUGU 5 %, honoraires 250 000, les frais SUGU sur honoraires sont 12 500 et le net Lanabaga pré-taxes 237 500.
- **ACC-034** — Ces 5 % sur honoraires ne s'appliquent pas une deuxième fois à une commission Standard.
- **ACC-035** — Le consentement vendeur est conservé avec preuve de la version et antériorité au verrouillage/paiement.
- **ACC-036** — Une modification hors interface pilote exige une preuve écrite et un contrôle Ops autorisé.

## 31.5 Exécution, finances et événements

- **ACC-037** — Un Lanabaga purement nominal ne devient pas payable sans participation qualifiée.
- **ACC-038** — Livraison annoncée sans preuve suffisante ne crée pas une commande effective.
- **ACC-039** — Une livraison avec litige bloquant retient la commission selon la règle applicable.
- **ACC-040** — Un remboursement partiel crée un ajustement sans réécrire le snapshot historique.
- **ACC-041** — Un remboursement total avant acquisition supprime le droit correspondant selon politique contractuelle.
- **ACC-042** — Rejeu d'un callback PSP ne crée aucune deuxième commission.
- **ACC-043** — Rejeu d'un événement livraison ne compte pas une deuxième commande dans le badge.
- **ACC-044** — Une demande de payout sans confirmation PSP n'est jamais affichée comme “payée”.
- **ACC-045** — Un payout échoué est rapproché et peut être relancé sans double crédit.
- **ACC-046** — Une décision Ops hors barème est visible en audit et soumise aux approbations requises.
- **ACC-047** — Aucun règlement Négocié ne déduit d'honoraires non acceptés par le vendeur.
- **ACC-048** — Une correction Finance conserve brut initial, correction et solde, plutôt qu'écraser l'historique.

## 31.6 Scoring, badges et carte

- **ACC-049** — Un Lanabaga ayant quatre commandes effectives ne reçoit pas le badge “vérifié” sous le seuil pilote cinq.
- **ACC-050** — Cinq commandes ne suffisent pas si KYC/formation/Quality Gate est bloquant.
- **ACC-051** — Un Lanabaga actif sans badge peut travailler dans les limites autorisées, sans faux label.
- **ACC-052** — Deux acheteurs B2B indépendants peuvent être admis au pilote ; une concentration légitime peut passer en revue plutôt qu'un rejet automatique.
- **ACC-053** — Un même compte / moyen de paiement partagé n'entraîne pas seul une fraude automatique.
- **ACC-054** — Le cumul vendeur de plusieurs Lanabagas est utilisable pour les seuils boutique dans les conditions prévues.
- **ACC-055** — Un produit d'une nouvelle catégorie n'hérite pas automatiquement du badge de produits historiques différents.
- **ACC-056** — Si le Lanabaga actuellement responsable perd son badge, le badge produit cesse d'être publié selon les gates, sans supprimer l'historique.
- **ACC-057** — Une carte QR révoquée indique non valide même si son image reste physiquement existante.
- **ACC-058** — Le QR ne dévoile jamais KYC, banque ou historique commercial sensible.

## 31.7 Autorisations, pays, reprise et non-régression

- **ACC-059** — Lanabaga A ne peut lire commandes, commissions ni chat de Lanabaga B sans mission autorisée.
- **ACC-060** — Un Lanabaga ne peut initier un cash collection ni modifier un bénéficiaire payout.
- **ACC-061** — Un pays non activé refuse les opérations Lanaya non autorisées tout en laissant les flux SUGU natifs autorisés fonctionner.
- **ACC-062** — Désactivation du flag badge rend celui-ci invisible sans effacer les décisions historiques.
- **ACC-063** — Les anciennes commandes SUGU sans Lanaya continuent d'être traitées exactement comme avant.
- **ACC-064** — Les écritures commission et consentements résistent à un job rejoué, une session expirée et un incident réseau partiel.
- **ACC-065** — Le retrait des droits d'un Lanabaga coupe immédiatement l'accès à toutes ses ressources actives non autorisées.
- **ACC-066** — À revenu marketplace identique, Finance peut rapprocher chaque commission Lanaya acquise d'une vente et d'un événement/source unique.
- **ACC-067** — Une commande contient les **quatre versions de politique** dans son instantané.
- **ACC-068** — Le badge acheteur n'affiche pas “Protection financière” s'il n'existe pas de dispositif effectivement autorisé.
- **ACC-069** — Les écrans restent compréhensibles et utilisables depuis un téléphone d'entrée de gamme et une connexion mobile irrégulière.
- **ACC-070** — Une mise à jour d'une grille de commission s'applique aux nouvelles commandes, jamais rétroactivement aux commandes verrouillées.

## 31.8 Couverture non fonctionnelle minimale

- Tests d'autorisation **négatifs** pour chaque type de compte.
- Concurrence : double assignation, paiement et remboursement simultanés, payout concurrent.
- Intégration réelle ou simulateur fidèle PSP/Orders/Delivery avec événements hors ordre et rejoués.
- Vérification sécurité du stockage de pièces et QR.
- Tests UX mobile : écran étroit, clavier, état vide, erreur d'accord, faible bande passante.
- Tests d'archivage / suppression sous politique privacy.
- Tests de déploiement progressif et rollback sur une cohorte pilote.

# 32. Backlog technique priorisé — intégration dans l'existant

**Règle d'exécution destinée aux équipes / agents de développement :** **ne pas implémenter les fonctions P1/P2 sous prétexte qu'elles sont décrites**. Exécuter les lots ci-dessous, faire valider les critères d'acceptation et ne passer au suivant qu'après feu vert. Les dépendances de chaque lot sont bloquantes.

## Lot 0 — Audit de l'existant et décisions d'intégration [P0]

**Objectif :** connaître précisément les modèles User/Seller/Product/Order/Payment/Subscription et les APIs frontends réellement présentes.  
**Délivrables :** matrice réutiliser/étendre/créer ; séquences existantes checkout/remboursement ; possibilités PSP ; plan migrations sans downtime ; décisions d'architecture ; liste des inconnues.  
**Validation :** CTO + lead backend + responsable Produit + Finance signent les points de jonction des deux régimes avec les modules existants.

## Lot 1 — Identité, conformité, rôle et réseau commercial [P0]

Onboarding Lanabaga, convention, état actif sans badge, KYC contrôlé, capacité Standard 5 vendeurs, invitations prospects, source d'acquisition vendeur et rôle/permissions stricts. Ne pas commencer par un score numérique automatique.  
**Dépendances :** Lot 0 et validation contractuelle.  
**Recette :** ACC-001 à 009, ACC-014, ACC-059/060.

## Lot 2 — Assignation boutique et suivi opérationnel léger [P0]

Un Lanabaga principal gratuit par vendeur, consentements, état affectation, timeline commande (réutilisée), journalisation des actions, participation documentée, dashboard minimal Ops/Lanabaga/vendeur. Les affectations avancées catégorie/produit peuvent être conçues dès maintenant **mais activées P1** si le checkout actuel ne gère pas encore leur ventilation comptable.  
**Dépendances :** Lot 1.  
**Recette :** ACC-010 à 013, ACC-016 et 037/038.

## Lot 3 — Contexte de commande, snapshots et régimes calculables [P0]

VCL par sous-commande vendeur, attribution par ligne, sélection Standard/Négocié, calcul d'estimation et quatre versions de politique, gestion des changements pré-paiement. Garder la séparation avec commission marketplace native.  
**Dépendances :** intégration Orders/Finance auditée.  
**Recette :** ACC-018 à 025, 030/031 et 067/070.

## Lot 4 — Proposition et consentement Négocié [P0]

Workflow proposition, limites et exceptions, acceptation vendeur authentifiée, snapshot des consentements, écran vendeur/Lanabaga/Ops, procédé papier contrôlé au pilote. **Aucune activation du règlement déduit sans [LEGAL GATE] + PSP.**  
**Dépendances :** Lot 3 + contrat vendeur et prestataire paiement.  
**Recette :** ACC-026 à 036, 047.

## Lot 5 — Commissions, décision Ops et règlement contrôlé [P0]

Calcul Standard 20 %, honoraires Négociés avec frais Lanaya 5 %, participation qualifiée, comptabilité événementielle, registre Finance, rapprochement et **payout via système autorisé** ou procédure manuelle légalement validée.  
**Dépendances :** Lots 3/4, capacités financières validées.  
**Recette :** ACC-037 à 048, 066.

## Lot 6 — Badge manuel/assisté + carte numérique vérifiable [P0 limité / P1]

Minimum d'éligibilité, statut sans badge, décision Ops motivée, historique, retrait, affichage non trompeur, carte QR avec statut courant. **Le moteur de scoring pondéré reste shadow.** La carte physique et le moteur automatique peuvent suivre après pilote.  
**Dépendances :** données de commandes effectives fiables.  
**Recette :** ACC-049 à 058 et 068.

## Lot 7 — SuguPro Plus / Pro Plus et multi-affectation [P1]

Brancher plans existants, quotas, Quality Gate, affectation catégorie/produit, réattribution de lignes, interface catalogue, restrictions downgrade et conflits multi-Lanabagas. **Condition préalable :** les calculs par ligne et lots du Lot 3 sont fiables.  
**Recette :** ACC-011 à 017, 024 et 055/056.

## Lot 8 — Badge dynamique & score validé [P1]

Politique boutique/produit, seuils calibrés, publication index/cache, revue cohorte, score explicable si validé statistiquement, contrôle des litiges.  
**Recette :** ACC-049 à 058 complétés par tests de charge et de cache.

## Lot 9 — Buyer Match, recherche avancée, internationalisation [P2]

Opportunités vendeurs / acheteurs, sourcing assisté, routing des leads, rémunérations additionnelles seulement sur contrat mis à jour ; déploiement Bamako/Niamey uniquement par Country Pack et corridors officiellement opérationnels.

## 32.1 Dépendances sous forme de séquence

**Audit → Identité/Rôles → Affectations → Snapshots → Honoraires/Consentement → Finance/Payout → Badges/Carte → Multi-Lanabagas → Score avancé → Expansion.**

La carte et certains écrans peuvent être produits en parallèle **visuellement**, mais ils ne deviennent **actifs publiquement** qu'une fois les données et permissions fiables.

## 32.2 Répartition des responsabilités

| Fonction | Propriétaire | Contributions | Approbation critique |
|---|---|---|---|
| Règles Lanaya | Product Owner | Commercial, Ops, Finance | Direction produit |
| Intégration Laravel | Lead Backend | DBA, Payment Dev, QA | CTO |
| Interfaces vendeur/Lanabaga | Lead Frontend | Product Design, Accessibilité | Product Owner |
| Catalogue / commandes | Équipe Core Marketplace | Backend Lanaya | Lead Backend |
| Prix, commissions et grand livre | Finance + Tech Finance | Ops, PSP | Finance + CTO |
| Paiements/règlements | Responsable paiement / prestataire | Legal, Finance, Security | [LEGAL GATE] |
| Badges, score, sanctions | Risk/Compliance | Ops, Data, Product | Responsable Risk |
| Protection de données | Privacy/Legal | Security, Product, Ops | Responsable conformité |
| Communication badge/carte | Brand | Product, Legal | Brand + Legal |
| Mise en production | DevOps/SRE | QA, Backend, Ops | Go/No-Go collectif |

**Effort et calendrier :** aucune estimation “3 semaines” n'est honnête sans voir le dépôt et les PSP. L'équipe chiffrera chaque lot **après** Lot 0 (complexité, dépendances, data migrations, tests, impact paiement), puis publiera un planning avec marges et jalons vérifiables. Une courte démo n'est pas une recette financière.

# 33. Exploitation, suivi et cadence d'amélioration

## 33.1 Gouvernance produit hebdomadaire du pilote

Réunion courte Product/Ops/Commercial/Finance/Risk : progression recrutement Lanabagas/vendeurs ; commandes effectives ; propositions bloquées ; commissions acquises/payées ; litiges ; exceptions ; qualité des preuves ; bugs d'autorisation ; retours UX et paramètres à revoir. Toute modification de seuil/politique reçoit numéro de version, justification, date future et liste des cohortes concernées.

## 33.2 Table de pilotage FinOps

Par mois, pays et catégorie : revenus marketplace acquis, coût part Standard, honoraire Négocié brut, frais SUGU sur honoraires, coût support / audits / commissions PSP, marge contributive et chargeback. Séparer **revenu de SUGU**, **flux vendeur** et **rémunération de partenaires**, et ne pas additionner des flux tiers comme chiffre d'affaires net propre.

## 33.3 Processus d'incident

Seuils d'escalade à définir : impossibilité générale de checkout, fuite de données KYC, erreur de déduction vendeur, double payout, badges erronés, usurpation de carte, panne du PSP, suspension massive. Pour chaque incident : triage, désactivation feature flag ciblée, conservation des preuves, propriétaire de résolution, communication, correction, post-mortem et test de non-récurrence.

## 33.4 Critères d'expansion pays

N'ouvrir Mali/Niger que si : contrat Lanabaga local validé ; pays/corridor habilité ; canal de paiement et payout opérationnel ; prix/stock/livraison maîtrisés ; support local identifié ; processus litige et données conforme ; ratio d'acquisition vendeurs via Lanabaga documenté. Les prévisions commerciales ne remplacent pas une preuve de transaction effective.

# 34. Décisions ouvertes et arbitrages à enregistrer avant chaque lot

Le développeur **n'invente pas les réponses**. Chaque ligne devient une décision Product/Finance/Legal numérotée, datée, puis un paramètre versionné ou une règle technique.

| ID | Décision à trancher | Responsable | Bloque |
|---|---|---|---|
| **DEC-01** | Inventaire exact des modèles Laravel et du frontend ; propriétaire du checkout et des commissions | CTO | Tous les lots |
| **DEC-02** | L'unité “commande vendeur” est-elle déjà stable dans les paniers multi-vendeurs ? | Product + Core Orders | Calculs |
| **DEC-03** | Le PSP sait-il légalement et techniquement faire le split vendeur/Lanabaga/SUGU, y compris sur remboursements ? | Finance + PSP + Legal | Payout Négocié |
| **DEC-04** | Contrat vendeur autorise-t-il la déduction d'honoraires consentis commande par commande ? | Legal + Product | Régime Négocié |
| **DEC-05** | Pays/secteurs pilotes ouverts et catégories B2B prioritaires | Commercial + Risk | Admission |
| **DEC-06** | Prix et plafond contractuel de SuguPro Plus / Lanabaga Pro Plus | Product + Finance | Abonnements |
| **DEC-07** | Délais Annexe A, fréquence paiement et réserve pour litiges selon contrat | Finance + Legal | Commission payable |
| **DEC-08** | Quel historique est utilisé pour les seuils badge vendeur (10) et produit/catégorie (3) ? | Product + Risk | Badge produit |
| **DEC-09** | Preuve d'indépendance économique B2B et procédure d'exception de concentration | Risk + Legal | Badge Lanabaga |
| **DEC-10** | Quelles bornes de négociation sont **bloquantes** versus simplement recommandées ? | Product + Finance | Honoraires |
| **DEC-11** | Base d'exclusion des taxes, transport, coupons et ventilation des remises | Finance + Orders | VCL exact |
| **DEC-12** | Politique d'override d'une commande <5 M complexe | Product + Ops + Risk | Cas d'exception |
| **DEC-13** | Statut d'une transaction multi-Lanabagas en Négocié ; répartition/consentement par lot | Product + Finance | Multi-affectations |
| **DEC-14** | Que faire des commandes actives lors suspension/changement d'affectation ? | Product + Legal + Ops | Transfert |
| **DEC-15** | Modalités de signature/consentement vendeur et conservation des preuves | Legal + Security | Checkout Négocié |
| **DEC-16** | Qualification juridique du Lanabaga par pays et documents obligatoires | Legal OHADA/local | Pilote commercial |
| **DEC-17** | Identité publique minimale et politique de carte/QR | Privacy + Brand | Carte publique |
| **DEC-18** | Conditions de retrait/recours du badge et SLA de réexamen | Risk + Ops | Badge |
| **DEC-19** | Politique de frais/retenues fiscales sur honoraires Lanabaga | Finance + Fiscaliste | Payout |
| **DEC-20** | Délai de conservation des journaux / preuves et transferts de données multi-pays | Privacy + Legal | Stockage |
| **DEC-21** | Comportement produit si vendeur refuse honoraires Négociés : sortie de Lanaya ou annulation du dossier ? | Product + Commercial | Négociation |
| **DEC-22** | Gestion des frais Lanaya sur paniers partiellement prépayés / COD | Payments + Legal | Modes paiement |
| **DEC-23** | Méthode d'attribution de parrainage vendeur en cas de recommandations concurrentes | Commercial + Ops | Acquisition |
| **DEC-24** | Gouvernance et publication de `Country Capabilities` pays par pays | CTO + Compliance | Expansion |
| **DEC-25** | Seuils d'approbation double et processus de reprise de commissions | Finance + Risk | Contrôles sensibles |

# 35. Définition de “Terminé” et conditions Go/No-Go

## 35.1 Définition du “Done” par fonctionnalité

Une fonction n'est terminée que si :

- parcours et états documentés et validés Product ;
- permissions serveur positives **et négatives** testées ;
- réutilisation / extension de l'existant conforme à l'inventaire Lot 0 ;
- schémas/événements/snapshots et règles d'idempotence couverts ;
- cas mobile, erreurs et actions non autorisées traités ;
- journaux exploitables, alertes et support Ops disponibles ;
- données sensibles masquées ;
- tests automatisés et recette manuelle associés aux ACC ;
- aucune régression checkout/paiement/produits/vendeur ;
- documentation de runbook et procédure de rollback fournie ;
- choix [CONFIG]/[HYPOTHÈSE]/[LEGAL GATE] non laissés implicitement au développeur.

## 35.2 Portes d'ouverture du pilote

| Gate | Preuve attendue | Feu vert donné par |
|---|---|---|
| **G-01 Audit** | Intégration schéma, frontend, PSP et événements existants étudiée | CTO |
| **G-02 Contrats** | Convention Lanabaga complétée, contrats vendeur et qualification juridique revus | Legal |
| **G-03 Payment** | Flux PSP autorisé, test complet de collecte/settlement/reprise | Finance + PSP + Legal |
| **G-04 Sécurité** | MFA, permissions, secrets, KYC et QR testés | Security/Privacy |
| **G-05 Transactions** | ACC seuil, consentement, participation, idempotence et remboursements verts | Backend + QA |
| **G-06 Opérations** | Équipe Ops et procédure incident/litige prêtes | Ops + Risk |
| **G-07 Produits** | UX seller/Lanabaga testée, textes de badge exacts et cohérents | Product + Brand |
| **G-08 Déploiement** | Flags, cohortes, monitoring, backup, rollback et dashboard KPI | DevOps + Product |

Un lancement peut être **partiel** : par exemple **affectations et suivi actifs** tandis que **payout automatique**, **badges publics**, **multi-Lanabagas** et **Négocié** restent désactivés. Mais **on ne peut pas facturer ou déduire des honoraires négociés tant que la preuve de consentement et le montage de règlement ne sont pas opérationnels et autorisés**.

## 35.3 Commande d'exécution au chef de projet / agent de développement

> **Mission : intégrer SUGU Lanaya au code SUGU en production. Commencer obligatoirement par inventorier l'existant. Produire un plan d'extension ciblé, tester les parcours natifs et implémenter les lots P0 un par un. Aucun refactoring massif, aucun wallet ou escrow maison, aucun moteur de scoring prédictif ni application de toutes les fonctionnalités P1/P2 sans validation. Une commande doit rester commercialement et financièrement correcte avant de devenir “Lanaya”. Les règles de paiement, de badge et de commission sont server-side, horodatées, versionnées, auditables et réversibles sous contrôle.**

---

## Annexe A — Matrice courte des écrans à préparer en design

| Produit | Écran / composant | Priorité |
|---|---|---|
| SuguPro | Module Lanaya (état vide, vue principale) | P0 |
| SuguPro | Choisir / accepter / changer Lanabaga principal | P0 |
| SuguPro | Proposition d'honoraires avec consentement vendeur | P0 |
| SuguPro | Mes Lanabagas, matrice produit/catégorie | P1 |
| SuguPro | Badge boutique/produit, état et progression | P1 |
| Espace Lanabaga | Onboarding, convention, contrôle de compte | P0 |
| Espace Lanabaga | Dashboard et cinq vendeurs actifs | P0 |
| Espace Lanabaga | Invitation / pipeline prospect vendeur | P0 |
| Espace Lanabaga | Commandes et preuves de participation | P0 |
| Espace Lanabaga | Proposition Négociée, estimation Standard | P0 |
| Espace Lanabaga | Relevés commissions / états | P0 |
| Espace Lanabaga | Statut badge et carte digitale QR | P0/P1 |
| Marketplace | Badge LANAYA informatif et fiche de preuve | P1 |
| Marketplace | Badge vendeur et filtre produits Lanaya | P1 |
| Administration | Candidatures, KYC, conventions, affectations | P0 |
| Administration | Dossiers commandes, consentement et exceptions | P0 |
| Administration | Finance et rapprochement commissions | P0 |
| Administration | Badges/Quality Gate, revue et révocation | P0/P1 |
| Administration | Country Packs, politiques versionnées et plan quotas | P0/P1 |

## Annexe B — Documents et artefacts à remettre par le prestataire de développement

1. **Rapport d'audit réel** de l'architecture SUGU et de ses dépendances ; diagrammes adaptés au dépôt.
2. **Décisions d'architecture** justifiant où chaque responsabilité Lanaya s'intègre.
3. **Cartographie données / migrations**, contraintes, index et historique.
4. **Contrats d'intégration** entre Lanaya, Orders, Catalog, Users, Subscriptions, PSP, Delivery, Disputes et Finance.
5. **Spécifications UX / états** et prototypes des écrans P0/P1 selon le design system existant.
6. **Matrice RBAC + ABAC** et jeux de tests négatifs par périmètre.
7. **Moteur de règles versionnées** et fichier de paramètres métier non codés en dur.
8. **Plan de paiement/rapprochement** validé par le PSP et Finance/Legal.
9. **Plan de sécurité et confidentialité**, rétention des preuves et procédure d'incident.
10. **Campagne de recette ACC-001 à ACC-070** et rapports d'exécution.
11. **Runbooks Ops/Finance/Risk**, gestion des exceptions, repli manuel et rollback.
12. **Plan de pilote**, critères de réussite, responsables et tableaux de bord.

## Annexe C — Trois invariants à afficher dans les revues produit et de code

**INVARIANT 1 — Confiance :** un badge Lanaya se **mérite** par la vérification, les commandes effectives et la qualité ; il ne s'achète pas.

**INVARIANT 2 — Argent :** le Lanabaga accompagne les transactions mais **ne contrôle jamais l'argent**, ne force pas une commission et ne débite pas un vendeur sans son consentement.

**INVARIANT 3 — Intégrité :** chaque ligne payable a un responsable et des règles **figées**, chaque rémunération a une base et une preuve, chaque changement laisse une trace ; aucune mise à jour de plan, de score ou d'affectation n'altère rétroactivement une commande verrouillée.

---

**FIN DU CAHIER DES CHARGES — SUGU LANAYA v1.0.**  
Document de travail destiné à l'analyse de l'implémentation et à la préparation des recettes. Les règles contractuelles et réglementaires applicables doivent être confirmées par les responsables compétents avant l'ouverture financière ou commerciale correspondante.
