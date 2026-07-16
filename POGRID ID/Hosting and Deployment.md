# Hosting and Deployment

## Environment
- **Host:** Shared hosting (Hostinger)
- **PHP:** 8.3+ (Node NOT required on server — Vite build is pre-compiled)
- **Database:** PostgreSQL via Neon.tech (external, not on shared hosting)
- **URL:** `https://app.pogrid.id`

## Hard constraint
**Zero persistent background processes.** Shared hosting kills long-running processes. All background work runs via **cron at 1-minute intervals** (e.g. overdue-item sweeps, alert dispatch).

## Deploy shape
No API routes — everything through `routes/web.php` returning Inertia responses. Build artifacts are pushed; the server only runs PHP-FPM behind Nginx.

## Links

- Back to [[POGrid Wiki Home]]
- Stack that runs here: [[Tech Stack]]
- Cron-friendly real-time: [[Real-Time and Pusher]]
- Full guide in `DEPLOYMENT.md` → [[Source Docs]]
