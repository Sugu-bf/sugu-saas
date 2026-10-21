# SUGU Lanaya — Revue des maquettes jointes à la mission 01

Neuf maquettes jointes le 21 octobre 2026, copiées dans `docs/captures/references/` (dossier non suivi par Git, à conserver) :

| # | Fichier | Écran | Taille |
|---|---|---|---|
| 1 | `lanaya-01-admin-dossier-candidature.png` | Dossier d'une candidature, avec décision | 1448 × 1086 |
| 2 | `lanaya-02-admin-candidatures.png` | Liste des candidatures (« Espace Admin ») | 1448 × 1086 |
| 3 | `lanaya-03-vendeur-mon-lanaya-mobile.png` | « Mon Lanaya » du vendeur, téléphone | 941 × 1672 |
| 4 | `lanaya-04-vendeur-programme-lanaya.png` | « Programme Lanaya » du vendeur, invitation et décision | 1448 × 1086 |
| 5 | `lanaya-05-lanabaga-fiche-vendeur.png` | Fiche d'un vendeur vue par le Lanabaga | 1448 × 1086 |
| 6 | `lanaya-06-lanabaga-prospects.png` | Prospects, invitation rapide, capacité | 1448 × 1086 |
| 7 | `lanaya-07-lanabaga-candidature.png` | Candidature en cinq étapes | 1448 × 1086 |
| 8 | `lanaya-08-lanabaga-tableau-de-bord.png` | Tableau de bord du Lanabaga | 1448 × 1086 |
| 9 | `lanaya-09-acheteur-achat-en-gros-mobile.png` | Demande d'achat en gros, téléphone | 941 × 1672 |

