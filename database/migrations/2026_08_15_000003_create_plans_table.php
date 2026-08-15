<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            // Price stored in cents (integer) to avoid float precision issues.
            $table->bigInteger('price')->default(0);
            $table->integer('quota_users')->nullable();
            $table->integer('quota_pos')->nullable();
            $table->json('features')->nullable();
            $table->timestamps();
        });

        // Seed one default plan so tenants can be assigned during v1.
        DB::table('plans')->insert([
            'name' => 'Starter',
            'price' => 0,
            'quota_users' => null,
            'quota_pos' => null,
            'features' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
