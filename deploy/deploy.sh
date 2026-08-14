#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# POgrid.id — Production Deploy
#
# CANONICAL DEPLOY PATH: `npm run deploy` (package.json).
# It is the only path that:
#   - builds with Vite
#   - rsyncs with the audited exclusion list (incl. public/hot)
#   - removes public/hot on the server (blank-page incident guard)
#   - rebuilds Laravel caches
#
# This wrapper exists only so the old `./deploy/deploy.sh` muscle
# memory keeps working. Do not reintroduce a parallel rsync here.
# ═══════════════════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

echo "deploy/deploy.sh is a wrapper — canonical path is: npm run deploy"
echo ""
exec npm run deploy
