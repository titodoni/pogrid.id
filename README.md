# POgrid.id — Live Progress & Delivery Punctuality Tracker

**Eliminate workshop anxiety. Know exactly where every order is, right now.**

POgrid.id is a real-time PO tracking system for Indonesian SME manufacturing workshops. It translates chaotic floor realities into clean, undeniable data — visible on the Owner's dashboard and each worker's phone in seconds.

> It is NOT an ERP, MES, inventory system, or accounting tool.

---

## The Problem

- Owner calls floor: *"Where is the Gearbox order?"*
- Floor: *"Still processing..."*
- Client calls Owner: *"Is my order on time?"*
- Owner: *"I'll check..."* (can't, no real-time data)

## The Solution

POgrid.id lets every worker log progress from their phone. The system instantly:
- Calculates real-time progress across all stages
- Flags overdue, at-risk, and stuck items
- Shows the Owner a live KPI dashboard
- Delivers automatic timeline alerts

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 11 (PHP 8.3) |
| Frontend | React 18 + TypeScript |
| SSR Bridge | Inertia.js v2 |
| Styling | Tailwind CSS v4 + Astryx design system |
| Database | PostgreSQL (Neon.tech) |
| Real-time | Pusher + Laravel Echo |
| Queue | Database driver + cron (1-min) |
| Hosting | Shared hosting (Hostinger) |

---

## Quick Start

```bash
# Clone
git clone <repo-url> pogrid
cd pogrid

# PHP setup
composer setup

# Frontend
npm install --legacy-peer-deps --ignore-scripts
chmod +x node_modules/.bin/*
npm run build

# Dev servers (run in separate terminals)
composer dev     # PHP (server + queue + pail)
npm run dev      # Vite HMR
```

Or use Docker:
```bash
./dev.sh
```

---

## Project Structure

```
pogrid/
├── app/
│   ├── Console/Commands/   # Artisan commands (cron, backfill)
│   ├── Http/Controllers/   # Inertia controllers
│   ├── Models/             # Eloquent models
│   ├── Observers/          # Business logic cascade
│   └── Services/           # TenantManager (singleton)
├── database/
│   ├── migrations/         # DB schema
│   └── seeders/            # Demo data
├── resources/js/
│   ├── Components/         # Shared React components
│   └── Pages/              # Inertia page components (Auth/, Owner/, Worker/)
├── routes/
│   └── web.php             # All routes (no API routes)
├── tests/
│   ├── Feature/            # Feature tests
│   └── Unit/               # Unit tests
└── docs/                   # Planning and audit docs
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [MAIN-IDEA.md](MAIN-IDEA.md) | Canonical knowledge base — read this first |
| [PRD.md](PRD.md) | Product requirements specification |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture overview |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment & hosting guide |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Local dev environment setup |
| [docs/LIVE_SYNC_BUILD_PLAN.md](docs/LIVE_SYNC_BUILD_PLAN.md) | Real-time live sync build plan & implementation status |
| [docs/DEPLOY_APP_POGRID_ID.md](docs/DEPLOY_APP_POGRID_ID.md) | Hostinger production deployment plan for app.pogrid.id |
| [TODO.md](TODO.md) | Build backlog |
| [AGENTS.md](AGENTS.md) | AI agent context |

---

## Key Concepts

- **Additive Delta Progress** — Workers log "pieces finished this session", not absolute totals
- **Observer Cascade** — Business logic lives in Eloquent observers, not controllers
- **Two Worlds** — Office users (password login) vs Floor workers (PIN login)
- **QC Gate** — All preceding stages must be COMPLETED before QC can update
- **Sunk-Cost Protection** — Items with progress > 0% cannot be freely cancelled

See [MAIN-IDEA.md](MAIN-IDEA.md) for the full 19-section knowledge base.

---

## Commands

```bash
composer test       # PHPUnit
vendor/bin/pint     # Code formatting
php artisan pogrid:evaluate-timelines   # Cron: timeline alerts
php artisan queue:work --stop-when-empty  # Cron: process queue
graphify update .                        # Refresh knowledge graph (run from repo root)
```

---

## Knowledge Graph

POgrid.id uses [graphify](https://github.com/henkdz/graphify) for a live codebase knowledge graph:
- 625+ nodes, 1200+ edges, 68 communities
- Auto-updated post-commit via git hook
- Query with: `graphify query "how does TenantManager work?"`

---

## License

Proprietary — gitarkopong
