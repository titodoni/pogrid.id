<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->json('workflow_settings')->nullable();
        });

        Schema::table('items', function (Blueprint $table) {
            $table->string('delivery_status')->default('PENDING');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn('delivery_status');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('workflow_settings');
        });
    }
};
