#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# POgrid.id — Production Deploy Script
# ═══════════════════════════════════════════════════════════════
# Usage: ./deploy/deploy.sh
#
# Prerequisites:
#   - SSH key at ~/.ssh/id_ed25519
#   - npm run build completed
#   - All tests passing
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

HOST="u173210759@153.92.8.145"
PORT="65002"
SSH_KEY="~/.ssh/id_ed25519"
REMOTE_APP="/home/u173210759/domains/pogrid.id/public_html/app"
PHP="/opt/alt/php83/usr/bin/php"
LOCAL_DIR="/home/tito/pogrid/"

echo "══════════════════════════════════════"
echo "  POgrid.id — Deploy to Production"
echo "══════════════════════════════════════"
echo ""

# Step 1: Build frontend
echo "→ Building frontend assets..."
cd "$(dirname "$0")/.."
npm run build

# Step 2: Rsync with proper excludes
echo ""
echo "→ Syncing files to server..."
rsync -avz --delete \
  -e "ssh -p $PORT -i $SSH_KEY" \
  --exclude='.env' \
  --exclude='.git' \
  --exclude='.git*' \
  --exclude='node_modules' \
  --exclude='storage' \
  --exclude='bootstrap/cache/*.php' \
  --exclude='database/*.sqlite' \
  --exclude='deploy/' \
  --exclude='graphify-out/' \
  --exclude='tests/' \
  --exclude='e2e-tests/' \
  --exclude='docs/' \
  --exclude='.agents/' \
  --exclude='.bob/' \
  --exclude='.githooks/' \
  --exclude='.cursor/' \
  --exclude='.vscode/' \
  --exclude='*.log' \
  --exclude='TECHNICAL_AUDIT_REPORT.html' \
  --exclude='AGENTS.md' \
  --exclude='skills-lock.json' \
  --exclude='phpunit.xml' \
  --exclude='dev.sh' \
  --exclude='.npmrc' \
  --exclude='.phpunit.cache/' \
  --exclude='composer-setup.php' \
  "$LOCAL_DIR" \
  "$HOST:$REMOTE_APP/"

# Step 3: Clear and rebuild caches
echo ""
echo "→ Clearing and rebuilding caches..."
ssh -p "$PORT" -i "$SSH_KEY" "$HOST" \
  "cd $REMOTE_APP && $PHP artisan optimize:clear && $PHP artisan config:cache && $PHP artisan route:cache && $PHP artisan view:cache"

# Step 4: Process any queued jobs
echo ""
echo "→ Processing queued jobs..."
ssh -p "$PORT" -i "$SSH_KEY" "$HOST" \
  "cd $REMOTE_APP && $PHP artisan queue:work --stop-when-empty"

echo ""
echo "══════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "══════════════════════════════════════"
