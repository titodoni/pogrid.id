<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * System-level alerts (e.g. PIN reset requests) are not tied to any item.
 * PinResetController previously inserted item_id = 0, which violates the
 * foreign key on any database that enforces referential integrity.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->foreignId('item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->foreignId('item_id')->nullable(false)->change();
        });
    }
};
