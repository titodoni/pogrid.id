<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->softDeletes()->index();
            $table->index('status');
            $table->index('invoice_status');
            $table->index('payment_status');
            $table->index(['deleted_at', 'status', 'invoice_status', 'payment_status'], 'items_lookup_composite_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropIndex('items_lookup_composite_index');
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['invoice_status']);
            $table->dropIndex(['status']);
            $table->dropIndex(['deleted_at']);
            $table->dropColumn('deleted_at');
        });
    }
};
