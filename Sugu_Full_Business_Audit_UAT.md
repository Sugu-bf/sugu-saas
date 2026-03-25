# 📋 SUGU SaaS — Audit Business Complet & UAT
**Version :** 2.1.0 — Audit complet vérifié  
**Date :** 2026-03-22 (mise à jour 03:38 UTC)  
**Auteur :** Expert System Architect & Lead QA  
**Périmètre :** SaaS Pro (pro.sugu.pro) — Agence, Vendeur, Coursier  
**Source :** Audit complet du codebase `sugu-saas` (Next.js 16 / React 19)

---

## 📌 Légende des Statuts

| Symbole | Signification |
|---------|---------------|
| ⬜ | Non testé |
| ✅ | Passé |
| ❌ | Échoué |
| ⚠️ | Bloquant partiel |
| 🔁 | À retester |

---

# 🏢 MODULE 1 — AGENCE DE LIVRAISON
> **Routes :** `/agency/dashboard`, `/agency/deliveries`, `/agency/drivers`, `/agency/messages`, `/agency/settings`, `/agency/statistics`

---

## 1.1 — Connexion & Authentification

**Identifiant :** UAT-AG-AUTH  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Accès sécurisé à l'espace Agence via identifiants.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Ouvrir `pro.sugu.pro` → Page de connexion affichée | Formulaire e-mail + mot de passe visible |
| 2 | Saisir les identifiants de l'agence → Cliquer **Se connecter** | Redirection automatique vers `/agency/dashboard` |
| 3 | Tenter une connexion avec un mauvais mot de passe | Message d'erreur clair affiché sous le formulaire |
| 4 | Fermer le navigateur et rouvrir la page | Session restaurée automatiquement (cookie httpOnly) |
| 5 | Cliquer sur **Déconnexion** dans le menu utilisateur | Retour à la page de connexion, session effacée |

---

## 1.2 — Tableau de Bord Agence

**Identifiant :** UAT-AG-01  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Vue centralisée des performances opérationnelles en temps réel.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Tableau de bord** | Page chargée avec 4 KPI cards : Livraisons aujourd'hui, Taux de réussite, Temps moyen, Revenus du jour |
| 2 | Consulter la carte **Livraisons aujourd'hui** | Nombre exact de livraisons créées aujourd'hui affiché |
| 3 | Consulter la carte **Taux de réussite** | Pourcentage avec 1 décimale affiché + anneau de progression coloré |
| 4 | Consulter la carte **Temps moyen** | Durée moyenne au format "Xh YY" ou "YY min" |
| 5 | Consulter la carte **Revenus du jour** | Montant en FCFA + badge de croissance (ex: ↗ +12%) |
| 6 | Consulter la section **Livraisons actives** | Liste des courses en cours avec coursier, adresses, statut, ETA |
| 7 | Consulter la section **Performance des livreurs** | Top livreurs classés par taux de réussite décroissant |
| 8 | Consulter la section **Réclamations récentes** | Liste des 5 derniers tickets clients liés à l'agence |
| 9 | Consulter la **carte interactive** | Pins colorés sur la carte représentant les coursiers actifs |

---

## 1.3 — Gestion des Livraisons

**Identifiant :** UAT-AG-02  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Suivi, assignation et gestion complète de toutes les expéditions de l'agence.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Livraisons** | Page chargée avec barre de résumé (Total, En attente, En cours, Livrées, Échouées) |
| 2 | Consulter la liste des livraisons | Tableau paginé avec colonnes : Référence, Client, Coursier, Itinéraire, Statut, ETA, Priorité |
| 3 | Cliquer sur l'onglet **En attente** | Liste filtrée aux seules livraisons sans coursier assigné |
| 4 | Cliquer sur l'onglet **En route** | Liste filtrée aux livraisons en transit |
| 5 | Utiliser la barre de recherche | Résultats filtrés en temps réel par référence ou nom de client |
| 6 | Filtrer par **Date** | Liste restreinte aux livraisons de la date sélectionnée |
| 7 | Filtrer par **Priorité** (Urgent/Normal/Faible) | Liste triée en conséquence |
| 8 | Filtrer par **Coursier** | Liste restreinte aux livraisons du coursier sélectionné |
| 9 | Cliquer sur une livraison | Panneau latéral de détail ouvert : client, articles, adresses, timeline, notes |
| 10 | Dans le détail → **Assigner un coursier** | Liste déroulante des coursiers disponibles, sélection + confirmation |
| 11 | Dans le détail → **Changer le statut** | Menu déroulant : En attente / Ramassage / En route / Livré / Échoué |
| 12 | Dans le détail → **Ajouter une note interne** | Zone de texte + bouton Enregistrer, note apparaît dans la timeline |
| 13 | Sélectionner plusieurs livraisons (checkboxes) → **Assigner en masse** | Toutes les livraisons sélectionnées reçoivent le même coursier |
| 14 | Sélectionner plusieurs livraisons → **Changer statut en masse** | Toutes mises à jour simultanément |
| 15 | Cliquer sur **Exporter CSV** | Téléchargement d'un fichier `.csv` avec toutes les livraisons filtrées |

