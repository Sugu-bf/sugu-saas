# 🚀 SPRINT — Création de Boutiques par Commerciaux Terrain

## Contexte Business & Problème

Sugu déploie des **commerciaux terrain** pour inscrire des vendeurs directement sur le terrain. Actuellement, la création de vendeurs (boutiques) se fait uniquement via l'admin panel (`/admin/stores/create`) par un admin authentifié (`role:admin|super-admin`). Vu le nombre croissant de commerciaux, **il est impossible de leur donner accès à l'espace admin** (risque sécurité, complexité de gestion des permissions, exposition des données sensibles).

### Solution

Créer un **formulaire public sécurisé** accessible aux commerciaux, protégé par un **Code de Sécurité commun** (partagé, rotatif) géré par l'admin. Ce formulaire appelle une **API publique dédiée** sur le backend Laravel (`sugu`) pour créer la boutique et son propriétaire.

---

## Architecture Cible

```
┌──────────────────────────────────────────────────────────────────┐
│                       ADMIN PANEL (sugu)                         │
│  /admin/settings/commercial                                      │
│  • Crée / met à jour le Code de Sécurité commun                 │
│  • Visualise les logs de soumissions commerciales                │
│  • Active/désactive le formulaire public                         │
└──────────────┬───────────────────────────────────────────────────┘
               │ Spatie Settings (CommercialSettings)
               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND API (sugu)                             │
│  POST /api/v1/public/commercial/stores                           │
│  • Valide le Code de Sécurité (bcrypt)                          │
│  • Rate limit agressif (throttle:5,1)                            │
│  • Crée User + Store via CommercialStoreService                  │
│  • Dispatche StoreCreated event                                  │
│  • Audit log complet                                             │
│  GET  /api/v1/public/commercial/config                           │
│  • Retourne catégories + pays actifs (pas le code!)              │
└──────────────┬───────────────────────────────────────────────────┘
               ▲ HTTPS / JSON
               │
┌──────────────┴───────────────────────────────────────────────────┐
│                    SAAS FRONTEND (sugu-saas)                     │
│  /signup/commercial                                              │
│  • Page publique (pas d'auth requise)                            │
│  • Formulaire multi-étapes premium                               │
│  • Champ "Code de Sécurité" obligatoire                         │
│  • Upload logo/cover                                             │
│  • Validation côté client + serveur                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## PARTIE 1 — BACKEND (Repo: `C:\xampp\htdocs\sugu`)

### 1.1 — Nouveau Setting: `CommercialSettings`

**Fichier à créer**: `app/Settings/CommercialSettings.php`

**Pattern existant à suivre**: `app/Settings/SecuritySettings.php` (utilise `Spatie\LaravelSettings\Settings`)

```php
<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class CommercialSettings extends Settings
{
    /** Indique si le formulaire commercial est activé */
    public bool $commercial_form_enabled = false;

    /**
     * Hash bcrypt du code de sécurité commun.
     * JAMAIS stocké en clair en DB.
     * L'admin entre le code en clair, on stocke le hash.
     */
    public ?string $security_code_hash = null;

    /** Nombre max de soumissions par IP par heure (defense anti-abus) */
    public int $max_submissions_per_ip_per_hour = 10;

    /** Nombre max de soumissions globales par jour (circuit-breaker) */
    public int $max_submissions_per_day = 200;

    /** Message affiché aux commerciaux quand le formulaire est désactivé */
    public ?string $disabled_message = null;

    /** Date de dernière rotation du code */
    public ?string $code_last_rotated_at = null;

    /** ID de l'admin qui a défini le dernier code */
    public ?string $code_set_by = null;

    public static function group(): string
    {
        return 'commercial';
    }
}
```

**Migration Settings à créer**: `database/settings/2026_06_09_000000_create_commercial_settings.php`

```php
use Spatie\LaravelSettings\Migrations\SettingsMigration;

