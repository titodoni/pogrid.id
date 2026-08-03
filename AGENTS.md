# pogrid (POgrid.id)

## Knowledge Graph (graphify)

For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts — these return a scoped subgraph, usually much smaller than grep output. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review when query/path/explain don't surface enough context. After modifying code, run `graphify update .` (auto-runs post-commit via hook).

God nodes: TenantManager, Item, User, Po, Alert, ItemProgress, Role, Post.

Laravel 11 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

Design system: [Astryx](https://astryx.design) (`@astryxdesign/core` provides CSS reset/base, imported in `resources/js/app.tsx`). Vite alias `@/` → `resources/js`.

## Commands

- `composer setup` — full setup (composer install, .env, key:generate, migrate). No frontend build — run `npm install --legacy-peer-deps --ignore-scripts && chmod +x node_modules/.bin/* && npm run build` if needed.
- `composer dev` — run PHP services (server, queue, pail). No Vite — run `npm run dev` separately.
- `./dev.sh` — start all (Docker PHP+Node, server, queue, Vite). Also installs graphify + sets up post-commit hooks. Need Docker.
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5). Args are NOT forwarded (`@no_additional_args`), so for single tests use `php artisan test --filter=MethodName` or `php artisan test tests/Feature/CoreLogicTest.php` directly.
- `npm run dev` / `npm run build` — Vite HMR / production build.
- `npm run test:e2e` / `npm run test:e2e:debug` — Puppeteer+Jest E2E suite in `e2e-tests/` (see `e2e-tests/README.md`). Needs Laravel server on `http://localhost:8000` + seeded DB.
- `vendor/bin/pint` — formatting (no npm lint/typecheck, no `tsconfig.json`).
- `php artisan pogrid:evaluate-timelines` — cron for timeline alerts.
- `php artisan queue:work --stop-when-empty` — cron task (1-min interval, no daemon).
- `git config core.hooksPath .githooks` — enable post-commit graphify auto-update (run once per clone).

## Routes & Auth

Routes in `routes/web.php` (no API). Controllers return Inertia.

**Guard A** (office): email/username + password at `/login`. **Guard B** (floor): PIN login at `/c/{slug}`, throttled 5 req/min. Privilege escalation blocks office roles from PIN login.

**Demo accounts** (seeded by `DatabaseSeeder`):
- Tenant: `teknik-mandiri` (slug)
- Office login at `/login`: password `poiuy`
  - `sari` — Sari Dewi (Owner)
  - `budi` — Budi Santoso (Admin)
  - `fitri` — Fitri Handayani (Sales)
  - `dimas` — Dimas Ardiansyah (Manager)
- Floor PIN login at `/c/teknik-mandiri`: PIN `0000`
  - Rina Wulandari (Purchasing)
  - Dewi Sartika (Finance)
  - Arief Prasetyo (Drafter)
  - Hendra Gunawan (Machining)
  - Bambang Supriyadi (Fabrication)
  - Agus Hermawan (QC)
  - Slamet Riyadi (Delivery)
  - Joko Susilo (Production)

**Roles & Posts**: Users have `role_id` (FK→roles: DRAFTER, PURCHASING, MACHINING, FABRICATION, PRODUCTION, QC, DELIVERY, FINANCE, STAFF) and `post_id` (FK→posts: Design, Material, CNC, Milling, Welder, Helper, QC, Delivery, Finance, Sales, Admin, Manager). `role_level` distinguishes `floor` vs `office`. Accessor `role_name`, `role_level`, `post_name` available on User model. Tenant owners marked with `is_owner` boolean.

**Forgot Password** (Guard A): `Password::reset()` with `ResetPasswordNotification`. Links in `storage/logs/laravel.log` (mail driver: `log`).

**Forgot PIN** (Guard B): worker request `POST /c/{slug}/pin-reset/request` (guest) → BLUE Alert. Admin approve `POST /pin-reset/{alertId}/approve` → new 4-digit PIN displayed once.

**OWNER cannot create POs** (403 on `POST /pos`). Owner dashboard at `/dashboard`, worker at `/c/{slug}`.

## Pages

Three groups in `resources/js/Pages/`: `Auth/`, `Owner/`, `Worker/`. `FlashMessages.tsx` wraps pages via `app.tsx` `resolve` function. Flash shared via `Inertia::share('flash', ...)` in `AppServiceProvider`.

## Error Handling

**FlashMessages.tsx** (`resources/js/Components/FlashMessages.tsx`) wraps all pages via `app.tsx` resolve. Supports 4 toast types: `success` (green), `error` (red), `warning` (amber), `info` (blue). Shared via `Inertia::share('flash')` in `AppServiceProvider`.

**Error keys** resolved by `FlashMessages.tsx` for localized messages (EN/ID):
- `user_not_found` — no account for username/email (Guard A)
- `user_not_found_worker` — selected worker not in tenant (Guard B)
- `wrong_password` — correct user, wrong password (Guard A)
- `pin_incorrect` — wrong PIN (Guard B)
- `admin_must_use_password` — office role blocked from PIN login (Guard B)
- `too_many_attempts` — throttle 429 (Guard B, 5 req/min)
- `network_error` — client offline check
- `select_worker_error` / `pin_length_error` — client-side validation (Guard B)

