# SUGU Lanaya — Plan global de livraison (Lots 0 à 9)

Règle (cahier §32, mission §44) : un lot ne commence qu'après la validation du précédent et la levée de ses décisions bloquantes. Les lots non autorisés restent **planifiés, pas implémentés**. Les estimations sont des fourchettes établies après l'audit, avec leurs incertitudes ; elles se réestiment à l'ouverture de chaque lot.

Séquence (cahier §32.1) : **Audit → Identité / rôles → Affectations → Snapshots → Honoraires / consentement → Finance / versement → Badges / carte → Multi-Lanabagas → Score avancé → Expansion.**

| Lot | Contenu | Prérequis bloquants | Risque | Estimation | ACC | Gate de sortie | Statut |
|---|---|---|---|---|---|---|---|
| **0** | Audit, ADR, plan de données, permissions, contrats, maquettes, décisions | — | — | fait | — | CTO + lead backend + Produit + Finance | **Validé le 21/10/2026** |
| **1** | Identité, candidature, pièces, admission, suspension, convention enregistrée, prospects, invitations, origine, capacité (primitive), console admin, espace Lanabaga, entrée vendeur | Lot 0 validé ; DEC-05, DEC-16, DEC-20, DEC-23, DEC-28 ; convention v1.1 ; bucket KYC privé en staging pour la recette L4 | Moyen (sécurité, données personnelles) | 5 à 8 jours de développement et de recette locale ; +1 jour de recette staging après autorisation | 001-009, 014, 059, 060 (+ primitives de 015, 061, 065) | Produit + Security/Privacy (G-04 partiel) | **Livré et recetté en local (L3) le 21/10/2026** ; staging non autorisé ([qualification](LANAYA_LOT1_QUALIFICATION.md)) |
| **2** | Lanabaga principal gratuit par boutique, consentement d'affectation, suivi léger des commandes (lecture), participation documentée, tableaux de bord minimaux, participant de conversation de commande | Lot 1 ; DEC-14, DEC-27 ; événements natifs manquants (boutique suspendue, KYB retiré) | Moyen (périmètre d'accès aux commandes) | 6 à 10 jours | 010-013, 016, 037, 038, 063 | Produit + Ops | **Ouvert en partie le 21/10/2026, cette partie livrée et recettée en local** ([qualification](LANAYA_ASSIGNMENTS_QUALIFICATION.md)) ; messagerie vendeur ↔ Lanabaga et support du programme livrés le même jour (DEC-33 à DEC-37, [qualification](LANAYA_MESSAGING_QUALIFICATION.md)) ; le « participant de conversation de commande » est remplacé par cette messagerie (DEC-34) (DEC-29 à 32) : affectation d'un vendeur à un Lanabaga proposée par Ops, effective après l'accord du vendeur ; fin d'affectation ; sans effet financier |
| **3** | Contexte Lanaya par (commande, vendeur), VCL, attribution par ligne, régime Standard / Négocié calculé, snapshot à quatre versions, changements avant paiement | Lot 2 ; DEC-02, DEC-11, DEC-12 ; arbitrage Finance de R-07 (règles de catégorie ignorées au règlement) ; événement « commande créée » | **Élevé** (checkout) | 8 à 12 jours | 018-025, 030, 031, 067, 070 | CTO + Finance | **Ouvert en partie le 21/10/2026, cette partie livrée et recettée en local** (DEC-29, 31, 32) : Ops ajoute, retire ou réattribue un Lanabaga sur la part d'une boutique dans une commande non livrée, motif obligatoire, historique ; **aucun calcul ni snapshot** ; le reste du lot reste planifié |
| **4** | Proposition d'honoraires, bornes, exceptions, consentement vendeur authentifié, procédé papier contrôlé ; **aucun règlement déduit** | Lot 3 ; DEC-03, DEC-04, DEC-10, DEC-15, DEC-21, DEC-22 ; **[LEGAL GATE]** | **Élevé** (consentement, argent) | 8 à 12 jours | 026-036, 047 | Legal + Finance (G-02, G-03) | Planifié |
| **5** | Part Standard 20 % (lecture du grand livre), honoraires Négociés et frais 5 %, participation qualifiée, sous-registre d'obligations, rapprochement, export de versement validé | Lots 3-4 ; DEC-03, DEC-07, DEC-19, DEC-25 ; événement « commission acquise » | **Élevé** | 10 à 15 jours | 037-048, 066 | Finance + PSP + Legal (G-03, G-05) | Planifié |
| **6** | Badge Lanabaga manuel / assisté, historique, retrait, carte numérique et page de vérification QR ; score en observation seulement | Lot 5 ou données de commandes effectives fiables ; DEC-08, DEC-09, DEC-17, DEC-18 | Moyen (confiance, marque) | 6 à 9 jours | 049-058, 068 | Risk + Brand + Legal (G-07) | Planifié |
| **7** | Abonnements SuguPro Plus / Lanabaga Pro Plus, Quality Gate de capacité, affectations catégorie / produit, ventilation par ligne | Lot 3 fiable ; DEC-06, DEC-13 ; **système d'abonnement de plateforme à concevoir** (absent) | **Élevé** | à estimer avec le système d'abonnement | 011-017, 024, 055, 056 | Produit + Finance | Planifié |
| **8** | Badge boutique / produit dynamique, seuils calibrés, cache et index de recherche, score explicable si validé | Lot 6 + données du pilote | Moyen | 6 à 10 jours | 049-058 complétés | Risk | Planifié |
| **9** | Buyer Match, recherche avancée, ouverture Mali / Niger par Country Pack | Lots précédents ; DEC-24, DEC-26 ; contrats et corridors | Moyen à élevé | à cadrer | — | Direction + Compliance | Planifié |

