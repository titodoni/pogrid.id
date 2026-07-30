#!/bin/bash
# UI/UX Polish commit script — run this from your terminal (not inside antigravity)
cd /home/tito/pogrid

echo "==> Updating graphify knowledge graph..."
graphify update . 2>/dev/null || echo "(graphify not in PATH — skip)"

echo ""
echo "==> Git status:"
git status

echo ""
echo "==> Staging UI/UX polish changes..."
git add \
  resources/js/Pages/Auth/Login.tsx \
  resources/js/Pages/Owner/CreatePo.tsx \
  resources/js/Pages/Worker/Login.tsx \
  resources/js/Pages/Ppic/Dashboard.tsx

echo ""
echo "==> Committing..."
git commit -m "style(ui): full visual UI/UX polish across auth, form & PPIC views

- Auth/Login.tsx: Added password show/hide eye toggle button
- Owner/CreatePo.tsx: Added relative deadline shortcut chips (+3 Days, +1 Week, +1 Month) & visual live date preview
- Worker/Login.tsx: Added searchable worker selector filter input for shop-floor check-in ergonomics
- Ppic/Dashboard.tsx: Added Gantt Chart Timeline view toggle alongside schedule table view"

echo ""
echo "==> Pushing to origin..."
git push

echo ""
echo "Done!"
