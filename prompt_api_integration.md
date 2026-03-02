# 🔌 PROMPT — Intégration API Réelle SUGU SaaS

> **Usage** : Copie ce prompt tel quel, puis ajoute à la fin :  
> `👉 PAGE À IMPLÉMENTER : [nom de la page]`

---

## 🎯 MISSION

Tu es un **Senior Full-Stack Engineer** obsédé par la perfection du code atomique. Ta mission est de **connecter le frontend Next.js (sugu-saas)** aux **APIs réelles** du backend Laravel hébergé sur **`https://api.mysugu.com/api/v1/`**.

Le frontend utilise actuellement des **données mockées**. Tu dois remplacer **uniquement les corps des fonctions du service layer** par de vrais appels API, sans toucher au design, ni à la structure des composants, ni à l'UX existante — **sauf si strictement nécessaire** pour consommer une forme de donnée différente du backend.

---

## 📐 ARCHITECTURE DU FRONTEND (NON NÉGOCIABLE)

### Stack
- **Framework** : Next.js 15+ (App Router)
- **State serveur** : TanStack React Query v5
- **Validation** : Zod (schemas stricts)
- **HTTP** : Client centralisé `@/lib/http/client.ts` → objet [api](file:///c:/xampp/htdocs/sugu-saas/src/lib/http/client.ts#64-190) (get, post, put, patch, delete)
- **Auth** : Token Bearer via cookie `sugu_token`, lu automatiquement par [apiRequest()](file:///c:/xampp/htdocs/sugu-saas/src/lib/http/client.ts#64-190)
- **Env** : `NEXT_PUBLIC_API_BASE_URL` défini dans [.env.local](file:///c:/xampp/htdocs/sugu-saas/.env.local) (actuellement `http://localhost:8000/api`, à changer pour `https://api.mysugu.com/api` en production)

### Structure des fichiers par feature

```
src/features/{domain}/
├── schema.ts      ← Zod schemas + types inférés
├── service.ts     ← Fonctions async : SEUL fichier à modifier pour brancher l'API
├── hooks.ts       ← React Query hooks (useQuery / useMutation) qui appellent service.ts
├── mocks/         ← Données mockées (à NE PAS supprimer, garder pour fallback/dev)
└── index.ts       ← Barrel exports
```

### Couche HTTP centralisée

```typescript
// src/lib/http/client.ts — NE PAS MODIFIER
export const api = {
  get:    <T>(path, opts?) => apiRequest<T>(path, { ...opts, method: "GET" }),
  post:   <T>(path, body?, opts?) => apiRequest<T>(path, { ...opts, method: "POST", body }),
  put:    <T>(path, body?, opts?) => apiRequest<T>(path, { ...opts, method: "PUT", body }),
  patch:  <T>(path, body?, opts?) => apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path, opts?) => apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
```

Caractéristiques déjà implémentées dans [apiRequest()](file:///c:/xampp/htdocs/sugu-saas/src/lib/http/client.ts#64-190) :
- Token Bearer auto-injecté depuis le cookie `sugu_token`
- Retry avec backoff exponentiel (GET : 2 retries, mutations : 0)
- Timeout configurable (default 15s)
- Correlation ID (`X-Request-Id`)
- Gestion typée des erreurs via [ApiError](file:///c:/xampp/htdocs/sugu-saas/src/lib/http/api-error.ts#6-57) (401, 403, 422, 429, 5xx, network, timeout)
- Support AbortController

### Query Keys centralisés

```typescript
// src/lib/query/keys.ts — AJOUTER les clés manquantes ici si nécessaire
export const queryKeys = {
  auth:   { all, session, me },
  vendor: { all, dashboard, orders(filters?), products(filters?) },
  agency: { all, dashboard, deliveries(filters?) },
};
```

### Types globaux

```typescript
// src/types/index.ts
interface PaginatedResponse<T> { data: T[]; meta: { current_page, last_page, per_page, total } }
interface ApiSuccessResponse<T> { data: T; message?: string }
interface ApiErrorResponse { message: string; errors?: Record<string, string[]>; status: number }
```

---

## 🔗 ARCHITECTURE DU BACKEND (Laravel — repo `../sugu`)

### Base URL API
`https://api.mysugu.com/api/v1/`

### Authentification
- **Sanctum** : Token Bearer via `auth:sanctum` middleware
- Login endpoint : `POST /v1/auth/login` → retourne `{ data: { user, token } }`
- Current user : `GET /v1/auth/me` → retourne `{ data: User }`

### Routes Seller (Vendor) — Préfixe : `/v1/sellers/`

| Fonctionnalité | Méthode | Endpoint | Controller |
|---|---|---|---|
| **Dashboard** | GET | `/sellers/dashboard` | `SellerDashboardController@index` |
| **Dashboard export** | POST | `/sellers/dashboard/export` | `SellerDashboardController@export` |
| **Dashboard filter** | GET | `/sellers/dashboard/filter` | `SellerDashboardController@filter` |
| **Products list** | GET | `/sellers/products` | `SellerProductController@index` |
| **Product detail** | GET | `/sellers/products/{id}` | `SellerProductController@show` |
| **Product create** | POST | `/sellers/products` | `SellerProductController@store` |
| **Product update** | PUT | `/sellers/products/{id}` | `SellerProductController@update` |
| **Product delete** | DELETE | `/sellers/products/{id}` | `SellerProductController@destroy` |
| **Product categories** | GET | `/sellers/products/categories` | `SellerProductController@categories` |
| **Product brands** | GET | `/sellers/products/brands` | `SellerProductController@brands` |
| **Product stats** | GET | `/sellers/products/stats` | `SellerProductController@stats` |
| **Product variant options** | GET | `/sellers/products/variant-options` | `SellerProductController@variantOptions` |
| **Orders list** | GET | `/sellers/orders` | `SellerOrderController@index` |
| **Order detail** | GET | `/sellers/orders/{id}` | `SellerOrderController@show` |
| **Order create** | POST | `/sellers/orders` | `SellerOrderController@store` |
| **Order confirm** | POST | `/sellers/orders/{id}/confirm` | `SellerOrderController@confirm` |
| **Order cancel** | POST | `/sellers/orders/{id}/cancel` | `SellerOrderController@cancel` |
| **Order request delivery** | POST | `/sellers/orders/{id}/request-delivery` | `SellerOrderController@requestDelivery` |
| **Order stats** | GET | `/sellers/orders/stats` | `SellerOrderController@stats` |
| **Customers list** | GET | `/sellers/customers` | `SellerCustomerController@index` |
| **Customer detail** | GET | `/sellers/customers/{id}` | `SellerCustomerController@show` |
| **Customer stats** | GET | `/sellers/customers/stats` | `SellerCustomerController@stats` |
| **Customer create** | POST | `/sellers/customers` | `SellerCustomerController@store` |
| **Inventory products** | GET | `/sellers/inventory/products` | `SellerInventoryController@getProducts` |
| **Inventory stats** | GET | `/sellers/inventory/stats` | `SellerInventoryController@getStats` |
| **Inventory tabs** | GET | `/sellers/inventory/tabs` | `SellerInventoryController@getTabCounts` |
| **Inventory alerts** | GET | `/sellers/inventory/alerts` | `SellerInventoryController@getAlerts` |
| **Inventory add stock** | POST | `/sellers/inventory/{id}/add-stock` | `SellerInventoryController@addStock` |
| **Statistics** | GET | `/sellers/statistics` | `SellerStatisticsController@index` |
| **Settings** | GET | `/sellers/settings` | `SellerSettingsController@index` |
| **Settings identity** | PUT | `/sellers/settings/identity` | `SellerSettingsController@updateIdentity` |
| **Settings contact** | PUT | `/sellers/settings/contact` | `SellerSettingsController@updateContact` |
| **Settings legal** | PUT | `/sellers/settings/legal` | `SellerSettingsController@updateLegal` |
| **Settings operations** | PUT | `/sellers/settings/operations` | `SellerSettingsController@updateOperations` |
| **Settings notifications** | PUT | `/sellers/settings/notifications` | `SellerSettingsController@updateNotifications` |
| **Settings password** | PUT | `/sellers/settings/security/password` | `SellerSettingsController@updatePassword` |
| **Tickets list** | GET | `/sellers/support/tickets` | `SellerTicketController@index` |
| **Ticket detail** | GET | `/sellers/support/tickets/{ticket}` | `SellerTicketController@show` |
| **Ticket create** | POST | `/sellers/support/tickets` | `SellerTicketController@store` |
| **Ticket messages** | GET | `/sellers/support/tickets/{ticket}/messages` | `SellerTicketController@messages` |
| **Ticket send msg** | POST | `/sellers/support/tickets/{ticket}/messages` | `SellerTicketController@sendMessage` |
| **Ticket close** | POST | `/sellers/support/tickets/{ticket}/close` | `SellerTicketController@close` |

---

## 📜 RÈGLES NON NÉGOCIABLES

### 1. Zéro appel API direct dans un composant
```
❌ INTERDIT : fetch() ou api.get() dans un composant React
✅ OBLIGATOIRE : Composant → Hook (hooks.ts) → Service (service.ts) → api client (lib/http)
```

### 2. Flux de données strict (sens unique)
```
[Composant] → useQuery/useMutation (hooks.ts)
                    ↓
              service function (service.ts)
                    ↓
              api.get/post/... (lib/http/client.ts)
                    ↓
              Zod .parse() validation
                    ↓
              Données typées retournées
```

### 3. Validation Zod obligatoire
- **Toutes** les réponses API **DOIVENT** passer par un `schema.parse(response)` ou `schema.safeParse(response)`
- Si la forme du backend diffère du schema existant, tu as **deux options** :
  - **Option A (préférée)** : Créer un `transformApiResponse()` dans le service pour mapper la réponse API vers le schema existant → **zéro changement de composant**
  - **Option B** : Adapter le Zod schema **si et seulement si** la donnée backend est plus riche/correcte → mettre à jour les types inférés

### 4. Gestion des états de chargement
Pour chaque page connectée, tu **DOIS** :
- Utiliser le `isLoading` / `isPending` de React Query pour afficher des **skeleton loaders** (pas des spinners basiques)
- Créer un skeleton dédié par page si le `PageSkeleton` générique ne correspond pas à la structure
- Utiliser `isError` + composant d'erreur gracieux avec bouton **Réessayer** (`refetch()`)
- Utiliser `placeholderData: keepPreviousData` pour la pagination (pas de flash blanc)
- Utiliser `staleTime` adapté à la fréquence de mise à jour des données

### 5. Optimistic Updates pour les mutations
Pour toute mutation (create, update, delete) :
```typescript
useMutation({
  mutationFn: ...,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: [...] });
    const previous = queryClient.getQueryData([...]);
    queryClient.setQueryData([...], optimisticUpdate);
    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData([...], context?.previous);
    toast.error(err.message);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: [...] });
  },
});
```

### 6. Sécurité — zéro faille
- **Jamais** de token en localStorage — utiliser uniquement le cookie `sugu_token`
- **Jamais** de console.log en production avec des données sensibles
- **Toujours** valider côté client ET s'assurer que le backend valide aussi
- Gérer le **401** globalement : si `ApiError.isUnauthorized`, rediriger vers `/login`
- Gérer le **403** : afficher un message d'accès refusé
- Gérer le **429** : afficher un message de rate limiting avec temps d'attente
- Sanitiser tout input avant envoi

### 7. Pas de pseudo-code
- Chaque modification est un code **complet, fonctionnel, prêt pour la production**
- Pas de `// TODO`, pas de `// ...rest of the code`, pas de `/* implement later */`
- Si une fonctionnalité manque au backend, tu la **crées** dans le backend (controller + route + migration si nécessaire)

### 8. Performance ultra-rapide
- `staleTime` optimisé par type de donnée (dashboard: 2min, liste: 1min, détail: 30s)
- `prefetchQuery` pour les routes prévisibles (ex: au hover d'un lien produit)
- `select` dans useQuery pour ne re-render que les données nécessaires
- Pagination avec `keepPreviousData` pour zéro flash
- `enabled: !!id` pour les queries conditionnelles

### 9. Aucun changement de design
- **ZÉRO** modification de classes CSS/Tailwind
- **ZÉRO** modification de structure JSX sauf ajout de wrappers loading/error
- **ZÉRO** modification de noms de composants
- Le design est **validé et figé** — tu ne touches qu'à la plomberie data

---

## 🔄 PROCESSUS D'IMPLÉMENTATION (pour chaque page)

### Phase 1 — Analyse (OBLIGATOIRE avant tout code)
1. **Lire le controller Laravel** correspondant dans `../sugu/app/Http/Controllers/Api/V1/Sellers/`
2. **Identifier** la forme exacte de la réponse JSON du controller (`return response()->json(...)`)
3. **Comparer** avec le Zod schema existant dans `src/features/vendor/schema.ts`
4. **Lister** les écarts (champs manquants, noms différents, structure différente)
5. **Décider** : transformer dans le service (Option A) ou adapter le schema (Option B)
6. **Vérifier** s'il manque des endpoints/données au backend → les créer si nécessaire

### Phase 2 — Implémentation
1. **Mettre à jour `queryKeys`** dans `src/lib/query/keys.ts` si la page nécessite de nouvelles clés
2. **Modifier `service.ts`** : remplacer le corps de chaque fonction mock par un vrai appel `api.get/post/...` + `.parse()`
3. **Ajouter un transformer** si la forme API ≠ forme schema (dans `service.ts`, fonction privée `_transformXxxResponse`)
4. **Créer/mettre à jour les hooks** dans `hooks.ts` : ajouter `useQuery` / `useMutation` pour chaque opération
5. **Créer un skeleton dédié** si le `PageSkeleton` générique ne suffit pas
6. **Ajouter les wrappers loading/error** dans les composants page si absents
7. **Gérer les mutations** avec optimistic updates + invalidation

### Phase 3 — Vérification
1. **TypeScript** : zéro erreur `tsc --noEmit`
2. **Runtime** : tester chaque état (loading, success, error, empty)
3. **Edge cases** : pagination vide, données manquantes, timeout, 401 après expiration token
4. **Vérifier** que le fallback mock peut toujours fonctionner si l'env `NEXT_PUBLIC_ENABLE_MSW=true`

---

## 🔧 MODÈLE DE MODIFICATION DU SERVICE

```typescript
// AVANT (mock)
export async function getVendorDashboard(): Promise<VendorDashboardData> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return vendorDashboardSchema.parse(mockVendorDashboard);
}

// APRÈS (API réelle)
export async function getVendorDashboard(): Promise<VendorDashboardData> {
  const response = await api.get<ApiSuccessResponse<unknown>>("/v1/sellers/dashboard");
  return vendorDashboardSchema.parse(_transformDashboardResponse(response.data));
}

/** @internal Mappe la réponse API vers la forme attendue par le schema */
function _transformDashboardResponse(raw: unknown): unknown {
  // Si la forme est identique, retourner tel quel
  // Si elle diffère, mapper champ par champ
  return raw;
}
```

---

## 🔧 MODÈLE DE HOOK

```typescript
// hooks.ts
"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query";
import * as vendorService from "./service";

export function useVendorDashboard() {
  return useQuery({
    queryKey: queryKeys.vendor.dashboard(),
    queryFn: () => vendorService.getVendorDashboard(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useVendorProducts(filters?: { status?: string; page?: number; search?: string }) {
  return useQuery({
    queryKey: queryKeys.vendor.products(filters),
    queryFn: () => vendorService.getVendorProducts(filters?.status, filters?.page, filters?.search),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
```

---

## 🔧 MODÈLE DE COMPOSANT AVEC SKELETON + ERROR

```tsx
"use client";

import { useVendorDashboard } from "@/features/vendor/hooks";
import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { ErrorState } from "@/components/feedback/error-state";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useVendorDashboard();

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (!data) return null;

  return <DashboardContent data={data} />;
}
```

---

## 🏗️ BFF (Route Handlers Next.js)

Les route handlers Auth dans `src/app/api/auth/` sont actuellement en **mock**. Ils doivent également être connectés à l'API réelle :

- `POST /api/auth/login` → proxy vers `POST https://api.mysugu.com/api/v1/auth/login`
- `GET /api/auth/me` → proxy vers `GET https://api.mysugu.com/api/v1/auth/me` avec le token du cookie
- `POST /api/auth/logout` → proxy vers `POST https://api.mysugu.com/api/v1/auth/logout` + clear cookie

Le BFF doit :
- Recevoir les credentials du client
- Forward vers l'API Laravel
- Récupérer le token
- Le stocker dans un cookie httpOnly (sécurisé en prod)
- Retourner le user au client

---

## 📝 FORMAT DE LIVRAISON

Pour chaque page que je te demande d'implémenter, tu dois produire :

1. **Analyse** : tableau des écarts API vs Schema (avant tout code)
2. **Fichiers modifiés** : liste exhaustive avec le diff
3. **Fichiers créés** (si nécessaire) : nouveaux hooks, skeletons, transformers, endpoints backend
4. **Résumé des endpoints utilisés** : méthode + path + paramètres
5. **Test manuel** : les étapes pour vérifier que tout fonctionne

---

## ⚠️ CE QUE TU NE FAIS JAMAIS

- ❌ Appeler `fetch()` ou `api.*()` directement dans un composant React
- ❌ Utiliser `useEffect` pour fetch des données (obligation React Query)
- ❌ Stocker le token dans `localStorage` ou `sessionStorage`
- ❌ Ignorer une erreur Zod parse (= bug critique)
- ❌ Laisser un `console.log` de debug en production
- ❌ Écrire du pseudo-code ou des TODO
- ❌ Modifier l'UI/design sans raison impérative liée aux données
- ❌ Créer des fichiers qui ne sont pas utilisés
- ❌ Dupliquer de la logique déjà existante
- ❌ Utiliser `any` (strict TypeScript uniquement)

---

> 👉 **PAGE À IMPLÉMENTER :** [Précise ici la page que tu veux connecter]
