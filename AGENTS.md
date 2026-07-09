# pogrid (POgrid.id)

Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

Design system: [Astryx](https://astryx.design) (`@astryxdesign/core` provides CSS reset/base, imported in `resources/js/app.tsx`). Vite alias `@/` → `resources/js`.

## Commands

- `composer setup` — full project setup (composer install, .env, key:generate, migrate). **Does not build frontend** — run `npm install --legacy-peer-deps --ignore-scripts && chmod +x node_modules/.bin/* && npm run build` separately if needed.
- `composer dev` — runs PHP services (server, queue, pail). **Does not start Vite** — run `npm run dev` in a separate terminal.
- `./dev.sh` — starts everything at once (builds custom Docker image with PHP+Node, server, queue, Vite). Requires Docker.
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5)
- `npm run dev` / `npm run build` — Vite HMR / production build
- `vendor/bin/pint` — code formatting (no npm lint/typecheck scripts exist; no `tsconfig.json`)
- `php artisan pogrid:evaluate-timelines` — cron task for timeline alerts
- `php artisan queue:work --stop-when-empty` — cron task (1-min interval, no daemon)

## Routes & Auth

All routes in `routes/web.php` (no API routes). Controllers return Inertia responses.

**Guard A** (office): email/username + password at `/login`. **Guard B** (floor): PIN login at `/c/{slug}`, throttled 5 req/min. Privilege escalation guard blocks office roles from PIN login.

**Forgot Password** (Guard A): uses `Password::reset()` with custom `ResetPasswordNotification`. Reset links appear in `storage/logs/laravel.log` (mail driver: `log`).

**Forgot PIN** (Guard B): worker requests via `POST /c/{slug}/pin-reset/request` (guest) → creates BLUE Alert. Admin approves via `POST /pin-reset/{alertId}/approve` → new 4-digit PIN displayed once.

**OWNER cannot create POs** (403 on `POST /pos`). Owner dashboard at `/dashboard`. Worker dashboard at `/c/{slug}`.

## Pages

Three groups in `resources/js/Pages/`: `Auth/`, `Owner/`, `Worker/`. Global `FlashMessages.tsx` wraps every page via `app.tsx` `resolve` function. Flash data shared via `Inertia::share('flash', ...)` in `AppServiceProvider`.

## Architecture

- **Multi-tenancy**: row-level `TenantScope` + `TenantManager` singleton. All operational models use `BelongsToTenant` trait. `TenantManager::bypass()`/`enableScope()` for tests and admin contexts.
- **Observer chain** (registered in `AppServiceProvider::boot()`): `Item::created` auto-creates `ItemProgress` rows per `required_stages` JSON array. `ItemProgress::saved` recalculates weighted progress and cascades PO status. `DoItem::saved` marks PO COMPLETED when all items fully delivered.
- **Session, cache, queue** all database driver (SQLite dev, PostgreSQL prod). **Broadcast** uses Pusher, defaults to `log` driver in dev. No Redis.
- **Cron-dependent**: no background daemons. Queue + timeline evaluation triggered by cron at 1-min.

## Testing

- PHPUnit 10.5, in-memory SQLite (`RefreshDatabase`). Tests: `Unit` suite + `Feature` suite.
- Base `TestCase` resets `TenantManager` — tests must manage tenant state explicitly.
- `ItemObserver` creates `ItemProgress` rows on Item creation — account for this in progress assertions.
- Core files: `tests/Feature/CoreLogicTest.php` (tenant isolation, progress calc, DO, QC rework, alerts, timeline) and `AdminManagementTest.php` (auth, CRUD, broadcast, PIN login).

## Quirks

- `.npmrc` has `ignore-scripts=true` — postinstall hooks suppressed.
- `app/Models/Tenant.php` has duplicate namespace declarations (`namespace App\Models\Tenant; namespace App\Models;`). Second wins.
- Tailwind v4 via `@tailwindcss/vite` plugin (no PostCSS, no `tailwind.config.js`). Config in `app.css` via `@import "tailwindcss"`.
- No `tsconfig.json` — Vite handles TS compilation.
- Dual language (EN/ID): per-component `translations` objects + `localStorage` key `pogrid_lang`. No i18n framework.