class CreateCommercialSettings extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('commercial.commercial_form_enabled', false);
        $this->migrator->add('commercial.security_code_hash', null);
        $this->migrator->add('commercial.max_submissions_per_ip_per_hour', 10);
        $this->migrator->add('commercial.max_submissions_per_day', 200);
        $this->migrator->add('commercial.disabled_message', null);
        $this->migrator->add('commercial.code_last_rotated_at', null);
        $this->migrator->add('commercial.code_set_by', null);
    }
}
```

---

### 1.2 — Migration DB: Table `commercial_submissions`

**Fichier à créer**: `database/migrations/2026_06_09_000100_create_commercial_submissions_table.php`

Table d'audit/log de TOUTES les soumissions (réussies ET échouées) pour traçabilité complète.

```
Schema:
- id: ULID (primary, via HasUlids)
- agent_name: string(191) — nom du commercial terrain
- agent_phone: string(30) — téléphone du commercial
- store_name: string(191) — nom de la boutique soumise
- owner_name: string(191)
- owner_email: string(191)
- owner_phone: string(30)
- status: enum('pending','accepted','rejected','failed','duplicate') default 'pending'
- failure_reason: text nullable — raison si échoué
- store_id: ULID nullable FK → stores(id) — lien vers la boutique créée si succès
- ip_address: string(45) — IPv4 ou IPv6
- user_agent: text nullable
- security_code_valid: boolean — le code soumis était-il valide?
- metadata: jsonb nullable — données complémentaires (GPS, etc.)
- processed_at: timestamp nullable
- created_at / updated_at: timestamps
```

**Index composites**:
- `idx_cs_ip_created` sur `(ip_address, created_at)` — pour le rate limiting par IP
- `idx_cs_status` sur `(status)` — pour le dashboard admin
- `idx_cs_owner_email` sur `(owner_email)` — pour détecter les doublons
- `idx_cs_created_at` sur `(created_at DESC)` — pour l'affichage chronologique

---

### 1.3 — Model: `CommercialSubmission`

**Fichier à créer**: `app/Models/CommercialSubmission.php`

```
- HasUlids trait (comme Store)
- $fillable minimal: agent_name, agent_phone, store_name, owner_name, owner_email, owner_phone, ip_address, user_agent, metadata
- Champs protégés (set explicitement): status, store_id, security_code_valid, failure_reason, processed_at
- Relation: belongsTo(Store::class)
- Scopes: scopeToday(), scopeFromIp($ip), scopeSuccessful(), scopeFailed()
```

---

### 1.4 — Form Request: `CommercialStoreRequest`

**Fichier à créer**: `app/Http/Requests/Api/CommercialStoreRequest.php`

**Pattern existant**: `app/Http/Requests/Admin/CreateStoreRequest.php`

Règles de validation (STRICTES — bank-grade):

```php
public function rules(): array
{
    return [
        // Code de sécurité — OBLIGATOIRE
        'security_code' => ['required', 'string', 'min:6', 'max:64'],

        // Identité du commercial terrain
        'agent_name'  => ['required', 'string', 'min:2', 'max:191'],
        'agent_phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],

        // Informations boutique
        'store_name'   => ['required', 'string', 'min:2', 'max:191'],
        'description'  => ['nullable', 'string', 'max:1000'],
        'category_ids' => ['required', 'array', 'min:1', 'max:5'],
        'category_ids.*' => ['required', 'exists:store_categories,id'],

        // Propriétaire de la boutique
        'owner_name'  => ['required', 'string', 'min:2', 'max:191'],
        'owner_email' => ['required', 'email', 'max:191'],
        'owner_phone' => ['required', 'string', 'regex:/^\+?[0-9]{8,15}$/'],

        // Localisation
        'country' => ['nullable', 'string', 'size:2'],
        'city'    => ['required', 'string', 'max:120'],
        'address' => ['required', 'string', 'max:191'],
        'neighborhood' => ['nullable', 'string', 'max:191'],
        'coordinates'     => ['nullable', 'array'],
        'coordinates.lat' => ['nullable', 'numeric', 'between:-90,90'],
        'coordinates.lng' => ['nullable', 'numeric', 'between:-180,180'],

        // Médias (optionnels sur terrain)
        'logo'  => ['nullable', 'image', 'max:2048', 'mimes:jpeg,png,jpg,webp'],
        'cover' => ['nullable', 'image', 'max:4096', 'mimes:jpeg,png,jpg,webp'],

        // Paiement (optionnel sur terrain)
        'payment_provider'     => ['nullable', 'string'],
        'payment_phone'        => ['nullable', 'string'],
        'payment_account_name' => ['nullable', 'string'],
    ];
}
```

Messages d'erreur en français (suivre le pattern de `CreateStoreRequest`).

---

### 1.5 — Service: `CommercialStoreService`

**Fichier à créer**: `app/Services/Commercial/CommercialStoreService.php`

Ce service est le **cœur sécurisé** de la logique. Il NE réutilise PAS directement `StoreService` de l'admin (pour isolation de sécurité) mais peut appeler des méthodes internes partagées.

#### Méthodes:

```php
class CommercialStoreService
{
    public function __construct(
        private CommercialSettings $settings,
    ) {}

    /**
     * Point d'entrée principal.
     * 
     * @throws CommercialFormDisabledException — si le formulaire est désactivé
     * @throws InvalidSecurityCodeException — si le code ne match pas le hash
     * @throws CommercialRateLimitException — si rate limit IP ou global atteint
     * @throws CommercialDuplicateException — si email propriétaire déjà en base
     * @throws CommercialStoreCreationException — si erreur DB
     */
    public function submitStoreCreation(array $data, array $files, string $ipAddress, ?string $userAgent): CommercialSubmission

    // ── Guards (defense-in-depth) ──

    /** Vérifie que le formulaire est activé */
    private function assertFormEnabled(): void

    /** Vérifie le code de sécurité contre le hash bcrypt */
    private function validateSecurityCode(string $plainCode): bool
    // CRITIQUE: Utiliser Hash::check($plainCode, $this->settings->security_code_hash)
    // JAMAIS de comparaison en clair!