---

## 1.4 — Création Manuelle d'une Livraison

**Identifiant :** UAT-AG-03  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Créer une livraison hors commande marketplace (client externe/téléphonique).

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu Livraisons → Bouton **Nouvelle livraison** | Formulaire wizard en 3 étapes affiché |
| 2 | **Étape 1** : Remplir informations commande (nom vendeur, nb articles, montant, statut paiement, notes) | Champs validés, passage à l'étape 2 activé |
| 3 | **Étape 2** : Adresse de collecte (libellé + téléphone) + Adresse de livraison (libellé + téléphone + client + instructions) | Adresses et contacts enregistrés |
| 4 | **Étape 3** : Sélectionner un coursier disponible (liste en temps réel), choisir priorité (Urgent/Normal/Faible), saisir montant livraison, mode de paiement, créneau horaire optionnel | Récapitulatif complet affiché |
| 5 | Cliquer **Créer la livraison** | Livraison créée, apparaît dans la liste avec statut "En attente" |
| 6 | Choisir **Assigner plus tard** (sans curseur) | Livraison créée sans assignation, `courier_id` null |

---

## 1.4b — Page Détail d'une Livraison (Agence)

**Identifiant :** UAT-AG-03B  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Vue dédiée `/agency/deliveries/{id}` avec informations complètes et actions de gestion.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Cliquer sur une livraison → Naviguer vers `/agency/deliveries/{id}` | Page dédiée chargée avec toutes les informations |
| 2 | Consulter le **bloc commande** | Référence, vendeur, nb articles, montant, statut paiement |
| 3 | Consulter le **bloc itinéraire** | Points de collecte et de livraison avec coordonnées |
| 4 | Consulter le **bloc coursier assigné** | Nom, téléphone, véhicule, note |
| 5 | Consulter la **timeline de statut** | Historique chronologique : affecté → collecte → en route → livré |
| 6 | Bouton **Réassigner le coursier** | Liste des coursiers disponibles → nouvelle assignation |
| 7 | Bouton **Changer le statut** | Menu avec tous les statuts possibles |
| 8 | Bouton **Retour** | Retour vers `/agency/deliveries` avec filtre préservé |

---

## 1.5 — Gestion de la Flotte (Coursiers)

**Identifiant :** UAT-AG-04  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Vision complète de tous les coursiers avec actions de gestion.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Coursiers** | Page chargée avec résumé (Total livreurs, Actifs, Note moyenne, Taux de réussite) |
| 2 | Consulter la liste des coursiers | Cartes affichant : Nom, Photo/Initiales, Véhicule, Note, Livraisons totales, Statut |
| 3 | Cliquer sur l'onglet **En ligne** | Seuls les coursiers actifs affichés |
| 4 | Cliquer sur l'onglet **Hors ligne** | Seuls les coursiers inactifs affichés |
| 5 | Cliquer sur l'onglet **Suspendus** | Seuls les coursiers suspendus affichés |
| 6 | Cliquer sur un coursier dans la liste | Panneau latéral de détail ouvert : infos personnelles, véhicule, documents KYC, statistiques |
| 7 | Menu Coursiers → Cliquer **Ajouter un coursier** | Formulaire de création (Prénom, Nom, Téléphone, Email, Type de véhicule, Plaque, Date de naissance) |
| 8 | Remplir et soumettre le formulaire | Coursier créé avec mot de passe auto-généré, SMS envoyé |
| 9 | Cliquer sur le profil d'un coursier → Bouton **Voir le profil complet** | Page `/agency/drivers/{id}` avec KPIs, performance, documents, avis |
| 10 | Sur la page du profil → **Suspendre le coursier** | Dialog de confirmation → raison saisie → statut passe à "Suspendu" |
| 11 | Sur la page du profil → **Réactiver le coursier** | Dialog de confirmation → statut repasse à "Actif" |
| 12 | Sur la page du profil → **Supprimer le coursier** | Dialog de confirmation avec texte de sécurité → coursier retiré de l'agence |

---

## 1.6 — Statistiques de l'Agence

**Identifiant :** UAT-AG-05  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Analyse des performances sur différentes périodes.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Statistiques** | Page chargée avec KPIs : Total livraisons, Taux de réussite, Temps moyen, Revenus totaux |
| 2 | Sélectionner la période **7 jours** | Tous les graphiques et KPIs recalculés pour les 7 derniers jours |
| 3 | Sélectionner la période **30 jours** | Recalcul pour le mois en cours |
| 4 | Sélectionner la période **90 jours** | Recalcul sur 3 mois |
| 5 | Consulter le **graphique de livraisons** | Courbe journalière des volumes de livraisons avec comparatif mois précédent |
| 6 | Consulter le **Livreur du mois** | Card avec photo, livraisons, taux de réussite, note, classement des runners-up |
| 7 | Consulter le **Top 5 livreurs** | Classement avec rang, livraisons accomplies, taux de réussite |
| 8 | Consulter les **raisons d'échec** | Graphique en barres des motifs d'échec les plus fréquents |
| 9 | Consulter le **résumé hebdomadaire** | Tableau jour par jour avec volume et taux de réussite |

