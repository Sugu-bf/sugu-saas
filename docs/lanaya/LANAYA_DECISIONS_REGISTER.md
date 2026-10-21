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
| **DEC-29** | L'admin peut-il rattacher et retirer des vendeurs d'un Lanabaga, et attribuer un Lanabaga à une commande ? | Produit | 2-3 | demande de l'utilisateur, 21/10/2026 | **Validée** 21/10/2026 : oui, les deux, **sans aucun effet financier** (ni commission, ni honoraire, ni versement) |
| **DEC-30** | Quand une affectation proposée par l'admin devient-elle effective ? | Produit + Legal | 2 | cahier §8 : après consentement et contrôles | **Validée** 21/10/2026 : après l'accord du vendeur, donné depuis « Programme Lanaya » |
| **DEC-31** | Sur quelles commandes l'admin ajoute, retire ou réattribue un Lanabaga | Produit + Ops | 3 | cahier §10, §29 : jamais de réattribution silencieuse d'une commande en cours | **Validée** 21/10/2026 : commandes non livrées seulement, motif obligatoire, historique gardé |
| **DEC-32** | Qui fait ces opérations au back-office | Ops + Security | 2-3 | — | **Validée** 21/10/2026 : Ops (`lanaya-ops`), permission dédiée, motif obligatoire, double authentification ; jamais le rôle `admin` seul |
| **DEC-33** | Messagerie directe vendeur ↔ Lanabaga (la partie « canal de message » de DEC-27) | Produit + Privacy + Security | 2 | demande de l'utilisateur, 21/10/2026 : « mets en place le système de chat » ; décision déléguée à Claude (« carte blanche ») | **Décidée par délégation** 21/10/2026 : oui, une conversation par boutique confiée, **seulement pendant une affectation active** ; le Lanabaga la perd à la fin, le vendeur la garde en lecture ; pas de fermeture ni de blocage dans le fil (le vendeur met fin à l'accompagnement) ; signalement possible des deux côtés |
| **DEC-34** | Le Lanabaga entre-t-il dans une conversation acheteur ↔ vendeur (« participant de conversation de commande », Lot 2) ? | Produit + Privacy | 2 | cahier §23.1, DEC-31 : ni acheteur ni montant | **Décidée par délégation** 21/10/2026 : **non** ; l'acheteur n'a rien consenti et ses données restent hors de portée ; le vendeur et son Lanabaga parlent d'une commande dans leur propre conversation |
| **DEC-35** | Support du programme : qui écrit, qui lit, quelle priorité | Ops + Security + Produit | 1-2 | demande de l'utilisateur, 21/10/2026 : « système de ticket pour les Lanabaga » ; délégation | **Décidée par délégation** 21/10/2026 : tickets du support existant (catégorie `lanaya`, un **thème** parmi 8, ou 3 pour un vendeur) ; ouverts à **tout profil Lanabaga**, candidat compris, et au vendeur au sujet de son Lanabaga ; lus par la **seule équipe Lanaya** (`lanaya.support.handle`, Ops et Compliance), réponse sous 2FA ; jamais dans l'espace acheteur ; signalement de comportement en priorité haute ; e-mail au demandeur **sans le contenu** de la réponse |
| **DEC-36** | Coordonnées dans les messages (numéros, e-mails, liens) | Security + Produit + Marketing | — | constat de l'audit du 21/10/2026 : aucun filtre | **Décidée par délégation** 21/10/2026 : masquées entre un acheteur et un vendeur et entre un vendeur et son Lanabaga (un numéro est un compte de paiement mobile : première arnaque hors plateforme) ; gardées en livraison et au support SUGU ; réglable par type (`config/messaging.php`) ; l'auteur est prévenu, rien de l'original n'est gardé |
| **DEC-37** | Stockage des pièces jointes de la messagerie et des tickets | Security + Ops | — | constat de l'audit : bucket public du CDN, adresse publique dans l'API | **Décidée par délégation** 21/10/2026 : disque privé (bucket des pièces KYC, préfixe `messaging/`), jamais d'adresse publique, refus en production sans bucket privé ; reprise des anciens fichiers par `messaging:relocate-attachments` (voir `../sugu/docs/MESSAGING_ATTACHMENTS_RUNBOOK.md`) |

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

### DEC-29 à DEC-32 — Affectations et attributions par Ops *(livrées le 21/10/2026, recette locale L3)*

Mise en œuvre et preuves : [LANAYA_ASSIGNMENTS_QUALIFICATION.md](LANAYA_ASSIGNMENTS_QUALIFICATION.md). Ce qui reste ouvert et n'a pas été tranché ici : la notification du vendeur et du Lanabaga (aucune n'est envoyée), l'attribution automatique au passage de commande (Lot 3), l'affectation par catégorie ou produit (Lot 7). Aucune de ces décisions n'ouvre un droit financier : le calcul, le snapshot et toute commission restent aux Lots 3 à 5.

### DEC-33 à DEC-37 — Messagerie, support et pièces jointes *(décidées par délégation le 21/10/2026, recette locale L3)*

L'utilisateur a écrit : « Corrige tous ces bugs que tu viens de détecter et ensuite met en place le système de chat et ticket pour les Lanabaga ! Je veux que tu prennes les décisions toi-même, bien en sécurité qu'en stratégie (marketing, opérationnelle, managériale…). TU AS CARTE BLANCHE. » Les décisions ci-dessus sont donc celles de Claude ; chacune reste révisable par l'utilisateur. Leurs raisons :

- **Sécurité.** Un Lanabaga n'a accès qu'à ce que sa mission exige : la conversation avec le vendeur qu'il accompagne, tant qu'il l'accompagne. Les numéros sont masqués parce qu'au Burkina Faso un numéro est un compte Orange Money ou Moov Money : « payez mes frais sur mon numéro » est exactement ce que le cahier interdit (§5 : un Lanabaga n'encaisse rien). Les demandes au programme touchent au dossier, à l'identité, à la conduite : elles restent à l'équipe Lanaya, comme les pièces KYC.
- **Opérations.** Un seul système de tickets (celui du support), une file filtrée « Programme Lanaya » dans le menu Lanaya, l'assignation limitée à l'équipe. Objectif interne proposé, non affiché aux utilisateurs : première réponse sous **2 jours ouvrés**, **1 jour** pour un signalement de comportement (priorité haute). À doter avant l'ouverture : au moins une personne Ops et une Compliance avec la 2FA.
- **Management.** Les échanges vendeur ↔ Lanabaga sont tracés et modérables : c'est la preuve d'un accompagnement réel (critère de qualité futur, Lot 6) et la défense d'un vendeur en cas de litige.
- **Marketing.** Le masquage est présenté comme une protection (« l'échange reste sur SUGU »), pas comme une interdiction ; aucune promesse de délai n'est faite à l'écran.

Restent ouvertes : les données de vente qu'un Lanabaga verrait d'un vendeur (le reste de DEC-27), les notifications push au Lanabaga (il n'a pas d'application), l'affectation par catégorie (Lot 7).