    /** Vérifie le rate limit par IP */
    private function assertIpRateLimit(string $ip): void
    // Query: CommercialSubmission::fromIp($ip)->where('created_at', '>=', now()->subHour())->count()
    // Si >= max_submissions_per_ip_per_hour → throw

    /** Vérifie le rate limit global journalier */
    private function assertDailyLimit(): void
    // Query: CommercialSubmission::today()->count()
    // Si >= max_submissions_per_day → throw (circuit-breaker)

    /** Vérifie qu'un email n'est pas déjà propriétaire d'un store */
    private function assertOwnerEmailUnique(string $email): void

    // ── Core Creation ──

    /** Crée le User + Store dans une transaction DB */
    private function createStoreAndOwner(CommercialSubmission $submission, array $data, array $files): Store
    // Logique similaire à StoreService::createStore() mais:
    // - ownerMode est TOUJOURS 'new' (on crée toujours un nouveau user)
    //   SAUF si l'email existe déjà → on le rattache (assertOwnerEmailUnique vérifie avant)
    // - Le store est créé en status PENDING_REVIEW (pas ACTIVE)
    // - is_verified = false
    // - Les médias (logo/cover) suivent le même pattern que StoreService::attachMedia()
    // - Les catégories sont sync via buildCategorySyncData()
    // - Le payout setting est créé si fourni
    // - Un password reset token est généré pour le nouveau user
    // - StoreCreated event est dispatché APRES commit
}
```

#### Flux complet de `submitStoreCreation()`:

```
1. assertFormEnabled()           → 503 si désactivé
2. validateSecurityCode(code)    → 403 si invalide
3. assertIpRateLimit(ip)         → 429 si dépassé
4. assertDailyLimit()            → 429 si dépassé
5. Créer CommercialSubmission (status='pending', security_code_valid=true/false)
6. Si code invalide → marquer submission comme 'failed', return
7. assertOwnerEmailUnique(email) → 409 si doublon
8. DB::transaction {
     a. Créer User (status=Active, user_type=SELLER, role='seller')
     b. Générer password reset token
     c. Créer Store (status=PENDING_REVIEW, is_verified=false)
     d. Attacher médias, catégories, payout settings
     e. Mettre à jour submission (status='accepted', store_id=...)
   }
9. StoreCreated::dispatch($store, $resetToken) — APRES commit
10. Log::info('[CommercialStoreService] Store created by commercial agent', [...])
11. Return submission
```

---

### 1.6 — Controller: `CommercialStoreController`

**Fichier à créer**: `app/Http/Controllers/Api/V1/Public/CommercialStoreController.php`

```php
class CommercialStoreController extends Controller
{
    public function __construct(
        private CommercialStoreService $service,
    ) {}

    /**
     * GET /api/v1/public/commercial/config
     * Retourne les données nécessaires au formulaire (catégories, pays).
     * Rate limited: throttle:30,1
     * PAS de données sensibles (pas le code, pas les settings internes).
     */
    public function config(CommercialSettings $settings): JsonResponse
    {
        // Si formulaire désactivé → retourner enabled: false + disabled_message
        // Sinon → retourner:
        //   - enabled: true
        //   - categories: StoreCategory::where('is_active', true)->select('id','name','parent_id')->get()
        //   - countries: ['BF','CI','ML','SN','TG','BJ','NE'] (ou depuis Country model)
    }

    /**
     * POST /api/v1/public/commercial/stores
     * Soumet une demande de création de boutique.
     * Rate limited: throttle:5,1 (agressif!)
     * Accepts: multipart/form-data (pour upload logo/cover)
     */
    public function store(CommercialStoreRequest $request): JsonResponse
    {
        // 1. Appeler service->submitStoreCreation(...)
        // 2. Retourner 201 avec { success: true, message: "Boutique soumise avec succès", submission_id: ... }
        // 3. Catch exceptions → retourner codes HTTP appropriés:
        //    - CommercialFormDisabledException → 503
        //    - InvalidSecurityCodeException → 403
        //    - CommercialRateLimitException → 429
        //    - CommercialDuplicateException → 409
        //    - CommercialStoreCreationException → 500
    }
}
```

---

### 1.7 — Routes API

**Fichier à créer**: `routes/api_v1/commercial/commercial_api_v1.php`

```php
<?php

use App\Http\Controllers\Api\V1\Public\CommercialStoreController;
use Illuminate\Support\Facades\Route;

