# SUGU Lanaya — tester le programme sur le staging

Pour la personne qui teste le programme à la main sur le staging. Tout ce qui est créé ici est fictif (personnes, téléphones, boutiques, pièces « PDF de démonstration »). Rien n'est payé, aucune commission n'existe.

## 1. Préparer le staging (une fois, sur le serveur du staging)

Après le déploiement du backend (commit `fix(lanaya): the programme shows only to linked sellers…` ou plus récent), dans le conteneur du **staging** :

```bash
php artisan db:seed --class=ProductionRolesPermissionsSeeder --force
php artisan permission:cache-reset
QA_SEED_PASSWORD='<12 caractères ou plus>' php artisan db:seed --class=QaProPortalSeeder --force
QA_SEED_PASSWORD='<le même>' php artisan db:seed --class=QaLanayaSeeder --force
```

- Les deux seeders `Qa…` refusent la production (`APP_ENV=production`).
- `QaLanayaSeeder` affiche à la fin la liste des comptes et ce qu'il a créé. Relancé, il ne duplique rien : un dossier déjà là est laissé tel quel (pour repartir de zéro, il faut une base vide : l'historique Lanaya ne s'efface pas).
- Sur le staging, les pièces (KYC, pièces jointes) sont sur le disque du conteneur tant que `R2_PRIVATE_BUCKET` n'y est pas réglé : elles disparaissent au déploiement suivant. Le contrôle de santé « Private Storage (R2) » le signale.

## 2. Les comptes

Mot de passe de tous : la valeur de `QA_SEED_PASSWORD`.

**Portail pro** (`https://pro-zk47m.sugu.pro`)

| Compte | Ce qu'il est | Pour tester |
|---|---|---|
| `qa-lanabaga@qa.sugu.test` | Lanabaga admis, convention valide ; sept prospects, invitations ouvertes, à échéance, acceptée, révoquée, expirée ; Lanabaga principal de la boutique B ; suit la commande `SU-2099-000090` | tableau de bord, prospects, invitations, « Mes vendeurs », messages, commandes suivies, « Mes demandes » |
| `qa-lanabaga-candidat@qa.sugu.test` | candidature en brouillon ; une demande en attente | compléter et envoyer un dossier, « Mes demandes » d'un candidat |
| `qa-lanabaga-revue@qa.sugu.test` | dossier envoyé, pièces à examiner | l'admission à deux, côté back-office |
| `qa-lanabaga-complement@qa.sugu.test` | SUGU lui a demandé un complément | remplacer une pièce refusée |
| `qa-vendeur-b@qa.sugu.test` | vendeur présenté par `qa-lanabaga`, boutique B confiée | menu « Lanaya », conversation avec son Lanabaga, tickets « Programme Lanaya » |
| `qa-vendeur-a@qa.sugu.test` | vendeur sans aucun lien avec le programme | ne voit rien de Lanaya ; puis reçoit une invitation ou une proposition |

**Back-office du staging** (son domaine d'administration) — la double authentification est demandée à la **première connexion** : enrôler une application d'authentification. Aucun secret n'est écrit dans le code.

| Compte | Rôle | Pour tester |
|---|---|---|
| `qa-lanaya-ops@qa.sugu.test` | `admin` + Lanaya Opérations | revue, admission, convention enregistrée, boutiques confiées, commandes attribuées, demandes du programme, propositions de politique |
| `qa-lanaya-conformite@qa.sugu.test` | `admin` + Lanaya Conformité | pièces d'identité, références, contrôle de la convention, suspension, approbation des politiques, demandes du programme |
| `qa-lanaya-commercial@qa.sugu.test` | `admin` + Lanaya Commercial | lecture seule : listes et réseau, ni décision ni pièce d'identité |

Deux navigateurs (ou une fenêtre privée) permettent d'avoir Ops et Conformité ouverts en même temps : les décisions à deux exigent deux personnes différentes.

## 3. Parcours à tester, dans cet ordre

1. **Ce que voit un vendeur sans lien.** `qa-vendeur-a` : pas d'entrée « Lanaya » dans le menu ; dans Support › Nouveau ticket, aucune catégorie « Programme Lanaya ». `qa-vendeur-b` : l'entrée « Lanaya » et les deux catégories sont là.
2. **Admission à deux.** Back-office › Lanaya › Candidatures › dossier de `qa-lanabaga-revue`. Conformité examine les pièces et les références, vérifie l'identité ; Ops admet. Puis Ops enregistre la convention et Conformité la contrôle. Une même personne ne peut pas faire les deux.
3. **Complément.** `qa-lanabaga-complement` (portail) remplace la pièce refusée ; le dossier revient en revue au back-office.
4. **Invitation.** `qa-lanabaga` crée une invitation pour la boutique A (Prospects ou Invitations) et copie le lien. `qa-vendeur-a`, connecté, ouvre le lien et accepte pour sa boutique. Ensuite `qa-vendeur-a` voit l'entrée « Lanaya » (au plus une minute plus tard, après un rechargement).
5. **Boutique confiée.** Ops : Lanaya › Candidatures › dossier de `qa-lanabaga` › « Confier une boutique » › boutique A, avec un motif. `qa-vendeur-a` (Lanaya) accepte la proposition. La boutique A apparaît dans « Mes vendeurs » de `qa-lanabaga`.
6. **Messagerie.** `qa-vendeur-b` › Lanaya › « Écrire à … », ou `qa-lanabaga` › Mes vendeurs › « Écrire ». Écrire un numéro (« 70 11 22 33 ») : il arrive masqué des deux côtés, l'auteur en est prévenu. Les deux fenêtres reçoivent les messages sans recharger.
7. **Commande attribuée.** Ops : Lanaya › Commandes › une commande non livrée de la boutique confiée › attribuer, motif obligatoire. Elle apparaît dans « Commandes suivies » de `qa-lanabaga`.
8. **Demandes du programme.** `qa-lanabaga` › Mes demandes › nouvelle demande ; `qa-vendeur-b` › Support › « Programme Lanaya – signaler un comportement » (priorité haute). Ops ou Conformité : Lanaya › Support, répondre ; le demandeur lit « Équipe Lanaya ». Un administrateur sans rôle Lanaya ne voit pas ces tickets dans le support ordinaire.
9. **Moindre privilège.** `qa-lanaya-commercial` : listes lisibles, aucun bouton de décision, aucune pièce d'identité.
10. **Fin d'accompagnement.** `qa-vendeur-a` › Lanaya › mettre fin à l'accompagnement : la conversation se ferme avec un message ; une nouvelle proposition la rouvre.

## 4. Ce qui n'existe pas encore (normal)

Aucun paiement, commission, portefeuille ni versement Lanabaga ; aucun badge public ; pas de notification poussée au Lanabaga (le compteur du menu et le temps réel du portail seulement) ; pas d'attribution automatique d'une commande au paiement.
