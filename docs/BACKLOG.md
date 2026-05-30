# Backlog technique — sugu-saas (frontend)

Dettes et décisions différées côté dashboards (vendeur / agence / coursier).

---

## SUGU-DEBT-AGENCY-LIST-CODMIXTE-VISIBILITY

La **liste** agence (`features/agency/services/deliveries.service.ts` →
`_transformShipment` / `DeliveryRow`) ne distingue pas **Mixte** de **Legacy** :
le bloc `cod_mixte` n'est exposé que sur le **détail** (`DeliveryDetailRow`),
faute de bloc `codMixte` dans `AgencyShipmentService::formatShipmentRow` côté
backend pour la liste.

**Décision** : accepté pour le lancement (l'agence est un acteur **logistique**,
pas financier — la nuance Mixte/Legacy n'affecte pas son action d'assignation /
suivi). À évaluer post-lancement selon les retours opérationnels.

**Note de coordination backend** : si la visibilité Mixte devient nécessaire en
liste, la source du correctif est côté backend (`formatShipmentRow`), pas
frontend — cette dette doit alors être reportée dans le backlog backend.

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
