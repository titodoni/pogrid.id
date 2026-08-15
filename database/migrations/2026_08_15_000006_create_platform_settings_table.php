<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        DB::table('platform_settings')->insert([
            [
                'key' => 'maintenance_mode',
                'value' => '0',
                'updated_at' => now(),
            ],
            [
                'key' => 'maintenance_message',
                'value' => null,
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