---

## 1.7 — Messagerie Agence

**Identifiant :** UAT-AG-06  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Supervision des échanges entre clients et coursiers — mode lecture seule avec navigation filtrée.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Messages** | Liste paginée des conversations affichée (toutes, actives, fermées) |
| 2 | Filtrer par **statut** (actif, fermé) | Liste restreinte aux conversations du statut sélectionné |
| 3 | Filtrer par **coursier** | Liste restreinte aux conversations liées au coursier sélectionné |
| 4 | Utiliser la barre de **recherche** (q=...) | Résultats filtrés en temps réel |
| 5 | Cliquer sur une conversation | Thread de messages ouvert avec historique (pagination curseur) |
| 6 | Faire défiler vers le haut → **Charger plus** | Messages précédents chargés (before_id cursor) |
| 7 | Ouvrir la conversation d'un coursier depuis son profil | Redirigé vers `/agency/messages/{conversationId}` |

> ⚠️ **Note :** L'agence est en lecture seule — pas d'envoi de message depuis ce profil.

---

## 1.8 — Paramètres de l'Agence

**Identifiant :** UAT-AG-07  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Configuration complète de l'agence (identité, zones, flotte, paiements, notifications).

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Paramètres** | Page chargée avec 6 onglets : Identité, Localisation, Opérations, Planning, Liens sociaux, Zones |
| 2 | Onglet **Identité** → Modifier le nom, email, téléphones, RCCM → **Enregistrer** | Informations sauvegardées, confirmation affichée |
| 3 | Bouton **Changer le logo** → Sélectionner un fichier image | Logo uploadé sur le CDN, aperçu mis à jour |
| 4 | Bouton **Supprimer le logo** | Logo retiré, placeholder affiché |
| 5 | Onglet **Localisation** → Modifier adresse, ville, quartier → **Enregistrer** | Adresse mise à jour |
| 6 | Onglet **Opérations** → Configurer type d'agence, capacité journalière, types de véhicules | Données sauvegardées |
| 7 | Onglet **Planning** → Configurer horaires d'ouverture par jour | Horaires enregistrés |
| 8 | Onglet **Zones** → Ajouter/modifier zones de livraison avec tarif et délai | Zones de couverture mises à jour |
| 9 | Onglet **Zones** → Configurer règles (rayon max, surcharge hors zone) | Règles enregistrées |
| 10 | Section **Flotte** → Configurer véhicules avec tarif de base + tarif/km + capacité | Tarification flotte sauvegardée |
| 11 | Section **Paiements** → Configurer méthode de paiement (Mobile Money / Bancaire) | Informations de virement enregistrées |
| 12 | Section **Notifications** → Activer/désactiver canaux (SMS, Email, WhatsApp) | Préférences sauvegardées |
| 13 | Section **Sécurité** → **Changer le mot de passe** | Formulaire : Ancien MDP + Nouveau MDP + Confirmation → mis à jour |
| 14 | Bouton **Supprimer l'agence** avec confirmation textuelle | Agence supprimée après saisie du texte de confirmation |

---

# 🛒 MODULE 2 — VENDEUR
> **Routes :** `/vendor/dashboard`, `/vendor/orders`, `/vendor/products`, `/vendor/inventory`, `/vendor/clients`, `/vendor/marketing`, `/vendor/messages`, `/vendor/tickets`, `/vendor/wallet`, `/vendor/statistics`, `/vendor/settings`

---

## 2.1 — Tableau de Bord Vendeur

**Identifiant :** UAT-SE-01  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Vue synthétique des performances de la boutique.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Tableau de bord** | Page chargée avec KPIs : Chiffre d'affaires, Commandes, Produits actifs, Note moyenne |
| 2 | Consulter le **graphique des revenus** | Courbe 7 derniers jours de revenus |
| 3 | Consulter les **Dernières commandes** | Liste des 5 dernières commandes avec référence, client, montant, statut |
| 4 | Consulter les **Produits les plus vendus** | Top produits avec image, ventes et revenus |
| 5 | Consulter les **Alertes de stock** | Products en rupture ou stock faible avec niveau d'alerte |
| 6 | Cliquer sur une commande dans le dashboard | Redirigé vers le détail de la commande |

---

## 2.2 — Gestion des Commandes

