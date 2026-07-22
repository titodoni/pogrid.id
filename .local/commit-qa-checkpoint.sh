#!/bin/bash
# Commit script for QA & Real-World Simulation Test Checkpoint — run from your terminal
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging files..."
git add \
  app/Http/Controllers/PpicDashboardController.php \
  app/Http/Middleware/SetTenant.php \
  app/Models/User.php \
  routes/channels.php \
  tests/Feature/TenantScopeAuditTest.php \
  docs/REAL_WORLD_TEST_CHECKPOINT.md \
  TODO.md \
  .local/commit-qa-checkpoint.sh

echo ""
echo "==> Committing..."
git commit -m "docs(qa): add comprehensive Real-World Simulation & QA Test Checkpoint guide

- Created docs/REAL_WORLD_TEST_CHECKPOINT.md with end-to-end simulation scenarios for all workshop roles (Owner, Admin, PPIC, Drafter, Purchasing, Machining, QC, Delivery, Finance).
- Included multi-tenant audit test checklist, step-by-step UI walkthroughs, WebSocket presence sync checks, PIN reset flows, and troubleshooting Q&A."

echo ""
echo "==> Pushing to origin main..."
git pull --rebase origin main
git push origin main

echo ""
echo "Done!"
