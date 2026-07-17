<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Acquisition attribution: how this workshop found POgrid.
            $table->string('attribution_source')->nullable()->after('subscription_status');
            $table->string('attribution_medium')->nullable()->after('attribution_source');
            $table->string('attribution_campaign')->nullable()->after('attribution_medium');
            $table->string('attribution_content')->nullable()->after('attribution_campaign');
            $table->string('attribution_ref')->nullable()->after('attribution_content');
            $table->timestamp('attributed_at')->nullable()->after('attribution_ref');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'attribution_source',
                'attribution_medium',
                'attribution_campaign',
                'attribution_content',
                'attribution_ref',
                'attributed_at',
            ]);
        });
    }
};
