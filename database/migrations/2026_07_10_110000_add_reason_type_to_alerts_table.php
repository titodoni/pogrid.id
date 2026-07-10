<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            // Structured kendala type — replaces keyword scanning of message text.
            // Values: MACHINE_BROKEN, MATERIAL_DELAY, POWER_OUTAGE, HUMAN_ERROR,
            //         OPERATOR_SICK, QC_REWORK, PIN_RESET, OTHER
            // Nullable so existing alerts (without reason_type) are unaffected.
            $table->string('reason_type')->nullable()->after('severity');
        });
    }

    public function down(): void
    {
        Schema::table('alerts', function (Blueprint $table) {
            $table->dropColumn('reason_type');
        });
    }
};
