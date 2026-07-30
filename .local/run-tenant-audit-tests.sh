#!/bin/bash
# Script to run multi-tenant audit tests on host terminal
cd /home/tito/pogrid

echo "==> Running Multi-Tenant Scope Audit Tests..."
docker run --rm -v "$(pwd):/app" -w /app php-node php artisan test --filter=TenantScopeAuditTest

echo ""
echo "Done!"
