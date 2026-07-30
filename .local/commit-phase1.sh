#!/bin/bash
# Phase 1 commit script — run this from your terminal (not inside antigravity)
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging changes..."
git add \
  .env \
  app/Events/AlertEscalated.php \
  app/Events/DataRefreshed.php \
  app/Events/KendalaReported.php \
  app/Events/ProductionTerminated.php \
  app/Events/QcReworkLogged.php \
  app/Events/TaskUpdated.php \
  app/Events/TimelineAlertCreated.php \
  DEVELOPMENT.md \
  docs/LIVE_SYNC_BUILD_PLAN.md \
  docs/DEPLOY_APP_POGRID_ID.md

echo ""
echo "==> Committing..."
git commit -m "feat(broadcast): ShouldBroadcastNow + app.pogrid.id deploy plan

Broadcast transport:
- Switch all 7 events to ShouldBroadcastNow — fires directly to
  Pusher API inline with HTTP request, no queue dependency
- QUEUE_CONNECTION=database for future async jobs (exports, emails)

Events changed: AlertEscalated, DataRefreshed, KendalaReported,
ProductionTerminated, QcReworkLogged, TaskUpdated, TimelineAlertCreated

Docs:
- DEVELOPMENT.md: broadcast transport note + troubleshooting update
- docs/LIVE_SYNC_BUILD_PLAN.md: Phase 1-7 live sync build plan (new)
- docs/DEPLOY_APP_POGRID_ID.md: full Hostinger deploy plan for
  app.pogrid.id with hybrid Neon/SQLite setup (new)"

echo ""
echo "==> Pushing..."
git push

echo ""
echo "Done!"
