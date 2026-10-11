# Design system SUGU Pro

Fondations de l'interface professionnelle (vendeur, agence, coursier). Mode clair uniquement.

- Code : `src/design-system/`
- Import : toujours `import { … } from "@/design-system"`, jamais un sous-chemin
- Galerie : `/dev/ui` en développement (`npx next dev --webpack`)

## 1. Règles à connaître avant d'écrire une page

1. **Envelopper la page dans `.sugu-ui`.** Les tokens `background`, `foreground`, `border` et l'anneau de focus n'ont leurs nouvelles valeurs que dans cette portée. L'AppShell (Phase B) la porte sur son cadre (sidebar, topbar, navigation mobile) mais **pas sur `<main>`** : les pages non migrées y gardent leur rendu actuel. Une page migrée pose donc elle-même `className="sugu-ui"` sur son conteneur racine. Les overlays (dialog, menu, infobulle) la portent déjà eux-mêmes.
2. **Aucune classe `dark:`**, aucun `rounded-2xl/3xl`, aucun dégradé, aucune ombre colorée, aucun emoji dans du code neuf.
3. **Un statut métier passe par `StatusBadge`.** Pas de table de correspondance locale.
4. **Un montant passe par `formatMoneyFromCents` ou `formatMoneyFromFrancs`**, selon l'unité que l'endpoint renvoie réellement.
5. **Une action importante porte une icône Lucide** (`icon={…}`). Un bouton sans libellé est un `IconButton`, dont le `label` est obligatoire.
6. **L'orange ne sert qu'à l'action principale et à la sélection.** Une couleur de statut ne sert jamais de décor.
7. **Ne pas mélanger** primitives du design system et anciens composants dans un même écran migré.

## 2. Tokens

Fichier : `src/design-system/tokens.css`, importé par `src/app/globals.css`.

### Couleurs

| Utilitaire | Valeur | Usage |
|---|---|---|
| `bg-background` | `#f7f7f8` (dans `.sugu-ui`) | Fond de page |
| `bg-surface` | `#ffffff` | Cartes, tables, champs |
| `bg-surface-subtle` | `#f4f4f5` | En-têtes de table, survol de ligne |
| `bg-surface-hover` | `#ececee` | Survol de bouton discret |
| `bg-surface-elevated` | `#ffffff` | Overlays (avec `shadow-overlay`) |
| `text-foreground` | `#18181b` (dans `.sugu-ui`) | Texte principal |
| `text-foreground-muted` | `#52525b` | Texte secondaire |
| `text-foreground-subtle` | `#6b6b73` | Métadonnées, icônes neutres |
| `border-border` | `#e4e4e7` (dans `.sugu-ui`) | Séparateurs, contours de carte |
| `border-border-strong` | `#c9c9cf` | Contour de bouton secondaire |
| `border-border-control` | `#8a8a94` | Contour de champ (3:1 sur blanc) |
| `bg-brand` | `#f15412` | Accent de marque, indicateur de sélection |
| `bg-brand-subtle` | `#fff4ed` | Ligne sélectionnée |
| `bg-primary` / `bg-primary-hover` | `#d2400a` / `#b53608` | Bouton principal |
| `bg-disabled` / `text-disabled-foreground` | `#f0f0f2` / `#8a8a94` | États désactivés |

`brand` et `primary` sont distincts : du texte blanc sur `#f15412` n'atteint que 3,5:1. Le bouton principal utilise un orange plus profond qui atteint 4,5:1 ; l'orange exact de la marque reste pour les accents non textuels.

### Statuts

Cinq tons : `success`, `warning`, `danger`, `info`, `neutral`. Chacun a quatre facettes : `text-{ton}-fg`, `bg-{ton}-bg`, `border-{ton}-border`, `text-{ton}-icon`. `danger` a en plus `bg-danger-solid` pour le bouton destructif.

### Géométrie

| Token | Valeur | Usage |
|---|---|---|
| `rounded-compact` | 4 px | Cases à cocher, éléments de menu |
| `rounded-control` | 8 px | Champs, vignettes |
| `rounded-panel` | 12 px | Cartes, tables, dialogs |
| `rounded-pill` | pilule | Badges, avatars, interrupteur |
| `rounded-button` | pilule | **Tous les boutons** (décision produit, un seul token) |
| `h-control-sm` | 32 px | Contrôle compact |
| `h-control` | 36 px | Contrôle par défaut |
| `h-touch` | 44 px | Cible tactile |
| `shadow-raised`, `shadow-overlay` | neutres | Curseur d'interrupteur ; overlays |

