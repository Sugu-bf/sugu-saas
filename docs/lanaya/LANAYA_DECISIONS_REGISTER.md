# SUGU Lanaya — Registre des décisions

Dérivé du cahier (§34, DEC-01 à DEC-25), complété par trois décisions relevées pendant l'audit (DEC-26 à DEC-28). **Le 21 octobre 2026, l'utilisateur a validé le Lot 0 « pour les 4 rôles » et tranché DEC-01, DEC-05, DEC-16 (démarrage), DEC-20 (provisoire), DEC-23 et DEC-28, ainsi que l'adaptation des maquettes 1 et 2 au style du back-office Vue.** Les autres restent ouvertes. Je n'invente pas les réponses : chaque ligne propose des options et une recommandation, la décision appartient au responsable indiqué.

Statuts : **Ouverte** (personne ne l'a tranchée) · **Préparée** (constat technique fait, options écrites) · **Validée** (décision écrite, datée, nommée).

---

## 1. Décisions qui bloquent l'ouverture du Lot 1

### DEC-01 — Inventaire des modèles et propriétaires des contrats

- **Responsable :** CTO. **Bloque :** tous les lots.
- **Constat :** inventaire fait ([LANAYA_INTEGRATION_AUDIT.md](LANAYA_INTEGRATION_AUDIT.md)) ; propriétaires de fait : Orders = `Domain/Checkout` + `Domain/Orders` ; commissions = `Services/Commission` + `Services/Settlement` + `Services/Ledger` ; back-office = Inertia/Vue.
- **Demandé :** valider le rapport et les ADR-01 à ADR-12, et nommer qui valide pour le lead backend, Produit et Finance.
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01, qui a déclaré valider « pour les 4 rôles » (CTO, lead backend, Produit, Finance).

### DEC-05 — Pays et secteurs pilotes, capacités ouvertes

- **Responsable :** Commercial + Risk. **Bloque :** admission.
- **Sources :** cahier §1.2 (« Démarrer au Burkina Faso »), §12.1 (paramètres du pilote Burkina Faso), §30.5 (10 à 20 Lanabagas, 30 à 50 vendeurs, hypothèse).
- **Options :** (a) Burkina Faso, capacités `candidate_onboarding` et `seller_invitation` en `pilot`, tout le reste fermé ; (b) idem + liste fermée de comptes autorisés à candidater.
- **Recommandation :** (a), secteurs de gros à nommer par Commercial ; Mali et Niger fermés.
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01 : option (a), Burkina Faso, `candidate_onboarding` et `seller_invitation` en `pilot`, tout le reste fermé. Les secteurs restent à nommer (aucun filtre de secteur au Lot 1).

### DEC-16 — Qualification juridique du Lanabaga et pièces obligatoires

- **Responsable :** Legal (OHADA / droit local). **Bloque :** pilote commercial, liste des pièces.
- **Constat :** la convention v1.1 et son annexe ne sont pas dans l'environnement ; la maquette 2 montre « justificatif de domicile » et « casier judiciaire ».
- **Options pour démarrer techniquement :** liste minimale provisoire (pièce d'identité + photo professionnelle), autres pièces ajoutées par une nouvelle version de politique sans code.
- **Demandé :** la convention v1.1 (fichier) et la liste écrite des pièces exigées par pays.
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01 pour le démarrage : liste minimale provisoire (pièce d'identité + photo professionnelle) ; la convention est enregistrée par sa référence et une copie signée contrôlée. Reste ouvert : la qualification juridique et la liste définitive (la convention v1.1 n'est toujours pas fournie).

### DEC-20 — Conservation des données et des preuves

- **Responsable :** Privacy + Legal. **Bloque :** stockage des pièces et des prospects en conditions réelles.
- **Constat :** aucune règle de conservation sur la plateforme ; `activity_log` jamais purgé.
- **Options :** fixer au moins des durées provisoires (pièces d'un dossier refusé, prospects non convertis) ; conserver les décisions et consentements.
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01 à titre provisoire : rien n'est effacé tant que les durées ne sont pas fixées ; la décision définitive reste ouverte (Privacy + Legal).

### DEC-23 — Recommandations concurrentes d'un même vendeur

- **Responsable :** Commercial + Ops. **Bloque :** origine d'acquisition.
- **Options :** (a) première invitation **acceptée par le vendeur** ; (b) première invitation émise ; (c) arbitrage Ops au cas par cas.
- **Recommandation :** (a) par défaut, toutes les invitations conservées, conflit signalé à Ops, qui peut trancher autrement avec motif. Rappel : l'origine ne donne aucun droit financier (cahier §7.3).
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01 : option (a).

### DEC-28 — Qui admet, et à combien de personnes *(nouvelle)*

- **Responsable :** Risk + Ops. **Bloque :** console d'admission.
- **Options :** (a) Compliance vérifie l'identité, Ops admet, deux personnes distinctes obligatoires ; (b) une seule personne habilitée suffit pendant le pilote.
- **Recommandation :** (a) ; si l'équipe pilote est trop petite, (b) avec contrôle a posteriori par Compliance.
- **Statut :** **Validée** le 21 octobre 2026 par l'utilisateur, dans la session de la mission 01 : option (a), deux personnes distinctes.

---

## 2. Toutes les décisions

| ID | Décision | Responsable | Lot | Constat technique | Statut |
|---|---|---|---|---|---|
| DEC-01 | Inventaire des modèles et propriétaires des contrats | CTO | tous | fait (audit) | **Validée** 21/10/2026 |
| DEC-02 | L'unité « commande vendeur » est-elle stable ? | Produit + Core Orders | 3 | **Non** : une commande par panier, au nom du premier vendeur ; l'unité par vendeur se dérive des lignes (test O-1) | Préparée |
| DEC-03 | Le PSP peut-il légalement et techniquement répartir vendeur / Lanabaga / SUGU, remboursements compris ? | Finance + PSP + Legal | 4-5 | aucune répartition chez LigdiCash, Moneroo ni SuguPay (L0) ; SUGU encaisse puis crédite des portefeuilles internes | Ouverte |
| DEC-04 | Le contrat vendeur autorise-t-il la déduction d'honoraires consentis ? | Legal + Produit | 4 | contrat vendeur non fourni | Ouverte |
| DEC-05 | Pays et secteurs pilotes | Commercial + Risk | 1 | voir §1 | **Validée** 21/10/2026 (pays ; secteurs à nommer) |
| DEC-06 | Prix et plafond de SuguPro Plus et Lanabaga Pro Plus | Produit + Finance | 7 | **aucun** système d'abonnement ; stub `premium/upgrade` | Ouverte |
| DEC-07 | Annexe A : délais, fréquence de paiement, réserve | Finance + Legal | 5 | règlement natif 72 h après livraison ; annexe non fournie | Ouverte |
| DEC-08 | Historique servant aux seuils de badge (10 vendeur, 3 produit) | Produit + Risk | 6 | aucune donnée de commande effective Lanaya avant le Lot 3 | Ouverte |
| DEC-09 | Preuve d'indépendance B2B et exception de concentration | Risk + Legal | 6 | aucune donnée de lien économique acheteur–vendeur | Ouverte |
| DEC-10 | Bornes de négociation bloquantes ou indicatives | Produit + Finance | 4 | — | Ouverte |
| DEC-11 | Exclusion des taxes, transport, coupons ; ventilation des remises | Finance + Orders | 3 | remise de ligne par vendeur existante ; **remise globale non ventilée** ; règlement sur `line_subtotal` avant remise | Préparée |
| DEC-12 | Dérogation pour une commande complexe < 5 M | Produit + Ops + Risk | 3 | — | Ouverte |
| DEC-13 | Négocié multi-Lanabagas : répartition et consentement par lot | Produit + Finance | 7 | commission native par boutique, pas par ligne : blocage technique pour la répartition par ligne (cahier §10.2) | Préparée |
| DEC-14 | Commandes actives lors d'une suspension ou d'un changement d'affectation | Produit + Legal + Ops | 2 | — | Ouverte |
| DEC-15 | Signature et consentement du vendeur, conservation des preuves | Legal + Security | 4 | aucun registre de consentement versionné sur la plateforme ; `lanaya_consents` proposé | Préparée |
| DEC-16 | Qualification juridique et pièces obligatoires | Legal | 1 | voir §1 | **Validée** 21/10/2026 pour le démarrage (liste minimale) ; qualification juridique ouverte |
| DEC-17 | Identité publique minimale, carte, QR | Privacy + Brand | 6 | code public non séquentiel prévu dès le Lot 1 | Préparée |
| DEC-18 | Retrait et recours du badge, délai de réexamen | Risk + Ops | 6 | — | Ouverte |
| DEC-19 | Frais et retenues fiscales sur honoraires | Finance + fiscaliste | 5 | — | Ouverte |
| DEC-20 | Conservation des journaux et preuves, transferts multi-pays | Privacy + Legal | 1 | voir §1 | **Validée** 21/10/2026 à titre provisoire (rien effacé) ; durées ouvertes |
| DEC-21 | Vendeur qui refuse les honoraires : sortie de Lanaya ou annulation ? | Produit + Commercial | 4 | — | Ouverte |
| DEC-22 | Frais Lanaya sur paniers partiellement prépayés ou COD | Payments + Legal | 4 | COD legacy et COD Mixte existent (frais de livraison et produit payés séparément) | Préparée |
| DEC-23 | Recommandations concurrentes | Commercial + Ops | 1 | voir §1 | **Validée** 21/10/2026 (option a) |
| DEC-24 | Gouvernance des capacités par pays | CTO + Compliance | 1 | politique versionnée à deux personnes proposée (ADR-06, ADR-07) | Préparée |
| DEC-25 | Seuils d'approbation double et reprise de commissions | Finance + Risk | 5 | — | Ouverte |
| **DEC-26** | Cadrage d'un espace de sourcing pour acheteurs de gros (maquette 9) | Produit | 9 | hors P0/P1 ; voir ci-dessous | Ouverte |
| **DEC-27** | Données d'un vendeur visibles par son Lanabaga ; canal de message direct vendeur–Lanabaga | Produit + Privacy | 2 | maquettes 3 et 5 : chiffre d'affaires, commandes, taux de retour, messagerie directe ; le cahier ne prévoit que les commandes dont le Lanabaga est responsable et une conversation par commande | Ouverte |
| **DEC-28** | Qui admet, à combien de personnes | Risk + Ops | 1 | voir §1 | **Validée** 21/10/2026 (option a) |

## 3. Décisions nouvelles, détail

### DEC-26 — Espace de sourcing pour acheteurs de gros

La maquette 9 décrit une demande d'achat (produit, quantité, ville, budget, besoin d'accompagnement, notes) et un suivi des demandes, avec recontact par l'équipe SUGU et, « lorsque disponible », accompagnement Lanaya. Le cahier P1 (§22) ne prévoit côté acheteur que le badge, sa fiche de preuve et un filtre ; la mise en relation acheteur–vendeur est le Buyer Match P2 (Lot 9). À trancher par Produit : objectif, qui traite les demandes, délai de réponse promis, données collectées, place de Lanaya, indicateurs. Rien n'est développé avant.

### DEC-27 — Ce que le Lanabaga voit d'un vendeur

Options : (a) au Lot 2, seulement ce que le cahier liste (statut, secteur, ville, produits couverts, commandes ouvertes dont il est responsable, activité récente) ; (b) en plus, des agrégats de vente des produits qu'il couvre, avec consentement du vendeur ; (c) tout le tableau de bord du vendeur (déconseillé). Même question pour une messagerie directe vendeur–Lanabaga hors commande. Recommandation : (a), puis (b) si le pilote le justifie.

## 4. Correspondance des statuts de prospect (maquette 6 → cahier §21.3)

| Maquette | Cahier | Qui le pose |
|---|---|---|
| Nouveau | prospect | Lanabaga |
| En discussion | contacté | Lanabaga |
| Invitation envoyée | invité | système (invitation créée) |
| Sans réponse | — (ajout) | Lanabaga ou système (invitation expirée) |
| Converti | inscrit → vérifié → activé → première vente | système, d'après la boutique |
