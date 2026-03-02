# SUGU SaaS — Architecture Frontend

## Vue d'ensemble

SUGU SaaS est une plateforme multi-rôle (Vendeur / Agence de livraison) construite avec **Next.js 16**, **React 19**, **TypeScript strict**, **Tailwind CSS v4**, et **TanStack React Query**.

---

## Structure du projet

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route Group — authentification
│   │   ├── layout.tsx            # Layout minimal (pas de shell)
│   │   └── login/page.tsx        # Page de connexion
│   ├── (vendor)/                 # Route Group — espace vendeur
│   │   ├── layout.tsx            # Layout avec shell vendeur + guards
│   │   └── vendor/
│   │       ├── dashboard/page.tsx
│   │       ├── orders/page.tsx
│   │       └── products/page.tsx
│   ├── (agency)/                 # Route Group — espace agence
│   │   ├── layout.tsx            # Layout avec shell agence + guards
│   │   └── agency/
│   │       ├── dashboard/page.tsx
│   │       └── deliveries/page.tsx
│   ├── api/auth/                 # Route Handlers (BFF proxy)
│   │   ├── login/route.ts
│   │   └── logout/route.ts
│   ├── error.tsx                 # Error boundary global
│   ├── not-found.tsx             # 404
│   ├── loading.tsx               # Suspense fallback
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Design tokens + global styles
│
├── components/
│   ├── shell/                    # Application shell
│   │   ├── sidebar.tsx           # Sidebar responsive collapsible
│   │   ├── topbar.tsx            # Topbar (search, notifs, user)
│   │   ├── breadcrumbs.tsx       # Auto‑breadcrumbs
│   │   ├── user-menu.tsx         # User dropdown
│   │   └── theme-switch.tsx      # Light/Dark toggle
│   ├── guards/                   # Route protection
│   │   ├── auth-guard.tsx        # Authentification requise
│   │   └── role-guard.tsx        # Rôle requis (vendor/agency)
│   ├── feedback/                 # États UI
│   │   ├── empty-state.tsx       # Aucune donnée
│   │   └── error-state.tsx       # Erreur de chargement
│   ├── skeletons/                # Loading skeletons
│   │   └── index.tsx
│   └── providers.tsx             # QueryClient + Theme providers
│
├── features/                     # Modules métier (par domaine)
│   ├── auth/
│   │   ├── schema.ts             # Zod schemas
│   │   ├── service.ts            # API calls
│   │   ├── hooks.ts              # React hooks
│   │   ├── login-form.tsx        # Login form component
│   │   └── index.ts
│   ├── vendor/
│   │   ├── service.ts
│   │   ├── hooks.ts
│   │   └── index.ts
│   └── agency/
│       ├── service.ts
│       ├── hooks.ts
│       └── index.ts
│
├── lib/                          # Infrastructure partagée
│   ├── http/
│   │   ├── client.ts             # Client fetch central
│   │   ├── api-error.ts          # Erreur typée
│   │   └── index.ts
│   ├── query/
│   │   ├── query-client.ts       # QueryClient singleton
│   │   ├── keys.ts               # Query key factory
│   │   └── index.ts
│   ├── env/
│   │   └── index.ts              # Env validation Zod
│   ├── security/
│   │   └── index.ts              # Token cookies, sanitize
│   └── utils/
│       └── index.ts              # cn(), formatCurrency(), etc.
│
├── types/
│   └── index.ts                  # Types globaux
│
├── tests/
│   ├── mocks/
│   │   ├── handlers.ts           # MSW handlers
│   │   └── server.ts             # MSW server
│   ├── setup.ts                  # Vitest setup
│   ├── error-state.test.tsx
│   └── sidebar.test.tsx
│
└── middleware.ts                  # Route protection middleware
```

---

## Architecture en couches

```
┌─────────────────────────────────────────────────────────────┐
│                        App Router                           │
│  (auth) / (vendor) / (agency) — Route Groups               │
├─────────────────────────────────────────────────────────────┤
│                     UI Components                           │
│  Shell, Guards, Feedback, Skeletons                         │
│  ⚠️ ZÉRO logique métier dans cette couche                  │
├─────────────────────────────────────────────────────────────┤
│                    Features (Domain)                        │
│  auth/ vendor/ agency/                                      │
│  Chaque module : schema.ts → service.ts → hooks.ts          │
├─────────────────────────────────────────────────────────────┤
│                   Lib (Infrastructure)                      │
│  http/ query/ env/ security/ utils/                         │
│  Client API central, clés query, validation env             │
├─────────────────────────────────────────────────────────────┤
│                       Types                                 │
│  Interfaces et types partagés                               │
└─────────────────────────────────────────────────────────────┘
```

### Boundary Rules

| Couche        | Peut importer de…          | NE peut PAS importer de…      |
|---------------|----------------------------|-------------------------------|
| `app/`        | components, features, lib  | —                             |
| `components/` | lib, types                 | features, app                 |
| `features/`   | lib, types                 | components, app               |
| `lib/`        | types                      | components, features, app     |
| `types/`      | —                          | tout                          |

> **Exception** : `components/guards/` peut importer `features/auth` car les guards consomment directement l'état auth.

---

## Data Flow

```
User Action
    │
    ▼
[React Component] ──► useXxx() hook (TanStack Query)
                           │
                           ▼
                   [service.ts] ──► api.get/post() (lib/http/client.ts)
                                        │
                                        ▼
                                   fetch() ─► Backend API
                                        │
                                        ▼
                                   Zod validation
                                        │
                                        ▼
                              QueryClient cache ──► UI re‑render
```

---

## Auth Flow

```
1. User submits login form
2. LoginForm → useLogin() → authService.login()
3. api.post("/auth/login") → backend
4. On success:
   a. Token stored in httpOnly cookie (via Route Handler /api/auth/login)
   b. User cached in QueryClient
   c. Router redirects to /vendor/dashboard or /agency/dashboard
5. Subsequent requests: middleware checks sugu_token cookie
6. API calls: client.ts reads token from cookie and sets Authorization header
7. Logout: Route Handler clears cookie, QueryClient cleared, redirect to /login
```

---

## Gestion d'erreurs

| HTTP Status | Comportement                            |
|-------------|----------------------------------------|
| 401         | Redirect → /login, cookie cleared       |
| 403         | Message "accès refusé", pas de redirect |
| 422         | Erreurs de validation affichées inline  |
| 429         | Message "trop de tentatives"            |
| 5xx         | ErrorState avec retry                   |
| Timeout     | Retry automatique (GET), ErrorState     |
| Network     | Retry automatique (GET), ErrorState     |

---

## Performance

- **Code splitting** : Route Groups + dynamic imports
- **Caching** : TanStack Query (staleTime: 60s)
- **Suspense** : `loading.tsx` à chaque route group
- **Skeletons** : PageSkeleton, CardSkeleton pour UX perçue
- **React Compiler** : activé pour optimisation automatique
- **Font optimization** : Geist via next/font (no FOUT)

---

## Sécurité

- Headers CSP, X-Frame-Options, Referrer-Policy dans next.config.ts
- Token stocké en httpOnly cookie (jamais en localStorage)
- Route Handlers BFF pour gestion token côté serveur
- Middleware de protection des routes
- Validation Zod systématique des réponses API
- Aucun secret dans les fichiers client (NEXT_PUBLIC_* uniquement)
