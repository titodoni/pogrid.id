<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')
                ->nullable()
                ->constrained()
                ->nullOnDelete();
            $table->string('message_id')->nullable();
            $table->string('from')->nullable();
            $table->string('to');
            $table->string('subject')->nullable();
            $table->longText('body')->nullable();
            $table->string('status')->default('queued'); // queued|sent|failed
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('tenant_id');
            $table->index('message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_logs');
    }
};
