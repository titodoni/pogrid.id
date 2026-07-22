# POgrid.id — Development Guide

## Prerequisites

- PHP 8.3+
- Composer 2
- Node.js 20+
- Docker (optional, for `./dev.sh`)
- PostgreSQL 16+ (or SQLite for local dev)

## Setup

```bash
# Clone
git clone <repo-url> pogrid
cd pogrid

# PHP dependencies + .env + key + migrations + seeders
composer setup

# Frontend
npm install --legacy-peer-deps --ignore-scripts
chmod +x node_modules/.bin/*
npm run build
```

> `.npmrc` has `ignore-scripts=true` — no postinstall hooks. Explicitly chmod node_modules binaries.

## Dev Environment

### Option A: Docker (recommended)

```bash
./dev.sh
```

Starts PHP server (port 8000), queue listener, and Vite HMR.

> **Real-time broadcasts**: All broadcast events use `ShouldBroadcastNow` — they fire directly to Pusher within the HTTP request (no queue worker needed for live push). The `queue:listen` process in `dev.sh` handles other async jobs (e.g. future exports).

### Option B: Native

Terminal 1 — PHP services:
```bash
composer dev
```

Terminal 2 — Vite HMR:
```bash
npm run dev
```

### Database

Default: SQLite (`database/database.sqlite`). For PostgreSQL, set `DB_CONNECTION=pgsql` and related vars in `.env`.

```bash
# Create SQLite DB
touch database/database.sqlite
php artisan migrate --seed
```

## Coding Conventions

### PHP

- **Formatting:** `vendor/bin/pint` (Laravel Pint) — run before committing
- **Controllers:** Inertia-based, return `Inertia::render()`. No API controllers.
- **Observers:** Business cascade logic goes in observers, NOT controllers
- **Multi-tenancy:** All operational models use `BelongsToTenant` trait. `TenantManager::bypass()` for admin/test queries

### React / TypeScript

- **No tsconfig.json** — Vite compiles TypeScript directly
- **No tailwind.config.js** — Tailwind v4 config via `@import "tailwindcss"` in `app.css`
- **No PostCSS** — Tailwind runs via `@tailwindcss/vite` plugin
- **Design system:** Astryx (`@astryxdesign/core`) — CSS reset/base imported in `resources/js/app.tsx`
- **Alias:** `@/` → `resources/js`
- **Dual language:** EN/ID via `translations` object per component + `localStorage('pogrid_lang')`. No i18n framework.

### Structure

```
resources/js/
├── Components/     # Shared UI components
├── Pages/
│   ├── Auth/       # Login pages
│   ├── Owner/      # Office dashboard pages
│   └── Worker/     # Floor worker pages
├── app.tsx         # App entry (Inertia resolve, flash messages wrapper)
└── app.css         # Tailwind + global styles
```

## Testing

```bash
# Full test suite (config:clear + php artisan test)
composer test

# Or directly:
php artisan test

# Specific test:
php artisan test --filter=CoreLogicTest
php artisan test --testsuite=Feature

# Docker:
./dev.sh test
./dev.sh test --filter=CoreLogicTest
```

### Test Conventions

- **PHPUnit 10.5**, in-memory SQLite (`RefreshDatabase`)
- Base `TestCase` resets `TenantManager` — tests must manage tenant state explicitly
- `ItemObserver::created()` auto-creates `ItemProgress` — account for this in progress assertions
- Core files: `tests/Feature/CoreLogicTest.php`, `tests/Feature/AdminManagementTest.php`

## Graphify Knowledge Graph

```bash
# Update graph after code changes
graphify update /home/tito/pogrid

# Query the graph
graphify query "how does progress calculation work?"

# Auto-update post-commit (requires git hook)
git config core.hooksPath .githooks
```

## Architecture Overview

See [ARCHITECTURE.md](ARCHITECTURE.md) for system flow diagrams, data model, observer chain, and deployment layout.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm run dev` hangs on NTFS | Use `node node_modules/vite/bin/vite.js build` instead |
| Server startup slow on NTFS | Expected — 30-60s first load |
| Vite cache stale | Delete `node_modules/.vite` and `ui/dist` |
| Port 8000 in use | Change in `.env` `APP_URL` or use Docker with different port mapping |
| Broadcast not working | Check `BROADCAST_CONNECTION=pusher` and `PUSHER_APP_KEY` in `.env`. Events use `ShouldBroadcastNow` — no queue worker needed, fires inline. |
| Broadcast delay / not arriving | Verify Pusher credentials are correct and the channel name matches (`tenant.{id}.dashboard` or `.workers`). Check Pusher debug console at https://dashboard.pusher.com |
| Mail not sending | `MAIL_MAILER=log` — links in `storage/logs/laravel.log` |
