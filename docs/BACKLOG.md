# Backlog technique — sugu-saas (frontend)

Dettes et décisions différées côté dashboards (vendeur / agence / coursier).

---

## SUGU-DEBT-AGENCY-LIST-CODMIXTE-VISIBILITY

Portée : **liste agence** ET **détail agence (partie Legacy)**.

1. **Liste** (`features/agency/services/deliveries.service.ts` →
   `_transformShipment` / `DeliveryRow`) : ne distingue pas **Mixte** de
   **Legacy** — le bloc `cod_mixte` n'est exposé que sur le détail
   (`DeliveryDetailRow`), faute de bloc `codMixte` dans
   `AgencyShipmentService::formatShipmentRow` côté backend pour la liste.
   Concerne aussi le panneau slide-over de la liste
   (`deliveries-content.tsx`, badge « • paid / • en attente »).

2. **Détail (Legacy)** (`app/(agency)/agency/deliveries/[id]/components/sections.tsx`,
   badge « Payé / En attente ») : le Chantier 5 masque ce badge pour le
   **Mixte** (la `AgencyCodMixtePaymentCard` porte l'info), mais ne peut pas
   distinguer **Legacy COD** d'un **prépayé en attente** — `DeliveryDetailRow`
   n'expose ni `is_cod` ni `cod_flow_type`. Un Legacy COD affiche donc encore
   « En attente » au lieu d'« À encaisser à la livraison ».

**Décision** : accepté pour le lancement (l'agence est un acteur **logistique**,
pas financier — la nuance Mixte/Legacy n'affecte pas son action d'assignation /
suivi). À évaluer post-lancement selon les retours opérationnels.

**Note de coordination backend** : le correctif des deux points est côté backend
(exposer `cod_mixte` sur `formatShipmentRow` pour la liste ; exposer `is_cod` /
`cod_flow_type` sur `formatShipmentDetail` pour le détail). Une fois ces signaux
disponibles, brancher le frontend comme pour le vendeur/coursier — cette dette
doit alors être reportée dans le backlog backend.

---

## SUGU-DEBT-DUPLICATE-FORMATCURRENCY

Trois fonctions de format monétaire coexistent avec des sémantiques divergentes :

- `src/lib/utils/index.ts` → `formatCurrency(amount)` : **ne divise pas** (entrée
  déjà en XOF), pas de suffixe.
- `src/features/agency/services/utils.ts` → `formatCurrency(centimes)` :
  **homonyme** mais divise par 100 avec `Math.round` (**lossy**), agency-scoped.
- `src/lib/utils/format-cents.ts` → `formatCentsToXof(cents)` : divise par 100,
  non-lossy, suffixe ` FCFA` (créé au Chantier 1, source de vérité visée).

**Risque** : les deux `formatCurrency` homonymes invitent à des erreurs ×100 au
call site (mauvais import, mauvaise hypothèse d'unité). Le Chantier 2 a déjà
remplacé le call site codMixte coursier par `formatCentsToXof`.

**Décision** : différé. Convergence vers `formatCentsToXof` (centimes) +
`formatCurrency` lib (XOF) à mener au fil des chantiers ; supprimer le
`formatCurrency(centimes)` agency lossy une fois ses call sites migrés. Pas de
big-bang dans ce chantier (hors portée coursier).
