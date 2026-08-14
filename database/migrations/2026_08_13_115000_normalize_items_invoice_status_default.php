<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The items.invoice_status column was created with schema default 'PENDING',
 * but the application vocabulary is UNINVOICED/PARTIAL/INVOICED
 * (WorkerDashboardController::updateFinanceStatus). Production rows carrying
 * the legacy default block the CHECK constraint from
 * 2026_08_13_120000_status_vocabulary_and_index_pruning.
 *
 * 'PENDING' and 'UNINVOICED' are semantically identical here (nothing ever
 * invoiced), so normalize rows and move the default into the vocabulary.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('items')->where('invoice_status', 'PENDING')->update(['invoice_status' => 'UNINVOICED']);

        Schema::table('items', function (Blueprint $table) {
            $table->string('invoice_status')->default('UNINVOICED')->change();
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->string('invoice_status')->default('PENDING')->change();
        });
    }
};