## Lot 1 — découpage prévu (une fois autorisé)

Commits atomiques, chacun compilable et testé seul :

1. **Backend — socle** : migrations des 9 tables, modèles, Enums d'états, machines à états, `lanaya_events` append-only, politiques versionnées et capacités par pays (tout fermé).
2. **Backend — permissions** : permissions `lanaya.*`, rôles `lanaya-*`, exclusion du rôle `admin`, attribution réservée au super-admin, tests I-2 / I-4 étendus.
3. **Backend — candidature** : API candidat, pièces via `KycStorage`, consentements, soumission, retrait ; tests ACC-001, 061.
4. **Backend — décision** : revue, complément, admission, refus, suspension, réactivation, convention enregistrée et contrôlée ; tests ACC-002 à 006, 065.
5. **Backend — réseau** : prospects, invitations, acceptation, refus, révocation, expiration planifiée, origine, signaux de doublon, capacité (primitive concurrente) ; tests ACC-007 à 009, 014, 059, 060.
6. **Back-office** : pages Inertia/Vue Candidatures, Dossier, Réseau, Politiques ; tests de contrat Inertia et d'autorisation.
7. **Portail — session multi-espaces** : `spaces`, `RoleGuard`, sélecteur d'espace, navigation Lanabaga ; non-régression des trois espaces.
8. **Portail — espace Lanabaga** : candidature en étapes, tableau de bord, prospects, invitations, vendeurs, documents, conformité.
9. **Portail — entrée vendeur** : « Lanaya », aperçu et acceptation d'invitation.
10. **Recette** : doublure Playwright `e2e/lanaya`, captures aux six largeurs (375, 390, 768, 1024, 1280, 1440) vers `docs/captures/lanaya/lot1/`, comparaison avec les maquettes ; recette locale contre le vrai Laravel (seeder `QaLanayaSeeder`, identités fictives) ; qualification dans [LANAYA_LOT1_QUALIFICATION.md](LANAYA_LOT1_QUALIFICATION.md).

## Responsables (cahier §32.2)

| Fonction | Propriétaire | Approbation critique |
|---|---|---|
| Règles Lanaya | Product Owner | Direction produit |
| Intégration Laravel | Lead backend | CTO |
| Interfaces vendeur et Lanabaga | Lead frontend | Product Owner |
| Commandes, commissions, grand livre | Core Marketplace + Finance | Finance + CTO |
| Paiements et règlements | Responsable paiement + PSP | [LEGAL GATE] |
| Badges, sanctions | Risk / Compliance | Responsable Risk |
| Données personnelles | Privacy / Legal | Responsable conformité |
| Mise en production | DevOps | Go / No-Go collectif |
