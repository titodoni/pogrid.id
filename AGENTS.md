# pogrid (POgrid.id)

Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

## Commands

- `composer setup` — full project setup (install deps, .env, key:generate, migrate, npm build)
- `composer dev` — runs `php artisan serve`, `queue:listen`, `pail` (logs), `npm run dev` concurrently
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5)
- `npm run dev` / `npm run build` — Vite HMR / production build
- `php artisan pogrid:evaluate-timelines` — cron task for timeline alerts
- `php artisan queue:work --stop-when-empty` — cron task every 1 min (no daemon, shared hosting)

No lint/typecheck npm scripts exist. `laravel/pint` is available via `vendor/bin/pint`.

## Architecture

- **Inertia SPA** (no API routes). Controllers return Inertia responses, pages in `resources/js/Pages/`.
- **Multi-tenancy**: row-level `TenantScope` + `TenantManager` singleton. All operational models use `BelongsToTenant` trait. TenantManager has `bypass()`/`enableScope()` for tests and admin contexts.
- **Dual auth**: Guard A — email/username + password at `/login` (office roles: OWNER, ADMIN, SALES, PURCHASING, FINANCE). Guard B — PIN login at `/c/{slug}` (floor workers). Privilege escalation guard blocks office roles from PIN login.
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
- Core test file: `tests/Feature/CoreLogicTest.php` (625 lines) — covers tenant isolation, progress calc, DO completion, QC rework, kendala alerts, sunk-cost, timeline evaluation.
- `tests/Feature/AdminManagementTest.php` (202 lines) — covers registration, login, user CRUD, PO broadcast, PIN login.

## Quirks

- `.npmrc` sets `ignore-scripts=true` — postinstall hooks are suppressed.
- `app/Models/Tenant.php` has duplicate namespace declarations (`namespace App\Models\Tenant; namespace App\Models;`). Second (correct) one wins.
- Tailwind v4 uses `@tailwindcss/vite` plugin (not PostCSS). No `tailwind.config.js` — config is in `app.css` via `@import "tailwindcss"`.
- `tsconfig.json` absent — Vite handles TS compilation.

## Graphify

See CLAUDE.md — knowledge graph at `graphify-out/`. Run `graphify update .` after code changes.
