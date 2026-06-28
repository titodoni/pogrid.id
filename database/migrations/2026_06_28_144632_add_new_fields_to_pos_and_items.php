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
        Schema::table('pos', function (Blueprint $table) {
            $table->string('external_po_number')->nullable()->after('po_number');
            $table->boolean('is_urgent')->default(false)->after('status');
        });

        Schema::table('items', function (Blueprint $table) {
            $table->string('vendor_name')->nullable()->after('required_stages');
            $table->string('vendor_phone')->nullable()->after('vendor_name');
        });
    }

    public function down(): void
    {
        Schema::table('pos', function (Blueprint $table) {
            $table->dropColumn(['external_po_number', 'is_urgent']);
        });

        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['vendor_name', 'vendor_phone']);
        });
    }
};
