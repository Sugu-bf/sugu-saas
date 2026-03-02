<p align="center">
  <img src="https://cdn.sugu.pro/s/theme/brand-logo.png" alt="SUGU Logo" width="220" />
</p>

<h1 align="center">SUGU SaaS — Portail Vendeur & Agence</h1>

<p align="center">
  <strong>Plateforme multi-rôle pour vendeurs et agences de livraison sur la marketplace SUGU</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=reactquery" alt="TanStack Query" />
</p>

---

## 📋 Table des matières

- [Présentation](#-présentation)
- [Fonctionnalités](#-fonctionnalités)
- [Stack Technique](#-stack-technique)
- [Architecture](#-architecture)
- [Structure du projet](#-structure-du-projet)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Variables d'environnement](#-variables-denvironnement)
- [Scripts disponibles](#-scripts-disponibles)
- [Tests](#-tests)
- [Documentation](#-documentation)
- [Licence](#-licence)

---

## 🎯 Présentation

**SUGU SaaS** est le portail d'administration dédié aux **vendeurs** et **agences de livraison** de l'écosystème [SUGU](https://mysugu.com) — la marketplace e-commerce #1 d'Afrique de l'Ouest.

L'application permet aux vendeurs de gérer leur boutique en ligne (produits, commandes, clients, marketing, statistiques) et aux agences de livraison de piloter leurs opérations (livraisons, livreurs, tableau de bord). Le tout depuis un portail unique, moderne et performant.

---

## ✨ Fonctionnalités

### 🏪 Espace Vendeur

| Module | Description |
|--------|-------------|
| **Dashboard** | Vue d'ensemble des ventes, commandes et revenus |
| **Produits** | Gestion complète du catalogue (CRUD, variantes, images Cloudinary) |
| **Commandes** | Suivi, traitement et historique des commandes |
| **Clients** | Base de données clients et historique d'achats |
| **Inventaire** | Suivi des stocks et alertes de réapprovisionnement |
| **Marketing** | Campagnes promotionnelles et codes de réduction |
| **Statistiques** | Tableaux de bord analytiques et rapports |
| **Tickets** | Support client et gestion des réclamations |
| **Paramètres** | Configuration de la boutique et préférences |

### 🚚 Espace Agence

| Module | Description |
|--------|-------------|
| **Dashboard** | Overview des livraisons en cours et KPIs |
| **Livraisons** | Gestion complète des expéditions (création, suivi, historique) |
| **Livreurs** | Gestion de la flotte de coursiers (profils, assignation) |
| **Statistiques** | Métriques de performance et rapports |
| **Paramètres** | Configuration de l'agence |

### 🌐 Landing Page

- Hero section avec animations et social proof
- Fonctionnement en 3 étapes
- Barre de statistiques live
- Témoignages clients
- Partenaires de confiance
- Grille tarifaire
- FAQ interactive
- Bannière CTA

---

## 🛠 Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| [Next.js](https://nextjs.org) | 16.1 | Framework React (App Router, RSC, Route Handlers BFF) |
| [React](https://react.dev) | 19.2 | UI Library (avec React Compiler activé) |
| [TypeScript](https://typescriptlang.org) | 5.x | Typage strict (`strict: true`, `noUnusedLocals`) |
| [Tailwind CSS](https://tailwindcss.com) | 4.x | Utility-first CSS framework |
| [TanStack Query](https://tanstack.com/query) | 5.x | Server state management et caching |
| [Radix UI](https://radix-ui.com) | — | Composants headless accessibles (Dialog, Dropdown, Toast…) |
| [Zod](https://zod.dev) | 3.x | Validation de schemas (formulaires & réponses API) |
| [Lucide React](https://lucide.dev) | — | Icônes SVG |
| [Sonner](https://sonner.emilkowal.ski) | 2.x | Notifications toast |
| [next-themes](https://github.com/pacocoursey/next-themes) | — | Thème Dark/Light |
| [CVA](https://cva.style) | — | Class Variance Authority pour les variants |

### 🧪 Outils de développement

| Outil | Usage |
|-------|-------|
| [Vitest](https://vitest.dev) | Tests unitaires (avec Testing Library) |
| [Playwright](https://playwright.dev) | Tests end-to-end |
| [MSW](https://mswjs.io) | Mock Service Worker pour les tests |
| [ESLint](https://eslint.org) | Linting (config next/core-web-vitals + TypeScript) |
| [Prettier](https://prettier.io) | Formatage de code |

---

## 🏗 Architecture

L'application suit une **architecture en couches** avec des frontières d'import strictes :

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
│  auth/ vendor/ agency/ landing/                             │
│  Chaque module : schema.ts → service.ts → hooks.ts         │
├─────────────────────────────────────────────────────────────┤
│                   Lib (Infrastructure)                      │
│  http/ query/ env/ security/ utils/                         │
│  Client API central, clés query, validation env             │
├─────────────────────────────────────────────────────────────┤
│                       Types                                 │
│  Interfaces et types partagés                               │
└─────────────────────────────────────────────────────────────┘
```

### Flux de données

```
User Action → [React Component] → useXxx() hook (TanStack Query)
                                        │
                                        ▼
                                 [service.ts] → api.get/post() (lib/http/client.ts)
                                                       │
                                                       ▼
                                                  fetch() → Backend API (Laravel)
                                                       │
                                                       ▼
                                                  Zod validation → QueryClient cache → UI re-render
```

### Règles d'import

| Couche | Peut importer de… | NE peut PAS importer de… |
|--------|-------------------|--------------------------|
| `app/` | components, features, lib | — |
| `components/` | lib, types | features, app |
| `features/` | lib, types | components, app |
| `lib/` | types | components, features, app |
| `types/` | — | tout |

> **Exception** : `components/guards/` peut importer `features/auth` car les guards consomment directement l'état auth.

---

## 📁 Structure du projet

```
sugu-saas/
├── docs/                             # Documentation technique
│   └── ARCHITECTURE_FRONTEND.md      # Architecture détaillée
├── e2e/                              # Tests end-to-end (Playwright)
│   └── login.spec.ts
├── public/                           # Assets statiques
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Route Group — authentification
│   │   ├── (vendor)/                 # Route Group — espace vendeur
│   │   │   └── vendor/
│   │   │       ├── dashboard/
│   │   │       ├── products/
│   │   │       ├── orders/
│   │   │       ├── clients/
│   │   │       ├── inventory/
│   │   │       ├── marketing/
│   │   │       ├── statistics/
│   │   │       ├── tickets/
│   │   │       └── settings/
│   │   ├── (agency)/                 # Route Group — espace agence
│   │   │   └── agency/
│   │   │       ├── dashboard/
│   │   │       ├── deliveries/
│   │   │       ├── drivers/
│   │   │       ├── statistics/
│   │   │       └── settings/
│   │   ├── api/                      # Route Handlers (BFF proxy)
│   │   │   ├── auth/                 # Login/Logout/Me
│   │   │   ├── vendor/               # Proxy vendeur
│   │   │   └── agency/               # Proxy agence
│   │   ├── globals.css               # Design tokens & styles globaux
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   ├── error.tsx                 # Error boundary global
│   │   ├── not-found.tsx             # Page 404
│   │   └── loading.tsx               # Suspense fallback
│   │
│   ├── components/                   # Composants partagés
│   │   ├── shell/                    # Sidebar, Topbar, Breadcrumbs, UserMenu
│   │   ├── guards/                   # AuthGuard, RoleGuard
│   │   ├── feedback/                 # EmptyState, ErrorState
│   │   ├── skeletons/                # Loading skeletons
│   │   └── providers.tsx             # QueryClient + Theme providers
│   │
│   ├── features/                     # Modules métier (Domain-Driven)
│   │   ├── auth/                     # Authentification
│   │   ├── vendor/                   # Logique vendeur
│   │   │   └── services/             # Services par domaine
│   │   │       ├── dashboard.service.ts
│   │   │       ├── products.service.ts
│   │   │       ├── orders.service.ts
│   │   │       ├── clients.service.ts
│   │   │       ├── inventory.service.ts
│   │   │       ├── marketing.service.ts
│   │   │       ├── statistics.service.ts
│   │   │       ├── tickets.service.ts
│   │   │       └── settings.service.ts
│   │   ├── agency/                   # Logique agence
│   │   └── landing/                  # Landing page components
│   │       └── components/           # Navbar, Hero, FAQ, Pricing…
│   │
│   ├── lib/                          # Infrastructure partagée
│   │   ├── http/                     # Client fetch central & erreurs typées
│   │   ├── query/                    # QueryClient, Query Keys factory
│   │   ├── env/                      # Validation Zod des variables d'env
│   │   ├── security/                 # Token cookies, sanitize
│   │   └── utils/                    # cn(), formatCurrency(), etc.
│   │
│   ├── types/                        # Types globaux
│   └── tests/                        # Tests unitaires
│       └── mocks/                    # MSW handlers & server
│
├── .env.example                      # Template des variables d'environnement
├── next.config.ts                    # Config Next.js (CSP, images, React Compiler)
├── tailwind.config.ts                # Config Tailwind CSS v4
├── tsconfig.json                     # Config TypeScript strict
├── vitest.config.ts                  # Config Vitest
├── playwright.config.ts             # Config Playwright
├── eslint.config.mjs                 # Config ESLint
└── package.json
```

---

## 📦 Prérequis

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (ou pnpm / yarn)
- **Backend API SUGU** en cours d'exécution (Laravel — `http://localhost:8000`)

---

## 🚀 Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/your-org/sugu-saas.git
cd sugu-saas

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos valeurs

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

---

## 🔐 Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir les valeurs :

```env
# --- Public (exposé au navigateur) ---
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=SUGU
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Serveur uniquement ---
API_SECRET_KEY=          # Clé secrète pour le proxy BFF
SESSION_SECRET=          # Secret de session

# --- Feature Flags ---
NEXT_PUBLIC_ENABLE_MSW=false   # Activer MSW pour le mock en dev

# --- Sentry (optionnel) ---
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
```

---

## 📜 Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lance le serveur de développement Next.js |
| `npm run build` | Build de production |
| `npm start` | Démarre le serveur de production |
| `npm run lint` | Analyse ESLint (0 warnings autorisés) |
| `npm run format` | Formate le code avec Prettier |
| `npm run format:check` | Vérifie le formatage sans modifier |
| `npm run typecheck` | Vérification TypeScript (`tsc --noEmit`) |
| `npm test` | Lance les tests unitaires (Vitest) |
| `npm run test:watch` | Tests unitaires en mode watch |
| `npm run test:e2e` | Lance les tests end-to-end (Playwright) |
| `npm run test:e2e:ui` | Tests E2E avec interface visuelle Playwright |

---

## 🧪 Tests

### Tests unitaires

```bash
# Exécution unique
npm test

# Mode watch
npm run test:watch
```

- **Framework** : Vitest + Testing Library (React)
- **Mocking** : MSW (Mock Service Worker) pour intercepter les appels API
- **Setup** : `src/tests/setup.ts`

### Tests end-to-end

```bash
# Exécution
npm run test:e2e

# Avec interface UI
npm run test:e2e:ui
```

- **Framework** : Playwright
- **Specs** : `e2e/`

---

## 🔒 Sécurité

- **Headers HTTP** : CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy configurés dans `next.config.ts`
- **Authentification** : Token stocké en cookie `httpOnly` (jamais en `localStorage`)
- **BFF Pattern** : Route Handlers Next.js comme proxy pour la gestion des tokens côté serveur
- **Middleware** : Protection des routes avec vérification du cookie `sugu_token`
- **Validation** : Schemas Zod systématiques pour toutes les réponses API
- **Secrets** : Aucun secret dans les fichiers client (`NEXT_PUBLIC_*` uniquement)

---

## ⚡ Performance

- **React Compiler** activé pour l'optimisation automatique des re-renders
- **Code splitting** via Route Groups + dynamic imports
- **Server Components** par défaut (Next.js App Router)
- **Caching** avec TanStack Query (`staleTime: 60s`)
- **Suspense boundaries** avec `loading.tsx` et skeletons pour l'UX perçue
- **Font optimization** via `next/font` (Geist — aucun FOUT)
- **Image optimization** via `next/image` avec remote patterns

---

## 📚 Documentation

- [`docs/ARCHITECTURE_FRONTEND.md`](docs/ARCHITECTURE_FRONTEND.md) — Architecture frontend détaillée (couches, data flow, auth flow, gestion d'erreurs)

---

## 📄 Licence

Ce projet est propriétaire. Tous droits réservés © SUGU.

---

<p align="center">
  <strong>🇧🇫 Built with ❤️ by Sugu</strong>
</p>
