# SUGU Lanaya — Qualification

Ce document ne contient que des résultats **réellement exécutés**, avec leurs conditions de reproduction.

## État

**Le Lot 1 n'est pas commencé** : son gate d'entrée (validation du Lot 0, décisions DEC-05, DEC-16, DEC-20, DEC-23, DEC-28, convention v1.1) n'est pas satisfait. Aucune ligne de code du Lot 1 n'existe ; aucune admission, aucune invitation, aucun droit n'a été créé, même pour démonstration. Aucun critère ACC n'est donc vert à ce jour.

## Résultats exécutés le 21 octobre 2026 (Lot 0)

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

## Non exécuté

- Suites du portail (Vitest, Playwright) : aucun code du portail n'a changé dans ce lot (seulement des documents).
- Régression Pest complète (≈ 4 237 tests, ≈ 2 h 20 par dossiers) : inutile tant qu'aucun code applicatif ne change ; à lancer avant de proposer le Lot 1 au staging.
- Marketplace : aucun changement, aucun test lancé.
- Tout niveau L3 à L5.
