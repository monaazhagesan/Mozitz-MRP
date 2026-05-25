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
        Schema::create('stock_receipts', function (Blueprint $table) {
            $table->id();

            // ✅ Foreign key to inventory table
            $table->foreignId('item_id')
                ->constrained('inventory_stock')
                ->onDelete('cascade');

            // ✅ Stock receipt details
            $table->integer('qty_added');


            $table->string('receipt_type'); // grn, opening, return, etc
            $table->date('receipt_date');

            $table->string('po_grn_reference')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_receipts');
    }
};