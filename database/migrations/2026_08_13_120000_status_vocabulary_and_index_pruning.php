<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Database hardening, part 2 (audit 2026-08-13).
 *
 * 1. Drop redundant `items` indexes. Verified via PRAGMA + query audit:
 *    every status/invoice_status/payment_status filter runs under the tenant
 *    scope, so items_tenant_status_inv_pay_index (tenant_id, status, …) plus
 *    items_tenant_id_index cover all observed query shapes. The dropped four
 *    were pure write-amplification on the hottest write table.
 *
 * 2. Lifecycle status vocabulary as PostgreSQL CHECK constraints. PHP enums
 *    (App\Enums\ItemStatus / PoStatus) guard application code; these guard
 *    production data against manual SQL / seeder / repair-script drift
 *    (the IN_PRODUCTION vs IN_PROGRESS divergence class). Skipped on SQLite
 *    (cannot ALTER-ADD constraints); tests rely on the PHP enums there.
 *
 * PROD PRE-CHECK (run before deploying this migration):
 *   SELECT status, COUNT(*) FROM items GROUP BY 1;
 *   SELECT status, COUNT(*) FROM pos GROUP BY 1;
 *   SELECT status, COUNT(*) FROM item_progress GROUP BY 1;
 *   — every value must appear in the constraint lists below.
 */
return new class extends Migration
{
    private const CHECKS = [
        'items' => [
            'items_status_check' => ['status', ['PENDING', 'IN_PROGRESS', 'IN_PRODUCTION', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'TERMINATED']],
            'items_delivery_status_check' => ['delivery_status', ['PENDING', 'PARTIAL', 'DELIVERED']],
            'items_invoice_status_check' => ['invoice_status', ['UNINVOICED', 'PARTIAL', 'INVOICED']],
            'items_payment_status_check' => ['payment_status', ['UNPAID', 'PARTIAL_PAID', 'PAID']],
        ],
        'pos' => [
            'pos_status_check' => ['status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CLOSED', 'CANCELLED']],
        ],
        'item_progress' => [
            'item_progress_status_check' => ['status', ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'STUCK']],
        ],
        'invoices' => [
            'invoices_status_check' => ['status', ['UNPAID', 'PAID']],
        ],
        'alerts' => [
            'alerts_severity_check' => ['severity', ['RED', 'YELLOW', 'BLUE']],
        ],
    ];

    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_status_index');
            $table->dropIndex('items_invoice_status_index');
            $table->dropIndex('items_payment_status_index');
            $table->dropIndex('items_lookup_composite_index');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return; // SQLite (dev/test): vocabulary enforced by PHP enums + tests
        }

        foreach (self::CHECKS as $table => $checks) {
            foreach ($checks as $name => [$column, $values]) {
                $list = implode(', ', array_map(fn ($v) => "'{$v}'", $values));
                // NULL passes CHECK by default — nullable columns stay nullable.
                DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$name} CHECK ({$column} IN ({$list}))");
            }
        }
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->index('status', 'items_status_index');
            $table->index('invoice_status', 'items_invoice_status_index');
            $table->index('payment_status', 'items_payment_status_index');
            $table->index(['deleted_at', 'status', 'invoice_status', 'payment_status'], 'items_lookup_composite_index');
        });

        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::CHECKS as $table => $checks) {
            foreach ($checks as $name => $_) {
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$name}");
            }
        }
    }
};
