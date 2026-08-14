<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Data-integrity hardening (audit 2026-08-13).
 *
 * Unique constraints move business-identifier guarantees into the database
 * (controller validation stays for friendly error messages):
 *  - pos:            (tenant_id, po_number)   — was validation-only
 *  - delivery_orders: (tenant_id, do_number)  — previously unconstrained
 *  - invoices:       (tenant_id, invoice_number) — previously unconstrained
 *
 * Indexes cover verified hot paths only:
 *  - alerts(tenant_id, is_resolved) — dashboard + cron filters
 *  - do_items(delivery_order_id), do_items(item_id) — unindexed FK columns
 *    hit by DoItemObserver / PoCompletionChecker / Item::delivered_qty
 *  - users(tenant_id) — worker list per tenant
 *
 * NOTE for production: if legacy duplicate identifiers exist, the unique
 * indexes will fail to build. Deduplicate first:
 *   SELECT tenant_id, po_number, COUNT(*) FROM pos GROUP BY 1,2 HAVING COUNT(*)>1;
 *   (same shape for delivery_orders.do_number and invoices.invoice_number)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos', function (Blueprint $table) {
            $table->unique(['tenant_id', 'po_number'], 'pos_tenant_po_number_unique');
        });

        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->unique(['tenant_id', 'do_number'], 'delivery_orders_tenant_do_number_unique');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['tenant_id', 'invoice_number'], 'invoices_tenant_invoice_number_unique');
        });

        Schema::table('alerts', function (Blueprint $table) {
            $table->index(['tenant_id', 'is_resolved'], 'alerts_tenant_resolved_index');
        });

        Schema::table('do_items', function (Blueprint $table) {
            $table->index('delivery_order_id', 'do_items_delivery_order_id_index');
            $table->index('item_id', 'do_items_item_id_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('tenant_id', 'users_tenant_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('pos', function (Blueprint $table) {
            $table->dropUnique('pos_tenant_po_number_unique');
        });

        Schema::table('delivery_orders', function (Blueprint $table) {
            $table->dropUnique('delivery_orders_tenant_do_number_unique');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_tenant_invoice_number_unique');
        });

        Schema::table('alerts', function (Blueprint $table) {
            $table->dropIndex('alerts_tenant_resolved_index');
        });

        Schema::table('do_items', function (Blueprint $table) {
            $table->dropIndex('do_items_delivery_order_id_index');
            $table->dropIndex('do_items_item_id_index');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_tenant_id_index');
        });
    }
};