Controller error flow: `AuthController::login()` checks user existence first (bypasses tenant scope), returns `user_not_found` vs `wrong_password`. `WorkerAuthController::login()` returns `user_not_found_worker` if user doesn't match tenant, `admin_must_use_password` for office roles, `pin_incorrect` otherwise. Throttle exception in `bootstrap/app.php` renders `too_many_attempts` key for Inertia requests.

## Architecture

- **Multi-tenancy**: row-level `TenantScope` + `TenantManager` singleton. Models use `BelongsToTenant`. `TenantManager::bypass()`/`enableScope()` for tests and admin contexts.
- **Observer chain** (registered in `AppServiceProvider::boot()`): `Item::created` auto-creates `ItemProgress` rows per `required_stages`. `ItemProgress::saved` recalculates weighted progress, cascades PO status. `DoItem::saved` marks PO DELIVERED when all non-cancelled items delivered. Business logic lives in observers, NOT controllers.
- **Progress system**: workers log *additive deltas* (+3 pcs), not absolute totals. Multi-piece (`target_qty > 1`): `Item % = Σ(completed_qty all stages) / (target_qty × stage_count) × 100`. Single-piece (`target_qty == 1`): `Item % = Σ(stage progress%) / stage_count`.
- **Status transitions**: item `PENDING → IN_PROGRESS → COMPLETED → DELIVERED/PAID` (CANCELLED at 0% only; >0% becomes TERMINATED — sunk-cost protection). PO: `PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED` (CLOSED when all invoiced/paid, set manually by Finance).
- **Stage access gate** (`WorkerDashboardController::validateStageAccess()`): `STAGE_ROLE_MAP` config maps role keywords → stage names; all preceding stages must be COMPLETED before QC can update; unmatched stages fall to PRODUCTION role.
- **QC rework**: logging `reject_qty` spawns a `"{stage} - REWORK"` sub-stage, decrements original stage `completed_qty`, creates YELLOW alert, reverts COMPLETED item to IN_PROGRESS. REWORK stage counts toward numerator but NOT denominator. UI: `target_qty === 1` shows NG (auto-submits rework qty=1) + OK (marks 100%) buttons; `target_qty > 1` uses percentage buttons + rework form with qty input.
- **Alerts**: RED — Stuck (worker clicks Lapor Kendala, auto-resolves on resume) / Overdue (past deadline, auto-resolves at 100%). YELLOW — Risk (≤3 days left AND progress < 70%) / Rework (QC reject, manual resolve). BLUE — PIN reset requested (resolves on admin approve). Timeline evaluation via cron `pogrid:evaluate-timelines` (1-min).
- **Session, cache, queue**: database driver (SQLite dev, PostgreSQL prod). **Broadcast**: Pusher, defaults to `log` in dev. No Redis.
- **Cron-dependent**: no daemons. Queue + timeline evaluation run by cron at 1-min.

## Key Files

| Concern | Location |
|---------|----------|
| Progress update / QC rework / stage gate / finance | `app/Http/Controllers/WorkerDashboardController.php` (`updateProgress`, `logQcRework`, `validateStageAccess`, `updateFinanceStatus`) |
| Tenant context | `app/Services/TenantManager.php` |
| Observers | `app/Observers/{ItemObserver,ItemProgressObserver,DoItemObserver,AlertObserver}.php` |
| Activity/audit log | `app/Services/ActivityLogger.php` + `app/Models/ActivityLog.php` (`activity_logs` table) |
| Timeline cron | `app/Console/Commands/EvaluateTimelines.php` |
| Auth | `app/Http/Controllers/{AuthController,WorkerAuthController,PinResetController}.php` |
| Owner dashboard | `app/Http/Controllers/OwnerDashboardController.php` |
| Routes | `routes/web.php` |

## Testing

- PHPUnit 10.5, in-memory SQLite (`RefreshDatabase`). Tests: `Unit` + `Feature` suites.
- Base `TestCase` resets `TenantManager` — tests must manage tenant state explicitly.
- `ItemObserver` creates `ItemProgress` on Item creation — account for this in progress assertions.
- Core files: `tests/Feature/CoreLogicTest.php` (tenant isolation, progress, DO, QC rework, alerts, timeline) and `AdminManagementTest.php` (auth, CRUD, broadcast, PIN login).
- Logging: `tests/Feature/ProjectLogsTest.php` (activity-log capture + `/logs` page). `activity_logs` rows are auto-written by observers for item/progress/alert actions; `project_created`/`user_created` only via HTTP controllers. Non-owner accounts cannot modify/delete owner accounts (`RoleSecurityRemediationTest`).

## Quirks