### Typographie

| Utilitaire | Taille / interligne | Graisse |
|---|---|---|
| `text-page-title` | 22 / 28 | 600 |
| `text-section-title` | 16 / 24 | 600 |
| `text-body` | 14 / 20 | 400 |
| `text-label` | 13 / 18 | 500 |
| `text-meta` | 12 / 16 | 400 |
| `text-kpi` | 24 / 32 | 600 |

Plancher : 12 px. Ajouter `tabular-nums` aux montants, références, compteurs et cellules numériques (`Money` et les colonnes `numeric` le font déjà).

### Structure

- Couches : `z-sticky` 10, `z-header` 30, `z-nav` 50 (barre d'onglets téléphone), `z-dropdown` 60, `z-overlay` 70, `z-modal` 71, `z-popover` 80, `z-tooltip` 90.
- Bas d'écran : `--shell-bottom-inset` vaut la hauteur de la barre d'onglets téléphone (zone sûre comprise) et 0 partout ailleurs. Un élément `fixed` collé en bas l'utilise via `bottom-shell`. Un élément `sticky` utilise `sticky-bottom-shell` : un décalage `sticky` se mesure depuis le bord du contenu du conteneur défilant, marge intérieure exclue, et `<main>` garde une marge basse (publiée dans `--shell-scroll-pad-bottom`). Sans la reprendre, la barre flotte au-dessus de la barre d'onglets et la page défile dans l'intervalle. `FormActions sticky` le fait déjà. Ne jamais écrire `bottom-0` ou `bottom-20` pour éviter la barre.
- Portée et texte : la couleur et la taille de texte de `.sugu-ui` sont dans la couche de base. Une utilitaire posée sur l'élément qui porte la portée (le texte blanc d'une infobulle) doit gagner ; hors couche, la règle de la portée l'écrasait et l'infobulle s'affichait comme une bulle noire vide.
- Portée et positionnement : `.sugu-ui` est le bloc conteneur de ce qu'elle positionne (`position: relative`, dans la couche de base : `fixed`, `absolute` et `sticky` gardent la priorité). Sans cela, un libellé masqué visuellement (`sr-only`, positionné en absolu) placé loin dans une longue page sort du conteneur défilant, rend le document plus haut que l'écran, et un défilement programmé décale alors toute l'application.
- Gouttière de page : `px-page`, `py-page`, `gap-page` (16 px téléphone, 24 px dès 768 px, 32 px dès 1280 px).
- Variante `touch:` : téléphone (< 768 px) **ou** pointeur grossier (tablette). Les contrôles y passent à 44 px et les champs à 16 px de texte.
- Mouvement : `animate-ds-fade`, `animate-ds-pop`, `animate-ds-sheet-*`, 120 à 180 ms. `prefers-reduced-motion` est respecté par la règle globale existante.

### Points de rupture

| Plage | Cible | Comportement |
|---|---|---|
| < 768 px | Téléphone | Cartes à la place des tables, filtres en panneau bas, actions secondaires en menu, boutons de dialog empilés |
| 768 à 1023 px | Tablette | Vraies tables, dialogs centrés, cibles de 44 px (pointeur grossier) |
| ≥ 1024 px | Bureau | Tailles denses (36 / 32 px), lignes de table de 44 px |

`DataTable` bascule selon la largeur de **son conteneur** (672 px), pas de la fenêtre : dans un panneau étroit elle passe en cartes même sur grand écran.

## 3. Composants

| Famille | Composants |
|---|---|
| Actions | `Button`, `IconButton`, `ButtonGroup`, `DropdownMenu` (+ `Item`, `Label`, `Separator`), `Tooltip` |
| Information | `Badge`, `StatusBadge`, `Card`, `Section`, `Stat`, `Avatar`, `EmptyState`, `ErrorState`, `Skeleton`, `Alert`, `DescriptionList`, `Money` |
| Formulaires | `FormField`, `Input`, `PasswordInput`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `RadioGroup` + `Radio`, `Switch`, `FormActions`, `FormErrorSummary`, `Stepper`, `StepActions` |
| Navigation locale | `Tabs` (+ `List`, `Trigger`, `Content`), `Pagination`, `Breadcrumbs` |
| Overlays | `Dialog` (+ `Trigger`, `Content`, `Close`), `ConfirmDialog`, `Sheet` (+ `Trigger`, `Content`, `Close` ; côtés `right`, `bottom`, `left`) |
| Structure | `PageHeader`, `Toolbar`, `ToolbarSearch`, `ToolbarFilter`, `ToolbarCount`, `DataTable` |

