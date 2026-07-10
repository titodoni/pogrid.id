# pogrid (POgrid.id)

## Knowledge Graph (graphify)

Before answering codebase questions, load `graphify-out/GRAPH_REPORT.md` and run `graphify query "<question>"` for graph-traversed context. Graph at `graphify-out/graph.json` (648 nodes, 1203 edges, 65 communities). Updated automatically post-commit.

God nodes: TenantManager, Item, User, Po, Alert, ItemProgress, Role, Post.

Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

Design system: [Astryx](https://astryx.design) (`@astryxdesign/core` provides CSS reset/base, imported in `resources/js/app.tsx`). Vite alias `@/` → `resources/js`.

## Commands

- `composer setup` — full setup (composer install, .env, key:generate, migrate). No frontend build — run `npm install --legacy-peer-deps --ignore-scripts && chmod +x node_modules/.bin/* && npm run build` if needed.
- `composer dev` — run PHP services (server, queue, pail). No Vite — run `npm run dev` separately.
- `./dev.sh` — start all (Docker PHP+Node, server, queue, Vite). Need Docker.
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5).
- `npm run dev` / `npm run build` — Vite HMR / production build.
- `vendor/bin/pint` — formatting (no npm lint/typecheck, no `tsconfig.json`).
- `php artisan pogrid:evaluate-timelines` — cron for timeline alerts.
- `php artisan queue:work --stop-when-empty` — cron task (1-min interval, no daemon).
- `graphify update /home/tito/pogrid` — refresh knowledge graph after code changes (auto-runs post-commit).
- `./dev.sh` — start all (Docker PHP+Node, server, queue, Vite). Also installs graphify + sets up post-commit hooks. Need Docker.
- `git config core.hooksPath .githooks` — enable post-commit graphify auto-update (run once per clone).

## Routes & Auth

Routes in `routes/web.php` (no API). Controllers return Inertia.

**Guard A** (office): email/username + password at `/login`. **Guard B** (floor): PIN login at `/c/{slug}`, throttled 5 req/min. Privilege escalation blocks office roles from PIN login.

**Roles & Posts**: Users have `role_id` (FK→roles: DRAFTER, PURCHASING, MACHINING, FABRICATION, PRODUCTION, QC, DELIVERY, FINANCE, STAFF) and `post_id` (FK→posts: Design, Material, CNC, Milling, Welder, Helper, QC, Delivery, Finance, Sales, Admin, Manager). `role_level` distinguishes `floor` vs `office`. Accessor `role_name`, `role_level`, `post_name` available on User model. Tenant owners marked with `is_owner` boolean.

**Forgot Password** (Guard A): `Password::reset()` with `ResetPasswordNotification`. Links in `storage/logs/laravel.log` (mail driver: `log`).

**Forgot PIN** (Guard B): worker request `POST /c/{slug}/pin-reset/request` (guest) → BLUE Alert. Admin approve `POST /pin-reset/{alertId}/approve` → new 4-digit PIN displayed once.

**OWNER cannot create POs** (403 on `POST /pos`). Owner dashboard at `/dashboard`, worker at `/c/{slug}`.

## Pages

Three groups in `resources/js/Pages/`: `Auth/`, `Owner/`, `Worker/`. `FlashMessages.tsx` wraps pages via `app.tsx` `resolve` function. Flash shared via `Inertia::share('flash', ...)` in `AppServiceProvider`.

## Architecture

- **Multi-tenancy**: row-level `TenantScope` + `TenantManager` singleton. Models use `BelongsToTenant`. `TenantManager::bypass()`/`enableScope()` for tests and admin contexts.
- **Observer chain** (registered in `AppServiceProvider::boot()`): `Item::created` auto-creates `ItemProgress` rows per `required_stages`. `ItemProgress::saved` recalculates weighted progress, cascades PO status. `DoItem::saved` marks PO COMPLETED when all items delivered.
- **Session, cache, queue**: database driver (SQLite dev, PostgreSQL prod). **Broadcast**: Pusher, defaults to `log` in dev. No Redis.
- **Cron-dependent**: no daemons. Queue + timeline evaluation run by cron at 1-min.

## Testing

- PHPUnit 10.5, in-memory SQLite (`RefreshDatabase`). Tests: `Unit` + `Feature` suites.
- Base `TestCase` resets `TenantManager` — tests must manage tenant state explicitly.
- `ItemObserver` creates `ItemProgress` on Item creation — account for this in progress assertions.
- Core files: `tests/Feature/CoreLogicTest.php` (tenant isolation, progress, DO, QC rework, alerts, timeline) and `AdminManagementTest.php` (auth, CRUD, broadcast, PIN login).

## Quirks

- `.npmrc` has `ignore-scripts=true` — no postinstall hooks.
- `app/Models/Tenant.php` has duplicate namespaces (`namespace App\Models\Tenant; namespace App\Models;`). Second wins.
- Tailwind v4 via `@tailwindcss/vite` (no PostCSS, no `tailwind.config.js`). Config in `app.css` via `@import "tailwindcss"`.
- No `tsconfig.json` — Vite compiles TS.
- Dual language (EN/ID): `translations` per component + `localStorage` `pogrid_lang`. No i18n framework.