- `.npmrc` has `ignore-scripts=true` — no postinstall hooks.
- `app/Models/Tenant.php` has duplicate namespaces (`namespace App\Models\Tenant; namespace App\Models;`). Second wins.
- Tailwind v4 via `@tailwindcss/vite` (no PostCSS, no `tailwind.config.js`). Config in `app.css` via `@import "tailwindcss"`.
- No `tsconfig.json` — Vite compiles TS.
- Dual language (EN/ID): `translations` per component + `localStorage` `pogrid_lang`. No i18n framework.
- Theme System: `pogrid_theme` in `localStorage` toggles theme classes on `html` (`theme-default`, `theme-linear`, `theme-vercel`, `theme-stripe`, `theme-github`, `theme-nordic`, `theme-light` [Mint Cream], `theme-brand`). All components use semantic CSS custom properties (`--color-pg-surface`, `--color-pg-border`, `--color-pg-text`, `--color-pg-text-muted`).
- **Shared app chrome** — `resources/js/Components/AppShell.tsx` renders the sidebar + header + mobile drawer/bottom-nav for BOTH office and worker views. Thin wrappers: `AppLayout.tsx` (office pages, variant="office", chrome at `md+`) and `WorkerHeader.tsx` (worker pages, variant="worker", chrome at `lg+`; worker pages offset content with `dashboard-root lg:ml-64`). Breakpoint classes inside AppShell are written as **string literals** (`sidebarVisibility`, `mobileOnly`) — never interpolated — or Tailwind's scanner drops them and the sidebar/mobile chrome break. Keep `lg:ml-64` / `md:ml-64`/`lg:ml-72` content offsets in sync with `w-64` / `w-64 lg:w-72` sidebar widths.
- **Design system**: `app.css` declares `@layer reset, astryx, theme, base, components, utilities;` so Tailwind utilities outrank Astryx's `@layer reset` (fixes heading font-size inheritance). Landing shares `.mono`, `.line-grad`, `.line-grad-fade` (defined globally in `app.css`); Landing-only primitives (`hero-grid`, `line-grid`, `cell-hover`, `btn-dark`, `btn-white`, `grad-text`, etc.) live in the page's inline `<style>`. Primary brand color is blue (`#2563eb`, was indigo `#6366f1`).
- `e2e-tests/check-hero.js` — standalone Puppeteer probe that verifies the cascade-layer fix (h1 font-size on the Landing hero).
- Date Formatting: Standardized UI date representations to `dd/mm/yyyy` via `resources/js/Utils/date.ts`.

## Deployment (Production)

**Host**: Hostinger shared hosting at `153.92.8.145`, port `65002`.

**SSH access** (key-based, no password):
```
ssh -p 65002 -i ~/.ssh/id_ed25519 u173210759@153.92.8.145
```
Script shortcut: `deploy/ssh_connect.sh`.

**Server paths**:
- App root: `/home/u173210759/domains/pogrid.id/public_html/app/`
- PHP binary: `/opt/alt/php83/usr/bin/php` (PHP 8.3 with `pdo_pgsql` enabled)
- Artisan: `cd domains/pogrid.id/public_html/app && /opt/alt/php83/usr/bin/php artisan ...`

**Deploy files** (rsync from local):
```bash
npm run build && \
rsync -avz -e 'ssh -p 65002 -i ~/.ssh/id_ed25519' \
  --exclude 'storage' --exclude 'bootstrap/cache/*.php' \
  --exclude '.env' --exclude 'node_modules' --exclude '.git' \
  --exclude 'deploy' --exclude 'database/*.sqlite' \
  /home/tito/pogrid/ \
  u173210759@153.92.8.145:/home/u173210759/domains/pogrid.id/public_html/app/
```

**Clear & rebuild cache** (after every deploy):
```bash
ssh -p 65002 -i ~/.ssh/id_ed25519 u173210759@153.92.8.145 \
  'cd domains/pogrid.id/public_html/app && /opt/alt/php83/usr/bin/php artisan optimize:clear && /opt/alt/php83/usr/bin/php artisan view:cache && /opt/alt/php83/usr/bin/php artisan config:cache && /opt/alt/php83/usr/bin/php artisan route:cache'
```

**Production .env**: stored at `deploy/.env` (not committed). Key differences from dev:
- `APP_ENV=production`, `APP_DEBUG=false`
- `APP_URL=https://app.pogrid.id`
- DB: Neon.tech PostgreSQL (`DB_CONNECTION=pgsql`, requires `/opt/alt/php83/usr/bin/php`)
- Session/Cache/Queue: SQLite (local)
- Broadcast: Pusher (live)
- Mail: Hostinger SMTP (`smtp.hostinger.com:465`, SSL, `admin@pogrid.id`)

**Domains**: Landing page at `pogrid.id`, app at `app.pogrid.id`. Route logic in `routes/web.php` redirects app subdomain to `/login`, serves React Landing on main domain.

**Troubleshooting**:
- "Application Error" / "Service Provider not found" → SSH in, run `php artisan optimize:clear`.
- Queue/cron: `php artisan queue:work --stop-when-empty` (1-min cron, no daemon).
- Email links: check `storage/logs/laravel.log` if mail driver is `log`.
