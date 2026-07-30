#!/bin/bash
# Commit script for tenant scope audit test suite & fix — run from your terminal
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging tenant audit test suite & fix..."
git add \
  app/Http/Controllers/PpicDashboardController.php \
  tests/Feature/TenantScopeAuditTest.php

echo ""
echo "==> Committing..."
git commit -m "test(security): add comprehensive TenantScope audit test suite & fix PpicDashboardController scope order

- Created tests/Feature/TenantScopeAuditTest.php to audit cross-tenant isolation across Eloquent models, controllers (Guard A & Guard B), WebSocket channels, and model auto-scoping.
- Fixed PpicDashboardController::updateItemPriority: set TenantManager::setTenantId before querying Item so TenantScope applies naturally (returns 404 on cross-tenant attempts)."

echo ""
echo "==> Pushing to origin main..."
git pull --rebase origin main
git push origin main

echo ""
echo "Done!"
