# POgrid — Deployment Plan: app.pogrid.id
> Target: **Hostinger Shared Hosting** · Domain: **app.pogrid.id**
> Laravel 11 · Inertia v2 · React 18 · Tailwind v4 · PostgreSQL (Neon.tech) · Pusher

---

## 🏗️ Architecture Overview

```
Browser
  │
  ▼
Hostinger Shared Hosting (app.pogrid.id)
  │   Document root → /home/uXXXXXX/pogrid/public/
  │
  ├── PHP 8.3 + Laravel 11
  │     ├── App data ──────────────► Neon.tech PostgreSQL (remote)
  │     ├── Session/Cache/Queue ──► database.sqlite (local, high-write)
  │     └── Broadcast ─────────────► Pusher Channels (WebSocket)
  │
  └── Cron (every 1 min, hPanel)
        ├── queue:work --stop-when-empty
        └── pogrid:evaluate-timelines
```

**Key constraints on shared hosting:**
- ❌ No persistent background processes (no `php artisan queue:work` daemon)
- ❌ No Node.js on server — frontend must be pre-built locally
- ✅ Cron at 1-min intervals handles queue + timeline evaluation
- ✅ Broadcasts fire instantly via `ShouldBroadcastNow` (no queue needed)

---

## 📋 Pre-Deployment Checklist

### Credentials to gather before starting

- [ ] **Hostinger SSH** — SSH host, port, username (from hPanel → Advanced → SSH Access)
- [ ] **Neon.tech PostgreSQL** — host, database, username, password, SSL required
- [ ] **Pusher** — App ID, Key, Secret, Cluster (`ap1`)
- [ ] **SMTP Mail** — host, port, username, password for `noreply@pogrid.id`
- [ ] **GitHub** — deploy key already configured in `.git/config` (`pogrid_deploy_key`)

### Domain / DNS

