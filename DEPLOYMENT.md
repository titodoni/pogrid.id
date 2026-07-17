# POgrid.id — Deployment Guide

## Hosting Environment

- **Host:** Shared hosting (Hostinger)
- **PHP:** 8.3+
- **Node:** Not required on server (Vite build is pre-compiled)
- **Database:** PostgreSQL via Neon.tech (external, not on shared hosting)

> **Critical constraint:** Zero persistent background processes. All background work runs via cron at 1-minute intervals.

---

## Environment Variables

```env
APP_NAME=POgrid
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.pogrid.id

# Database (Neon.tech PostgreSQL)
DB_CONNECTION=pgsql
DB_HOST=<neon-host>
DB_PORT=5432
DB_DATABASE=<db-name>
DB_USERNAME=<user>
DB_PASSWORD=<password>

# Session, Cache, Queue — all database driver
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

# Pusher (real-time)
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=<id>
PUSHER_APP_KEY=<key>
PUSHER_APP_SECRET=<secret>
PUSHER_APP_CLUSTER=<cluster>

# Mail (SMTP)
MAIL_MAILER=smtp
MAIL_HOST=<smtp-host>
MAIL_PORT=587
MAIL_USERNAME=<user>
MAIL_PASSWORD=<password>
MAIL_FROM_ADDRESS="noreply@pogrid.id"

# App key (generate with: php artisan key:generate)
APP_KEY=<base64-key>
```

---

## Deployment Steps

### 1. Build Frontend

```bash
npm install --legacy-peer-deps --ignore-scripts
chmod +x node_modules/.bin/*
npm run build
```

### 2. Upload to Hostinger

Upload the entire project directory (excluding `node_modules/`, `vendor/` will be rebuilt).

### 3. Install Dependencies on Server

```bash
composer install --no-dev --optimize-autoloader
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with production values (see above)
php artisan key:generate
```

### 5. Run Migrations

```bash
# Run migrations on remote PostgreSQL database (default connection)
php artisan migrate --force

# Run migrations on local SQLite database (for session/cache/queue tables)
php artisan migrate --database=sqlite --force
```

### 6. Optimize

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### 7. Set Document Root

Point web server to `public/` directory.

---

## Cron Setup

Add to crontab (runs every minute). Note: use the absolute path to PHP 8.3 CLI binary in Hostinger:

```cron
* * * * * cd /path/to/pogrid && /usr/bin/php8.3 artisan schedule:run >> /dev/null 2>&1
```

This triggers the Laravel scheduler in `routes/console.php`, which handles:
- `php artisan queue:work --stop-when-empty` — processes the job queue (every minute, without overlapping)
- `php artisan pogrid:evaluate-timelines` — evaluates alert timelines (every minute, without overlapping)

Queue processing:
- No daemons — each cron run processes all pending jobs then exits.
- Job tables and failed job logs use the database driver (routed to SQLite via environment override).
- Jobs are dispatched sync or via `dispatch()->afterResponse()` for user-facing actions.

---

## Database

- **Production:** PostgreSQL via Neon.tech
- **Session/Cache/Queue:** Database driver (uses SQLite on shared hosting, not PostgreSQL)
- **Migrations:** `php artisan migrate --force` after each deploy

---

## Pusher (Real-time)

- **Service:** Pusher (free tier)
- **Channels:** Private channels per tenant
- **Events:**
  - `KendalaReported` — worker reports stuck issue
  - `ItemTerminated` — owner terminates mid-way
- **Fallback:** Dev environment uses `BROADCAST_CONNECTION=log`

---

## Common Tasks

```bash
# Deploy
git pull
npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Rollback
php artisan migrate:rollback --force

# Check cron is working
tail -f storage/logs/laravel.log

# Manual queue processing
php artisan queue:work --stop-when-empty

# Manual timeline evaluation
php artisan pogrid:evaluate-timelines
```

---

## Health Check

```bash
# Check app responds (Laravel 11 default health check)
curl https://app.pogrid.id/up
```

# Check queue is processing
php artisan queue:monitor

# Check database connection
php artisan db:monitor
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Blank page | Storage not writable | `chmod -R 775 storage bootstrap/cache` |
| 500 error | Cached config with wrong values | `php artisan config:clear`, fix `.env`, re-cache |
| Queue not processing | Cron not set up | Verify crontab entry |
| Timeline alerts not firing | Cron/PHP timezone mismatch | Check `date.timezone` in `php.ini` |
| Pusher not connecting | Wrong credentials or key | Verify `PUSHER_*` env vars match Pusher dashboard |
