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
