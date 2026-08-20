# pogrid (POgrid.id)

## Knowledge Graph (graphify)

For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts — these return a scoped subgraph, usually much smaller than grep output. Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review when query/path/explain don't surface enough context. After modifying code, run `graphify update .` (auto-runs post-commit via hook).

God nodes: TenantManager, Item, User, Po, Alert, ItemProgress, Role, Post.

Laravel 12 + Inertia.js v2 + React 18 + TypeScript + Tailwind v4 + Vite 8.

Design system: [Astryx](https://astryx.design) (`@astryxdesign/core` provides CSS reset/base, imported in `resources/js/app.tsx`). Vite alias `@/` → `resources/js`.

## Commands

- `composer setup` — full setup (composer install, .env, key:generate, migrate). No frontend build — run `npm install --legacy-peer-deps --ignore-scripts && chmod +x node_modules/.bin/* && npm run build` if needed.
- `composer dev` — run PHP services (server, queue, pail). No Vite — run `npm run dev` separately.
- `./dev.sh` — start all (Docker PHP+Node, server, queue, Vite). Also installs graphify + sets up post-commit hooks. Need Docker.
- `composer test` — `config:clear` then `php artisan test` (PHPUnit 10.5). Args are NOT forwarded (`@no_additional_args`), so for single tests use `php artisan test --filter=MethodName` or `php artisan test tests/Feature/CoreLogicTest.php` directly.
- `npm run dev` / `npm run build` — Vite HMR / production build.
- `npm run test:e2e` / `npm run test:e2e:debug` — Puppeteer+Jest E2E suite in `e2e-tests/` (see `e2e-tests/README.md`). Needs Laravel server on `http://localhost:8000` + seeded DB.
- `vendor/bin/pint` — formatting. `npm run typecheck` — `tsc --noEmit` (tsconfig exists, `strict:false`). `npm run typecheck:ci` — baseline gate (errors must not exceed `scripts/typecheck-baseline.txt`; lower it when fixing). CI enforces the gate before build.
- `php artisan pogrid:evaluate-timelines` — cron for timeline alerts.
- `php artisan superpowers:create-admin` — provision a platform superadmin (prints TOTP secret + recovery codes ONCE). No seeder, no self-registration.
- `php artisan queue:work --stop-when-empty` — cron task (1-min interval, no daemon).
- `git config core.hooksPath .githooks` — enable post-commit graphify auto-update (run once per clone).

## Routes & Auth

Routes in `routes/web.php` (no API). Controllers return Inertia. Superadmin routes live in `routes/superpowers.php` (registered via `bootstrap/app.php` `then:`).

**Guard A** (office): email/username + password at `/login`. **Guard B** (floor): PIN login at `/c/{slug}`, throttled 5 req/min. Privilege escalation blocks office roles from PIN login. **Guard C** (platform): `PlatformAdmin` on the `platform` guard at `/superpowers/login` + mandatory TOTP — see `docs/superpowers/README.md` and ADR-006.

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

`resources/js/Pages/` groups: `Auth/`, `Owner/`, `Worker/`, `Ppic/`, `Landing/`, `Legal/`, `Superpowers/`. `FlashMessages.tsx` wraps pages via `app.tsx` `resolve` function. Flash shared via `Inertia::share('flash', ...)` in `AppServiceProvider` — and re-declared in `HandleInertiaRequests::share()`, which overwrites the whole key, so both must list all four toast types.

Owner Dashboard tabs live in `resources/js/features/owner/` (`AlertsTab`, `PoGridSection`, `MatrixTab`, `TeamTab`) — prop-fed, state stays in the page. Shared UI: `Components/ProgressBar.tsx`, `Components/PillFilter.tsx`. Realtime: `Hooks/useEchoPresence.ts` (presence + ws status + toast queue + fallback polling) shared by Owner/Worker/PPIC dashboards.

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
- **Observer chain** (registered in `AppServiceProvider::boot()`): `Item::created` auto-creates `ItemProgress` rows per `required_stages`. `ItemProgress::saved` recalculates weighted progress, cascades PO status. `DoItem::saved` marks PO DELIVERED when all non-cancelled items delivered. Business logic lives in observers and services (`ProgressService`, `StageGate`, `TelemetryService`), NOT controllers.
- **Security architecture**: `User` implements `MustVerifyEmail` (framework `verified` middleware — do not re-add a custom one). Office route group requires `can:access-office` + `verified`. Session user resolution uses the `tenant-safe-eloquent` auth provider (`app/Auth/TenantSafeEloquentUserProvider`) because identity lookup runs before `SetTenant`. TenantScope is FAIL-CLOSED (`TenantContextMissingException`); cross-tenant reads only via `TenantManager::runWithoutScope()`. Throttles: `login-office` (5/min per username+IP), PIN login 5/min, register 5/min, password reset 6/min, `login-platform` 5/min.
- **Platform plane (Superpowers)**: separate `platform` guard + `PlatformAdmin` (no `BelongsToTenant`), mandatory TOTP, own audit table `platform_activity_logs`, own Vite entry + Astryx design system. Subscription state is the single gate on tenant writes: `Tenant::ACTIVE_STATUSES` allows mutations, everything else (incl. unknown values) is read-only via `tenant.readonly`. Global maintenance via `tenant.maintenance` → `Errors/503`. Full guide: `docs/superpowers/README.md`; rationale: ADR-006.
- **Progress system**: workers log *additive deltas* (+3 pcs), not absolute totals. Multi-piece (`target_qty > 1`): `Item % = Σ(completed_qty all stages) / (target_qty × stage_count) × 100`. Single-piece (`target_qty == 1`): `Item % = Σ(stage progress%) / stage_count`.
- **Status transitions**: item `PENDING → IN_PROGRESS → COMPLETED → DELIVERED/PAID` (CANCELLED at 0% only; >0% becomes TERMINATED — sunk-cost protection). PO: `PENDING → IN_PROGRESS → COMPLETED → DELIVERED → CLOSED` (CLOSED when all invoiced/paid, set manually by Finance).
- **Stage access gate** (`WorkerDashboardController::validateStageAccess()`): `config('workflow.stage_role_map')` (config/workflow.php) maps role keywords → stage names; all preceding stages must be COMPLETED before QC can update; unmatched stages fall to PRODUCTION role.
- **Business-rule single source of truth**: `config/workflow.php` owns the stage-role map, pre-production keywords, office-role list, and deadline-risk thresholds (3 days / 70% / 24h escalation). Shared to React via the Inertia `workflow` prop (AppServiceProvider) and bridged into `resources/js/Utils/workflow.ts` by `FlashMessages.tsx` (render-phase assignment — FlashMessages mounts before the page). Never hardcode these rules in JS or controllers. Status vocabulary lives in `app/Enums/ItemStatus.php` + `app/Enums/PoStatus.php` (`IN_PRODUCTION` = production progress >0; `IN_PROGRESS` = pre-production progress only).
- **QC rework**: logging `reject_qty` spawns a `"{stage} - REWORK"` sub-stage, decrements original stage `completed_qty`, creates YELLOW alert, reverts COMPLETED item to IN_PROGRESS. REWORK stage counts toward numerator but NOT denominator. UI: `target_qty === 1` shows NG (auto-submits rework qty=1) + OK (marks 100%) buttons; `target_qty > 1` uses percentage buttons + rework form with qty input.
- **Alerts**: RED — Stuck (worker clicks Lapor Kendala, auto-resolves on resume) / Overdue (past deadline, auto-resolves at 100%). YELLOW — Risk (≤3 days left AND progress < 70%) / Rework (QC reject, manual resolve). BLUE — PIN reset requested (resolves on admin approve). Timeline evaluation via cron `pogrid:evaluate-timelines` (1-min).
- **Session, cache, queue**: database driver (SQLite dev, PostgreSQL prod). **Broadcast**: Pusher, defaults to `log` in dev. No Redis.
- **Cron-dependent**: no daemons. Queue + timeline evaluation run by cron at 1-min.

## Key Files

| Concern | Location |
|---------|----------|
| Progress update / QC rework / stage gate / finance | `app/Http/Controllers/WorkerDashboardController.php` (thin) + `app/Services/ProgressService.php` (`applyUpdate`, `revertLast`), `app/Services/StageGate.php` (`assertCanUpdate`), `app/Services/TelemetryService.php` (`forRange` — dashboard KPIs/exports) |
| Tenant context | `app/Services/TenantManager.php` |
| Observers | `app/Observers/{ItemObserver,ItemProgressObserver,DoItemObserver,AlertObserver}.php` |
| Activity/audit log | `app/Services/ActivityLogger.php` + `app/Models/ActivityLog.php` (`activity_logs` table) |
| Timeline cron | `app/Console/Commands/EvaluateTimelines.php` |
| Auth | `app/Http/Controllers/{AuthController,WorkerAuthController,PinResetController}.php` |
| Owner dashboard | `app/Http/Controllers/OwnerDashboardController.php` |
| Superpowers (platform admin) | `routes/superpowers.php` + `app/Http/Controllers/Superpowers/` + `app/Models/{PlatformAdmin,PlatformActivityLog,PlatformSetting,Plan}.php`; guide in `docs/superpowers/README.md` |
| Routes | `routes/web.php` |

## Architecture Guardrails (mandatory)

Decisions are recorded in `docs/adr/` (ADR-001…006). When a change seems to contradict an ADR, stop and escalate instead of drifting.

**Backend shape:** Route → Middleware → Controller → FormRequest/Policy → Service/Action → Model/DB. Controllers accept requests, authorize, call an operation, return a response. They do NOT calculate KPIs, render exports, run workflows, or decide permissions inline.

**Frontend shape:** Page → Feature component (`features/<domain>/`) → Shared component (`Components/`) → Hook/utility. Pages compose; features implement.

**Controller rule:** never add substantial business logic to a controller with multiple unrelated responsibilities. Prefer an existing service (`ProgressService`, `StageGate`, `TelemetryService`, `ExportService`, `PoCompletionChecker`, `ActivityLogger`, `TenantManager`) or create a narrowly scoped one when the responsibility is real.

**Frontend page rule:** never add new feature implementations to `Pages/Owner/Dashboard.tsx`, `Pages/Worker/Dashboard.tsx`, or `Pages/Ppic/Dashboard.tsx`. New tabs/sections go into `features/`.

**Single source of truth:** the server owns business rules. React consumes them via the Inertia `workflow` prop / page props. Never duplicate status vocabularies, role maps, thresholds, permission rules, financial rules, or progress math in TS.

**Tenant safety:** TenantScope is fail-closed. Cross-tenant reads only via `TenantManager::runWithoutScope()` with a stated reason. New query paths must not silently bypass tenancy.

**Authorization:** enforced structurally (route-group middleware + gates/policies). Every new mutating route must state its gate. No authz-by-memory.

**Type safety:** `npm run typecheck:ci` must pass and the baseline (`scripts/typecheck-baseline.txt`) may only go DOWN. No new `any`, `@ts-ignore`, or locally redefined domain interfaces (use `resources/js/types/`).

**Database integrity:** uniqueness/invariants belong in the database (tenant-scoped uniques, CHECK constraints), not only in controller validation.

**Scope lock:** a task changes only its feature + directly related tests + directly necessary extraction. No drive-by refactors, dependency swaps, or neighboring-module rewrites.

**No architectural drift:** no microservices, repositories, GraphQL, API layer, Redis, Redux/Zustand, or speculative abstractions without an ADR.

## Feature Gate (run BEFORE writing code)

1. **Domain:** which domain owns this? Find the existing controller/services/models/policies/feature components/tests.
2. **Owner:** is this HTTP, authz, business logic, persistence, UI state, reusable UI, or cross-cutting? Extend the existing owner when one exists.
3. **Duplication:** grep for similar rules/calculations/queries/UI/permission checks. Extend the source of truth; never create a second implementation.
4. **File responsibility:** don't add substantial logic to hotspot files (see budgets).
5. **Plan, then implement:** list files involved, where logic lives, what is reused, files created/modified, tests to add — then proceed.
6. **After:** run relevant tests + `typecheck:ci` + build; report files changed/created, responsibility of each, tests, architecture impact, risks.

## Hotspot Budgets (watched files)

| File | Current | Rule |
|---|---:|---|
| `WorkerDashboardController.php` | 841 LOC | target: decreasing — no new business features; orchestration edits only |
| `OwnerDashboardController.php` | 878 LOC | target: decreasing (extraction scheduled) — no new features |
| `Pages/Owner/Dashboard.tsx` | 2,610 LOC | target: decreasing — new tabs/features go to `features/owner/` |
| `Pages/Worker/Dashboard.tsx` | ~1,750 LOC | target: decreasing |
| `Pages/Ppic/Dashboard.tsx` | ~950 LOC | target: decreasing |

Small orchestration edits are fine; adding a feature-sized block is not. When a hotspot must gain responsibility, extract first.

## Post-Implementation Architecture Check (answer for every feature)

Did this change: add business logic to a controller? grow a hotspot? duplicate a rule/type/permission? add a tenant bypass? add client-side business truth? add `any`? add a dependency? bypass an existing service? create a generic `Utils` dumping-ground function? Each "yes" needs explicit justification or the change is wrong.

## Testing

- PHPUnit 10.5, in-memory SQLite (`RefreshDatabase`). Tests: `Unit` + `Feature` suites.
- Base `TestCase` resets `TenantManager` — tests must manage tenant state explicitly.
- `ItemObserver` creates `ItemProgress` on Item creation — account for this in progress assertions.
- Core files: `tests/Feature/CoreLogicTest.php` (tenant isolation, progress, DO, QC rework, alerts, timeline) and `AdminManagementTest.php` (auth, CRUD, broadcast, PIN login).
- Logging: `tests/Feature/ProjectLogsTest.php` (activity-log capture + `/logs` page). `activity_logs` rows are auto-written by observers for item/progress/alert actions; `project_created`/`user_created` only via HTTP controllers. Non-owner accounts cannot modify/delete owner accounts (`RoleSecurityRemediationTest`).
- Superpowers: `tests/Feature/Superpowers/` (guard separation, 2FA/secret handling, tenant CRUD + soft-delete, readonly/maintenance enforcement, observability). Shared fixtures in `SuperpowersTestCase`.

## Quirks

- `.npmrc` has `ignore-scripts=true` — no postinstall hooks.
- Tailwind v4 via `@tailwindcss/vite` (no PostCSS, no `tailwind.config.js`). Config in `app.css` via `@import "tailwindcss"`.
- `tsconfig.json` exists (`strict:false`, noEmit) — Vite does NOT type-check; `npm run typecheck` does.
- Dual language (EN/ID): `i18n/locales/{en,id}.json` namespaces + `useTranslation('Namespace')` hook + `localStorage` `pogrid_lang`. Some legacy inline `language === 'en' ?` ternaries remain — prefer the JSON namespaces for new code.
- Theme System: `pogrid_theme` in `localStorage` toggles theme classes on `html` (`theme-default`, `theme-linear`, `theme-vercel`, `theme-stripe`, `theme-github`, `theme-nordic`, `theme-light` [Mint Cream], `theme-brand`). All components use semantic CSS custom properties (`--color-pg-surface`, `--color-pg-border`, `--color-pg-text`, `--color-pg-text-muted`).
- **Shared app chrome & Single Header Architecture** — `resources/js/Components/AppShell.tsx` renders the sidebar + header + mobile drawer/bottom-nav for BOTH office and worker views. `AppLayout.tsx` wraps office pages, forwarding header props (`showClock`, `onlineUsersCount`, `wsStatus`, `onSearchClick`, `actionButton`, `backUrl`, `subtitle`) directly into `AppShell`. **Rule:** Never create duplicate inner `<header>` rows in pages; slot titles and CTAs into `AppLayout`. `effectiveUser` in `AppShell` automatically resolves from the globally shared `auth.user` prop (shared via `AppServiceProvider.php`). Breakpoint classes inside AppShell are written as **string literals** (`sidebarVisibility`, `mobileOnly`) — never interpolated — or Tailwind's scanner drops them and the sidebar/mobile chrome break. Keep `lg:ml-64` / `md:ml-64`/`lg:ml-72` content offsets in sync with `w-64` / `w-64 lg:w-72` sidebar widths.
- **Design system**: `app.css` declares `@layer reset, astryx, theme, base, components, utilities;` so Tailwind utilities outrank Astryx's `@layer reset` (fixes heading font-size inheritance). Landing shares `.mono`, `.line-grad`, `.line-grad-fade` (defined globally in `app.css`); Landing-only primitives (`hero-grid`, `line-grid`, `cell-hover`, `btn-dark`, `btn-white`, `grad-text`, etc.) live in the page's inline `<style>`. Primary brand color is blue (`#2563eb`, was indigo `#6366f1`).
- `e2e-tests/check-hero.js` — standalone Puppeteer probe that verifies the cascade-layer fix (h1 font-size on the Landing hero).
- Date Formatting: Standardized UI date representations to `dd/mm/yyyy` via `resources/js/Utils/date.ts`.

## CI/CD & Deployment (Production)

**Automated Pipeline**: Pushing to `main` automatically triggers GitHub Actions (`.github/workflows/deploy.yml`), which validates `npm run typecheck:ci`, builds Vite assets, runs `php artisan test`, and deploys via RSYNC + clears/rebuilds remote cache on Hostinger.

**Manual Deploy Command**: `npm run deploy` (build + rsync + remote `rm public/hot` + cache rebuild, all in one).

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

⚠️ CRITICAL: NEVER sync `public/hot` (created by `npm run dev`). If it lands on prod, Blade serves `localhost:5173` Vite dev URLs → blank page. Always use `npm run deploy` (build + rsync + remote `rm public/hot` + cache rebuild, all in one) or the command below (includes the exclusion). Fix if it happens: `rm public/hot` on server + `optimize:clear`.
```bash
npm run build && \
rsync -avz -e 'ssh -p 65002 -i ~/.ssh/id_ed25519' \
  --exclude 'storage' --exclude 'bootstrap/cache/*.php' \
  --exclude '.env' --exclude 'node_modules' --exclude '.git' \
  --exclude 'public/hot' \
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