Route::prefix('public/commercial')->name('public.commercial.')->group(function () {
    Route::get('config', [CommercialStoreController::class, 'config'])
        ->name('config')
        ->middleware('throttle:30,1');

    Route::post('stores', [CommercialStoreController::class, 'store'])
        ->name('stores.create')
        ->middleware('throttle:5,1');
});
```

**Fichier à modifier**: `routes/api_v1.php`
- Ajouter `require __DIR__.'/api_v1/commercial/commercial_api_v1.php';` dans le groupe `v1`.

---

### 1.8 — Exceptions dédiées

**Fichiers à créer dans** `app/Exceptions/Commercial/`:

```
├── CommercialFormDisabledException.php    — extends HttpException(503)
├── InvalidSecurityCodeException.php       — extends HttpException(403)
├── CommercialRateLimitException.php       — extends HttpException(429)
├── CommercialDuplicateException.php       — extends HttpException(409)
└── CommercialStoreCreationException.php   — extends RuntimeException
```

Chaque exception doit:
- Avoir un `$code` string machine-readable (ex: `COMMERCIAL_FORM_DISABLED`)
- Avoir un `$message` en français pour l'utilisateur
- Logger l'événement dans les security events si c'est une tentative suspecte

---

### 1.9 — Admin: Gestion du Code de Sécurité

#### 1.9.1 — Controller Admin

**Fichier à créer**: `app/Http/Controllers/Admin/CommercialSettingsController.php`

```php
class CommercialSettingsController extends Controller
{
    /**
     * GET /admin/settings/commercial
     * Affiche la page de gestion du code de sécurité commercial.
     */
    public function index(CommercialSettings $settings): Response
    {
        // Retourne via Inertia:
        // - settings (enabled, has_code, code_last_rotated_at, code_set_by, max_submissions_per_ip_per_hour, max_submissions_per_day, disabled_message)
        // - stats: { today_submissions, today_successful, today_failed, total_submissions }
        // - recent_submissions: les 20 dernières soumissions avec pagination
    }

    /**
     * PUT /admin/settings/commercial/code
     * Met à jour (ou crée) le code de sécurité.
     * Le code est reçu en clair, hashé en bcrypt, et stocké.
     */
    public function updateCode(Request $request, CommercialSettings $settings): RedirectResponse
    {
        // Validation:
        //   'code' => ['required', 'string', 'min:6', 'max:64']
        //   'code_confirmation' => ['required', 'same:code']
        // Hash: $settings->security_code_hash = Hash::make($validated['code'])
        // Audit: audit('Commercial security code updated', ...)
        // JAMAIS logger le code en clair!
    }

    /**
     * PUT /admin/settings/commercial/toggle
     * Active ou désactive le formulaire commercial.
     */
    public function toggle(CommercialSettings $settings): RedirectResponse

    /**
     * PUT /admin/settings/commercial/limits
     * Met à jour les limites de rate limiting.
     */
    public function updateLimits(Request $request, CommercialSettings $settings): RedirectResponse

    /**
     * GET /admin/settings/commercial/submissions
     * Liste paginée de toutes les soumissions (avec filtres).
     */
    public function submissions(Request $request): Response
}
```

#### 1.9.2 — Routes Admin

**Fichier à modifier**: `routes/admin.php`

Ajouter dans le groupe `middleware(['auth', 'verified', 'role:admin|super-admin'])`:

```php
// ── Commercial Settings ──────────────────────
Route::get('/admin/settings/commercial', [CommercialSettingsController::class, 'index'])->name('admin_settings_commercial');
Route::put('/admin/settings/commercial/code', [CommercialSettingsController::class, 'updateCode'])->name('admin_settings_commercial_code');
Route::put('/admin/settings/commercial/toggle', [CommercialSettingsController::class, 'toggle'])->name('admin_settings_commercial_toggle');
Route::put('/admin/settings/commercial/limits', [CommercialSettingsController::class, 'updateLimits'])->name('admin_settings_commercial_limits');
Route::get('/admin/settings/commercial/submissions', [CommercialSettingsController::class, 'submissions'])->name('admin_settings_commercial_submissions');
```

#### 1.9.3 — Page Admin Inertia (Vue.js)

**Fichier à créer**: `resources/js/pages/admin/pages/settings/commercial/index.vue`

Page avec:
- **Section 1**: Toggle ON/OFF du formulaire + message de désactivation
- **Section 2**: Code de sécurité (champ password + confirmation + bouton "Générer un code aléatoire") + date de dernière rotation
- **Section 3**: Limites (max par IP/heure, max par jour)
- **Section 4**: Statistiques (soumissions aujourd'hui, réussies, échouées)
- **Section 5**: Tableau des soumissions récentes avec filtres (status, date, recherche)

**Pattern existant pour cette page**: `resources/js/pages/admin/pages/settings/platform` et `resources/js/pages/admin/pages/settings/cod`

---

### 1.10 — Tests Backend (Bank-Grade)

**Structure de tests à créer**:

```
tests/
├── Feature/
│   └── Commercial/
│       ├── CommercialStoreApiTest.php
│       ├── CommercialSecurityCodeTest.php
│       ├── CommercialRateLimitTest.php
│       └── CommercialAdminSettingsTest.php
└── Unit/
    └── Commercial/
        └── CommercialStoreServiceTest.php