### Button

```tsx
<Button variant="primary" icon={Plus} onClick={…}>Créer un produit</Button>
<Button icon={Download} loading={isExporting}>Exporter</Button>
<Button asChild variant="primary" icon={Plus}><Link href="/vendor/products/new">Créer</Link></Button>
<IconButton icon={Trash2} label="Supprimer le produit" />
```

- `variant` : `primary`, `secondary` (défaut), `quiet`, `destructive`.
- `size` : `default` (36 px, 44 px en tactile), `compact` (32 px, 36 px en tactile).
- `loading` pose `aria-busy` et bloque l'activation ; le libellé reste affiché.
- `type="button"` par défaut : écrire `type="submit"` dans un formulaire.
- Un seul bouton `primary` par écran ou par dialog.

### Formulaires

```tsx
<FormField label="Montant" required hint="En francs CFA." error={errors.amount}>
  <Input inputMode="numeric" suffix="FCFA" value={…} onChange={…} />
</FormField>
```

`FormField` relie libellé, aide, erreur et succès au champ (`id`, `aria-describedby`, `aria-invalid`, `required`, `disabled`). Le message d'erreur est annoncé (`role="alert"`). Validation : Zod, puis `fieldErrorsFromZod(error)` donne un message par champ ; `FormErrorSummary` les récapitule en tête de formulaire.

`Select`, `Checkbox` et `Radio` sont des contrôles natifs stylés : sur téléphone, le sélecteur du système reste le plus fiable.

`Combobox` sert quand la liste est trop longue pour un `Select` (catégories, clients) : on tape pour la réduire, sans tenir compte des accents ni de la casse, et l'on choisit au clavier ou au doigt. Plusieurs choix sont possibles ; la liste se referme à chaque choix pour ne jamais recouvrir la suite du formulaire. Le champ montre la recherche, pas le choix : la page affiche ce qui est choisi (étiquettes) et en reste propriétaire (`selected`, `onToggle`). Entrée n'y soumet jamais le formulaire. Sur téléphone, le champ remonte en haut de l'écran à l'ouverture, pour que la liste ne soit pas sous le clavier.

Assistants en étapes : `Stepper` affiche la progression, `StepActions` les boutons Précédent / Suivant / action finale, `DescriptionList` le résumé. La page garde l'état et la validation.