**Identifiant :** UAT-SE-02  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Réception, confirmation et traitement de toutes les commandes entrantes.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Commandes** | Liste paginée de toutes les commandes de la boutique |
| 2 | Onglets de statut : **Toutes / En attente / Confirmées / Expédiées / Livrées / Annulées** | Filtre actif, compteurs à jour |
| 3 | Utiliser la barre de recherche | Résultats filtrés par référence ou nom client |
| 4 | Cliquer sur une commande | Page de détail `/vendor/orders/{id}` : informations client, articles, financier, timeline, livraison |
| 5 | Page de détail → **Confirmer la commande** | Statut passe à "Confirmée", client notifié |
| 6 | Page de détail → **Annuler la commande** + raison | Statut passe à "Annulée", raison enregistrée |
| 7 | Page de détail → **Demander une livraison** | Demande envoyée à l'agence partenaire |
| 8 | Page de détail → **Marquer comme expédiée** | Statut passe à "Expédiée" |
| 9 | Page de détail → **Marquer comme livrée** | Statut passe à "Livrée" |
| 10 | Page de détail → **Imprimer le bon de livraison** | PDF téléchargé depuis le CDN via token d'authentification |
| 11 | Page de détail → **Générer la facture** | Lien vers la facture publique copié dans le presse-papiers |
| 12 | Consulter le **code de sécurité de remise** | Code à 8 caractères visible — à présenter au vendeur lors de la collecte |
| 13 | Menu Commandes → **Nouvelle commande** | Redirigé vers `/vendor/orders/new` |

---

## 2.2b — Création Manuelle de Commande (Vendeur)