```

#### Tests CRITIQUES à implémenter (Pest.php syntax — suivre le pattern tests/Pest.php):

**CommercialStoreApiTest.php** (Feature):
```
✅ test('POST /commercial/stores crée une boutique avec un code valide')
✅ test('POST /commercial/stores retourne 403 avec un code invalide')
✅ test('POST /commercial/stores retourne 503 quand le formulaire est désactivé')
✅ test('POST /commercial/stores retourne 429 quand rate limit IP atteint')
✅ test('POST /commercial/stores retourne 429 quand rate limit global atteint')
✅ test('POST /commercial/stores retourne 409 quand email propriétaire existe déjà')
✅ test('POST /commercial/stores retourne 422 quand données invalides')
✅ test('POST /commercial/stores crée le user avec le rôle seller')
✅ test('POST /commercial/stores crée le store en status PENDING_REVIEW')
✅ test('POST /commercial/stores dispatch StoreCreated event')
✅ test('POST /commercial/stores log la soumission dans commercial_submissions')
✅ test('POST /commercial/stores log les tentatives avec code invalide')
✅ test('GET /commercial/config retourne les catégories quand formulaire activé')
✅ test('GET /commercial/config retourne enabled=false quand formulaire désactivé')
✅ test('le code de sécurité est JAMAIS retourné dans les réponses API')
✅ test('le hash bcrypt du code de sécurité NE PEUT PAS être retrouvé en clair')
```

**CommercialSecurityCodeTest.php** (Feature):
```
✅ test('admin peut définir un nouveau code de sécurité')
✅ test('admin peut activer/désactiver le formulaire')
✅ test('admin peut voir les soumissions récentes')
✅ test('le code de sécurité est stocké en hash bcrypt, jamais en clair')
✅ test('la rotation du code invalide immédiatement l ancien code')
✅ test('un non-admin ne peut pas accéder aux settings commercial')
```

**CommercialRateLimitTest.php** (Feature):
```
✅ test('rate limit par IP respecte la configuration')
✅ test('rate limit global journalier fonctionne comme circuit-breaker')
✅ test('les soumissions échouées comptent dans le rate limit')
✅ test('IP rate limit se réinitialise après 1 heure')
```

---

## PARTIE 2 — FRONTEND SAAS (Repo: `C:\xampp\htdocs\sugu-saas`)

### 2.1 — Architecture des fichiers

```
src/
├── app/
│   └── (public)/                    ← Nouveau route group pour pages publiques
│       └── signup/
│           └── commercial/
│               └── page.tsx         ← Page principale du formulaire
├── features/
│   └── commercial/                  ← Nouveau feature module
│       ├── api/
│       │   └── commercial.api.ts    ← Appels API vers le backend
│       ├── components/
│       │   ├── CommercialForm.tsx    ← Composant formulaire multi-étapes
│       │   ├── StepAgentInfo.tsx     ← Étape 1: Infos commercial
│       │   ├── StepStoreInfo.tsx     ← Étape 2: Infos boutique
│       │   ├── StepOwnerInfo.tsx     ← Étape 3: Infos propriétaire
│       │   ├── StepLocation.tsx      ← Étape 4: Localisation
│       │   ├── StepReview.tsx        ← Étape 5: Récapitulatif + Code sécurité
│       │   ├── SuccessScreen.tsx     ← Écran de succès
│       │   └── FormDisabled.tsx      ← Écran formulaire désactivé
│       ├── hooks/
│       │   └── useCommercialForm.ts  ← Hook gérant l'état du formulaire
│       └── types/
│           └── commercial.types.ts   ← Types TypeScript
```

### 2.2 — Routage & Proxy (IMPORTANT)

Le formulaire est accessible à `/signup/commercial`. Cette route est DÉJÀ publique grâce au `proxy.ts` existant qui whitelist le préfixe `/signup/`:

```typescript
// src/proxy.ts (déjà en place, ligne 13)
const PUBLIC_PREFIXES = ["/api/", "/_next/", "/favicon", "/signup/"];
```

**Aucune modification du proxy n'est nécessaire.**

### 2.3 — Route Group pour pages publiques

**Fichier à créer**: `src/app/(public)/signup/commercial/page.tsx`

Cette page Next.js sera un Server Component qui:
1. Appelle `GET /api/v1/public/commercial/config` côté serveur
2. Si `enabled === false`, affiche le composant `FormDisabled`
3. Sinon, rend le composant `CommercialForm` avec les `categories` et `countries` en props

**Layout**: `src/app/(public)/layout.tsx` (à créer si inexistant — layout public minimal sans sidebar vendor/driver/agency)

### 2.4 — API Client

**Fichier à créer**: `src/features/commercial/api/commercial.api.ts`

```typescript
// Utilise le client HTTP central: src/lib/http/client.ts
import { api } from '@/lib/http';

export interface CommercialConfig {
  enabled: boolean;
  disabled_message?: string;
  categories: Array<{ id: string; name: string; parent_id: string | null }>;
  countries: string[];
}

