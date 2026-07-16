# Tech Stack

Locked technology choices for POgrid.id (do not swap without a decision record).

- **Backend:** Laravel 11 (PHP 8.3+)
- **Frontend:** React 18 + TypeScript
- **Glue:** Inertia.js v2 (server-rendered SPA, no separate API)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Neon.tech (external)
- **Real-time:** Pusher (WebSockets) for timeline alerts
- **Build:** Vite (pre-compiled; Node not required on server)

## Routing note
No API routes. All traffic flows through `routes/web.php`; controllers return Inertia page responses. See [[Hosting and Deployment]] and [[Real-Time and Pusher]].

## Links

- Back to [[POGrid Wiki Home]]
- Full architecture: `ARCHITECTURE.md` → [[Source Docs]]
- Served from: [[Hosting and Deployment]]
