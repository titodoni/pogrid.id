#!/bin/bash
# Phase 2 commit script — run this from your terminal (not inside antigravity)
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging changes..."
git add \
  routes/channels.php \
  resources/js/Pages/Owner/Dashboard.tsx \
  resources/js/Pages/Worker/Dashboard.tsx \
  resources/js/Pages/Ppic/Dashboard.tsx \
  resources/js/Pages/Worker/TroubleReports.tsx \
  tests/Feature/BroadcastTest.php \
  docs/LIVE_SYNC_BUILD_PLAN.md

echo ""
echo "==> Committing..."
git commit -m "feat(realtime): implement presence channel, connection health & smart reloads

- Presence Channel: Authorized tenant.{tenantId}.presence in channels.php; joined in Owner, Worker, and PPIC dashboards with online users count pill & popover UI
- Smart Reloads & Debounce: Added scoped partial reloads (only: ['pos', 'alerts']) and trailing 800ms debounce to prevent burst reloads on fast updates
- Worker Dashboard Toast: Added named 'Data diperbarui' info toast on data.refreshed
- Connection Health: Real-time Pusher connection monitoring (connected/connecting/disconnected), warning banner on drop, auto-catchup reload on reconnect, 30s polling fallback if Pusher unavailable
- PPIC Auth: Switched PPIC listener to dashboard channel
- TroubleReports: Added Echo listener for real-time alert updates
- Tests: Added presence channel authorization & tenant isolation feature tests in BroadcastTest.php"

echo ""
echo "==> Pushing..."
git push

echo ""
echo "Done!"
