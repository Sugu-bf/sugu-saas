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
| `rounded-badge` | pilule | Badges et pastilles de tendance |
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

- `variant` : `primary`, `secondary` (défaut), `quiet`, `destructive`, et `outline` (contour et texte de la couleur d'action, fond blanc) pour l'action d'une ligne de table : visible sans concurrencer le bouton `primary` de la page.
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

Pour une page de détail :

- `back={{ label, href }}` : le retour à la liste, au-dessus du titre (à la place de `breadcrumbs`, pas en plus).
- `leading` : ce dont la page parle, avant le titre (un `Avatar size="xl"`).
- `meta` : une information à côté des actions, pas un contrôle (le jour dont un tableau de bord parle) ; affichée à partir de 768 px.
- `moreActions` : les actions moins fréquentes, derrière un menu « Plus d'actions » à toutes les largeurs ; sur téléphone, les actions secondaires les y rejoignent. `tone: "danger"` marque celle qui ne se rattrape pas.
- `stackActions` : pour une page qui a beaucoup d'actions ; à partir de 1280 px elles tiennent sur deux lignes, l'action principale en haut, et le titre garde sa ligne.
- Une destination hors de l'application (`tel:`, une carte) est rendue comme un lien simple.

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
- **En-tête de carte** : `header={{ title, description, actions }}` place au-dessus de la table ce que la liste contient (« 248 livraisons ») et les actions sur toute la liste (export). Il reste affiché quand la liste est vide ou en erreur.
- **Colonne d'actions nommée** : `rowActionsLabel="Actions"` affiche l'en-tête de la colonne et aligne les actions dessous, pour une ligne dont l'action est un bouton libellé. Cette colonne reste alors en vue pendant que les autres défilent sous elle : ce qu'une ligne demande n'est jamais hors de l'écran.
- **Densité** : `density="compact"` (cellules en 13 px, marges réduites) pour une liste de neuf colonnes qui doit tenir à côté du menu latéral. Les cartes du téléphone ne changent pas.
- **Pagination numérotée** : `pagination={{ variant: "numbered", pageSizeOptions: [10, 25, 50], onPageSizeChange }}` affiche « Affichage de 1 à 10 sur 248 », les pages (1 2 3 … 25) et le choix du nombre de lignes. Sur téléphone elle revient à « Page 2 sur 25 ».

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

## 10. Espace Agence (V3)

Les écrans de l'agence suivent leurs maquettes (`docs/captures/references/v3-agence-*.png`). Ils restent sur Foundation : mêmes primitives, mêmes couleurs. Ce qui change est une affaire de jetons, posés sur la racine du document quand le cadre de l'agence est affiché :

```css
:root:has([data-shell="pro"][data-role="agency"]) {
  --spacing-control: 2.5rem;   /* contrôles de 40 px */
  --text-page-title: 1.875rem; /* titres et chiffres clés plus grands et plus gras */
  --text-kpi: 1.75rem;         /* 1.375rem sur téléphone, où les cartes sont plus petites */
}
```

- Sur la racine, et non sur le cadre : les dialogs, menus et panneaux sont rendus dans un portail, hors du cadre, et doivent suivre l'espace d'où ils s'ouvrent.
- **Boutons et badges restent entièrement arrondis, comme partout dans le portail.** C'est une décision produit (« full rounded ») : les maquettes d'un espace ne la remplacent pas, même quand elles dessinent des rectangles arrondis. Ne jamais poser `--radius-button` ou `--radius-badge` dans la portée d'un espace, ni écrire un rayon à la main sur un bouton ou un badge : `rounded-button` et `rounded-badge`. Les numéros de la pagination numérotée sont des boutons : ils suivent `rounded-button`.
- **Indicateurs sobres** : une carte d'indicateur n'a pas de couleur. Pas de tuile d'icône teintée, pas de pastille « +12 % » : l'icône seule en noir, le chiffre, le libellé. La couleur reste réservée aux statuts et aux alertes. C'est une demande du produit, que les maquettes (tuiles colorées, tendances) ne remplacent pas.
- **Indicateurs sur téléphone** : une grille de petites cartes, deux par rangée, la cinquième sous les quatre autres (`KpiRow`, dans `src/features/agency/components/page.tsx`). Jamais de rangée à faire défiler de côté. Un chiffre clé n'est jamais coupé : dans une carte étroite, son unité passe sous le nombre.

Primitives étendues pour ces écrans (toutes gardent leur rendu d'avant par défaut) :

| Primitive | Ajout |
|---|---|
| `Stat` | `layout="figure"` : la carte d'une rangée d'indicateurs. L'icône seule, en noir, ni teintée ni dans une tuile ; le chiffre ; son libellé dessous ; aucune pastille de tendance (ce à quoi le chiffre se compare se dit en mots, dans `hint`). `onSelect` et `pressed` : la carte entière devient un bouton qui filtre la liste dont elle est le compteur |
| `Section` | `icon`, `tone` : tuile d'icône avant le titre. `iconTileClass` donne la classe de la tuile pour un autre usage |
| `DescriptionList` | `icon` par ligne, avant le libellé |
| `Alert` | `actionsPlacement="end"` : l'action à droite du message à partir de 768 px. `onDismiss` : le lecteur peut ranger le message |
| `Avatar` | `size="xl"` pour le haut d'une fiche |
| `Button`, `PageHeader`, `DataTable`, `Pagination` | voir leurs sections |

Statuts ajoutés (`status/domains.ts`) :

| Domaine | Ce qu'il nomme |
|---|---|
| `agencyDelivery` | Les statuts d'un colis dans les mots de l'agence (« À assigner », « À ramasser », « En livraison »…), et `to_accept` pour une demande qu'elle n'a pas encore acceptée |
| `deliveryPayment` | Le paiement d'une livraison, en mots courts (« Payé », « À encaisser », « Payé en partie ») |
| `courierActivity` | Ce qu'un livreur fait, tel que le serveur le calcule : `on_delivery`, `available`, `paused`, `to_verify`, `suspended` |

Impression : `@media print` retire le cadre (menu, barre du haut, barre d'onglets) et laisse sortir toute la page. Une page qui imprime un document cache son contenu d'écran (`print:hidden`) et montre le document (`hidden print:block`) : voir le bon de livraison de la fiche livraison.

Code de l'espace : `src/features/agency/{deliveries,couriers,dashboard}` (contrats Zod, appels, états), `src/features/agency/components` (pièces partagées par les écrans), `src/app/(agency)/agency/*` (pages). Tests : `npx vitest run src/features/agency src/design-system`, puis `npx next build --webpack && npx playwright test -c playwright.agency.config.ts`.

## 11. Espace Coursier (V4)

Les écrans du coursier suivent leurs maquettes (`docs/captures/references/v4-coursier-planche-3.png` ; les trois autres planches pour ce que la 3 ne dessine pas). Le téléphone est l'écran pour lequel ils sont faits.

- **Cadre** : `DriverPage` (une colonne de 42 rem, ou `wide` pour l'accueil et l'historique), `ScreenHeader` (retour à gauche, titre centré sur téléphone comme dans une application), `ActionBar` (l'action de l'écran, posée sur la barre d'onglets du téléphone). Dans `src/features/driver/components/frame.tsx`.
- **Indicateurs** : `KpiCard`, le dessin des indicateurs de l'Agence (section 10, `Stat layout="figure"`) : l'icône seule, anthracite, sans tuile ni teinte ; le chiffre ; son libellé court. Une carte est un lien quand une liste se trouve derrière son chiffre. `KpiGrid`, deux par rangée sur téléphone, le cinquième sous les quatre autres. La planche 3 dessinait une tuile teintée par indicateur : décision V4.1, les indicateurs suivent la V3, la couleur est réservée à ce qu'un statut dit. Aucune tendance, aucun chiffre calculé par l'écran.
- **Carte de mission** (`MissionCard`) : référence, statut, la boutique (tuile verte) et le destinataire (tuile rouge), ce qui est à encaisser, une action. Les deux tuiles disent les deux bouts du trajet : elles informent, elles ne décorent pas.
- **Progression** (`MissionJourney`) : quatre étapes, la dernière atteinte est l'étape en cours. Lue comme une liste par les lecteurs d'écran (« En transit : en cours »).
- **Carte** (`MissionMap`) : les deux lieux, quand le serveur a leurs coordonnées. Ni position du coursier, ni tracé, ni distance : « Voir l'itinéraire » ouvre une vraie application de cartes. Tuiles relayées par le portail (`StaticMap`, prop `others` pour le second lieu).
- **Statuts** : domaine `courierMission` (`CourierDeliveryService::stageOf`). « assigned » ne dit pas si la mission est à accepter, à collecter ou collectée : le serveur le dit, l'écran ne le déduit pas.
- **Actions** : `next_actions` et `blocked_actions` viennent du serveur. Un écran n'offre que ce qui y figure (`can(mission, action)`), et dit ce qui retient l'étape suivante (`blockedReason`). Aucune règle du parcours n'est recopiée dans le portail.
- **Codes** : le code d'une boutique et celui du client ne sont jamais affichés au coursier. Il saisit ce qu'on lui dit ; le serveur vérifie.
- **Argent** : `collectionOf(mission)` donne la ligne sous le montant. « À encaisser (COD) » seulement pour un paiement à la livraison en espèces ; un COD Mixte se paie par mobile money et n'affiche jamais de montant à encaisser.
- **Navigation** : Accueil, Missions, Historique, Profil sont les quatre onglets du téléphone ; Documents, Gains, Messages, Paramètres et Aide sont dans le menu. Un coursier qui ne peut pas encore livrer voit « Mon dossier » à la place d'Accueil et de Missions (`courierCanWork`, confort de navigation : le serveur refuse les missions de lui-même).

Code de l'espace : `src/features/driver/{missions,history,kyc}` (contrats Zod, appels, états), `src/features/driver/components`, `src/app/(driver)/driver/*`. Tests : `npx vitest run src/features/driver`, puis `npx next build --webpack && npx playwright test -c playwright.driver.config.ts`. Captures : `CAPTURE=1 npx playwright test -c playwright.driver.config.ts e2e/driver/captures.spec.ts` vers `docs/captures/v4-courier/`.

## 12. Sugu Box (V6)

Les sept écrans Sugu Box du vendeur suivent leurs maquettes (`docs/captures/references/v6-sugubox-*.png`). Tout y est en lecture : l'entrepôt reçoit, prépare et expédie ; le vendeur suit.

- **Cadre** : `BoxPage`, et les pièces partagées dans `src/features/vendor/sugubox/components/bits.tsx`.
- **Chiffres de la Vue d'ensemble** (`FigureCard`) : l'icône seule, le libellé, le chiffre, ce qu'il compte, et le lien vers la liste qu'il résume.
- **Compteurs d'une liste** (`FilterFigure`) : l'icône à gauche, sans tuile ni teinte ; le libellé, le chiffre, et un chevron quand la carte filtre la liste qu'elle compte (`aria-pressed`). Deux par rangée sur téléphone (`KpiGrid`). Les maquettes dessinent des tuiles colorées : la règle des indicateurs sobres (section 10) passe avant.
- **Parcours** (`Journey`) : les étapes d'une réception ou d'une expédition, lues comme une liste (« Contrôle : en cours »). Une étape n'a de date que si le serveur en a une.
- **Statuts** : `suguBoxInbound`, `suguBoxOutbound`, `stock`, et `suguBoxMovement` pour le type d'un mouvement. L'état d'une ligne (« Conforme », « Écart (−2) », « Préparé ») se déduit de ses deux quantités : c'est un `Badge`, pas un statut du serveur.
- **Quantités** : « Disponible », « Réservé », « Total », « Avant » et « Après » sont lus tels que Laravel les calcule. L'écran n'additionne rien.
- **Listes** : recherche, filtres, tri et pages vivent dans l'adresse (`useListAddress`) et sont appliqués par le serveur. Une plage de dates inversée est dite, pas envoyée.
- **`DataTable tableFrom="narrow"`** : une table courte dans un panneau qui partage sa rangée reste une table dès 512 px de conteneur (672 px par défaut).
- **Ce qui n'est pas dessiné** : aucune action de l'entrepôt (nouvelle réception, validation, ajustement, marquer comme expédiée), ni ce que le produit ne contient pas (fournisseur, transporteur, documents joints).

Code : `src/features/vendor/sugubox/{contract,api,hooks}.ts`, `components/`, `src/app/(vendor)/vendor/sugubox/*`. Tests : `npx vitest run src/features/vendor/sugubox`, puis `npx next build --webpack && npx playwright test -c playwright.sugubox.config.ts`. Captures : `CAPTURE=1 npx playwright test -c playwright.sugubox.config.ts e2e/sugubox/captures.spec.ts` vers `docs/captures/v6-sugu-box/apres/`.

## 13. Clients, Marketing et Statistiques (V7)

Les écrans du vendeur (`/vendor/clients`, `/vendor/marketing`, `/vendor/statistics`) et les statistiques de l'agence (`/agency/statistics`) suivent la planche 1 de `docs/captures/references/v7-clients-marketing-stats-planche-*.png`.

- **Chiffre d'une page** (`Figure`, `src/features/vendor/clients/components/bits.tsx`) : l'icône à gauche, le chiffre, son libellé, et au besoin une ligne de comparaison. L'icône reste en encre, sans tuile. La carte se mesure elle-même : étroite (téléphone, quatre de front sur tablette), l'icône passe au-dessus et le chiffre prend toute la largeur. Avec `onSelect`, elle filtre la liste qu'elle compte (`aria-pressed`).
- **Montant en chiffre clé** (`Amount`) : le nombre n'est jamais coupé ; dans une carte étroite l'unité passe dessous, entière.
- **Comparaison** (`Trend`, `src/features/insights/bits.tsx`) : le taux que le serveur a calculé, son sens en mots pour un lecteur d'écran, et « avant : … ». Vert quand le chiffre va dans le bon sens (`lowerIsBetter` pour les échecs). Quand la période précédente est vide, le serveur ne donne pas de taux et l'écran n'en montre pas : jamais de « +100 % ».
- **Période** (`PeriodControl`) : les trois durées que le serveur connaît, en bouton segmenté, et deux dates quand la page le permet. Une rangée, au-dessus de tout ce qu'elle délimite ; choisir relance une requête, et les chiffres précédents restent affichés, atténués, pendant qu'elle répond.
- **Graphiques** (`src/features/insights/charts.tsx`) : `DayChart` (aire sous une courbe pour un montant, barres pour un comptage) et `ShareRing` (un total et ses parts, six au plus). Une seule échelle, depuis zéro ; le jour pointé se lit au survol, au doigt et au clavier (flèches, Début, Fin) ; les mêmes chiffres sont dans une table pour qui ne voit pas le dessin. Les parts d'un total classé prennent une seule teinte, de pleine à pâle (`RANKED_SHADES`), nommées à côté ; les couleurs de statut restent aux statuts.
- **Statuts** : `customerSegment` (les six segments d'un client, calculés par le serveur) et `discount` (l'état calculé d'un code ou d'une promotion).
- **Listes** : comme partout, recherche, filtres, tri et page vivent dans l'adresse et sont appliqués par le serveur. Sur téléphone, les statuts des clients sont une rangée de pastilles pressées, chacune avec le compteur de toute la boutique.
- **Fiche client** : même route que la liste (`?client=`), avec retour à la liste telle qu'elle était filtrée.
- **Montants des formulaires** : saisis en francs, envoyés en centimes en un seul endroit (`toCentimes`, `src/features/vendor/marketing/contract.ts`).
- **Ce qui n'est pas dessiné** : ni WhatsApp ni SMS depuis une fiche, ni livraison gratuite (le paiement ne l'applique pas), ni note, entonnoir ou taux de conversion (rien ne les mesure), ni montant sur les statistiques de l'agence.

Code : `src/features/vendor/{clients,marketing,statistics}`, `src/features/agency/statistics`, `src/features/insights`. Tests : `npx vitest run src/features/insights`, puis `npx next build --webpack && npx playwright test -c playwright.commerce.config.ts`. Captures : `CAPTURE=1 npx playwright test -c playwright.commerce.config.ts e2e/commerce/captures.spec.ts` vers `docs/captures/v7-clients-marketing-statistics/`.
