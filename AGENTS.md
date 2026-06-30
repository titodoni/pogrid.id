# pogrid (POgrid.id)

Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

## Startup

Before any codebase work, load the graphify skill and read graphify-out/GRAPH_REPORT.md for architecture context. Use `graphify query "<question>"` / `graphify path "<A>" "<B>"` for targeted codebase questions during the session. Run `graphify update .` after making changes.

## Commands

- `composer setup` — full project setup (install deps, .env, key:generate, migrate, npm build)
- `composer dev` — runs `php artisan serve`, `queue:listen`, `pail` (logs), `npm run dev` concurrently
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5)
- `npm run dev` / `npm run build` — Vite HMR / production build
- `php artisan pogrid:evaluate-timelines` — cron task for timeline alerts
- `php artisan queue:work --stop-when-empty` — cron task every 1 min (no daemon, shared hosting)

No lint/typecheck npm scripts exist. `laravel/pint` is available via `vendor/bin/pint`.

## Role-Specific Dashboards

- **OWNER**: Production matrix + 🔧 Profile/Add Admin buttons + state summary bar. Cannot create POs (403).
- **ADMIN/SALES/MANAGER**: Production-only view + Broadcast PO button + 🔧 Profile button. No user management.
- **PURCHASING/FINANCE**: PIN login, Worker Dashboard (treated as floor workers).
- All floor roles (WORKER/QC/CNC/FABRICATION/DRAFTER/DELIVERY): PIN login, Worker Dashboard.

## Architecture

- **Inertia SPA** (no API routes). Controllers return Inertia responses, pages in `resources/js/Pages/`.
- **Multi-tenancy**: row-level `TenantScope` + `TenantManager` singleton. All operational models use `BelongsToTenant` trait. TenantManager has `bypass()`/`enableScope()` for tests and admin contexts.
- **Dual auth**: Guard A — email/username + password at `/login` (office roles: OWNER, ADMIN, SALES, MANAGER). Guard B — PIN login at `/c/{slug}` (floor workers). Privilege escalation guard blocks office roles from PIN login.
- **Forgot Password** (Guard A): `ForgotPasswordController` uses Laravel `Password::reset()` with custom `ResetPasswordNotification`. Routes: `GET /forgot-password`, `POST /forgot-password`, `GET /reset-password/{token}`, `POST /reset-password`. Mail defaults to `log` driver — reset links appear in `storage/logs/laravel.log` in dev.
- **Forgot PIN** (Guard B): `PinResetController`. Workers request PIN reset via `POST /c/{slug}/pin-reset/request` (guest), which creates a BLUE Alert. Admins approve via `POST /pin-reset/{alertId}/approve` (auth) which generates a new random 4-digit PIN and displays it once.
- **FlashMessages**: Global `FlashMessages.tsx` component auto-dismisses success/error/validation toasts on every page. Flash data shared via `Inertia::share('flash', ...)` in `AppServiceProvider`. Each page is auto-wrapped in `app.tsx` `resolve` function.
- **Profile page** at `GET /c/{slug}/profile` (all office roles). `ProfileController` renders `Owner/Profile.tsx` with password change form and language toggle.
- **Dashboard layout**: split into `dashboard-above-scroll` (errors, terminal, tabs, state bar — always visible) and `dashboard-scroll` (content panels — scrolls). Root uses `dashboard-root` (100dvh, flex column, overflow hidden).
- **OWNER cannot create POs** (403 on `POST /pos`). Must assign an Admin.
- **Observer chain**: `Item::created` auto-spawns `ItemProgress` rows per `required_stages` JSON array. `ItemProgress::saved` recalculates weighted progress and cascades PO status. `DoItem::saved` marks PO COMPLETED when all items fully delivered.
- **Session, cache, queue** all use database driver (SQLite dev, PostgreSQL prod). No Redis.
- **Broadcast** uses Pusher but defaults to `log` driver in dev.
- **Cron-dependent**: no background daemons. Queue and timeline evaluation triggered by cron at 1-min intervals.

## Testing

- PHPUnit 10.5, in-memory SQLite (`RefreshDatabase`).
- Base `TestCase` resets `TenantManager` to null/`enableScope()` — tests must manage tenant state explicitly.
- `ItemObserver` auto-creates `ItemProgress` rows on Item creation — assertions about progress counts must account for this.
- `Event::fake()` and `Queue::fake()` used in feature tests for broadcast/job assertions.
- Core test file: `tests/Feature/CoreLogicTest.php` (982 lines) — covers tenant isolation, progress calc, DO completion, QC rework, kendala alerts, sunk-cost, timeline evaluation.
- `tests/Feature/AdminManagementTest.php` (202 lines) — covers registration, login, user CRUD, PO broadcast, PIN login.

## Quirks

- `.npmrc` sets `ignore-scripts=true` — postinstall hooks are suppressed.
- `app/Models/Tenant.php` has duplicate namespace declarations (`namespace App\Models\Tenant; namespace App\Models;`). Second (correct) one wins.
- Tailwind v4 uses `@tailwindcss/vite` plugin (not PostCSS). No `tailwind.config.js` — config is in `app.css` via `@import "tailwindcss"`.
- `tsconfig.json` absent — Vite handles TS compilation.

## Guidelines

- **Dual Language**: Always implement dual language (English & Indonesian) support for any UI-facing elements, forms, and pages. Persistent selection must be stored in `localStorage` as `pogrid_lang`.


