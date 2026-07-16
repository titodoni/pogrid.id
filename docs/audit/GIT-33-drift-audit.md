# Documentation Drift Audit — GIT-33 (Monthly)

**Scope:** POGrid docs vs current code (`/home/tito/pogrid`, HEAD `ea66ea81e`).
**Audited docs:** `README.md`, `ARCHITECTURE.md`, `PRD.md`, `MAIN-IDEA.md`.
**Date:** 2026-07-16 · **Auditor:** Knowledge Engineer (opencode_local)

## Verdict

Docs are **highly accurate** — the four core docs reflect the real implementation well.
Knowledge-graph stats in README match `graphify-out/GRAPH_REPORT.md` exactly (625 nodes · 1242 edges · 68 communities).
"No API routes" claim is **true** (only `routes/web.php` + `routes/console.php`).
All ARCHITECTURE-referenced controllers/observers/services/commands exist and match.
PRD §9 sunk-cost termination, §13 PIN reset, §5.2 undo, §6 delivery/finance are **all implemented** (verified in code).

Drift is **minor** but real. One headline feature is only half-wired (see Gap G1).

## Drift & Gaps

| ID | Severity | Doc | Finding | Reality in code |
|----|----------|-----|---------|-----------------|
| D1 | Low | README §Project Structure | Lists `app/Services/ … StageRoleMap` as a service | `app/Services/` contains **only** `TenantManager.php`. `STAGE_ROLE_MAP` is a private const inside `WorkerDashboardController` (`app/Http/Controllers/WorkerDashboardController.php:24`), not a service file. |
| D2 | Low | README §Commands | `graphify update /home/tito/pogrid` hardcodes an absolute dev-machine path | Should be `graphify update .` (relative). **Fixed in README.** |
| D3 | Low | README §Documentation | Table omits `DEPLOYMENT.md`, `DEVELOPMENT.md` | Both docs exist at repo root. **Fixed in README** (added to table). |
| G1 | High | README/PRD §2/ARCH §8 | "Real-time: Pusher + Laravel Echo" is a headline feature | Server **does** broadcast (`App\Events\ProductionTerminated`, `OwnerDashboardController::terminateMidway` calls `broadcast(...)`). But the **frontend has no Laravel Echo / Pusher subscriber** (no `pusher`/`echo` in `package.json` or `resources/js`), and `.env.example` sets `BROADCAST_CONNECTION=log`. Worker-screen "freeze via Pusher" (PRD §9.5) cannot reach clients today. |
| G2 | Med | PRD §14.6 | "Dual language EN/ID **per component**" | Present but **partial** — only some components carry `translations` + `localStorage('pogrid_lang')` (FlashMessages, CreatePo, Dashboard, PresentationMode, SearchModal). Many components have no i18n layer. |
| D4 | Info | README §Knowledge Graph | "Auto-updated post-commit via git hook" | `.githooks/` exists; unverified whether hook is active. Recommend confirming the post-commit hook fires `graphify update`. |

## Actions Taken This Run

- Applied README fixes for **D1, D2, D3** (factual corrections; low risk).
- Spawned child issue **GIT-34** for the real-time client-wiring gap (**G1**) — the one substantive code gap.
- Produced reusable feature-doc template (document key `doc-template`) per objective.

## Recommendation

- Mark GIT-33 **done** (audit complete, minor doc drift fixed).
- G1 needs a product decision: either implement the Echo/Pusher client subscriber, or soften the "real-time" claim in README/PRD/ARCHITECTURE to "server-side broadcast-ready (client subscriber pending)".
- G2 is a gradual improvement; track in backlog, not blocking.
