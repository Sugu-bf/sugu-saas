# SUGU Lanaya — Modèle de menace (Lot 1)

Périmètre : candidature, pièces, admission, suspension, prospects, invitations, mise en relation, console d'administration, politiques par pays. Les menaces financières (Lots 3 à 5) sont listées à la fin pour mémoire.

Méthode : pour chaque actif, qui pourrait l'attaquer, comment, la parade prévue, et le test qui la prouve. Gravité selon le registre de la mission (P0 à P3).

## 1. Actifs

| Actif | Pourquoi il compte |
|---|---|
| Pièces d'identité et photos des candidats | Données personnelles sensibles ; usurpation d'identité si elles fuient |
| Statut « Lanabaga admis » | Donne le droit d'approcher des vendeurs au nom de SUGU |
| Coordonnées des prospects (tiers non inscrits) | Données de personnes qui n'ont rien demandé |
| Jetons d'invitation | Rattachent une boutique à un Lanabaga |
| Origine commerciale d'une boutique | Base future de reporting et d'arbitrage |
| Politiques par pays | Ouvrent ou ferment des capacités |
| Historique des décisions | Preuve en cas de contestation |

## 2. Menaces et parades

| # | Menace | Acteur | Gravité | Parade | Preuve attendue |
|---|---|---|---|---|---|
| T-01 | Un administrateur quelconque consulte les pièces d'identité | Admin générique | P0 | Permissions `lanaya.kyc.*` exclues du rôle `admin` ; sortie par URL signée 15 min après contrôle ; ouverture journalisée | ACC-006, test du seeder |
| T-02 | Un opérateur s'attribue le rôle Compliance | Admin avec `admins.assign_roles` ou `users.update` | P0 | Rôles `lanaya-*` attribuables par super-admin seulement, jamais à soi | test négatif I-4 étendu |
| T-03 | Un vendeur-Lanabaga s'introduit lui-même ou approuve son propre dossier | Compte multi-rôle | P0 | Refus serveur sur toute ressource dont l'acteur est propriétaire ou bénéficiaire | ACC-005 |
| T-04 | Un Lanabaga lit les prospects, invitations ou vendeurs d'un autre | Lanabaga | P0 | Toutes les requêtes filtrées par le profil connecté ; identifiants ULID ; 404 (pas 403) sur la ressource d'autrui | ACC-059 |
| T-05 | Énumération : savoir si un téléphone est déjà vendeur SUGU en créant un prospect ou une invitation | Lanabaga, concurrent | P1 | Réponse identique que le numéro soit inscrit ou non ; le rapprochement de doublons n'est visible que d'Ops | test de réponse identique |
| T-06 | Jeton d'invitation deviné, rejoué, transféré | Tiers | P1 | 32 octets aléatoires, empreinte seule en base, usage unique, expiration, acceptation par un vendeur connecté propriétaire de la boutique | tests de jeton |
| T-07 | Hameçonnage : message d'invitation qui imite SUGU et pousse vers un faux lien ou un changement de compte de versement | Lanabaga malveillant | P1 | Message libre ≤ 300 caractères, liens et numéros retirés, gabarit SUGU fixe avec le seul lien officiel ; aucun parcours de versement dans l'invitation | test de nettoyage du message |
| T-08 | Envoi massif d'invitations (coût SMS, harcèlement) | Lanabaga | P1 | Plafond d'invitations ouvertes (politique), limite de débit **nommée** par Lanabaga, une invitation ouverte par numéro | tests de plafond |
| T-09 | Gonfler son portefeuille : faux vendeurs, boutiques multiples d'une même personne | Lanabaga | P1 | Au Lot 1 aucune capacité ne se consomme (pas d'affectation) ; les doublons sont signalés (`risk_signal`) ; KYB natif du vendeur inchangé | événements de signal |
| T-10 | Dépasser la capacité par deux acceptations simultanées | Lanabaga + vendeurs complices | P1 | Verrou `FOR UPDATE` du profil avant le décompte (ADR-12) | test concurrent ACC-014 |
| T-11 | Continuer d'agir après suspension | Lanabaga suspendu | P0 | État relu à chaque requête protégée ; jetons Sanctum non mis en cache ; invitations ouvertes du suspendu refusées à l'acceptation | ACC-003, ACC-065 |
| T-12 | Candidature déposée depuis un pays non ouvert | Candidat | P2 | Capacité `candidate_onboarding` du pays exigée à la création et à la soumission | ACC-061 |
| T-13 | Pièce piégée (fichier exécutable, PDF malveillant) | Candidat | P1 | Types et tailles validés (PDF, JPEG, PNG ≤ 5 Mo), contenu vérifié (`finfo`), servi `nosniff` et en pièce jointe hors types affichables ; antivirus si disponible (non disponible aujourd'hui, à signaler) | tests de dépôt |
| T-14 | Pièce perdue (stockage éphémère) | Exploitation | P1 | `KycStorage::assertWritable` refuse la production sans bucket privé ; staging à configurer (R-05) | contrôle `kyc-persistence` |
| T-15 | Politique modifiée par une seule personne pour ouvrir un pays | Ops | P1 | Ligne immuable ; approbation par une autre personne (CHECK base) | test `approved_by ≠ proposed_by` |
| T-16 | Effacement de la trace d'une décision | Opérateur | P1 | `lanaya_events` sans mise à jour ni suppression par le code ; aucune route | test du modèle |
| T-17 | Confusion d'espace : une action vendeur exécutée depuis l'espace Lanabaga ou l'inverse | Utilisateur multi-rôle | P2 | L'espace actif est celui de l'URL ; routes API distinctes (`/sellers/*`, `/lanaya/*`) avec leurs propres gardes | tests de garde de route |
| T-18 | Usurpation : quelqu'un se présente comme Lanabaga hors du programme | Tiers | P2 | Code public non séquentiel ; vérification publique par QR au Lot 6 ; au Lot 1, aucun document « carte » n'est produit | — |
| T-19 | Statut obsolète affiché dans le portail (cache du profil 60 s) | — | P3 | Le serveur décide ; le portail se relit après une action refusée | — |

## 3. Données personnelles

- Minimisation : seules les pièces exigées par la politique du pays sont demandées (DEC-16) ; la maquette d'administration montre un « casier judiciaire » : **non collecté** sans décision Legal explicite.
- Les coordonnées de prospects sont des données de tiers : déclaration du Lanabaga qu'il a l'accord de la personne, effacement après un délai (DEC-20), jamais exportées par le Lanabaga.
- Aucune donnée personnelle dans les journaux applicatifs, les événements (`payload` sûr) ni les messages de commit.

## 4. Pour mémoire : menaces des lots financiers (non traitées au Lot 1)

Double acquisition de commission par rejeu d'un événement (Lot 5) ; déduction d'honoraires non consentis (Lot 4) ; fractionnement d'une commande sous le seuil (Lot 3) ; changement de bénéficiaire de versement (Lot 5) ; achat de badge (Lot 6) ; carte révoquée encore présentée (Lot 6). Chacune a son critère ACC dans le cahier (§31.4 à §31.6).
