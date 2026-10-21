# SUGU Lanaya — Qualification de la messagerie, du support du programme et des corrections de la messagerie

Ce document ne contient que des résultats **réellement exécutés**. Niveaux de preuve : **L2** test automatisé sur base de test ; **L3** recette locale contre le vrai Laravel, le vrai Reverb, le back-office compilé et les sites construits ; **L4** staging ; **L5** production. Aucune exécution L4 ni L5 : rien n'est poussé ni déployé.

## Ce qui a été demandé

Le 21 octobre 2026, après la cartographie de la messagerie : « Corrige tous ces bugs que tu viens de détecter et ensuite met en place le système de chat et ticket pour les Lanabaga ! Je veux que tu prennes les décisions toi-même, bien en sécurité qu'en stratégie (marketing, opérationnelle, managériale…). TU AS CARTE BLANCHE. »

Les décisions prises par délégation sont DEC-33 à DEC-37 ([registre](LANAYA_DECISIONS_REGISTER.md)), avec leurs raisons.

## 1. Les défauts de la messagerie, et leur sort

| Défaut relevé | Sort |
|---|---|
| « Contacter le vendeur » depuis une fiche produit répondait une erreur après avoir écrit ses deux messages, sans rien annoncer à la boutique | **corrigé** (la fermeture lisait `$user` sans le capturer) |
| Pièces jointes des conversations et des tickets sur le bucket public du CDN, adresse publique dans l'API | **corrigé** : disque privé, routes authentifiées, reprise des anciens fichiers (DEC-37) |
| Aucun filtre des numéros, e-mails, liens | **corrigé** : masqués entre acheteur et vendeur et entre vendeur et Lanabaga (DEC-36) |
| Chat de support de la marketplace : interrogation toutes les 5 s, temps réel inutilisé | **corrigé** : canal `support.chat.customer.{id}`, repli à 30 s seulement si le socket est coupé |
| Bouton « Contacter le support » du suivi de commande sans effet | **corrigé** : il ouvre le chat de support, avec la commande |
| Aucun écran ne liait une conversation à une commande | **corrigé** : « Contacter le vendeur » sur le suivi de commande, par boutique (le suivi nomme désormais les boutiques) |
| Envois en double côté acheteur (aucun identifiant) | **corrigé** : `client_message_id` pour les messages, les cartes produit et le chat de support |
| Seul le propriétaire d'une boutique lit ses conversations | **pas un défaut** : il n'existe pas de compte d'employé de boutique dans le modèle actuel |
| *Trouvés en chemin :* démarrer un chat de support avec une commande répondait 500 (colonne `user_id` inexistante) ; la page `/support-chat` affichait un téléphone, un WhatsApp et une disponibilité inventés ; le compositeur gardait le texte d'une conversation à l'autre | **corrigés** |

## 2. Ce qui est livré pour les Lanabagas

