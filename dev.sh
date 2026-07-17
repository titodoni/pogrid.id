#!/bin/bash
set -e

# --- One-time setup: graphify knowledge graph hooks ---
if ! python3 -c "import graphify" 2>/dev/null; then
  pip install graphify -q --break-system-packages 2>/dev/null || true
fi
git config core.hooksPath .githooks 2>/dev/null || true
# -----------------------------------------------------

MODE="${1:-dev}"

# --- Check if port 8000 is occupied (only for dev mode) ---
if [ "$MODE" = "dev" ] && lsof -i :8000 -t >/dev/null; then
  echo 'Error: Port 8000 is already in use by another process.'
  echo 'Please stop the conflicting process or run: kill $(lsof -t -i:8000)'
  exit 1
fi

# --- Build Docker image (shared by dev and test) ---
echo "Building Docker image..."
docker build -t php-node -f Dockerfile . 2>&1 | tail -1

# ====================================================
# TEST MODE: ./dev.sh test [--filter=...] [--suite=...]
# ====================================================
if [ "$MODE" = "test" ]; then
  shift # remove "test" from args, pass the rest to artisan test
  echo ""
  echo "Running tests inside Docker..."
  echo ""
  docker run --rm \
    -v "$(pwd):/app" \
    -w /app \
    -e APP_ENV=testing \
    php-node \
    php artisan test "$@"
  exit $?
fi

# ====================================================
# DEV MODE (default): ./dev.sh
# ====================================================

cleanup() {
  echo "Shutting down..."
  docker kill php-server php-queue 2>/dev/null || true
  kill "$LOGS_PID" "$TAIL_PID" "$VITE_PID" 2>/dev/null || true
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

# --- Clean up any conflicting containers first ---
docker rm -f php-server php-queue 2>/dev/null || true

echo ""
echo "Starting PHP Artisan server (http://localhost:8000)..."
docker run -d --rm --name php-server -v "$(pwd):/app" -w /app -p 8000:8000 php-node \
  php artisan serve --host=0.0.0.0

echo "Starting queue listener..."
docker run -d --rm --name php-queue -v "$(pwd):/app" -w /app php-node \
  php artisan queue:listen --tries=1 --timeout=0

echo "Tailing server logs..."
docker logs --tail=1 -f php-server &
LOGS_PID=$!
tail -f storage/logs/laravel.log 2>/dev/null &
TAIL_PID=$!

echo "Starting Vite..."
npm run dev &
VITE_PID=$!

echo ""
echo "Ready at http://localhost:8000 — Ctrl+C to stop"
echo ""

wait
