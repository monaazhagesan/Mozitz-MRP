<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('stock_adjustment_items', function (Blueprint $table) {
            $table->id();

            $table->string('adjustment_id');

            // Item details snapshot
            $table->string('item_code');
            $table->string('item_name')->nullable();
            $table->string('barcode')->nullable();

            // Stock snapshot
            $table->integer('in_stock')->default(0);

            // Adjustment data
            $table->integer('adjustment_qty');
            $table->decimal('cost_per_unit', 12, 2)->default(0);
            $table->decimal('adjustment_value', 12, 2)->default(0);

            $table->timestamps();

            // Foreign key
            $table->foreign('adjustment_id')
                ->references('id')
                ->on('stock_adjustments')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_adjustment_items');
    }
};