**Messagerie vendeur ↔ Lanabaga (DEC-33, DEC-34).** Une conversation par boutique confiée, ouverte par l'un ou l'autre (« Écrire » dans « Mes vendeurs », « Écrire à {Lanabaga} » dans « Programme Lanaya »), seulement pendant une affectation active ; fermée avec un message système quand l'accompagnement prend fin (vendeur, Ops ou transfert), la même rouverte s'il reprend. Le Lanabaga lit la boutique, jamais le téléphone du vendeur ni les conversations de la boutique avec ses acheteurs ; ni fermeture ni blocage dans le fil (le vendeur met fin à l'accompagnement) ; signalement des deux côtés ; temps réel sur `messaging.lanabaga.{userId}` ; compteur de non-lus dans le menu Lanabaga. Numéros, e-mails et liens externes masqués.

**Support du programme (DEC-35).** « Mes demandes » dans l'espace Lanabaga, ouvert à tout profil (candidat compris) ; un vendeur écrit au programme depuis ses tickets (« Programme Lanaya – mon Lanabaga » ou « – signaler un comportement »). Huit thèmes ; un signalement de comportement en priorité haute. Ces tickets sont ceux du support existant, lus par la seule équipe Lanaya (`lanaya.support.handle`, Ops et Compliance) : absents de la file, des compteurs et des adresses du support ordinaire, assignables à l'équipe seulement, réponse sous double authentification, jamais dans l'espace acheteur. L'équipe signe « Équipe Lanaya » ; le demandeur reçoit un e-mail sans le contenu de la réponse. Menu Lanaya › « Support » au back-office ; la fiche montre le thème et le « Demandeur ».

## 3. Tests réellement exécutés

### Backend (`sugu`)

| Suite | Résultat |
|---|---|
| `MessagingHardeningTest` (défauts de la messagerie : démarrage avec produit, envois rejoués, pièces privées et refus en production sans bucket privé, tickets acheteur, reprise des anciens fichiers, masquage et ce qui n'est pas masqué, chat de support lié à la commande, rejeu du chat, boutiques du suivi) | **12 verts** |
| `LanayaMessagingTest` (DEC-33, DEC-34 : parler après l'accord, rien sans affectation active, fermeture et réouverture, rien des acheteurs, Lanabaga suspendu) | **4 verts** |
| `LanayaSupportTest` (DEC-35 : candidat, priorité, isolement de l'espace acheteur, profil requis, équipe seule avec 2FA, e-mail sans contenu, vendeur) | **4 verts** |
| `QaLanayaSeederTest` (conversation et demandes de recette) | **7 verts** |
| Régression : Lanaya, Messagerie, Support, interface d'administration, seeder de production, stockage privé KYC et coursiers | **396 verts** (2 503 assertions, 753 s), aucun échec |
| Vitest du back-office (menu, 128 entrées) | **57 verts** |

### Portail (`sugu-saas`)

| Vérification | Résultat |
|---|---|
| `tsc --noEmit`, `eslint src e2e playwright.lanaya.config.ts` | aucune erreur |
| Vitest complet | **1 088 verts**, 59 fichiers |
| Playwright, doublure Lanaya | **37** : 36 verts au passage complet ; le 37ᵉ (conversation du Lanabaga) échouait sur un sélecteur du test (le texte figure dans la liste et dans le fil), corrigé et rejoué seul : vert. Six écrans nouveaux aux six largeurs |

### Marketplace (`sugu-marketplace`, branche `fix/messaging-hardening`)

| Vérification | Résultat |
|---|---|
| `tsc --noEmit` | aucune erreur |
| Vitest complet | **454 verts**, 46 fichiers (avant : 336 / 34) |
| `next build` | réussi (35 pages) |

### Recette locale contre le vrai Laravel et le vrai Reverb (L3)

Pile : base `sugu_recette` migrée (`2026_10_21_100800`), permissions resynchronisées, `QaLanayaSeeder` rejoué ; Reverb sur 8620 (le port 8080 est réservé par Windows ce jour-là ; portail construit avec ce port), API `php -S 127.0.0.1:8610` et `172.20.80.1:8611` pour la marketplace, portail `next start -p 3240`, marketplace `next dev -p 3260`.

| Test | Résultat |
|---|---|
| R1 à R10 (Lot 1, affectations) | verts |
| R11 conversation du Lanabaga lue au serveur, la boutique comme interlocuteur, aucun numéro du vendeur | vert |
| R12 demande répondue par l'équipe, signée « Équipe Lanaya » | vert au second passage (le premier visait un élément caché : défaut du test) |
| R13 demande d'un candidat ; pas de messagerie pour lui | vert |
| W1, W2 | verts |
| W3 | sans objet (aucune proposition en attente pour le vendeur A ce jour-là) |
| W4 vendeur B et son Lanabaga **en direct** : numéro masqué des deux côtés, chacun reçoit l'autre sans recharger (7 autorisations de canal au journal de l'API pendant le test) | vert au troisième passage : le premier a montré que **le tampon numérique du test (10 chiffres) était lui-même masqué comme un numéro** (le filtre fait son travail ; tampon passé en lettres), le deuxième visait aussi l'annonce pour lecteur d'écran du message reçu (sélecteur rendu exact) |
| W5 signalement de comportement déposé en priorité haute | vert |
| Back-office : le support ordinaire (`admin` sans rôle Lanaya) ne voit aucune demande du programme, ni par la liste, ni par le filtre ; l'équipe Lanaya y entre par son menu « Support », lit le thème et le demandeur, répond | vérifié en direct, captures |
| Marketplace : connexion, « Contacter le vendeur » depuis le suivi (conversation `order_support` de la commande), numéro masqué et l'auteur prévenu, avis au-dessus de la saisie, photo jointe **lue par le relais et non par le CDN** (`path` seul, `Cache-Control: private, no-store`, `nosniff`), chat de support ouvert depuis le suivi **lié à la commande en base** et envoyé une seule fois, page d'aide sans numéro inventé | **12 vérifications sur 12** |
| Base après la recette | dernière pièce jointe sur `messaging_private` ; chat de support `Commande #SU-2099-000090` avec `order_id` ; messages avec `client_message_id` |

Captures (non versionnées) : `docs/captures/lanaya/messagerie/recette-local/`, `…/back-office/`, `…/marketplace/`, `docs/captures/lanaya/affectations/doublure/`.

## 4. Commits

| Dépôt | Commits |
|---|---|
| `sugu` (`lanaya/lot0-lot1`) | `ed94fc04` pièces privées, envois rejoués, masquage · `d71cbe78` chat de support lié à une commande, rejeu, boutiques du suivi · `85064b0d` messagerie et support du programme · `4ea8aa2d` données de recette · `855b24af` codes d'erreur · `ffc3a086` PDF téléchargé · `77f1d6c5` thème et demandeur à la fiche |
| `sugu-saas` (`lanaya/lot0-lot1`) | `8ba5d80` espace Lanabaga de la messagerie, avis de masquage · `186754d` un écran de support, deux guichets · `cad9c75` Messages, demandes, « Écrire » · `0ec8c43` tests e2e · (documentation : ce commit) |
| `sugu-marketplace` (`fix/messaging-hardening`, depuis `v10/release-hardening`) | `0c3b17e` pièces par le relais, envois uniques, avis · `0586b7c` vendeur et support depuis le suivi, chat en temps réel · `2fd0860` aucun contact inventé |

## Déploiement (à faire dans cet ordre, sur autorisation)

1. Backend : `migrate` ; `ProductionRolesPermissionsSeeder` (il réécrit les permissions des rôles : `docs/PERMISSIONS_DEPLOY_RUNBOOK.md`) ; vérifier `R2_PRIVATE_BUCKET` ; `php artisan messaging:relocate-attachments` puis `--apply --purge-list=…` (`docs/MESSAGING_ATTACHMENTS_RUNBOOK.md`).
2. Une version de politique du pays qui ouvre `seller_assignment` (la messagerie vendeur ↔ Lanabaga suit l'affectation), approuvée par une seconde personne.
3. Portail, puis marketplace (la marketplace lit désormais les pièces par son relais : la déployer après le backend).
4. Doter l'équipe Lanaya : au moins une personne Ops et une Compliance avec la double authentification, avant d'annoncer « Mes demandes ».

## Limites connues

- **Promesses commerciales non vérifiées sur la marketplace** : un bandeau de confiance de toutes les pages annonce « Support 24/7 », « Livraison gratuite partout » et « 100 % Satisfaction – garantie de satisfaction totale » (`src/features/home/mocks/home.ts`, données de démonstration affichées en production), et la page Compte un badge « Support 24/7 ». Ce n'est pas un défaut de la messagerie : à confirmer ou retirer par le marketing (des frais de livraison existent). La politique de confidentialité porte un RCCM et un IFU de démonstration (`XXXXX`).
- **Pas de notification poussée au Lanabaga** (il n'a pas d'application) : le compteur du menu et le temps réel du portail ; e-mail seulement pour une réponse de l'équipe à une demande.
- **Pas d'affichage des délais** de réponse : l'objectif interne (2 jours ouvrés, 1 jour pour un signalement) est une recommandation d'équipe, pas une promesse à l'écran.
- **D'autres pièces privées restent sur le bucket public**, hors du périmètre demandé : photos de refus de livraison (`DeliveryVerification`), preuves de retrait (`StorePickup`), notes vocales de commande (`Order`). À traiter de la même manière.
- **Le Lanabaga n'entre dans aucune conversation acheteur** (DEC-34) : c'est voulu.
