#!/bin/bash
# Phase 7 commit script — run this from your terminal (not inside antigravity)
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging changes..."
git add \
  app/Http/Controllers/OwnerDashboardController.php \
  tests/Feature/BroadcastTest.php \
  docs/LIVE_SYNC_BUILD_PLAN.md

echo ""
echo "==> Committing..."
git commit -m "test(broadcast): add complete E2E broadcast test suite & PO creation TaskUpdated push

- Added TaskUpdated broadcast dispatch when PO is created/broadcasted by Admin in OwnerDashboardController.php
- Added test_task_updated_broadcast_configuration test
- Added test_data_sync_observer_fires_data_refreshed_on_model_saved test
- Added test_po_creation_triggers_task_updated_broadcast test
- Added test_dashboard_channel_auth_allows_owner_and_office_roles_blocks_worker test
- Added test_presence_channel_unauthenticated_user_rejected test
- Updated docs/LIVE_SYNC_BUILD_PLAN.md checklist to 100% complete"

echo ""
echo "==> Pushing..."
git push

echo ""
echo "Done!"