**Identifiant :** UAT-SE-02B  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Saisie manuelle d'une commande directe (vente téléphonique, physique ou WhatsApp) avec sélection produit, client, livraison et paiement.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Page `/vendor/orders/new` → **Recherche de produits** (barre de recherche) | Résultats serveur en temps réel avec nom, SKU, prix, stock |
| 2 | Sélectionner un produit → Ajuster la **quantité** | Produit ajouté au panier avec sous-total calculé |
| 3 | Ajouter plusieurs produits | Panier mis à jour avec total général |
| 4 | **Rechercher un client existant** (par nom ou téléphone) | Clients matchants affichés avec historique d'achats |
| 5 | Sélectionner un client existant | Champs client pré-remplis (nom, email, téléphone, adresse) |
| 6 | Cliquer **Nouveau client** | Formulaire inline : Prénom, Nom, Téléphone, Email |
| 7 | Sélectionner un **partenaire de livraison** (agence) | Liste des agences disponibles avec modes de livraison + tarifs + délais |
| 8 | Saisir l'**adresse de livraison** | Champ adresse validé |
| 9 | Appliquer un **code de remise** | Réduction calculée et déduite du total |
| 10 | Sélectionner le **mode de paiement** (Cash, Mobile Money, etc.) | Mode enregistré dans la commande |
| 11 | Ajouter des **notes pour le livreur** | Notes enregistrées |
| 12 | Cliquer **Créer la commande** (avec clé d'idempotence) | Commande créée → Redirigé vers le détail de la commande |

---

## 2.3 — Gestion des Produits

**Identifiant :** UAT-SE-03  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Catalogue produits : création, modification, archivage.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Produits** | Grille de produits avec KPIs (Total, Publiés, Brouillons, Alertes) |
| 2 | Onglets : **Tous / Actifs / En rupture / Brouillons / Archivés** | Filtre correct |
| 3 | Barre de recherche produit | Résultats filtrés par nom en temps réel |
| 4 | Cliquer sur un produit | Page de détail `/vendor/products/{id}` : photos, infos, KPIs, variantes, avis |
| 5 | Bouton **Ajouter un produit** | Page `/vendor/products/new` avec formulaire complet |
| 6 | Formulaire nouveau produit → Saisir Nom, Description, Prix, Stock | Champs remplis |
| 7 | Bouton **Aperçu de l'image** (suppression du fond) | Image uploadée → fond automatiquement supprimé, aperçu affiché |
| 8 | Sélectionner la catégorie dans la liste déroulante | Catégorie assignée |
| 9 | Configurer le **tarif dégressif** (prix par quantité) | Plages de prix enregistrées |
| 10 | Choisir **Publier** ou **Enregistrer en brouillon** | Produit créé avec statut correspondant |
| 11 | Depuis la liste → **Supprimer un produit** | Confirmation → produit retiré du catalogue |

---

## 2.4 — Gestion de l'Inventaire

**Identifiant :** UAT-SE-04  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Suivi des niveaux de stock avec alertes et mouvements.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Inventaire** | Page avec KPIs : Valeur totale du stock, Produits en stock, En rupture, Stock faible |
| 2 | Onglets : **Tous / En stock / Stock faible / Rupture** | Filtre actif avec compteurs |
| 3 | Consulter les **Alertes de stock** | Liste des produits sous le seuil d'alerte avec bouton action |
| 4 | Cliquer sur **Ajouter du stock** sur un produit | Dialog avec quantité + raison (réapprovisionnement, retour, ajustement) → confirmé |
| 5 | Filtrer par catégorie | Liste restreinte à la catégorie sélectionnée |
| 6 | Filtrer par statut de stock | Vue filtrée |
| 7 | Bouton **Exporter l'inventaire** | Téléchargement CSV avec tous les produits et leurs niveaux de stock |

---

## 2.5 — Gestion des Clients

**Identifiant :** UAT-SE-05  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Base clients avec historique d'achats et segmentation.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Clients** | Page avec KPIs : Total clients, Nouveaux ce mois, Actifs, Taux de fidélité |
| 2 | Onglets : **Tous / Actifs / Fidèles / Inactifs / Nouveaux** | Segmentation correcte |
| 3 | Cliquer sur un client | Page de détail : infos, statistiques, commandes récentes |
| 4 | Bouton **Exporter les clients** | Téléchargement des données clients en CSV |
| 5 | Bouton **Ajouter un client** | Formulaire : Prénom, Nom, Email, Téléphone → création confirmée |

---

## 2.6 — Marketing & Promotions

**Identifiant :** UAT-SE-06  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Gestion des codes promo et des promotions produits.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Marketing** | Page avec KPIs : Promotions actives, Économies clients, Codes utilisés |
| 2 | Section **Codes promo** → Voir liste | Tableau avec code, réduction, conditions, usages, expiration, statut |
| 3 | Bouton **Activer/Désactiver** un code promo | Statut basculé instantanément |
| 4 | Bouton **Créer un code promo** | Formulaire : Code, Type (%, montant, livraison gratuite), Valeur, Limite d'utilisation, Dates |
| 5 | Section **Produits en promotion** → Voir liste | Produits avec prix original, prix promo, réduction %, expiration |
| 6 | Bouton **Créer une promotion produit** | Formulaire : Sélection produit, Type de réduction, Valeur, Dates de début/fin |
| 7 | Bouton **Modifier** une promotion | Formulaire pré-rempli → modification sauvegardée |
| 8 | Bouton **Supprimer** une promotion | Confirmation → promotion retirée |

---

## 2.7 — Messagerie Vendeur

**Identifiant :** UAT-SE-07  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Communication bidirectionnelle en temps réel avec les clients marketplace, avec envoi de cartes produit, pièces jointes et modération.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Messages** | Liste des conversations avec badges non-lus et indicateur de présence |
| 2 | Filtrer par **statut** (ouvert, fermé) | Liste filtrée correctement |
| 3 | Rechercher une conversation (q=nom client) | Résultats filtrés |
| 4 | Cliquer sur une conversation | Thread ouvert avec historique (pagination curseur) |
| 5 | Faire défiler vers le haut → charger l'historique | Messages précédents chargés automatiquement |
| 6 | Saisir un message → **Envoyer** | Message affiché dans le thread avec timestamp |
| 7 | **Joindre un fichier** au message (image, PDF) | Fichier uploadé en multipart → pièce jointe visible dans le thread |
| 8 | Cliquer **Partager un produit** → Sélectionner dans la liste | Carte produit envoyée avec image, nom, prix, et lien vers la boutique |
| 9 | Indicateur de **frappe en cours** visible | Quand le client tape, indication «...» affichée |
| 10 | Indicateur de **présence** client (en ligne / hors ligne) | Statut de présence affiché sur la conversation |
| 11 | Bouton **Fermer la conversation** | Conversation fermée, client ne peut plus envoyer de message |
| 12 | Bouton **Bloquer le contact** | Contact bloqué, plus de messages possibles |
| 13 | **Signaler un message** (inapproprié) | Dialog avec raison → signalement envoyé à l'équipe Sugu |
| 14 | Cliquer sur un message reçu contenant une **commande liée** | Lien vers la commande correspondante accessible |

---

## 2.8 — Support & Tickets

**Identifiant :** UAT-SE-08  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Gestion des demandes de support auprès de l'équipe Sugu.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Support** | Liste des tickets avec référence, sujet, statut, priorité, date |
| 2 | Onglets : **Tous / Ouverts / En attente / Résolus** | Filtrage correct avec compteurs |
| 3 | Cliquer sur un ticket | Thread de messages du ticket avec historique |
| 4 | Saisir une réponse + Envoyer | Message ajouté au thread |
| 5 | Joindre un fichier à un message | Pièce jointe uploadée et envoyée avec le message |
| 6 | Bouton **Fermer le ticket** | Ticket passe au statut "Résolu" |
| 7 | Bouton **Nouveau ticket** | Formulaire : Sujet, Catégorie, Description + bouton Soumettre |

---

## 2.9 — Portefeuille & Revenus Vendeur

**Identifiant :** UAT-SE-09  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Suivi financier complet avec demande de reversement.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Portefeuille** | Page avec 4 KPIs : Solde disponible, En attente, Total retiré, Revenus totaux |
| 2 | Consulter le **graphique des revenus** | Courbe sur les 7 derniers jours (crédits uniquement) |
| 3 | Consulter la section **Prochain versement** | Montant disponible + méthode de paiement configurée + seuil minimum |
| 4 | Consulter l'**historique des transactions** | Liste paginée : date, description, type (crédit/débit), montant, statut |
| 5 | Consulter les **méthodes de paiement** | Comptes Mobile Money et/ou bancaires enregistrés |
| 6 | Cliquer **Retirer** → Wizard de retrait | Étape 1 : Saisir montant / Étape 2 : Sélectionner méthode / Étape 3 : Confirmer |
| 7 | Valider le retrait | Confirmation avec numéro de paiement, frais, montant net, délai estimé |
| 8 | Route `/vendor/wallet/withdraw` | Wizard complet fonctionnel avec résumé final |

---

## 2.10 — Statistiques Vendeur

**Identifiant :** UAT-SE-10  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Analyse détaillée des ventes, conversions et données démographiques clients.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Statistiques** | Page avec 6 KPIs : CA, Commandes, Panier moyen, Nouveaux clients, Conversion, Note |
| 2 | Consulter le **graphique mensuel des ventes** | Courbe de revenus et volumes par mois |
| 3 | Consulter le **Top 5 produits** | Classement avec image, ventes et revenus |
| 4 | Consulter les **ventes par ville** | Répartition géographique en pourcentage |

---

## 2.11 — Paramètres Vendeur

**Identifiant :** UAT-SE-11  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Configuration complète du profil vendeur et de la boutique.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu gauche → **Paramètres** | Page avec onglets : Profil, Boutique, Horaires, Liens sociaux, Légal, Opérations, Sécurité, Notifications, Facturation |
| 2 | Onglet **Profil** → Modifier Prénom, Nom, Téléphone, Langue, Fuseau horaire | Profil mis à jour |
| 3 | Onglet **Boutique** → Modifier nom boutique, description, catégorie, URL slug | Identité boutique sauvegardée |
| 4 | Onglet **Boutique** → **Uploader le logo** | Logo affiché, URL CDN retournée |
| 5 | Onglet **Boutique** → **Uploader la bannière** | Bannière mise à jour |
| 6 | Onglet **Horaires** → Configurer par jour + option "Mêmes horaires tous les jours" | Horaires enregistrés |
| 7 | Onglet **Liens sociaux** → Ajouter WhatsApp, Facebook, Instagram, Site web | Liens sauvegardés |
| 8 | Onglet **Légal** → Remplir Raison sociale, Statut juridique, RCCM, NINEA | Informations légales enregistrées |
| 9 | Onglet **Opérations** → Configurer modes de livraison + méthodes de paiement acceptées | Préférences sauvegardées |
| 10 | Onglet **Sécurité** → **Changer le mot de passe** | Formulaire : Ancien + Nouveau + Confirmation |
| 11 | Onglet **Sécurité** → **Activer la 2FA** | QR Code affiché → code de validation → 2FA activée |
| 12 | Onglet **Sécurité** → **Codes de récupération 2FA** | Liste de codes affichée, possibilité de régénérer |
| 13 | Onglet **Sécurité** → **Sessions actives** | Liste des sessions avec appareil, IP, localisation → bouton "Révoquer" |
| 14 | Onglet **Sécurité** → **Historique de connexion** | Journal des connexions avec succès/échec |
| 15 | Onglet **Notifications** → Configurer alertes email (Nouvelle commande, Stock faible, Marketing) | Préférences email sauvegardées |
| 16 | Onglet **Facturation** → Consulter les factures Sugu | Liste des factures avec statut (Payée/En attente) et téléchargement |
| 17 | Onglet **Sécurité** → **Désactiver le compte** | Dialog de confirmation → compte désactivé |
| 18 | Onglet **Sécurité** → **Supprimer le compte** | Dialog avec mot de passe → compte supprimé définitivement |

---

# 🚴 MODULE 3 — COURSIER
> **Routes :** `/driver/dashboard`, `/driver/deliveries`, `/driver/earnings`, `/driver/history`, `/driver/settings`

---

## 3.1 — Tableau de Bord Coursier

**Identifiant :** UAT-CO-01  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Vue personnelle en temps réel pour le coursier.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu → **Tableau de bord** | Page chargée avec 4 KPIs : Livraisons aujourd'hui, Taux de réussite, Gains aujourd'hui, Temps moyen |
| 2 | Consulter la **livraison en cours** | Card avec itinéraire, client, statut, progression (%), ETA en minutes |
| 3 | Consulter la **file d'attente** | Liste des prochaines livraisons assignées avec créneau horaire |
| 4 | Consulter le **graphique des gains** | Histogramme des 7 derniers jours avec total semaine |
| 5 | Consulter l'**activité récente** | Journal des dernières actions (livraisons, collectes, assignations) |

---

## 3.2 — Gestion des Livraisons Coursier

**Identifiant :** UAT-CO-02  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Cycle complet d'une course du point de collecte à la livraison.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu → **Mes Livraisons** | Liste avec résumé (Total, En cours, Livrées, Échouées) |
| 2 | Onglets : **Toutes / À accepter / Ramassage / En route / Livrées / Échouées** | Filtre correct avec compteurs |
| 3 | Voir une livraison **À accepter** → Bouton **Accepter** | Livraison assignée au coursier, statut → "Ramassage" |
| 4 | Voir une livraison → Bouton **Refuser** | Livraison remise dans le pool, refus enregistré |
| 5 | Cliquer sur une livraison → Page de détail `/driver/deliveries/{id}` | Détail complet : stops A→B→C, produits à collecter, client, sécurité, ETA |
| 6 | Page de détail → Consulter le **code de sécurité** | Code affiché pour présentation au vendeur |
| 7 | Page de détail → **Confirmer la collecte** d'un article | Article coché comme collecté |
| 8 | Page de détail → **Signaler un retard** | Dialog avec raison → retard enregistré |
| 9 | Page de détail → **Marquer comme livré** | Confirmation → statut → "Livré", gains crédités |
| 10 | Page de détail → **Marquer comme échoué** | Dialog avec raison → statut → "Échoué" |

---

## 3.3 — Gains & Portefeuille Coursier

**Identifiant :** UAT-CO-03  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

**Fonctionnalité :** Suivi financier personnel et demande de retrait.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu → **Gains** | Page avec 4 KPIs : Solde disponible (avec % évolution), En attente, Total retiré, Gains aujourd'hui |
| 2 | Consulter le **graphique des gains** | Histogramme 7 jours |
| 3 | Consulter le **prochain versement** | Montant, date, méthode de paiement |
| 4 | Consulter l'**historique des transactions** | Liste : date, description, type (crédit/débit), montant, statut |
| 5 | Bouton **Retirer** → Route `/driver/earnings/withdraw` | Wizard de retrait |
| 6 | Wizard retrait → Saisir montant (min: seuil configuré) | Validation du montant |
| 7 | Wizard retrait → Sélectionner méthode de paiement (Orange Money, Moov, etc.) | Méthode sélectionnée |
| 8 | Wizard retrait → Confirmer | Confirmation avec numéro paiement, frais, montant net, délai |

---

## 3.4 — Historique des Livraisons

**Identifiant :** UAT-CO-04  
**Priorité :** 🟠 Haute  
**Statut :** ⬜

**Fonctionnalité :** Archive paginée de toutes les courses passées.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu → **Historique** | Page avec KPIs : Total livraisons, Livrées (%), Échouées (%), Total gains, Gain moyen |
| 2 | Onglets : **Toutes / Livrées / Échouées** | Filtre avec compteurs |
| 3 | Filtrer par période : **7jours / 30jours / 3 mois / Tout** | Recalcul des données |
| 4 | Barre de recherche | Résultats filtrés par référence |
| 5 | Pagination | Navigation entre les pages de résultats |
| 6 | Ligne d'historique → informations | Référence, date, heure, vendeur, client, colis, gains, durée, distance |

---

## 3.5 — Paramètres Coursier

**Identifiant :** UAT-CO-05  
**Priorité :** 🟡 Moyenne  
**Statut :** ⬜

**Fonctionnalité :** Gestion du profil, véhicule, KYC, notifications et sécurité du coursier.

| # | Parcours Utilisateur | Critère de Succès |
|---|---------------------|-------------------|
| 1 | Menu → **Paramètres** | Page avec onglets : Profil, Véhicule, Documents KYC, Notifications, Sécurité |
| 2 | Onglet **Profil** → Modifier Prénom, Nom, Téléphone, Téléphone secondaire, Ville, Quartier, Adresse, Rayon d'action | Profil mis à jour |
| 3 | Onglet **Profil** → Modifier Langue et Fuseau horaire | Préférences sauvegardées |
| 4 | Onglet **Profil** → Consulter les statistiques (Note, Livraisons, Taux de réussite, Temps moyen) | Stats affichées en lecture |
| 5 | Onglet **Véhicule** → Modifier Type, Marque, Immatriculation, Couleur, Capacité, Année, Notes | Informations véhicule mises à jour |
| 6 | Onglet **Documents KYC** → Voir statut de chaque document (CNI, Permis, Carte grise, Assurance) | Barre de progression + liste avec statuts (Vérifié / En attente / Non uploadé / Rejeté) |
| 7 | Onglet **Documents KYC** → Bouton **Uploader** sur un document manquant | Sélection du fichier → upload → statut passe à "En attente" |
| 8 | Onglet **Notifications** → Configurer canaux (SMS, Email, Push, WhatsApp) | Préférences canal sauvegardées |
| 9 | Onglet **Notifications** → Configurer événements par canal | Préférences événement (nouvelle livraison, annulation, paiement, etc.) sauvegardées |
| 10 | Onglet **Notifications** → Configurer **Heures silencieuses** | Plage horaire de non-dérangement enregistrée |
| 11 | Onglet **Sécurité** → **Changer le mot de passe** | Formulaire : Ancien + Nouveau + Confirmation |
| 12 | Onglet **Sécurité** → **Activer/Désactiver la 2FA** | Bascule de l'état 2FA |
| 13 | Onglet **Sécurité** → **Sessions actives** → Révoquer une session | Session ciblée révoquée |
| 14 | Onglet **Sécurité** → **Supprimer le compte** | Dialog avec password + texte de confirmation → compte supprimé |

---

# 🔐 MODULE 4 — SÉCURITÉ TRANSVERSALE

**Identifiant :** UAT-SEC  
**Priorité :** 🔴 Critique  
**Statut :** ⬜

---

## 4.1 — Contrôle d'Accès par Rôle

| # | Scénario | Résultat Attendu |
|---|---------|-----------------|
| SEC-01 | Utilisateur non connecté accède à `/agency/dashboard` | Redirigé vers `/login` |
| SEC-02 | Vendeur tente d'accéder à `/agency/dashboard` | Redirigé ou erreur accès refusé |
| SEC-03 | Agence tente d'accéder à `/vendor/orders` | Redirigé ou erreur accès refusé |
| SEC-04 | Coursier tente d'accéder à `/vendor/products` | Redirigé ou erreur accès refusé |
| SEC-05 | Un manager Agence A ne voit pas les coursiers de l'Agence B | Données filtrées, accès refusé |
| SEC-06 | Un vendeur ne voit pas les commandes d'un autre vendeur | Données filtrées côté serveur |

---

## 4.2 — Protection des Tokens & Sessions

| # | Scénario | Résultat Attendu |
|---|---------|-----------------|
| SEC-07 | Token stocké côté client (localStorage, console) | Token NON accessible — stocké uniquement en cookie httpOnly |
| SEC-08 | Expiration du token → action quelconque | Redirection automatique vers `/login` (HTTP 401) |
| SEC-09 | Requête avec token invalide ou modifié | HTTP 401 retourné |
| SEC-10 | Upload de logo — plus de 10 requêtes/minute | HTTP 429 — rate limiting actif |

---

## 4.3 — Validation des Formulaires

| # | Scénario | Résultat Attendu |
|---|---------|-----------------|
| SEC-11 | Formulaire de connexion avec email invalide | Message d'erreur inline avant l'envoi |
| SEC-12 | Changement de mot de passe sans confirmation | Erreur de validation affichée |
| SEC-13 | Upload d'une image trop lourde | Message d'erreur avec taille maximale |
| SEC-14 | Champ texte avec caractères spéciaux | Données assainies, pas d'injection possible |

---

# 📊 RÉSUMÉ EXÉCUTIF

| Module | Pages | Fonctionnalités | Scénarios UAT | Critique 🔴 | Haute 🟠 | Moyenne 🟡 |
|--------|-------|----------------|---------------|------------|---------|-----------|
| Agence (AG) | 8 | 10 modules | ~95 | ~48 | ~30 | ~17 |
| Vendeur (SE) | 13 | 12 modules | ~120 | ~55 | ~40 | ~25 |
| Coursier (CO) | 5 | 5 modules | ~62 | ~30 | ~20 | ~12 |
| Sécurité (SEC) | — | 3 modules | 14 | 14 | 0 | 0 |
| **TOTAL** | **26** | **30** | **~291** | **~147** | **~90** | **~54** |

---

## 🚦 Critères de Go/No-Go

| Critère | Seuil Exigé |
|---------|-------------|
| Taux de réussite global | ≥ 95% |
| Tests critiques 🔴 | 100% passés |
| Zéro bug bloquant sur parcours de retrait/paiement | Obligatoire |
| Zéro faille de contrôle d'accès inter-profils | Obligatoire |
| Sessions et tokens sécurisés | 100% validés |
| Upload de fichiers fonctionnel (logo, KYC, produits) | ≥ 98% |

---

## 📝 Glossaire

| Terme | Définition |
|-------|-----------|
| **Agence** | Partenaire de livraison gérant une flotte de coursiers |
| **KYC** | Know Your Customer — vérification d'identité |
| **COD** | Cash On Delivery — paiement à la livraison |
| **Stop** | Point de collecte ou de livraison dans un itinéraire multi-arrêts |
| **Token httpOnly** | Cookie de session non accessible au JavaScript client |
| **2FA** | Authentification à deux facteurs |
| **Slug** | Identifiant URL lisible d'une boutique (ex: `boutique-kante`) |
| **RCCM** | Registre du Commerce et du Crédit Mobilier |
| **Mobile Money** | Paiement mobile (Orange Money, Wave, Moov, etc.) |
| **Rate limiting** | Limitation du nombre de requêtes par minute |
| **Wizard** | Formulaire multi-étapes guidé |
