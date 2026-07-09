#!/bin/bash
set -e

cleanup() {
  echo "Shutting down..."
  docker stop php-server php-queue 2>/dev/null || true
  docker rm php-server php-queue 2>/dev/null || true
  kill "$VITE_PID" 2>/dev/null || true
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

docker build -t php-node -f Dockerfile . 2>&1 | tail -1

echo ""
echo "Starting PHP Artisan server (http://localhost:8000)..."
docker run -d --rm --name php-server -v "$(pwd):/app" -w /app -p 8000:8000 php-node \
  php artisan serve --host=0.0.0.0

echo "Starting queue listener..."
docker run -d --rm --name php-queue -v "$(pwd):/app" -w /app php-node \
  php artisan queue:listen --tries=1 --timeout=0

echo "Tailing server logs..."
docker logs --tail=1 -f php-server &
tail -f storage/logs/laravel.log 2>/dev/null &

echo "Starting Vite..."
npm run dev &
VITE_PID=$!

echo ""
echo "Ready at http://localhost:8000 — Ctrl+C to stop"
echo ""

wait
