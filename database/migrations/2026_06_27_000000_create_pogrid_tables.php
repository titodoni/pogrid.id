<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('po_number');
            $table->string('client_name');
            $table->date('global_deadline');
            $table->string('status')->default('PENDING'); // PENDING, IN_PROGRESS, COMPLETED, CANCELLED
            $table->timestamps();
            $table->index('tenant_id');
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('po_id')->constrained()->cascadeOnDelete();
            $table->string('item_name');
            $table->integer('target_qty');
            $table->string('item_type'); // MANUFACTURE, BUY_OUT, SERVICE
            $table->json('required_stages'); // e.g., ["CNC", "FABRIKASI"]
            $table->decimal('progress_percent', 5, 2)->default(0.00);
            $table->string('status')->default('PENDING'); // PENDING, IN_PROGRESS, COMPLETED, CANCELLED, TERMINATED
            $table->timestamps();
            $table->index('tenant_id');
            $table->index('po_id');
        });

        Schema::create('item_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('stage_name'); // CNC, FABRIKASI, etc.
            $table->integer('completed_qty')->default(0);
            $table->decimal('progress_percent', 5, 2)->default(0.00);
            $table->string('status')->default('PENDING'); // PENDING, IN_PROGRESS, COMPLETED, STUCK
            $table->timestamps();
            $table->index('tenant_id');
            $table->index('item_id');
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('severity'); // RED, YELLOW, BLUE
            $table->text('message');
            $table->boolean('is_resolved')->default(false);
            $table->timestamps();
            $table->index('tenant_id');
            $table->index('item_id');
        });

        Schema::create('delivery_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('po_id')->constrained()->cascadeOnDelete();
            $table->string('do_number');
            $table->date('delivery_date');
            $table->timestamps();
            $table->index('tenant_id');
            $table->index('po_id');
        });

        Schema::create('do_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->integer('delivered_qty');
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('delivery_order_id')->nullable()->constrained()->cascadeOnDelete(); // Nullable for midway recovery invoices
            $table->string('invoice_number');
            $table->decimal('total_amount', 15, 2);
            $table->string('status')->default('UNPAID'); // UNPAID, PAID
            $table->date('due_date');
            $table->string('invoice_type')->default('STANDARD'); // STANDARD, SUNK_COST
            $table->timestamps();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('do_items');
        Schema::dropIfExists('delivery_orders');
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('item_progress');
        Schema::dropIfExists('items');
        Schema::dropIfExists('pos');
    }
};
