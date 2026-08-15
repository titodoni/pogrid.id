<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g. "BCA Transfer Manual", "Mandiri Transfer", "Midtrans Payment Gateway"
            $table->string('type'); // 'bank_transfer' | 'payment_gateway'
            $table->string('provider'); // 'bca' | 'mandiri' | 'bri' | 'bni' | 'midtrans' | 'xendit' | 'other'
            $table->string('account_number')->nullable();
            $table->string('account_holder')->nullable();
            $table->text('instructions')->nullable();
            $table->text('config')->nullable(); // JSON encrypted credentials
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Seed default initial platform payment accounts
        DB::table('payment_methods')->insert([
            [
                'name' => 'BCA Manual Transfer',
                'type' => 'bank_transfer',
                'provider' => 'bca',
                'account_number' => '1234567890',
                'account_holder' => 'PT POgrid Teknologi Indonesia',
                'instructions' => 'Transfer tepat sesuai nominal tagihan dan simpan bukti transfer untuk diverifikasi.',
                'config' => null,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Mandiri Manual Transfer',
                'type' => 'bank_transfer',
                'provider' => 'mandiri',
                'account_number' => '0987654321',
                'account_holder' => 'PT POgrid Teknologi Indonesia',
                'instructions' => 'Transfer tepat sesuai nominal tagihan dan simpan bukti transfer untuk diverifikasi.',
                'config' => null,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