export interface CommercialStorePayload {
  security_code: string;
  agent_name: string;
  agent_phone: string;
  store_name: string;
  description?: string;
  category_ids: string[];
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  country?: string;
  city: string;
  address: string;
  neighborhood?: string;
  coordinates?: { lat: number; lng: number };
  payment_provider?: string;
  payment_phone?: string;
  payment_account_name?: string;
}

export interface CommercialStoreResponse {
  success: boolean;
  message: string;
  submission_id: string;
}

export const commercialApi = {
  getConfig: () => api.get<CommercialConfig>('public/commercial/config'),

  // ATTENTION: Cette route utilise multipart/form-data pour les fichiers
  // Le client HTTP central envoie du JSON par défaut
  // Il faudra utiliser fetch directement ou adapter le client pour FormData
  submitStore: (data: FormData) => {
    // Appel fetch direct avec FormData (pas JSON)
    // Endpoint: POST /api/v1/public/commercial/stores
  },
};
```

**IMPORTANT — Gestion Upload**: Le client HTTP central (`src/lib/http/client.ts`) envoie du JSON (`Content-Type: application/json`). Pour l'upload de fichiers (logo, cover), il faut soit:
- **Option A** (recommandée): Créer une fonction `apiMultipart()` dans le client central qui envoie en `multipart/form-data`
- **Option B**: Utiliser `fetch` directement dans `commercial.api.ts`

### 2.5 — Formulaire Multi-Étapes

**5 étapes** avec progression visuelle et validation par étape:

| Étape | Composant | Champs |
|-------|-----------|--------|
| 1 | `StepAgentInfo` | Nom du commercial, Téléphone du commercial |
| 2 | `StepStoreInfo` | Nom de la boutique, Description, Catégorie(s), Logo (optionnel), Cover (optionnel) |
| 3 | `StepOwnerInfo` | Nom du propriétaire, Email, Téléphone |
| 4 | `StepLocation` | Pays, Ville, Adresse, Quartier, Coordonnées GPS (bouton "Ma position") |
| 5 | `StepReview` | Récapitulatif de toutes les infos + **Champ Code de Sécurité** + Bouton Soumettre |

#### Design du formulaire:
- **Style**: Suivre le design system existant du SaaS (glassmorphism léger, Lucide icons)
- **Progression**: Stepper horizontal en haut avec numéros et labels
- **Validation**: Validation côté client à chaque étape avant de passer à la suivante
- **Responsive**: Mobile-first (les commerciaux seront sur téléphone!)
- **Branding**: Logo Sugu en haut, couleurs de la plateforme
- **Code de sécurité**: Champ de type password avec bouton toggle visibilité, à l'étape 5 uniquement

### 2.6 — Hook de gestion d'état

**Fichier à créer**: `src/features/commercial/hooks/useCommercialForm.ts`

```typescript
// Hook personnalisé qui gère:
// - L'état du formulaire multi-étapes (currentStep, formData, errors)
// - La navigation entre étapes (next, prev, goTo)
// - La validation par étape
// - La soumission finale (appel API)
// - Les états de chargement et d'erreur
// - La gestion des fichiers uploadés (preview, suppression)

interface UseCommercialFormReturn {
  currentStep: number;
  totalSteps: number;
  formData: CommercialFormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  
  setField: (key: string, value: unknown) => void;
  nextStep: () => boolean; // retourne false si validation échoue
  prevStep: () => void;
  goToStep: (step: number) => void;
  submit: () => Promise<void>;
  reset: () => void;
}
```

### 2.7 — Gestion des erreurs API

Les erreurs du backend doivent être traduites en messages user-friendly:

```typescript
// Mapping des codes d'erreur backend → messages français
const ERROR_MESSAGES: Record<string, string> = {
  'COMMERCIAL_FORM_DISABLED': 'Le formulaire d\'inscription est temporairement désactivé.',
  'INVALID_SECURITY_CODE': 'Le code de sécurité est invalide. Veuillez vérifier auprès de votre superviseur.',
  'COMMERCIAL_RATE_LIMIT_IP': 'Trop de tentatives. Veuillez réessayer dans une heure.',
  'COMMERCIAL_RATE_LIMIT_DAILY': 'Le nombre maximum de soumissions quotidiennes a été atteint.',
  'COMMERCIAL_DUPLICATE_EMAIL': 'Un compte avec cet email existe déjà.',
  'STORE_DUPLICATE_SLUG': 'Une boutique avec ce nom existe déjà.',
};
```

---

## PARTIE 3 — SÉCURITÉ BANK-GRADE

### 3.1 — Matrice des menaces et mitigations

| # | Menace | Impact | Mitigation |
|---|--------|--------|------------|
| 1 | **Brute-force du code de sécurité** | Accès non autorisé au formulaire | Rate limit 5 req/min par IP + bcrypt hash (timing constant) + log toutes tentatives |
| 2 | **Spam de soumissions** | Pollution de la DB, DoS | Rate limit IP (10/h) + rate limit global (200/jour) + circuit-breaker |
| 3 | **Injection SQL / XSS** | Compromission données | Validation stricte Laravel + Eloquent ORM (pas de raw queries) + sanitization |
| 4 | **Vol du code de sécurité** | Réutilisation par un attaquant | Code hashé bcrypt en DB, jamais en clair dans les réponses API, rotation régulière |
| 5 | **Enumération d'emails** | Découverte de comptes existants | Message d'erreur générique (pas "cet email existe") — OU accepter le risque car les commerciaux doivent savoir |
| 6 | **Upload de fichiers malveillants** | Exécution de code | Validation MIME stricte (jpeg/png/jpg/webp), taille max, Spatie Media Library |
| 7 | **CSRF** | Soumission forgée | API stateless (pas de session), pas de CSRF token nécessaire |
| 8 | **Replay attack** | Soumission en double | Idempotency check sur (owner_email + store_name) dans les dernières 24h |
| 9 | **Fuite de code via logs** | Exposition du secret | JAMAIS logger le code en clair — logger seulement "valid" ou "invalid" |
| 10 | **Mass assignment** | Modification de champs protégés | `$fillable` strict sur CommercialSubmission, status/store_id set explicitement |

### 3.2 — Checklist sécurité obligatoire

```
□ Le code de sécurité est TOUJOURS stocké en hash bcrypt
□ La comparaison utilise Hash::check() (timing-safe)
□ Le code n'apparaît JAMAIS dans:
  - Les réponses API (config ou store)
  - Les logs Laravel
  - Les audit trails
  - Les erreurs de validation
