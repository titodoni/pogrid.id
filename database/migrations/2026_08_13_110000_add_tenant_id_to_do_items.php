<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * do_items was the only business table outside the tenant scope.
 * Add tenant_id (backfilled from the parent delivery order) so the model can
 * join BelongsToTenant like every other business table. Defense-in-depth:
 * all access still arrives via scoped parents.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('do_items', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id', 'do_items_tenant_id_index');
        });

        // Safe backfill via the parent relationship (do_items.delivery_order_id → delivery_orders.tenant_id)
        DB::statement('UPDATE do_items SET tenant_id = (SELECT tenant_id FROM delivery_orders WHERE delivery_orders.id = do_items.delivery_order_id)');
    }

    public function down(): void
    {
        Schema::table('do_items', function (Blueprint $table) {
            $table->dropIndex('do_items_tenant_id_index');
            $table->dropConstrainedForeignId('tenant_id');
        });
    }
};
