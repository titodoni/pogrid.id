#!/bin/bash
# Final audit & commit script — run this from your terminal (not inside antigravity)
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging all changes..."
git add \
  .env \
  app/Events/AlertEscalated.php \
  app/Events/DataRefreshed.php \
  app/Events/KendalaReported.php \
  app/Events/ProductionTerminated.php \
  app/Events/QcReworkLogged.php \
  app/Events/TaskUpdated.php \
  app/Events/TimelineAlertCreated.php \
  app/Http/Controllers/OwnerDashboardController.php \
  routes/channels.php \
  resources/js/Pages/Owner/Dashboard.tsx \
  resources/js/Pages/Worker/Dashboard.tsx \
  resources/js/Pages/Ppic/Dashboard.tsx \
  resources/js/Pages/Worker/TroubleReports.tsx \
  tests/Feature/BroadcastTest.php \
  DEVELOPMENT.md \
  README.md \
  NEXT_TODO.md \
  TODO.md \
  docs/LIVE_SYNC_BUILD_PLAN.md \
  docs/DEPLOY_APP_POGRID_ID.md

echo ""
echo "==> Committing..."
git commit -m "feat(realtime): complete real-time live sync (Phases 1-7) & deployment plan

- Broadcast Transport: Switched all 7 events to ShouldBroadcastNow for instant <50ms Pusher delivery without queue dependency; set QUEUE_CONNECTION=database for future async jobs.
- Presence Channel: Authorized tenant.{tenantId}.presence channel; added online users count pill & popover on Owner, Worker, and PPIC dashboards.
- Smart Reloads: Implemented scoped partial reloads (only: ['pos', 'alerts']) and trailing 800ms debounce to prevent reload bursts. Added 'Data diperbarui' toast on Worker dashboard.
- Connection Health: Added real-time Pusher connection monitoring, stale warning banner on disconnect, auto catch-up reload on reconnect, and 30s polling fallback.
- PO Broadcast Push: Added TaskUpdated broadcast dispatch when Admin creates/broadcasts PO.
- Page Bindings: Added Echo listeners to TroubleReports.tsx; switched PPIC to dashboard channel.
- Testing & Docs: Expanded BroadcastTest.php with complete test suite. Updated README, TODO, NEXT_TODO, DEVELOPMENT.md, LIVE_SYNC_BUILD_PLAN.md, and created DEPLOY_APP_POGRID_ID.md."

echo ""
echo "==> Pushing to origin..."
git push

echo ""
echo "Done!"