- `Stepper onStepSelect` rend chaque étape cliquable, à toutes les largeurs (sur téléphone, les étapes remplacent la barre « Étape 2 sur 4 »). La page décide si le déplacement est permis.
- `Stepper completedSteps` : par défaut, toute étape passée est cochée. Un formulaire dont les étapes peuvent rester incomplètes (un brouillon) donne la liste des étapes réellement complètes : une coche ne recouvre jamais une étape où il manque quelque chose. L'étape en cours reste repérable même en erreur.
- `FormActions` : les actions tiennent sur une ligne, y compris sur téléphone, où la dernière (l'action principale) prend la place restante. Avec `sticky`, la barre repose sur la barre d'onglets du téléphone ; à partir de 768 px c'est un panneau de la largeur du formulaire.

### ConfirmDialog

Remplace `confirm()` et `prompt()`. Le focus arrive sur « Annuler ». `onConfirm` peut renvoyer une promesse : le dialog affiche l'attente, puis se ferme en cas de succès et reste ouvert en cas d'échec.

### PageHeader et Toolbar

```tsx
<PageHeader
  title="Commandes"
  breadcrumbs={[{ label: "Accueil", href: "/vendor/dashboard" }, { label: "Commandes" }]}
  primaryAction={{ label: "Nouvelle vente", icon: Plus, href: "/vendor/orders/new" }}
  secondaryActions={[{ label: "Exporter", icon: Download, onSelect: exportOrders }]}
/>
```

Sur téléphone, l'action principale reste visible et les actions secondaires passent dans un menu « Plus d'actions ». `hideDescriptionOnPhone` réserve la phrase d'introduction aux écrans de 768 px et plus, quand elle repousserait la liste qu'elle présente.

`Toolbar` tient sur une ligne : recherche, filtres, puis `view` (un sélecteur de vue, grille ou liste) en bout de ligne, à toutes les largeurs. Les contrôles ont la même hauteur.

- Faute de place, les filtres passent dans un panneau bas « Filtres », ouvert par un bouton de la même ligne. `collapseFilters="phone"` (défaut) : sous 768 px. `collapseFilters="narrow"` : dès que la barre elle-même fait moins de 912 px, pour une liste à trois filtres ou plus, qui ne tiennent pas non plus sur tablette. La décision suit la largeur de la barre, pas celle de la fenêtre.
- Sur téléphone, à côté d'un sélecteur de vue, le bouton « Filtres » se réduit à son icône ; il garde son nom et affiche le nombre de filtres actifs.
- `ToolbarFilter hideLabelInline` retire le libellé de la ligne quand la première option dit déjà de quoi il s'agit (« Toutes les catégories », « Tout le stock »). Le libellé reste le nom du contrôle pour les lecteurs d'écran, et s'affiche au-dessus du champ dans le panneau « Filtres ».
- Sous la ligne, le compteur et `countAction` (le retour à la liste entière, « Tout afficher ») n'apparaissent que si la page les fournit : une liste que rien ne restreint n'a pas de ligne vide.

`TabsList variant="pills"` : pastilles entièrement arrondies pour les filtres d'une liste (statuts, niveaux), chacune avec son compteur et, via `TabsTrigger tone`, un point de la couleur du statut. Le style souligné reste celui des sections d'une page.

Recherche, filtres et tri de la `Toolbar` sont contrôlés : la page les transforme en paramètres de requête. `ToolbarCount` affiche le total renvoyé par le serveur.

### DataTable

```tsx
<DataTable
  caption="Commandes"
  columns={columns}
  rows={data.rows}
  getRowId={(order) => order.id}
  state={isLoading ? "loading" : isError ? "error" : "ready"}
  refreshing={isFetching}
  error={{ onRetry: refetch }}
  empty={{ title: "Aucune commande" }}
  sort={sort}
  onSortChange={setSort}
  pagination={{ page, pageSize: 20, total: data.total, onPageChange: setPage }}
/>
```

- **Tri** : uniquement contrôlé. Sans `onSortChange`, aucun en-tête n'est cliquable. La table ne réordonne jamais `rows` : trier la page chargée d'une liste paginée ferait croire à un tri complet.
- **Sélection** : contrôlée (`selection`). La case d'en-tête agit sur la page courante et conserve les identifiants sélectionnés sur les autres pages. `bulkActions` n'apparaît que si une sélection existe.
- **États** : `loading` (squelettes), `error` (jamais affiché comme une liste vide), vide (seulement à l'état `ready`), `refreshing` (lignes conservées, pagination bloquée).
- **Téléphone** : chaque colonne déclare son rôle, `mobile: "title" | "subtitle" | "badge" | "field" | "detail" | "hidden"`. Par défaut `field` : rien ne disparaît sans décision explicite. `detail` range une donnée secondaire derrière « Voir plus » : à un geste, pas supprimée. `mobileCell` donne à la carte un contenu différent de la cellule ; s'il renvoie `null`, la ligne n'est pas affichée (un libellé sans valeur est du bruit). Les actions de ligne et la sélection sont conservées ; `mobileRowActions="footer"` place les actions sur une ligne à elles, pour un bouton libellé. `mobileLayout="scroll"` garde la table et la fait défiler.
- **Tablette** : une table ne doit jamais se lire en la faisant glisser. Les colonnes secondaires se masquent par requête de conteneur (`className: "hidden @4xl:table-cell"`) et leur donnée se replie sous une colonne voisine tant qu'elles sont masquées.

## 4. Statuts

Fichier : `src/design-system/status/domains.ts`.

```tsx
<StatusBadge domain="order" code={order.status} />
<StatusBadge domain="orderPayment" code={order.paymentStatusCode} />
<StatusBadge domain="delivery" code={shipment.status} />
```

| Domaine | Source backend |
|---|---|
| `order` | `Enums\Orders\OrderStatus` |
| `orderPayment` | `SellerOrderService::resolvePaymentStatusCode` |
| `payment` | `Enums\Payments\PaymentStatus` |
| `delivery` | `Enums\Shipments\ShipmentStatus` |
| `product` | `Enums\Products\ProductStatus` |
| `stock` | `in_stock`, `low_stock`, `out_of_stock` |
| `payout` | `Enums\Payouts\PayoutStatus` |
| `kycDocument` | `Enums\KycDocumentStatus` |
| `kycRequest` | `Enums\VerificationRequestStatus` |
| `courier` | `Enums\Delivery\CourierStatus` |
| `suguBoxInbound`, `suguBoxOutbound`, `suguBoxListing` | `Domain\SuguBox\Enums\*` |

- Un code inconnu s'affiche « Statut inconnu » (bordure en pointillés, code brut en infobulle). Il n'est jamais ramené à « En attente ».
- Commande, paiement et livraison sont trois axes : `cod_pending` n'est pas un statut de commande, `shipped` n'est pas un statut de livraison.
- Les projections de l'API sont des alias du code canonique : `to_accept`, `pickup`, `en_route`, `failed` (coursier) ; `cancelled` ; valeurs entières des enums à base d'entier. Agence et coursier lisent donc le même registre.
- Ajouter un statut : l'ajouter d'abord à l'enum backend, puis au registre, puis à la liste `BACKEND_ENUMS` de `__tests__/status.test.tsx`.
- Hors composant : `orderStatus.resolve(code)` renvoie `{ label, tone, icon, known }` ; `orderStatus.options()` alimente un filtre.

## 5. Argent

Fichier : `src/design-system/money/money.tsx`.

Le backend stocke en centimes, mais les réponses ne sont pas homogènes : les commandes vendeur renvoient des **francs** (`centsToUnits`), les frais COD Mixte et les montants agence des **centimes**. L'unité fait donc partie du nom de la fonction.

| Entrée | Appel | Affichage |
|---|---|---|
| 5 000 000 centimes | `formatMoneyFromCents(5000000)` | 50 000 FCFA |
| 50 000 francs | `formatMoneyFromFrancs(50000)` | 50 000 FCFA |
| 0 | l'une ou l'autre | 0 FCFA |
| `null`, `undefined`, `NaN` | l'une ou l'autre | — |
| -1 250 000 centimes | `formatMoneyFromCents(-1250000)` | -12 500 FCFA |

- Un montant absent n'est jamais affiché comme zéro.
- Options : `currency: "FCFA" | "XOF" | false`, `fallback`, `showPlus`.
- `<Money cents={…} />` ou `<Money francs={…} />` : chiffres tabulaires, jamais de retour à la ligne.
- Types `MoneyCents` et `MoneyFrancs` (`asCents`, `asFrancs`) : à poser dans les schémas Zod au moment de la migration d'un domaine, pour que le compilateur refuse un mélange d'unités.
- Les anciens helpers (`formatCurrency`, `formatCentsToXof`, `formatCompactCurrency`, celui de `features/agency`) restent en place ; ils seront remplacés domaine par domaine.

## 6. Accessibilité

- Focus visible sur tout élément interactif (anneau orange de 2 px).
- Noms accessibles obligatoires par le typage (`IconButton.label`, `DataTable.caption`, `TabsList.label`, `Stepper.label`).
- Aucun état porté par la couleur seule : icône et libellé sur les statuts, mot « En hausse / En baisse » sur les tendances.
- Dialogs et panneaux : focus piégé, Échap, retour du focus au déclencheur (Radix).
- Contrastes vérifiés par test sur les valeurs de `tokens.css`.

## 7. Tests

```bash
npx vitest run src/design-system        # primitives, statuts, argent, tokens
npx playwright test -c playwright.gallery.config.ts   # galerie : 5 largeurs, interactions, Axe
```

La galerie n'envoie aucune requête métier ; le test Playwright le vérifie.

## 8. Galerie

- Route : `/dev/ui`. Fichiers : `src/app/dev/ui/`.
- Hors production : accessible sans session.
- En production : `proxy.ts` répond 404, avec ou sans session. Pour l'ouvrir sur un build de production local : `SUGU_UI_GALLERY=1` (variable serveur, jamais exposée au navigateur).
- Données : synthétiques (`gallery-data.ts`).

## 9. Cadre de l'application (Phase B)

- Code : `src/components/app-shell/`. Les trois layouts de rôle rendent `<WorkspaceShell role="…">`.
- **Navigation : un seul fichier**, `navigation.ts`. Sidebar, tiroir tablette, barre d'onglets, menu téléphone, contexte de la topbar et menu du compte en dérivent. Ajouter une rubrique = ajouter une entrée (`id`, `label`, `href`, `icon`, et `mobilePriority` seulement si elle mérite un des 4 onglets).
- Une entrée conditionnelle utilise `visible: (user) => …` et ne lit que ce que la session porte réellement. Ce n'est jamais une autorisation.
- Écrans d'authentification : `AuthFrame` (layout) et `AuthCard`, dans `src/features/auth/components/`.
- Retour à l'ancien cadre : construire avec `NEXT_PUBLIC_PRO_SHELL=legacy`.
- Tests : `npx vitest run src/components/app-shell src/features/auth`, puis `npx next build --webpack && npx playwright test -c playwright.shell.config.ts` (build de production, API simulée).