**Comment je les utiliserai au Lot 1** (règle des phases précédentes : la conformité écran par écran est le critère d'achèvement) : composition, ordre des blocs, libellés et hiérarchie repris de la maquette ; données réelles seulement ; et les règles posées au-dessus des maquettes restent au-dessus : cahier des charges (une maquette ne prévaut jamais sur une règle, mission §3), pastilles et boutons entièrement arrondis, indicateurs sobres (icône au trait, chiffre, libellé, aucune pastille de tendance), rien de factice, Foundation sans second design system. Les écarts ci-dessous sont proposés ; ceux marqués **[à confirmer]** attendent votre avis.

---

## Constats transverses

1. **Ordre du parcours.** La maquette 7 place « Convention » en étape 4, avant « Validation », tout en écrivant « Signature après validation ». La mission (§25) fixe : candidature → pré-vérification → revue → admission → convention valide → activation. Je suis la mission : la convention vient **après** l'admission, la maquette 1 n'affiche donc pas « Convention signée » pendant la revue.
2. **Le back-office n'est pas le portail.** Les maquettes 1 et 2 dessinent un « Espace Admin » dans le cadre du portail Pro (et la maquette 1 dans celui de l'espace Lanabaga). Le vrai back-office est l'application Laravel + Inertia + Vue, avec son propre contrat visuel (`sugu/DESIGN.md` : dense, neutre, « pas de cartes de synthèse génériques ni de titres surdimensionnés »). Proposition : **mêmes informations et même organisation que les maquettes, primitives et densité du back-office**. **[à confirmer]**
3. **Un Lanabaga ne décide jamais d'une candidature.** La maquette 1 met les boutons Approuver / Refuser dans l'espace Lanabaga : cet écran n'existe qu'au back-office, sous permission `lanaya.applications.decide`.
4. **Badge « Vérifié ».** Les maquettes 3, 4 et 8 affichent un Lanabaga « Vérifié » ou un « Badge en revue ». Le badge n'existe qu'au Lot 6, sur conditions (cahier §16.2, §17.5). Au Lot 1 : « Lanabaga admis par SUGU » (sobre, sans le style d'un badge) ; jamais « Vérifié ».
5. **Promesses.** « Plus de visibilité pour vos produits », « Une meilleure visibilité de vos produits sur la marketplace » (maquette 4) promettent un avantage que le cahier ne définit pas et qu'aucune fonction ne délivre. Retirées ; remplacées par ce que le programme fait réellement (accompagnement, interlocuteur identifié) et ce qu'il ne fait pas (« n'est pas une garantie, ni une assurance », cahier §22.4).
6. **Consentement.** La case « J'accepte d'être accompagné… » est **pré-cochée** (maquette 4) et la décision « Approuver » est **présélectionnée** (maquette 1). Interdit (cahier §13.3 : action positive, jamais pré-cochée). Les deux s'affichent non cochés.
7. **Recherche globale (⌘K) et cloche** (maquettes 1, 2, 5, 6, 8) : n'existent pas pour cet espace. Au Lot 1, une recherche **réelle** sur ses propres prospects et vendeurs est faisable et sera faite ; la cloche attend des notifications Lanabaga. Rien de dessiné sans fonction.
8. **Chiffres d'exemple.** Tous les nombres des maquettes (28 dossiers, 245 000 F, 3/5…) sont des exemples. Au Lot 1 les vendeurs « actifs » sont **0** pour tout le monde : les affectations n'arrivent qu'au Lot 2. Le tableau de bord l'affiche honnêtement.

---

## Écran par écran

### 1 — Dossier de candidature → back-office `/admin/lanaya/applications/{id}`

| Élément de la maquette | Lot 1 |
|---|---|
| Titre, pastille d'état, date de réception, numéro de dossier | Gardé ; numéro = code public `LNB-…`, pas `#LAN-2024-0012` séquentiel |
| Boutons « Demander un complément », « Refuser », « Approuver » | Gardés selon permission ; « Approuver » désactivé avec la raison tant que l'identité n'est pas vérifiée et que la décision n'est pas motivée |
| Identité : photo, nom, « Compte existant », téléphone, date, ville, pays, spécialités, compte lié + « Compte vérifié » | Gardé ; « Vendeuse Lanabaga · ID VEN-… » remplacé par « Compte SUGU : vendeur (boutique X) » si c'est le cas ; la photo ne s'affiche qu'avec `lanaya.kyc.view` |
| « Modifier » l'identité du candidat | **Retiré** : l'opérateur ne réécrit pas ce que le candidat a déclaré ; il demande un complément |
| Références fournies, statut « Référence validée » / « Contactée », date de vérification | Gardé (`lanaya.references.verify`) |
| Historique des actions | Gardé, lu dans `lanaya_events` |
| Documents avec vignettes, statut, « Voir », menu | Gardé pour Compliance ; sans `lanaya.kyc.view` : « Pièce d'identité — accès réservé à la Conformité », aucune vignette |
| Conformité & critères : KYC, consentement, convention, pays pilote | Gardé : identité, consentements, convention (« après admission » pendant la revue), capacité du pays |
| Décision : trois choix + motif obligatoire + « Valider la décision » | Gardé, **aucun choix présélectionné**, motif = code de la liste + note ; les boutons du haut ouvrent ce même panneau |

### 2 — Liste des candidatures → back-office `/admin/lanaya/applications`

| Élément | Lot 1 |
|---|---|
| Menu « Lanaya » : Candidatures, Conformité, Réseau | Gardé, ajouté au menu existant du back-office (+ « Politiques ») |
| Quatre indicateurs (en attente, à compléter, approuvés ce mois, suspendus) | Gardés, comptés par le serveur ; **sans** « +12 % » ni « +18 % » **[à confirmer** : règle de sobriété du portail, le back-office a la sienne] |
| Onglets avec compteurs, recherche, filtres Statut, Pays, Ville | Gardés |
| Filtre et colonne « Niveau de risque », « Évaluation : Faible » | **Retirés** : aucun score de risque au Lot 1 (cahier §16 : pas de score non calibré) ; remplacés par le filtre « Identité » |
| Colonnes Candidat, Téléphone, Ville, KYC, Convention, Statut, Dernière mise à jour, Actions | Gardées ; « Convention » affiche « — » avant l'admission |
| Cases à cocher de ligne | **Retirées** : aucune action groupée n'est prévue |
| « Exporter » | **Retiré** au Lot 1 : export de données personnelles non prévu, à décider (cahier §23.7) |
| « Nouvelle candidature » | Retiré au Lot 1 ; utile pour une candidature papier du pilote : **[à confirmer]** |
| Panneau « Résumé du dossier » avec étapes | Gardé ; étapes = déposé, en revue, décision, convention |
| Pièces « Justificatif de domicile », « Casier judiciaire » | **Non collectées** sans décision Legal (DEC-16, minimisation) ; la liste vient de la politique du pays |

### 3 — « Mon Lanaya » du vendeur, téléphone → portail `/vendor/lanaya`

| Élément | Lot 1 |
|---|---|
| « Votre Lanabaga dédié » | **Lot 2** (affectation). Au Lot 1 : « Lanabaga qui vous a présenté SUGU », s'il y a une invitation acceptée |
| Badge « Vérifié » | Retiré (constat 4) |
| « Envoyer un message » | Non dessiné : il n'existe pas de conversation vendeur–Lanabaga, et le cahier ne prévoit l'accès qu'à une conversation de commande (§21.9). Canal direct à décider (DEC-27) |
| « Accompagnement de ma boutique » (boutique activée, produits publiés, première commande, suivi) | Lot 2 ; données réelles de la boutique, calculables |
| « Actions recommandées » (description, publier 3 produits) | Lot 2 ; « Programmer un appel » non dessiné (aucune prise de rendez-vous) |
| « Activité récente », « Prochain rappel demain » | Historique réel gardé au Lot 2 ; rappels non dessinés |

### 4 — « Programme Lanaya » du vendeur, bureau → portail `/vendor/lanaya`

| Élément | Lot 1 |
|---|---|
| En-tête « Programme Lanaya » et explication | Gardé |
| Bandeau illustré (dégradé pêche, illustration de deux personnes) | **[à confirmer]** : aucune illustration dans Foundation et vos règles écartent la décoration ; proposition : même bandeau sans dégradé, avec une illustration fournie par vous ou sans illustration |
| Trois avantages « Plus de visibilité », « Accompagnement », « Partenaire de confiance » | « Plus de visibilité » retiré (constat 5) |
| Carte du Lanabaga : nom, ville, spécialités, « Voir le profil », « Contacter » | Gardé sans « Vérifié » ; « Contacter » non dessiné (comme la maquette 3) |
| « Décision du vendeur » : liste de bénéfices, case pré-cochée, Refuser / Accepter l'accompagnement | Gardé en **acceptation d'invitation** : choix de la boutique si plusieurs, case non cochée, libellé exact « Accepter la mise en relation » ; l'accompagnement actif (affectation) vient au Lot 2 après contrôle SUGU |
| « Ce que cela change » | Gardé, avec la limite : « ce n'est ni une garantie, ni une assurance, aucun frais au Lot 1 » |
| Historique (invitation reçue, consentement donné, relation active) | Gardé ; « Relation active » au Lot 2 |

### 5 — Fiche vendeur vue par le Lanabaga → portail `/lanabaga/sellers/{id}`

| Élément | Lot 1 |
|---|---|
| Nom de la boutique, « Active », « Rattachée à vous », « Voir la boutique » | Gardé (« Présentée par vous » au Lot 1, « Rattachée à vous » au Lot 2) |
| Ville, catégorie, date d'activation | Gardé (données publiques de la boutique) |
| « Commandes 30 jours 18 », « Ventes 30 jours 245 000 F », « Taux de retour 5,6 % », graphique | **Retirés** : le cahier ne donne au Lanabaga ni le chiffre d'affaires ni les commandes d'un vendeur, seulement les commandes dont il est responsable (§21.2, §21.4, Lot 2+). À décider (DEC-27) |
| Résumé du vendeur et « Modifier » | Coordonnées que le Lanabaga a saisies pour son prospect ; « Modifier » ne touche que sa fiche prospect, jamais la boutique |
| Progression de la boutique (créée, produits publiés, première commande, KYC vendeur) | Lot 2 ; étapes sans montant |
| Suivi commercial : notes, prochain rappel, priorité | Notes privées autorisées par le cahier (§21.9) ; non prévues au Lot 1 **[à confirmer]** |
| « Convention vendeur signée » | **Retiré** : le vendeur ne signe pas de convention Lanaya ; il consent à une mise en relation puis à une affectation |

### 6 — Prospects → portail `/lanabaga/prospects`

| Élément | Lot 1 |
|---|---|
| Trois indicateurs (prospects actifs, invitations en attente, taux de conversion) | Gardés, calculés sur ses propres prospects |
| Onglets Prospects / Invitations / Vendeurs | Gardés (ce sont aussi des entrées du menu : les onglets mènent aux mêmes pages) |
| Tableau, filtres Statut, Ville, Période, recherche, « Ajouter un prospect » | Gardés. Statuts : Nouveau, En discussion, Invitation envoyée, Sans réponse, Converti (correspondance avec le cahier §21.3 dans le registre) |
| « Invitation rapide » : nom, téléphone (+226), « Boutique * » (liste), ville, message | Gardé ; « Boutique » devient « Nom de l'entreprise » (texte) : une liste des boutiques existantes révélerait qui est déjà vendeur (menace T-05) |
| Message prérempli « Rejoignez notre réseau… sur Lanabaga » | Remplacé : on rejoint **SUGU**, pas le Lanabaga ; gabarit SUGU fixe + mot personnel sans lien (menace T-07), compteur 0/300 gardé |
| « Capacité actuelle 3/5 » en anneau | Gardé, valeur du serveur (0/5 au Lot 1) |

### 7 — Candidature → portail `/lanabaga/application` (et `/signup/lanabaga` pour un nouveau compte)

| Élément | Lot 1 |
|---|---|
| Cinq étapes Profil, Identité, Références, Convention, Validation | Gardées dans l'ordre de la mission : Profil, Identité, Références, Validation, Convention (après admission) |
| « Profil complété à 80 % » | Gardé, calculé sur les champs et pièces exigés |
| Sous-titre « en tant que vendeur professionnel » | Corrigé : un Lanabaga n'est pas un vendeur |
| Informations professionnelles (nom, téléphone, ville, pays, spécialités, expérience) | Gardé ; nom et téléphone viennent du compte (vérifiés) |
| Documents requis (pièce d'identité, photo, lettres de référence), formats PDF, JPG, PNG, 5 Mo | Gardé ; liste fixée par la politique du pays (DEC-16) |
| Deux références (nom, entreprise, téléphone, relation) | Gardé |
| Encadré « Convention : signature après validation » | Gardé |
| Pied collant « Enregistrer le brouillon » / « Continuer » | Gardé, sans recouvrir le contenu ni la barre du téléphone |
| Menu complet de l'espace (Mes vendeurs, Prospects…) visible par un candidat | **Retiré** : un candidat ne voit que sa candidature (ACC-001) |

### 8 — Tableau de bord du Lanabaga → portail `/lanabaga/dashboard`

| Élément | Lot 1 |
|---|---|
| « Bonjour, … » + « Compte admis » | Gardé |
| Vendeurs actifs 3/5, invitations en attente, actions requises, capacité disponible | Gardés, sobres, valeurs du serveur |
| Mes vendeurs (tableau) | Gardé : vendeurs présentés au Lot 1 ; téléphone affiché = celui saisi par le Lanabaga |
| Actions prioritaires : convention à signer, invitation en attente | Gardé |
| « Document d'identité à compléter … le dossier de Kalifa Traoré » | **Reformulé** : le Lanabaga ne recueille pas les pièces du vendeur ; « la boutique X attend ses pièces (le vendeur les dépose lui-même) » au Lot 2 |
| Graphique « Activité récente » | **Retiré** au Lot 1 (toujours vide, et la mission demande de ne pas surcharger l'accueil) |
| Prospects récents | Gardé |
| Statut Lanaya : convention, KYC, « Badge en revue » | Gardé sans badge : « Niveau : Nouveau » (cahier §21.7) |
| *(absent de la maquette)* Bloc « Commissions et honoraires » | **Ajouté**, exigé par le cahier §21.1 et la mission §26 : « Pas encore ouvert : aucune commission n'est calculée pendant cette phase », sans aucun montant |

### 9 — Demande d'achat en gros (acheteur, téléphone)

Hors du périmètre P0/P1 : c'est le **Buyer Match** du Lot 9 (P2). Fonctions décrites par la maquette et absentes du cahier P1 : formulaire de besoin (produit, quantité, ville, budget, besoin d'accompagnement, notes), suivi des demandes (reçue, en cours, clôturée), recontact par l'équipe SUGU. La mention « Ce service n'est pas une garantie de transaction » est conforme à l'esprit du cahier. Cadrage proposé en décision produit DEC-26 ; **non développé**.

---

## Navigation proposée de l'espace Lanabaga (d'après les maquettes 5 à 8)

Bureau : Tableau de bord · Mes vendeurs · Prospects · Invitations · Ma candidature · Documents · Conformité · Paramètres, puis « Besoin d'aide ? ». Téléphone (quatre onglets + Menu) : Accueil · Vendeurs · Prospects · Dossier. Candidat non admis : « Ma candidature » et « Documents » seulement.