- [ ] `app.pogrid.id` subdomain created in Hostinger hPanel → Domains → Subdomains
- [ ] Document root set to `/home/uXXXXXX/pogrid/public` (see Step 7)
- [ ] SSL certificate issued (Let's Encrypt via hPanel → SSL)

---

## 🚀 Deployment Steps

### Step 1 — Build Frontend Locally

> ⚠️ Never run `npm run build` on Hostinger — shared hosting CPU will throttle or OOM-kill it.

```bash
# On your local machine:
npm install --legacy-peer-deps --ignore-scripts
chmod +x node_modules/.bin/*
npm run build
```

Built assets land in `public/build/` — these get uploaded with the project.

---

### Step 2 — Package the Release

```bash
zip -r pogrid-release.zip . \
  -x "node_modules/*" \
  -x "vendor/*" \
  -x "storage/framework/cache/data/*" \
  -x "storage/framework/sessions/*" \
  -x "storage/framework/views/*" \
  -x "storage/logs/*" \
  -x "database/database.sqlite" \
  -x ".git/*" \
  -x ".bob/*" \
  -x ".claude/*" \
  -x "graphify-out/*" \
  -x "*.local/*"
```

> Alternatively, if Hostinger SSH supports git: clone via SSH and run `git pull` for subsequent deploys.

---

### Step 3 — Upload & Extract on Hostinger

```bash
# SSH into Hostinger
ssh uXXXXXX@your-hostinger-host

# Upload the zip (or use File Manager in hPanel)
# Then extract:
mkdir -p pogrid
unzip pogrid-release.zip -d pogrid
cd pogrid
```

---

### Step 4 — Install PHP Dependencies

```bash
# Memory limit override required on shared hosting
COMPOSER_MEMORY_LIMIT=-1 composer install --no-dev --optimize-autoloader
```

---

### Step 5 — Configure Environment

```bash
cp .env.example .env
nano .env
```

Paste and fill in:

```env
APP_NAME=POgrid
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.pogrid.id
APP_KEY=   # generated in next step

# ── Primary Database: Neon.tech PostgreSQL ──────────────────────────
DB_CONNECTION=pgsql
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_SSLMODE=require

# ── High-write local SQLite: session, cache, queue ──────────────────
# These hit the DB many times per request — keep them local to avoid
# burning Neon connection pool on shared hosting.
SESSION_DRIVER=database
SESSION_CONNECTION=sqlite

CACHE_STORE=database
DB_CACHE_CONNECTION=sqlite
DB_CACHE_LOCK_CONNECTION=sqlite

QUEUE_CONNECTION=database
DB_QUEUE_CONNECTION=sqlite

# ── Pusher (real-time) ───────────────────────────────────────────────
# Events use ShouldBroadcastNow — fires directly to Pusher API inline,
# no queue worker dependency. Latency: <50ms per broadcast.
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=2133996
PUSHER_APP_KEY=9e4d4195377f01ded1bb
PUSHER_APP_SECRET=598a184ff213d8568631
PUSHER_APP_CLUSTER=ap1
VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"

# ── Mail (Hostinger SMTP) ────────────────────────────────────────────
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=noreply@pogrid.id
MAIL_PASSWORD=your_mail_password
MAIL_FROM_ADDRESS="noreply@pogrid.id"
MAIL_FROM_NAME="${APP_NAME}"
```

```bash
php artisan key:generate
```

---

### Step 6 — Initialize SQLite + Run Migrations

The app uses **two databases**: Neon PostgreSQL for app data, local SQLite for session/cache/queue.

```bash
# 1. Create and set permissions on local SQLite DB
touch database/database.sqlite
chmod 775 database/database.sqlite
chmod -R 775 database/
chmod -R 775 storage/ bootstrap/cache/
```

> [!IMPORTANT]
> SQLite requires write permissions on BOTH the file AND the directory (for WAL journal files).

```bash
# 2. Migrate app tables → Neon.tech PostgreSQL (default connection)
php artisan migrate --force

# 3. Migrate session/cache/queue tables → local SQLite
php artisan migrate --database=sqlite --force
```

Tables created in SQLite: `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`

---

### Step 7 — Set Document Root in hPanel

> [!IMPORTANT]
> Point domain to the `public/` subfolder, NOT the project root — this is a security requirement.

1. hPanel → **Websites** → select `app.pogrid.id` → **Dashboard**
2. Find **"Subdomains"** or **"Advanced" → "Document Root"**
3. Change path from `/public_html` to: `/home/uXXXXXX/pogrid/public`
4. Save & wait for propagation (~30s)

---

### Step 8 — Production Optimizations

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

> [!WARNING]
> After any `.env` change in production, you must re-run `php artisan config:cache` or
> changes will not be picked up (config is frozen in `bootstrap/cache/config.php`).

---

### Step 9 — Cron Job Setup (hPanel)

hPanel → **Advanced** → **Cron Jobs** → Add new:

| Field | Value |
|-------|-------|
| Common settings | Every minute (`* * * * *`) |
| Command | `/usr/bin/php8.3 /home/uXXXXXX/pogrid/artisan schedule:run >> /dev/null 2>&1` |

The Laravel scheduler (`routes/console.php`) runs every minute:
```php
Schedule::command('queue:work --stop-when-empty')->everyMinute()->withoutOverlapping();
Schedule::command('pogrid:evaluate-timelines')->everyMinute()->withoutOverlapping();
```

> [!NOTE]
> Even though broadcasts use `ShouldBroadcastNow` (no queue needed), the queue worker
> cron is still needed for future async jobs (Excel exports, email batches, etc.).

---

## 🔁 Subsequent Deploys (After First Setup)

Once the server is configured, future deploys are:

```bash
# On Hostinger SSH:
cd ~/pogrid

# Pull latest code (uses pre-configured SSH deploy key)
GIT_SSH_COMMAND="ssh -i /home/uXXXXXX/pogrid/pogrid_deploy_key" git pull

# Re-install deps if composer.json changed
COMPOSER_MEMORY_LIMIT=-1 composer install --no-dev --optimize-autoloader

# Clear and re-cache
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Run any new migrations
php artisan migrate --force
php artisan migrate --database=sqlite --force
```

> [!TIP]
> For frontend changes: build locally (`npm run build`), then upload only the `public/build/` folder via SFTP.
> No need to re-upload the whole project for pure UI changes.

---

## ✅ Post-Deployment Verification

Run through this checklist after each deploy:

### App Health
- [ ] `curl https://app.pogrid.id/up` → returns `200 OK`
- [ ] Login page loads without console errors
- [ ] No 404s on `public/build/` assets (check Network tab)

### Authentication
- [ ] **Guard A (Office):** `/login` → username `sari`, password `poiuy` → owner dashboard loads
- [ ] **Guard A (Admin):** `/login` → username `budi`, password `poiuy` → admin dashboard loads
- [ ] **Guard B (Floor):** `/c/teknik-mandiri` → PIN `0000` → worker dashboard loads
- [ ] **Guard A → Guard B block:** try `budi` (admin) at PIN login → blocked with correct error

### Core Features
- [ ] Create a PO as Admin → broadcast to workers → workers see it
- [ ] Update progress as a worker → Owner dashboard auto-refreshes (Pusher toast appears)
- [ ] Report Kendala as a worker → Owner dashboard shows RED alert + toast
- [ ] Finance: mark item invoiced → payment status updates

### Real-Time (Pusher)
- [ ] Open Owner dashboard in one browser + Worker dashboard in another
- [ ] Update worker progress → Owner dashboard refreshes within 1–2 seconds (no manual reload)
- [ ] Check Pusher debug console at dashboard.pusher.com for event traffic

### Cron
- [ ] Wait 2 minutes after deploy → check `storage/logs/laravel.log` for queue worker output
- [ ] Run manually to verify: `php artisan schedule:run`

### Storage
- [ ] `storage/logs/laravel.log` is writable (no permission errors)
- [ ] Sessions persist across page reloads (not logged out on refresh)

---

## ⚠️ Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Blank page / 500 | Wrong permissions | `chmod -R 775 storage bootstrap/cache` |
| 500 after `.env` edit | Stale config cache | `php artisan config:clear && php artisan config:cache` |
| `sessions table not found` | SQLite migrations not run | `php artisan migrate --database=sqlite --force` |
| Queue jobs stuck | Cron not set or wrong PHP path | Verify hPanel cron + use `/usr/bin/php8.3` not `php` |
| Pusher not connecting | Wrong credentials or cluster | Check `PUSHER_APP_*` in `.env` + Pusher dashboard |
| Assets 404 (`public/build/`) | Frontend not built | Run `npm run build` locally and upload `public/build/` |
| `php artisan` missing command | Vendor not installed | `composer install --no-dev --optimize-autoloader` |
| SSL certificate error | Let's Encrypt not issued | hPanel → SSL → Issue SSL for `app.pogrid.id` |
| Git pull fails | Deploy key permissions | `chmod 600 pogrid_deploy_key` on server |

---

## 📦 Files NOT to Upload / Gitignore

The following should never land on production (already in `.gitignore`):
- `node_modules/` — not needed; Vite builds to `public/build/`
- `.env` — never commit; fill manually on server
- `storage/logs/*` — server has its own logs
- `database/database.sqlite` — server creates its own
- `graphify-out/` — dev tool only
- `.bob/`, `.claude/` — AI assistant context

---

*Last updated: 2026-07-21*
*Cross-reference: `DEPLOYMENT.md` (quick reference), `DEVELOPMENT.md` (local dev), `docs/LIVE_SYNC_BUILD_PLAN.md` (real-time sync)*