□ Rate limiting IP + Global implémenté
□ Toutes les soumissions sont loguées (réussies ET échouées)
□ Les tentatives avec code invalide sont comptées et alertées
□ Les fichiers uploadés passent par la validation MIME stricte
□ Le store créé est en PENDING_REVIEW (pas ACTIVE)
□ Le FormRequest valide TOUS les champs avec des règles strictes
□ Pas de mass assignment sur les champs sensibles
□ Les exceptions ont des codes machine-readable
□ La transaction DB garantit l'atomicité (User + Store + Submission)
□ L'event StoreCreated est dispatché APRES le commit (ShouldDispatchAfterCommit)
□ CORS est configuré pour accepter les requêtes du domaine SaaS
```

### 3.3 — Monitoring & Alerting

```
□ Log chaque soumission avec: IP, agent_name, store_name, status, security_code_valid
□ Alerte si > 20 tentatives échouées avec code invalide en 1 heure (attaque brute-force probable)
□ Alerte si rate limit global atteint (200/jour) — peut indiquer un problème ou un pic d'activité
□ Dashboard admin avec métriques en temps réel
```

---

## PARTIE 4 — RÉCAPITULATIF DES FICHIERS

### Backend (sugu) — Fichiers à CRÉER

| Fichier | Type |
|---------|------|
| `app/Settings/CommercialSettings.php` | Spatie Settings |
| `database/settings/2026_06_09_000000_create_commercial_settings.php` | Settings Migration |
| `database/migrations/2026_06_09_000100_create_commercial_submissions_table.php` | DB Migration |
| `app/Models/CommercialSubmission.php` | Eloquent Model |
| `app/Http/Requests/Api/CommercialStoreRequest.php` | Form Request |
| `app/Services/Commercial/CommercialStoreService.php` | Service |
| `app/Http/Controllers/Api/V1/Public/CommercialStoreController.php` | API Controller |
| `routes/api_v1/commercial/commercial_api_v1.php` | API Routes |
| `app/Exceptions/Commercial/CommercialFormDisabledException.php` | Exception |
| `app/Exceptions/Commercial/InvalidSecurityCodeException.php` | Exception |
| `app/Exceptions/Commercial/CommercialRateLimitException.php` | Exception |
| `app/Exceptions/Commercial/CommercialDuplicateException.php` | Exception |
| `app/Exceptions/Commercial/CommercialStoreCreationException.php` | Exception |
| `app/Http/Controllers/Admin/CommercialSettingsController.php` | Admin Controller |
| `resources/js/pages/admin/pages/settings/commercial/index.vue` | Admin Page (Vue) |
| `tests/Feature/Commercial/CommercialStoreApiTest.php` | Feature Test |
| `tests/Feature/Commercial/CommercialSecurityCodeTest.php` | Feature Test |
| `tests/Feature/Commercial/CommercialRateLimitTest.php` | Feature Test |
| `tests/Feature/Commercial/CommercialAdminSettingsTest.php` | Feature Test |
| `tests/Unit/Commercial/CommercialStoreServiceTest.php` | Unit Test |

### Backend (sugu) — Fichiers à MODIFIER

| Fichier | Modification |
|---------|-------------|
| `routes/api_v1.php` | Ajouter `require` du fichier de routes commercial |
| `routes/admin.php` | Ajouter les routes admin pour CommercialSettings |

### Frontend SaaS (sugu-saas) — Fichiers à CRÉER

| Fichier | Type |
|---------|------|
| `src/app/(public)/layout.tsx` | Layout public minimal |
| `src/app/(public)/signup/commercial/page.tsx` | Page Next.js |
| `src/features/commercial/api/commercial.api.ts` | API Client |
| `src/features/commercial/components/CommercialForm.tsx` | Form principal |
| `src/features/commercial/components/StepAgentInfo.tsx` | Étape 1 |
| `src/features/commercial/components/StepStoreInfo.tsx` | Étape 2 |
| `src/features/commercial/components/StepOwnerInfo.tsx` | Étape 3 |
| `src/features/commercial/components/StepLocation.tsx` | Étape 4 |
| `src/features/commercial/components/StepReview.tsx` | Étape 5 |
| `src/features/commercial/components/SuccessScreen.tsx` | Succès |
| `src/features/commercial/components/FormDisabled.tsx` | Désactivé |
| `src/features/commercial/hooks/useCommercialForm.ts` | Hook |
| `src/features/commercial/types/commercial.types.ts` | Types TS |

---

## PARTIE 5 — ORDRE D'EXÉCUTION

### Phase 1: Backend Core (à faire EN PREMIER)

```
1. Créer CommercialSettings + migration settings
2. Créer migration DB commercial_submissions
3. Créer model CommercialSubmission
4. Créer les 5 exceptions dédiées
5. Créer CommercialStoreRequest (Form Request)
6. Créer CommercialStoreService
7. Créer CommercialStoreController
8. Créer le fichier de routes API
9. Modifier api_v1.php pour inclure les routes
10. Exécuter les migrations
```

### Phase 2: Backend Admin

```
11. Créer CommercialSettingsController
12. Ajouter les routes admin dans admin.php
13. Créer la page Vue.js admin settings/commercial
```

### Phase 3: Backend Tests

```
14. Créer CommercialStoreApiTest
15. Créer CommercialSecurityCodeTest
16. Créer CommercialRateLimitTest
17. Créer CommercialAdminSettingsTest
18. Créer CommercialStoreServiceTest (Unit)
19. Exécuter php artisan test --filter=Commercial
```

### Phase 4: Frontend SaaS

```
20. Créer les types TypeScript
21. Créer l'API client
22. Créer le layout public
23. Créer les composants d'étapes (1 à 5)
24. Créer le hook useCommercialForm
25. Créer les écrans SuccessScreen et FormDisabled
26. Créer le composant CommercialForm
27. Créer la page Next.js
28. Tester manuellement le flux complet
```

### Phase 5: Vérification & Go-Live

```
29. Vérification sécurité (checklist section 3.2)
30. Test end-to-end: commercial soumet → admin voit dans dashboard
31. Test rate limiting en conditions réelles
32. Test rotation du code de sécurité
33. Déploiement
```

---

## ANNEXES

### A. Références Code Existant

| Pattern | Fichier de référence | Repo |
|---------|---------------------|------|
| Settings Spatie | `app/Settings/SecuritySettings.php` | sugu |
| Store creation service | `app/Services/Admin/StoreService.php` | sugu |
| Store creation request | `app/Http/Requests/Admin/CreateStoreRequest.php` | sugu |
| Store model | `app/Models/Store.php` | sugu |
| Admin settings controller | `app/Http/Controllers/Admin/SettingsController.php` | sugu |
| Admin routes | `routes/admin.php` | sugu |
| API v1 routes | `routes/api_v1.php` | sugu |
| Public API controller | `app/Http/Controllers/Api/V1/Public/MarketplaceConfigController.php` | sugu |
| Store created event | `app/Events/Admin/StoreCreated.php` | sugu |
| HTTP client | `src/lib/http/client.ts` | sugu-saas |
| Proxy (public routes) | `src/proxy.ts` | sugu-saas |
| Feature module pattern | `src/features/vendor/`, `src/features/driver/` | sugu-saas |
| Test helpers | `tests/Pest.php` | sugu |

### B. Variables d'environnement

Aucune nouvelle variable d'environnement n'est nécessaire. Le code de sécurité est géré via Spatie Settings (stocké en DB, pas en `.env`).

### C. CORS

Vérifier que la configuration CORS de Laravel (`config/cors.php`) autorise les requêtes depuis le domaine du SaaS frontend vers les routes `api/v1/public/commercial/*`.

### D. Stores créées par commerciaux — Cycle de vie

```
Commercial soumet → Store créée (PENDING_REVIEW, is_verified=false)
                  → Admin voit dans /admin/vendors/onboarding
                  → Admin review et approuve → Store passe ACTIVE
                  → Vendeur reçoit email de bienvenue avec reset password
                  → Vendeur se connecte au portail SaaS vendor
```

Les boutiques créées par les commerciaux suivent EXACTEMENT le même cycle d'onboarding que les boutiques créées par l'admin, à la différence qu'elles démarrent en `PENDING_REVIEW` au lieu de `ACTIVE`.
